"""Compact photos load near the viewport, retain identity, and fall back safely."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
BASE=os.getenv('PORTFOLIO_URL','http://127.0.0.1:8765/').rstrip('/')+'/'
checks=[]
sources=['pho-03.webp','mixed-02.webp','rice-10.webp','banh-07.webp','veggie-01.webp','coffee-02.webp']
with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True)
    page=browser.new_page(viewport={'width':390,'height':844})
    requests=[];page.on('request',lambda r:requests.append(r.url) if r.resource_type=='image' and not r.url.startswith('data:') else None)
    page.set_content('<base href="'+BASE+'prototypes/wanso/"><style>body{margin:12px}#rail{display:flex;gap:12px;width:300px;overflow:auto}img{flex:none;object-fit:cover;width:220px;height:140px}#later{margin-top:1800px}</style><div id="rail"></div><div id="later"></div>')
    page.add_script_tag(url=BASE+'prototypes/wanso/media.js')
    page.evaluate('''files=>{for(const name of files)document.querySelector('#rail').append(wansoMedia.image('../../assets/wanso/catalog/'+name,{alt:'Món ăn'}));document.querySelector('#later').append(wansoMedia.image('../../assets/wanso/catalog/tea-06.webp'));}''',sources)
    expect(page.locator('#rail img').first).to_have_attribute('data-media-state','loaded')
    page.wait_for_timeout(150)
    assert 0<len(requests)<len(sources),requests
    assert all('/thumbs/' in src for src in requests),requests
    assert page.locator('#later img').get_attribute('data-media-state')=='pending'
    assert page.locator('#rail img').first.get_attribute('data-image-source').endswith('/pho-03.webp')
    assert page.locator('#rail img').first.get_attribute('fetchpriority')=='high'
    checks.append('initial viewport fetches only nearby small variants; canonical identity and priority retained')
    page.locator('#rail').evaluate('(el)=>el.scrollLeft=el.scrollWidth')
    expect(page.locator('#rail img').last).to_have_attribute('data-media-state','loaded')
    page.locator('#later img').scroll_into_view_if_needed()
    expect(page.locator('#later img')).to_have_attribute('data-media-state','loaded')
    checks.append('horizontal and vertical scrolling loads offscreen photos before use')
    page.evaluate("document.body.prepend(wansoMedia.image('../../assets/wanso/catalog/pho-03.webp',{detail:true,eager:true,className:'hero'}))")
    expect(page.locator('.hero')).to_have_attribute('data-media-state','loaded')
    assert '/thumbs/' not in page.locator('.hero').get_attribute('src')
    assert page.locator('.hero').get_attribute('fetchpriority')=='high'
    checks.append('detail hero requests full-size image at high priority')
    page.route('**/thumbs/pho-08.webp',lambda r:r.abort())
    page.evaluate("document.body.prepend(wansoMedia.image('../../assets/wanso/catalog/pho-08.webp',{eager:true,className:'fallback'}))")
    expect(page.locator('.fallback')).to_have_attribute('data-media-state','loaded')
    assert '/thumbs/' not in page.locator('.fallback').get_attribute('src')
    page.evaluate("document.body.prepend(wansoMedia.image('../../assets/wanso/catalog/pho-08.webp',{eager:true,className:'fallback-repeat'}))")
    expect(page.locator('.fallback-repeat')).to_have_attribute('data-media-state','loaded')
    assert '/thumbs/' not in page.locator('.fallback-repeat').get_attribute('src')
    checks.append('unavailable thumbnail falls back once and avoids repeating its failed request')
    browser.close()
full=sum((ROOT/'assets/wanso/catalog'/name).stat().st_size for name in sources[:5])
small=sum((ROOT/'assets/wanso/catalog/thumbs'/name).stat().st_size for name in sources[:5])
assert small<full*.4,(small,full)
checks.append(f'first five card-photo bytes reduced from {full} to {small}')
print(json.dumps({'passed':len(checks),'checks':checks},ensure_ascii=False,indent=2))
