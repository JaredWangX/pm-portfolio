'use strict';

window.wansoControls = (() => {
  const query = '鸡腿河粉，预算八万越南盾，找两家店';
  const stores = {
    moc: {
      name: 'Phở Gà Hương Vị Mộc - Thái Thịnh', frame: 'store-first', rating: '4.6 · 1,000 条评价',
      image: 'order-moc.webp', address: '110C2 Tập Thể Vĩnh Hồ, P. Thịnh Quang, Đống Đa, Hà Nội',
      menu: [
        ['Phở gà đùi', 'Chicken thigh pho', '鸡腿汤河粉', '鶏もも肉のフォー', '닭다리살 쌀국수', 'ShopeeFood 73,000 ₫ · GrabFood 68,000 ₫'],
        ['Phở trộn gà đùi', 'Mixed pho with chicken thigh', '鸡腿拌河粉', '鶏もも肉の和えフォー', '닭다리살 비빔 쌀국수', 'ShopeeFood 79,000 ₫ · GrabFood 71,000 ₫']
      ]
    },
    quyen: {
      name: 'Phở Quyên - Phở gà trộn đặc biệt', frame: 'store-second', rating: '4.4 · 741 条评价',
      image: 'order-quyen.webp',
      menu: [
        ['Phở gà đùi nước', 'Chicken thigh pho soup', '鸡腿汤河粉', '鶏もも肉のスープフォー', '닭다리살 국물 쌀국수', 'GrabFood 59,000 ₫']
      ]
    }
  };
  const orders = {
    'moc-shopee': {store: 'moc', platform: 'ShopeeFood', price: 73000, fee: null, color: 'shopee'},
    'moc-grab': {store: 'moc', platform: 'GrabFood', price: 68000, fee: 40000, color: 'grab'},
    'quyen-grab': {store: 'quyen', platform: 'GrabFood', price: 59000, fee: 12000, oldFee: 24000, color: 'grab'}
  };
  const menuLanguages = ['原文', 'English', 'Tiếng Việt', '中文', '日本語', '한국어'];
  const appLanguages = ['跟随系统', 'English', 'Tiếng Việt', '中文'];
  const themes = {
    森林: ['深绿与草木色', '#15463a', '#43b789', '#e4f3e9'],
    海洋: ['清爽蓝与柔和浅蓝', '#193e78', '#4179da', '#e8f2ff'],
    薰衣草: ['柔紫与浅薰衣草色', '#50337c', '#9773e8', '#f1e9fa'],
    日落: ['暖橙与淡杏色', '#85401e', '#e89148', '#fff1e4'],
    午夜: ['深色底配薄荷绿', '#163d42', '#5bc2a7', '#d7eee8'],
    赛博: ['深色底配荧光绿', '#12392b', '#51e881', '#e0ffe7']
  };
  const preferences = {
    grab: ['GrabUnlimited', '原版设置展示约 49,000 ₫／月。可将 GrabFood 会员配送优惠纳入推荐。'],
    shopee: ['ShopeeFood+', '原版设置展示约 39,000 ₫／月。可将 ShopeeFood 会员配送券纳入比较。'],
    budget: ['默认预算', '这是给下一次推荐的常用预算。搜索里明确写出的本次预算优先。'],
    mode: ['AI 决策模式', '平衡模式综合价格与距离。距离优先按近远排序，价格优先关注餐品标价和已知运费。'],
    haptics: ['触感反馈', '在支持触感的手机上，选项切换时会有轻微振动。'],
    analytics: ['共享匿名数据', '此选项在 App 中用于控制是否共享帮助改进产品的匿名数据。'],
    push: ['所有推送', '控制是否接收万象的提醒。'],
    offers: ['优惠提醒', '限时秒杀和优惠消息。'],
    priceDrop: ['降价', '已收藏餐厅降价时提醒。'],
    newPlaces: ['附近新餐厅', '你的区域新增餐厅时提醒。'],
    delivery: ['配送状态', '展示已下单、配送中与已送达的提醒类型。'],
    digest: ['每周 AI 摘要', '万象每周一早晨的总结。'],
    quiet: ['勿扰', '开启后在设定时间段内暂停推送提醒。'],
    compareAll: ['全平台比较', '开启后推荐可以同时考虑 GrabFood 和 ShopeeFood 的餐厅。']
  };
  const original = {
    name: 'Wanso 体验账号', avatar: '🧑', appLanguage: '中文', theme: '海洋',
    grab: false, shopee: false, budget: '10万以下', mode: '平衡',
    haptics: true, analytics: true, push: true, offers: true, priceDrop: true,
    newPlaces: false, delivery: true, digest: false, quiet: false, compareAll: true,
    start: '22:00', end: '08:00', email: 'demo@wanso.example',
    phone: '', birthday: '', gender: '', address: '', query
  };
  const state = {...original, history: true, collections: ['全部收藏'], recent: [], tastes: [],
    group: {moc: '全部收藏', quyen: '全部收藏'}, menuLanguage: {moc: 0, quyen: 0}, translated: {moc: 0, quyen: 0}};
  const currency = number => number.toLocaleString('en-US') + ' ₫';
  const el = (tag, className, value) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined) node.textContent = value;
    return node;
  };

  const sheet = el('dialog', 'wanso-sheet');
  sheet.setAttribute('aria-labelledby', 'wanso-sheet-title');
  const header = el('header', 'sheet-header');
  const title = el('h2');
  title.id = 'wanso-sheet-title';
  const closeButton = el('button', 'sheet-close', '×');
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', '关闭');
  closeButton.addEventListener('click', () => sheet.close());
  header.append(title, closeButton);
  const content = el('div', 'sheet-content');
  sheet.append(header, content);
  document.body.append(sheet);
  let activeScreen, activeFrame, activeLayer, anchor, navigate;
  const controls = new WeakMap();

  function placeSheet() {
    if (!sheet.open) return;
    const box = activeScreen.getBoundingClientRect();
    const frameBox = window.frameElement?.getBoundingClientRect();
    const parentHeader = frameBox && parent.document.querySelector('body > header')?.getBoundingClientRect().bottom;
    const visibleTop = frameBox ? Math.max(0, (parentHeader || 0) - frameBox.top) : 0;
    const visibleBottom = frameBox ? Math.min(innerHeight, parent.innerHeight - frameBox.top) : innerHeight;
    const top = Math.max(visibleTop + 6, box.top + 45);
    const bottom = Math.min(visibleBottom - 6, box.bottom - 10);
    sheet.style.left = (box.left + 6) + 'px';
    sheet.style.width = Math.max(1, box.width - 12) + 'px';
    sheet.style.bottom = (innerHeight - bottom) + 'px';
    sheet.style.maxHeight = Math.max(130, bottom - top) + 'px';
  }

  window.addEventListener('resize', placeSheet);
  window.addEventListener('scroll', placeSheet, {passive: true});
  sheet.addEventListener('click', event => {
    if (event.target !== sheet) return;
    const box = sheet.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right ||
      event.clientY < box.top || event.clientY > box.bottom) sheet.close();
  });
  sheet.addEventListener('close', () => {
    if (window.frameElement) parent.removeEventListener('scroll', placeSheet);
    if (activeLayer?.isConnected) paint(activeLayer, activeFrame);
    anchor?.focus({preventScroll: true});
  });

  function show(heading, ...nodes) {
    title.textContent = heading;
    content.replaceChildren(...nodes);
    content.scrollTop = 0;
    if (!sheet.open) {
      sheet.showModal();
      placeSheet();
      if (window.frameElement) parent.addEventListener('scroll', placeSheet, {passive: true});
    }
  }

  function go(id, search = false, mode = 'forward') {
    sheet.close();
    navigate(id, search, mode);
  }

  function button(label, fn, className = 'sheet-button') {
    const control = el('button', className, label);
    control.type = 'button';
    control.addEventListener('click', fn);
    return control;
  }

  function row(label, value, fn, selected) {
    const item = fn ? button('', fn, 'sheet-row') : el('div', 'sheet-row');
    item.append(el('strong', null, label));
    if (value) item.append(el('span', null, value));
    if (fn && selected !== undefined) item.setAttribute('aria-pressed', String(selected));
    return item;
  }

  function details(values) {
    const list = el('dl', 'sheet-details');
    for (const [name, value] of values) {
      const detail = el('div');
      detail.append(el('dt', null, name), el('dd', null, value));
      list.append(detail);
    }
    return list;
  }

  function actions(...buttons) {
    const group = el('div', 'sheet-actions');
    group.append(...buttons);
    return group;
  }

  function paragraph(value) { return el('p', 'sheet-text', value); }
  function note(value) { return el('p', 'sheet-note', value); }
  function backButton(label = '返回') { return button(label, () => sheet.close()); }

  function confirmation(heading, message, label, accept) {
    show(heading, paragraph(message), actions(backButton('取消'), button(label, accept, 'sheet-button danger')));
  }

  function field(heading, description, value, save, options = {}) {
    const form = el('form', 'sheet-form');
    const label = el('label', 'sheet-field', options.label || heading);
    const input = el(options.multiline ? 'textarea' : 'input');
    if (!options.multiline) input.type = options.type || 'text';
    input.value = value;
    input.required = options.required !== false;
    input.maxLength = options.limit || 160;
    label.append(input);
    const submit = el('button', 'sheet-button primary', options.submit || '保存');
    submit.type = 'submit';
    form.append(label, actions(backButton('取消'), submit));
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (input.required && !input.value.trim()) {
        input.focus();
        return;
      }
      save(input.value.trim());
    });
    show(heading, paragraph(description), form);
    input.focus({preventScroll: true});
  }

  function toggle(key) {
    const [heading, description] = preferences[key];
    const open = () => show(heading, paragraph(description), row(heading, state[key] ? '已开启' : '已关闭', () => {
      state[key] = !state[key];
      open();
    }, state[key]), actions(backButton('完成')));
    open();
  }

  function choices(key, options, selected) {
    const [heading, description] = preferences[key];
    const choose = value => {
      state[key] = value;
      open();
    };
    const open = () => show(heading, paragraph(description),
      ...options.map(value => row(value, state[key] === value ? '当前选项' : '', () => choose(value), state[key] === value)),
      actions(backButton('完成')));
    if (options.includes(selected)) state[key] = selected;
    open();
  }

  function openOrder(id) {
    const order = orders[id];
    const store = stores[order.store];
    state.recent = [id, ...state.recent.filter(key => key !== id)];
    const top = el('div', 'order-store');
    const photo = el('img');
    photo.src = '../../assets/wanso/native/' + store.image;
    photo.alt = '';
    photo.width = 64;
    photo.height = 64;
    const name = el('div');
    const platform = el('span', 'order-platform', order.platform);
    platform.dataset.platform = order.color;
    name.append(platform, el('strong', null, store.name));
    top.append(photo, name);
    const fee = order.fee === null ? '以平台结算为准' : currency(order.fee);
    const lines = [
      ['餐品', store.menu[0][0] + ' · 1 份'],
      ['菜品标价', currency(order.price)],
      ['配送费', order.oldFee ? currency(order.oldFee) + ' → ' + fee : fee]
    ];
    if (order.fee !== null) lines.push(['档案小计', currency(order.price + order.fee)]);
    const menu = button('查看菜单', () => showMenu(order.store, id), 'sheet-button primary');
    show('下单预览', top, details(lines),
      note('河内历史菜单样本。平台实时价格、优惠和送达时间会随地址及下单时段变化。'),
      actions(backButton(), menu));
  }

  function showMenu(id, fromOrder) {
    const store = stores[id];
    const menu = el('div', 'sheet-archive-menu');
    window.wansoNative.appendMenu(menu, id, state.translated[id]);
    const more = button('查看店铺详情', () => go(store.frame), 'sheet-button primary');
    const back = fromOrder ? button('返回下单预览', () => openOrder(fromOrder)) : backButton();
    show('菜单 · ' + menuLanguages[state.translated[id]], paragraph(store.name),
      activeFrame.store ? actions(back) : actions(back, more), menu);
  }

  function menuLanguage(value) {
    const id = activeFrame.id.endsWith('second') ? 'quyen' : 'moc';
    state.menuLanguage[id] = Number(value);
    go(stores[id].frame, false, 'back');
  }

  function translate(id) {
    const menu = activeLayer.querySelector('.ios-menu');
    if (!menu) return;
    state.translated[id] = state.menuLanguage[id];
    const scroll = menu.parentElement;
    const position = scroll.scrollTop;
    menu.remove();
    window.wansoNative.appendMenu(scroll, id, state.translated[id]);
    scroll.scrollTop = position;
    scroll.querySelector('.native-live-message')?.remove();
    const announcement = el('span','native-live-message','菜单已更新，未收录译文的菜品显示原名。');
    announcement.setAttribute('role','status');
    scroll.append(announcement);
  }

  function chooseMenuLanguage(id) {
    show('翻译为', ...menuLanguages.map((language, index) => row(language, '', () => {
      state.menuLanguage[id] = index;
      if (!index) translate(id);
      sheet.close();
    }, state.menuLanguage[id] === index)));
  }

  function search() {
    show('这次想吃什么？', paragraph('把菜品、预算和想比较的店铺数量一起告诉万象。这个原型可以体验一条河内鸡腿河粉搜索。'),
      row(query, '菜单标价不超过 80,000 ₫，可比较两家店及配送费。', () => {
        state.query = query;
        state.history = true;
        go('generating', true);
      }), actions(backButton()));
  }

  const recommendation = '两家店都有鸡腿河粉。Hương Vị Mộc 在 ShopeeFood 的餐品标价为 73,000 ₫。Phở Quyên 在 GrabFood 的餐品标价为 59,000 ₫。两家都在 80,000 ₫ 的餐费预算内，配送费应单独核对。';
  function savedCount() {
    return Object.values(state.group).filter(Boolean).length;
  }

  function collections(id) {
    const heading = id ? '移到收藏夹' : '收藏夹';
    const select = name => {
      if (id) {
        state.group[id] = name;
        sheet.close();
        return;
      }
      const entries = Object.entries(stores).filter(([key]) => state.group[key] && (name === '全部收藏' || state.group[key] === name));
      show(name, ...entries.map(([key, store]) => row(store.name, store.rating, () => go(store.frame))),
        ...(entries.length ? [] : [paragraph('这个收藏夹还没有餐厅。可以从店铺详情收藏，或在收藏页移动已有餐厅。')]),
        actions(backButton('完成'), button('查看收藏夹', () => collections(), 'sheet-button primary')));
    };
    show(heading, paragraph(id ? stores[id].name : '按收藏夹整理已保存的餐厅，之后可直接查看菜单。'),
      ...state.collections.map(name => row(name, id ? '' : (name === '全部收藏' ? savedCount() : Object.values(state.group).filter(g => g === name).length) + ' 家餐厅',
        () => select(name), id && state.group[id] === name)), actions(backButton(), button('新建收藏夹', () => field(
        '新建收藏夹', '给收藏夹起一个容易找到的名字，例如「工作日午餐」。', '', value => {
          if (!state.collections.includes(value)) state.collections.push(value);
          collections(id);
        }, {limit: 18}), 'sheet-button primary')));
  }

  function recentOrders() {
    show('近期订单入口', paragraph('点过的店铺与平台会在这里保留，方便回到本次原型的下单预览。'),
      ...state.recent.map(id => row(stores[orders[id].store].name, orders[id].platform, () => openOrder(id))),
      ...(state.recent.length ? [] : [row('查看两家推荐', '在推荐卡片中选择 Order，查看对应餐品和平台费用。', () => go('recommend'))]),
      actions(backButton()));
  }

  function historySearch() {
    field('搜索会话历史', '按餐品、预算或店铺查找本次浏览的河内样本。', '', keyword => {
      const terms = (query + ' ' + recommendation).toLocaleLowerCase();
      const matches = state.history && terms.includes(keyword.toLocaleLowerCase());
      show('搜索结果', matches ? row(query, '2 条消息 · 河内样本', () => go('recommend')) :
        paragraph(state.history ? '没有找到包含「' + keyword + '」的会话。可以试试「河粉」或「越南盾」。' : '当前没有会话。重新体验首页搜索可添加一条记录。'),
        actions(button('重新搜索', historySearch), backButton()));
    }, {type:'search', submit:'搜索'});
  }

  function clearHistory(all) {
    confirmation(all ? '清除活动历史' : '删除会话', all ?
      '清除本次预览的搜索、收藏、近期订单入口和 AI 对话。此操作无法恢复。' : '删除这条预览会话及其对话记录。此操作无法恢复。',
    '确认清除', () => {
      state.history = false;
      if (all) {
        state.group = {};
        state.recent = [];
      }
      sheet.close();
    });
  }

  function share(value) {
    const store = stores[value];
    const label = store ? store.name : query;
    const summary = store ? [store.rating, store.address, ...store.menu.map(item => item[0] + ' · ' + item[5])].filter(Boolean).join('\n') : recommendation;
    const copy = button('复制内容', async () => {
      try {
        await navigator.clipboard.writeText(label + '\n' + summary);
        copy.textContent = '已复制';
      } catch {
        copy.textContent = '长按上方文字可复制';
      }
    }, 'sheet-button primary');
    show('分享' + (store ? '店铺' : '推荐'), paragraph(label), el('p', 'sheet-copy', summary), actions(backButton(), copy));
  }

  function chooseTheme(value) {
    const [description, dark, accent, surface] = themes[value];
    const swatch = el('div', 'theme-swatches');
    for (const color of [dark, accent, surface]) {
      const block = el('span');
      block.style.background = color;
      swatch.append(block);
    }
    show(value + '主题', paragraph(description), swatch, note('选中的主题会更新到设置预览。'),
      actions(backButton('再看一款'), button('应用主题', () => {
        state.theme = value;
        go('settings', false, 'back');
      }, 'sheet-button primary')));
  }

  function changeLanguage(value = state.appLanguage) {
    show('应用语言', paragraph('选择万象中菜单和设置的显示语言。'), ...appLanguages.map(option =>
      row(option, value === option ? '当前选项' : '', () => changeLanguage(option), value === option)),
    actions(backButton('取消'), button('完成', () => {
      state.appLanguage = value;
      go('settings', false, 'back');
    }, 'sheet-button primary')));
  }

  const accountFields = {
    name: ['昵称', '设置个人资料中显示的称呼。', 'text'],
    email: ['联系邮箱', '正式 App 的邮箱用于身份识别与验证。此处展示本地体验资料。', 'email'],
    phone: ['电话号码', '正式 App 的电话号码用于身份验证。此处仅保存本次预览的示例值。', 'tel'],
    birthday: ['生日', '在个人信息中保存生日。', 'date'],
    address: ['送货地址', '常用送货地址影响附近餐厅和配送费用。可填写一个示例地址。', 'text'],
    start: ['开始免打扰', '选择暂停推送的开始时间。', 'time'],
    end: ['结束免打扰', '选择恢复推送的时间。', 'time']
  };
  function editAccount(key) {
    const [heading, description, type] = accountFields[key];
    field(heading, description, state[key], value => {
      state[key] = value;
      if (type === 'time') state.quiet = true;
      sheet.close();
    }, {type, required: type === 'time' || key === 'name', limit: key === 'name' ? 20 : 100});
  }

  const actionHandlers = {
    order: openOrder,
    translate: id => state.menuLanguage[id] ? translate(id) : chooseMenuLanguage(id),
    chooseMenuLanguage,
    menuLanguage,
    search,
    runSearch: () => {
      if (state.query.trim() !== query) search();
      else {
        state.history = true;
        go('generating', true);
      }
    },
    clearQuery: () => {
      state.query = '';
      const input = activeLayer.querySelector('.native-home-query');
      if (input) {
        input.value = '';
        input.focus({preventScroll:true});
      }
    },
    cities: () => show('选择城市', row('河内 · Hà Nội', '该城市包含本次预览的两家鸡腿河粉店。', () => sheet.close(), true),
      note('推荐以相同的河内示例位置计算，便于对照两家店。'), actions(backButton('完成'))),
    featured: () => show('万象精选', paragraph('根据本次河内菜单样本，查看店铺评分、菜品和配送选项。'),
      ...Object.values(stores).map(store => row(store.name, store.rating, () => go(store.frame))), actions(backButton())),
    toggle,
    budget: value => choices('budget', ['5万以下', '10万以下', '不限'], value),
    mode: value => choices('mode', ['平衡', '距离优先', '价格优先'], value),
    share,
    favorite: id => show('收藏餐厅', paragraph(stores[id].name), state.group[id] ?
      row('已收藏', state.group[id], () => collections(id), true) : row('加入收藏夹', '按常用场景整理餐厅', () => collections(id)),
    actions(backButton(), ...(state.group[id] ? [button('取消收藏', () => actionHandlers.removeSaved(id))] : []))),
    collections: () => collections(),
    moveSaved: collections,
    removeSaved: id => confirmation('移除收藏', '从收藏中移除 ' + stores[id].name + '？', '确认移除', () => {
      delete state.group[id];
      sheet.close();
    }),
    recentOrders,
    historySearch,
    historyClear: () => clearHistory(false),
    activityClear: () => clearHistory(true),
    openHistory: () => state.history ? go('recommend') : search(),
    theme: chooseTheme,
    language: changeLanguage,
    account: editAccount,
    gender: () => show('性别', ...['男', '女', '其他', '不愿透露'].map(value =>
      row(value, state.gender === value ? '当前选项' : '', () => {state.gender = value; sheet.close();}, state.gender === value)), actions(backButton())),
    avatar: () => show('更换头像', paragraph('为此次预览挑选一个头像。'), ...['🧑', '🐱', '🍜', '🥑'].map(value =>
      row(value, state.avatar === value ? '当前头像' : '', () => {state.avatar = value; sheet.close();}, state.avatar === value)),
    actions(backButton())),
    tastes: () => field('添加口味标签', state.tastes.length ? '当前口味 · ' + state.tastes.join('、') : '添加口味偏好或忌口，例如「清淡」或「不吃香菜」。原版最多保存 9 个。',
      '', value => {
        if (!state.tastes.includes(value) && state.tastes.length < 9) state.tastes.push(value);
        show('口味档案', paragraph(state.tastes.join('、')), note('万象会用这些标签补充推荐条件，本次明确提出的要求优先。'),
          actions(backButton('完成'), ...(state.tastes.length < 9 ? [button('继续添加', actionHandlers.tastes, 'sheet-button primary')] : [])));
      }, {limit: 14, submit: '添加'}),
    feedback: () => field('发送反馈', '说说遇到的问题，例如推荐不符合预算、菜品标价异常或店铺信息缺失。', '', value =>
      show('反馈预览', paragraph(value), note('反馈保留在本次浏览中。'), actions(backButton('完成'))), {multiline: true, limit: 500, submit: '预览反馈'}),
    terms: () => show('万象 App 服务条款', paragraph('原版 v1.0 条款摘要。万象提供 AI 生活服务推荐、跨平台比较、推荐理由和第三方平台跳转。'),
      row('交易与售后', '餐品、配送、支付、退款和售后由相应第三方负责。'), actions(backButton('完成'))),
    privacy: () => show('万象 App 隐私政策', paragraph('原版 v1.0 政策摘要。万象会依据输入、偏好、使用历史、位置及公开或授权信息提供推荐。'),
      row('你的信息', '典型信息包括登录资料、搜索内容、饮食偏好与反馈。可在账户与安全中查看个人信息，在应用设置管理匿名数据选项。'),
      actions(backButton('完成'))),
    removeAccount: () => show('删除账号', paragraph('正式 App 的删除操作会永久删除你的万象账号及数据。此处是体验账号，保留账户供后续浏览。'),
      actions(backButton('返回账户'))),
    logout: () => confirmation('退出登录', '结束本轮体验，返回万象首页。', '退出体验', () => go('home', false, 'reset'))
  };

  function register(control, hotspot) {
    if (hotspot.action || hotspot.subtitle || hotspot.menuLocale) controls.set(control, hotspot);
  }

  function paint(layer, frame) {
    for (const control of layer.querySelectorAll('.hotspot')) {
      const h = controls.get(control);
      if (!h) continue;
      control.replaceChildren();
      if (h.action === 'toggle') {
        control.setAttribute('aria-pressed', String(state[h.value]));
        if (h.switch && state[h.value] !== original[h.value]) {
          const indicator = el('span', 'native-switch');
          indicator.dataset.on = String(state[h.value]);
          indicator.setAttribute('aria-hidden', 'true');
          control.append(indicator);
        }
      }
      if (h.menuLocale && state.menuLanguage[h.menuLocale]) {
        control.append(el('span', 'native-value native-menu-language', menuLanguages[state.menuLanguage[h.menuLocale]]));
      }
      const subtitle = state[h.subtitle];
      if (subtitle !== undefined && subtitle !== original[h.subtitle]) {
        const value = el('span', 'native-value', subtitle || '未设置');
        if (h.subtitle === 'start' || h.subtitle === 'end') value.classList.add('native-time');
        if (h.subtitle === 'name') value.classList.add('native-name');
        control.append(value);
      }
    }
    layer.querySelector('.native-list-state')?.remove();
    if (frame.id === 'history' && !state.history) {
      const empty = el('div', 'native-list-state history-state');
      empty.append(el('strong', null, '暂无会话'), paragraph('从首页开始一次新的选餐搜索。'),
        button('返回首页', () => navigate('home', false, 'reset'), 'sheet-button primary'));
      layer.append(empty);
    }
    if (frame.id === 'saved' && savedCount() < 2) {
      const current = el('div', 'native-list-state saved-state');
      const entries = Object.entries(stores).filter(([key]) => state.group[key]);
      current.append(el('strong', null, '全部收藏 · ' + entries.length + ' 家'));
      for (const [, store] of entries) current.append(row(store.name, store.rating, () => navigate(store.frame)));
      if (!entries.length) current.append(paragraph('喜欢的餐厅会保存到这里。'));
      current.append(button('浏览收藏夹', () => {
        activeFrame = frame;
        anchor = document.activeElement;
        collections();
      }));
      layer.append(current);
    }
  }

  return {
    register,
    paint,
    menuLanguage: id => state.translated[id],
    createSearchInput(submit) {
      const input = el('input','native-home-query');
      input.value = state.query;
      input.placeholder = '说说你今天想吃什么';
      input.maxLength = 160;
      input.addEventListener('input',() => {state.query = input.value;});
      input.addEventListener('keydown',event => {
        if (event.key !== 'Enter' || event.isComposing) return;
        event.preventDefault();
        submit();
      });
      return input;
    },
    isOpen: () => sheet.open,
    open(hotspot, frame, screen, transition) {
      activeFrame = frame;
      activeScreen = screen;
      activeLayer = screen.querySelector('.page-layer');
      navigate = transition;
      anchor = document.activeElement;
      actionHandlers[hotspot.action](hotspot.value);
      if (!sheet.open && activeLayer?.isConnected) paint(activeLayer, activeFrame);
    }
  };
})();
