'use strict';

window.wansoNative = (() => {
  const query = '鸡腿河粉，预算八万越南盾，找两家店';
  const answer = '河内这两家都有鸡腿河粉。Hương Vị Mộc 的餐品标价 73.000đ，Phở Quyên 的汤河粉标价 59.000đ。滑动可看两家的推荐理由和下单入口。';
  const menuTranslations = {
    'Phở gà đùi': ['Chicken thigh pho', '鸡腿汤河粉', '鶏もも肉のフォー', '닭다리살 쌀국수'],
    'Phở trộn gà đùi': ['Mixed pho with chicken thigh', '鸡腿拌河粉', '鶏もも肉の和えフォー', '닭다리살 비빔 쌀국수'],
    'Phở gà đùi nước': ['Chicken thigh pho soup', '鸡腿汤河粉', '鶏もも肉のスープフォー', '닭다리살 국물 쌀국수']
  };
  let archive;
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  };
  const button = (text, className, action, label) => {
    const node = element('button', className, text);
    node.type = 'button';
    if (label) node.setAttribute('aria-label', label);
    node.addEventListener('click', action);
    return node;
  };
  const money = value => new Intl.NumberFormat('vi-VN').format(value) + 'đ';
  const translations = [null,0,null,1,2,3];
  const asset = photo => '../../assets/wanso/native/' + photo;

  async function load(signal) {
    const response = await fetch('archive.json?v=native-scroll', {signal});
    if (!response.ok) throw Error('menu archive');
    archive = await response.json();
  }

  function appendMenu(container, key, language = 0) {
    const store = archive[key];
    const menu = element('section', 'ios-menu');
    menu.dataset.storeMenu = key;
    menu.setAttribute('aria-label', '菜单');
    menu.append(element('h2', '', '菜单'));
    for (const category of store.menu) {
      const group = element('section', 'ios-menu-group');
      const list = element('ul');
      for (const [name, price, description] of category.items) {
        const item = element('li');
        const info = element('span');
        const translated = menuTranslations[name]?.[translations[language]];
        info.append(element('strong', '', translated || name));
        if (translated || description) info.append(element('small', '', translated ? name : description));
        item.append(info, element('b', '', money(price)));
        list.append(item);
      }
      group.append(element('h3', '', category.title), list);
      menu.append(group);
    }
    container.append(menu);
    return menu;
  }

  function restaurantCard(id, route, open) {
    const data = archive[id];
    const shop = id === 'moc';
    const short = shop ? 'Hương Vị Mộc' : 'Phở Quyên';
    const shell = element('article', 'ios-recommendation');
    const card = element('div','ios-restaurant');
    const restaurant = button('', 'ios-restaurant-main', () => route(shop ? 'store-first' : 'store-second'), '查看 ' + short + ' 菜单');
    const photo = element('div', 'ios-restaurant-photo');
    const image = element('img');
    image.src = asset(data.photo);
    image.alt = '';
    image.draggable = false;
    const openStatus = element('span', 'ios-open-dot');
    openStatus.dataset.open = String(Boolean(data.is_open));
    openStatus.setAttribute('aria-label', data.is_open ? '营业中' : '休息中');
    photo.append(image, openStatus, element('span', 'ios-rating', '⭐ ' + data.rating.toFixed(1)));
    const details = element('div','ios-restaurant-info');
    const stats = element('dl','ios-restaurant-stats');
    for (const [title, value] of [['Avg spend',money(data.avg)],['Reviews',String(data.review_count)],['Distance',data.distance.toFixed(1)+'km']]) {
      const datum = element('div');
      datum.append(element('dt','',title),element('dd','',value));
      stats.append(datum);
    }
    details.append(element('strong','ios-restaurant-name',data.name),
      element('span','ios-budget','预算内'),element('span','ios-sample','✦  ' + data.dish),stats);
    restaurant.append(photo,details);
    const footer = element('div','ios-platform');
    footer.dataset.platform = shop ? 'shopee' : 'grab';
    const badge = element('span','ios-platform-name');
    badge.append(element('span','ios-platform-mark',shop?'SF':'GF'),element('strong','',shop?'Shopee':'Grab'));
    const order = button('下单 →', 'ios-order', () => open('order', shop ? 'moc-shopee' : 'quyen-grab'),
      short + ' · ' + data.platform + ' 下单');
    footer.append(badge, order);
    card.append(restaurant, footer);
    const delivery = data.discounted_delivery_fee > 0 ? '样本配送费 ' + money(data.discounted_delivery_fee) + '。' : '配送费以平台结算为准。';
    const reason = element('p', 'ios-card-reason');
    reason.append(element('span','','✨'),element('span','',`菜单有 ${data.dish}（鸡腿河粉），餐品标价 ${money(data.sample)}，在 80.000đ 预算内。${delivery}`));
    shell.append(card, reason);
    return shell;
  }

  function homeRestaurants(route) {
    const rail = element('div','ios-carousel ios-home-carousel');
    rail.tabIndex = 0;
    rail.setAttribute('aria-label','万象精选，左右滑动查看');
    for (const [id,data] of Object.entries(archive)) {
      const first = id === 'moc';
      const card = button('', 'ios-home-restaurant', () => route(first ? 'store-first' : 'store-second'),
        '查看 ' + (first ? 'Hương Vị Mộc' : 'Phở Quyên'));
      const photo = element('img');
      photo.src = asset(data.photo);
      photo.alt = '';
      photo.draggable = false;
      const details = element('div','ios-home-store-info');
      details.append(element('strong','',data.name),element('span','ios-home-tags','越南菜　粉面'),
        element('span','',`⭐ ${data.rating.toFixed(1)} (${data.review_count}) · ${data.distance.toFixed(1)}km`));
      if (data.discounted_delivery_fee > 0) {
        const fees = element('span','ios-home-fee',money(data.discounted_delivery_fee) + ' ');
        fees.append(element('s','',money(data.delivery_fee)));
        details.append(fees);
      }
      details.append(element('span','ios-home-platform',data.platform));
      card.append(photo, details);
      rail.append(card);
    }
    return rail;
  }

  function mountChat(layer, route, open, onCarousel) {
    const scroller = element('section','phone-scroll ios-chat');
    scroller.tabIndex = 0;
    scroller.setAttribute('aria-label','选餐对话，上下滚动查看');
    scroller.append(element('p','ios-user-message',query));
    const reply = element('div','ios-chat-reply');
    const avatar = element('span','ios-avatar','✦');
    avatar.setAttribute('aria-hidden','true');
    const content = element('div','ios-chat-answer');
    content.append(element('p','ios-assistant-message',answer));
    const carousel = element('div','ios-carousel');
    carousel.tabIndex = 0;
    carousel.setAttribute('aria-label','两家餐厅，左右滑动查看');
    carousel.append(...Object.keys(archive).map(id => restaurantCard(id, route, open)));
    carousel.addEventListener('scroll',() => {
      const atSecond = carousel.scrollLeft > (carousel.scrollWidth - carousel.clientWidth) / 2;
      onCarousel(atSecond ? 'recommend-2' : 'recommend');
    },{passive:true});
    const actions = element('div','ios-reply-actions');
    const copy = button('⧉ 复制','', async () => {
      try {
        await navigator.clipboard.writeText(answer);
        copy.textContent = '已复制';
      } catch { open('share'); }
    });
    actions.append(copy,button('↻ 重试','',() => route('generating',true,'preserve')),
      button('↗ 分享','',() => open('share')));
    const feedback = element('div','ios-reply-actions');
    const rate = (label, value) => button(label,'',() => {
      for (const item of feedback.querySelectorAll('[aria-pressed]')) item.setAttribute('aria-pressed',String(item.dataset.rating === value));
    });
    for (const [label,value] of [['👍 有帮助','yes'],['👎 没帮助','no']]) {
      const rating = rate(label,value);
      rating.dataset.rating = value;
      rating.setAttribute('aria-pressed','false');
      feedback.append(rating);
    }
    content.append(carousel,actions,feedback,
      button('⚑ 举报','ios-report',() => open('feedback')));
    reply.append(avatar,content);
    scroller.append(reply);

    const composer = element('form','ios-composer');
    const input = element('input');
    input.type = 'text';
    input.placeholder = '继续提问…';
    input.setAttribute('aria-label','继续提问');
    input.maxLength = 160;
    const send = element('button','ios-send','➤');
    send.type = 'submit';
    send.disabled = true;
    send.setAttribute('aria-label','发送追问');
    input.addEventListener('input',()=>{send.disabled = !input.value.trim();});
    composer.addEventListener('submit',event=>{
      event.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      send.disabled = true;
      scroller.append(element('p','ios-user-message',text));
      const followup = /拌|干拌|mixed/i.test(text) ?
        'Hương Vị Mộc 的 Phở trộn gà đùi 是鸡腿拌河粉。GrabFood 标价 71.000đ，ShopeeFood 标价 79.000đ。' :
        /运费|配送|到手|总价|多少|便宜|比价|预算|delivery|price/i.test(text) ?
          'Phở Quyên 的鸡腿汤河粉 59.000đ，档案配送费 12.000đ，合计 71.000đ。Hương Vị Mộc 在 ShopeeFood 标价 73.000đ，档案未给出该店在该平台的配送费。' :
          '这次体验使用两家店的历史菜单。你可以追问鸡腿拌河粉、配送费或八万越南盾内的选项。';
      const reply = element('p','ios-assistant-message ios-followup',followup);
      scroller.append(reply);
      scroller.scrollTop = scroller.scrollHeight;
    });
    composer.append(input,send);
    layer.append(scroller,composer);
    return scroller;
  }

  return {load, appendMenu, mountChat, homeRestaurants};
})();
