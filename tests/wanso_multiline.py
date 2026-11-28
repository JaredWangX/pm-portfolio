"""Long meal requests wrap, preserve newlines and leave the conversation unobscured."""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE=os.getenv('PORTFOLIO_URL','http://127.0.0.1:8765/').rstrip('/')+'/'
OUT=Path(__file__).resolve().parents[1]/'work'/'wanso-multiline';OUT.mkdir(exist_ok=True)
checks=[]
with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True)
    for width,touch,locale in [(320,True,'zh'),(390,True,'zh'),(1440,False,'zh'),(390,True,'vi')]:
        page=browser.new_page(viewport={'width':width,'height':900},has_touch=touch,is_mobile=touch,reduced_motion='reduce')
        errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(BASE+'prototypes/wanso/?embed=1&device=1&lang='+locale+'#home',wait_until='networkidle')
        field=page.locator('.native-home-query')
        expect(field).to_have_js_property('tagName','TEXTAREA')
        assert field.evaluate('(e)=>e.scrollWidth<=e.clientWidth+1&&e.scrollHeight<=e.clientHeight+1'), 'Preset request must be fully visible'
        page.set_viewport_size({'width':320 if width!=320 else 390,'height':900})
        page.wait_for_timeout(150)
        assert field.evaluate('(e)=>e.scrollWidth<=e.clientWidth+1&&e.scrollHeight<=e.clientHeight+1'), 'Preset request must reflow after resizing'
        page.set_viewport_size({'width':width,'height':900})
        page.wait_for_timeout(150)
        page.locator('.screen').screenshot(path=str(OUT/f'{width}-{locale}-home.png'))
        field.press('End');field.press('Enter')
        assert '\n' in field.input_value()
        expect(page.locator('.ios-page-home')).to_be_visible()
        field.fill(('想吃清淡的鸡肉河粉，不放香菜，辣椒另放，含配送不超过八万越南盾。' if locale=='zh' else 'Muốn ăn phở gà thanh đạm, không rau mùi, tối đa 80.000đ gồm giao hàng. ')*3)
        expanded=field.evaluate('(e)=>e.clientHeight')
        assert field.evaluate('(e)=>e.scrollWidth<=e.clientWidth+1')
        page.locator('.ios-home-clear').click()
        expect(field).to_have_value('')
        assert field.evaluate('(e)=>e.clientHeight')<expanded
        prompt='想吃鸡肉河粉，清淡一点。\n不放香菜，含配送不超过八万越南盾。' if locale=='zh' else 'Muốn ăn phở gà thanh đạm.\nKhông rau mùi, tối đa 80.000đ gồm giao hàng.'
        field.fill(prompt);page.locator('.ios-home-search-submit').click()
        expect(page.locator('.ios-chat-reply')).to_have_count(3,timeout=15000)
        composer=page.locator('.ios-composer');draft=composer.locator('textarea')
        draft.fill(('请保留之前的预算，帮我比较每家店的配送费、优惠券和招牌菜。\n' if locale=='zh' else 'Giữ ngân sách và so sánh phí giao hàng, mã giảm giá và món chính.\n')*4)
        assert draft.evaluate('(e)=>e.scrollWidth<=e.clientWidth+1')
        page.set_viewport_size({'width':320 if width!=320 else 390,'height':900})
        page.wait_for_timeout(150)
        assert draft.evaluate('(e)=>Math.abs(e.clientHeight-Math.min(e.scrollHeight,parseFloat(getComputedStyle(e).maxHeight)))<2'), 'Draft height must reflow after resizing'
        page.set_viewport_size({'width':width,'height':900})
        page.wait_for_timeout(150)
        geometry=page.evaluate('''()=>{
          const r=s=>document.querySelector(s).getBoundingClientRect();
          return {chatBottom:r('.ios-chat').bottom,composerTop:r('.ios-composer').top,
                  composerBottom:r('.ios-composer').bottom,navTop:r('.phone-nav').top};
        }''')
        assert geometry['chatBottom']<=geometry['composerTop']+1,geometry
        assert geometry['composerBottom']<geometry['navTop'],geometry
        before=composer.evaluate('(e)=>e.clientHeight')
        page.locator('.screen').screenshot(path=str(OUT/f'{width}-{locale}-draft.png'))
        page.locator('.phone-nav [data-target=saved]').click()
        page.locator('.phone-nav [data-target=home]').click()
        assert composer.evaluate('(e)=>e.clientHeight')==before
        draft.fill('不放辣椒\n香菜另放' if locale=='zh' else 'Không ớt\nRau mùi để riêng')
        if touch: composer.locator('button').click()
        else: draft.press('Control+Enter')
        expect(page.locator('.ios-chat-reply')).to_have_count(4,timeout=15000)
        expect(draft).to_have_value('')
        assert composer.evaluate('(e)=>e.clientHeight')<before
        draft.fill('请比较各家店的配送费用、优惠券和招牌菜，并且保留清淡、不放香菜的要求。' if locale=='zh' else 'Mình muốn so sánh phí giao hàng, mã giảm giá và món chính, giữ ngân sách và không rau mùi.')
        page.locator('.phone-nav [data-target=explore]').click()
        page.set_viewport_size({'width':320 if width!=320 else 390,'height':900})
        page.wait_for_timeout(150)
        page.locator('.phone-nav [data-target=home]').click()
        page.wait_for_timeout(150)
        assert draft.evaluate('(e)=>Math.abs(e.clientHeight-Math.min(e.scrollHeight,parseFloat(getComputedStyle(e).maxHeight)))<2'), 'Restored draft must reflow after the phone resized on another tab'
        assert page.evaluate("()=>{const s=document.querySelector('.screen'),c=document.querySelector('.ios-composer');return Math.abs(parseFloat(s.style.getPropertyValue('--composer-height'))-c.offsetHeight)<1}")
        assert not errors,errors
        checks.append(f'{width}/{locale}: wrapping, Enter newline, clear/shrink, submit, draft return and no composer overlap')
        page.close()
    browser.close()
print(json.dumps(checks,ensure_ascii=False,indent=2))
