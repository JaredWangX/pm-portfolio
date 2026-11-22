"""Run with a local http server on port 8765 and Python Playwright + Chrome installed.

Checks the visitor's guided tour, manual controls, failure recovery and contact paths.
Screenshots are optional evidence, not committed test fixtures.
"""
import json
import os
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

    for product in ['wanso', 'onentra']:
        data = json.loads((ROOT / 'prototypes' / product / 'screens.json').read_text())
        page.goto(BASE + 'prototypes/' + product + '/')
        loaded(data['default'])
        assert page.locator('.autoplay').get_attribute('aria-pressed') == 'true'
        first = page.url
        page.wait_for_function('url => location.href !== url', arg=first, timeout=12000)
        assert page.locator('.page-counter').inner_text() == '2 / 6'
        page.locator('.continue').click()
        loaded(data['flows'][0]['steps'][2]['id'])
        assert page.locator('.autoplay').get_attribute('aria-pressed') == 'false'
        manual = page.url
        page.wait_for_timeout(10300)
        assert page.url == manual, 'manual inspection must remain paused'
        page.locator('.autoplay').click()
        page.wait_for_function('url => location.href !== url', arg=manual, timeout=12000)
        page.locator('.autoplay').click()

        for i, flow in enumerate(data['flows']):
            page.locator('.flow-selector button').nth(i).click()
            for step in flow['steps']:
                page.locator('[data-step="' + step['id'] + '"]').click()
                loaded(step['id'])
                assert page.locator('.step-caption').inner_text() == step['caption']
                assert page.locator('.page-description').inner_text() == step['reason']
            page.locator('.continue').click()
            loaded(flow['steps'][0]['id'])
        page.locator('.catalog summary').click()
        for frame in data['frames']:
            page.locator('[data-screen="' + frame['id'] + '"]').click()
            loaded(frame['id'])
            assert page.locator('.page-layer:not(.leaving) .original-screen').evaluate('(img)=>img.complete && img.naturalWidth>0')
            ratio = page.locator('.page-layer:not(.leaving) .original-screen').evaluate('(img)=>img.clientWidth/img.clientHeight')
            assert abs(ratio - frame['width'] / frame['height']) < .015
        # A catalog selection is free browsing; Continue explicitly returns to the guided flow.
        assert page.locator('.continue').inner_text() == '回到流程 →'
        page.locator('.continue').click()
        loaded(data['flows'][-1]['steps'][0]['id'])
        page.locator('.zoom-toggle').click()
        assert 'zoomed' in page.locator('body').get_attribute('class')
        page.keyboard.press('Escape')
        assert 'zoomed' not in page.locator('body').get_attribute('class')
        checks.append(product + ': autoplay, pause/resume, 3 flows, catalog, image proportions, zoom')

    page.goto(BASE + 'prototypes/wanso/')
    loaded('home')
    page.locator('.autoplay').click()
    geometry = page.locator('.screen').bounding_box()
    page.locator('.next').click()
    loaded('recommend')
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

    # An unavailable image must give a working retry, not an indefinitely frozen player.
    page.route('**/wanso-home.webp', lambda route: route.abort())
    page.goto(BASE + 'prototypes/wanso/')
    page.locator('.load-error:not([hidden])').wait_for()
    page.unroute('**/wanso-home.webp')
    page.locator('.retry').click()
    loaded('home')
    assert page.locator('.load-error').is_hidden()
    checks.append('image failure: clear error + retry recovers')

    page.goto(BASE)
    for selector in ['[data-quick="wanso"]','[data-quick="onentra"]']:
        page.locator(selector).click()
        assert page.locator('#overlay').evaluate('(d)=>d.open')
        page.keyboard.press('Escape')
        assert not page.locator('#overlay').evaluate('(d)=>d.open')
        assert page.locator(selector).evaluate('(b)=>document.activeElement===b')
    page.locator('[data-copy-email]').click()
    page.wait_for_function('document.querySelector(".copy-feedback").textContent.includes("已复制")')
    assert page.evaluate('navigator.clipboard.readText()') == '13971032326@163.com'
    assert page.locator('a[href^="mailto:"]').first.get_attribute('href') == 'mailto:13971032326@163.com'
    checks.append('2 quick dialogs: Escape + focus restored; real mailto and clipboard')

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
        assert page.locator('.viewer').bounding_box()['y'] < 10
    checks.append('mobile catalog: returns to preview; guide never overlaps playback')

    context2 = browser.new_context(reduced_motion='reduce')
    reduced = context2.new_page()
    reduced.goto(BASE+'prototypes/wanso/')
    reduced.wait_for_function('document.querySelector(".original-screen").naturalWidth > 0')
    assert reduced.locator('.autoplay').get_attribute('aria-pressed') == 'false'
    checks.append('reduced motion: no automatic playback')
    assert not errors, errors
    browser.close()

print(json.dumps({'passed':checks,'page_errors':errors},ensure_ascii=False,indent=2))
