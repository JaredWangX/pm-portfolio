"""Location selection is explicit, persists, and cleans up across phone routes.

Tile requests are stubbed in functional tests; screenshot QA separately loads actual tiles.
"""
import base64, json, os
from playwright.sync_api import sync_playwright, expect
BASE=os.getenv('PORTFOLIO_URL','http://127.0.0.1:8765/').rstrip('/')+'/'
TILE=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==')
checks=[]
with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True)
    for width,height in [(1440,900),(390,844),(320,640)]:
        context=browser.new_context(viewport={'width':width,'height':height})
        context.route('https://tile.openstreetmap.org/**',lambda r:r.fulfill(body=TILE,content_type='image/png'))
        page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(BASE+'prototypes/wanso/#home',wait_until='networkidle')
        sheet=page.locator('.wanso-sheet');search=page.locator('#location-search-input')
        def open_map():
            page.locator('.ios-home-location').click()
            expect(sheet).to_be_visible();expect(page.locator('.leaflet-container')).to_have_count(1)
        def confirm():
            sheet.get_by_role('button',name='确认此位置',exact=True).click()
            expect(sheet).not_to_be_visible()
        open_map()
        search.fill('Ben Thanh');expect(page.locator('.location-result')).to_have_count(1)
        page.locator('.location-result').click()
        expect(page.locator('.location-selection')).to_contain_text('滨城市场')
        assert page.evaluate('window.wansoNative.getLocation().city')=='hanoi','preview must not change city before confirmation'
        confirm()
        expect(page.locator('.ios-home-location')).to_contain_text('滨城市场')
        assert page.evaluate('window.wansoNative.catalogForLocation().every(s=>s.city==="hcm")')
        page.reload(wait_until='networkidle')
        expect(page.locator('.ios-home-location')).to_contain_text('滨城市场')
        checks.append(f'{width}: landmark search / explicit confirmation / city catalog / persistence')
        open_map();search.fill('Hoàn Kiếm');expect(page.locator('.location-result').first).to_contain_text('还剑湖')
        page.locator('.location-result').first.click()
        sheet.get_by_role('button',name='关闭',exact=True).click()
        expect(page.locator('.ios-home-location')).to_contain_text('滨城市场')
        open_map()
        before=page.locator('.location-selection > span:last-child').inner_text()
        page.locator('.location-map').click(position={'x':75,'y':110})
        expect(page.locator('.location-selection')).to_contain_text('地图选点')
        assert page.locator('.location-selection > span:last-child').inner_text()!=before
        confirm()
        assert page.evaluate('window.wansoNative.getLocation().mode')=='map'
        checks.append(f'{width}: cancel preserves saved location; map click selects new coordinates')
        open_map();search.fill('xx-unmatched-地名');expect(page.locator('.location-results')).to_contain_text('没有匹配')
        search.fill('');expect(page.locator('.location-results')).not_to_be_visible()
        page.evaluate("location.hash='explore'")
        expect(sheet).not_to_be_visible();expect(page.locator('.leaflet-container')).to_have_count(0)
        page.get_by_role('button',name='选择位置',exact=True).click()
        expect(page.locator('.leaflet-container')).to_have_count(1)
        assert sheet.evaluate('(n)=>n.scrollWidth<=n.clientWidth+1')
        box=sheet.bounding_box();assert box['x']>=0 and box['x']+box['width']<=width+1
        checks.append(f'{width}: no-match state, route cleanup, reopen and responsive containment')
        sheet.get_by_role('button',name='关闭',exact=True).click()
        page.evaluate("location.hash='home'");expect(page.locator('.ios-home-location')).to_be_visible()
        # Simulate GPS denial, delayed result, and out-of-coverage at the browser boundary.
        page.evaluate("() => {navigator.geolocation.getCurrentPosition=(ok,fail)=>fail({code:1});}")
        open_map();sheet.get_by_role('button',name='使用当前位置').click()
        expect(page.locator('.location-status')).to_contain_text('定位权限未开启')
        page.evaluate("() => {navigator.geolocation.getCurrentPosition=(ok)=>ok({coords:{latitude:51.5074,longitude:-0.1278}});}")
        sheet.get_by_role('button',name='使用当前位置').click()
        expect(page.locator('.location-status')).to_contain_text('不在覆盖范围')
        page.evaluate("() => {navigator.geolocation.getCurrentPosition=(ok)=>window.delayedLocation=ok;}")
        sheet.get_by_role('button',name='使用当前位置').click()
        sheet.get_by_role('button',name='关闭',exact=True).click()
        page.evaluate("window.delayedLocation({coords:{latitude:21.0285,longitude:105.8542}})")
        assert page.evaluate('window.wansoNative.getLocation().city')=='hcm'
        checks.append(f'{width}: denied / outside coverage / late GPS callback safely ignored')
        open_map()
        page.evaluate("() => {navigator.geolocation.getCurrentPosition=(ok)=>window.delayedLocation=ok;}")
        sheet.get_by_role('button',name='使用当前位置').click()
        page.locator('.location-map').click(position={'x':95,'y':120})
        chosen=page.locator('.location-selection').inner_text()
        page.evaluate("window.delayedLocation({coords:{latitude:21.0285,longitude:105.8542}})")
        assert page.locator('.location-selection').inner_text()==chosen,'late GPS overwrote manual point'
        checks.append(f'{width}: manual map choice cancels an in-flight GPS lookup')
        page.evaluate("() => {navigator.geolocation.getCurrentPosition=(ok)=>ok({coords:{latitude:21.0285,longitude:105.8542}});}")
        sheet.get_by_role('button',name='使用当前位置').click()
        expect(page.locator('.location-selection')).to_contain_text('河内 · 当前位置');confirm()
        assert page.evaluate('window.wansoNative.getLocation().city')=='hanoi'
        checks.append(f'{width}: supported GPS selects, confirms and updates city')
        assert not errors, errors
        context.close()
    # Resizing an already-open map must keep its dialog inside the new viewport.
    context=browser.new_context(viewport={'width':1440,'height':900})
    context.route('https://tile.openstreetmap.org/**',lambda r:r.fulfill(body=TILE,content_type='image/png'))
    page=context.new_page();page.goto(BASE+'prototypes/wanso/#home',wait_until='networkidle')
    page.locator('.ios-home-location').click()
    page.locator('#location-search-input').fill('还剑湖');page.locator('.location-result').click()
    page.set_viewport_size({'width':390,'height':844})
    page.wait_for_function("() => {const b=document.querySelector('.wanso-sheet').getBoundingClientRect();return b.left>=0 && b.right<=innerWidth;}")
    expect(page.locator('.location-selection')).to_contain_text('还剑湖')
    checks.append('open map follows viewport resize without clipping or losing selected landmark')
    context.close()
    # A failed tile shows an explicit retry action, rather than a permanently blank map.
    context=browser.new_context()
    fail_tiles=[True]
    def tile_response(route):
        if fail_tiles[0]:route.abort()
        else:route.fulfill(body=TILE,content_type='image/png')
    context.route('https://tile.openstreetmap.org/**',tile_response)
    page=context.new_page();page.goto(BASE+'prototypes/wanso/#home',wait_until='networkidle')
    page.locator('.ios-home-location').click()
    retry=page.get_by_role('button',name='重试地图',exact=True);expect(retry).to_be_visible()
    fail_tiles[0]=False;retry.click()
    expect(retry).not_to_be_visible();expect(page.locator('.location-map-loading')).not_to_be_visible()
    checks.append('tile error has manual retry; successful retry clears loading/error state')
    context.close()
    # Local map script failure still provides city and known-landmark selection.
    context=browser.new_context();context.route('**/assets/vendor/leaflet/leaflet.js',lambda r:r.abort())
    page=context.new_page();page.goto(BASE+'prototypes/wanso/#home',wait_until='networkidle')
    page.locator('.ios-home-location').click()
    expect(page.locator('.location-map-loading')).to_contain_text('地图暂时无法加载')
    page.locator('#location-search-input').fill('滨城');page.locator('.location-result').click()
    page.get_by_role('button',name='确认此位置').click()
    expect(page.locator('.ios-home-location')).to_contain_text('滨城市场')
    checks.append('map script failure retains usable landmark/city selection')
    context.close();browser.close()
print(json.dumps({'passed':len(checks),'checks':checks},ensure_ascii=False,indent=2))
