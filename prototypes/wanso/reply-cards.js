'use strict';

// Follow-up replies use the same settlement engine as the restaurant page.
// They deliberately omit covers: a price question should compare an order,
// rather than repeat the restaurant discovery carousel.
window.wansoReplyCards = (() => {
  const say = (zh, vi) => window.wansoI18n?.chinese ? zh : vi;
  const translated = value => window.wansoI18n?.text?.(String(value || '')) || String(value || '');
  const money = value => new Intl.NumberFormat(window.wansoI18n?.locale || 'vi-VN').format(value) + 'đ';
  function node(tag, className, text) {
    const result = document.createElement(tag);
    if (className) result.className = className;
    if (text !== undefined) result.textContent = text;
    return result;
  }
  function icon(name) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.7');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(svg.namespaceURI, 'path');
    path.setAttribute('d', {arrow:'M5 12h14m-5-5 5 5-5 5', share:'M12 15V3m-4 4 4-4 4 4M5 12v8h14v-8', check:'m5 12 4 4L19 6', chevron:'m8 5 7 7-7 7', compare:'M4 8h16m-4-4 4 4-4 4M20 16H4m4-4-4 4 4 4'}[name] || 'M5 12h14');
    svg.append(path);
    return svg;
  }
  function button(label, className, action, iconName = 'arrow') {
    const result = node('button', className);
    result.type = 'button';
    result.append(node('span', '', label), icon(iconName));
    result.addEventListener('click', action);
    return result;
  }
  const platformName = (key, offer) => offer.name || (key === 'grab' ? 'GrabFood' : key === 'shopee' ? 'ShopeeFood' : key);
  function offersFor(store, request) {
    return Object.keys(store.platforms || {}).map(key => ({key, offer:window.wansoNative.offerFor(store, key, request)}));
  }
  const rankedOffers = entries => [...entries].sort((a, b) => a.offer.total - b.offer.total);
  function dishLine(store, quantity) {
    return translated(store.dish) + ' · ' + say(`${quantity} 份`, `${quantity} phần`);
  }
  function storeHeader(card, store, quantity, label) {
    const header = node('header', 'reply-card-heading');
    const eyebrow = node('span', 'reply-card-eyebrow', label);
    header.append(eyebrow, node('h3', 'reply-store-name', translated(store.name)), node('p', 'reply-dish', dishLine(store, quantity)));
    card.append(header);
  }
  function platformTile(entry, best, tied) {
    const {key, offer} = entry;
    const tile = node('div', 'reply-platform' + (best ? ' is-best' : ''));
    tile.dataset.platform = key;
    tile.dataset.total = offer.total;
    tile.append(node('span', 'reply-platform-name', platformName(key, offer)), node('strong', 'reply-platform-total', money(offer.total)));
    const badge = node('span', 'reply-platform-note', best && !tied ? say('本单更省', 'Tiết kiệm hơn') : tied ? say('本单同价', 'Cùng tổng tiền') : say('含配送费', 'Đã gồm phí giao'));
    if (best && !tied) badge.prepend(icon('check'));
    tile.append(badge);
    return tile;
  }
  function differenceText(winner, other) {
    const changes = [
      [other.price - winner.price, say('菜品价格', 'Giá món'), false],
      [winner.merchantDiscount - other.merchantDiscount, say('店铺折扣', 'Ưu đãi từ quán'), true],
      [winner.couponDiscount - other.couponDiscount, say('平台券', 'Mã ưu đãi'), true],
      [other.netDeliveryFee - winner.netDeliveryFee, say('实付配送费', 'Phí giao thực trả'), false]
    ].filter(([amount]) => amount !== 0);
    if (!changes.length) return say('菜品、折扣和配送费都相同，可按常用平台选择。', 'Giá món, ưu đãi và phí giao giống nhau. Bạn có thể chọn nền tảng quen dùng.');
    return changes.map(([amount, label, reduction]) => {
      const direction = reduction ? say(amount > 0 ? '多减' : '少减', amount > 0 ? 'giảm thêm' : 'giảm ít hơn') : say(amount > 0 ? '少付' : '多付', amount > 0 ? 'thấp hơn' : 'cao hơn');
      return `${label}${say('', ' ')}${direction} ${money(Math.abs(amount))}`;
    }).join(say('；', '; ')) + say('。', '.');
  }
  function couponDescription(offer) {
    const coupon = offer.couponOptions?.find(item => item.selected);
    if (!coupon) return say('本单没有使用平台券。', 'Đơn này chưa áp dụng mã nền tảng.');
    const benefit = coupon.type === 'rate'
      ? say(`减 ${coupon.rateBps / 100}%，最多 ${money(coupon.cap)}`, `giảm ${coupon.rateBps / 100}%, tối đa ${money(coupon.cap)}`)
      : say(`减 ${money(coupon.amount)}`, `giảm ${money(coupon.amount)}`);
    return `${translated(coupon.name)} · ${say(`店铺折扣后满 ${money(coupon.minSpend)}，${benefit}`, `Tiền món sau giảm của quán từ ${money(coupon.minSpend)}: ${benefit}`)}`;
  }
  function ledger(entries) {
    const details = node('details', 'reply-ledger');
    const summary = node('summary', 'reply-ledger-toggle');
    summary.append(node('span', '', say('展开费用与用券明细', 'Xem chi tiết phí & mã giảm')), icon('chevron'));
    details.append(summary);
    const scroll = node('div', 'reply-ledger-body');
    const table = node('table', 'reply-ledger-table');
    const caption = node('caption', '', say('同一菜品与份数的费用明细', 'Chi phí cho cùng món và số phần'));
    table.append(caption);
    const head = node('thead');
    const headings = node('tr');
    headings.append(node('th', '', say('费用', 'Chi phí')));
    entries.forEach(({key, offer}) => { const th = node('th', '', platformName(key, offer)); th.scope = 'col'; headings.append(th); });
    head.append(headings);
    table.append(head);
    const body = node('tbody');
    [
      ['price', say('菜品小计', 'Tiền món'), false],
      ['merchantDiscount', say('店铺折扣', 'Giảm từ quán'), true],
      ['couponDiscount', say('平台优惠券', 'Mã ưu đãi'), true],
      ['originalFee', say('配送费', 'Phí giao'), false],
      ['deliveryDiscount', say('配送优惠', 'Giảm phí giao'), true],
      ['total', say('实付合计', 'Tổng cộng'), false]
    ].forEach(([key, label, reduction]) => {
      const tr = node('tr', key === 'total' ? 'reply-ledger-total' : '');
      tr.dataset.field = key;
      const th = node('th', '', label); th.scope = 'row'; tr.append(th);
      entries.forEach(({offer}) => {
        const value = offer[key];
        tr.append(node('td', reduction && value ? 'reply-reduction' : '', (reduction && value ? '−' : '') + money(value)));
      });
      body.append(tr);
    });
    table.append(body);
    scroll.append(table);
    const rules = node('div', 'reply-coupon-rules');
    entries.forEach(({key, offer}) => {
      const row = node('p');
      row.append(node('strong', '', platformName(key, offer)), node('span', '', couponDescription(offer)));
      rules.append(row);
    });
    rules.append(node('p', 'reply-qualification', say('每个平台只选一张符合门槛的优惠券；店铺折扣和配送优惠已一并计入。', 'Mỗi nền tảng áp dụng một mã đủ điều kiện; tổng tiền đã gồm ưu đãi từ quán và phí giao.')));
    scroll.append(rules);
    details.append(scroll);
    return details;
  }
  function compare({stores, request, open}) {
    const store = stores[0];
    const entries = offersFor(store, request);
    const [best, other] = rankedOffers(entries);
    const saving = other ? other.offer.total - best.offer.total : 0;
    const card = node('section', 'reply-card reply-comparison');
    card.dataset.storeId = store.id;
    card.dataset.quantity = best.offer.quantity;
    storeHeader(card, store, best.offer.quantity, say('同一家店 · 双平台比价', 'Cùng một quán · So sánh hai nền tảng'));
    const platforms = node('div', 'reply-platforms');
    platforms.append(...entries.map(entry => platformTile(entry, entry.key === best.key, !!other && saving === 0)));
    card.append(platforms);
    if (other) {
      const insight = node('div', 'reply-price-insight');
      const title = saving ? say(`${platformName(best.key, best.offer)} 少付 ${money(saving)}`, `${platformName(best.key, best.offer)} tiết kiệm ${money(saving)}`) : say('双平台最终实付相同', 'Cùng tổng tiền sau ưu đãi');
      insight.append(node('strong', '', title), node('p', '', differenceText(best.offer, other.offer)));
      card.append(insight);
    }
    card.append(ledger(entries));
    const actions = node('div', 'reply-card-actions');
    actions.append(button(say('查看店铺', 'Xem quán'), 'reply-secondary', () => open('catalogStore', {id:store.id, request, section:'.native-store-platforms'})), button(say('查看费用', 'Xem đơn'), 'reply-primary', () => open('catalogOrder', {id:store.id, platform:best.key, request})));
    card.append(actions);
    return card;
  }
  function tasteNotes(request) {
    const normalized = String(request || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();
    const notes = [];
    if (/不放香菜|不要香菜|不加香菜|去掉香菜|khong (?:them )?(?:rau mui|ngo ri|ngo)/.test(normalized)) notes.push(say('不放香菜', 'Không rau mùi'));
    if (/不辣|不要辣|不放辣|不加辣|khong cay|khong ot/.test(normalized)) notes.push(say('不辣', 'Không cay'));
    else if (/少辣|微辣|it cay|it ot/.test(normalized)) notes.push(say('少辣', 'Ít cay'));
    if (/无糖|不加糖|不放糖|不要糖|khong duong/.test(normalized)) notes.push(say('无糖', 'Không đường'));
    else if (/少糖|it duong/.test(normalized)) notes.push(say('少糖', 'Ít đường'));
    if (/去冰|不加冰|不放冰|不要冰|khong da/.test(normalized)) notes.push(say('去冰', 'Không đá'));
    else if (/少冰|it da/.test(normalized)) notes.push(say('少冰', 'Ít đá'));
    return notes;
  }
  function decision({stores, request, open}) {
    const store = stores[0];
    const [best, other] = rankedOffers(offersFor(store, request));
    const card = node('section', 'reply-card reply-decision');
    card.dataset.storeId = store.id;
    card.dataset.quantity = best.offer.quantity;
    storeHeader(card, store, best.offer.quantity, say('收好这份选餐方案', 'Lựa chọn cho bữa ăn này'));
    if (store.tags?.length) {
      const tags = node('div', 'reply-decision-tags');
      store.tags.slice(0, 3).forEach(tag => tags.append(node('span', '', translated(tag))));
      card.append(tags);
    }
    const notes = tasteNotes(request);
    if (notes.length) {
      const note = node('div', 'reply-taste-note');
      note.append(node('strong', '', say('口味要求', 'Khẩu vị đã chọn')), node('span', '', notes.join(' · ')));
      card.append(note);
    }
    const chosen = node('div', 'reply-chosen-offer reply-platform');
    chosen.dataset.platform = best.key;
    chosen.dataset.total = best.offer.total;
    const label = node('div', 'reply-chosen-label');
    label.append(node('span', 'reply-platform-name', platformName(best.key, best.offer)), node('small', '', other?.offer.total === best.offer.total ? say('双平台同价 · 含配送', 'Hai nền tảng cùng giá · Gồm phí giao') : say('已计入优惠与配送费', 'Đã tính ưu đãi & phí giao')));
    chosen.append(label, node('strong', 'reply-platform-total', money(best.offer.total)));
    card.append(chosen);
    const actions = node('div', 'reply-card-actions reply-decision-actions');
    actions.append(button(say('查看菜单', 'Xem thực đơn'), 'reply-primary', () => open('catalogStore', {id:store.id, request, section:'.native-store-menu'})), button(say('分享', 'Chia sẻ'), 'reply-secondary', () => open('catalogShare', {id:store.id, request}), 'share'));
    card.append(actions);
    return card;
  }
  function ranking({stores, request, open}) {
    const sorted = stores.map(store => ({store, entries:offersFor(store, request)})).map(row => ({...row, best:rankedOffers(row.entries)[0]})).sort((a, b) => a.best.offer.total - b.best.offer.total).slice(0, 5);
    const card = node('section', 'reply-card reply-ranking');
    const heading = node('header', 'reply-card-heading');
    heading.append(node('span', 'reply-card-eyebrow', say('换一种方式挑选', 'Chọn theo tổng tiền')), node('h3', 'reply-store-name', say('这几家，实付从低到高', 'Tổng tiền từ thấp đến cao')), node('p', 'reply-dish', say(`每家 ${sorted[0].best.offer.quantity} 份 · 包含配送与适用优惠`, `${sorted[0].best.offer.quantity} phần mỗi quán · Đã gồm phí giao & ưu đãi`)));
    card.append(heading);
    const list = node('ol', 'reply-ranking-list');
    sorted.forEach(({store, entries, best}, index) => {
      const row = node('li', 'reply-ranking-row');
      row.dataset.storeId = store.id;
      row.dataset.total = best.offer.total;
      const number = node('span', 'reply-rank', String(index + 1));
      number.setAttribute('aria-hidden', 'true');
      const content = node('div', 'reply-ranking-content');
      const detail = button(translated(store.name), 'reply-ranking-detail', () => open('catalogStore', {id:store.id, request, section:'.native-store-platforms'}), 'chevron');
      detail.setAttribute('aria-label', say('查看店铺：', 'Xem quán: ') + translated(store.name));
      content.append(detail, node('p', 'reply-ranking-dish', translated(store.dish)));
      const prices = node('div', 'reply-ranking-prices');
      entries.forEach(({key, offer}) => {
        const price = node('div', 'reply-platform' + (key === best.key ? ' is-best' : ''));
        price.dataset.platform = key;
        price.dataset.total = offer.total;
        price.append(node('span', 'reply-platform-name', platformName(key, offer)), node('strong', 'reply-platform-total', money(offer.total)));
        prices.append(price);
      });
      content.append(prices);
      row.append(number, content);
      list.append(row);
    });
    card.append(list);
    return card;
  }
  function render({kind, stores = [], request = '', open = () => {}} = {}) {
    const usable = stores.filter(store => store && Object.keys(store.platforms || {}).length);
    if (!usable.length) return node('p', 'reply-empty', say('暂时没有可比较的店铺，可以调整条件再试。', 'Chưa có quán phù hợp để so sánh. Bạn có thể đổi điều kiện.'));
    return ({compare, decision, ranking}[kind] || compare)({stores:usable, request, open});
  }
  return {render};
})();
