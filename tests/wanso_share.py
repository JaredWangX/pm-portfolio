"""Restaurant sharing preserves quantities, provides real links and handles platform failures."""
import json, os
from pathlib import Path
from urllib.parse import parse_qs, urlparse, urlencode
from playwright.sync_api import sync_playwright, expect

BASE=os.getenv('PORTFOLIO_URL','http://127.0.0.1:8765/').rstrip('/')+'/'
OUT=Path(__file__).resolve().parents[1]/'work'/'wanso-share';OUT.mkdir(exist_ok=True)
checks=[]
MOCK='''(() => {
 window.shareMode='success';window.copied=[];window.shared=[];
 Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{
   if(window.shareMode==='clipboard-fail')throw new DOMException('Denied','NotAllowedError');
   window.copied.push(text);
 }}});
 Object.defineProperty(navigator,'share',{configurable:true,value:async payload=>{
   if(window.shareMode==='cancel')throw new DOMException('Cancelled','AbortError');
   if(window.shareMode==='share-fail')throw new DOMException('Denied','NotAllowedError');
   window.shared.push(payload);
 }});
})();'''
with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True)
    for width,lang in [(320,'zh'),(390,'zh'),(402,'vi'),(1440,'zh')]:
        context=browser.new_context(viewport={'width':width,'height':900},reduced_motion='reduce')
        context.add_init_script(MOCK)
        page=context.new_page();errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
        private='2 phần phở gà, địa chỉ riêng 123 Private Road, số điện thoại 123456789'
        page.goto(BASE+'prototypes/wanso/?'+urlencode({'embed':'1','device':'1','lang':lang,'restaurant':'demo-81','meal':private})+'#home',wait_until='networkidle')
        expect(page.locator('.native-store-view')).to_have_attribute('data-store-id','demo-81')
        page.locator('.native-store-toolbar-actions .native-store-circle').first.click()
        panel=page.locator('.wanso-share');expect(panel).to_be_visible()
        expect(panel.locator('.wanso-share-photo img')).to_have_attribute('data-media-state','loaded')
        quotes=page.evaluate('''() => {
          const store=wansoCatalog.find(s=>s.id==='demo-81');
          return ['grab','shopee'].map(key=>wansoOffers.calculate(store,key,2).total);
        }''')
        actual=[int(''.join(c for c in value if c.isdigit())) for value in panel.locator('.wanso-share-total>strong').all_text_contents()]
        assert actual==quotes,(actual,quotes)
        assert panel.evaluate('(e)=>e.scrollWidth<=e.clientWidth+1'),'Share content must fit a narrow phone'
        assert panel.locator('.wanso-share-total').evaluate_all('(nodes)=>nodes.every(e=>e.scrollWidth<=e.clientWidth+1)'),'Prices must fit inside each platform card'
        page.locator('.wanso-sheet').screenshot(path=str(OUT/f'{width}-{lang}-preview.png'))
        panel.locator('[data-action=link]').click()
        expect(panel.locator('.wanso-share-feedback')).to_have_attribute('data-kind','success')
        link=page.evaluate('window.copied.at(-1)');params=parse_qs(urlparse(link).query)
        assert set(params)=={'restaurant','lang','meal'},params
        assert params['restaurant']==['demo-81'] and params['lang']==[lang]
        assert params['meal'][0].startswith('2 phần ')
        assert all(secret not in link for secret in ['Private','123456789','embed','device'])
        # The copied URL opens the same restaurant in a new tab, with the same quantity and prices.
        receiver=context.new_page();receiver.goto(link,wait_until='networkidle')
        expect(receiver.locator('.native-store-view')).to_have_attribute('data-store-id','demo-81')
        received=[int(''.join(c for c in value if c.isdigit())) for value in receiver.locator('.native-store-platform-total>strong').all_text_contents()]
        assert received==quotes,(received,quotes)
        receiver.close()
        note='一起看看这家店。\n我想要两份，辣椒另放 <谢谢>。' if lang=='zh' else 'Cùng xem quán này nhé.\nMình chọn hai phần, để riêng ớt <cảm ơn>.'
        panel.locator('.wanso-share-message').fill(note)
        panel.locator('[data-action=copy]').click()
        copy=page.evaluate('window.copied.at(-1)')
        assert copy.startswith(note) and link in copy and 'GrabFood' in copy and 'ShopeeFood' in copy
        assert ('优惠券' if lang=='zh' else 'Mã giảm') in copy
        panel.locator('[data-action=share]').click()
        expect(panel.locator('.wanso-share-feedback')).to_have_attribute('data-kind','success')
        shared=page.evaluate('window.shared.at(-1)');assert shared['url']==link and shared['text'].startswith(note)
        page.evaluate("window.shareMode='cancel'")
        panel.locator('[data-action=share]').click()
        expect(panel.locator('.wanso-share-feedback')).not_to_have_attribute('data-kind','success')
        expect(panel.locator('.wanso-share-feedback')).to_contain_text('取消' if lang=='zh' else 'hủy')
        expect(panel.locator('.wanso-share-message')).to_have_value(note)
        page.evaluate("window.shareMode='clipboard-fail'")
        panel.locator('[data-action=copy]').click()
        fallback=panel.locator('.wanso-share-fallback');expect(fallback).to_be_visible()
        manual=fallback.locator('textarea');assert manual.input_value().startswith(note)
        assert manual.evaluate('(el)=>el.selectionEnd-el.selectionStart===el.value.length')
        expect(panel.locator('.wanso-share-feedback')).to_have_attribute('data-kind','notice')
        page.locator('.wanso-sheet').screenshot(path=str(OUT/f'{width}-{lang}-fallback.png'))
        page.evaluate("window.shareMode='share-fail'")
        panel.locator('[data-action=share]').click()
        expect(panel.locator('.wanso-share-feedback')).to_have_attribute('data-kind','notice')
        expect(fallback).to_be_visible()
        page.evaluate("Object.defineProperty(navigator,'share',{configurable:true,value:undefined});Object.defineProperty(navigator,'clipboard',{configurable:true,value:undefined})")
        page.locator('.sheet-close').click()
        page.locator('.native-store-toolbar-actions .native-store-circle').first.click()
        expect(panel.locator('[data-action=share]')).to_have_count(0)
        panel.locator('[data-action=link]').click()
        expect(panel.locator('.wanso-share-fallback')).to_be_visible()
        expect(panel.locator('.wanso-share-manual')).to_have_value(link)
        assert not errors,errors
        checks.append(f'{width}/{lang}: quote parity, deep link, editable copy, native share/cancel/failure, unsupported browser fallback')
        context.close()
    browser.close()
print(json.dumps(checks,ensure_ascii=False,indent=2))
