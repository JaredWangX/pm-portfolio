'use strict';

window.wansoShare = (() => {
  const zh = () => Boolean(window.wansoI18n?.chinese);
  const say = (chinese, vietnamese) => zh() ? chinese : vietnamese;
  const local = value => window.wansoI18n?.text(String(value || '')) ?? String(value || '');
  const money = value => new Intl.NumberFormat(zh() ? 'zh-CN' : 'vi-VN').format(value) + 'đ';
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const icon = kind => {
    const paths = {link:'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2',copy:'M9 8h11v13H9zM5 16H3V3h11v2',share:'M12 15V3m-4 4 4-4 4 4M7 11H4v10h16V11h-3'};
    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    for (const [key,value] of Object.entries({viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.7','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true'})) svg.setAttribute(key,value);
    const path = document.createElementNS(svg.namespaceURI,'path'); path.setAttribute('d',paths[kind]);svg.append(path);return svg;
  };

  function linkFor(store, request = '') {
    const quantity = window.wansoNative.offerFor(store, Object.keys(store.platforms)[0], request).quantity;
    const url = new URL(location.pathname, location.origin);
    url.searchParams.set('restaurant', store.id);
    url.searchParams.set('lang', zh() ? 'zh' : 'vi');
    // Quantity is all the price engine needs. Never share the original prompt or delivery location.
    url.searchParams.set('meal', `${quantity} phần ${store.dish || store.dishZh}`);
    url.hash = 'home';
    return url.href;
  }

  function content(store, {request = '', onClose} = {}) {
    const root = el('section','wanso-share'); root.setAttribute('aria-label',say('分享餐厅推荐','Chia sẻ gợi ý quán'));
    const result = window.wansoNative.comparisonFor(store,request);
    const offers = Object.entries(store.platforms).map(([key]) => [key,window.wansoNative.offerFor(store,key,request)]);
    const quantity = result.winner.quantity, dish = local(store.dishZh || store.dish);
    const address = local(store.address || `${store.district} · ${store.city === 'hcm' ? 'TP. Hồ Chí Minh' : 'Hà Nội'}`);
    const hours = window.wansoHours.status(store);
    const statusText = hours.state === 'open' ? say('营业中','Đang mở cửa') : hours.state === 'closed' ? say('休息中','Đã đóng cửa') : say('营业时间待确认','Cần xác nhận giờ mở cửa');
    const schedule = hours.schedule ? `${hours.schedule} · ${say('越南时间','Giờ Việt Nam')}` : say('可在平台确认营业时间','Kiểm tra giờ mở cửa trên nền tảng');
    const name = local(store.name.split(' - ')[0]), link = linkFor(store, request);
    const portion = say(`${quantity} 份 · ${dish}`,`${quantity} phần · ${dish}`);
    const verdict = result.saving > 0
      ? say(`${result.winner.name} 少付 ${money(result.saving)}`,`${result.winner.name} tiết kiệm ${money(result.saving)}`)
      : say('两平台到手价相同','Hai nền tảng có cùng tổng tiền');
    const equation = offer => say(
      `餐品 ${money(offer.price)} − 店铺优惠 ${money(offer.merchantDiscount)} − 优惠券 ${money(offer.couponDiscount)} ＋ 配送 ${money(offer.originalFee)} − 配送减免 ${money(offer.deliveryDiscount)} = ${money(offer.total)}`,
      `Tiền món ${money(offer.price)} − Quán giảm ${money(offer.merchantDiscount)} − Mã giảm ${money(offer.couponDiscount)} ＋ Giao hàng ${money(offer.originalFee)} − Giảm phí giao ${money(offer.deliveryDiscount)} = ${money(offer.total)}`);
    const difference = item => {
      const label = {price:say('餐品价格','Giá món'),merchant:say('店铺优惠','Ưu đãi từ quán'),coupon:say('优惠券','Mã giảm giá'),delivery:say('配送实付','Phí giao thực trả')}[item.key];
      if (!item.amount) return label + say('相同',' bằng nhau');
      const discount = item.key === 'merchant' || item.key === 'coupon';
      return label + say(discount ? item.amount > 0 ? '多减 ' : '少减 ' : item.amount > 0 ? '少付 ' : '多付 ',discount ? item.amount > 0 ? ' giảm nhiều hơn ' : ' giảm ít hơn ' : item.amount > 0 ? ' thấp hơn ' : ' cao hơn ') + money(Math.abs(item.amount));
    };

    const preview = el('article','wanso-share-preview');
    const photo = el('div','wanso-share-photo');photo.append(window.wansoMedia.image(store.image,{eager:true,detail:true,alt:local(store.imageAlt || dish)}));
    const identity = el('div','wanso-share-identity');
    const status = el('span','wanso-share-open',statusText); status.dataset.state = hours.state;
    photo.append(status);
    identity.append(el('h3','',name),el('p','wanso-share-address',address));
    preview.append(photo,identity);
    const details = el('div','wanso-share-details');
    details.append(el('strong','',portion));identity.append(details);root.append(preview);

    const pricing = el('section','wanso-share-pricing');pricing.setAttribute('aria-label',say('同份量两平台费用','So sánh hai nền tảng cùng khẩu phần'));
    pricing.append(el('h3','',say('同一份好味道，比较到手价','Cùng một món, so sánh tổng tiền')),el('p','wanso-share-basis',say('已计入可用优惠和配送费','Đã tính ưu đãi đủ điều kiện và phí giao hàng')));
    const totals = el('div','wanso-share-totals');
    for (const [key,offer] of offers) {
      const cell = el('div','wanso-share-total');cell.dataset.platform = key;
      cell.classList.toggle('is-best',offer.total === result.winner.total);
      cell.append(el('span','',offer.name),el('strong','',money(offer.total)),el('small','',say(`${quantity} 份 · 含配送`,`${quantity} phần · Gồm giao hàng`)));totals.append(cell);
    }
    pricing.append(totals,el('p','wanso-share-verdict',verdict));
    const explanation = el('p','wanso-share-explanation',say(`对比 ${result.other.name}，${result.winner.name}：`,`So với ${result.other.name}, ${result.winner.name}: `) + result.differences.map(difference).join(say('；','; ')) + say('。','.'));
    const ledger = el('details','wanso-share-ledger');ledger.append(el('summary','',say('看看优惠怎么算','Xem cách tính ưu đãi')),explanation);
    for (const [,offer] of offers) {
      const item = el('div','wanso-share-ledger-item');item.append(el('strong','',offer.name),el('p','',equation(offer)));
      if (offer.couponDiscount) item.append(el('p','',say('已用优惠券：','Mã đã áp dụng: ') + local(offer.couponName) + ' · ' + local(offer.couponTerms)));
      else item.append(el('p','',say('本单未计入不满足条件的优惠券。','Không tính mã chưa đủ điều kiện cho đơn này.')));
      ledger.append(item);
    }
    ledger.append(el('p','wanso-share-schedule',schedule));
    ledger.append(el('p','wanso-share-rule',say('每个平台仅使用一张符合门槛的最优优惠券；可与店铺优惠、配送减免叠加。','Mỗi nền tảng chọn một mã có lợi nhất và đủ điều kiện; có thể cộng với ưu đãi của quán và giao hàng.')));pricing.append(ledger);root.append(pricing);

    const draft = el('label','wanso-share-draft');draft.append(el('span','wanso-share-draft-title',say('一起去吃这家？','Cùng ăn quán này nhé?')),el('small','wanso-share-edit-hint',say('改写你的推荐语','Chỉnh lời nhắn của bạn')));
    const message = el('textarea','wanso-share-message');message.rows = 3;message.maxLength = 600;
    message.value = say(`想和你试试这家的${dish}。我按 ${quantity} 份比较了两边，${verdict}，配送费和可用优惠都算进去了。你看看怎么样？`,`Mình muốn rủ bạn thử ${dish} ở quán này. Mình đã so giá ${quantity} phần: ${verdict}, có tính giao hàng và ưu đãi đủ điều kiện rồi. Bạn thấy sao?`);
    draft.append(message);root.insertBefore(draft,pricing);
    ledger.append(el('p','wanso-share-privacy',say('链接只保留这家店、菜品和份量；不会包含你的定位或原始对话。','Liên kết chỉ giữ quán, món và số phần; không kèm vị trí của bạn hay nội dung trò chuyện.')));

    const feedback = el('p','wanso-share-feedback');feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');feedback.setAttribute('aria-atomic','true');
    const fallback = el('div','wanso-share-fallback');fallback.hidden = true;
    const manualLabel = el('label','');manualLabel.append(el('span','',say('按住或全选下方内容，再复制','Nhấn giữ hoặc chọn toàn bộ nội dung để sao chép')));
    const manual = el('textarea','wanso-share-manual');manual.readOnly = true;manual.rows = 5;manualLabel.append(manual);fallback.append(manualLabel);
    const actions = el('div','wanso-share-actions');
    const setFeedback = (text, kind = '') => {feedback.textContent = text;feedback.dataset.kind = kind;};
    const fullText = (includeLink = true) => [
      message.value.trim(),name,`${statusText} · ${schedule}`,address,
      say('这次想吃：','Món muốn thử: ') + portion,
      ...offers.flatMap(([,offer]) => [`${offer.name}: ${equation(offer)}`,...(offer.couponDiscount ? [say('已用优惠券：','Mã đã áp dụng: ') + local(offer.couponName) + ' · ' + local(offer.couponTerms)] : [])]),verdict,
      explanation.textContent,
      say('优惠券按当前条件核算，实际支付前请在平台确认。','Ưu đãi được tính theo điều kiện hiện tại; vui lòng xác nhận trên nền tảng trước khi thanh toán.'),
      ...(includeLink ? [link] : [])
    ].filter(Boolean).join('\n\n');
    function manualCopy(value) {
      manual.value = value;fallback.hidden = false;manual.focus({preventScroll:true});manual.select();
      fallback.scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
      setFeedback(say('浏览器未允许自动复制，已选中内容，请手动复制。','Trình duyệt chưa cho phép tự động sao chép. Nội dung đã được chọn để bạn sao chép.'),'notice');
    }
    function action(kind,label,handler) {
      const button = el('button','wanso-share-button');button.type = 'button';button.dataset.action = kind;
      button.append(icon(kind),el('span','',label));button.addEventListener('click',() => handler(button));return button;
    }
    async function copy(value,button,label) {
      button.disabled = true;button.setAttribute('aria-busy','true');
      try {
        if (!navigator.clipboard?.writeText) throw Error('clipboard unavailable');
        await navigator.clipboard.writeText(value);fallback.hidden = true;
        setFeedback(label,'success');window.wansoMotion?.feedback?.(button,'success');
      } catch {manualCopy(value);}
      finally {button.disabled = false;button.removeAttribute('aria-busy');}
    }
    actions.append(
      action('link',say('复制餐厅链接','Sao chép liên kết'),button => copy(link,button,say('餐厅链接已复制，可直接打开同一家店。','Đã sao chép liên kết để mở đúng quán này.'))),
      action('copy',say('复制完整推荐','Sao chép gợi ý đầy đủ'),button => copy(fullText(),button,say('推荐语、费用说明和餐厅链接已复制。','Đã sao chép lời nhắn, cách tính giá và liên kết quán.')))
    );
    if (typeof navigator.share === 'function') {
      const system = action('share',say('通过系统分享','Chia sẻ qua thiết bị'),async button => {
        button.disabled = true;button.setAttribute('aria-busy','true');
        try {
          await navigator.share({title:name,text:fullText(false),url:link});
          setFeedback(say('已交给系统分享。','Đã chuyển nội dung qua tính năng chia sẻ của thiết bị.'),'success');
          window.wansoMotion?.feedback?.(button,'success');
        } catch (error) {
          if (error.name === 'AbortError') setFeedback(say('已取消分享，推荐内容仍保留在这里。','Đã hủy chia sẻ. Nội dung gợi ý vẫn được giữ ở đây.'));
          else {manualCopy(fullText());setFeedback(say('系统分享暂不可用，可以复制链接或下方完整内容。','Chưa thể chia sẻ qua thiết bị. Bạn có thể sao chép liên kết hoặc nội dung bên dưới.'),'notice');}
        } finally {button.disabled = false;button.removeAttribute('aria-busy');}
      });system.classList.add('is-primary');actions.prepend(system);
    }
    if (!actions.querySelector('[data-action=share]')) actions.querySelector('[data-action=copy]').classList.add('is-primary');
    root.append(actions,feedback,fallback);
    const select = el('button','wanso-share-select',say('全选内容','Chọn toàn bộ'));select.type = 'button';select.addEventListener('click',() => {manual.focus();manual.select();});fallback.append(select);
    if (onClose) {const done = el('button','wanso-share-done',say('完成','Xong'));done.type = 'button';done.addEventListener('click',onClose);root.append(done);}
    return [root];
  }
  return {content,linkFor};
})();
