"""Run with a local http server on port 8765 and Python Playwright + Chrome installed.

Checks the visitor's guided tour, manual controls, failure recovery and contact paths.
Screenshots are optional evidence, not committed test fixtures.
"""
import json
import os
import re
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = os.environ.get('PORTFOLIO_URL', 'http://127.0.0.1:8765/').rstrip('/') + '/'
ROOT = Path(__file__).resolve().parents[1]
checks = []

with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    context = browser.new_context(viewport={'width': 1440, 'height': 900})
    context.grant_permissions(['clipboard-read', 'clipboard-write'])
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))

    def loaded(frame_id):
        page.wait_for_function('id => location.hash === "#"+id && !document.querySelector(".viewer").hasAttribute("aria-busy")', arg=frame_id)

    def guide():
        if (page.locator('.flow-toggle').count()
                and not page.locator('body').evaluate('(body)=>body.classList.contains("wide-phone-review")')
                and not page.locator('.flow-dialog').evaluate('(d)=>d.open')):
            page.locator('.flow-toggle').click()

    def replay_path(product):
        return 'prototypes/' + product + '/' + ('replay.html' if product == 'onentra' else '')

    def open_catalog():
        guide()
        if not page.locator('.catalog').evaluate('(details)=>details.open'):
            page.locator('.catalog summary').click()

    if '--layout-only' not in sys.argv:
        for product in ['wanso', 'onentra']:
            data = json.loads((ROOT / 'prototypes' / product / 'screens.json').read_text())
            page.goto(BASE + replay_path(product))
            loaded(data['default'])
            assert page.locator('.autoplay').get_attribute('aria-pressed') == 'false'
            page.locator('.autoplay').click()
            assert page.locator('.autoplay').get_attribute('aria-pressed') == 'true'
            first = page.url
            page.wait_for_function('url => location.href !== url', arg=first, timeout=12000)
            assert page.locator('.page-counter').inner_text() == f"2 / {len(data['flows'][0]['steps'])}"
            page.locator('.next' if product == 'wanso' else '.continue').click()
            loaded(data['flows'][0]['steps'][2]['id'])
            assert page.locator('.autoplay').get_attribute('aria-pressed') == 'false'
            manual = page.url
            page.wait_for_timeout(10300)
            assert page.url == manual, 'manual inspection must remain paused'
            page.locator('.autoplay').click()
            page.wait_for_function('url => location.href !== url', arg=manual, timeout=12000)
            page.locator('.autoplay').click()

            for i, flow in enumerate(data['flows']):
                guide()
                page.locator('.flow-selector button').nth(i).click()
                for step in flow['steps']:
                    guide()
                    page.locator('[data-step="' + step['id'] + '"]').click()
                    loaded(step['id'])
                    assert page.locator('.step-caption').inner_text() == step['caption']
                    assert page.locator('.page-description').inner_text() == step['reason']
                if product == 'wanso':
                    guide()
                    page.locator('.flow-selector button').nth(i).click()
                else:
                    page.locator('.continue').click()
                loaded(flow['steps'][0]['id'])
            open_catalog()
            for frame in data['frames']:
                guide()
                page.locator('[data-screen="' + frame['id'] + '"]').click()
                loaded(frame['id'])
                assert page.locator('.page-layer:not(.leaving) .original-screen').evaluate('(img)=>img.complete && img.naturalWidth>0')
                ratio = page.locator('.page-layer:not(.leaving) .original-screen').evaluate('(img)=>img.clientWidth/img.clientHeight')
                assert abs(ratio - frame['width'] / frame['height']) < .015
            # A catalog selection is free browsing; Continue explicitly returns to the guided flow.
            assert page.locator('.continue').inner_text() == '回到流程 →'
            if product == 'wanso':
                guide()
                page.locator('.flow-selector button').last.click()
            else:
                page.locator('.continue').click()
            loaded(data['flows'][-1]['steps'][0]['id'])
            guide()
            page.locator('.zoom-toggle').click()
            assert 'zoomed' in page.locator('body').get_attribute('class')
            page.keyboard.press('Escape')
            assert 'zoomed' not in page.locator('body').get_attribute('class')
            checks.append(product + ': autoplay, pause/resume, ' + str(len(data['flows'])) + ' flows, catalog, image proportions, zoom')

        page.goto(BASE + 'prototypes/wanso/#home')
        loaded('home')
        geometry = page.locator('.viewport').bounding_box()
        active = page.locator('.page-layer:not(.leaving)')
        active.get_by_role('button', name='搜索', exact=True).click()
        loaded('generating')
        loaded('writing')
        loaded('recommend')
        assert page.locator('.viewport').bounding_box() == geometry
        assert page.locator('.hotspot-dot, .hotspot-toggle').count() == 0
        popups = []
        page.on('popup', lambda popup: popups.append(popup.url))
        active.get_by_role('button', name='Hương Vị Mộc · ShopeeFood 下单').click()
        order = page.get_by_role('dialog', name='下单预览', exact=True)
        assert '73,000 ₫' in order.inner_text()
        assert '以平台结算为准' in order.inner_text()
        order.get_by_role('button', name='查看菜单', exact=True).click()
        assert 'Phở trộn gà đùi' in page.locator('.wanso-sheet').inner_text()
        page.get_by_role('button', name='返回下单预览', exact=True).click()
        page.keyboard.press('Escape')
        assert page.locator('.wanso-sheet').is_hidden()
        assert page.url.endswith('#recommend') and not popups
        def drag_restaurants(start, end):
            rail = page.locator('.ios-carousel').bounding_box()
            x0, y0 = rail['x'], rail['y'] + rail['height'] * .42
            page.mouse.move(x0 + rail['width'] * start, y0)
            page.mouse.down()
            page.mouse.move(x0 + rail['width'] * end, y0, steps=10)
            page.mouse.up()

        drag_restaurants(.8,.23)
        loaded('recommend-2')
        active.get_by_role('button', name='Phở Quyên · GrabFood 下单').click()
        assert '71,000 ₫' in order.inner_text()
        assert '24,000 ₫ → 12,000 ₫' in order.inner_text()
        order.get_by_role('button', name='关闭', exact=True).click()
        assert page.url.endswith('#recommend-2') and not popups
        active.get_by_role('button', name='查看 Phở Quyên 菜单').click()
        loaded('store-second')
        assert active.locator('.ios-menu li').count() == 35
        active.get_by_role('button', name='返回', exact=True).click()
        loaded('recommend-2')
        drag_restaurants(.23,.8)
        loaded('recommend')
        active.get_by_role('button', name='查看 Hương Vị Mộc 菜单').click()
        loaded('store-first')
        assert active.locator('.ios-menu li').count() == 72
        page.goto(BASE + 'prototypes/wanso/#compare')
        loaded('compare')
        assert active.locator('.phone-scroll').evaluate('(s)=>s.scrollTop>0')
        active.get_by_role('button', name='Hương Vị Mộc · GrabFood 下单').click()
        assert '68,000 ₫' in order.inner_text()
        assert '40,000 ₫' in order.inner_text()
        scroll_top = active.locator('.phone-scroll').evaluate('(s)=>s.scrollTop')
        page.keyboard.press('Escape')
        assert active.locator('.phone-scroll').evaluate('(s)=>s.scrollTop') == scroll_top
        assert page.url.endswith('#compare') and not popups
        assert page.locator('.autoplay').get_attribute('aria-pressed') == 'false'
        checks.append('Wanso native replay: search, swipe, local order and menu sheets, comparison, preserved menu scroll, no popups')

        mobile = browser.new_context(**p.devices['iPhone 13'], reduced_motion='reduce')
        touch_page = mobile.new_page()
        touch_page.goto(BASE + 'prototypes/wanso/#recommend')
        cdp = mobile.new_cdp_session(touch_page)

        def swipe(box, start, end):
            for step in range(11):
                fraction = step / 10
                x, y = [first + (last - first) * fraction for first, last in zip(start, end)]
                cdp.send('Input.dispatchTouchEvent', {
                    'type': 'touchStart' if step == 0 else 'touchMove',
                    'touchPoints': [{'x': box['x'] + x * box['width'], 'y': box['y'] + y * box['height']}],
                })
                touch_page.wait_for_timeout(16)
            cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})

        touch_page.locator('.ios-carousel').wait_for()
        swipe(touch_page.locator('.ios-carousel').bounding_box(), (.78,.38), (.22,.38))
        touch_page.wait_for_url('**/#recommend-2')
        chat = touch_page.locator('.ios-chat')
        swipe(chat.bounding_box(), (.61,.84), (.61,.46))
        touch_page.wait_for_function("document.querySelector('.ios-chat').scrollTop > 40")
        assert touch_page.get_by_role('button', name='⧉ 复制', exact=True).is_visible()
        merchant = touch_page.get_by_role('button', name='查看 Phở Quyên 菜单')
        merchant.scroll_into_view_if_needed()
        touch_page.wait_for_timeout(230)
        chat_top = chat.evaluate('e=>e.scrollTop')
        card_left = touch_page.locator('.ios-carousel').evaluate('e=>e.scrollLeft')
        merchant.tap()
        touch_page.wait_for_url('**/#store-second')
        scroller = touch_page.locator('.phone-scroll')
        scroller.wait_for()
        assert scroller.evaluate('(s)=>s.scrollHeight > 1.5*s.clientHeight')
        visible_box = scroller.bounding_box()
        visible_box['height'] = min(visible_box['height'], touch_page.viewport_size['height'] - visible_box['y'] - 12)
        swipe(visible_box, (.52,.8), (.52,.26))
        touch_page.wait_for_function("document.querySelector('.phone-scroll').scrollTop > 80")
        swipe(touch_page.locator('.screen').bounding_box(), (.017,.52), (.64,.52))
        touch_page.wait_for_url('**/#recommend-2')
        assert abs(chat.evaluate('e=>e.scrollTop') - chat_top) < 3
        assert abs(touch_page.locator('.ios-carousel').evaluate('e=>e.scrollLeft') - card_left) < 3
        touch_page.get_by_role('textbox',name='继续提问').fill('加上配送费多少钱？')
        touch_page.get_by_role('button',name='发送追问').tap()
        assert '71.000đ' in touch_page.locator('.ios-followup').inner_text()
        touch_page.locator('.screen').get_by_role('button',name='探索',exact=True).tap()
        touch_page.wait_for_url('**/#explore')
        explore = touch_page.locator('.phone-scroll')
        swipe(explore.bounding_box(), (.53,.88), (.53,.37))
        touch_page.wait_for_function("document.querySelector('.phone-scroll').scrollTop > 150")
        explore_top = explore.evaluate('e=>e.scrollTop')
        touch_page.locator('.screen').get_by_role('button',name='首页',exact=True).tap()
        touch_page.wait_for_url('**/#recommend-2')
        touch_page.locator('.screen').get_by_role('button',name='探索',exact=True).tap()
        touch_page.wait_for_url('**/#explore')
        assert abs(explore.evaluate('e=>e.scrollTop') - explore_top) < 3
        mobile.close()
        checks.append('real touch: continuous chat and menus, native edge-back restores both offsets, conversation persists across tabs')

        page.goto(BASE + 'prototypes/wanso/?routes=1#saved')
        loaded('saved')
        active.get_by_role('button', name='查看 Hương Vị Mộc', exact=True).click()
        loaded('store-first')
        active.get_by_role('button', name='生成 AI 总结', exact=True).click()
        loaded('summary-first')
        active.get_by_role('button', name='选择菜单翻译语言', exact=True).click()
        page.get_by_role('dialog', name='翻译为', exact=True).get_by_role('button', name='中文', exact=True).click()
        loaded('summary-first')
        active.get_by_role('button', name='翻译菜单', exact=True).click()
        assert '鸡腿拌河粉' in active.locator('.ios-menu').inner_text()
        active.get_by_role('button', name='返回', exact=True).click()
        loaded('saved')
        checks.append('native store summary and selected menu language correctly return to the source page')

        page.goto(BASE + replay_path('onentra') + '?routes=1#23')
        loaded('23')
        page.evaluate("window.originalImage = document.querySelector('.original-screen')")
        active.get_by_role('button',name='工作台',exact=True).click()
        assert page.evaluate("window.originalImage === document.querySelector('.original-screen')")
        onentra_routes = {
            '项目协作':'projects','AI 员工':'staff','专家团队':'teams','用户管理':'users',
            '知识库':'knowledge','我的技能':'skills','技能市场':'market','模型管理':'models',
            '个人设置':'settings','系统设置':'system',
        }
        for label, frame_id in onentra_routes.items():
            active.get_by_role('button',name=label,exact=True).click()
            loaded(frame_id)
            assert page.locator('.original-screen').evaluate('(img) => img.complete && img.naturalWidth > 0')
        active.get_by_role('button',name='数据库',exact=True).click()
        loaded('database')
        delayed = []
        query_image = re.compile(r'/db-support-query\.webp(?:\?|$)')
        page.route(query_image, lambda route: delayed.append(route))
        active.get_by_role('button',name='查询客户服务数据',exact=True).click()
        page.wait_for_function("document.querySelector('.viewer').getAttribute('aria-busy') === 'true'")
        page.wait_for_timeout(600)
        assert delayed and page.url.endswith('#database')
        assert page.locator('.original-screen').evaluate('(img) => img.complete && img.naturalWidth > 0')
        assert page.locator('.page-layer').count() == 1
        delayed[0].fulfill(path=str(ROOT/'assets/onentra/current/db-support-query.webp'))
        loaded('db-support-query')
        page.unroute(query_image)
        active.get_by_role('button',name='关闭客户服务数据查询',exact=True).click()
        loaded('database')
        checks.append('actual sidebar pages, same-page clicks, slow image swap and matching query return')
        for slug in ['wanso-prd','onentra-prd','recommendation-review','delivery-review']:
            page.goto(BASE)
            page.locator('a[href="documents/'+slug+'/"]').click()
            assert '/documents/'+slug+'/' in page.url
            assert len(page.locator('.reading-content').inner_text()) > 1500
            link = page.locator('.reader-contents nav a').nth(2)
            target = link.get_attribute('href')
            link.click()
            page.wait_for_timeout(600)
            assert page.locator(target).bounding_box()['y'] >= 70
            assert page.locator(target).bounding_box()['y'] < 160
            page.evaluate('window.__printed=false;window.print=()=>window.__printed=true')
            page.locator('.print-document').click()
            assert page.evaluate('window.__printed')
        checks.append('4 complete documents: reachable links, section anchors, print action')

        for slug in ['recommendation-review','delivery-review']:
            page.goto(BASE + 'documents/' + slug + '/')
            assert page.locator('.decision-example').count() == 1
            assert page.locator('.reference-notes a[href^="https://"]').count() >= 3
            assert page.locator('#validation table tbody tr').count() == 3
        checks.append('project-specific decisions, inspectable examples and attributed research')

        # An unavailable image must give a working retry, not an indefinitely frozen player.
        home_image = re.compile(r'/assets/wanso/native/home\.webp(?:\?|$)')
        page.route(home_image, lambda route: route.abort())
        page.goto(BASE + 'prototypes/wanso/')
        page.locator('.load-error:not([hidden])').wait_for()
        page.unroute(home_image)
        page.locator('.retry').click()
        loaded('home')
        assert page.locator('.load-error').is_hidden()
        checks.append('image failure: clear error + retry recovers')

        manifest = re.compile(r'/prototypes/wanso/screens\.json(?:\?|$)')
        page.route(manifest, lambda route: route.fulfill(status=503, body='Temporarily unavailable'))
        page.goto(BASE + 'prototypes/wanso/?retry-manifest=1#profile')
        page.locator('.load-error:not([hidden])').wait_for()
        page.evaluate('window.retryProbe = true')
        page.unroute(manifest)
        page.locator('.retry').click()
        loaded('profile')
        assert page.evaluate('window.retryProbe')
        checks.append('manifest failure: retry restores requested page without reloading')

    page.goto(BASE)
    assert '国际人工智能顶级会议 ICLR 2026' in page.locator('.education').inner_text()
    assert page.locator('.paper-link').get_attribute('href').startswith('https://proceedings.iclr.cc/')
    page.locator('[data-copy-email]').click()
    page.wait_for_function('document.querySelector(".copy-feedback").textContent.includes("已复制")')
    assert page.evaluate('navigator.clipboard.readText()') == '13971032326@163.com'
    assert page.locator('a[href^="mailto:"]').first.get_attribute('href') == 'mailto:13971032326@163.com'
    checks.append('contact: real mailto and clipboard')

    for width in [1440,1024,768,390,320]:
        page.set_viewport_size({'width':width,'height':900 if width>640 else 844})
        for path in ['', 'wanso/', 'onentra/', 'prototypes/wanso/', 'prototypes/onentra/', 'documents/wanso-prd/', 'documents/onentra-prd/', 'documents/recommendation-review/', 'documents/delivery-review/']:
            page.goto(BASE + path)
            page.wait_for_timeout(350)
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1'), (width,path)
            assert not page.locator('img').evaluate_all('(imgs)=>imgs.some(i=>i.getBoundingClientRect().width>0 && i.complete && !i.naturalWidth)'), (width,path)
    checks.append('9 pages × 5 widths: no horizontal overflow or broken visible images')

    page.goto(BASE)
    page.locator('.menu').click()
    page.locator('#mobile-nav a[href="#contact"]').click()
    assert page.locator('#mobile-nav').is_hidden()
    assert page.locator('.menu').get_attribute('aria-expanded') == 'false'
    checks.append('mobile navigation closes after selecting Contact')

    page.goto(BASE + '?deep-link-test=1#about')
    page.wait_for_timeout(100)
    first_y = page.locator('#about').bounding_box()['y']
    page.wait_for_timeout(700)
    assert first_y < 180 and abs(page.locator('#about').bounding_box()['y'] - first_y) < 2
    checks.append('deep links: immediate, stable section position')

    for product, target in [('wanso','recommend'),('onentra','38')]:
        page.goto(BASE + replay_path(product))
        page.locator('.viewer').wait_for()
        if product == 'wanso':
            loaded('home')
        open_catalog()
        page.locator('[data-screen="'+target+'"]').click()
        loaded(target)
        page.wait_for_timeout(1000)
        boxes = page.evaluate('''()=>{
            const guide=document.querySelector('.step-guide').getBoundingClientRect();
            const footer=document.querySelector('.viewer-footer').getBoundingClientRect();
            return {bottom:guide.bottom,top:footer.top};
        }''')
        assert boxes['bottom'] <= boxes['top'] + 1
        assert page.locator('.viewer').bounding_box()['y'] < (50 if product == 'wanso' else 10)
    checks.append('mobile catalog: returns to preview; guide never overlaps playback')

    page.set_viewport_size({'width':1440,'height':900})
    page.goto(BASE)
    assert page.locator('[data-device-project]').count() == 2
    assert page.locator('[data-device-project="wanso"]').is_visible()
    assert page.locator('[data-device-project="onentra"]').is_visible()
    iframe = page.frame_locator('[data-device-frame="wanso"]')
    laptop = page.frame_locator('[data-workbench-frame]')
    iframe.locator('.page-layer:not(.leaving) .original-screen').wait_for()
    for frame_id in ['explore','recommend','compare','home']:
        page.locator('[data-device-target="wanso"][data-frame="'+frame_id+'"]').click()
        iframe.locator('.original-screen[alt*="WANSO"]').first.wait_for()
        page.wait_for_function('''id=>document.querySelector('[data-device-frame=wanso]').contentWindow.location.hash==='#'+id''',arg=frame_id)
    laptop.get_by_text('工作台', exact=True).first.wait_for()
    workbench_frame = page.locator('[data-workbench-frame]')
    workspace = workbench_frame.element_handle().content_frame()
    workspace.evaluate('window.portfolioSmokeMarker = true')
    page.locator('.device-controls [data-workbench-route="files"]').click()
    # Use screen coordinates for the scaled laptop iframe, including across local/public origins.
    sheet_link = laptop.locator('[data-action="file-preview"][data-id="case-weekly-sheet"]')
    sheet_link.evaluate("el => el.scrollIntoView({block:'center', behavior:'instant'})")
    workbench_frame.evaluate("el => el.scrollIntoView({block:'center', behavior:'instant'})")
    x, y = sheet_link.evaluate("el => {const b=el.getBoundingClientRect();return [b.x+b.width/2,b.y+b.height/2]}")
    left, top, scale = workbench_frame.evaluate("el => {const b=el.getBoundingClientRect();return [b.x,b.y,b.width/el.offsetWidth]}")
    page.mouse.click(left + x * scale, top + y * scale)
    laptop.get_by_role('dialog').get_by_text('下载文件', exact=True).wait_for()
    assert workspace.evaluate('window.portfolioSmokeMarker === true')
    assert page.locator('[data-current-product]').get_attribute('href').endswith('/#files')
    checks.append('device stage: native Wanso and actual ONENTRA file preview')

    page.locator('.phone-project [data-phone-preview]').click()
    phone = page.frame_locator('.phone-modal iframe')
    phone.locator('.page-layer:not(.leaving) .original-screen').wait_for()
    assert page.locator('.phone-modal').bounding_box()['width'] >= 420
    phone.locator('.flow-toggle').click()
    phone.locator('.flow-close').focus()
    page.keyboard.press('Escape')
    assert page.locator('#overlay').evaluate('(d)=>d.open')
    assert not phone.locator('.flow-dialog').evaluate('(d)=>d.open')
    phone.locator('.phone-shortcuts button').first.focus()
    page.keyboard.press('Escape')
    page.wait_for_function('!document.querySelector("#overlay").open')
    checks.append('wide phone dialog: original pages, nested Escape, close restore')

    page.goto(BASE)
    assert page.locator('#materials').count() == 0
    assert page.locator('.strengths .advantage-proof').count() == 0
    assert page.locator('.strengths article').count() == 4
    assert page.locator('.experience-detail').count() == 3
    page.locator('.experience-detail').nth(1).locator('summary').click()
    assert page.locator('.experience-detail').nth(1).locator('.experience-evidence').is_visible()
    for width, height in [(1440,900),(1024,768),(768,1024),(390,844),(320,640)]:
        page.set_viewport_size({'width':width,'height':height})
        if width > 760:
            for selector in ['.strengths article','.decision-project']:
                boxes = page.locator(selector).evaluate_all('(items)=>items.map(i=>({top:i.getBoundingClientRect().top,height:i.getBoundingClientRect().height}))')
                for left,right in zip(boxes[::2],boxes[1::2]):
                    if abs(left['top']-right['top'])<1:
                        assert abs(left['height']-right['height']) <= 1, (width,selector,boxes)
        page.locator('[data-phone-preview]').first.click()
        phone.locator('.page-layer:not(.leaving) .original-screen').wait_for(state='visible')
        modal = page.locator('.phone-modal').bounding_box()
        assert modal['x']>=0 and modal['y']>=0 and modal['x']+modal['width']<=width and modal['y']+modal['height']<=height
        assert modal['width'] >= min(420,width-22)
        screen = phone.locator('.screen').bounding_box()
        view = phone.locator('.viewport').bounding_box()
        assert screen['width'] <= view['width']+1 and screen['height'] <= view['height']+1
        image = phone.locator('.page-layer:not(.leaving) .original-screen')
        assert image.evaluate('(i)=>Math.abs(i.clientWidth/i.clientHeight-i.naturalWidth/i.naturalHeight)<.01')
        page.locator('.phone-modal .close').click()
    for width,height in [(1440,900),(1024,768),(768,1024),(390,844),(320,640)]:
        page.set_viewport_size({'width':width,'height':height})
        cards = page.locator('.project-summary')
        assert cards.count() == 2
        assert cards.evaluate_all("""cards=>cards.every(card=>{
          const text=card.querySelector(':scope > p').getBoundingClientRect();
          const action=card.querySelector('.actions').getBoundingClientRect();
          return text.bottom+8<=action.top;
        })"""), f'project summary text/action overlap at {width}px'
        if width>760:
            first,second = [card.bounding_box() for card in cards.all()]
            assert abs(first['y']-second['y'])<1 and abs(first['height']-second['height'])<1
            assert abs(cards.nth(0).locator('.actions').bounding_box()['y']-cards.nth(1).locator('.actions').bounding_box()['y'])<1
    checks.append('profile and responsive layout: retained content, expandable practices, consistent cards, readable phone width, reachable close')

    page.goto(BASE+'demos/wanso/')
    page.locator('.tabbar [data-nav="profile"]').click()
    if page.locator('html').get_attribute('lang') != 'zh-CN':
        page.locator('[data-app-settings]').click()
        page.locator('[name="language"]').select_option('zh')
        page.locator('#app-settings .send').click()
    assert page.locator('.title h1').inner_text() == '个人中心'
    page.locator('[data-add-taste]').click()
    page.locator('[data-pref="0"]').click()
    page.locator('#close').click()
    assert page.locator('[data-pref="0"]').get_attribute('aria-pressed') == 'true'
    page.reload()
    page.locator('.tabbar [data-nav="profile"]').click()
    assert page.locator('[data-pref="0"]').get_attribute('aria-pressed') == 'true'
    page.locator('[data-order-settings]').click()
    assert page.locator('#order-settings').is_visible()
    page.locator('#close').click()
    checks.append('live demo: profile retains saved preferences and opens functional settings')

    context2 = browser.new_context(reduced_motion='reduce')
    reduced = context2.new_page()
    reduced.goto(BASE+'prototypes/wanso/')
    reduced.wait_for_function('document.querySelector(".page-layer:not(.leaving) .original-screen").naturalWidth > 0')
    assert reduced.locator('.autoplay').get_attribute('aria-pressed') == 'false'
    checks.append('reduced motion: no automatic playback')
    assert not errors, errors
    browser.close()

print(json.dumps({'passed':checks,'page_errors':errors},ensure_ascii=False,indent=2))
