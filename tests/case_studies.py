"""Case reading: anchors, original screens, phone replay and responsive layout."""
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
        # Scroll through every design so deferred source images are exercised.
        for screen in page.locator('.study-screen img').all():
            screen.scroll_into_view_if_needed()
            expect(screen).to_be_visible()
            assert screen.evaluate('(i)=>i.complete && i.naturalWidth>0')
        print(product+': 5 viewport sizes, directory, image zoom/focus and all source images passed')
    page.set_viewport_size({'width':1440,'height':900})
    page.goto(BASE+'wanso/',wait_until='load')
    page.locator('[data-phone-preview]').first.click()
    frame=page.frame_locator('.phone-modal iframe')
    expect(frame.locator('.page-layer:not(.leaving) .original-screen')).to_be_visible()
    frame.locator('.page-layer:not(.leaving)').get_by_role('button',name='搜索',exact=True).click()
    expect(frame.locator('.ios-carousel')).to_be_visible(timeout=15000)
    frame.get_by_role('button',name='Hương Vị Mộc · ShopeeFood 下单',exact=True).click()
    expect(frame.get_by_role('dialog',name='下单预览',exact=True)).to_be_visible()
    page.locator('#overlay .close').click()
    expect(page.locator('#overlay')).not_to_be_visible()
    assert not errors, errors
    print('Shared identity, Wanso search/order preview, and JavaScript error checks passed')
    browser.close()
