'use strict';

// Illustrative, deterministic VND settlement rules. No live platform promotions.
window.wansoOffers = (() => {
  const money = value => new Intl.NumberFormat('vi-VN').format(value) + 'đ';
  const integer = (value, field) => {
    if (!Number.isSafeInteger(value) || value < 0) throw new TypeError(field + ' must be a non-negative integer');
    return value;
  };
  const percentage = rate => (rate / 100).toLocaleString('zh-CN') + '%';
  const couponRule = coupon => {
    const benefit = coupon.type === 'rate'
      ? '减 ' + percentage(coupon.rateBps) + '，最高减 ' + money(coupon.cap)
      : '减 ' + money(coupon.amount);
    return '折后餐品满 ' + money(coupon.minSpend) + ' ' + benefit;
  };
  const reduction = (base, rule) => Math.min(base,
    rule.type === 'rate' ? Math.min(Math.floor(base * rule.rateBps / 10000), rule.cap) : rule.amount);

  function calculate(store, platform, quantity = 1) {
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 99) throw new RangeError('quantity must be an integer between 1 and 99');
    const offer = store?.platforms?.[platform];
    if (!offer) throw new TypeError('Unknown restaurant platform');
    const unitPrice = integer(offer.price, 'price');
    const originalFee = integer(offer.fee, 'fee');
    const subtotal = integer(unitPrice * quantity, 'subtotal');
    const rules = offer.promotion || {};
    const applied = [], unavailable = [], terms = [];
    let merchantDiscount = 0;
    if (rules.merchant) {
      const rule = rules.merchant;
      const text = '餐品原价满 ' + money(rule.minSpend) + ' 减 ' + percentage(rule.rateBps) + '，最高减 ' + money(rule.cap);
      terms.push('商家折扣：' + text + '。');
      if (subtotal >= rule.minSpend) {
        merchantDiscount = Math.min(subtotal, Math.floor(subtotal * rule.rateBps / 10000), rule.cap);
        if (merchantDiscount) applied.push({kind:'merchant', label:'商家折扣', amount:merchantDiscount, terms:text});
      } else unavailable.push('商家折扣还差 ' + money(rule.minSpend - subtotal) + ' 餐品金额。');
    }
    const eligibleSubtotal = subtotal - merchantDiscount;
    const couponOptions = (rules.coupons || []).map(coupon => {
      const eligible = eligibleSubtotal >= coupon.minSpend;
      return {...coupon, eligible, gap:Math.max(0,coupon.minSpend - eligibleSubtotal),
        saving:eligible ? reduction(eligibleSubtotal, coupon) : 0, terms:couponRule(coupon), selected:false};
    });
    const eligibleCoupons = couponOptions.filter(coupon => coupon.eligible && coupon.saving > 0)
      .sort((a,b) => b.saving - a.saving || a.minSpend - b.minSpend || a.id.localeCompare(b.id));
    const selected = eligibleCoupons[0];
    const couponDiscount = selected?.saving || 0;
    if (selected) {
      selected.selected = true;
      applied.push({kind:'coupon', label:selected.name, amount:couponDiscount, terms:selected.terms});
    }
    for (const coupon of couponOptions) {
      terms.push(coupon.name + '：' + coupon.terms + '。');
      if (!coupon.eligible) unavailable.push(coupon.name + '还差 ' + money(coupon.gap) + ' 折后餐品金额。');
      else if (selected && coupon.id !== selected.id) unavailable.push(coupon.name + '可减 ' + money(coupon.saving) + '；与已选券互斥，本单采用' + selected.name + '。');
    }
    let deliveryDiscount = 0;
    if (rules.delivery) {
      const rule = rules.delivery;
      const text = '折后餐品满 ' + money(rule.minSpend) + (rule.amount === null ? ' 免配送费' : ' 减配送费，最高 ' + money(rule.amount));
      terms.push('配送优惠：' + text + '。');
      if (eligibleSubtotal >= rule.minSpend) {
        deliveryDiscount = Math.min(originalFee, rule.amount === null ? originalFee : rule.amount);
        if (deliveryDiscount) applied.push({kind:'delivery', label:'配送优惠', amount:deliveryDiscount, terms:text});
      } else unavailable.push('配送优惠还差 ' + money(rule.minSpend - eligibleSubtotal) + ' 折后餐品金额。');
    }
    const discount = merchantDiscount + couponDiscount + deliveryDiscount;
    const netDeliveryFee = originalFee - deliveryDiscount;
    const payableItems = eligibleSubtotal - couponDiscount;
    const total = payableItems + netDeliveryFee;
    const couponName = selected?.name || '';
    const couponTerms = selected?.terms || (couponOptions.length ? '本单未达到平台券门槛' : '本店无平台券');
    const qualification = '平台券与配送优惠按商家折扣后的餐品金额核算门槛；平台券择优用一张，可与商家折扣和配送优惠叠加。';
    return {...offer, quantity, unitPrice, price:subtotal, subtotal, fee:originalFee, originalFee,
      merchantDiscount, couponDiscount, deliveryDiscount, discount, savings:discount,
      eligibleSubtotal, payableItems, netDeliveryFee, total, couponName, couponTerms,
      couponOptions, applied, unavailable, terms, qualification,
      lines:[{label:'餐品小计',amount:subtotal},{label:'配送费',amount:originalFee},
        {label:'商家折扣',amount:-merchantDiscount},{label:couponName || '平台券',amount:-couponDiscount},
        {label:'配送优惠',amount:-deliveryDiscount},{label:'合计',amount:total}]
    };
  }
  return {calculate};
})();
