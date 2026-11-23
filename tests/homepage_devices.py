"""Focused checks for the actual homepage embeds, native data and return gestures.
Run against a local portfolio server on 8765. A checked-out ai-work-platform supplies
its real static front end during local tests; no model response is simulated.
Set PORTFOLIO_URL to verify the deployed portfolio and product instead.
"""
import os
from pathlib import Path
from urllib.parse import unquote, urlsplit
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
BASE=os.environ.get('PORTFOLIO_URL','https://jaredwangx.github.io/pm-portfolio/').rstrip('/')+'/'
LIVE='PORTFOLIO_URL' in os.environ
APP=ROOT.parent/'ai-work-platform/dist'
OUT=ROOT/'work/home-repair';OUT.mkdir(exist_ok=True)

with sync_playwright() as p:
    options={'channel':'chrome','headless':True}
    if LIVE and os.environ.get('WANSO_BROWSER_PROXY'):
        options['proxy']={'server':os.environ['WANSO_BROWSER_PROXY']}
    browser=p.chromium.launch(**options)
    context=browser.new_context(viewport={'width':1440,'height':900}, reduced_motion='reduce')
    page=context.new_page();page.set_default_timeout(20000)
    if not LIVE:
        def local_files(route):
            path=unquote(urlsplit(route.request.url).path)
            if path.startswith('/pm-portfolio/'): base=ROOT;path=path[len('/pm-portfolio/'):]
            elif path.startswith('/ai-work-platform/'): base=APP;path=path[len('/ai-work-platform/'):]
            else: route.abort();return
            file=(base/path).resolve()
            if file.is_dir():file=file/'index.html'
            if file.is_relative_to(base) and file.is_file():route.fulfill(path=str(file))
            else:route.fulfill(status=404,body='Not found')
        page.route('https://jaredwangx.github.io/**',local_files)
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(BASE+'#work',wait_until='domcontentloaded')
    phone=page.frame_locator('[data-device-frame=wanso]')
    expect(phone.locator('.original-screen')).to_be_visible(timeout=30000)
    for w,h in [(1440,900),(1366,768),(1280,720),(1024,768)]:
        page.set_viewport_size({'width':w,'height':h})
        page.locator('#work').evaluate('e=>e.scrollIntoView({behavior:"instant",block:"start"})')
        page.wait_for_timeout(100)
        box=page.locator('.device-pair').bounding_box()
        assert box['y']+box['height']<=h-6,(w,h,box)
        phonebox=page.locator('.phone-stage').bounding_box()
        assert phonebox['y']>=page.locator('body>header').bounding_box()['height']
        assert abs(phonebox['width']/phonebox['height']-402/874)<.005
        cards=page.locator('.device-project').evaluate_all('(es)=>es.map(e=>e.getBoundingClientRect().toJSON())')
        assert abs(cards[0]['top']-cards[1]['top'])<1 and abs(cards[0]['bottom']-cards[1]['bottom'])<1
        page.screenshot(path=OUT/f'fit-{w}.png')
    print('PASS: full desktop devices and aligned cards at four viewport sizes',flush=True)
    page.set_viewport_size({'width':1440,'height':900})
    page.locator('[data-device-target=wanso][data-frame=explore]').click()
    expect(phone.locator('.ios-explore-insight')).to_contain_text('5.000đ')
    for n in ['42,643','11,918','4,803']:
        expect(phone.locator('.ios-stat-values')).to_contain_text(n)
    assert phone.locator('.ios-photo-name').first.evaluate('e=>getComputedStyle(e).color')=='rgb(255, 255, 255)'
    assert phone.locator('.ios-explore-insight span span').evaluate('e=>getComputedStyle(e).color')=='rgb(246, 250, 255)'
    scroller=phone.locator('.phone-scroll')
    scroller.evaluate('e=>e.scrollTop=265')
    phone.get_by_role('button',name='查看 Hương Vị Mộc',exact=True).click()
    expect(phone.locator('.ios-menu li')).to_have_count(72)
    phone.get_by_role('button',name='返回',exact=True).click()
    expect(phone.locator('.ios-page-explore')).to_be_visible()
    assert abs(scroller.evaluate('e=>e.scrollTop')-265)<3
    print('PASS: explore data, white photo copy, menu and preserved return offset',flush=True)
    phone.get_by_role('button',name='收藏',exact=True).click()
    expect(phone.locator('.ios-saved-store')).to_have_count(2)
    phone.get_by_role('button',name='Phở Quyên · GrabFood 下单',exact=True).click()
    expect(phone.get_by_role('dialog',name='下单预览')).to_contain_text('71,000 ₫')
    phone.get_by_role('button',name='关闭',exact=True).click()
    expect(phone.locator('.ios-recent-orders')).to_contain_text('1 个下单入口')
    phone.get_by_role('button',name='移除 Phở Quyên 收藏',exact=True).click()
    expect(phone.get_by_role('dialog',name='移除收藏')).to_be_visible()
    phone.get_by_role('button',name='取消',exact=True).click()
    expect(phone.locator('.ios-saved-store')).to_have_count(2)
    phone.get_by_role('button',name='移除 Phở Quyên 收藏',exact=True).click()
    phone.get_by_role('button',name='确认移除',exact=True).click()
    expect(phone.locator('.ios-saved-store')).to_have_count(1)
    phone.get_by_role('button',name='我的',exact=True).click()
    expect(phone.locator('.ios-profile-counts')).to_contain_text('1')
    expect(phone.locator('.ios-taste-tags')).to_contain_text('清淡')
    phone.get_by_role('button',name='添加口味标签',exact=True).click()
    phone.get_by_role('textbox',name='添加口味标签',exact=True).fill('少油')
    phone.get_by_role('button',name='添加',exact=True).click()
    phone.get_by_role('button',name='完成',exact=True).click()
    expect(phone.locator('.ios-taste-tags')).to_contain_text('少油')
    phone.get_by_role('button',name='订单偏好',exact=True).click()
    phone.get_by_role('button',name='返回我的',exact=True).click()
    expect(phone.locator('.ios-taste-tags')).to_contain_text('少油')
    print('PASS: order stays in phone, recent activity, confirmed removal, profile/taste refresh',flush=True)
    root_scroll=page.evaluate('scrollY')
    nativeframe=page.locator('[data-device-frame=wanso]').element_handle().content_frame()
    nativeframe.evaluate('window.tabSwitchMarker=true')
    for label,id in [('探索','explore'),('收藏','saved'),('我的','profile')]*3:
        phone.locator('.hotspot[aria-label="'+label+'"]').click()
        expect(phone.locator('.ios-page-'+id)).to_be_visible()
        assert nativeframe.evaluate('window.tabSwitchMarker===true')
        assert phone.locator('.original-screen').evaluate('e=>e.complete && e.naturalWidth>0')
        assert abs(page.evaluate('scrollY')-root_scroll)<2
    print('PASS: repeated native tab switches preserve document and homepage position',flush=True)
    laptop=page.frame_locator('[data-workbench-frame]')
    expect(laptop.locator('#app')).not_to_be_empty(timeout=30000)
    liveframe=page.locator('[data-workbench-frame]').element_handle().content_frame()
    liveframe.evaluate('window.homepageNavigationMarker=true')
    for route,word in [('database','63 笔订单'),('tasks/t1','北京时间'),('chat/portfolio-launch','演示稿'),('files','Excel')]:
        page.locator(f'.device-controls [data-workbench-route="{route}"]').click()
        expect(page.locator('[data-workbench-description]')).to_contain_text(word)
        liveframe.wait_for_function('route=>location.hash==="#"+route',arg=route)
        assert liveframe.evaluate('window.homepageNavigationMarker===true'),'switching must not reload the workspace'
        assert page.locator('.device-controls [data-workbench-route][aria-pressed=true]').count()==1
    file=laptop.locator('[data-action=file-preview][data-id=case-weekly-sheet]')
    file.evaluate('e=>e.scrollIntoView({block:"nearest"})')
    # Playwright coordinates follow the iframe's CSS transform.
    file.click()
    expect(laptop.get_by_role('dialog')).to_contain_text('下载文件')
    print('PASS: actual workspace scenes, no reload, and editable file preview',flush=True)
    page.set_viewport_size({'width':390,'height':844})
    page.locator('#work').evaluate('e=>e.scrollIntoView({behavior:"instant"})')
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1')
    page.locator('[data-phone-preview]').first.click()
    modal=page.locator('.phone-modal')
    expect(modal).to_be_visible()
    rect=modal.bounding_box();assert rect['y']>=0 and rect['y']+rect['height']<=844
    page.screenshot(path=OUT/'expanded-mobile.png')
    assert not errors,errors
    print('PASS: mobile expansion, no horizontal overflow or page errors',flush=True)
    browser.close()
