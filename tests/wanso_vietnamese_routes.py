"""Every phone route renders localized live content without raster-text leftovers."""
import json, os, re
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
BASE=os.getenv('PORTFOLIO_URL','http://127.0.0.1:8765/').rstrip('/')+'/'
frames=json.loads((ROOT/'prototypes/wanso/screens.json').read_text())['frames']
with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True)
    for width in [1440,390,320]:
        page=browser.new_page(viewport={'width':width,'height':900},reduced_motion='reduce')
        errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(BASE+'prototypes/wanso/?embed=1',wait_until='networkidle')
        for frame in frames:
            page.evaluate('(id)=>location.hash=id',frame['id'])
            expect(page.locator('.page-title')).to_have_text(frame['title'])
            expect(page.locator('.load-error')).not_to_be_visible()
            text=page.locator('.screen').inner_text()
            assert len(text)>40,frame['id']
            assert not re.search(r'[\u3400-\u9fff]',text),(frame['id'],text)
            assert 'undefined' not in text and 'NaN' not in text,frame['id']
            expect(page.locator('.original-screen')).to_have_attribute('src',re.compile(r'phone-shell\.svg'))
            assert page.locator('.screen').evaluate('(e)=>e.scrollWidth<=e.clientWidth+2'),frame['id']
        assert not errors,errors
        page.close()
    browser.close()
print('PASS: all 22 phone routes at desktop, 390px and 320px; live Vietnamese content, no raster Chinese, no errors')
