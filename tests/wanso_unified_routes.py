"""Every restaurant entry uses the same detail, and navigation dismisses stale overlays."""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
BASE=os.getenv('PORTFOLIO_URL','http://127.0.0.1:8765/').rstrip('/')+'/'
OUT=Path(__file__).resolve().parents[1]/'work'/'wanso-unified-routes';OUT.mkdir(parents=True,exist_ok=True)
checks=[]
with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True)
    for width in [1440,390]:
        context=browser.new_context(viewport={'width':width,'height':900 if width==1440 else 844},reduced_motion='reduce')
        page=context.new_page(); errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        def visit(route):
            page.goto(BASE+'prototypes/wanso/?lang=zh&qa=unified#'+route,wait_until='networkidle')
        visit('saved')
        page.locator('.saved-restaurant-main').first.click()
        detail=page.locator('.native-store-view');expect(detail).to_have_count(1)
        expect(detail).to_have_attribute('data-store-id','quyen')
        signature=detail.locator('.native-store-menu').inner_text()
        assert len(signature)>500
        hidden=page.locator('.ios-page-saved')
        assert hidden.evaluate('(node)=>node.inert&&getComputedStyle(node).visibility==="hidden"')
        detail.locator('.native-store-back').click()
        expect(detail).to_have_count(0)
        assert hidden.evaluate('(node)=>!node.inert&&getComputedStyle(node).visibility!=="hidden"')
        visit('store-second')
        expect(detail).to_have_attribute('data-store-id','quyen')
        assert detail.locator('.native-store-menu').inner_text()==signature
        expect(page.locator('.scroll-content')).to_have_count(0)
        detail.locator('.native-store-platform[data-platform="grab"] button').click()
        sheet=page.locator('.wanso-sheet')
        expect(sheet).to_contain_text('71,000đ')
        sheet.get_by_role('button',name='返回菜单',exact=True).click()
        expect(sheet).not_to_be_visible();expect(detail).to_have_count(1)
        detail.locator('.native-store-back').click()
        expect(page.locator('.rich-chat')).to_be_visible()
        expect(detail).to_have_count(0)
        checks.append(f'{width}: saved and direct legacy store share identical full menu; native detail hides/inerts underlay; checkout and back restore origin')
        for route,store in [('store-first','moc'),('summary-first','moc'),('summary-second','quyen'),('compare','moc'),('translate-first','moc'),('translate-second','quyen')]:
            visit(route)
            expect(detail).to_have_count(1);expect(detail).to_have_attribute('data-store-id',store)
            expect(page.locator('.scroll-content')).to_have_count(0)
            if route.startswith('translate'):
                picker=page.locator('.native-store-language-sheet');expect(picker).to_have_count(1)
                picker.locator('[data-language="zh"]').click()
                detail.locator('[data-action="translate"]').click()
                expect(detail.locator('.native-store-menu')).to_contain_text('鸡腿汤河粉')
            page.screenshot(path=str(OUT/f'{width}-{route}.png'))
        checks.append(f'{width}: summary, comparison and language routes reuse native store; no archived widget or duplicate language sheet')
        visit('home')
        page.locator('.ios-home-location').click()
        expect(page.locator('.wanso-sheet')).to_be_visible()
        page.evaluate("location.hash='explore'")
        expect(page.locator('.ios-page-explore')).to_be_visible()
        expect(page.locator('.wanso-sheet')).not_to_be_visible()
        expect(detail).to_have_count(0)
        page.get_by_role('button',name='选择位置',exact=True).click()
        expect(page.locator('.wanso-sheet')).to_be_visible()
        page.locator('.wanso-sheet').get_by_role('button',name='关闭',exact=True).click()
        expect(page.locator('.ios-page-explore')).to_be_visible()
        checks.append(f'{width}: external navigation closes city dialog, and next page can open a fresh dialog normally')
        for route in ['generating','writing']:
            visit(route)
            expect(page.locator('.rich-chat .ios-chat-reply')).to_have_count(3,timeout=15000)
            expect(page.locator('.rich-processing-screen')).to_have_count(0)
        checks.append(f'{width}: direct generating and writing run live progress and finish with current recommendations')
        assert not errors,errors
        context.close()
    # Real host controls change the embedded route while a phone sheet is open.
    host=browser.new_page(viewport={'width':1440,'height':1000})
    host.goto(BASE,wait_until='networkidle')
    iframe=host.locator('[data-device-frame="wanso"]');iframe.scroll_into_view_if_needed()
    embedded=iframe.content_frame
    embedded.locator('.ios-home-location').click()
    expect(embedded.locator('.wanso-sheet')).to_be_visible()
    host.locator('[data-device-target="wanso"][data-frame="explore"]').click()
    expect(embedded.locator('.ios-page-explore')).to_be_visible()
    expect(embedded.locator('.wanso-sheet')).not_to_be_visible()
    for route in ['home','saved','explore','home']:
        embedded.locator('body').evaluate('(node,route)=>{ location.hash=route; }',route)
        expect(embedded.locator('.ios-page-'+route)).to_be_visible()
    expect(embedded.locator('.native-store-view')).to_have_count(0)
    expect(embedded.locator('.wanso-sheet')).not_to_be_visible()
    checks.append('Host page navigation dismisses the embedded city sheet; rapid tab changes do not resurrect an old overlay')
    host.close()
    browser.close()
print(json.dumps({'passed':len(checks),'checks':checks},ensure_ascii=False,indent=2))
