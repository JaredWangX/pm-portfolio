"""Case reading: anchors, original screens, video chapters and responsive layout.

The preview server must support HTTP byte ranges for native video seeking.
"""
import os
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('PORTFOLIO_URL', 'http://127.0.0.1:8765/').rstrip('/') + '/'
PAGES = ['', 'wanso/', 'onentra/', 'documents/wanso-prd/', 'documents/onentra-prd/',
         'documents/recommendation-review/', 'documents/delivery-review/']
with sync_playwright() as p:
    options = {'channel': 'chrome', 'headless': True}
    if os.environ.get('BROWSER_PROXY'):
        options['proxy'] = {'server': os.environ['BROWSER_PROXY'], 'bypass': '127.0.0.1,localhost'}
    browser = p.chromium.launch(**options)
    context = browser.new_context(viewport={'width': 1440, 'height': 900}, reduced_motion='reduce')
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda err: errors.append(str(err)))
    for path in PAGES:
        page.goto(BASE + path, wait_until='load')
        expect(page.locator('.identity')).to_have_text('王稼瑞')
        assert page.locator('.identity img').evaluate('(i)=>i.complete && i.naturalWidth>0')
    page.goto(BASE, wait_until='load')
    for width in [1440,1024,768,390,320]:
        page.set_viewport_size({'width':width,'height':900})
        page.locator('#cases').scroll_into_view_if_needed()
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
        if width>760:
            for selector in ['.project-identity','.project-cover','.project-summary>p','.project-summary>.actions']:
                rects=page.locator(selector).evaluate_all('(es)=>es.map(e=>e.getBoundingClientRect().toJSON())')
                assert abs(rects[0]['top']-rects[1]['top'])<2, (width,selector,rects)
        image=page.locator('.cover-desktop>img').bounding_box()
        cover=page.locator('.onentra-cover').bounding_box()
        assert image['y']>=cover['y'] and image['y']+image['height']<=cover['y']+cover['height'], (width,image,cover)
    print('Homepage: aligned project covers, text/actions and complete desktop image passed')
    for product in ['wanso', 'onentra']:
        page.goto(BASE + product + '/', wait_until='load')
        expect(page.locator('.study-section')).to_have_count(5)
        for width, height in [(1440,900),(1024,768),(768,1024),(390,844),(320,640)]:
            page.set_viewport_size({'width':width,'height':height})
            for link in page.locator('.study-nav a').all():
                link.click()
                target = link.get_attribute('href')
                expect(link).to_have_attribute('aria-current','location')
                page.wait_for_function("id=>{const h=document.querySelector(id+' h2').getBoundingClientRect(), n=document.querySelector('.study-nav').getBoundingClientRect();return h.top>=n.bottom-2 && h.top<innerHeight}",arg=target)
                heading = page.locator(target+' h2')
                assert heading.bounding_box()['y'] >= page.locator('.study-nav').bounding_box()['y'] + page.locator('.study-nav').bounding_box()['height'] - 2
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'), (product,width)
            gallery=page.locator('#first-use' if product=='wanso' else '#resource-pages')
            gallery.evaluate('(e)=>e.scrollIntoView({block:"start",behavior:"instant"})')
            assert gallery.locator('h3').first.bounding_box()['y'] >= page.locator('.study-nav').evaluate('(e)=>e.getBoundingClientRect().bottom'), (product,width,'gallery heading hidden')
            # The document screen is readable at its original aspect ratio, with no crop.
            trigger=page.locator('.design-row .study-screen').first
            trigger.click()
            picture=page.locator('#overlay .modal-content>img')
            expect(picture).to_be_visible()
            page.wait_for_function('()=>{let i=document.querySelector("#overlay img");return i?.complete&&i.naturalWidth>0}')
            assert picture.evaluate('(i)=>Math.abs(i.width/i.height-i.naturalWidth/i.naturalHeight)<.02')
            page.keyboard.press('Escape')
            expect(page.locator('#overlay')).not_to_be_visible()
            expect(trigger).to_be_focused()
        for pair in page.locator('.phone-board .board-images').all():
            rects=pair.locator('.study-screen').evaluate_all('(es)=>es.map(e=>e.getBoundingClientRect().toJSON())')
            assert abs(rects[0]['top']-rects[1]['top'])<1 and abs(rects[0]['height']-rects[1]['height'])<1
        # Scroll through every design so deferred source images are exercised.
        for screen in page.locator('.study-screen img').all():
            screen.scroll_into_view_if_needed()
            expect(screen).to_be_visible()
            assert screen.evaluate('(i)=>i.complete && i.naturalWidth>0')
        print(product+': 5 viewport sizes, directory, image zoom/focus and all source images passed')
    page.set_viewport_size({'width':1440,'height':900})
    page.goto(BASE+'wanso/',wait_until='load')
    expect(page.locator('iframe')).to_have_count(0)
    expect(page.locator('[data-phone-preview]')).to_have_count(0)
    video=page.locator('.product-film video')
    video.scroll_into_view_if_needed()
    page.wait_for_function('()=>{const v=document.querySelector("video");return v.readyState>=2&&v.duration>30}',timeout=30000)
    assert video.evaluate('(v)=>v.controls&&!v.autoplay&&v.videoWidth>0')
    for chapter in page.locator('[data-film-seek]').all():
        chapter.click()
        moment=float(chapter.get_attribute('data-film-seek'))
        page.wait_for_function('(t)=>{const v=document.querySelector("video");return !v.paused&&v.currentTime>=t&&v.currentTime<t+3}',arg=moment)
        expect(chapter).to_have_attribute('aria-current','step')
        video.evaluate('(v)=>v.pause()')
    for width in [1440,1024,768,390,320]:
        page.set_viewport_size({'width':width,'height':900})
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
        assert video.evaluate('(v)=>Math.abs(v.clientWidth/v.clientHeight-v.videoWidth/v.videoHeight)<.02')
    print('Wanso: native video loads, plays and seeks all four chapters; no embedded prototype')
    page.goto(BASE+'onentra/',wait_until='load')
    expect(page.locator('iframe')).to_have_count(0)
    entry=page.locator('.product-entry-link')
    expect(entry).to_have_attribute('href','https://jiaruiwang13.github.io/ai-work-platform/')
    assert not page.locator('#prototype').get_by_text('演示',exact=False).count()
    for width in [1440,1024,768,390,320]:
        page.set_viewport_size({'width':width,'height':900})
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
        panel=page.locator('.workspace-map').bounding_box()
        for part in page.locator('.map-resources li,.task-node,.delivery-node').all():
            r=part.bounding_box()
            assert r['x']>=panel['x'] and r['x']+r['width']<=panel['x']+panel['width']+1
    assert not errors, errors
    print('ONENTRA: five-width diagram bounds and direct product destination passed')
    browser.close()
