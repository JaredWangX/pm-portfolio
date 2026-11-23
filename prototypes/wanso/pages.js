'use strict';

// Layout follows Home / Explore / Saved / Profile in the iOS app.
window.wansoPages = (() => {
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const btn = (text, fn, className = 'ios-page-button', label = text) => {
    const node = el('button', className, text);
    node.type = 'button'; node.setAttribute('aria-label', label);
    node.addEventListener('click', fn);
    return node;
  };
  const photo = (src, className = '') => {
    const img = el('img', className); img.src = src; img.alt = ''; img.draggable = false;
    img.decoding = 'async'; return img;
  };
  const glyphs = {
    sliders: '<path d="M4 6h4m4 0h8M4 12h10m4 0h2M4 18h2m4 0h10"/><circle cx="10" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="8" cy="18" r="2"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"/>',
    palette: '<path d="M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 0-4c-1-1 0-3 2-3h3c4 0 4-11-6-11Z"/><path d="M7 9h.01M10 6h.01M15 6h.01M18 9h.01"/>',
    shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
    heart: '<path d="M20 5c-3-3-7-1-8 1-1-2-5-4-8-1-5 5 8 15 8 15s13-10 8-15Z"/>',
    folder: '<path d="M3 6h7l2 3h9v11H3V6Zm0 5h18"/>',
    trash: '<path d="M4 6h16M9 6V3h6v3M6 6v15h12V6M10 10v7M14 10v7"/>'
  };
  function glyph(name) {
    const node=document.createElementNS('http://www.w3.org/2000/svg','svg');
    node.setAttribute('viewBox','0 0 24 24');node.setAttribute('aria-hidden','true');
    node.innerHTML=glyphs[name];
    return node;
  }
  const asset = name => '../../assets/wanso/' + name;
  const storeTitle = id => id === 'moc' ? 'Hương Vị Mộc' : 'Phở Quyên';
  const storeRoute = id => id === 'moc' ? 'store-first' : 'store-second';
  const orderId = id => id === 'moc' ? 'moc-shopee' : 'quyen-grab';
  const number = value => value.toLocaleString('zh-CN');
  const money = value => value.toLocaleString('vi-VN') + 'đ';
  const heading = (title, description) => {
    const wrap = el('div','ios-section-title');
    wrap.append(el('h2','',title));
    if (description) wrap.append(el('p','',description));
    return wrap;
  };
  function explore(root, data, route, open) {
    const hero = el('section','ios-explore-hero');
    hero.append(photo(asset('explore_hero.webp')),
      btn('◷ 历史',()=>route('history'),'ios-photo-history','会话历史'));
    const intro = el('div','ios-photo-copy');
    intro.append(el('small','','HÀ NỘI · 河内'),el('h1','','这一餐，\n想吃点什么？'));
    hero.append(intro);
    const insight = btn('',()=>route('compare'),'ios-explore-insight','查看同店比价');
    insight.append(el('span','ios-insight-icon','✦'));
    const insightCopy = el('span');
    insightCopy.append(el('strong','','万象洞察 · 同店比价'), el('span','','同一碗鸡腿河粉，两个平台标价相差 5.000đ。'));
    insight.append(insightCopy,el('span','','›'));
    const body = el('div','ios-page-content');
    const stats = el('section','ios-explore-stats');
    const statsHeader = el('div','ios-stats-heading');
    statsHeader.append(el('strong','','🟢 🟠 双平台'),el('span','','河内 · 历史快照'));
    const values = el('dl','ios-stat-values');
    // COUNT(*) and conditional counts from the local Wanso restaurant archive.
    for (const [value,label] of [[42643,'店铺'],[11918,'促销中'],[4803,'配送优惠']]) {
      const pair=el('div');pair.append(el('dd','',number(value)),el('dt','',label));values.append(pair);
    }
    stats.append(statsHeader,values);
    const picks = el('div','ios-carousel ios-explore-picks');
    picks.tabIndex=0;picks.setAttribute('aria-label','万象精选，左右滑动查看餐厅');
    for (const [id,store] of Object.entries(data)) {
      const card=btn('',()=>route(storeRoute(id)),'ios-explore-store','查看 '+storeTitle(id));
      const cover=el('div','ios-explore-cover');
      cover.append(photo(asset('native/'+store.photo)),el('span','ios-store-platform',store.platform),el('strong','ios-photo-name',store.name));
      const details=el('div','ios-explore-details');
      details.append(el('strong','',`★ ${store.rating.toFixed(1)}  ·  ${number(store.review_count)} 条评价`),
        el('span','',`${store.dish} · ${money(store.sample)}`),el('span','',`距示例位置 ${store.distance} km`));
      card.append(cover,details);picks.append(card);
    }
    body.append(stats,heading('今晚推荐','有菜单依据，也有选择理由'),picks,heading('你的场景','点选用餐场景，带着预算开始推荐'));
    for (const [tag,title,description,action,image] of [
      ['午餐','午餐想吃一碗热河粉？','两家河内餐厅都有鸡腿河粉，先看菜品，再核对价格。','找午餐','scenario_date.webp'],
      ['预算','一餐八万越南盾以内','Phở Quyên 餐品 59.000đ，加上档案运费合计 71.000đ。','看推荐','scenario_late.webp']
    ]) {
      const story=btn('',()=>route('generating',true),'ios-scenario',action);
      story.append(photo(asset(image)),el('span','ios-scenario-tag',tag));
      const copy=el('div','ios-scenario-copy');
      copy.append(el('strong','',title),el('span','',description),el('b','',action+' →'));
      story.append(copy);body.append(story);
    }
    const ask=btn('',()=>route('home',false,'tab'),'ios-page-cta','还是选不出来？');
    ask.append(el('strong','','还是选不出来？'),el('span','','把预算、忌口和想吃的告诉万象。'),el('b','','问问 AI →'));
    body.append(ask);root.append(hero,insight,body);
  }
  function saved(root, data, state, route, open) {
    const header=el('div','ios-page-heading');
    header.append(el('h1','','♥ 已收藏'),btn('◷ 历史',()=>route('history'),'ios-page-link','会话历史'));
    const ids=Object.keys(data).filter(id=>state.group[id]);
    const intro=el('div','ios-saved-intro');
    intro.append(el('strong','',`已收藏 ${ids.length} 家 · 万象精选`),el('span','','查看菜单、核对费用，把喜欢的店留在手边。'));
    const recent=btn('',()=>open('recentOrders'),'ios-recent-orders','近期订单');
    recent.append(el('strong','',state.recent.length?`最近查看 ${state.recent.length} 个下单入口`:'还没有订单'),
      el('span','',state.recent.length?'查看已选店铺与平台，继续核对餐品和费用。':'选择店铺的 Order，可在手机内查看下单预览。'));
    const group=el('div','ios-group-heading');
    group.append(el('strong','','我的收藏夹'),btn('＋ 添加',()=>open('collections'),'ios-page-link','添加收藏夹'));
    const collection=btn(`❤️ 全部收藏 · ${ids.length} 家`,()=>open('collections'),'ios-collection-title','查看全部收藏');
    root.append(header,intro,heading('最近订单'),recent,group,collection);
    for (const id of ids.reverse()) {
      const store=data[id];
      const card=el('article','ios-saved-store');
      const main=btn('',()=>route(storeRoute(id)),'ios-saved-main','查看 '+storeTitle(id));
      const copy=el('span');
      copy.append(el('strong','',store.name),el('span','',`★ ${store.rating.toFixed(1)} · ${number(store.review_count)} 条评价`),
        el('small','',`${store.dish}  ${money(store.sample)}`));
      main.append(photo(asset('native/'+store.photo)),copy);
      const actions=el('div','ios-saved-actions');
      const order=btn('在 '+store.platform+' 下单 →',()=>open('order',orderId(id)),'ios-saved-order',storeTitle(id)+' · '+store.platform+' 下单');
      order.dataset.platform=id==='moc'?'shopee':'grab';
      actions.append(order,btn('▱',()=>open('moveSaved',id),'ios-saved-icon','移动 '+storeTitle(id)+' 到收藏夹'),
        btn('⌫',()=>open('removeSaved',id),'ios-saved-icon','移除 '+storeTitle(id)+' 收藏'));
      actions.querySelectorAll('.ios-saved-icon').forEach((item,i)=>item.replaceChildren(glyph(i?'trash':'folder')));
      card.append(main,actions);root.append(card);
    }
    if(!ids.length) root.append(el('p','ios-empty-copy','喜欢的餐厅会保存在这里。先看看附近的两家推荐。'));
    root.append(btn('✦ 发现新美食 →',()=>route('explore',false,'tab'),'ios-page-cta','发现新美食'));
  }
  function profile(root, data, state, route, open) {
    root.append(el('h1','ios-profile-title','个人资料'));
    const profile=el('div','ios-profile-card');
    profile.append(btn(state.avatar,()=>open('avatar'),'ios-profile-avatar','更换头像'));
    const copy=el('div');
    copy.append(btn(state.name+' ✎',()=>open('account','name'),'ios-profile-name','修改昵称'));
    const counts=el('div','ios-profile-counts');
    for (const [n,label,fn] of [[state.recent.length,'下单预览',()=>open('recentOrders')],[state.history?1:0,'比较',()=>route('history')],[Object.keys(state.group).length,'收藏',()=>route('saved',false,'tab')]]) {
      const count=btn('',fn,'ios-profile-count',label);count.append(el('strong','',String(n)),el('span','',label));counts.append(count);
    }
    copy.append(counts);profile.append(copy);root.append(profile,heading('你的口味'));
    const tastes=el('section','ios-taste-card');
    const label=el('div','ios-group-heading');label.append(el('strong','','✦ 口味档案'),el('span','',state.tastes.length+'/9'));
    const tags=el('div','ios-taste-tags');
    for(const taste of state.tastes) tags.append(el('span','',taste));
    tags.append(btn('＋ 添加',()=>open('tastes'),'ios-page-link','添加口味标签'));
    tastes.append(label,tags,el('p','','用于补充推荐条件。对话里这次明确提出的要求优先。'));
    const preferences=el('div','ios-profile-settings');
    for (const [icon,label,detail,target,action] of [
      ['sliders','订单偏好',state.budget+' · '+state.mode+'模式','preferences'],
      ['bell','通知','推送 · 优惠 · 免打扰','notifications'],
      ['palette','应用设置',state.theme+'主题 · '+state.appLanguage,'settings'],
      ['shield','账户与安全','邮箱 · 电话 · 个人信息','account'],
      ['heart','发送反馈','记录推荐、价格或使用中的问题',null,'feedback']
    ]) {
      const row=btn('',()=>target?route(target):open(action),'ios-profile-setting',label);
      const text=el('span');text.append(el('strong','',label),el('small','',detail));
      const symbol=el('span','ios-setting-icon');symbol.append(glyph(icon));
      row.append(symbol,text,el('span','','›'));preferences.append(row);
    }
    root.append(tastes,heading('偏好'),preferences,btn('退出登录',()=>open('logout'),'ios-page-cta'));
  }
  function mount(layer, id, route, open) {
    const scroll=el('section','phone-scroll ios-data-page ios-page-'+id);
    scroll.tabIndex=0;scroll.setAttribute('role','region');
    scroll.setAttribute('aria-label',({explore:'探索',saved:'收藏',profile:'个人资料'})[id]+'，上下滚动查看');
    const render={explore,saved,profile}[id];
    scroll.refreshContent=()=>{
      const top=scroll.scrollTop;
      scroll.replaceChildren();
      const data=window.wansoNative.restaurants();
      const state=window.wansoControls.viewState();
      if(id==='explore') render(scroll,data,route,open);
      else render(scroll,data,state,route,open);
      scroll.scrollTop=top;
    };
    scroll.refreshContent();layer.append(scroll);return scroll;
  }
  return {mount};
})();
