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
            assert page.locator('.autoplay').get_attribute('aria-pressed') == 'true'
            first = page.url
            page.wait_for_function('url => location.href !== url', arg=first, timeout=12000)
            assert page.locator('.page-counter').inner_text() == '2 / 6'
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
        page.locator('.autoplay').click()
        geometry = page.locator('.screen').bounding_box()
        page.locator('.next').click()
        loaded('explore')
        page.locator('.next').click()
        loaded('taste')
        assert page.locator('.screen').bounding_box() == geometry, 'phone shell must not resize between source aspect ratios'
        page.locator('.next').click(click_count=3, delay=50)
        page.wait_for_timeout(400)
        assert page.locator('.page-layer').count() == 1, 'rapid navigation must not leave stale layers'
        page.locator('.screen').dispatch_event('pointerdown', {'pointerType':'touch','pointerId':1,'clientX':200,'clientY':300})
        before = page.url
        page.locator('.screen').dispatch_event('pointerup', {'pointerType':'touch','pointerId':1,'clientX':100,'clientY':305})
        page.wait_for_function('url => location.href !== url', arg=before)
        assert page.locator('.autoplay').get_attribute('aria-pressed') == 'false'
        checks.append('phone: stable shell, rapid-navigation cleanup, horizontal swipe and pause')
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

        # Independent examples must never become one fabricated order.
        wanso = json.loads((ROOT / 'prototypes/wanso/screens.json').read_text())
        meal_ids = [step['id'] for step in wanso['flows'][0]['steps']]
        assert meal_ids[-1] == 'confirm' and 'compare' not in meal_ids and 'reviews' not in meal_ids
        home = next(f for f in wanso['frames'] if f['id'] == 'home')
        notice = next(h for h in home['hotspots'] if h.get('notice'))
        page.goto(BASE + 'prototypes/wanso/#home')
        loaded('home')
        page.locator('.page-layer:not(.leaving) .hotspot[aria-label="'+notice['label']+'"]').click()
        assert page.url.endswith('#home')
        assert page.locator('.interaction-hint').inner_text() == notice['notice']
        assert page.locator('.autoplay').get_attribute('aria-pressed') == 'false'
        checks.append('source fidelity: independent meal flows; unavailable branch explains without invented page')

        # An unavailable image must give a working retry, not an indefinitely frozen player.
        page.route('**/wanso-recommend.webp', lambda route: route.abort())
        page.goto(BASE + 'prototypes/wanso/')
        page.locator('.load-error:not([hidden])').wait_for()
        page.unroute('**/wanso-recommend.webp')
        page.locator('.retry').click()
        loaded('recommend')
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
            loaded('recommend')
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
    iframe.locator('.welcome h1').wait_for()
    assert iframe.locator('#screen').bounding_box()['width'] >= 340
    for frame_id, selector in [('explore','.platform-overview'),('compare','.native-price-table'),('profile','.profile-identity'),('home','.welcome')]:
        page.locator('[data-device-target="wanso"][data-frame="'+frame_id+'"]').click()
        iframe.locator(selector).wait_for()
    page.locator('.device-controls [data-device-target="onentra"][data-frame="49"]').click()
    laptop.locator('.page-title').filter(has_text='会话文件').wait_for(state='attached')
    checks.append('device stage: playable phone scenes and original laptop navigation')

    page.locator('.phone-project [data-phone-preview]').click()
    phone = page.frame_locator('.phone-modal iframe')
    phone.locator('.welcome h1').wait_for()
    assert page.locator('.phone-modal').bounding_box()['width'] >= 420
    phone.locator('.tabbar [data-nav="profile"]').click()
    phone.locator('[data-app-settings]').click()
    phone.locator('#close').focus()
    page.keyboard.press('Escape')
    assert page.locator('#overlay').evaluate('(d)=>d.open')
    assert not phone.locator('#sheet').evaluate('(d)=>d.open')
    phone.locator('[data-nav="home"]').click()
    page.keyboard.press('Escape')
    page.wait_for_function('!document.querySelector("#overlay").open')
    checks.append('wide phone dialog: working app, nested Escape and close restore')

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
                heights = page.locator(selector).evaluate_all('(items)=>items.map(i=>i.getBoundingClientRect().height)')
                assert max(heights)-min(heights) <= 1, (width,selector,heights)
        page.locator('[data-phone-preview]').first.click()
        phone.locator('#screen h1').wait_for(state='visible')
        modal = page.locator('.phone-modal').bounding_box()
        assert modal['x']>=0 and modal['y']>=0 and modal['x']+modal['width']<=width and modal['y']+modal['height']<=height
        assert modal['width'] >= min(420,width-22)
        screen = phone.locator('#screen').bounding_box()
        assert screen['width'] >= min(390,width-48)
        page.locator('.phone-modal .close').click()
    for width,height in [(1440,900),(1024,768),(768,1024),(390,844),(320,640)]:
        page.set_viewport_size({'width':width,'height':height})
        assert page.locator('.case-overview').evaluate_all('''cards=>cards.every(card=>{
          const facts=card.querySelector('.card-facts').getBoundingClientRect();
          const action=card.querySelector('.actions').getBoundingClientRect();
          return facts.bottom+8<=action.top && [...card.querySelectorAll('.card-facts dd')].every(d=>d.getBoundingClientRect().bottom<=facts.bottom-12);
        })'''), f'case fact/action overlap at {width}px'
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
