"""Local-only large saved-library fixture: paging, lookup, safe edits and return position.

The 80 real catalog identities / 30 custom folders are seeded only in isolated
browser storage. No demo favorites are added to shipped application data.
"""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE=os.getenv('PORTFOLIO_URL','http://127.0.0.1:8765/').rstrip('/')+'/'
OUT=Path(__file__).resolve().parents[1]/'work'/'wanso-saved-scale';OUT.mkdir(exist_ok=True)
checks=[]

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    for width,lang in [(320,'zh'),(390,'zh'),(320,'vi'),(390,'vi')]:
        context=browser.new_context(viewport={'width':width,'height':844},is_mobile=True,has_touch=True,reduced_motion='reduce')
        page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(BASE+'prototypes/wanso/?embed=1&device=1&lang='+lang+'#saved',wait_until='networkidle')
        stores=page.evaluate('''() => {
            const stores=window.wansoCatalog.slice(0,80);
            const folders=Array.from({length:30},(_,i)=>'Lunch '+String(i+1).padStart(2,'0'));
            const state={collections:['Tất cả',...folders],collectionDetails:{},group:{},savedFolder:'Tất cả'};
            folders.forEach(name=>state.collectionDetails[name]={emoji:'🍜',description:'Meals to try with friends'});
            stores.forEach((store,i)=>state.group[store.id]=i<17?folders[0]:folders[1+(i-17)%29]);
            localStorage.setItem('wanso-saved-v2',JSON.stringify(state));
            return stores.map(store=>({id:store.id,name:store.name}));
        }''')
        page.reload(wait_until='networkidle')
        saved=page.locator('.ios-page-saved');cards=saved.locator('.saved-restaurant');sheet=page.locator('.wanso-sheet')
        search=saved.locator('.saved-search input');pager=saved.locator('.saved-pagination')
        expect(cards).to_have_count(8)
        assert page.locator('.saved-folder').count()<=4
        expect(pager.locator('[data-page=prev]')).to_be_disabled()
        first_ids=cards.evaluate_all('(nodes)=>nodes.map(n=>n.dataset.savedId)')
        page.screenshot(path=str(OUT/f'{width}-{lang}-first.png'))
        pager.locator('[data-page=next]').click()
        second_ids=cards.evaluate_all('(nodes)=>nodes.map(n=>n.dataset.savedId)')
        assert len(second_ids)==8 and not set(first_ids)&set(second_ids)
        assert page.evaluate('wansoControls.viewState().savedPage')==2
        assert saved.evaluate('(e)=>e.scrollTop')<2
        # Search operates over the full collection, including rows not yet rendered.
        target=stores[0]
        assert target['id'] not in first_ids+second_ids
        search.fill(target['name'])
        expect(cards).to_have_count(1)
        expect(cards.first).to_have_attribute('data-saved-id',target['id'])
        assert page.evaluate('wansoControls.viewState().savedPage')==1
        expect(pager).not_to_be_visible()
        search.fill('no-restaurant-should-match-this-qa-query')
        expect(cards).to_have_count(0);expect(saved.locator('.saved-empty')).to_be_visible()
        saved.locator('.saved-empty-action').click()
        expect(search).to_have_value('');expect(cards).to_have_count(8)
        # The full folder browser can find a collection beyond the compact chip row.
        saved.locator('.saved-folders-all').click()
        folder_search=sheet.locator('.collection-search-input');folder_search.fill('Lunch 30')
        expect(sheet.locator('.collection-choice[data-folder="Lunch 30"]')).to_be_visible()
        sheet.locator('.collection-choice[data-folder="Lunch 30"]').click()
        expect(sheet).not_to_be_visible()
        expect(saved.locator('.saved-folder[aria-pressed=true]')).to_have_attribute('data-folder','Lunch 30')
        assert page.evaluate('wansoControls.viewState().savedPage')==1
        assert page.evaluate('wansoControls.viewState().savedSearch')==''
        assert 0<cards.count()<=8
        assert page.locator('.saved-folder').count()<=4
        # 17 favorites make a three-page folder. Deleting its only last-page item clamps to page 2.
        saved.locator('.saved-folders-all').click();sheet.locator('.collection-search-input').fill('Lunch 01')
        sheet.locator('.collection-choice[data-folder="Lunch 01"]').click()
        expect(cards).to_have_count(8)
        pager.locator('[data-page=next]').click();pager.locator('[data-page=next]').click()
        expect(cards).to_have_count(1)
        assert page.evaluate('wansoControls.viewState().savedPage')==3
        removed=cards.first.get_attribute('data-saved-id')
        cards.first.locator('.saved-card-more').click();sheet.locator('[data-action=removeSaved]').click()
        sheet.locator('.sheet-button.danger').click()
        expect(cards).to_have_count(8)
        assert page.evaluate('wansoControls.viewState().savedPage')==2
        expect(pager.locator('[data-page=next]')).to_be_disabled()
        page.locator('.saved-undo').click()
        assert page.evaluate('(id)=>Boolean(wansoControls.viewState().group[id])',removed)
        # Reading position and selected page survive detail views and tab switching.
        cards.nth(2).locator('.saved-restaurant-main').click()
        store=page.locator('.native-store-view');expect(store).to_be_visible()
        before=saved.evaluate('(e)=>e.scrollTop')
        shown=cards.evaluate_all('(nodes)=>nodes.map(n=>n.dataset.savedId)')
        store.locator('.native-store-scroll').evaluate('(e)=>e.scrollTop=1200')
        store.locator('.native-store-back').click()
        assert abs(saved.evaluate('(e)=>e.scrollTop')-before)<3
        assert cards.evaluate_all('(nodes)=>nodes.map(n=>n.dataset.savedId)')==shown
        saved.evaluate('(e)=>e.scrollTop=300');top=saved.evaluate('(e)=>e.scrollTop')
        toolbar=saved.locator('.saved-toolbar').bounding_box();bounds=saved.bounding_box()
        assert toolbar['y']>=bounds['y']-1 and toolbar['y']<bounds['y']+25,(toolbar,bounds)
        page.locator('.phone-nav [data-target=home]').click();page.locator('.phone-nav [data-target=saved]').click()
        assert abs(saved.evaluate('(e)=>e.scrollTop')-top)<3
        assert page.evaluate('wansoControls.viewState().savedPage')==2
        assert cards.evaluate_all('(nodes)=>nodes.map(n=>n.dataset.savedId)')==shown
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
        assert saved.locator('.saved-restaurants').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1')
        assert cards.evaluate_all('(nodes)=>nodes.every(e=>e.scrollWidth<=e.clientWidth+1)')
        page.screenshot(path=str(OUT/f'{width}-{lang}-page2.png'))
        page.reload(wait_until='networkidle')
        assert page.evaluate('Object.keys(wansoControls.viewState().group).length')==80
        assert not errors,errors
        checks.append(f'{width}/{lang}: 80 saves/30 folders; 8-row pages, full-library search, distant folder selection, last-page delete+undo, sticky search, detail/tab return and refresh')
        context.close()
    browser.close()
report={'passed':len(checks),'checks':checks}
(OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps(report,ensure_ascii=False,indent=2))
