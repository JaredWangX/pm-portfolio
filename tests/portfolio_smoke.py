"""Run with a local http server on port 8765 and Python Playwright + Chrome installed.

Checks the visitor's guided tour, manual controls, failure recovery and contact paths.
Screenshots are optional evidence, not committed test fixtures.
"""
import json
import os
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
        if page.locator('.flow-toggle').count() and not page.locator('.flow-dialog').evaluate('(d)=>d.open'):
            page.locator('.flow-toggle').click()

    if '--layout-only' not in sys.argv:
        for product in ['wanso', 'onentra']:
            data = json.loads((ROOT / 'prototypes' / product / 'screens.json').read_text())
            page.goto(BASE + 'prototypes/' + product + '/')
            loaded(data['default'])
            if product == 'wanso':
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
            guide()
            page.locator('.catalog summary').click()
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
        assert active.get_by_role('link', name='Hương Vị Mộc · ShopeeFood 下单').get_attribute('href').startswith('https://shopeefood.vn/ha-noi/')
        page.locator('.screen').dispatch_event('pointerdown', {'pointerType':'touch','pointerId':1,'clientX':250,'clientY':380})
        page.locator('.screen').dispatch_event('pointerup', {'pointerType':'touch','pointerId':1,'clientX':135,'clientY':385})
        loaded('recommend-2')
        assert active.get_by_role('link', name='Phở Quyên · GrabFood 下单').get_attribute('href').startswith('https://food.grab.com/vn/vi/restaurant/')
        active.get_by_role('button', name='查看 Phở Quyên 菜单').click()
        loaded('store-second')
        active.get_by_role('button', name='返回', exact=True).click()
        loaded('recommend-2')
        active.get_by_role('button', name='查看第一家店').click()
        loaded('recommend')
        active.get_by_role('button', name='查看 Hương Vị Mộc 菜单').click()
        loaded('store-first')
        active.get_by_role('button', name='查看菜品比价').click()
        loaded('compare')
        assert active.locator('a.hotspot').count()==2
        assert page.locator('.autoplay').get_attribute('aria-pressed') == 'false'
        checks.append('Wanso native replay: search phases, swipe, two distinct merchant links, details and same-store comparison')
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

        page.goto(BASE + 'documents/recommendation-review/#decision-lab')
        for amount, expected in [(30000,37500),(80000,80000),(100000,97000),(150000,147000)]:
            page.locator('#meal-cost').fill(str(amount))
            assert page.locator('[data-grab]').inner_text() == f'{amount:,} ₫'
            assert page.locator('[data-shopee]').inner_text() == f'{expected:,} ₫'
        page.goto(BASE + 'documents/delivery-review/#decision-lab')
        for minutes, total in [(0,30),(20,50),(30,60),(60,90)]:
            page.locator('#rework-time').fill(str(minutes))
            assert page.locator('[data-total-time]').inner_text() == f'{total} 分钟'
        checks.append('interactive decision models: discount cap, break-even and rework boundaries')

        # An unavailable image must give a working retry, not an indefinitely frozen player.
        page.route('**/assets/wanso/native/home.webp', lambda route: route.abort())
        page.goto(BASE + 'prototypes/wanso/')
        page.locator('.load-error:not([hidden])').wait_for()
        page.unroute('**/assets/wanso/native/home.webp')
        page.locator('.retry').click()
        loaded('home')
        assert page.locator('.load-error').is_hidden()
        checks.append('image failure: clear error + retry recovers')

    page.goto(BASE)
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
        page.goto(BASE + 'prototypes/' + product + '/')
        page.locator('.viewer').wait_for()
        if product == 'wanso':
            loaded('home')
        guide()
        page.locator('.catalog summary').click()
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
    laptop = page.frame_locator('[data-device-frame="onentra"]')
    iframe.locator('.page-layer:not(.leaving) .original-screen').wait_for()
    for frame_id in ['generating','recommend','compare','home']:
        page.locator('[data-device-target="wanso"][data-frame="'+frame_id+'"]').click()
        iframe.locator('.original-screen[alt*="WANSO"]').first.wait_for()
        page.wait_for_function('''id=>document.querySelector('[data-device-frame=wanso]').contentWindow.location.hash==='#'+id''',arg=frame_id)
    page.locator('.device-controls [data-device-target="onentra"][data-frame="49"]').click()
    laptop.locator('.page-title').filter(has_text='会话文件').wait_for(state='attached')
    checks.append('device stage: original Wanso pages and original laptop navigation')

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
            for selector in ['.strengths article','.research-card']:
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
