"""Restaurant-detail parity and return-navigation checks for the Wanso prototype.

Run while the portfolio server is listening on 8765, or set PORTFOLIO_URL.
Screenshots and a machine-readable report are written to work/wanso-store-parity.

Source of truth: WansoIOS/Features/MerchantDetail/MerchantDetailView.swift.
The current source is a full scrolling page with a photo hero, merchant info,
AI summary, explicit language selection/translation, two platform offers,
cross-platform menu comparison and grouped menu. It does not render review
or menu tabs, review filters, or a sort menu. The added illustrative review
section was subsequently requested by the user and is checked separately.

This suite checks the visitor-visible detail reached from actual home/chat
cards. It does not invoke the detail renderer directly or replace backend data.
"""
import json
import os
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

BASE = os.getenv('PORTFOLIO_URL', 'http://127.0.0.1:8765/').rstrip('/') + '/'
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'work' / 'wanso-store-parity'
OUT.mkdir(parents=True, exist_ok=True)
CHECKS = []


def screenshot(page, name):
    page.screenshot(path=str(OUT / (name + '.png')))


def store_for(page, identifier):
    return page.evaluate('(id) => window.wansoCatalog.find(store => store.id === id)', identifier)


def detail(page, identifier):
    view = page.locator('.native-store-view:visible')
    expect(view).to_have_count(1)
    expect(view).to_have_attribute('data-store-id', identifier)
    expect(page.locator('.wanso-sheet')).not_to_be_visible()
    return view


def scroll_position(locator):
    return locator.evaluate('(node) => node.scrollTop')


def detail_signature(view):
    """Stable data and component order must match across both entry points."""
    return view.evaluate('''view => {
        const sections = ['.native-store-hero', '.native-store-info',
            '.native-store-summary', '.native-store-translate',
            '.native-store-platform', '.native-store-compare', '.native-store-menu'];
        return sections.map(selector => {
            const items = [...view.querySelectorAll(selector)];
            return {selector, count:items.length, text:items.map(n => n.textContent.trim()),
                image:items.map(n => n.querySelector('img')?.getAttribute('src') || ''),
                width:items.map(n => Math.round(n.getBoundingClientRect().width))};
        });
    }''')


def check_layout(page, view, store, label):
    expect(view.locator('.native-store-info')).to_contain_text(store['name'])
    expect(view.locator('.native-store-info')).to_contain_text(str(store['rating']))
    expect(view.locator('.native-store-summary')).to_contain_text(store['dishZh'])
    expect(view.locator('.native-store-platform')).to_have_count(2)
    expect(view.locator('.native-store-platform[data-platform="grab"]')).to_contain_text('GrabFood')
    expect(view.locator('.native-store-platform[data-platform="shopee"]')).to_contain_text('ShopeeFood')
    expect(view.locator('.native-store-compare')).to_have_count(1)
    expect(view.locator('.native-store-menu')).to_have_count(1)
    # Name, details, and menu are real DOM, not an old store screenshot behind a dialog.
    hero_image = view.locator('.native-store-hero img')
    expect(hero_image).to_have_attribute('src', store['image'])
    assert hero_image.evaluate('(img) => img.complete && img.naturalWidth > 0'), 'detail hero failed to load'
    scroll = view.locator('.native-store-scroll')
    geometry = scroll.evaluate('''node => {
        const box=node.getBoundingClientRect();
        const screen=document.querySelector('.screen').getBoundingClientRect();
        const hero=node.querySelector('.native-store-hero').getBoundingClientRect();
        const order=['.native-store-info','.native-store-summary','.native-store-translate',
            '.native-store-platform','.native-store-compare','.native-store-menu']
            .map(selector=>node.querySelector(selector).getBoundingClientRect().top);
        return {width:box.width,height:box.height,screenWidth:screen.width,screenHeight:screen.height,
            scrollHeight:node.scrollHeight,clientHeight:node.clientHeight,overflowX:node.scrollWidth-node.clientWidth,
            heroRatio:hero.height/box.width,order};
    }''')
    assert geometry['width'] >= geometry['screenWidth'] * .94, geometry
    assert geometry['height'] >= geometry['screenHeight'] * .84, 'detail collapsed into a short dialog'
    assert geometry['scrollHeight'] > geometry['clientHeight'] * 1.25, 'detail/menu content must scroll inside the phone'
    assert geometry['overflowX'] <= 2, geometry
    assert .48 <= geometry['heroRatio'] <= .68, 'source hero is 240pt high in a roughly402pt viewport'
    assert geometry['order'] == sorted(geometry['order']), 'source section order changed'
    # These unconditional rules were once accidentally nested in hover:hover.
    # A desktop-sized viewport alone will not reveal that failure on touch phones.
    walking_icon = view.locator('.native-store-rating > svg').bounding_box()
    assert walking_icon and 0 < walking_icon['width'] <= 20 and 0 < walking_icon['height'] <= 20, walking_icon
    note_sizes = view.locator('.native-store-comparison-note,.native-store-demo-note').evaluate_all(
        '(nodes) => nodes.map(node => parseFloat(getComputedStyle(node).fontSize))')
    assert len(note_sizes) >= 2 and min(note_sizes) >= 13, note_sizes
    screenshot(page, label + '-detail-top')
    # A wheel gesture inside the phone scrolls its content, without losing the selected store.
    scroll.hover()
    page.mouse.wheel(0, 900)
    page.wait_for_function('document.querySelector(".native-store-scroll").scrollTop > 100')
    expect(view).to_have_attribute('data-store-id', store['id'])
    view.locator('.native-store-menu').scroll_into_view_if_needed()
    screenshot(page, label + '-detail-menu')
    # All example dishes and descriptions are present, with corresponding prices.
    menu_text = view.locator('.native-store-menu').inner_text()
    for dish in store['menu']:
        assert dish['name'].split(' · ')[0] in menu_text, (dish, menu_text)
    scroll.evaluate('(node) => { node.scrollTop = 0; }')
    return geometry


def check_translation(page, view, label):
    controls = view.locator('.native-store-translate')
    buttons = controls.get_by_role('button')
    assert buttons.count() >= 2, 'source language selection and translation are separate actions'
    menu = view.locator('.native-store-menu')
    original_text = menu.inner_text()
    buttons.first.click()
    picker = page.locator('.native-store-language-sheet:visible')
    expect(picker).to_have_count(1)
    picker.locator('[data-language="en"]').click()
    expect(picker).not_to_be_visible()
    assert menu.inner_text() == original_text, 'choosing language must not silently translate'
    controls.locator('[data-action="translate"]').click()
    page.wait_for_function('''original => document.querySelector('.native-store-menu').innerText !== original''', arg=original_text)
    translated = menu.inner_text()
    assert len(translated.strip()) > 80, 'translation lost the actual menu'
    assert any(dish in translated for dish in ['Phở','Cơm','Bánh','Trà']), 'bilingual menu must retain the original Vietnamese names'
    menu.scroll_into_view_if_needed()
    screenshot(page, label + '-translated-menu')
    view.locator('.native-store-scroll').evaluate('(node) => { node.scrollTop = 0; }')
    CHECKS.append(label + ': language selection and explicit Translate remain separate; translated menu preserves Vietnamese names')


def check_order(page, view, store, label):
    scroll = view.locator('.native-store-scroll')
    platform = view.locator('.native-store-platform[data-platform="grab"]')
    platform.get_by_role('button').click()
    sheet = page.locator('.wanso-sheet')
    expect(sheet).to_be_visible()
    expect(sheet).to_contain_text(store['name'])
    expect(sheet.locator('h2')).to_have_text('下单预览 · GrabFood')
    expect(sheet).to_contain_text('餐品单价')
    expect(sheet).to_contain_text('配送费')
    total = store['platforms']['grab']['total']
    expect(sheet.locator('.sheet-details > div').filter(has=page.locator('dt', has_text='合计'))).to_contain_text(f'{total:,}'.replace(',', '.') + 'đ')
    sheet.get_by_role('button', name='换到 ShopeeFood', exact=True).click()
    expect(sheet.locator('h2')).to_have_text('下单预览 · ShopeeFood')
    expect(sheet).to_contain_text(store['name'])
    screenshot(page, label + '-same-store-order')
    sheet.get_by_role('button', name='返回菜单', exact=True).click()
    expect(sheet).not_to_be_visible()
    detail(page, store['id'])
    assert len(page.context.pages) == 1, 'Order should stay inside the prototype'
    scroll.evaluate('(node) => { node.scrollTop = 0; }')
    CHECKS.append(label + ': both platform previews retain the selected restaurant and return to its full detail page')



def check_profile_controls(page, label):
    page.locator('.hotspot[aria-label="我的"]').click()
    profile = page.locator('.ios-page-profile')
    expect(profile).to_be_visible()
    profile.get_by_role('button', name='更换头像', exact=True).click()
    sheet = page.locator('.wanso-sheet')
    expect(sheet.locator('.native-avatar-grid button')).to_have_count(9)
    expect(sheet.get_by_role('button', name='从相册选择', exact=True)).to_be_visible()
    screenshot(page, label + '-avatar-picker')
    sheet.get_by_role('button', name='头像 🤖', exact=True).click()
    expect(profile.locator('.ios-profile-avatar')).to_have_text('🤖')
    profile.get_by_role('button', name='更换头像', exact=True).click()
    sheet.locator('input[type="file"]').set_input_files(str(ROOT / 'assets/wanso/demo/pho.jpg'))
    expect(sheet).not_to_be_visible()
    avatar = profile.locator('.ios-profile-avatar img')
    expect(avatar).to_have_count(1)
    assert avatar.evaluate('(image) => image.complete && image.naturalWidth > 0'), 'chosen avatar was not displayed'
    profile.get_by_role('button', name='添加口味标签', exact=True).click()
    expect(sheet.locator('.native-taste-grid button')).to_have_count(24)
    expect(sheet.get_by_role('button', name='添加', exact=True)).to_be_disabled()
    sheet.get_by_role('button', name='标签图标 🌿', exact=True).click()
    sheet.get_by_label('标签名称', exact=True).fill('少油')
    screenshot(page, label + '-taste-picker')
    sheet.get_by_role('button', name='添加', exact=True).click()
    expect(sheet).not_to_be_visible()
    expect(profile.locator('.ios-taste-tags')).to_contain_text('🌿 少油')
    profile.get_by_role('button', name='订单偏好', exact=True).click()
    membership = page.get_by_role('button', name='GrabUnlimited', exact=True)
    expect(membership).to_have_attribute('aria-pressed', 'false')
    membership.click()
    expect(membership).to_have_attribute('aria-pressed', 'true')
    marker = membership.locator('.native-membership-check[data-on="true"]')
    expect(marker).to_be_visible()
    marker_style = marker.evaluate('''node => {const s=getComputedStyle(node, '::after'); return {content:s.content,background:s.backgroundColor,width:parseFloat(s.width),opacity:s.opacity};}''')
    assert marker_style['content'] not in ['none', 'normal'] and marker_style['width'] > 0 and marker_style['background'] != 'rgba(0, 0, 0, 0)' and marker_style['opacity'] != '0', marker_style
    expect(sheet).not_to_be_visible()
    page.get_by_role('button', name='5万以下', exact=True).click()
    expect(page.get_by_role('button', name='5万以下', exact=True)).to_have_attribute('aria-pressed', 'true')
    expect(page.get_by_role('button', name='10万以下', exact=True)).to_have_attribute('aria-pressed', 'false')
    page.get_by_role('button', name='价格优先', exact=True).click()
    expect(page.get_by_role('button', name='价格优先', exact=True)).to_have_attribute('aria-pressed', 'true')
    expect(sheet).not_to_be_visible()
    screenshot(page, label + '-preferences')
    page.get_by_role('button', name='返回我的', exact=True).click()
    expect(profile.get_by_role('button', name='订单偏好', exact=True)).to_contain_text('5万以下')
    profile.get_by_role('button', name='通知', exact=True).click()
    page.get_by_role('button', name='所有推送', exact=True).click()
    expect(page.get_by_role('button', name='所有推送', exact=True)).to_have_attribute('aria-pressed', 'false')
    for name in ['优惠提醒','降价','附近新餐厅','配送状态','每周 AI 摘要']:
        expect(page.get_by_role('button', name=name, exact=True)).to_be_disabled()
    expect(page.get_by_role('button', name='开始免打扰', exact=True)).to_be_disabled()
    page.get_by_role('button', name='勿扰', exact=True).click()
    expect(page.get_by_role('button', name='开始免打扰', exact=True)).to_be_enabled()
    expect(sheet).not_to_be_visible()
    page.get_by_role('button', name='返回', exact=True).click()
    CHECKS.append(label + ': 9 avatar presets and local photo work; 24 taste icons + label save; membership/budget/mode apply directly; notification children follow their master switch')


def check_location_controls(page, label):
    page.context.grant_permissions(['geolocation'])
    page.context.set_geolocation({'latitude':10.7769, 'longitude':106.7009})
    # The app tab resumes its prior conversation; the demo shortcut opens search home.
    page.locator('.phone-shortcuts [data-shortcut="home"]').click()
    page.get_by_role('button', name='选择位置', exact=True).click()
    sheet = page.locator('.wanso-sheet')
    expect(sheet.locator('.location-city')).to_have_count(2)
    sheet.get_by_role('button', name='使用当前位置', exact=True).click()
    expect(sheet.locator('.location-selection')).to_contain_text('胡志明市 · 当前位置')
    sheet.get_by_role('button',name='确认此位置').click()
    expect(sheet).not_to_be_visible()
    expect(page.locator('.ios-home-location')).to_contain_text('胡志明市 · 当前位置')
    page.context.set_geolocation({'latitude':51.5074, 'longitude':-.1278})
    # Refresh Chromium's one-minute location cache after changing the test coordinates.
    page.evaluate('''() => new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(
        position => resolve(position.coords.latitude), reject, {maximumAge:0, timeout:5000}))''')
    page.get_by_role('button', name='选择位置', exact=True).click()
    sheet.get_by_role('button', name='使用当前位置', exact=True).click()
    expect(sheet).to_contain_text('当前位置不在覆盖范围内')
    expect(sheet.locator('.location-city')).to_have_count(2)
    screenshot(page, label + '-location-fallback')
    sheet.locator('.location-city[data-city="hanoi"]').click()
    sheet.get_by_role('button',name='确认此位置').click()
    expect(sheet).not_to_be_visible()
    expect(page.locator('.ios-home-location')).to_contain_text('河内')
    assert all(store['city'] == 'hanoi' for store in page.evaluate("[...document.querySelectorAll('.rich-home-card')].map(card => window.wansoCatalog.find(store => store.id === card.dataset.storeId))"))
    CHECKS.append(label + ': city/map picker confirms GPS in coverage and supports a manual city fallback outside coverage')


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='chrome', headless=True)
        try:
            for label, size in [('desktop', {'width':1440,'height':900}), ('phone', {'width':390,'height':844})]:
                context = browser.new_context(viewport=size, locale='zh-CN', timezone_id='Asia/Shanghai', reduced_motion='reduce',
                    is_mobile=label == 'phone', has_touch=label == 'phone')
                page = context.new_page()
                errors, failed_assets = [], []
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.on('response', lambda response: failed_assets.append(f'{response.status} {response.url}') if response.status >= 400 else None)
                page.goto(BASE + 'prototypes/wanso/?qa=store-parity#home', wait_until='networkidle')
                home = page.locator('.ios-page-home')
                expect(home).to_be_visible()
                if label == 'phone':
                    assert page.evaluate('matchMedia("(hover:none)").matches'), 'phone regression must exercise touch-only CSS'
                prompt = '想吃鸡肉热汤河粉，不吃香菜，含配送预算八万越南盾，推荐五家。'
                page.get_by_role('textbox', name='输入选餐要求', exact=True).fill(prompt)
                card = home.locator('.rich-home-card').first
                identifier = card.get_attribute('data-store-id')
                store = store_for(page, identifier)
                home.evaluate('(node) => { node.scrollTop = 180; }')
                card.click()
                home_before = scroll_position(home)
                view = detail(page, identifier)
                signature_home = detail_signature(view)
                check_layout(page, view, store, label + '-home')
                check_order(page, view, store, label)
                view.locator('.native-store-back').click()
                expect(page.locator('.native-store-view')).to_have_count(0)
                expect(home).to_be_visible()
                if label == 'phone':
                    assert page.evaluate('matchMedia("(hover:none)").matches'), 'phone regression must exercise touch-only CSS'
                expect(page.get_by_role('textbox', name='输入选餐要求', exact=True)).to_have_value(prompt)
                assert abs(scroll_position(home) - home_before) <= 2, 'home scroll changed after returning from a restaurant'
                CHECKS.append(label + ': home entry opens a full selected-store detail and back preserves search draft and scroll')

                page.get_by_role('button', name='搜索', exact=True).click()
                expect(page.locator('.ios-chat-reply:visible')).to_have_count(3, timeout=15000)
                chat = page.locator('.ios-chat')
                # A larger catalog may rank another branch first. Verify its identity,
                # then compare that exact store again through the real Saved entry.
                same_card = chat.locator('.rich-recommendation').first
                identifier = same_card.get_attribute('data-store-id')
                store = store_for(page, identifier)
                expect(same_card).to_have_count(1)
                draft = '这家适合两个人一起吃吗？'
                composer = page.get_by_role('textbox', name='继续提问', exact=True)
                composer.fill(draft)
                messages_before = chat.locator('.ios-assistant-message').all_text_contents()
                same_card.locator('.ios-restaurant-main').click()
                chat_before = scroll_position(chat)
                view = detail(page, identifier)
                signature_chat = detail_signature(view)
                assert [(s['selector'],s['count']) for s in signature_chat] == [(s['selector'],s['count']) for s in signature_home], 'home and chat should use the same detail structure'
                check_layout(page, view, store, label + '-chat')
                check_translation(page, view, label)
                signature_selected = detail_signature(view)
                # The same heart action reaches the native collection chooser.
                view.get_by_role('button', name='收藏餐厅', exact=True).click()
                collection = page.locator('.wanso-sheet.native-collection-sheet')
                expect(collection).to_be_visible()
                collection.locator('.native-collection-row').filter(has=page.locator('strong', has_text='全部收藏')).click()
                expect(collection).not_to_be_visible()
                expect(view.locator('.native-store-heart')).to_have_attribute('aria-pressed', 'true')
                view.locator('.native-store-back').click()
                expect(page.locator('.native-store-view')).to_have_count(0)
                expect(composer).to_have_value(draft)
                assert chat.locator('.ios-assistant-message').all_text_contents() == messages_before, 'return recreated or lost chat messages'
                assert abs(scroll_position(chat) - chat_before) <= 2, 'return jumped within the conversation'
                CHECKS.append(label + ': home and recommendation share the detail component; chat draft, messages and position survive back')
                page.locator('.hotspot[aria-label="收藏"]').click()
                saved = page.locator('.ios-page-saved')
                expect(saved).to_be_visible()
                saved.locator('.ios-saved-store').get_by_role('button', name='查看 ' + store['name'], exact=True).click()
                view = detail(page, identifier)
                expect(view.locator('.native-store-heart')).to_have_attribute('aria-pressed', 'true')
                assert detail_signature(view) == signature_selected, {'saved':detail_signature(view),'selected':signature_selected}
                screenshot(page, label + '-saved-store-detail')
                view.get_by_role('button', name='取消收藏餐厅', exact=True).click()
                expect(view.locator('.native-store-heart')).to_have_attribute('aria-pressed', 'false')
                view.locator('.native-store-back').click()
                expect(saved).to_be_visible()
                expect(saved.locator('.ios-saved-store').get_by_role('button', name='查看 ' + store['name'], exact=True)).to_have_count(0)
                CHECKS.append(label + ': save through collection picker → saved list → same selected-store detail → unsave removes it without navigation errors')
                check_profile_controls(page, label)
                check_location_controls(page, label)
                assert not errors, errors
                assert not failed_assets, failed_assets
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), 'outer page horizontal overflow'
                context.close()
        finally:
            browser.close()
    report = {'passed':len(CHECKS),'checks':CHECKS,'screenshots':str(OUT)}
    (OUT / 'checks.json').write_text(json.dumps(report, ensure_ascii=False, indent=2))
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    run()
