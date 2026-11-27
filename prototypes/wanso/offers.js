'use strict';

// Illustrative, deterministic VND settlement rules. No live platform promotions.
window.wansoOffers = (() => {
  const number = new Intl.NumberFormat('vi-VN');
  const money = value => number.format(value) + 'đ';
  const integer = (value, field) => {
    if (!Number.isSafeInteger(value) || value < 0) throw new TypeError(field + ' must be a non-negative integer');
    return value;
  };
  const percentage = rate => (rate / 100).toLocaleString('vi-VN') + '%';
  const couponRule = coupon => {
    const benefit = coupon.type === 'rate'
      ? 'giảm ' + percentage(coupon.rateBps) + ', tối đa ' + money(coupon.cap)
      : 'giảm ' + money(coupon.amount);
    return 'Tiền món sau giảm của quán từ ' + money(coupon.minSpend) + ': ' + benefit;
  };
  const reduction = (base, rule) => Math.min(base,
    rule.type === 'rate' ? Math.min(Math.floor(base * rule.rateBps / 10000), rule.cap) : rule.amount);

  // Search and city statistics need amounts only, not thousands of localized rule paragraphs.
  function summary(store, platform, quantity = 1) {
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 99) throw new RangeError('quantity must be an integer between 1 and 99');
    const offer = store?.platforms?.[platform];
    if (!offer) throw new TypeError('Unknown restaurant platform');
    const unitPrice = integer(offer.price, 'price');
    const originalFee = integer(offer.fee, 'fee');
    const subtotal = integer(unitPrice * quantity, 'subtotal');
    const rules = offer.promotion || {};
    const merchant = rules.merchant;
    const merchantDiscount = merchant && subtotal >= merchant.minSpend
      ? Math.min(subtotal, Math.floor(subtotal * merchant.rateBps / 10000), merchant.cap) : 0;
    const eligibleSubtotal = subtotal - merchantDiscount;
    let selectedCoupon, couponDiscount = 0;
    for (const coupon of rules.coupons || []) {
      if (eligibleSubtotal < coupon.minSpend) continue;
      const saving = reduction(eligibleSubtotal, coupon);
      if (saving > couponDiscount || saving > 0 && saving === couponDiscount &&
          (coupon.minSpend < selectedCoupon.minSpend || coupon.minSpend === selectedCoupon.minSpend && coupon.id.localeCompare(selectedCoupon.id) < 0)) {
        selectedCoupon = coupon; couponDiscount = saving;
      }
    }
    const delivery = rules.delivery;
    const deliveryDiscount = delivery && eligibleSubtotal >= delivery.minSpend
      ? Math.min(originalFee, delivery.amount === null ? originalFee : delivery.amount) : 0;
    const discount = merchantDiscount + couponDiscount + deliveryDiscount;
    const netDeliveryFee = originalFee - deliveryDiscount;
    const payableItems = eligibleSubtotal - couponDiscount;
    return {quantity, unitPrice, price:subtotal, subtotal, fee:originalFee, originalFee,
      merchantDiscount, couponDiscount, deliveryDiscount, discount, savings:discount,
      eligibleSubtotal, payableItems, netDeliveryFee, total:payableItems + netDeliveryFee, selectedCoupon};
  }

  function calculate(store, platform, quantity = 1) {
    const {selectedCoupon, ...amounts} = summary(store, platform, quantity);
    const {subtotal, originalFee, merchantDiscount, couponDiscount, deliveryDiscount, eligibleSubtotal, total} = amounts;
    const offer = store.platforms[platform], rules = offer.promotion || {};
    const applied = [], unavailable = [], terms = [];
    if (rules.merchant) {
      const rule = rules.merchant;
      const text = 'Tiền món niêm yết từ ' + money(rule.minSpend) + ': giảm ' + percentage(rule.rateBps) + ', tối đa ' + money(rule.cap);
      terms.push('Ưu đãi từ quán: ' + text + '.');
      if (merchantDiscount) applied.push({kind:'merchant', label:'Giảm từ quán', amount:merchantDiscount, terms:text});
      else if (subtotal < rule.minSpend) unavailable.push('Cần thêm ' + money(rule.minSpend - subtotal) + ' tiền món để dùng ưu đãi từ quán.');
    }
    const couponOptions = (rules.coupons || []).map(coupon => {
      const eligible = eligibleSubtotal >= coupon.minSpend;
      return {...coupon, eligible, gap:Math.max(0,coupon.minSpend - eligibleSubtotal),
        saving:eligible ? reduction(eligibleSubtotal, coupon) : 0, terms:couponRule(coupon), selected:coupon === selectedCoupon};
    });
    const selected = couponOptions.find(coupon => coupon.selected);
    if (selected) applied.push({kind:'coupon', label:selected.name, amount:couponDiscount, terms:selected.terms});
    for (const coupon of couponOptions) {
      terms.push(coupon.name + ': ' + coupon.terms + '.');
      if (!coupon.eligible) unavailable.push(coupon.name + ': còn thiếu ' + money(coupon.gap) + ' tiền món sau giảm của quán.');
      else if (selected && coupon.id !== selected.id) unavailable.push(coupon.name + ' có thể giảm ' + money(coupon.saving) + ', nhưng không dùng đồng thời với mã đã chọn. Đơn này dùng ' + selected.name + '.');
    }
    if (rules.delivery) {
      const rule = rules.delivery;
      const text = 'Tiền món sau giảm của quán từ ' + money(rule.minSpend) + (rule.amount === null ? ': miễn phí giao hàng' : ': giảm phí giao hàng tối đa ' + money(rule.amount));
      terms.push('Ưu đãi giao hàng: ' + text + '.');
      if (deliveryDiscount) applied.push({kind:'delivery', label:'Ưu đãi giao hàng', amount:deliveryDiscount, terms:text});
      else if (eligibleSubtotal < rule.minSpend) unavailable.push('Cần thêm ' + money(rule.minSpend - eligibleSubtotal) + ' tiền món sau giảm của quán để dùng ưu đãi giao hàng.');
    }
    const couponName = selected?.name || '';
    const couponTerms = selected?.terms || (couponOptions.length ? 'Đơn chưa đạt mức tối thiểu của mã' : 'Quán chưa có mã nền tảng');
    const qualification = 'Mức tối thiểu của mã nền tảng và ưu đãi giao hàng tính trên tiền món sau giảm của quán. Chọn một mã có lợi nhất; có thể cộng với ưu đãi từ quán và giao hàng.';
    return {...offer, ...amounts, couponName, couponTerms,
      couponOptions, applied, unavailable, terms, qualification,
      lines:[{label:'Tiền món',amount:subtotal},{label:'Phí giao hàng',amount:originalFee},
        {label:'Giảm từ quán',amount:-merchantDiscount},{label:couponName || 'Mã nền tảng',amount:-couponDiscount},
        {label:'Ưu đãi giao hàng',amount:-deliveryDiscount},{label:'Tổng cộng',amount:total}]
    };
  }
  return {calculate, summary};
})();
