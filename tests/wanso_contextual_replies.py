"""Contextual recommendation replies preserve facts without replaying photograph rails.

Exercises the actual composer in both languages: discover → compare the same
restaurant → decide; fresh discovery, ranking, quantity changes and exclusions.
Run with PORTFOLIO_URL pointing at the portfolio preview (default :8765).
"""
import json
import os
import re
from hashlib import sha256
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
BASE = os.getenv('PORTFOLIO_URL', 'http://127.0.0.1:8765/').rstrip('/') + '/'
OUT = ROOT / 'work/wanso-contextual-replies'
OUT.mkdir(parents=True, exist_ok=True)
checks = []


def reply_ids(reply):
    return reply.locator('.rich-recommendation').evaluate_all('(cards)=>cards.map(c=>c.dataset.storeId)')


def stores_for(page, ids):
    return page.evaluate('(ids)=>ids.map(id=>window.wansoControls.storeFor(id))', ids)


def image_identity(page, reply):
    stores = stores_for(page, reply_ids(reply))
    scenes = [store.get('imageScene') or store['image'] for store in stores]
    hashes = [sha256((ROOT / 'prototypes/wanso' / store['image']).resolve().read_bytes()).hexdigest() for store in stores]
    assert len(scenes) == len(set(scenes)), 'One discovery rail repeats a photographic scene'
    assert len(hashes) == len(set(hashes)), 'Different image URLs contain duplicate image files'
    return set(scenes), set(hashes)


def send(page, prompt):
    replies = page.locator('.rich-chat .ios-chat-reply')
    count = replies.count()
    page.locator('.ios-composer textarea').fill(prompt)
    page.locator('.ios-composer .ios-send').click()
    expect(replies).to_have_count(count + 1, timeout=15000)
    expect(page.locator('.rich-processing')).to_have_count(0)
    return replies.last


def money_number(text):
    return int(re.sub(r'[^0-9]', '', text))


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    for lang in ['zh', 'vi']:
        context = browser.new_context(viewport={'width': 390, 'height': 844}, reduced_motion='reduce')
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(BASE + f'prototypes/wanso/?embed=1&device=1&lang={lang}#home', wait_until='networkidle')
        home_ids = page.locator('.rich-home-card').evaluate_all('(cards)=>cards.map(c=>c.dataset.storeId)')
        home_stores = stores_for(page, home_ids)
        seen_scenes = {s.get('imageScene') or s['image'] for s in home_stores}
        seen_hashes = {sha256((ROOT / 'prototypes/wanso' / s['image']).resolve().read_bytes()).hexdigest() for s in home_stores}
        prompt = ('想吃鸡肉热汤河粉，不吃香菜，含配送总预算80000đ，推荐五家。' if lang == 'zh'
                  else 'Muốn ăn phở gà nước nóng, không rau mùi, tổng ngân sách 80.000đ cả ship, gợi ý 5 quán.')
        page.locator('.native-home-query').fill(prompt)
        page.locator('.ios-home-search-submit').click()
        replies = page.locator('.rich-chat .ios-chat-reply')
        expect(replies).to_have_count(3, timeout=15000)
        assert replies.evaluate_all('(items)=>items.map(e=>e.dataset.kind)') == ['discover', 'compare', 'decision']
        first = replies.first
        ids = reply_ids(first)
        assert len(ids) == 5 and len(set(ids)) == 5
        initial_stores = stores_for(page, ids)
        assert all(s['key'] == 'pho' for s in initial_stores)
        first_scenes, first_hashes = image_identity(page, first)
        assert not first_scenes & seen_scenes, 'Initial recommendations reused a photograph from the home page'
        assert not first_hashes & seen_hashes
        seen_scenes |= first_scenes
        seen_hashes |= first_hashes
        expect(replies.nth(1).locator('.reply-comparison')).to_have_count(1)
        expect(replies.nth(1).locator('.reply-platform')).to_have_count(2)
        expect(replies.nth(2).locator('.reply-decision')).to_have_count(1)
        for index in [1, 2]:
            expect(replies.nth(index).locator('img')).to_have_count(0)
            expect(replies.nth(index).locator('.rich-chat-rail')).to_have_count(0)
        checks.append(f'{lang}: initial answers use discovery, same-store comparison, then decision without repeated photographs')

        # Explicit ordinal and changed quantity must resolve the previous rail's
        # second restaurant, even though the seeded decision selected another.
        comparison = send(page, '比较第2家同一家店两个平台，两份，总预算150000đ，仍然不要香菜。' if lang == 'zh'
                          else 'So sánh quán thứ hai trên hai nền tảng, 2 phần, tổng ngân sách 150.000đ, vẫn không rau mùi.')
        expect(comparison).to_have_attribute('data-kind', 'compare')
        card = comparison.locator('.reply-comparison')
        expect(card).to_have_attribute('data-store-id', ids[1])
        expect(card).to_have_attribute('data-quantity', '2')
        expect(card.locator('img')).to_have_count(0)
        card.locator('.reply-ledger-toggle').click()
        for column, platform in enumerate(['grab', 'shopee']):
            expected = page.evaluate('([id,key])=>window.wansoOffers.calculate(window.wansoControls.storeFor(id),key,2)', [ids[1], platform])
            offer = card.locator(f'.reply-platform[data-platform="{platform}"]')
            shown = money_number(offer.locator('.reply-platform-total').inner_text())
            assert shown == expected['total'], (platform, shown, expected['total'])
            assert expected['total'] == expected['price'] - expected['merchantDiscount'] - expected['couponDiscount'] + expected['originalFee'] - expected['deliveryDiscount']
            ledger = {field: money_number(card.locator(f'tr[data-field="{field}"] td').nth(column).inner_text())
                      for field in ['price', 'merchantDiscount', 'couponDiscount', 'originalFee', 'deliveryDiscount', 'total']}
            assert ledger == {field: expected[field] for field in ledger}
            assert ledger['total'] == ledger['price'] - ledger['merchantDiscount'] - ledger['couponDiscount'] + ledger['originalFee'] - ledger['deliveryDiscount']
        card.locator('.reply-ledger-toggle').click()
        note = comparison.inner_text().lower()
        assert ('香菜' in note if lang == 'zh' else 'rau mùi' in note), note
        card.scroll_into_view_if_needed()
        page.locator('.screen').screenshot(path=str(OUT / f'{lang}-same-store-two-portions.png'))
        checks.append(f'{lang}: second restaurant keeps its identity; both platform totals recalculate for two portions with prior dietary note')

        # An explicit store name should resolve exactly, rather than performing
        # fresh recommendation selection behind a comparison request.
        named = send(page, (f'比较 {initial_stores[3]["name"]} 这家两个平台的价格，两份。' if lang == 'zh'
                            else f'So sánh hai nền tảng của {initial_stores[3]["name"]}, 2 phần.'))
        expect(named).to_have_attribute('data-kind', 'compare')
        expect(named.locator('.reply-comparison')).to_have_attribute('data-store-id', ids[3])
        checks.append(f'{lang}: explicit restaurant name resolves the existing recommendation')

        ranking = send(page, '刚才这些店哪家最便宜？' if lang == 'zh' else 'Trong các quán vừa gợi ý, quán nào rẻ nhất?')
        expect(ranking).to_have_attribute('data-kind', 'ranking')
        expect(ranking.locator('.reply-ranking')).to_have_count(1)
        expect(ranking.locator('img')).to_have_count(0)
        rows = ranking.locator('.reply-ranking-row')
        ranked_ids = rows.evaluate_all('(rows)=>rows.map(row=>row.dataset.storeId)')
        assert set(ranked_ids) == set(ids), 'Cross-store ranking silently replaced the candidate list'
        ranked_totals = rows.evaluate_all('(rows)=>rows.map(row=>Number(row.dataset.total))')
        assert ranked_totals == sorted(ranked_totals)
        checks.append(f'{lang}: cross-restaurant price question uses compact ranking rather than repeating photos')

        # Mixed intents contain words such as "compare" and "cheapest", but an
        # explicit request for different restaurants must still discover new ones.
        for prompt in (['换5家鸡肉热汤河粉，仍然两份，总预算150000đ，比较优惠后推荐最便宜的。', '再推荐其他五家鸡肉热汤河粉，还是两份，预算150000đ。'] if lang == 'zh'
                       else ['Gợi ý 5 quán phở gà khác cho 2 người, ngân sách 150.000đ, so sánh ưu đãi chọn quán rẻ nhất.', 'Đổi 5 quán phở gà khác, vẫn 2 phần, ngân sách 150.000đ.']):
            fresh = send(page, prompt)
            expect(fresh).to_have_attribute('data-kind', 'discover')
            eligible_scenes = set(page.evaluate('''()=>window.wansoNative.catalogForLocation()
                .filter(s=>s.key==='pho' && Math.min(...['grab','shopee'].map(k=>window.wansoOffers.summary(s,k,2).total))<=150000)
                .map(s=>s.imageScene||s.image)'''))
            assert len(reply_ids(fresh)) == min(5, len(eligible_scenes - seen_scenes)), 'Use remaining eligible scenes without recycling a photograph or changing the requested food'
            scenes, hashes = image_identity(page, fresh)
            assert not scenes & seen_scenes, 'New recommendation round reused a scene already shown in this conversation'
            assert not hashes & seen_hashes, 'New recommendation round reused an image file already shown in this conversation'
            seen_scenes |= scenes
            seen_hashes |= hashes
        checks.append(f'{lang}: three discovery rounds avoid all {len(seen_scenes)} previously shown photo scenes/files, including home; fewer results preserve food constraints when the pool runs low')
        last_candidates = reply_ids(fresh)
        exhausted = send(page, '同样要求，再换5家鸡肉河粉，两份，预算150000đ。' if lang == 'zh'
                         else 'Cùng yêu cầu, đổi 5 quán phở gà khác, 2 phần, ngân sách 150.000đ.')
        expect(exhausted).to_have_attribute('data-kind', 'discover')
        expect(exhausted.locator('.rich-recommendation')).to_have_count(0)
        expect(exhausted.locator('img')).to_have_count(0)
        assert exhausted.inner_text().strip(), 'An exhausted photo pool needs a useful response'
        after_empty = send(page, '那就比较刚才第1家两个平台。' if lang == 'zh'
                           else 'Vậy so sánh quán thứ nhất vừa rồi trên hai nền tảng.')
        expect(after_empty).to_have_attribute('data-kind', 'compare')
        expect(after_empty.locator('.reply-comparison')).to_have_attribute('data-store-id', last_candidates[0])
        checks.append(f'{lang}: exhausted photos produce no duplicates; the preceding candidate list remains available for comparison')

        # Negative food changes must beat old positive food preferences. A later
        # budget change must preserve the vegetarian requirement.
        vegetarian = send(page, '换成素食，不吃鸡肉，不要汤，还是两份，预算150000đ，推荐五家。' if lang == 'zh'
                          else 'Đổi sang món chay, không ăn thịt gà, không dùng món nước, vẫn 2 phần, ngân sách 150.000đ, gợi ý 5 quán.')
        expect(vegetarian).to_have_attribute('data-kind', 'discover')
        selected = stores_for(page, reply_ids(vegetarian))
        assert len(selected) == 5 and all(s['vegetarian'] and s['key'] == 'veggie' for s in selected)
        narrowed = send(page, '保持刚才的素食要求，预算改为140000đ，再换五家。' if lang == 'zh'
                        else 'Vẫn giữ yêu cầu ăn chay, đổi 5 quán khác, ngân sách 140.000đ.')
        expect(narrowed).to_have_attribute('data-kind', 'discover')
        selected = stores_for(page, reply_ids(narrowed))
        assert selected and all(s['vegetarian'] and s['key'] == 'veggie' for s in selected)
        totals = page.evaluate('(ids)=>ids.map(id=>Math.min(...["grab","shopee"].map(key=>window.wansoOffers.summary(window.wansoControls.storeFor(id),key,2).total)))', reply_ids(narrowed))
        assert all(total <= 140000 for total in totals)
        checks.append(f'{lang}: negative chicken/soup constraints and updated two-portion budget stay effective')

        # Detail and sharing intentionally retain the photograph of this actual
        # restaurant. They must not be randomized to fake visual variation.
        chosen = first.locator('.rich-recommendation').first
        image = chosen.locator('img').get_attribute('data-image-source')
        chosen.locator('.ios-restaurant-main').click()
        detail = page.locator('.native-store-view')
        expect(detail).to_have_attribute('data-store-id', ids[0])
        expect(detail.locator('.native-store-hero>img')).to_have_attribute('data-image-source', image)
        detail.locator('.native-store-toolbar-actions .native-store-circle').first.click()
        expect(page.locator('.wanso-share-photo img')).to_have_attribute('data-image-source', image)
        page.locator('.sheet-close').click()
        detail.locator('.native-store-back').click()
        assert reply_ids(replies.first) == ids
        assert not errors, errors
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
        checks.append(f'{lang}: restaurant photo remains stable in detail, sharing and back navigation; no page errors or outer overflow')
        context.close()

    # Fresh conversations isolate referent and constraint changes from the large
    # photo-pool exercise above. Use UI-visible translated names, not catalog
    # names, since Chinese users paste the name they can actually read.
    context = browser.new_context(viewport={'width': 390, 'height': 844}, reduced_motion='reduce')
    page = context.new_page()
    page.goto(BASE + 'prototypes/wanso/?embed=1&device=1&lang=zh#recommend', wait_until='networkidle')
    replies = page.locator('.ios-chat-reply')
    expect(replies).to_have_count(3)
    original_ids = reply_ids(replies.first)
    visible_name = replies.first.locator('.ios-restaurant-name').nth(1).inner_text()
    named = send(page, f'比较 {visible_name} 这家两个平台的价格。')
    expect(named.locator('.reply-comparison')).to_have_attribute('data-store-id', original_ids[1])
    ranked = send(page, '刚才这些店哪家最便宜？')
    ranked_ids = ranked.locator('.reply-ranking-row').evaluate_all('(rows)=>rows.map(row=>row.dataset.storeId)')
    selected = send(page, '选择第2家。')
    expect(selected.locator('.reply-decision')).to_have_attribute('data-store-id', ranked_ids[1])
    checks.append('zh: a translated visible restaurant name resolves correctly; selecting second after ranking follows the displayed ranking order')

    over_budget = send(page, '预算只有40000đ，刚才这些店哪家最便宜？')
    expect(over_budget).to_have_attribute('data-kind', 'ranking')
    totals = over_budget.locator('.reply-ranking-row').evaluate_all('(rows)=>rows.map(row=>Number(row.dataset.total))')
    assert totals and all(total > 40000 for total in totals)
    expect(over_budget).to_contain_text('都超过')
    conflict = send(page, '不吃鸡肉，选第2家。')
    expect(conflict).to_have_attribute('data-kind', 'discover')
    expect(conflict).to_contain_text('不符合刚补充的饮食要求')
    expect(conflict.locator('.reply-decision,.reply-comparison')).to_have_count(0)
    assert all(s['key'] not in ['pho', 'bun', 'mixed', 'rice', 'banh'] for s in stores_for(page, reply_ids(conflict)))
    checks.append('zh: ranking discloses that every candidate exceeds the new budget; an ordinal choice cannot override a new no-chicken constraint')
    context.close()

    context = browser.new_context(viewport={'width': 320, 'height': 844}, reduced_motion='reduce')
    page = context.new_page()
    page.goto(BASE + 'prototypes/wanso/?embed=1&device=1&lang=vi#recommend', wait_until='networkidle')
    replies = page.locator('.ios-chat-reply')
    expect(replies).to_have_count(3)
    second_id = reply_ids(replies.first)[1]
    ordinal = send(page, 'Quán thứ hai rẻ nhất không?')
    expect(ordinal).to_have_attribute('data-kind', 'compare')
    expect(ordinal.locator('.reply-comparison')).to_have_attribute('data-store-id', second_id)
    expect(ordinal.locator('img')).to_have_count(0)
    assert ordinal.locator('.reply-comparison').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1')
    checks.append('vi: an ordinal price question compares that same restaurant; the comparison fits a 320px phone')
    context.close()
    browser.close()
print(json.dumps({'passed': len(checks), 'checks': checks}, ensure_ascii=False, indent=2))
