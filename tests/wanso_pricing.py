"""Visible Wanso offer, recommendation and city-stat regression.

Use PORTFOLIO_URL to select another running preview. No live delivery-platform
or model calls are made; this checks the local illustrative catalog.
"""
import json
import os
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'work' / 'wanso-pricing'
OUT.mkdir(parents=True, exist_ok=True)
BASE = os.getenv('PORTFOLIO_URL', 'http://127.0.0.1:8765/').rstrip('/') + '/'
checks = []


def shot(page, name):
    page.screenshot(path=str(OUT / (name + '.png')))


def visit(page, route):
    page.evaluate('(route) => { location.hash = route; }', route)
    expect(page.locator('.ios-page-' + route)).to_be_visible()


def amount(page, label):
    row = page.locator('.wanso-sheet .sheet-details > div').filter(
        has=page.get_by_text(label, exact=True))
    return int(''.join(c for c in row.locator('dd').inner_text() if c.isdigit()))


def send(page, prompt, count):
    page.get_by_role('textbox', name='Hỏi tiếp', exact=True).fill(prompt)
    page.get_by_role('button', name='Gửi câu hỏi', exact=True).click()
    expect(page.locator('.rich-chat .ios-chat-reply')).to_have_count(count, timeout=15000)
    expect(page.locator('.rich-chat .rich-processing')).to_have_count(0)


with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    context = browser.new_context(viewport={'width': 1440, 'height': 1000},
                                  locale='vi-VN', reduced_motion='reduce')
    page = context.new_page()
    errors, failed = [], []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('response', lambda response: failed.append(f'{response.status} {response.url}') if response.status >= 400 else None)
    page.goto(BASE + 'prototypes/wanso/?qa=pricing#explore', wait_until='networkidle')
    stats = page.locator('.ios-stat-values dd')
    expect(stats).to_have_text(['12.480', '10.899', '4.712'])
    shot(page, 'hanoi-stats')
    page.get_by_role('button', name='Chọn vị trí', exact=True).click()
    sheet = page.locator('.wanso-sheet')
    sheet.locator('.location-city[data-city="hcm"]').click()
    sheet.get_by_role('button',name='Xác nhận vị trí',exact=True).click()
    expect(stats).to_have_text(['12.480', '10.939', '4.705'])
    shot(page, 'hcm-stats')
    page.get_by_role('button', name='Chọn vị trí', exact=True).click()
    sheet.locator('.location-city[data-city="hanoi"]').click()
    sheet.get_by_role('button',name='Xác nhận vị trí',exact=True).click()
    expect(stats).to_have_text(['12.480', '10.899', '4.712'])
    checks.append('City switching renders 12,480/10,899/4,712 in Hanoi and 12,480/10,939/4,705 in HCM from current single-portion offers')

    # The pricing fixture starts a fresh visit; cross-page image avoidance is covered separately.
    page.goto(BASE + 'prototypes/wanso/?qa=pricing-home#home', wait_until='networkidle')
    first = page.locator('.rich-home-card[data-store-id="demo-1"]')
    expect(first.locator('.rich-delivery')).to_contain_text('Miễn phí giao hàng')
    first.click()
    detail = page.locator('.native-store-view')
    expect(detail).to_have_attribute('data-store-id', 'demo-1')
    expect(detail.locator('[data-platform="grab"] .native-store-platform-total strong')).to_have_text('53.100đ')
    expect(detail.locator('[data-platform="shopee"] .native-store-platform-total strong')).to_have_text('51.850đ')
    expect(detail.locator('.native-store-verdict strong')).to_have_text('ShopeeFood tiết kiệm 1.250đ')
    difference = detail.locator('.native-store-saving-breakdown')
    for text in ['53.100đ', '+2.000đ', '+5.900đ', '−1.150đ', '−8.000đ', '51.850đ']:
        expect(difference).to_contain_text(text)
    grab_rules = detail.locator('.native-store-offer-rules[data-platform="grab"]')
    grab_rules.locator('summary').click()
    expect(grab_rules).to_contain_text('Mã ưu đãi nhóm: còn thiếu 21.900đ')
    expect(grab_rules).to_contain_text('Cần thêm 6.900đ tiền món sau giảm của quán để dùng ưu đãi giao hàng')
    shot(page, 'one-portion-rules')
    detail.get_by_role('button', name='Đặt ngay · GrabFood', exact=True).click()
    assert amount(page, 'Tổng cộng') == 53100
    assert amount(page, 'Mã nền tảng') == 8000
    assert amount(page, 'Quán giảm') == 5900
    assert amount(page, 'Giảm phí giao') == 0
    expect(sheet.locator('.sheet-details')).to_contain_text('53.100đ')
    assert ',' not in sheet.locator('.sheet-details').inner_text()
    sheet.get_by_role('button', name='Chuyển sang ShopeeFood', exact=True).click()
    assert amount(page, 'Tổng cộng') == 51850
    assert amount(page, 'Mã nền tảng') == 9150
    assert amount(page, 'Giảm phí giao') == 10000
    sheet.get_by_role('button', name='Về thực đơn', exact=True).click()
    detail.get_by_role('button', name='Quay lại', exact=True).click()
    checks.append('One portion: exact 53,100/51,850 totals, 1,250 difference decomposition and coupon gaps visible in detail and checkout')

    prompt = 'Muốn ăn phở gà nóng, không rau mùi, ngân sách 80.000đ đã gồm giao hàng. Gợi ý 5 quán.'
    page.get_by_role('textbox', name='Nhập yêu cầu món ăn', exact=True).fill(prompt)
    page.get_by_role('button', name='Tìm kiếm', exact=True).click()
    replies = page.locator('.rich-chat .ios-chat-reply')
    expect(replies).to_have_count(3, timeout=15000)
    for index in range(3):
        reply = replies.nth(index)
        expect(reply.locator('.rich-recommendation')).to_have_count(5)
        text = reply.locator('.ios-assistant-message').inner_text()
        assert len(text) > 500, (index, len(text))
        assert '。；' not in text and '。。' not in text and '..' not in text and '.;' not in text, text
        ids = reply.locator('.rich-recommendation').evaluate_all('(cards) => cards.map(c => c.dataset.storeId)')
        kinds = page.evaluate('(ids) => ids.map(id => window.wansoCatalog.find(s => s.id === id).key)', ids)
        assert all(kind == 'pho' for kind in kinds), kinds
        visuals = page.evaluate('(ids)=>ids.map(id=>{const s=window.wansoCatalog.find(s=>s.id===id);return {image:s.image,brand:s.name.split(" · ")[0]}})', ids)
        assert len({v['image'] for v in visuals}) == 5 and len({v['brand'] for v in visuals}) == 5, visuals
        reply.locator('.rich-answer-heading').first.scroll_into_view_if_needed()
        shot(page, 'reply-' + str(index + 1))
    expect(replies.nth(1).locator('.ios-assistant-message')).to_contain_text('Mỗi đơn chọn một mã nền tảng có lợi nhất')
    expect(replies.nth(2).locator('.ios-assistant-message')).to_contain_text('không rau mùi')
    checks.append('All three substantive replies render five exact pho matches, clear coupon logic and retained no-cilantro preference')

    send(page, 'Đổi thành hai người, tổng ngân sách 150.000đ đã gồm giao hàng, vẫn chọn phở gà nóng.', 4)
    last = replies.last
    cards = last.locator('.rich-recommendation')
    expect(cards).to_have_count(5)
    target = cards.first
    identifier = target.get_attribute('data-store-id')
    expected = page.evaluate('(id)=>window.wansoOffers.summary(window.wansoCatalog.find(s=>s.id===id),"grab",2)', identifier)
    expect(target.locator('.rich-total-label')).to_contain_text('2 phần')
    target.locator('.rich-offer[data-platform="grab"]').click()
    assert amount(page, 'Số phần') == 2
    assert amount(page, 'Quán giảm') == expected['merchantDiscount']
    assert amount(page, 'Mã nền tảng') == expected['couponDiscount']
    assert amount(page, 'Giảm phí giao') == expected['deliveryDiscount']
    assert amount(page, 'Tổng cộng') == expected['total']
    expect(sheet.locator('.sheet-details')).to_contain_text(f"{expected['total']:,}".replace(',', '.')+'đ')
    shot(page, 'two-portion-checkout')
    sheet.get_by_role('button', name='Đóng', exact=True).click()
    checks.append('Two-person follow-up recalculates applicable merchant discount, coupon and shared delivery for the selected recommendation')

    send(page, 'Đổi sang bún gà, vẫn hai người, ngân sách 150.000đ.', 5)
    ids = replies.last.locator('.rich-recommendation').evaluate_all('(cards) => cards.map(c => c.dataset.storeId)')
    kinds = page.evaluate('(ids) => ids.map(id => window.wansoCatalog.find(s => s.id === id).key)', ids)
    assert len(kinds) == 5 and all(kind == 'bun' for kind in kinds), kinds
    send(page, 'Đổi sang món chay, không ăn thịt gà, không dùng món nước, ngân sách 150.000đ.', 6)
    ids = replies.last.locator('.rich-recommendation').evaluate_all('(cards) => cards.map(c => c.dataset.storeId)')
    stores = page.evaluate('(ids) => ids.map(id => window.wansoCatalog.find(s => s.id === id))', ids)
    assert len(stores) == 5 and all(s['vegetarian'] and s['key'] == 'veggie' for s in stores), stores
    checks.append('Follow-ups switch strictly from pho to bun, then vegetarian while retaining two-person budget')
    assert not errors, errors
    assert not failed, failed
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
    checks.append('No JavaScript errors, failed network responses or document overflow')
    context.close()
    browser.close()

result = {'passed': len(checks), 'checks': checks, 'screenshots': str(OUT)}
(OUT / 'checks.json').write_text(json.dumps(result, ensure_ascii=False, indent=2))
print(json.dumps(result, ensure_ascii=False, indent=2))
