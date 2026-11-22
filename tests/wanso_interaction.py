"""Visitor journeys in the real phone app. Run on the portfolio's local HTTP server.
The regular run uses a controlled API reply for deterministic error/retry checks.
--live additionally sends one request to the deployed model service.
"""
import json
import os
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = os.getenv('PORTFOLIO_URL', 'http://127.0.0.1:8765/').rstrip('/') + '/'
ROOT = Path(__file__).resolve().parents[1]
CATALOG = json.loads((ROOT/'demos/wanso/catalog.json').read_text())
checks = []
with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    ctx = browser.new_context(viewport={'width':1440,'height':1000})
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(BASE)
    for selector in ['.device-project','.device-title','.device-controls','.device-surface','.device-footer']:
        y = page.locator(selector).evaluate_all('(els)=>els.map(e=>e.getBoundingClientRect().top)')
        assert abs(y[0]-y[1]) < 1, (selector,y)
    assert page.locator('.computer-project').evaluate('e=>getComputedStyle(e).position') != 'sticky'
    assert 'blur' in page.locator('.phone-project').evaluate('e=>getComputedStyle(e).backdropFilter')
    assert page.locator('.intro-note>p').evaluate('e=>parseFloat(getComputedStyle(e).fontSize)') >= 18
    checks.append('aligned card, heading, controls and screen tops; visible blur and larger body text')

    # The original-page showcase and real-input model client have separate entries.
    page.goto(BASE+'demos/wanso/?embed=1#home')
    phone = page
    expect(phone.locator('.welcome h1')).to_contain_text('今天')
    def navigate(view):
        page.evaluate('(view)=>window.postMessage({type:"portfolio-show-frame",frame:view},location.origin)',view)
        page.wait_for_function('view=>location.hash==="#"+view',arg=view)

    # Restaurant menus, quantity and a persistent favourite.
    phone.locator('.merchant').first.click()
    expect(phone.locator('#sheet')).to_be_visible()
    phone.locator('.menu-row').first.click()
    expect(phone.locator('.receipt h3')).to_contain_text('Combo')
    phone.locator('[data-quantity="1"]').click()
    expect(phone.locator('.receipt .sum')).to_contain_text('80.000')
    phone.locator('#sheet [data-save]').click()
    expect(phone.locator('#sheet [data-save]')).to_have_attribute('aria-pressed','true')
    phone.locator('#close').click()
    phone.locator('[data-nav="saved"]').click()
    expect(phone.locator('.choice')).to_have_count(1)
    checks.append('menu → portion change → favourite → saved page')

    # Same meal and quantity, editable final fees, with discount clamped at zero.
    navigate('compare')
    expect(phone.locator('.native-price-table tbody tr')).to_have_count(8)
    phone.locator('[data-edit-reference]').first.click()
    phone.locator('[name="grabPrice"]').fill('50000')
    phone.locator('[name="shopeePrice"]').fill('50000')
    phone.locator('[name="grabFee"]').fill('12000')
    phone.locator('[name="shopeeFee"]').fill('15000')
    phone.locator('[name="shopeeOff"]').fill('10000')
    expect(phone.locator('#grab-total')).to_have_text('62.000 ₫')
    expect(phone.locator('#shopee-total')).to_have_text('55.000 ₫')
    expect(phone.locator('#compare-result strong')).to_contain_text('ShopeeFood 少 7.000 ₫')
    phone.locator('[data-compare-step="1"]').click()
    expect(phone.locator('#grab-total')).to_have_text('112.000 ₫')
    expect(phone.locator('#shopee-total')).to_have_text('105.000 ₫')
    phone.locator('[name="shopeeOff"]').fill('999999')
    expect(phone.locator('#shopee-total')).to_have_text('0 ₫')
    phone.locator('[name="shopeeOff"]').fill('-5')
    phone.locator('[name="grabFee"]').focus()
    expect(phone.locator('[name="shopeeOff"]')).to_have_value('0')
    checks.append('comparison uses both editable prices, common quantity, fees and discounts; no negative totals')

    navigate('profile')
    phone.locator('[data-add-taste]').click()
    phone.locator('[data-pref="0"]').click()
    phone.locator('#close').click()
    phone.locator('[data-order-settings]').click()
    phone.locator('[name="budget"][value="50000"]').check()
    phone.locator('[name="sort"][value="price"]').check()
    phone.locator('#order-settings .send').click()
    navigate('explore')
    phone.locator('[data-nav="recommend"]').first.click()
    expect(phone.locator('#menu-budget')).to_have_value('50000')
    prices = phone.locator('.choice-foot strong').all_text_contents()
    values = [int(v.replace('.','').split()[0]) for v in prices]
    assert values and values == sorted(values) and max(values) <= 50000
    phone.locator('#menu-search').fill('no-such-dish')
    expect(phone.locator('.empty h2')).to_contain_text('暂未找到')
    phone.locator('[data-reset-filter]').click()
    expect(phone.locator('.choice')).to_have_count(27)
    checks.append('saved budget and sorting drive menu search; empty filter recovers')

    navigate('profile')
    phone.locator('[data-profile-edit]').click()
    phone.locator('[name="name"]').fill('蓝色体验者')
    phone.locator('#profile-edit .send').click()
    expect(phone.locator('.profile-identity h2')).to_have_text('蓝色体验者')
    phone.locator('[data-app-settings]').click()
    phone.locator('[name="theme"][value="paper"]').check()
    phone.locator('#app-settings .send').click()
    expect(phone.locator('html')).to_have_attribute('data-theme','paper')
    page.reload()
    navigate('profile')
    expect(phone.locator('.profile-identity h2')).to_have_text('蓝色体验者')
    expect(phone.locator('[data-pref="0"]')).to_have_attribute('aria-pressed','true')
    expect(phone.locator('html')).to_have_attribute('data-theme','paper')
    checks.append('profile, taste and theme survive reload')
    phone.locator('[data-add-taste]').click()
    phone.locator('[name="taste"]').fill('不吃洋葱')
    phone.locator('#taste-custom .send').click()
    expect(phone.locator('#screen .preferences')).to_contain_text('不吃洋葱')
    phone.locator('[data-notifications]').click()
    phone.locator('[name="ready"]').uncheck()
    phone.locator('#notification-settings .send').click()
    phone.locator('[data-notifications]').click()
    expect(phone.locator('[name="ready"]')).not_to_be_checked()
    phone.locator('#close').click()
    checks.append('custom taste and original-profile notification settings save correctly')


    # Test form submission within the sandbox, preserving preferences and the actual API contract.
    requests = []
    item = next(x for x in CATALOG['items'] if x['id']=='mcd-2')
    def reply(route):
        body = route.request.post_data_json
        requests.append(body)
        route.fulfill(status=200,content_type='application/json',body=json.dumps({'answer':'按你的预算，可以查看牛肉汉堡套餐；价格来自历史菜单。','picks':[{**item,'reason':'40,000 越南盾，不含鸡肉。'}],'followups':['再看看其他牛肉餐品']},ensure_ascii=False))
    page.route('**/api/wanso',reply)
    navigate('home')
    phone.locator('#ask textarea').fill('午餐想吃牛肉，不吃鸡肉')
    phone.locator('#ask .send').click()
    expect(phone.locator('.assistant-message')).to_have_count(1)
    assert requests[0]['city']=='hcm'
    assert '不吃鸡肉' in requests[0]['messages'][-1]['content']
    assert '50.000' in requests[0]['messages'][-1]['content']
    phone.locator('.followups button').first.click()
    expect(phone.locator('.assistant-message')).to_have_count(2)
    assert requests[-1]['messages'][-2]['role']=='assistant'
    phone.locator('#history').click()
    expect(phone.locator('.history-list article')).to_have_count(1)
    phone.locator('[data-history]').click()
    expect(phone.locator('.assistant-message')).to_have_count(2)
    phone.locator('#history').click()
    phone.locator('[data-delete-history]').click()
    expect(phone.locator('#sheet-body')).to_contain_text('不可恢复')
    phone.locator('[data-dismiss]').click()
    expect(phone.locator('.history-list article')).to_have_count(1)
    phone.locator('[data-delete-history]').click()
    phone.locator('[data-confirm-history]').click()
    expect(phone.locator('.history-list article')).to_have_count(0)
    checks.append('sandboxed chat posts input + preferences; follow-up, history restore, cancel/confirm deletion')

    page.unroute('**/api/wanso')
    page.route('**/api/wanso',lambda route:route.fulfill(status=503,content_type='application/json',body='{"error":"unavailable"}'))
    navigate('home')
    phone.locator('#ask textarea').fill('保留我的问题')
    phone.locator('#ask .send').click()
    expect(phone.locator('#chat-error')).to_contain_text('请重试')
    expect(phone.locator('#ask textarea')).to_have_value('保留我的问题')
    page.unroute('**/api/wanso')
    page.route('**/api/wanso',reply)
    phone.locator('[data-retry]').click()
    expect(phone.locator('.assistant-message')).to_have_count(1)
    expect(phone.locator('.user-message')).to_have_count(1)
    checks.append('API failure retains input; retry does not duplicate the question')

    # A visitor may open the model client separately and keep their saved preferences.
    other=ctx.new_page()
    other.goto(BASE+'demos/wanso/?embed=1#profile')
    expect(other.locator('.profile-identity h2')).to_have_text('蓝色体验者')
    other.locator('[data-app-settings]').click()
    other.locator('#close').focus()
    other.keyboard.press('Escape')
    expect(other.locator('#sheet')).not_to_be_visible()
    other.close()
    checks.append('separate model-client tab shares local preferences; Escape closes settings')

    for width,height in [(1440,900),(1024,768),(768,1024),(390,844),(320,640)]:
        page.set_viewport_size({'width':width,'height':height})
        for view in ['home','explore','saved','profile']:
            navigate(view)
            assert not phone.locator('html').evaluate('e=>e.scrollWidth>innerWidth+1')
            nav=phone.locator('.tabbar').bounding_box()
            assert nav['y']+nav['height']<=height+1
    checks.append('model client: five widths, four nav pages, pinned navigation, no overflow')

    if '--live' in sys.argv:
        live_context=browser.new_context(viewport={'width':390,'height':844})
        live=live_context.new_page()
        live.goto(os.getenv('WANSO_LIVE_URL','https://jaredwangx.github.io/pm-portfolio/demos/wanso/?embed=1#home'))
        live.locator('#ask textarea').fill('午餐一个人，餐费不超过60000越南盾，不吃鸡肉，给我一个牛肉汉堡选择。')
        with live.expect_response(lambda r: r.url.endswith('/api/wanso') and r.request.method=='POST',timeout=80000) as received:
            live.locator('#ask .send').click()
        assert received.value.ok
        result=received.value.json()
        expect(live.locator('.assistant-message').last).to_be_visible(timeout=80000)
        assert live.locator('.assistant-message .answer').last.inner_text()==result['answer']
        assert live.locator('.assistant-message .answer').last.inner_text().strip()
        assert live.locator('.assistant-message .choice').count()>0
        checks.append('LIVE: deployed Qwen returned a real answer and a catalog-validated food choice')
        print('LIVE_ANSWER:',live.locator('.assistant-message .answer').last.inner_text()[:500])
    assert not errors,errors
    browser.close()
print(json.dumps({'passed':checks,'page_errors':errors},ensure_ascii=False,indent=2))
