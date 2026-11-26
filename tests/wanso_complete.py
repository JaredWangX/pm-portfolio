"""Focused browser regression for the source-based Wanso portfolio prototype.

Run with the portfolio HTTP server listening on 8765, or set PORTFOLIO_URL.
Screenshots and the check report go to the ignored work/wanso-complete folder.
The prototype intentionally uses local illustrative menus, without a live model.
"""
import json
import os
import re
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

BASE = os.getenv('PORTFOLIO_URL', 'http://127.0.0.1:8765/').rstrip('/') + '/'
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'work' / 'wanso-complete'
OUT.mkdir(parents=True, exist_ok=True)
checks = []


def inspect_page(page, errors, responses):
    assert not errors, errors
    assert not responses, responses
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), 'document overflows horizontally'
    failed = page.locator('img:visible').evaluate_all(
        '(images) => images.filter(i => i.complete && !i.naturalWidth).map(i => i.src)'
    )
    assert not failed, failed


def open_page(browser, size, frame='home', fixed_time=None):
    context = browser.new_context(viewport=size, locale='zh-CN', timezone_id='Asia/Shanghai')
    if fixed_time:
        context.add_init_script('''(() => {
            const RealDate = Date;
            const instant = RealDate.parse(%s);
            class FrozenDate extends RealDate {
                constructor(...args) { super(...(args.length ? args : [instant])); }
                static now() { return instant; }
            }
            window.Date = FrozenDate;
        })();''' % json.dumps(fixed_time))
    page = context.new_page()
    errors, responses = [], []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('response', lambda response: responses.append(f'{response.status} {response.url}') if response.status >= 400 else None)
    page.goto(BASE + 'prototypes/wanso/?qa=complete#' + frame, wait_until='networkidle')
    expect(page.locator('.load-error')).not_to_be_visible()
    return context, page, errors, responses


def screenshot(page, name):
    page.screenshot(path=str(OUT / f'{name}.png'))


def visible(page, selector):
    return page.locator(selector + ':visible')


def navigate(page, frame):
    page.evaluate('(frame) => { location.hash = frame; }', frame)
    page.wait_for_function('(frame) => location.hash === "#" + frame', arg=frame)


def current_store_data(page, selector):
    cards = page.locator(selector) if isinstance(selector, str) else selector
    ids = cards.evaluate_all('(cards) => cards.map(card => card.dataset.storeId)')
    return page.evaluate('(ids) => ids.map(id => window.wansoCatalog.find(store => store.id === id))', ids)


def send_followup(page, text, count):
    page.get_by_role('textbox', name='继续提问', exact=True).fill(text)
    page.get_by_role('button', name='发送追问', exact=True).click()
    expect(visible(page, '.ios-user-message')).to_have_count(count)
    expect(visible(page, '.rich-processing')).to_be_visible()
    expect(visible(page, '.ios-chat-reply')).to_have_count(count, timeout=10000)
    expect(visible(page, '.rich-processing')).to_have_count(0)


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(channel='chrome', headless=True)
    for name, size in [('desktop', {'width': 1440, 'height': 900}), ('phone', {'width': 390, 'height': 844})]:
        context, page, errors, responses = open_page(browser, size)
        cards = page.locator('.rich-home-rail > .rich-home-card')
        expect(cards).to_have_count(5)
        for card in cards.all():
            expect(card.locator('[data-platform="grab"]')).to_have_count(1)
            expect(card.locator('[data-platform="shopee"]')).to_have_count(1)
        heights = cards.evaluate_all('(items) => items.map(item => item.getBoundingClientRect().height)')
        assert max(heights) - min(heights) < 1, heights
        screenshot(page, name + '-home')

        batches = []
        for index in range(6):
            batches.extend(cards.evaluate_all('(items) => items.map(item => item.dataset.storeId)'))
            page.get_by_role('button', name='刷新万象精选', exact=True).click()
        assert len(set(batches)) == 30, batches
        checks.append(f'{name}: 5 equal-height dual-platform cards; 30 unique Hanoi branches across six refreshes')

        page.get_by_role('button', name='选择位置', exact=True).click()
        sheet = page.locator('.wanso-sheet')
        expect(sheet.locator('.native-city-row')).to_have_count(3)
        sheet.locator('.native-city-row').filter(has=page.locator('strong', has_text='胡志明市')).click()
        expect(sheet).not_to_be_visible()
        expect(page.locator('.ios-home-location')).to_contain_text('胡志明市')
        assert all(store['city'] == 'hcm' for store in current_store_data(page, '.rich-home-card'))
        page.get_by_role('button', name='选择位置', exact=True).click()
        sheet.locator('.native-city-row').filter(has=page.locator('strong', has_text='河内')).click()
        expect(sheet).not_to_be_visible()
        expect(page.locator('.ios-home-location')).to_contain_text('河内')
        checks.append(f'{name}: source city picker has GPS and two city rows; city selection updates featured restaurants')

        # Use the actual search form; the six-step sequence must finish before results.
        prompt = '想吃鸡肉热汤河粉，不吃香菜，含配送预算八万越南盾，推荐五家。'
        page.get_by_role('textbox', name='输入选餐要求', exact=True).fill(prompt)
        page.get_by_role('button', name='搜索', exact=True).click()
        progress = visible(page, '.rich-processing')
        expect(progress).to_be_visible()
        expect(progress.locator('.rich-step-list li')).to_have_count(6)
        page.wait_for_function('document.querySelectorAll(".rich-step-list [data-state=done]").length >= 2')
        screenshot(page, name + '-processing')
        expect(visible(page, '.ios-chat-reply')).to_have_count(3, timeout=10000)
        expect(visible(page, '.ios-user-message')).to_have_count(3)
        expect(visible(page, '.ios-user-message').first).to_have_text(prompt)
        rails = visible(page, '.rich-chat-rail')
        expect(rails).to_have_count(3)
        for rail in rails.all():
            expect(rail.locator('.rich-recommendation')).to_have_count(5)
            expect(rail.locator('[data-platform="grab"].rich-offer')).to_have_count(5)
            expect(rail.locator('[data-platform="shopee"].rich-offer')).to_have_count(5)
        for answer in visible(page, '.ios-assistant-message').all_text_contents():
            assert len(answer) > 120, answer
        chat = visible(page, '.ios-chat')
        chat.evaluate('(node) => { node.scrollTop = 0; }')
        screenshot(page, name + '-chat')
        assert chat.evaluate('(node) => node.scrollHeight > node.clientHeight'), 'conversation must scroll within the phone'
        checks.append(f'{name}: six processing states finish; three substantive rounds with five dual-platform recommendations each')

        # Both entry points now use the same full scrolling restaurant detail.
        first = rails.first.locator('.rich-recommendation').first
        store_id = first.get_attribute('data-store-id')
        first.locator('.ios-restaurant-main').click()
        detail = page.locator('.native-store-view')
        expect(detail).to_have_attribute('data-store-id', store_id)
        expect(sheet).not_to_be_visible()
        assert detail.locator('.native-store-menu-row').count() >= 3
        detail.get_by_role('button', name='立即下单 · GrabFood', exact=True).click()
        expect(sheet.locator('h2')).to_have_text('下单预览 · GrabFood')
        expect(sheet).to_contain_text('配送费')
        sheet.get_by_role('button', name='换到 ShopeeFood', exact=True).click()
        expect(sheet.locator('h2')).to_have_text('下单预览 · ShopeeFood')
        screenshot(page, name + '-order')
        sheet.get_by_role('button', name='返回菜单', exact=True).click()
        expect(sheet).not_to_be_visible()
        expect(detail).to_have_attribute('data-store-id', store_id)
        detail.get_by_role('button', name='返回上一页', exact=True).click()
        expect(detail).to_have_count(0)
        expect(visible(page, '.ios-chat-reply')).to_have_count(3)
        assert len(context.pages) == 1, 'Order should remain in the prototype'
        checks.append(f'{name}: menu → GrabFood preview → ShopeeFood comparison → menu → same conversation')

        send_followup(page, '改成素食，不吃鸡肉，不要热汤，预算八万越南盾含配送。', 4)
        last = visible(page, '.ios-chat-reply').last.locator('.rich-chat-rail')
        expect(last.locator('.rich-recommendation')).to_have_count(5)
        stores = current_store_data(page, last.locator('.rich-recommendation'))
        assert len(stores) == 5 and all(store['vegetarian'] for store in stores), stores
        send_followup(page, '保持刚才的素食要求，预算调整为七万越南盾含配送。', 5)
        stores = current_store_data(page, visible(page, '.ios-chat-reply').last.locator('.rich-recommendation'))
        assert len(stores) == 5 and all(store['vegetarian'] and min(p['total'] for p in store['platforms'].values()) <= 70000 for store in stores), stores
        checks.append(f'{name}: follow-ups preserve dietary constraints and apply the latest total budget')
        inspect_page(page, errors, responses)
        context.close()

    # Vietnam local time is independent of the visitor's China browser timezone.
    for bucket, utc, headline in [
        ('morning', '2026-11-27T01:00:00Z', '早餐能量'),
        ('noon', '2026-11-27T05:00:00Z', '午饭时间'),
        ('afternoon', '2026-11-27T09:00:00Z', '下午零食'),
        ('night', '2026-11-27T15:00:00Z', '今晚你'),
    ]:
        context, page, errors, responses = open_page(browser, {'width': 390, 'height': 844}, 'explore', utc)
        explore = page.locator('.ios-page-explore')
        expect(explore).to_have_attribute('data-time-of-day', bucket)
        expect(explore.locator('.ios-photo-copy h1')).to_contain_text(headline)
        expect(explore.locator('.ios-scenario')).to_have_count(4)
        expect(explore.locator('.ios-explore-store')).to_have_count(5)
        screenshot(page, 'explore-' + bucket)
        explore.locator('.ios-scenario').first.click()
        expect(visible(page, '.rich-processing')).to_be_visible()
        expect(visible(page, '.ios-chat-reply')).to_have_count(3, timeout=10000)
        prompt = visible(page, '.ios-user-message').first.inner_text()
        assert {'morning': '早餐', 'noon': '午餐', 'afternoon': '下午', 'night': '加班'}[bucket] in prompt, prompt
        first_reply = visible(page, '.ios-chat-reply').first
        expect(first_reply.locator('.rich-recommendation')).to_have_count(5)
        if bucket == 'afternoon':
            stores = current_store_data(page, first_reply.locator('.rich-recommendation'))
            assert all(store['key'] == 'coffee' for store in stores), 'coffee scenario must not return chicken soup'
        inspect_page(page, errors, responses)
        checks.append(f'Explore {bucket}: Vietnam timezone, four matching scenarios, five picks and scenario prompt reaches the conversation')
        context.close()

    context, page, errors, responses = open_page(browser, {'width': 1440, 'height': 900})
    page.get_by_role('textbox', name='输入选餐要求', exact=True).fill('两个人想吃鸡肉热汤河粉，含配送总预算十五万越南盾。')
    page.get_by_role('button', name='搜索', exact=True).click()
    expect(visible(page, '.ios-chat-reply')).to_have_count(3, timeout=10000)
    first_reply = visible(page, '.ios-chat-reply').first
    expect(first_reply.locator('.rich-recommendation')).to_have_count(5)
    expect(first_reply.locator('.rich-total-label').first).to_contain_text(re.compile(r'2\s*份'))
    store = current_store_data(page, first_reply.locator('.rich-recommendation').first)[0]
    first_reply.locator('.rich-offer[data-platform="grab"]').first.click()
    sheet = page.locator('.wanso-sheet')
    expect(sheet.locator('.sheet-details > div').filter(has=page.locator('dt', has_text='份数'))).to_contain_text('2')
    total = store['platforms']['grab']['price'] * 2 + store['platforms']['grab']['fee'] - store['platforms']['grab']['discount']
    expect(sheet.locator('.sheet-details > div').filter(has=page.locator('dt', has_text='合计'))).to_contain_text(f'{total:,}')
    screenshot(page, 'two-person-order')
    inspect_page(page, errors, responses)
    checks.append('Two-person Chinese budget: 十五万 parses as 150,000; two portions share one delivery fee in cards and Order preview')
    context.close()
    browser.close()

(OUT / 'checks.json').write_text(json.dumps(checks, ensure_ascii=False, indent=2))
print(json.dumps({'passed': len(checks), 'checks': checks, 'screenshots': str(OUT)}, ensure_ascii=False, indent=2))
