'use strict';

window.wansoControls = (() => {
  const t = value => window.wansoI18n?.text(value) ?? value;
  const query = t('Muốn ăn phở gà thanh đạm, tổng tiền cả giao hàng không quá 80.000đ, gợi ý 5 quán.');
  const stores = {
    moc: {
      name: 'Phở Gà Hương Vị Mộc - Thái Thịnh', frame: 'store-first', rating: '4,6 · 1.000 đánh giá',
      image: 'order-moc.webp', address: '110C2 Tập Thể Vĩnh Hồ, P. Thịnh Quang, Đống Đa, Hà Nội',
      menu: [
        ['Phở gà đùi', 'Chicken thigh pho', '鸡腿汤河粉', '鶏もも肉のフォー', '닭다리살 쌀국수', 'ShopeeFood 73,000 ₫ · GrabFood 68,000 ₫'],
        ['Phở trộn gà đùi', 'Mixed pho with chicken thigh', '鸡腿拌河粉', '鶏もも肉の和えフォー', '닭다리살 비빔 쌀국수', 'ShopeeFood 79,000 ₫ · GrabFood 71,000 ₫']
      ]
    },
    quyen: {
      name: 'Phở Quyên - Phở gà trộn đặc biệt', frame: 'store-second', rating: '4,4 · 741 đánh giá',
      image: 'order-quyen.webp',
      menu: [
        ['Phở gà đùi nước', 'Chicken thigh pho soup', '鸡腿汤河粉', '鶏もも肉のスープフォー', '닭다리살 국물 쌀국수', 'GrabFood 59,000 ₫']
      ]
    }
  };

  const archiveStores=new Map();
  function storeFor(id) {
    const catalog=window.wansoCatalog.find(item=>item.id===id);
    if(catalog)return catalog;
    if(archiveStores.has(id))return archiveStores.get(id);
    const source=window.wansoNative.restaurants()?.[id];
    if(!source)return null;
    const known=stores[id];
    const menu=source.menu.flatMap(group=>group.items.map(([name,price,description])=>({
      name,price,description:description||'',category:group.title,
      translations:Object.fromEntries(['vi','en','zh','ja','ko'].map((language,index)=>{
        const translation=known.menu.find(item=>item[0]===name);
        return [language,translation?.[[0,1,2,3,4][index]]||name];
      }))
    })));
    const first=menu.findIndex(item=>item.name===source.dish);
    if(first>0)menu.unshift(...menu.splice(first,1));
    // Historical menus have incomplete delivery quotes; missing quotes are explicit example values.
    const platforms=id==='moc'?{
      grab:{name:'GrabFood',price:68000,fee:40000},
      shopee:{name:'ShopeeFood',price:73000,fee:12000}
    }:{
      grab:{name:'GrabFood',price:59000,fee:24000,promotion:{delivery:{minSpend:0,amount:12000}}},
      shopee:{name:'ShopeeFood',price:61000,fee:10000}
    };
    const store={id,name:source.name,key:'pho',city:'hanoi',district:id==='moc'?'Đống Đa':'Hoàn Kiếm',
      image:'../../assets/wanso/native/'+source.photo,imageAlt:'Món ăn tại quán',
      dish:source.dish,dishZh:source.dish,
      rating:source.rating,reviewCount:source.review_count,distance:source.distance,category:'Món Việt · Phở nước',
      tags:['Thịt gà','Món nước nóng','Thực đơn'],address:id==='moc'?'Thái Thịnh · Đống Đa · Hà Nội':'Hoàn Kiếm · Hà Nội',
      description:'Phở gà với nước dùng nóng, thịt gà và rau thơm; có thể xem từng món trong thực đơn để chọn đúng khẩu vị.',
      reason:'🍜 Một tô phở gà nóng phù hợp khi bạn muốn ăn thanh nhẹ. Có thể ghi chú để riêng rau thơm và ớt. So sánh hai nền tảng theo cùng món, cùng số phần; mở chi tiết để xem điều kiện ưu đãi trước khi chọn.',
      menu,platforms,sample:true};
    if(menu[0])menu[0].prices={grab:platforms.grab.price,shopee:platforms.shopee.price};
    for(const key of Object.keys(platforms))Object.assign(platforms[key],window.wansoOffers.calculate(store,key,1));
    archiveStores.set(id,store);return store;
  }

  const orders = {
    'moc-shopee': {store: 'moc', platform: 'ShopeeFood', price: 73000, fee: null, color: 'shopee'},
    'moc-grab': {store: 'moc', platform: 'GrabFood', price: 68000, fee: 40000, color: 'grab'},
    'quyen-grab': {store: 'quyen', platform: 'GrabFood', price: 59000, fee: 12000, oldFee: 24000, color: 'grab'}
  };
  const menuLanguages = ['Bản gốc', 'Tiếng Anh', 'Tiếng Việt', 'Tiếng Trung', 'Tiếng Nhật', 'Tiếng Hàn'];
  const appLanguages = ['跟随系统', 'English', 'Tiếng Việt', '中文'];
  const displayLabels = {
    森林:'Rừng', 海洋:'Đại dương', 薰衣草:'Oải hương', 日落:'Hoàng hôn', 午夜:'Đêm', 赛博:'Cyber',
    平衡:'Cân bằng', 距离优先:'Gần nhất', 价格优先:'Tiết kiệm',
    '5万以下':'Dưới 50.000đ', '10万以下':'Dưới 100.000đ', 不限:'Không giới hạn', 跟随系统:'Theo hệ thống', 中文:'Tiếng Trung', English:'Tiếng Anh', 日本語:'Tiếng Nhật', 한국어:'Tiếng Hàn'
  };
  const displayValue = value => displayLabels[value] || value;
  const themes = {
    森林: ['Xanh lá đậm và sắc cây cỏ', '#15463a', '#43b789', '#e4f3e9'],
    海洋: ['Xanh biển tươi và xanh nhạt dịu', '#193e78', '#4179da', '#e8f2ff'],
    薰衣草: ['Tím dịu và sắc oải hương', '#50337c', '#9773e8', '#f1e9fa'],
    日落: ['Cam ấm và màu mơ nhạt', '#85401e', '#e89148', '#fff1e4'],
    午夜: ['Nền tối cùng xanh bạc hà', '#163d42', '#5bc2a7', '#d7eee8'],
    赛博: ['Nền tối cùng xanh neon', '#12392b', '#51e881', '#e0ffe7']
  };
  const preferences = {
    grab: ['GrabUnlimited', 'Gói khoảng 49.000đ/tháng. Tính ưu đãi giao hàng của hội viên GrabFood khi so sánh.'],
    shopee: ['ShopeeFood+', 'Gói khoảng 39.000đ/tháng. Tính mã miễn giảm phí giao của hội viên ShopeeFood khi so sánh.'],
    budget: ['Ngân sách mặc định', 'Ngân sách thường dùng cho lần gợi ý tiếp theo. Nếu yêu cầu tìm kiếm nêu ngân sách riêng, mức đó được ưu tiên.'],
    mode: ['Cách AI gợi ý', 'Cân bằng giá và khoảng cách; ưu tiên quán gần hoặc tổng tiền thấp tùy nhu cầu của bạn.'],
    haptics: ['Phản hồi rung', 'Rung nhẹ khi chuyển lựa chọn trên thiết bị hỗ trợ.'],
    analytics: ['Chia sẻ dữ liệu ẩn danh', 'Cho phép chia sẻ dữ liệu ẩn danh để cải thiện trải nghiệm ứng dụng.'],
    push: ['Thông báo', 'Bật hoặc tắt thông báo từ Wanso.'],
    offers: ['Ưu đãi mới', 'Thông báo chương trình giảm giá và ưu đãi có thời hạn.'],
    priceDrop: ['Giảm giá', 'Nhận tin khi quán đã lưu có giá tốt hơn.'],
    newPlaces: ['Quán mới gần bạn', 'Nhận tin khi có quán mới trong khu vực.'],
    delivery: ['Trạng thái giao hàng', 'Các thông báo xác nhận đơn, đang giao và đã giao.'],
    digest: ['Tổng hợp AI hằng tuần', 'Tổng hợp từ Wanso vào sáng thứ Hai hằng tuần.'],
    quiet: ['Không làm phiền', 'Tạm dừng thông báo trong khoảng thời gian đã chọn.'],
    compareAll: ['So sánh các nền tảng', 'Cân nhắc cả GrabFood và ShopeeFood khi tìm quán phù hợp.']
  };
  const original = {
    name: 'Bạn của Wanso', avatar: '🧑', appLanguage: window.wansoI18n?.chinese ? '中文' : 'Tiếng Việt', theme: '海洋',
    grab: false, shopee: false, budget: '10万以下', mode: '平衡',
    haptics: true, analytics: true, push: true, offers: true, priceDrop: true,
    newPlaces: false, delivery: true, digest: false, quiet: false, compareAll: true,
    start: '22:00', end: '08:00', email: 'demo@wanso.example',
    phone: '', birthday: '', gender: '', address: '', query
  };
  const state = {...original, location: window.wansoLocation.restore() || {city:'hanoi',label:'Hà Nội · Hoàn Kiếm',district:'Hoàn Kiếm'}, history: true, collections: ['Tất cả'], recent: loadRecentOrders(), tastes: ['Thanh đạm', 'Thịt gà', 'Không rau mùi'],
    group: {moc: 'Tất cả', quyen: 'Tất cả'}, menuLanguage: {moc: 0, quyen: 0}, translated: {moc: 0, quyen: 0}};
  window.wansoNative.setLocation(state.location);
  const currency = number => number.toLocaleString(window.wansoI18n?.locale||'vi-VN') + 'đ';
  const el = (tag, className, value) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined) node.textContent = t(value);
    return node;
  };

  const sheet = el('dialog', 'wanso-sheet');
  sheet.setAttribute('aria-labelledby', 'wanso-sheet-title');
  const header = el('header', 'sheet-header');
  const title = el('h2');
  title.id = 'wanso-sheet-title';
  const closeButton = el('button', 'sheet-close', '×');
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', t('Đóng'));
  closeButton.addEventListener('click', () => sheet.close());
  header.append(title, closeButton);
  const content = el('div', 'sheet-content');
  sheet.append(header, content);
  document.body.append(sheet);
  let activeScreen, activeFrame, activeLayer, anchor, navigate, storeSession, suppressClose=false, locationCleanup;
  const controls = new WeakMap();

  function placeSheet() {
    if (!sheet.open) return;
    const box = activeScreen.getBoundingClientRect();
    const frameBox = window.frameElement?.getBoundingClientRect();
    const parentHeader = frameBox && parent.document.querySelector('body > header')?.getBoundingClientRect().bottom;
    const visibleTop = frameBox ? Math.max(0, (parentHeader || 0) - frameBox.top) : (window.visualViewport?.offsetTop || 0);
    const visibleBottom = frameBox ? Math.min(innerHeight, parent.innerHeight - frameBox.top) : Math.min(innerHeight,visibleTop+(window.visualViewport?.height || innerHeight));
    const top = Math.max(visibleTop + 6, box.top + 45);
    const bottom = Math.min(visibleBottom - 6, box.bottom - 10);
    sheet.style.left = (box.left + 6) + 'px';
    sheet.style.width = Math.max(1, box.width - 12) + 'px';
    sheet.style.bottom = (innerHeight - bottom) + 'px';
    sheet.style.maxHeight = Math.max(130, bottom - top) + 'px';
  }

  const sheetResize=new ResizeObserver(placeSheet);
  window.addEventListener('resize', () => requestAnimationFrame(placeSheet));
  window.visualViewport?.addEventListener('resize', placeSheet);
  window.addEventListener('scroll', placeSheet, {passive: true});
  sheet.addEventListener('click', event => {
    if (event.target !== sheet) return;
    const box = sheet.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right ||
      event.clientY < box.top || event.clientY > box.bottom) sheet.close();
  });
  function clearLocation() { locationCleanup?.();locationCleanup=null;sheet.classList.remove('native-location-sheet'); }
  sheet.addEventListener('close', () => {
    if(suppressClose){suppressClose=false;return;}
    if(sheet.open)return;
    clearLocation();sheetResize.disconnect();
    if (window.frameElement) parent.removeEventListener('scroll', placeSheet);
    sheet.classList.remove('native-city-sheet','native-collection-sheet','native-avatar-sheet','native-taste-sheet');
    if (storeSession) storeSession.controller.refreshSaved();
    else if (activeLayer?.isConnected) paint(activeLayer, activeFrame);
    anchor?.focus({preventScroll: true});
  });

  function show(heading, ...nodes) {
    clearLocation();
    title.textContent = t(heading);
    content.replaceChildren(...nodes);
    content.scrollTop = 0;
    if (!sheet.open) {
      sheet.showModal();
      sheetResize.observe(activeScreen);
      placeSheet();
      if (window.frameElement) parent.addEventListener('scroll', placeSheet, {passive: true});
    }
  }

  function go(id, search = false, mode = 'forward') {
    dismissAll();
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
  function backButton(label = 'Quay lại') { return button(label, () => sheet.close()); }

  function confirmation(heading, message, label, accept) {
    show(heading, paragraph(message), actions(backButton('Hủy'), button(label, accept, 'sheet-button danger')));
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
    const submit = el('button', 'sheet-button primary', options.submit || 'Lưu');
    submit.type = 'submit';
    form.append(label, actions(backButton('Hủy'), submit));
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
    const order=orders[id];
    if(order)catalogOrder({id:order.store,platform:order.color});
  }

  function showMenu(id) { catalogStore({id,section:'.native-store-menu'}); }

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
    const announcement = el('span','native-live-message','Đã cập nhật thực đơn. Món chưa có bản dịch giữ nguyên tên gốc.');
    announcement.setAttribute('role','status');
    scroll.append(announcement);
  }

  function chooseMenuLanguage(id) {
    show('Dịch sang', ...menuLanguages.map((language, index) => row(language, '', () => {
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
    field('Lần này bạn muốn ăn gì?', 'Cho Wanso biết ngân sách, khẩu vị và số người. Bạn có thể hỏi tiếp để điều chỉnh gợi ý.', state.query,
      value => { state.query = value; runSearch(); }, {submit:'Tìm món phù hợp'});
  }

  function chooseLocation() {
    show('Chọn vị trí');
    sheet.classList.add('native-location-sheet');
    locationCleanup=window.wansoLocation.mount(content,state.location,value=>{
      state.location=value;
      window.wansoNative.setLocation(value);
      sheet.close();
    });
    placeSheet();
  }
  function dismissStore() {
    if (!storeSession) return;
    const previous=storeSession;storeSession=null;
    if (sheet.open) sheet.close();
    previous.controller.destroy();
    for (const [node,inert,visibility,clipPath] of previous.underlay) {node.inert=inert;node.style.visibility=visibility;node.style.clipPath=clipPath;}
    activeScreen?.removeAttribute('data-store-open');
    previous.anchor?.focus({preventScroll:true});
    if (activeFrame?.id==='saved' && activeLayer?.isConnected) paint(activeLayer,activeFrame);
  }
  function dismissAll() {
    clearLocation();sheetResize.disconnect();
    if(sheet.open){suppressClose=true;sheet.close();}
    if(window.frameElement)parent.removeEventListener('scroll',placeSheet);
    sheet.classList.remove('native-city-sheet','native-collection-sheet','native-avatar-sheet','native-taste-sheet');
    dismissStore();
  }
  function catalogStore(value) {
    const {id,request='',framed=false,section='',languagePicker=false}=typeof value==='string'?{id:value}:value;
    const store=storeFor(id);
    if (!store) return;
    if (storeSession?.id===id && storeSession.request===request) {
      if(sheet.open)sheet.close();
      if(section)storeSession.controller.scrollToSection(section);
      if(languagePicker&&!storeSession.controller.element.querySelector('.native-store-language-overlay'))storeSession.controller.element.querySelector('.native-store-choose-language').click();
      return;
    }
    dismissStore();
    if(sheet.open)sheet.close();
    const underlay=[...activeLayer.children].map(node=>[node,node.inert,node.style.visibility,node.style.clipPath]);
    underlay.forEach(([node])=>{node.inert=true;if(node.classList.contains('original-screen'))node.style.clipPath='inset(0 0 92.9% 0)';else node.style.visibility='hidden';});
    const origin=document.activeElement;
    const controller=window.wansoStore.mount(activeLayer,store,{request,state,onClose:()=>{dismissStore();if(framed)navigate('recommend',false,'back');},
      onAction:(action,payload)=>{anchor=document.activeElement;actionHandlers[action](payload);}});
    storeSession={id,request,controller,underlay,anchor:origin};
    activeScreen.setAttribute('data-store-open','true');
    controller.element.querySelector('.native-store-back').focus({preventScroll:true});
    if(section)controller.scrollToSection(section);
    if(languagePicker)controller.element.querySelector('.native-store-choose-language').click();
    controller.element.addEventListener('keydown',event=>{
      if(sheet.open||controller.element.querySelector('.native-store-language-overlay'))return;
      if(event.key==='Escape'){event.preventDefault();event.stopPropagation();controller.element.querySelector('.native-store-back').click();}
      if(event.key==='Tab'){
        const targets=[...controller.element.querySelectorAll('button,[tabindex="0"]')].filter(node=>!node.disabled);
        if(event.shiftKey&&document.activeElement===targets[0]){event.preventDefault();targets.at(-1).focus();}
        else if(!event.shiftKey&&document.activeElement===targets.at(-1)){event.preventDefault();targets[0].focus();}
      }
    });
  }
  function catalogSave({id}) {
    if(state.group[id]) {delete state.group[id];storeSession?.controller.refreshSaved();return;}
    show('Lưu vào bộ sưu tập',...state.collections.map((name,index)=>{
      const choice=button('',()=>{state.group[id]=name;sheet.close();},'native-collection-row');
      choice.append(el('span','',index?'📁':'❤️'),el('strong','',name),el('span','','›'));
      return choice;
    }));
    sheet.classList.add('native-collection-sheet');
  }
  function catalogShare({id}) {
    const store=storeFor(id);
    const text=store.name+'\n'+store.dishZh+'\n'+store.description;
    const copy=button('Sao chép thông tin quán',async()=>{
      try{await navigator.clipboard.writeText(text);copy.textContent=t('Đã sao chép');}
      catch{copy.textContent=t('Nhấn giữ nội dung phía trên để sao chép');}
    },'sheet-button primary');
    show('Chia sẻ quán',el('p','sheet-copy',text),actions(backButton('Hủy'),copy));
  }
  function catalogOrder(value) {
    if(typeof value==='string'&&orders[value])return openOrder(value);
    const parts=typeof value==='string'?value.split('|'):[];
    const {id,platform,request=''}=typeof value==='string'?{id:parts[0],platform:parts[1],request:decodeURIComponent(parts[2]||'')}:value;
    const store=storeFor(id);
    if (!store?.platforms[platform]) return;
    const offer=window.wansoNative.offerFor(store,platform,request);
    const saved=id+'|'+platform+'|'+encodeURIComponent(request);
    recordRecentOrder(saved);
    show('Chi tiết đơn · '+offer.name,paragraph(store.name+' · '+store.dishZh),
      details([['Số phần',offer.quantity+' phần'],['Đơn giá món',currency(offer.unitPrice)],['Tạm tính món',currency(offer.price)],['Quán giảm',(offer.merchantDiscount?'−':'')+currency(offer.merchantDiscount)],['Mã nền tảng',(offer.couponDiscount?'−':'')+currency(offer.couponDiscount)],['Phí giao hàng',currency(offer.originalFee)],['Giảm phí giao',(offer.deliveryDiscount?'−':'')+currency(offer.deliveryDiscount)],['Tổng cộng',currency(offer.total)],['Vị trí',state.location.label]]),
      paragraph(offer.couponName?'Đã áp dụng: '+offer.couponName+' · '+offer.couponTerms:'Đơn này chưa áp dụng mã giảm giá của nền tảng.'),
      note(offer.qualification),
      ...offer.terms.map(term=>paragraph(term)),
      ...offer.unavailable.map(term=>note(term)),
      note('Chi phí được tính theo các điều kiện ưu đãi đang hiển thị, chưa phải báo giá trực tiếp. So sánh cùng món và số phần; số tiền cuối cùng được xác nhận tại trang thanh toán của nền tảng.'),
      actions(button('Về thực đơn',()=>catalogStore({id,request})),button('Chuyển sang '+(platform==='grab'?'ShopeeFood':'GrabFood'),()=>catalogOrder({id,platform:platform==='grab'?'shopee':'grab',request}))));
  }

  const recommendation = 'gợi ý quán phở gà thực đơn chi phí giao hàng ngân sách đồng GrabFood ShopeeFood';
  function savedCount() {
    return Object.values(state.group).filter(Boolean).length;
  }

  function collections(id) {
    const heading = id ? 'Chuyển vào bộ sưu tập' : 'Bộ sưu tập';
    const select = name => {
      if (id) {
        state.group[id] = name;
        sheet.close();
        return;
      }
      const entries=Object.keys(state.group).filter(key=>state.group[key]&&(name==='Tất cả'||state.group[key]===name)).map(key=>[key,storeFor(key)]).filter(([,store])=>store);
      show(name, ...entries.map(([key, store]) => row(store.name, String(store.rating), () => catalogStore(key))),
        ...(entries.length ? [] : [paragraph('Bộ sưu tập chưa có quán. Lưu quán từ trang chi tiết hoặc chuyển quán đã lưu vào đây.')]),
        actions(backButton('Xong'), button('Xem bộ sưu tập', () => collections(), 'sheet-button primary')));
    };
    show(heading, paragraph(id ? storeFor(id).name : 'Sắp xếp quán đã lưu thành bộ sưu tập để lần sau mở thực đơn nhanh hơn.'),
      ...state.collections.map(name => row(name, id ? '' : (name === 'Tất cả' ? savedCount() : Object.values(state.group).filter(g => g === name).length) + ' quán',
        () => select(name), id && state.group[id] === name)), actions(backButton(), button('Tạo bộ sưu tập', () => field(
        'Tạo bộ sưu tập', 'Đặt tên dễ nhớ, chẳng hạn “Bữa trưa đi làm”.', '', value => {
          if (!state.collections.includes(value)) state.collections.push(value);
          collections(id);
        }, {limit: 36}), 'sheet-button primary')));
  }

  function recentOrderData(id) {
    if(orders[id]){const order=orders[id];return {...recentOrderData(order.store+'|'+order.color+'|'),id};}
    const [storeId,platform,encoded='']=id.split('|');
    const store=storeFor(storeId);
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
      if(raw!==null){const parsed=JSON.parse(raw);if(Array.isArray(parsed))return parsed.filter(id=>typeof id==='string'&&(orders[id]||/^demo-\d+\|(grab|shopee)\|/.test(id))).slice(0,50);}
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
    show('Đơn gần đây',note('Lưu món, nền tảng và chi phí để xem lại thuận tiện. Thao tác này không thanh toán hoặc tạo đơn thực tế.'),list,
      ...(state.recent.length ? [] : [row('Chưa có lịch sử', 'Mở chi tiết đơn tại trang quán để lưu món và nền tảng tại đây.')]),
      actions(backButton('Xong')));
  }

  function historySearch() {
    field('Tìm cuộc trò chuyện', 'Tìm cuộc trò chuyện theo món, ngân sách hoặc tên quán.', '', keyword => {
      const normalize = text => text.toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
      const terms = normalize(state.query + ' ' + recommendation);
      const matches = state.history && terms.includes(normalize(keyword));
      show('Kết quả tìm kiếm', matches ? row(state.query, 'Cuộc trò chuyện chọn món', () => go('recommend')) :
        paragraph(state.history ? 'Không tìm thấy cuộc trò chuyện chứa “' + keyword + '”. Thử tìm “phở” hoặc “đồng”.' : 'Chưa có cuộc trò chuyện. Tìm món ở trang chủ để bắt đầu.'),
        actions(button('Tìm lại', historySearch), backButton()));
    }, {type:'search', submit:'Tìm kiếm'});
  }

  function clearHistory(all) {
    confirmation(all ? 'Xóa lịch sử hoạt động' : 'Xóa cuộc trò chuyện', all ?
      'Xóa lịch sử tìm kiếm, quán đã lưu, đơn gần đây và cuộc trò chuyện AI trên thiết bị này. Không thể khôi phục thao tác này.' : 'Xóa cuộc trò chuyện này cùng toàn bộ nội dung. Không thể khôi phục thao tác này.',
    'Xác nhận xóa', () => {
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
    const copy = button('Sao chép nội dung', async () => {
      try {
        await navigator.clipboard.writeText(label + '\n' + summary);
        copy.textContent = t('Đã sao chép');
      } catch {
        copy.textContent = t('Nhấn giữ nội dung phía trên để sao chép');
      }
    }, 'sheet-button primary');
    show('Chia sẻ ' + (store ? 'quán' : 'gợi ý'), paragraph(label), el('p', 'sheet-copy', summary), actions(backButton(), copy));
  }

  function chooseTheme(value) {
    const [description, dark, accent, surface] = themes[value];
    const swatch = el('div', 'theme-swatches');
    for (const color of [dark, accent, surface]) {
      const block = el('span');
      block.style.background = color;
      swatch.append(block);
    }
    show('Giao diện ' + displayValue(value), paragraph(description), swatch, note('Giao diện đã chọn sẽ được áp dụng trong cài đặt.'),
      actions(backButton('Xem kiểu khác'), button('Áp dụng giao diện', () => {
        state.theme = value;
        go('settings', false, 'back');
      }, 'sheet-button primary')));
  }

  function changeLanguage(value = state.appLanguage) {
    show('Ngôn ngữ ứng dụng', paragraph('Chọn ngôn ngữ hiển thị cho thực đơn và cài đặt Wanso.'), ...appLanguages.map(option =>
      row(displayValue(option), value === option ? 'Đang chọn' : '', () => changeLanguage(option), value === option)),
    actions(backButton('Hủy'), button('Xong', () => {
      state.appLanguage = value;
      go('settings', false, 'back');
    }, 'sheet-button primary')));
  }

  const accountFields = {
    name: ['Tên hiển thị', 'Tên bạn muốn hiển thị trong hồ sơ.', 'text'],
    email: ['Email liên hệ', 'Email dùng để nhận diện và xác minh tài khoản. Thay đổi ở đây được lưu cho phiên sử dụng hiện tại.', 'email'],
    phone: ['Số điện thoại', 'Số điện thoại dùng để xác minh tài khoản. Thay đổi ở đây được lưu cho phiên sử dụng hiện tại.', 'tel'],
    birthday: ['Ngày sinh', 'Lưu ngày sinh trong thông tin cá nhân.', 'date'],
    address: ['Địa chỉ giao hàng', 'Nhập địa chỉ thường dùng để tham khảo khi tìm quán và so sánh phí giao.', 'text'],
    start: ['Bắt đầu không làm phiền', 'Chọn giờ bắt đầu tạm dừng thông báo.', 'time'],
    end: ['Kết thúc không làm phiền', 'Chọn giờ nhận thông báo trở lại.', 'time']
  };
  function editAccount(key) {
    const [heading, description, type] = accountFields[key];
    field(heading, description, state[key], value => {
      state[key] = value;
      if (type === 'time') state.quiet = true;
      sheet.close();
    }, {type, required: type === 'time' || key === 'name', limit: key === 'name' ? 40 : 100});
  }

  function chooseAvatar() {
    const presets=[['🧑','#3b82f6','#8b5cf6'],['🧑‍🍳','#f97316','#ffc84d'],['🐱','#2ec5a7','#60a5fa'],['🐶','#b47a00','#ffd700'],['🐼','#1f2937','#4b5563'],['🦊','#e05a7a','#f97316'],['🥷','#1a0a00','#4a1e0a'],['🤖','#00d4aa','#00ffff'],['👽','#7b6fcc','#a78bfa']];
    const grid=el('div','native-avatar-grid');
    for(const [emoji,from,to] of presets){
      const choice=button(emoji,()=>{if(state.avatarUrl)URL.revokeObjectURL(state.avatarUrl);state.avatarUrl='';state.avatar=emoji;sheet.close();});
      choice.style.background=`linear-gradient(135deg,${from},${to})`;
      choice.setAttribute('aria-label',t('Ảnh đại diện '+emoji));choice.setAttribute('aria-pressed',String(state.avatar===emoji&&!state.avatarUrl));grid.append(choice);
    }
    const input=el('input');input.type='file';input.accept='image/*';input.hidden=true;
    const upload=button('Chọn từ thư viện',()=>input.click());
    input.addEventListener('change',()=>{
      const file=input.files?.[0];if(!file)return;
      if(!file.type.startsWith('image/')){upload.textContent=t('Vui lòng chọn tệp hình ảnh');return;}
      const url=URL.createObjectURL(file),image=new Image();
      image.onload=()=>{if(state.avatarUrl)URL.revokeObjectURL(state.avatarUrl);state.avatarUrl=url;sheet.close();};
      image.onerror=()=>{URL.revokeObjectURL(url);upload.textContent=t('Không thể mở ảnh này. Hãy chọn ảnh khác.');};image.src=url;
    });
    show('Chọn ảnh đại diện',upload,input,grid);sheet.classList.add('native-avatar-sheet');
  }
  function addTaste() {
    const emojis=['🌶️','🧂','🍯','🍋','💪','🥗','🍜','🍣','🍕','🍛','🌮','🍝','🍗','🥩','🥘','🍦','🧁','☕','🌙','⚡','💰','🔥','🥬','🌿'];
    const grid=el('div','native-taste-grid'),form=el('form','sheet-form');let selected='';
    const label=el('label','sheet-field','Tên sở thích');const input=el('input');input.maxLength=36;input.required=true;input.placeholder=t('Ví dụ: Ít dầu, không rau mùi');label.append(input);
    const submit=el('button','sheet-button primary','Thêm');submit.type='submit';submit.disabled=true;
    const validate=()=>{submit.disabled=!selected||!input.value.trim()||state.tastes.length>=9;};input.addEventListener('input',validate);
    for(const emoji of emojis){const choice=button(emoji,()=>{selected=emoji;for(const item of grid.children)item.setAttribute('aria-pressed',String(item===choice));validate();});choice.setAttribute('aria-pressed','false');choice.setAttribute('aria-label',t('Biểu tượng sở thích '+emoji));grid.append(choice);}
    form.append(paragraph('Chọn biểu tượng'),grid,label,actions(backButton('Hủy'),submit));
    form.addEventListener('submit',event=>{event.preventDefault();const value=input.value.trim();if(!selected||!value||state.tastes.length>=9)return;if(!state.tastes.includes(value))state.tastes.push(value);state.tasteEmojis??={};state.tasteEmojis[value]=selected;sheet.close();});
    show('Thêm khẩu vị',paragraph('Chọn biểu tượng và ghi sở thích ăn uống của bạn. Lưu tối đa 9 sở thích.'),form);sheet.classList.add('native-taste-sheet');
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
    dataInfo: () => show('Thông tin dữ liệu và giá',
      paragraph('Bạn có thể tìm món, xem gợi ý, so sánh chi phí và khám phá thực đơn trong Wanso. Kho quán, ưu đãi, nhận xét khẩu vị và hội thoại có nội dung được chuẩn bị sẵn; không phản ánh số quán trực tiếp của nền tảng hay đánh giá từ khách thực tế.'),
      row('Giờ hoạt động', 'Trạng thái mở cửa dựa trên khung giờ của quán trong trang và giờ Việt Nam. Vui lòng xác nhận khả năng nhận đơn, tạm nghỉ và giao hàng trên nền tảng.'),
      row('Cách tính chi phí', 'Với cùng món và số phần, lần lượt tính giảm giá của quán, mã nền tảng và ưu đãi giao hàng. Chi tiết chi phí nêu mức đơn tối thiểu, trần giảm và các ưu đãi không được cộng dồn.'),
      row('Cách sử dụng vị trí', 'Bản đồ sử dụng OpenStreetMap. Chọn địa điểm, ghim trên bản đồ hoặc dùng vị trí thiết bị. Vị trí được lưu trong trình duyệt để chọn nội dung thành phố; khoảng cách và phí giao chưa được tính lại trực tiếp. Dịch vụ bản đồ nhận yêu cầu tải các ô bản đồ gần vị trí đang xem.'),
      row('Đơn hàng và ảnh món', 'Order hiển thị chi phí và lựa chọn nền tảng, không thanh toán hoặc tạo đơn thực tế. Ảnh minh họa loại món; món cụ thể, tồn kho, giao hàng và số tiền được xác nhận tại trang thanh toán.'),
      actions(backButton('Đã hiểu'))),
    featured: () => window.wansoNative.refreshFeatured(),
    toggle,
    budget: value => {state.budget=value;},
    mode: value => {state.mode=value;},
    share,
    favorite: id => show('Lưu quán', paragraph(stores[id].name), state.group[id] ?
      row('Đã lưu', state.group[id], () => collections(id), true) : row('Thêm vào bộ sưu tập', 'Sắp xếp quán theo nhu cầu thường dùng', () => collections(id)),
    actions(backButton(), ...(state.group[id] ? [button('Bỏ lưu', () => actionHandlers.removeSaved(id))] : []))),
    collections: () => collections(),
    moveSaved: collections,
    removeSaved: id => confirmation('Bỏ lưu quán', 'Bỏ lưu ' + storeFor(id).name + '?', 'Xác nhận bỏ lưu', () => {
      delete state.group[id];
      sheet.close();
    }),
    recentOrders,
    legacyStore: frame=>catalogStore(frame.includes('second')?'quyen':'moc'),
    historySearch,
    historyClear: () => clearHistory(false),
    activityClear: () => clearHistory(true),
    openHistory: () => state.history ? go('recommend') : search(),
    theme: chooseTheme,
    language: changeLanguage,
    account: editAccount,
    gender: () => show('Giới tính', ...['Nam', 'Nữ', 'Khác', 'Không muốn chia sẻ'].map(value =>
      row(value, state.gender === value ? 'Đang chọn' : '', () => {state.gender = value; sheet.close();}, state.gender === value)), actions(backButton())),
    avatar: chooseAvatar,
    tastes: addTaste,
    feedback: () => field('Gửi góp ý', 'Chia sẻ vấn đề bạn gặp: gợi ý vượt ngân sách, giá món bất thường hoặc thông tin quán chưa đầy đủ.', '', value =>
      show('Xem lại góp ý', paragraph(value), note('Góp ý được giữ trong phiên sử dụng này.'), actions(backButton('Xong'))), {multiline: true, limit: 500, submit: 'Xem góp ý'}),
    terms: () => show('Điều khoản Wanso', paragraph('Tóm tắt điều khoản v1.0: Wanso hỗ trợ gợi ý bằng AI, so sánh nền tảng, giải thích lựa chọn và truy cập dịch vụ bên thứ ba.'),
      row('Giao dịch và hỗ trợ', 'Món ăn, giao hàng, thanh toán, hoàn tiền và hỗ trợ sau mua do bên cung cấp tương ứng phụ trách.'), actions(backButton('Xong'))),
    privacy: () => show('Chính sách riêng tư Wanso', paragraph('Tóm tắt chính sách v1.0: Wanso dựa vào yêu cầu, sở thích, lịch sử, vị trí và thông tin công khai hoặc được cấp phép để đưa ra gợi ý.'),
      row('Thông tin của bạn', 'Thông tin gồm hồ sơ tài khoản, yêu cầu tìm kiếm, sở thích ăn uống và góp ý. Xem thông tin cá nhân trong Tài khoản và bảo mật; quản lý chia sẻ dữ liệu ẩn danh trong Cài đặt.'),
      actions(backButton('Xong'))),
    removeAccount: () => show('Xóa tài khoản', paragraph('Xóa tài khoản trong ứng dụng sẽ xóa vĩnh viễn tài khoản Wanso và dữ liệu liên quan. Tài khoản trong trang này được giữ lại để bạn tiếp tục khám phá.'),
      actions(backButton('Về tài khoản'))),
    logout: () => confirmation('Đăng xuất', 'Kết thúc phiên hiện tại và trở về trang chủ Wanso.', 'Kết thúc phiên', () => go('home', false, 'reset'))
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
        control.textContent=t(displayValue(h.value));
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
        const value = el('span', 'native-value', displayValue(subtitle) || 'Chưa đặt');
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
      empty.append(el('strong', null, 'Chưa có trò chuyện'), paragraph('Bắt đầu tìm món mới từ trang chủ.'),
        button('Về trang chủ', () => navigate('home', false, 'reset'), 'sheet-button primary'));
      layer.append(empty);
    }
    if (frame.id === 'saved' && savedCount() < 2) {
      const current = el('div', 'native-list-state saved-state');
      const entries=Object.keys(state.group).filter(key=>state.group[key]).map(key=>[key,storeFor(key)]).filter(([,store])=>store);
      current.append(el('strong', null, 'Tất cả · ' + entries.length + ' quán'));
      for (const [id,store] of entries)current.append(row(store.name,String(store.rating),()=>catalogStore(id)));
      if (!entries.length) current.append(paragraph('Quán bạn yêu thích sẽ được lưu ở đây.'));
      current.append(button('Xem bộ sưu tập', () => {
        activeFrame = frame;
        anchor = document.activeElement;
        collections();
      }));
      layer.append(current);
    }
  }

  return {
    viewState: () => state,
    displayValue,
    storeFor,
    dismissAll,
    recentOrderData,
    register,
    paint,
    menuLanguage: id => state.translated[id],
    createSearchInput(submit) {
      const input = el('input','native-home-query');
      input.value = state.query;
      input.placeholder = t('Hôm nay bạn muốn ăn gì?');
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
