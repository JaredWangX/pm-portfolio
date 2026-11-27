"""Store actions stay within the phone while its detail scrolls; return preserves origin."""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
BASE=os.getenv('PORTFOLIO_URL','http://127.0.0.1:8765/').rstrip('/')+'/'
OUT=Path(__file__).resolve().parents[1]/'work'/'wanso-sticky';OUT.mkdir(exist_ok=True)
checks=[]
with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True)
    for width in [1440,390,320]:
        page=browser.new_page(viewport={'width':width,'height':900 if width==1440 else 844},reduced_motion='reduce')
        errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(BASE+'prototypes/wanso/#home',wait_until='networkidle')
        page.locator('.rich-home-card').first.click()
        view=page.locator('.native-store-view');scroll=view.locator('.native-store-scroll')
        toolbar=view.locator('.native-store-toolbar');back=view.get_by_role('button',name='Quay lại',exact=True)
        initial=back.bounding_box();store=view.get_attribute('data-store-id')
        expect(view.locator('.native-store-open')).not_to_contain_text('Xem thực đơn')
        expect(view.locator('.native-store-hours')).to_contain_text('Giờ Việt Nam')
        page.screenshot(path=str(OUT/f'{width}-top.png'))
        for offset in [750,1800]:
            scroll.evaluate('(el,value)=>el.scrollTop=value',offset)
            expect(view).to_have_class('native-store-view is-scrolled')
            box=back.bounding_box();assert abs(box['y']-initial['y'])<1
            assert box['height']>=44 and box['width']>=44
            assert toolbar.evaluate('(el)=>el.getBoundingClientRect().width<=el.parentElement.getBoundingClientRect().width+1')
        page.screenshot(path=str(OUT/f'{width}-scrolled.png'))
        position=scroll.evaluate('(el)=>el.scrollTop')
        view.get_by_role('button',name='Chia sẻ quán',exact=True).click()
        expect(page.locator('.wanso-sheet')).to_be_visible()
        page.locator('.wanso-sheet').get_by_role('button',name='Đóng',exact=True).click()
        assert abs(scroll.evaluate('(el)=>el.scrollTop')-position)<2
        expect(view).to_have_attribute('data-store-id',store)
        checks.append(f'{width}: fixed 44px actions, compact title, source hours, share and return retain scroll')
        # Anchored price summary clears the sticky navigation instead of hiding behind it.
        scroll.evaluate('(el)=>el.scrollTop=0')
        view.locator('.native-store-price-link').click()
        top=view.locator('.native-store-price-overview').bounding_box()['y']
        bottom=toolbar.bounding_box()['y']+toolbar.bounding_box()['height']
        assert top>=bottom-2, (top,bottom)
        # A nested language modal must make BOTH the scroller and fixed toolbar inert.
        view.locator('.native-store-choose-language').click()
        assert toolbar.evaluate('(el)=>el.inert')
        page.locator('.native-store-language-sheet').get_by_role('button',name='Tiếng Anh',exact=True).click()
        assert not toolbar.evaluate('(el)=>el.inert')
        back.click();expect(view).to_have_count(0)
        expect(page.locator('.ios-home-location')).to_be_visible()
        checks.append(f'{width}: anchored sections not occluded; language modal locks toolbar; back works deep in detail')
        assert not errors,errors
        page.close()
    browser.close()
print(json.dumps({'passed':len(checks),'checks':checks},ensure_ascii=False,indent=2))
