'use strict';

window.wansoControls = (() => {
  const query = '想吃鸡肉河粉，清淡一点，含配送不超过八万越南盾，推荐五家';
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
  const state = {...original, location: {city:'hanoi',label:'河内 · 还剑区',district:'还剑区'}, history: true, collections: ['全部收藏'], recent: loadRecentOrders(), tastes: ['清淡', '鸡肉', '不吃香菜'],
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
  let activeScreen, activeFrame, activeLayer, anchor, navigate, storeSession, locationRequest=0;
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
    locationRequest++;
    if (window.frameElement) parent.removeEventListener('scroll', placeSheet);
    sheet.classList.remove('native-city-sheet','native-collection-sheet','native-avatar-sheet','native-taste-sheet');
    if (storeSession) storeSession.controller.refreshSaved();
    else if (activeLayer?.isConnected) paint(activeLayer, activeFrame);
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
    state[key] = !state[key];
  }

  function openOrder(id) {
    const order = orders[id];
    const store = stores[order.store];
    recordRecentOrder(id);
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

  function runSearch() {
    const text = state.query.trim();
    if (!text) return search();
    window.wansoNative.setQuery(text);
    state.history = true;
    go('generating', true);
  }

  function search() {
    field('这次想吃什么？', '告诉万象这次的预算、口味和人数，推荐后还可以继续追问。', state.query,
      value => { state.query = value; runSearch(); }, {submit:'开始选餐'});
  }

  const locations={hanoi:{name:'河内',district:'还剑区'},hcm:{name:'胡志明市',district:'第一郡'}};
  function saveLocation(city, mode='city') {
    locationRequest++;
    state.location={city,district:locations[city].district,label:mode==='current'?'当前位置 · '+locations[city].name:locations[city].name,mode};
    window.wansoNative.setLocation(state.location);sheet.close();
  }
  function chooseLocation(message='') {
    const request=++locationRequest;
    const introduction=el('div','native-city-intro');
    introduction.append(el('span','native-city-mark','➤'),el('h3','','你在哪里？'),paragraph('选择你的城市，发现附近的美食与优惠。'));
    const gps=cityRow('当前位置','⌖',state.location.mode==='current',()=>{
      if(!navigator.geolocation){chooseLocation('当前浏览器不支持定位，请手动选择城市。');return;}
      gps.disabled=true;gps.querySelector('strong').textContent='正在获取位置…';
      navigator.geolocation.getCurrentPosition(position=>{
        if(request!==locationRequest||!sheet.open)return;
        const {latitude:lat,longitude:lng}=position.coords;
        const city=lat>=20.5&&lat<=21.4&&lng>=105.25&&lng<=106.1?'hanoi':lat>=10.3&&lat<=11.2&&lng>=106.2&&lng<=107.1?'hcm':null;
        if(city)saveLocation(city,'current');else chooseLocation('当前位置不在覆盖范围内。请选择河内或胡志明市继续体验。');
      },error=>{if(request===locationRequest&&sheet.open)chooseLocation(error.code===1?'定位权限未开启。你仍可以手动选择城市。':'暂时无法获取位置，请手动选择城市。');},{timeout:8000,maximumAge:60000});
    });
    show('选择城市',introduction,...(message?[paragraph(message)]:[]),gps,
      cityRow('胡志明市','▦',state.location.city==='hcm'&&state.location.mode!=='current',()=>saveLocation('hcm')),
      cityRow('河内','▤',state.location.city==='hanoi'&&state.location.mode!=='current',()=>saveLocation('hanoi')));
    sheet.classList.add('native-city-sheet');
  }
  function cityRow(name,symbol,selected,action) {
    const choice=button('',action,'native-city-row');choice.setAttribute('aria-pressed',String(selected));
    choice.append(el('span','',symbol),el('strong','',name),el('span','native-choice-check',selected?'✓':''));return choice;
  }
  function dismissStore() {
    if (!storeSession) return;
    const previous=storeSession;storeSession=null;
    if (sheet.open) sheet.close();
    previous.controller.destroy();
    for (const [node,inert] of previous.underlay) node.inert=inert;
    activeScreen?.removeAttribute('data-store-open');
    previous.anchor?.focus({preventScroll:true});
    if (activeFrame?.id==='saved' && activeLayer?.isConnected) paint(activeLayer,activeFrame);
  }
  function catalogStore(value) {
    const {id,request=''}=typeof value==='string'?{id:value}:value;
    const store=window.wansoCatalog.find(item=>item.id===id);
    if (!store) return;
    if (storeSession?.id===id) {if(sheet.open)sheet.close();return;}
    dismissStore();
    if(sheet.open)sheet.close();
    const underlay=[...activeLayer.children].map(node=>[node,node.inert]);
    underlay.forEach(([node])=>{node.inert=true;});
    const origin=document.activeElement;
    const controller=window.wansoStore.mount(activeLayer,store,{request,state,onClose:dismissStore,
      onAction:(action,payload)=>{anchor=document.activeElement;actionHandlers[action](payload);}});
    storeSession={id,request,controller,underlay,anchor:origin};
    activeScreen.setAttribute('data-store-open','true');
    controller.element.querySelector('.native-store-back').focus({preventScroll:true});
    controller.element.addEventListener('keydown',event=>{
      if(sheet.open||controller.element.querySelector('.native-store-language-overlay'))return;
      if(event.key==='Escape'){event.preventDefault();event.stopPropagation();dismissStore();}
      if(event.key==='Tab'){
        const targets=[...controller.element.querySelectorAll('button,[tabindex="0"]')].filter(node=>!node.disabled);
        if(event.shiftKey&&document.activeElement===targets[0]){event.preventDefault();targets.at(-1).focus();}
        else if(!event.shiftKey&&document.activeElement===targets.at(-1)){event.preventDefault();targets[0].focus();}
      }
    });
  }
  function catalogSave({id}) {
    if(state.group[id]) {delete state.group[id];storeSession?.controller.refreshSaved();return;}
    show('保存到收藏夹',...state.collections.map((name,index)=>{
      const choice=button('',()=>{state.group[id]=name;sheet.close();},'native-collection-row');
      choice.append(el('span','',index?'📁':'❤️'),el('strong','',name),el('span','','›'));
      return choice;
    }));
    sheet.classList.add('native-collection-sheet');
  }
  function catalogShare({id}) {
    const store=window.wansoCatalog.find(item=>item.id===id);
    const text=store.name+'\n'+store.dishZh+'\n'+store.description;
    const copy=button('复制餐厅信息',async()=>{
      try{await navigator.clipboard.writeText(text);copy.textContent='已复制';}
      catch{copy.textContent='长按上方文字可复制';}
    },'sheet-button primary');
    show('分享餐厅',el('p','sheet-copy',text),actions(backButton('取消'),copy));
  }
  function catalogOrder(value) {
    const parts=typeof value==='string'?value.split('|'):[];
    const {id,platform,request=''}=typeof value==='string'?{id:parts[0],platform:parts[1],request:decodeURIComponent(parts[2]||'')}:value;
    const store=window.wansoCatalog.find(item=>item.id===id);
    if (!store?.platforms[platform]) return;
    const offer=window.wansoNative.offerFor(store,platform,request);
    const saved=id+'|'+platform+'|'+encodeURIComponent(request);
    recordRecentOrder(saved);
    show('下单预览 · '+offer.name,paragraph(store.name+' · '+store.dishZh),
      details([['份数',offer.quantity+' 份'],['餐品单价',currency(offer.unitPrice)],['餐品小计',currency(offer.price)],['配送费',currency(offer.fee)],['演示优惠','−'+currency(offer.discount)],['合计',currency(offer.total)],['位置',state.location.label]]),
      note('演示费用明细。本页用于比较相同餐品和份量，付款前请以平台结算金额为准。'),
      actions(button('返回菜单',()=>catalogStore({id,request})),button('换到 '+(platform==='grab'?'ShopeeFood':'GrabFood'),()=>catalogOrder({id,platform:platform==='grab'?'shopee':'grab',request}))));
  }

  const recommendation = '餐厅推荐 菜单 费用 配送 预算 越南盾 GrabFood ShopeeFood';
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
      const entries = Object.entries({...stores,...Object.fromEntries(window.wansoCatalog.map(store=>[store.id,store]))}).filter(([key]) => state.group[key] && (name === '全部收藏' || state.group[key] === name));
      show(name, ...entries.map(([key, store]) => row(store.name, store.rating, () => store.id ? catalogStore(store.id) : go(store.frame))),
        ...(entries.length ? [] : [paragraph('这个收藏夹还没有餐厅。可以从店铺详情收藏，或在收藏页移动已有餐厅。')]),
        actions(backButton('完成'), button('查看收藏夹', () => collections(), 'sheet-button primary')));
    };
    show(heading, paragraph(id ? (stores[id]||window.wansoCatalog.find(store=>store.id===id)).name : '按收藏夹整理已保存的餐厅，之后可直接查看菜单。'),
      ...state.collections.map(name => row(name, id ? '' : (name === '全部收藏' ? savedCount() : Object.values(state.group).filter(g => g === name).length) + ' 家餐厅',
        () => select(name), id && state.group[id] === name)), actions(backButton(), button('新建收藏夹', () => field(
        '新建收藏夹', '给收藏夹起一个容易找到的名字，例如「工作日午餐」。', '', value => {
          if (!state.collections.includes(value)) state.collections.push(value);
          collections(id);
        }, {limit: 18}), 'sheet-button primary')));
  }

  function recentOrderData(id) {
    if (orders[id]) {
      const order=orders[id],store=stores[order.store];
      return {id,storeId:order.store,name:store.name,image:'../../assets/wanso/native/'+store.image,
        dish:store.menu[0][0],platform:order.color,platformName:order.platform,quantity:1,
        price:order.price,fee:order.fee,discount:0,total:order.fee===null?null:order.price+order.fee,
        detailAction:'legacyStore',detailValue:store.frame,orderAction:'order'};
    }
    const [storeId,platform,encoded='']=id.split('|');
    const store=window.wansoCatalog.find(item=>item.id===storeId);
    if(!store?.platforms[platform])return null;
    let request;try{request=decodeURIComponent(encoded);}catch{return null;}
    const offer=window.wansoNative.offerFor(store,platform,request);
    return {id,storeId,name:store.name,image:store.image,dish:store.dishZh,platform,platformName:offer.name,
      quantity:offer.quantity,price:offer.price,fee:offer.fee,discount:offer.discount,total:offer.total,
      detailAction:'catalogStore',detailValue:{id:storeId,request},orderAction:'catalogOrder'};
  }
  function loadRecentOrders() {
    const examples=['demo-1|grab|','demo-3|shopee|','demo-6|grab|'];
    try {
      const raw=sessionStorage.getItem('wanso-recent-orders-v1');
      if(raw!==null){const parsed=JSON.parse(raw);if(Array.isArray(parsed))return parsed.filter(id=>typeof id==='string'&&recentOrderData(id)).slice(0,50);}
      sessionStorage.setItem('wanso-recent-orders-v1',JSON.stringify(examples));
    } catch { /* Storage can be unavailable in an embedded preview. */ }
    return examples;
  }
  function setRecentOrders(ids) {
    state.recent=ids;
    try{sessionStorage.setItem('wanso-recent-orders-v1',JSON.stringify(ids));}catch{}
  }
  function recordRecentOrder(id) {
    const record=recentOrderData(id);if(!record)return;
    setRecentOrders([id,...state.recent.filter(key=>recentOrderData(key)?.storeId!==record.storeId)].slice(0,50));
  }
  function recentOrders() {
    const list=el('div','ios-order-list');
    for(const id of state.recent){const record=recentOrderData(id);if(record)list.append(window.wansoPages.recentOrderCard(record,(action,value)=>actionHandlers[action](value)));}
    show('最近订单',note('示例与本次浏览的下单入口记录，未产生实际交易。'),list,
      ...(state.recent.length ? [] : [row('暂无记录', '从餐厅详情打开下单预览后，会在这里保留餐品与平台。')]),
      actions(backButton('完成')));
  }

  function historySearch() {
    field('搜索会话历史', '按餐品、预算或店铺查找本次浏览的会话。', '', keyword => {
      const terms = (state.query + ' ' + recommendation).toLocaleLowerCase();
      const matches = state.history && terms.includes(keyword.toLocaleLowerCase());
      show('搜索结果', matches ? row(state.query, '多轮选餐记录', () => go('recommend')) :
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
        setRecentOrders([]);
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

  function chooseAvatar() {
    const presets=[['🧑','#3b82f6','#8b5cf6'],['🧑‍🍳','#f97316','#ffc84d'],['🐱','#2ec5a7','#60a5fa'],['🐶','#b47a00','#ffd700'],['🐼','#1f2937','#4b5563'],['🦊','#e05a7a','#f97316'],['🥷','#1a0a00','#4a1e0a'],['🤖','#00d4aa','#00ffff'],['👽','#7b6fcc','#a78bfa']];
    const grid=el('div','native-avatar-grid');
    for(const [emoji,from,to] of presets){
      const choice=button(emoji,()=>{if(state.avatarUrl)URL.revokeObjectURL(state.avatarUrl);state.avatarUrl='';state.avatar=emoji;sheet.close();});
      choice.style.background=`linear-gradient(135deg,${from},${to})`;
      choice.setAttribute('aria-label','头像 '+emoji);choice.setAttribute('aria-pressed',String(state.avatar===emoji&&!state.avatarUrl));grid.append(choice);
    }
    const input=el('input');input.type='file';input.accept='image/*';input.hidden=true;
    const upload=button('从相册选择',()=>input.click());
    input.addEventListener('change',()=>{
      const file=input.files?.[0];if(!file)return;
      if(!file.type.startsWith('image/')){upload.textContent='请选择图片文件';return;}
      const url=URL.createObjectURL(file),image=new Image();
      image.onload=()=>{if(state.avatarUrl)URL.revokeObjectURL(state.avatarUrl);state.avatarUrl=url;sheet.close();};
      image.onerror=()=>{URL.revokeObjectURL(url);upload.textContent='无法读取这张照片，请换一张';};image.src=url;
    });
    show('选择头像',upload,input,grid);sheet.classList.add('native-avatar-sheet');
  }
  function addTaste() {
    const emojis=['🌶️','🧂','🍯','🍋','💪','🥗','🍜','🍣','🍕','🍛','🌮','🍝','🍗','🥩','🥘','🍦','🧁','☕','🌙','⚡','💰','🔥','🥬','🌿'];
    const grid=el('div','native-taste-grid'),form=el('form','sheet-form');let selected='';
    const label=el('label','sheet-field','标签名称');const input=el('input');input.maxLength=18;input.required=true;input.placeholder='例如：少油、不吃香菜';label.append(input);
    const submit=el('button','sheet-button primary','添加');submit.type='submit';submit.disabled=true;
    const validate=()=>{submit.disabled=!selected||!input.value.trim()||state.tastes.length>=9;};input.addEventListener('input',validate);
    for(const emoji of emojis){const choice=button(emoji,()=>{selected=emoji;for(const item of grid.children)item.setAttribute('aria-pressed',String(item===choice));validate();});choice.setAttribute('aria-pressed','false');choice.setAttribute('aria-label','标签图标 '+emoji);grid.append(choice);}
    form.append(paragraph('选择图标'),grid,label,actions(backButton('取消'),submit));
    form.addEventListener('submit',event=>{event.preventDefault();const value=input.value.trim();if(!selected||!value||state.tastes.length>=9)return;if(!state.tastes.includes(value))state.tastes.push(value);state.tasteEmojis??={};state.tasteEmojis[value]=selected;sheet.close();});
    show('添加口味标签',paragraph('选择一个图标，并写下你的饮食偏好。最多保存 9 个标签。'),form);sheet.classList.add('native-taste-sheet');
  }

  const actionHandlers = {
    order: openOrder,
    translate: id => state.menuLanguage[id] ? translate(id) : chooseMenuLanguage(id),
    chooseMenuLanguage,
    menuLanguage,
    search,
    runSearch,
    catalogStore,
    catalogOrder,
    catalogSave,
    catalogShare,
    clearQuery: () => {
      state.query = '';
      const input = activeLayer.querySelector('.native-home-query');
      if (input) {
        input.value = '';
        input.focus({preventScroll:true});
      }
    },
    cities: chooseLocation,
    featured: () => window.wansoNative.refreshFeatured(),
    toggle,
    budget: value => {state.budget=value;},
    mode: value => {state.mode=value;},
    share,
    favorite: id => show('收藏餐厅', paragraph(stores[id].name), state.group[id] ?
      row('已收藏', state.group[id], () => collections(id), true) : row('加入收藏夹', '按常用场景整理餐厅', () => collections(id)),
    actions(backButton(), ...(state.group[id] ? [button('取消收藏', () => actionHandlers.removeSaved(id))] : []))),
    collections: () => collections(),
    moveSaved: collections,
    removeSaved: id => confirmation('移除收藏', '从收藏中移除 ' + (stores[id]||window.wansoCatalog.find(store=>store.id===id)).name + '？', '确认移除', () => {
      delete state.group[id];
      sheet.close();
    }),
    recentOrders,
    legacyStore: frame=>go(frame),
    historySearch,
    historyClear: () => clearHistory(false),
    activityClear: () => clearHistory(true),
    openHistory: () => state.history ? go('recommend') : search(),
    theme: chooseTheme,
    language: changeLanguage,
    account: editAccount,
    gender: () => show('性别', ...['男', '女', '其他', '不愿透露'].map(value =>
      row(value, state.gender === value ? '当前选项' : '', () => {state.gender = value; sheet.close();}, state.gender === value)), actions(backButton())),
    avatar: chooseAvatar,
    tastes: addTaste,
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
      if (h.action==='budget'||h.action==='mode') {
        control.classList.add('native-choice-chip');control.dataset.choice=h.value;
        control.setAttribute('aria-pressed',String(state[h.action]===h.value));
        control.textContent=h.value;
      }
      if (h.action === 'toggle') {
        control.setAttribute('aria-pressed', String(state[h.value]));
        if (h.value === 'grab' || h.value === 'shopee') {
          control.classList.add('native-membership-choice');
          control.dataset.platform=h.value;
          const indicator = el('span', 'native-membership-check');
          indicator.dataset.on = String(state[h.value]);
          indicator.dataset.platform = h.value;
          indicator.setAttribute('aria-hidden', 'true');
          control.append(indicator);
        }
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
    if (frame.id==='notifications') {
      const childKeys=['offers','priceDrop','newPlaces','delivery','digest'];
      for(const control of layer.querySelectorAll('.hotspot')){
        const h=controls.get(control);
        control.disabled=Boolean(h && ((childKeys.includes(h.value)&&!state.push)||(['start','end'].includes(h.value)&&!state.quiet)));
      }
    }
    const livePage = layer.querySelector('.ios-data-page');
    if (livePage) { livePage.refreshContent(); return; }
    layer.querySelector('.native-list-state')?.remove();
    if (frame.id === 'history' && !state.history) {
      const empty = el('div', 'native-list-state history-state');
      empty.append(el('strong', null, '暂无会话'), paragraph('从首页开始一次新的选餐搜索。'),
        button('返回首页', () => navigate('home', false, 'reset'), 'sheet-button primary'));
      layer.append(empty);
    }
    if (frame.id === 'saved' && savedCount() < 2) {
      const current = el('div', 'native-list-state saved-state');
      const entries = Object.entries({...stores,...Object.fromEntries(window.wansoCatalog.map(store=>[store.id,store]))}).filter(([key]) => state.group[key]);
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
    viewState: () => state,
    recentOrderData,
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
    dismissStore,
    isOpen: () => sheet.open || Boolean(storeSession),
    open(hotspot, frame, screen, transition) {
      activeFrame = frame;
      activeScreen = screen;
      activeLayer = screen.querySelector('.page-layer');
      navigate = transition;
      anchor = document.activeElement;
      actionHandlers[hotspot.action](hotspot.value);
      if (!sheet.open && !storeSession && activeLayer?.isConnected) paint(activeLayer, activeFrame);
    }
  };
})();
