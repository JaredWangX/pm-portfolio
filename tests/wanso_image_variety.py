"""Cross-page imagery is varied, while the same restaurant and conversation stay stable."""
from hashlib import sha256
import json, os
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
BASE=os.getenv('PORTFOLIO_URL','http://127.0.0.1:8765/').rstrip('/')+'/'
OUT=ROOT/'work/wanso-image-variety';OUT.mkdir(parents=True,exist_ok=True)
checks=[]

def photos(locator):
    return locator.evaluate_all('(nodes)=>nodes.map(n=>n.getAttribute("src"))')
def hash_photo(src):
    with Image.open((ROOT/'prototypes/wanso'/src).resolve()) as image:
        return sha256(image.convert('RGB').resize((128,128)).tobytes()).hexdigest()
def photo_meta(page,src):
    return page.evaluate('(src)=>{const s=window.wansoCatalog.find(s=>s.image===src);return {id:s.id,kind:s.imageKind,key:s.key};}',src)
with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True)
    for width in [1440,390]:
        context=browser.new_context(viewport={'width':width,'height':1000 if width==1440 else 844},reduced_motion='reduce')
        page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(BASE+'prototypes/wanso/#home',wait_until='networkidle')
        home=photos(page.locator('.rich-home-card img'));assert len(home)==5
        page.evaluate("location.hash='explore'");expect(page.locator('.ios-explore-picks')).to_be_visible()
        explore=photos(page.locator('.ios-explore-store img'));assert len(explore)==5
        page.evaluate("location.hash='recommend'");expect(page.locator('.rich-chat-rail')).to_have_count(3)
        chat=photos(page.locator('.rich-chat-rail').first.locator('img'));assert len(chat)==5
        first15=home+explore+chat
        assert len(set(map(hash_photo,first15)))==15,'different URLs must not hide duplicate photo files'
        assert all(photo_meta(page,src)['kind']=='photo' for src in first15)
        if width==1440:
            montage=Image.new('RGB',(1100,450),'white')
            for i,src in enumerate(first15):
                img=Image.open((ROOT/'prototypes/wanso'/src).resolve()).convert('RGB');img.thumbnail((220,150))
                montage.paste(img,((i%5)*220,(i//5)*150))
            montage.save(OUT/'cross-page-15.jpg')
        ids=lambda rail:rail.locator('[data-store-id]').evaluate_all('(nodes)=>nodes.map(n=>n.dataset.storeId)')
        first=ids(page.locator('.rich-chat-rail').first)
        for rail in [page.locator('.rich-chat-rail').nth(1),page.locator('.rich-chat-rail').nth(2)]:
            assert set(ids(rail))==set(first),'fee or narrowing follow-up silently replaced the candidate stores'
        chosen=page.locator('.rich-chat-rail').first.locator('.rich-recommendation').first
        src=chosen.locator('img').get_attribute('src');identifier=chosen.get_attribute('data-store-id')
        chosen.locator('.ios-restaurant-main').click()
        expect(page.locator('.native-store-view')).to_have_attribute('data-store-id',identifier)
        expect(page.locator('.native-store-hero>img')).to_have_attribute('src',src)
        page.get_by_role('button',name='返回上一页',exact=True).click()
        assert set(ids(page.locator('.rich-chat-rail').first))==set(first)
        page.evaluate("location.hash='home'");expect(page.locator('.ios-home-location')).to_be_visible()
        assert photos(page.locator('.rich-home-card img'))==home,'home reshuffled without an explicit refresh'
        page.evaluate("location.hash='explore'");expect(page.locator('.ios-explore-store')).to_have_count(5)
        assert photos(page.locator('.ios-explore-store img'))==explore,'explore reshuffled on return'
        checks.append(f'{width}: 15 unique photographic files across three surfaces; detail/return keep identity; fee follow-ups keep stores')
        page.evaluate("location.hash='home'");expect(page.locator('.rich-home-card')).to_have_count(5)
        refreshed=[]
        for i in range(7):
            page.get_by_role('button',name='刷新万象精选',exact=True).click()
            batch=photos(page.locator('.rich-home-card img'));assert len(batch)==5
            assert len(set(batch))==5
            assert all(photo_meta(page,src)['kind']=='photo' for src in batch)
            refreshed+=batch
        assert len(set(map(hash_photo,refreshed)))==35
        assert not set(first15)&set(refreshed),'fresh batches reused an already displayed photo before pool exhaustion'
        checks.append(f'{width}: seven refreshes show 35 additional distinct photo files without reusing initial pages')
        # Constraints still apply even when a page has already shown many images.
        result=page.evaluate('''() => {
          const tests=['想吃鸡肉热汤河粉，不吃香菜，含配送预算八万','想吃鸡肉米线，含配送预算八万','想吃干拌河粉，含配送预算八万','想吃素食，不吃鸡肉，含配送预算八万'];
          const start=performance.now();
          const rows=tests.map(query=>window.wansoNative.selectedStores({query}).map(s=>({id:s.id,key:s.key,city:s.city,image:s.image,vegetarian:s.vegetarian,total:Math.min(s.platforms.grab.total,s.platforms.shopee.total)})));
          return {rows,ms:performance.now()-start};
        }''')
        for rows,category in zip(result['rows'],['pho','bun','mixed','veggie']):
            assert len(rows)==5 and all(s['key']==category and s['city']=='hanoi' and s['total']<=80000 for s in rows)
            assert len({s['image'] for s in rows})==5
        assert result['ms']<1000,result['ms']
        checks.append(f'{width}: strict cuisines, city and budget retained; four catalog selections in {round(result["ms"])} ms')
        assert not errors,errors
        context.close()
    browser.close()
print(json.dumps({'passed':len(checks),'checks':checks},ensure_ascii=False,indent=2))
