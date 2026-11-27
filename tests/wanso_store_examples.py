"""Regression for narrow embedded offers, illustrative reviews, and recent orders.

PORTFOLIO_URL may point at a preview or deployed portfolio. The default server
is http://127.0.0.1:8765/. No model or delivery-platform requests are performed.
"""
import json
import os
from pathlib import Path
from playwright.sync_api import expect, sync_playwright

BASE = os.getenv('PORTFOLIO_URL', 'http://127.0.0.1:8765/').rstrip('/') + '/'
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'work' / 'wanso-store-examples'
OUT.mkdir(parents=True, exist_ok=True)
CHECKS = []


def open_page(browser, width, height=850, frame='home', embedded=True):
    context = browser.new_context(viewport={'width':width, 'height':height},
        is_mobile=True, has_touch=True, locale='zh-CN', reduced_motion='reduce')
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error:errors.append(str(error)))
    suffix = 'embed=1&device=1&' if embedded else ''
    url = BASE + 'prototypes/wanso/?' + suffix + 'qa=store-examples#' + frame
    page.goto(url, wait_until='networkidle')
    return context, page, errors


def check_offers(page, label):
    page.locator('.rich-home-card').first.click()
    view = page.locator('.native-store-view')
    expect(view).to_be_visible()
    offers = view.locator('.native-store-platforms')
    offers.evaluate('(node)=>node.scrollIntoView({block:"start"})')
    geometry = offers.evaluate('''node => {
        const root=node.closest('.native-store-view'), cards=[...node.children];
        const boxes=cards.map(c=>c.getBoundingClientRect());
        return {width:root.clientWidth,overflow:root.scrollWidth-root.clientWidth,
            positions:boxes.map(b=>({x:b.x,y:b.y,w:b.width,h:b.height})),
            text:cards.flatMap(card=>[...card.querySelectorAll('h2,.native-store-delivery strong,.native-store-promo strong,.native-store-platform-total strong,.native-store-order span')].map(n=>{
                const range=document.createRange();range.selectNodeContents(n);
                const text=range.getBoundingClientRect(), outer=card.getBoundingClientRect(), box=n.getBoundingClientRect();
                return {text:n.textContent,left:text.left,right:text.right,cardLeft:outer.left,cardRight:outer.right,
                    scroll:n.scrollWidth,client:n.clientWidth,boxLeft:box.left,boxRight:box.right};
            })),
            feeRows:cards.map(card=>[...card.querySelectorAll('.native-store-delivery,.native-store-promo')].map(n=>{
                const label=n.firstElementChild.getBoundingClientRect(), value=n.lastElementChild.getBoundingClientRect();
                return {topDifference:Math.abs(label.top-value.top),gap:value.left-label.right};
            }))};
    }''')
    assert geometry['overflow'] <= 1, geometry
    first, second = geometry['positions']
    if geometry['width'] < 360:
        assert abs(first['x']-second['x']) < 1 and second['y'] >= first['y']+first['h']+10, geometry
    else:
        assert abs(first['y']-second['y']) < 1 and second['x'] > first['x'], geometry
    for item in geometry['text']:
        assert item['left'] >= item['cardLeft'] and item['right'] <= item['cardRight']-5, item
        assert item['scroll'] <= item['client']+1, item
    for rows in geometry['feeRows']:
        for row in rows:
            assert row['topDifference'] <= 3 and row['gap'] >= 4, row
    page.screenshot(path=str(OUT / (label + '-offers.png')))
    CHECKS.append(f'{label}: actual {geometry["width"]}px phone controls offer columns; complete names and aligned fee rows')
    return view, geometry['width']


def check_reviews(page, view, label):
    reviews=view.locator('.native-store-reviews')
    expect(reviews).to_have_count(1)
    expect(reviews.locator('h2')).to_have_text('精彩评论')
    expect(reviews.locator('.native-store-review-example')).to_have_text('评论示例')
    expect(reviews.locator('.native-store-review')).to_have_count(3)
    assert reviews.evaluate('(node)=>Boolean(node.previousElementSibling?.matches(".native-store-menu"))'), 'reviews should follow the menu'
    texts=reviews.locator('.native-store-review-text').all_text_contents()
    assert len(set(texts)) == 3 and all(len(t)>=50 and "。" in t for t in texts), texts
    for row in reviews.locator('.native-store-review').all():
        dish=row.locator('.native-store-review-dish').inner_text().removeprefix('餐品 · ')
        assert dish in row.locator('.native-store-review-text').inner_text(), dish
    reviews.evaluate('(node)=>node.scrollIntoView({block:"start"})')
    page.screenshot(path=str(OUT / (label + '-reviews.png')))
    assert reviews.evaluate('(node)=>node.scrollWidth <= node.clientWidth'), 'reviews overflow the phone'
    CHECKS.append(f'{label}: three substantive dish-specific review examples appear after the menu')


def check_saved_and_recent(browser):
    context,page,errors=open_page(browser,390,844,frame='saved',embedded=False)
    try:
        saved=page.locator('.ios-page-saved')
        expect(saved).to_be_visible()
        cards=saved.locator('.ios-saved-store')
        expect(cards).to_have_count(2)
        expect(cards.locator('.ios-saved-order')).to_have_count(0)
        for card in cards.all():
            assert '下单' not in card.inner_text(), card.inner_text()
            expect(card.locator('.ios-saved-actions button')).to_have_count(2)
        recent=saved.locator('.ios-recent-order-rail .ios-order-record')
        expect(recent).to_have_count(3)
        expect(saved.locator('.ios-order-record-note')).to_contain_text('示例')
        identifiers=recent.evaluate_all('(nodes)=>nodes.map(n=>n.dataset.orderId)')
        for identifier in identifiers:
            store_id,platform,_=identifier.split('|',2)
            store=page.evaluate('(id)=>window.wansoCatalog.find(s=>s.id===id)',store_id)
            platform_name='GrabFood' if platform=='grab' else 'ShopeeFood'
            card=saved.locator(f'.ios-order-record[data-order-id="{identifier}"]')
            expect(card.locator('.ios-order-record-platform')).to_have_text(platform_name)
            expect(card.locator('.ios-order-record-dish')).to_contain_text(store['dishZh'])
            price=store['platforms'][platform]
            expected_total=price['price']+price['fee']-price['discount']
            card.locator('.ios-order-record-reopen').click()
            sheet=page.locator('.wanso-sheet')
            expect(sheet).to_be_visible()
            expect(sheet.locator('h2')).to_have_text('下单预览 · '+platform_name)
            expect(sheet).to_contain_text(store['name'])
            expect(sheet).to_contain_text(store['dishZh'])
            total=sheet.locator('.sheet-details > div').filter(has=page.locator('dt',has_text='合计'))
            expect(total).to_contain_text(f'{expected_total:,}'.replace(',', '.') + 'đ')
            sheet.get_by_role('button',name='关闭',exact=True).click()
            expect(sheet).not_to_be_visible()
        expect(recent).to_have_count(3)
        saved.get_by_role('button',name='查看全部最近订单',exact=True).click()
        sheet=page.locator('.wanso-sheet')
        expect(sheet.locator('.ios-order-list .ios-order-record')).to_have_count(3)
        page.screenshot(path=str(OUT/'recent-orders.png'))
        sheet.get_by_role('button',name='完成',exact=True).click()
        # Original saved restaurants keep their archived menus and now get review examples too.
        legacy_names=cards.locator('.ios-saved-main').evaluate_all('(nodes)=>nodes.map(n=>n.getAttribute("aria-label"))')
        for index,name in enumerate(legacy_names):
            cards.get_by_role('button',name=name,exact=True).click()
            reviews=page.locator('.phone-scroll > .native-store-reviews')
            expect(reviews).to_have_count(1)
            expect(reviews.locator('.native-store-review')).to_have_count(3)
            expect(reviews.locator('.native-store-review-example')).to_contain_text('示例')
            reviews.evaluate('(node)=>node.scrollIntoView({block:"start"})')
            page.screenshot(path=str(OUT/f'legacy-{index}-reviews.png'))
            page.goto(BASE+'prototypes/wanso/?qa=store-examples#saved',wait_until='networkidle')
            expect(saved).to_be_visible()
        CHECKS.append('saved: favourites only open/move/remove; three seeded recent records reopen matching store, dish, platform and fees; both archived stores have reviews')
        # Clear through the real settings action, then revisit and reload. Empty must not reseed.
        page.locator('.hotspot[aria-label="我的"]').click()
        page.get_by_role('button',name='应用设置',exact=True).click()
        page.get_by_role('button',name='清除活动历史',exact=True).click()
        page.locator('.wanso-sheet').get_by_role('button',name='确认清除',exact=True).click()
        page.goto(BASE+'prototypes/wanso/?qa=store-examples#saved',wait_until='networkidle')
        expect(saved.locator('.ios-recent-order-rail .ios-order-record')).to_have_count(0)
        expect(saved.locator('.ios-orders-empty')).to_be_visible()
        page.reload(wait_until='networkidle')
        expect(saved.locator('.ios-recent-order-rail .ios-order-record')).to_have_count(0)
        saved.get_by_role('button',name='查看全部最近订单',exact=True).click()
        expect(page.locator('.wanso-sheet')).to_contain_text('暂无记录')
        CHECKS.append('recent: clearing activity remains empty after navigation and reload instead of restoring demo orders')
        assert not errors,errors
    finally:
        context.close()


def run():
    with sync_playwright() as p:
        browser=p.chromium.launch(channel='chrome',headless=True)
        try:
            widths=[]
            for width,height in [(240,850),(280,850),(320,850),(480,1200)]:
                context,page,errors=open_page(browser,width,height)
                try:
                    label=str(width)
                    view,actual_width=check_offers(page,label)
                    widths.append(actual_width)
                    check_reviews(page,view,label)
                    assert not errors,errors
                    if width==320:
                        data=page.evaluate('''()=>window.wansoCatalog.map(store=>({id:store.id,
                            reviews:window.wansoReviews.forStore(store).map(r=>({text:r.text,dish:r.dish,sample:r.sample}))}))''')
                        assert len(data)==160
                        assert all(len(s['reviews'])==3 and all(r['sample'] and r['dish'] in r['text'] for r in s['reviews']) for s in data)
                        CHECKS.append('fixtures: all 160 catalog stores have three explicitly illustrative, dish-matching reviews')
                finally:
                    context.close()
            assert min(widths)<280 and max(widths)>=390,widths
            check_saved_and_recent(browser)
        finally:
            browser.close()
    report={'passed':len(CHECKS),'checks':CHECKS,'screenshots':str(OUT)}
    (OUT/'checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print(json.dumps(report,ensure_ascii=False,indent=2))


if __name__=='__main__':
    run()
