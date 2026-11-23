"""Scroll/repaint regression and reading paths; actual product files, no model stubs.
Set PORTFOLIO_URL and optionally WANSO_BROWSER_PROXY to check the public deployment.
"""
import json
import os
from pathlib import Path
from urllib.parse import unquote, urlsplit
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get('PORTFOLIO_URL', 'https://jaredwangx.github.io/pm-portfolio/').rstrip('/')+'/'
OUT = ROOT/'work/scroll-research'
OUT.mkdir(parents=True, exist_ok=True)
LIVE = 'PORTFOLIO_URL' in os.environ
with sync_playwright() as p:
    options = dict(channel='chrome', headless=True)
    if LIVE and os.environ.get('WANSO_BROWSER_PROXY'):
        options['proxy'] = {'server':os.environ['WANSO_BROWSER_PROXY']}
    browser = p.chromium.launch(**options)
    page = browser.new_page(viewport={'width':1440,'height':900}, reduced_motion='no-preference')
    page.set_default_timeout(20000)
    if not LIVE:
        def local(route):
            path = unquote(urlsplit(route.request.url).path)
            if path.startswith('/ai-work-platform/'):
                root = ROOT.parent/'ai-work-platform/dist';path = path.removeprefix('/ai-work-platform/')
            else:
                root = ROOT;path = path.removeprefix('/pm-portfolio/')
            f = (root/path).resolve()
            if f.is_dir(): f /= 'index.html'
            if f.is_relative_to(root) and f.is_file(): route.fulfill(path=str(f))
            else: route.fulfill(status=404,body='Not found')
        page.route('https://jaredwangx.github.io/**',local)
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(BASE+'#work',wait_until='domcontentloaded')
    expect(page.frame_locator('[data-device-frame=wanso]').locator('.original-screen')).to_be_visible()
    page.evaluate('''() => {
      window.readingProbe={clears:0,loads:0,shifts:[],positions:[]};
      const original=CanvasRenderingContext2D.prototype.clearRect;
      CanvasRenderingContext2D.prototype.clearRect=function(...args){readingProbe.clears++;return original.apply(this,args)};
      new PerformanceObserver(l=>readingProbe.shifts.push(...l.getEntries().filter(e=>!e.hadRecentInput).map(e=>e.value))).observe({type:'layout-shift'});
      document.querySelectorAll('iframe').forEach(f=>f.addEventListener('load',()=>readingProbe.loads++));
      window.readingProbe.document=document;
    }''')
    page.locator('#documents').evaluate('e=>e.scrollIntoView({behavior:"instant"})')
    page.wait_for_function("document.querySelector('.portfolio-ambient').classList.contains('ambient-idle')")
    initial = page.evaluate('''() => ({height:document.documentElement.scrollHeight,clears:readingProbe.clears,loads:readingProbe.loads,top:document.querySelector('#documents').getBoundingClientRect().top+scrollY})''')
    page.mouse.move(1420,600)
    for direction in [1,-1,1,-1]:
        for step in range(10):
            page.mouse.wheel(0,direction*150)
            page.wait_for_timeout(45)
        page.wait_for_timeout(180)
        assert page.evaluate('readingProbe.document===document')
        assert page.locator('#documents').evaluate('e=>getComputedStyle(e).opacity') == '1'
    result=page.evaluate('''() => ({height:document.documentElement.scrollHeight,clears:readingProbe.clears,loads:readingProbe.loads,top:document.querySelector('#documents').getBoundingClientRect().top+scrollY,shifts:readingProbe.shifts,running:document.getAnimations().filter(a=>a.playState==='running').length})''')
    for key in ['height','clears','loads','top']: assert abs(result[key]-initial[key])<1,(key,initial,result)
    assert sum(result['shifts'])<.001,result
    assert result['running']==0,result
    print('PASS: repeated wheel scrolling retains documents/embeds/layout and pauses off-screen motion',flush=True)
    page.locator('.portfolio-intro').evaluate('e=>e.scrollIntoView({behavior:"instant"})')
    page.wait_for_function('!document.querySelector(".portfolio-ambient").classList.contains("ambient-idle")')
    count=page.evaluate('readingProbe.clears');page.wait_for_timeout(180)
    assert page.evaluate('readingProbe.clears')>count
    page.locator('[data-ambient-toggle]').click();count=page.evaluate('readingProbe.clears');page.wait_for_timeout(180)
    assert page.evaluate('readingProbe.clears')==count
    page.locator('[data-ambient-toggle]').click()
    page.emulate_media(reduced_motion='reduce')
    page.wait_for_function('document.querySelector(".portfolio-ambient").classList.contains("ambient-idle")')
    page.emulate_media(reduced_motion='no-preference')
    print('PASS: hero animation resumes, pause button and reduced motion still work',flush=True)
    for w,h in [(1440,900),(1024,768),(768,1024),(390,844),(320,720)]:
        page.set_viewport_size({'width':w,'height':h})
        page.locator('#documents').evaluate('e=>e.scrollIntoView({behavior:"instant"})');page.wait_for_timeout(150)
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+1')
        expect(page.locator('.decision-link')).to_have_count(4)
        if w>760:
            for selector in ['.decision-project','.decision-brand','.decision-intro','.decision-flow']:
                boxes=page.locator(selector).evaluate_all('es=>es.map(e=>e.getBoundingClientRect().toJSON())')
                assert abs(boxes[0]['top']-boxes[1]['top'])<1,(w,selector,boxes)
                assert abs(boxes[0]['height']-boxes[1]['height'])<1,(w,selector,boxes)
        page.screenshot(path=OUT/f'decisions-{w}.png')
    print('PASS: four reading paths and aligned responsive project dossiers',flush=True)
    for slug in ['wanso-prd','onentra-prd','recommendation-review','delivery-review']:
        page.set_viewport_size({'width':1440,'height':900})
        page.goto(BASE+'#documents',wait_until='domcontentloaded')
        page.locator('.decision-link[href="documents/'+slug+'/"]').click()
        expect(page).to_have_url(BASE+'documents/'+slug+'/')
        assert len(page.locator('.reading-content').inner_text())>2500
        links=page.locator('.reader-contents nav a')
        for index in [0,2,links.count()-1]:
            link=links.nth(index);target=link.get_attribute('href');link.click()
            page.wait_for_function('selector => {const y=document.querySelector(selector).getBoundingClientRect().top; return y>=70 && y<180}',arg=target)
            top=page.locator(target).bounding_box()['y']
            assert 70<=top<180,(slug,target,top)
        for w,h in [(1440,900),(390,844)]:
            page.set_viewport_size({'width':w,'height':h})
            page.locator('.reading-content section').nth(2).evaluate('e=>e.scrollIntoView({behavior:"instant"})')
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(slug,w)
            assert page.locator('.reading-content tbody td').evaluate_all('cells=>cells.every(c=>c.dataset.label)'),slug
            if w==390:
                assert page.locator('.reading-content tbody td').evaluate_all('cells=>cells.every(c=>c.getBoundingClientRect().right<=innerWidth)'),slug
            page.screenshot(path=OUT/f'{slug}-body-{w}.png')
        page.evaluate('window.didPrint=false;window.print=()=>window.didPrint=true')
        page.locator('.print-document').click();assert page.evaluate('window.didPrint')
        assert page.locator('.reading-content a[href^="https://"]').count()>=2
    assert not errors,errors
    (OUT/'reading-regression.json').write_text(json.dumps({'live':LIVE,'scroll':result,'errors':errors},ensure_ascii=False,indent=2))
    print('PASS: four long-form documents, source links, anchor navigation, mobile layout and print',flush=True)
    browser.close()
