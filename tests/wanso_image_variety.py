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
    return locator.evaluate_all('(nodes)=>nodes.map(n=>n.dataset.imageSource||n.getAttribute("src"))')

def loaded_photos(locator):
    """Scroll real rails: deferred cards must decode before their identity is checked."""
    actual=[]
    for image in locator.all():
        image.scroll_into_view_if_needed()
        expect(image).to_have_attribute("data-media-state","loaded")
        assert image.evaluate("i=>i.naturalWidth>1&&i.complete")
        source=image.get_attribute("src")
        canonical=image.get_attribute("data-image-source")
        assert Path(source).name==Path(canonical).name
        actual.append(source)
    return actual
def hash_photo(src):
    with Image.open((ROOT/'prototypes/wanso'/src).resolve()) as image:
        return sha256(image.convert('RGB').resize((128,128)).tobytes()).hexdigest()
def photo_meta(page,src):
    return page.evaluate('(src)=>{const s=window.wansoCatalog.find(s=>s.image===src);return {id:s.id,kind:s.imageKind,key:s.key,scene:s.imageScene||s.image};}',src)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    for width in [1440,390]:
        context=browser.new_context(viewport={'width':width,'height':1000 if width==1440 else 844},reduced_motion='reduce')
        page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(BASE+'prototypes/wanso/#home',wait_until='networkidle')
        home=photos(page.locator('.rich-home-card img'));assert len(home)==5
        home_loaded=loaded_photos(page.locator('.rich-home-card img'))
        page.evaluate("location.hash='explore'");expect(page.locator('.ios-explore-picks')).to_be_visible()
        explore=photos(page.locator('.ios-explore-store img'));assert len(explore)==5
        explore_loaded=loaded_photos(page.locator('.ios-explore-store img'))
        page.evaluate("location.hash='recommend'");expect(page.locator('.rich-chat-rail')).to_have_count(1)
        expect(page.locator('.reply-comparison')).to_have_count(1)
        expect(page.locator('.reply-decision')).to_have_count(1)
        chat=photos(page.locator('.rich-chat-rail').first.locator('img'));assert len(chat)==5
        chat_loaded=loaded_photos(page.locator('.rich-chat-rail').first.locator('img'))
        first15=home+explore+chat
        assert len(set(map(hash_photo,first15)))==15,'different URLs must not hide duplicate photo files'
        assert all(photo_meta(page,src)['kind']=='photo' for src in first15)
        assert len({photo_meta(page,src)['scene'] for src in first15})==15,'alternate angles of one meal must not pass as fresh imagery'
        assert len(set(map(hash_photo,home_loaded+explore_loaded+chat_loaded)))==15,'loaded card variants must remain distinct'
        assert all('/thumbs/' in src for src in home_loaded+explore_loaded+chat_loaded)
        if width==1440:
            montage=Image.new('RGB',(1100,450),'white')
            for i,src in enumerate(first15):
                img=Image.open((ROOT/'prototypes/wanso'/src).resolve()).convert('RGB');img.thumbnail((220,150))
                montage.paste(img,((i%5)*220,(i//5)*150))
            montage.save(OUT/'cross-page-15.jpg')
        ids=lambda rail:rail.locator('[data-store-id]').evaluate_all('(nodes)=>nodes.map(n=>n.dataset.storeId)')
        first=ids(page.locator('.rich-chat-rail').first)
        for reply in [page.locator('.reply-comparison'),page.locator('.reply-decision')]:
            assert reply.get_attribute('data-store-id') in first,'fee or narrowing follow-up silently replaced the candidate stores'
            expect(reply.locator('img')).to_have_count(0)
        chosen=page.locator('.rich-chat-rail').first.locator('.rich-recommendation').first
        src=chosen.locator('img').get_attribute('data-image-source');identifier=chosen.get_attribute('data-store-id')
        chosen.locator('.ios-restaurant-main').click()
        expect(page.locator('.native-store-view')).to_have_attribute('data-store-id',identifier)
        expect(page.locator('.native-store-hero>img')).to_have_attribute('data-image-source',src)
        expect(page.locator('.native-store-hero>img')).to_have_attribute('data-media-state','loaded')
        expect(page.locator('.native-store-hero>img')).to_have_attribute('src',src)
        assert page.locator('.native-store-hero>img').evaluate('(i)=>Math.abs(i.clientWidth/i.clientHeight-i.naturalWidth/i.naturalHeight)<.01'),'detail must show the whole uncropped photograph'
        page.get_by_role('button',name='Quay lại',exact=True).click()
        assert set(ids(page.locator('.rich-chat-rail').first))==set(first)
        page.evaluate("location.hash='home'");expect(page.locator('.ios-home-location')).to_be_visible()
        assert photos(page.locator('.rich-home-card img'))==home,'home reshuffled without an explicit refresh'
        page.evaluate("location.hash='explore'");expect(page.locator('.ios-explore-store')).to_have_count(5)
        assert photos(page.locator('.ios-explore-store img'))==explore,'explore reshuffled on return'
        checks.append(f'{width}: 15 unique photographic files across three surfaces; detail/return keep identity; fee follow-ups retain a previous store without repeating photos')
        page.evaluate("location.hash='home'");expect(page.locator('.rich-home-card')).to_have_count(5)
        refreshed=[]
        for i in range(7):
            page.get_by_role('button',name='Đổi quán Wanso tuyển chọn',exact=True).click()
            batch=photos(page.locator('.rich-home-card img'));assert len(batch)==5
            assert len(set(batch))==5
            assert all(photo_meta(page,src)['kind']=='photo' for src in batch)
            refreshed+=batch
        assert len(set(map(hash_photo,refreshed)))==35
        assert not set(first15)&set(refreshed),'fresh batches reused an already displayed photo before pool exhaustion'
        checks.append(f'{width}: seven refreshes show 35 additional distinct photo files without reusing initial pages')
        # Constraints still apply even when a page has already shown many images.
        result=page.evaluate('''() => {
          const tests=['Muốn ăn phở gà nước nóng, không rau mùi, cả ship dưới 80.000đ','Muốn ăn bún gà, cả ship dưới 80.000đ','Muốn ăn phở trộn, cả ship dưới 80.000đ','Muốn ăn chay, không thịt gà, cả ship dưới 80.000đ'];
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
