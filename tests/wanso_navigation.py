"""Native phone gestures and back navigation preserve reading/card positions."""
import json, os, time
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
BASE=os.getenv('PORTFOLIO_URL','http://127.0.0.1:8765/').rstrip('/')+'/'
checks=[]
OUT=Path(__file__).resolve().parents[1]/'work'/'wanso-navigation';OUT.mkdir(exist_ok=True)
with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True)
    for width in [390,320]:
        context=browser.new_context(viewport={'width':width,'height':900},has_touch=True,is_mobile=True)
        page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(BASE+'prototypes/wanso/?embed=1&device=1#home',wait_until='networkidle')
        cdp=context.new_cdp_session(page)
        def swipe(x,y,dx,dy):
            cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
            for step in range(1,17):
                cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x+dx*step/16,'y':y+dy*step/16}]})
                time.sleep(.016)
            cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
            page.wait_for_timeout(350)
        def nav(id):
            page.locator('.phone-nav [data-target='+id+']').click()
            expect(page.locator('.ios-page-'+id)).to_be_visible()
        def same_position(locator,key,before):
            assert abs(locator.evaluate('(e,key)=>e[key]',key)-before)<3,(key,before,locator.evaluate('(e,key)=>e[key]',key))
        rail=page.locator('.ios-home-carousel');box=rail.bounding_box()
        swipe(width-60,box['y']+70,-width*.55,0)
        assert rail.evaluate('(e)=>e.scrollLeft')>100,'horizontal native touch did not move cards'
        scroller=page.locator('.ios-page-home');box=scroller.bounding_box()
        swipe(width*.55,box['y']+box['height']*.7,0,-box['height']*.4)
        assert scroller.evaluate('(e)=>e.scrollTop')>80,'vertical touch did not scroll home'
        assert page.locator('.native-store-view').count()==0,'swipe incorrectly opened a restaurant'
        checks.append(f'{width}: native horizontal/vertical touch works without accidental store open')
        scroller.evaluate('(e)=>e.scrollTop=0');rail.evaluate('(e)=>e.scrollLeft=440');page.wait_for_timeout(250)
        before=rail.evaluate('(e)=>e.scrollLeft');page.locator('.ios-home-location').click()
        expect(page.locator('.wanso-sheet')).to_be_visible();page.locator('.sheet-close').click();page.wait_for_timeout(150)
        same_position(rail,'scrollLeft',before)
        checks.append(f'{width}: dismissing location sheet preserves selected home card')
        # Opening a card keeps its underlying list in place, even after deep scrolling/share.
        rail.locator('.rich-home-card').nth(2).click()
        under_top=scroller.evaluate('(e)=>e.scrollTop');under_left=rail.evaluate('(e)=>e.scrollLeft')
        store=page.locator('.native-store-view');store_scroll=store.locator('.native-store-scroll')
        box=store_scroll.bounding_box();swipe(width*.55,box['y']+box['height']*.65,0,-box['height']*.4)
        assert store_scroll.evaluate('(e)=>e.scrollTop')>100
        toolbar_top=store.locator('.native-store-toolbar').bounding_box()['y']
        store_scroll.evaluate('(e)=>e.scrollTop=1800');page.wait_for_timeout(100)
        page.locator('.screen').screenshot(path=str(OUT/f'{width}-store-scrolled.png'))
        assert abs(store.locator('.native-store-toolbar').bounding_box()['y']-toolbar_top)<1
        store.get_by_role('button',name='Chia sẻ quán',exact=True).click();position=store_scroll.evaluate('(e)=>e.scrollTop')
        page.locator('.sheet-close').click();page.wait_for_timeout(100);same_position(store_scroll,'scrollTop',position)
        store.locator('.native-store-back').click();expect(store).to_have_count(0)
        same_position(scroller,'scrollTop',under_top);same_position(rail,'scrollLeft',under_left)
        page.locator('.screen').screenshot(path=str(OUT/f'{width}-returned.png'))
        checks.append(f'{width}: store swipe, fixed back/share, modal close and back preserve reading position')
        # A rail which is not .ios-carousel must survive leaving/restoring its tab too.
        nav('saved');saved=page.locator('.ios-page-saved');orders=page.locator('.ios-recent-order-rail')
        orders.evaluate('(e)=>e.scrollLeft=e.scrollWidth');page.wait_for_timeout(200)
        recent_left=orders.evaluate('(e)=>e.scrollLeft');saved.evaluate('(e)=>e.scrollTop=140');saved_top=saved.evaluate('(e)=>e.scrollTop')
        nav('home');nav('saved');same_position(orders,'scrollLeft',recent_left);same_position(saved,'scrollTop',saved_top)
        checks.append(f'{width}: recent-order carousel and saved-page scroll survive tab switch')
        nav('profile');profile=page.locator('.ios-page-profile');profile.evaluate('(e)=>e.scrollTop=300');profile_top=profile.evaluate('(e)=>e.scrollTop')
        page.get_by_role('button',name='Cài đặt ứng dụng',exact=True).click();expect(page.locator('[data-settings=settings]')).to_be_visible()
        page.get_by_role('button',name='Giao diện',exact=False).first.click();expect(page.locator('[data-settings=theme]')).to_be_visible()
        page.locator('.wanso-settings-back').click();expect(page.locator('[data-settings=settings]')).to_be_visible()
        page.locator('.wanso-settings-back').click();same_position(profile,'scrollTop',profile_top)
        checks.append(f'{width}: nested settings return restores profile scroll')
        assert not errors,errors
        context.close()
    # Desktop wheel and chat rails use the same snapshots as touch navigation.
    context=browser.new_context(viewport={'width':1440,'height':1000})
    page=context.new_page();page.goto(BASE+'prototypes/wanso/?embed=1&device=1#home',wait_until='networkidle')
    home=page.locator('.ios-page-home');home.hover();page.mouse.wheel(0,300);page.wait_for_timeout(250)
    assert home.evaluate('(e)=>e.scrollTop')>100
    page.locator('.phone-nav [data-target=explore]').click();explore=page.locator('.ios-page-explore');explore.evaluate('(e)=>e.scrollTop=200')
    rail=explore.locator('.ios-carousel');rail.evaluate('(e)=>e.scrollLeft=500');page.wait_for_timeout(250)
    top=explore.evaluate('(e)=>e.scrollTop');left=rail.evaluate('(e)=>e.scrollLeft')
    page.locator('.phone-nav [data-target=saved]').click();page.locator('.phone-nav [data-target=explore]').click()
    same_position(explore,'scrollTop',top);same_position(rail,'scrollLeft',left)
    checks.append('desktop: wheel scroll and explore reading position survive tab switching')
    page.locator('.phone-nav [data-target=home]').click()
    page.evaluate("location.hash='recommend'");expect(page.locator('.ios-chat')).to_be_visible()
    rails=page.locator('.ios-chat .ios-carousel');assert rails.count()>=3
    for index in range(3):rails.nth(index).evaluate('(e,value)=>e.scrollLeft=value',220*(index+1))
    chat=page.locator('.ios-chat');chat.evaluate('(e)=>e.scrollTop=1000');page.wait_for_timeout(250)
    lefts=rails.evaluate_all('(items)=>items.map(e=>e.scrollLeft)');top=chat.evaluate('(e)=>e.scrollTop')
    page.locator('.phone-nav [data-target=saved]').click();page.locator('.phone-nav [data-target=home]').click()
    expect(chat).to_be_visible();same_position(chat,'scrollTop',top)
    for index,left in enumerate(lefts):same_position(rails.nth(index),'scrollLeft',left)
    checks.append('desktop: all three chat carousels and the reading position survive tab switching')
    context.close();browser.close()
print(json.dumps({'passed':len(checks),'checks':checks},ensure_ascii=False,indent=2))
