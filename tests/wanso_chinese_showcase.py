"""Chinese portfolio presentation preserves routes, prices and the Vietnamese default."""
import json
import os
import re
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
BASE = os.getenv('PORTFOLIO_URL', 'http://127.0.0.1:8765/').rstrip('/') + '/'
FRAMES = json.loads((ROOT / 'prototypes/wanso/screens.json').read_text())['frames']
OUT = ROOT / 'work' / 'chinese-showcase-qa'
OUT.mkdir(parents=True, exist_ok=True)
COMMON_VI = re.compile(r'Đang tải|Gợi ý cho bạn|Phí giao hàng|Tổng cộng|Xem thực đơn|'
                       r'Lưu thay đổi|Thông báo|Đăng xuất|Tìm kiếm quán|Vuốt ngang để xem')
AMOUNTS = '''() => wansoCatalog.slice(0,30).map(s => ({
  id:s.id, offers:['grab','shopee'].map(k => [1,2,3].map(q => {
    const o=wansoOffers.summary(s,k,q);
    return [o.subtotal,o.merchantDiscount,o.couponDiscount,o.deliveryDiscount,o.total];
  }))
}))'''

with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    reference = browser.new_page()
    reference.goto(BASE + 'prototypes/wanso/?embed=1&device=1#home', wait_until='networkidle')
    expect(reference.locator('html')).to_have_attribute('lang', 'vi')
    amounts = reference.evaluate(AMOUNTS)
    assert not re.search(r'[\u3400-\u9fff]', reference.locator('.screen').inner_text())
    reference.close()

    route_text = {}
    for width, height in [(1440,900),(390,844),(320,740)]:
        page = browser.new_page(viewport={'width':width,'height':height}, reduced_motion='reduce')
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(BASE + 'prototypes/wanso/?embed=1&device=1&lang=zh#home', wait_until='networkidle')
        expect(page.locator('html')).to_have_attribute('lang', re.compile('zh'))
        assert 'lang=zh' in page.locator('.expand').get_attribute('href')
        assert page.evaluate(AMOUNTS) == amounts, 'Language must not change settlement amounts'
        for frame in FRAMES:
            page.evaluate('(id)=>location.hash=id', frame['id'])
            title = page.evaluate('(s)=>window.wansoI18n.text(s)', frame['title'])
            expect(page.locator('.page-title')).to_have_text(title)
            expect(page.locator('.load-error')).not_to_be_visible()
            content = page.locator('.screen').inner_text()
            assert len(re.findall(r'[\u3400-\u9fff]', content)) >= 10, (frame['id'], content)
            assert not COMMON_VI.search(content), (frame['id'], content)
            assert '本单省 hơn' not in content, frame['id']
            assert 'undefined' not in content and 'NaN' not in content, frame['id']
            assert page.locator('.screen').evaluate('(e)=>e.scrollWidth<=e.clientWidth+2'), frame['id']
            if frame['id'] == 'explore':
                expect(page.locator('.ios-explore-stats')).to_contain_text('12,480')
            if width == 390:
                route_text[frame['id']] = content
                if frame['id'] in ['home','recommend','store-first','compare','explore','profile']:
                    page.locator('.screen').screenshot(path=str(OUT / ('zh-' + frame['id'] + '.png')))
        assert not errors, errors
        page.close()
    (OUT / 'route-text.json').write_text(json.dumps(route_text,ensure_ascii=False,indent=2))
    browser.close()
print('PASS: Chinese routes at 3 widths, unchanged settlement math and Vietnamese default')
