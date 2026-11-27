"""Keep Vietnamese settlement rows aligned and readable in both platform cards."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
BASE=os.getenv('PORTFOLIO_URL','http://127.0.0.1:8765/').rstrip('/')+'/'
OUT=Path(__file__).resolve().parents[1]/'work'/'wanso-price-layout';OUT.mkdir(parents=True,exist_ok=True)
checks=[]
with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True)
    for width in [320,360,390,430,1440]:
        page=browser.new_page(viewport={'width':width,'height':950},reduced_motion='reduce')
        errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(BASE+'prototypes/wanso/?embed=1#home',wait_until='networkidle')
        for quantity in [1,4]:
            # Open through the same controller used by the recommendation cards.
            page.evaluate('''quantity=>window.wansoControls.open({action:'catalogStore',value:{id:'demo-1',request:`Gợi ý phở gà cho ${quantity} người, ngân sách 1.000.000đ.`}}, {id:'home'},document.querySelector('.screen'),()=>{})''',quantity)
            view=page.locator('.native-store-view');cards=view.locator('.native-store-platform')
            expect(cards).to_have_count(2)
            boxes=[cards.nth(i).bounding_box() for i in range(2)]
            assert abs(boxes[0]['y']-boxes[1]['y'])<1,(width,quantity,boxes)
            assert abs(boxes[0]['height']-boxes[1]['height'])<1
            assert boxes[1]['x']>=boxes[0]['x']+boxes[0]['width']+8
            for selector in ['.native-store-platform-heading','.native-store-platform-footer','.native-store-order']:
                pair=[cards.nth(i).locator(selector).bounding_box() for i in range(2)]
                assert abs(pair[0]['y']-pair[1]['y'])<1,(width,quantity,selector,pair)
            for index in range(5):
                pair=[cards.nth(i).locator('.native-store-platform-body > p').nth(index).bounding_box() for i in range(2)]
                assert abs(pair[0]['y']-pair[1]['y'])<1,(width,quantity,index,pair)
                assert abs(pair[0]['height']-pair[1]['height'])<1
            # Every amount, label and brand fits its own card; no ellipsis or hidden overflow.
            issues=cards.evaluate_all('''cards=>cards.flatMap(card=>[...card.querySelectorAll('h2,span,strong')].filter(el=>!el.children.length).flatMap(el=>{
              const range=document.createRange();range.selectNodeContents(el);const text=range.getBoundingClientRect(),bounds=el.getBoundingClientRect(),cardBox=card.getBoundingClientRect(),css=getComputedStyle(el);
              return text.width>bounds.width+1||text.right>cardBox.right-1||text.left<cardBox.left+1||css.textOverflow==='ellipsis'?[el.textContent]:[];
            }))''')
            assert not issues,(width,quantity,issues)
            scroll=view.locator('.native-store-scroll')
            scroll.evaluate('(s)=>{const c=s.querySelector(".native-store-platforms");s.scrollTop+=c.getBoundingClientRect().top-s.getBoundingClientRect().top-78}')
            page.locator('.screen').screenshot(path=str(OUT/f'{width}-{quantity}-portions.png'))
            # Both complete cards and their order actions remain reachable by vertical scrolling.
            for i in range(2):
                cards.nth(i).locator('.native-store-order').scroll_into_view_if_needed()
                assert cards.nth(i).locator('.native-store-order').is_visible()
            view.locator('.native-store-back').click();expect(view).to_have_count(0)
            checks.append(f'{width}px/{quantity} portions: paired columns, aligned headers/rows/footer and readable text')
        assert not errors,errors
        page.goto(BASE+'prototypes/wanso/?embed=1&device=1#compare',wait_until='networkidle')
        toolbar=page.locator('.native-store-toolbar').bounding_box()
        cardsTop=page.locator('.native-store-platforms').bounding_box()['y']
        assert cardsTop>=toolbar['y']+toolbar['height']+8,(width,cardsTop,toolbar)
        checks.append(f'{width}px: direct comparison route clears sticky toolbar')
        page.close()
    browser.close()
print(json.dumps({'passed':len(checks),'checks':checks},ensure_ascii=False,indent=2))
