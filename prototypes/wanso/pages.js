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
  function timeOfDay(date = new Date()) {
    const hour = Number(new Intl.DateTimeFormat('en-GB', {timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',hourCycle:'h23'}).format(date));
    if (hour >= 5 && hour <= 10) return 'morning';
    if (hour >= 11 && hour <= 14) return 'noon';
    if (hour >= 15 && hour <= 18) return 'afternoon';
    return 'night';
  }
  const meals = {
    morning: {label:'早晨',title:'早餐能量？\n早餐轻松搞定。',picks:'早餐推荐',stories:[
      ['通勤早餐','一碗热汤，慢慢醒来','清汤河粉配一份蛋白质，先看看离出发位置近的店。','推荐附近清淡的早餐，想吃热汤河粉，不吃香菜，含配送预算八万越南盾。','scenario_late.webp'],
      ['赶时间','早餐带走，准点出发','面包方便拿着吃，分开核对餐品与运费，留足出门时间。','想吃方便带走的早餐，推荐鸡肉面包或饭团，含配送预算六万越南盾。','scenario_rain.png'],
      ['运动之后','蛋白质加一份，口味轻一点','留意鸡肉、鸡蛋与蔬菜搭配，酱汁可以单独放。','晨练后想吃鸡肉和蔬菜，少油不辣，含配送预算九万越南盾，推荐五家。','scenario_gym.webp'],
      ['周末早餐','和朋友慢慢吃一顿','两人份先看菜品与分量，热食和饮品分开选择更清楚。','两个人吃早餐，想要河粉和面包各一份，含配送总预算十五万越南盾。','scenario_date.webp']
    ]},
    noon: {label:'午餐',title:'午饭时间。\n今天吃啥好？',picks:'午间推荐',stories:[
      ['工作日午餐','饭点到了，先吃好再忙','米饭、鸡肉和蔬菜搭配完整，比较距离和到手价后再选。','工作日午餐想吃鸡肉饭，有蔬菜、不太油，含配送预算八万越南盾。','scenario_popular.png'],
      ['午间轻食','吃饱，也想吃得清爽','清汤、蒸煮或酱汁分装都可以，按实际菜品核对选择。','午餐想吃清淡一点的河粉或沙拉，不辣不吃香菜，预算八万越南盾含配送。','scenario_healthy.png'],
      ['一起点餐','和同事拼一顿午饭','同一家店选不同主食，先统一预算，再核对每个人的忌口。','两位同事一起吃午餐，一个不吃辣，一个想吃鸡肉，含配送预算十六万越南盾。','scenario_date.webp'],
      ['预算优先','六万以内，也要好好吃','先看餐品价格与配送费用，满减条件要一起算进去。','午餐含配送六万越南盾以内，想吃米饭或面包，比较两个平台。','scenario_value.png']
    ]},
    afternoon: {label:'下午',title:'下午零食？\n茶还是咖啡？',picks:'午后精选',stories:[
      ['咖啡时间','给下午补一点精神','饮品大小和甜度要选清楚，再配一份小点心。','下午想喝咖啡，配一点小吃，少糖，含配送预算七万越南盾。','scenario_date.webp'],
      ['加班前','先吃一口，晚一点再忙','分量适中的面包或米卷更方便，避开重油和大份套餐。','下午饿了，想吃鸡肉面包或米卷，少油不辣，预算六万越南盾含配送。','scenario_late.webp'],
      ['运动前','轻一点，补一点能量','水果、蔬菜和适量主食组合，按你的运动安排决定分量。','傍晚运动前想吃一份小份轻食，有蔬菜和鸡肉，含配送预算八万越南盾。','scenario_gym.webp'],
      ['分享下午茶','两个人的下午茶','饮品与甜点先确认份数，按同一组合比较平台总价。','给两个人选下午茶，想要饮品和小吃，少糖，含配送预算十二万越南盾。','scenario_explore.png']
    ]},
    night: {label:'今夜',title:'今晚你\n想吃啥？',picks:'今晚推荐',stories:[
      ['加班夜宵','忙了一天，来碗热的','一份热汤河粉更舒服，挑选鸡腿或鸡胸，香草按需添加。','加班后想吃热汤鸡肉河粉，不辣不吃香菜，含配送预算八万越南盾。','scenario_late.webp'],
      ['两人晚餐','今晚和喜欢的人一起吃','先照顾两个人的口味，再搭配主食和配菜，价格核到同一份量。','两个人吃晚餐，想吃越南菜，有鸡肉和蔬菜，含配送预算十八万越南盾。','scenario_date.webp'],
      ['健身餐','练完再吃，清爽也满足','鸡肉和蔬菜一起选，优先清淡做法，酱汁可以另放。','健身后吃晚餐，想要鸡肉、蔬菜和少量主食，少油不辣，含配送预算九万越南盾。','scenario_gym.webp'],
      ['换换口味','总吃同一家，今晚换一下','保留你在意的预算和忌口，看看其他店的招牌做法。','晚餐想换一家，推荐五家不同风格的餐厅，预算九万越南盾含配送，不吃香菜。','scenario_explore.png']
    ]}
  };
  function chooseScenario(prompt, state, route) {
    state.query = prompt;
    window.wansoNative.setQuery(prompt);
    route('generating', true);
  }
  function home(root, data, state, route, open) {
    const top=el('header','ios-home-top');
    const location=btn('',()=>open('cities'),'ios-home-location','选择位置');
    location.append(el('span','ios-location-mark','⌖'),el('span','',state.location.label),el('span','ios-location-chevron','⌄'));
    top.append(location,btn('◷ 历史',()=>route('history'),'ios-home-history','会话历史'));
    const headline=el('div','ios-home-headline');
    headline.append(el('span','ios-home-ai-label','✨ AI 助手'));
    const title=el('h1');
    title.append(el('span','','你今天'),el('br'),el('em','','想吃'),document.createTextNode('什么呢？'));
    headline.append(title,el('p','','一句话帮你决定要吃什么。'));
    const form=el('form','ios-home-search');
    const inputRow=el('div','ios-home-search-input');
    const icon=el('span','ios-home-input-icon','✦');icon.setAttribute('aria-hidden','true');
    const input=window.wansoControls.createSearchInput(()=>open('runSearch'));
    input.setAttribute('aria-label','输入选餐要求');input.placeholder='说说想吃什么、预算和忌口';
    input.addEventListener('input',()=>window.wansoNative.setQuery(input.value));
    const clear=btn('×',()=>{state.query='';input.value='';window.wansoNative.setQuery('');input.focus({preventScroll:true});},'ios-home-clear','清空选餐要求');
    inputRow.append(icon,input,clear);
    const tools=el('div','ios-home-search-tools');
    const compare=btn('',()=>open('toggle','compareAll'),'ios-home-compare','全平台比较设置');
    compare.append(el('i','ios-grab-dot'),el('i','ios-shopee-dot'),el('span','',state.compareAll?'全平台比较':'按默认平台推荐'));
    const search=btn('⌕ 搜索',()=>open('runSearch'),'ios-home-search-submit','搜索');
    tools.append(compare,search);form.append(inputRow,tools);
    form.addEventListener('submit',event=>{event.preventDefault();open('runSearch');});
    const section=el('section','ios-home-featured');
    const sectionHead=el('div','ios-home-featured-heading');
    sectionHead.append(el('h2','','✦ 万象精选'),btn('↻ 刷新',()=>open('featured'),'ios-home-refresh','刷新万象精选'));
    section.append(sectionHead,window.wansoNative.homeRestaurants(route,open));
    const suggestion=el('div','ios-home-suggestions');
    suggestion.append(heading('最近搜索'));
    const recent=state.historyEntries?.length?state.historyEntries.slice(0,3).map(entry=>entry.query||entry.prompt||entry.title).filter(Boolean):[state.query].filter(Boolean);
    for(const text of recent){
      const item=btn('',()=>chooseScenario(text,state,route),'ios-home-recent','再次搜索 '+text);
      item.append(el('span','ios-recent-query',text),el('span','','↗'));suggestion.append(item);
    }
    const tip=btn('',()=>open('tastes'),'ios-home-tip','设置口味偏好');
    tip.append(el('strong','','✦ Wanso 小贴士'),el('span','','告诉我忌口与常用预算，下次选餐可以少说一点。'),el('b','','完善口味 →'));
    suggestion.append(tip);root.append(top,headline,form,section,suggestion);
  }
  function explore(root, data, state, route, open) {
    const hero=el('section','ios-explore-hero');
    hero.append(photo(asset('explore_hero.webp')),btn('◷ 历史',()=>route('history'),'ios-photo-history','会话历史'));
    const intro=el('div','ios-photo-copy');
    const label=btn('',()=>open('cities'),'ios-explore-location','选择位置');
    const title=el('h1');intro.append(label,title);hero.append(intro);
    const insight=btn('',()=>nextInsight(),'ios-explore-insight','切换万象洞察');
    insight.append(el('span','ios-insight-icon','✦'));
    const insightCopy=el('span');const insightTitle=el('strong');const insightText=el('span');
    insightCopy.append(insightTitle,insightText);
    const insightIndex=el('span','ios-insight-counter');insight.append(insightCopy,insightIndex);
    const insights=[
      ['比价提醒','同一家店也可能有不同的平台价格，餐品、配送和优惠一起算。'],
      ['选餐偏好','先告诉我不能吃什么，再说预算；推荐理由会对应到具体菜品。'],
      ['点餐技巧','多人点餐先统一份数，优惠门槛与实付金额才有比较依据。']
    ];
    let insightNumber=0;
    function nextInsight(advance=true){
      if(advance)insightNumber=(insightNumber+1)%insights.length;
      insightTitle.textContent='万象洞察 · '+insights[insightNumber][0];
      insightText.textContent=insights[insightNumber][1];insightIndex.textContent=(insightNumber+1)+' / '+insights.length;
    }
    nextInsight(false);
    const body=el('div','ios-page-content');const stats=el('section','ios-explore-stats');
    const statsHeader=el('div','ios-stats-heading');
    statsHeader.append(el('strong','','🟢 🟠 双平台'),el('span','','当前城市 · 选餐参考库'));
    const catalog=window.wansoNative.catalogForLocation();const values=el('dl','ios-stat-values');
    const quotes=catalog.map(store=>Object.values(store.platforms));
    const promoCount=quotes.filter(offers=>offers.some(p=>p.discount>0)).length;
    const freeCount=quotes.filter(offers=>offers.some(p=>p.netDeliveryFee===0)).length;
    for(const [value,text] of [[catalog.length,'餐厅条目'],[promoCount,'单份享优惠'],[freeCount,'单份免配送']]){
      const pair=el('div');pair.append(el('dd','',number(value)),el('dt','',text));values.append(pair);
    }
    stats.append(statsHeader,values);const picksHeading=heading('');
    const picks=el('div','ios-carousel ios-explore-picks');
    picks.tabIndex=0;picks.setAttribute('aria-label','精选餐厅，左右滑动查看五家推荐');
    function paintMealPicks(bucket) {
      const query={morning:'早餐预算八万',noon:'鸡肉饭预算八万',afternoon:'咖啡或下午茶预算八万',night:'热汤预算八万'}[bucket];
      picks.replaceChildren();
      for(const store of window.wansoNative.selectedStores({limit:5,query})){
      const card=btn('',()=>open('catalogStore',store.id),'ios-explore-store','查看 '+store.name);
      const image=el('div','ios-explore-cover');image.append(photo(store.image),el('strong','ios-photo-name',store.name.split(' · ')[0]));
      const details=el('div','ios-explore-details');const price=Math.min(store.platforms.grab.total,store.platforms.shopee.total);
      details.append(el('strong','',`★ ${store.rating.toFixed(1)} · ${store.district} · ${store.distance.toFixed(1)} km`),el('span','',store.dishZh+' · 到手 '+money(price)+' 起'));
      const brands=el('div','ios-explore-platforms');
      brands.append(el('span','ios-platform-grab','G GrabFood'),el('span','ios-platform-shopee','S ShopeeFood'));
      details.append(brands);card.append(image,details);picks.append(card);
    }
    }
    const storyHead=heading('你的场景','按越南当地时段，找一份适合现在的推荐');
    const stories=el('div','ios-time-scenarios');let currentBucket='';
    root.updateTimeContent=()=>{
      const bucket=timeOfDay();if(bucket===currentBucket)return;
      currentBucket=bucket;root.dataset.timeOfDay=bucket;const meal=meals[bucket];
      label.textContent=state.location.label+' · '+meal.label+' ⌄';title.textContent=meal.title;
      picksHeading.querySelector('h2').textContent=meal.picks;
      const scrollTop=root.scrollTop;
      paintMealPicks(bucket);stories.replaceChildren();
      for(const [tag,headline,description,prompt,image] of meal.stories){
        const story=btn('',()=>chooseScenario(prompt,state,route),'ios-scenario',headline);story.dataset.scenario=tag;
        story.append(photo(asset(image)),el('span','ios-scenario-tag',tag));
        const copy=el('div','ios-scenario-copy');copy.append(el('strong','',headline),el('span','',description),el('b','','帮我推荐 →'));
        story.append(copy);stories.append(story);
      }
      root.scrollTop=scrollTop;
    };
    root.updateTimeContent();
    const ask=btn('',()=>route('home',false,'tab'),'ios-page-cta','还是选不出来？');
    ask.append(el('strong','','还是选不出来？'),el('span','','把预算、忌口和想吃的告诉万象。'),el('b','','问问 AI →'));
    body.append(stats,picksHeading,picks,storyHead,stories,ask);root.append(hero,insight,body);
  }
  function recentOrderCard(record, open) {
    const card=el('article','ios-order-record');card.dataset.orderId=record.id;card.dataset.platform=record.platform;
    const main=btn('',()=>open(record.detailAction,record.detailValue),'ios-order-record-main','查看订单店铺 · '+record.name);
    const copy=el('span');copy.append(el('span','ios-order-record-platform',record.platformName),el('strong','',record.name));
    main.append(photo(record.image),copy);
    const dish=el('p','ios-order-record-dish',record.dish+' · '+record.quantity+' 份');
    const costs=el('dl','ios-order-record-costs');
    for(const [label,value] of [['餐品',money(record.price)],['配送',record.fee===null?'以平台为准':money(record.fee)],['优惠',record.discount?'−'+money(record.discount):'暂无']]){
      const row=el('div');row.append(el('dt','',label),el('dd','',value));costs.append(row);
    }
    const total=el('div','ios-order-record-total');total.append(el('span','','含配送合计'),el('strong','',record.total===null?'待确认':money(record.total)));
    card.append(main,dish,costs,total,btn('再次下单 ↗',()=>open(record.orderAction,record.id),'ios-order-record-reopen','再次下单 · '+record.name+' · '+record.platformName));
    return card;
  }
  function saved(root, data, state, route, open) {
    const header=el('div','ios-page-heading');
    header.append(el('h1','','♥ 已收藏'),btn('◷ 历史',()=>route('history'),'ios-page-link','会话历史'));
    const ids=Object.keys(state.group).filter(id=>state.group[id]&&window.wansoControls.storeFor(id));
    const intro=el('div','ios-saved-intro');
    intro.append(el('strong','',`已收藏 ${ids.length} 家 · 万象精选`),el('span','','把喜欢的餐厅留在手边，按收藏夹整理。'));
    const recentHeading=el('div','ios-group-heading');recentHeading.append(el('strong','','最近订单'),btn('查看全部 →',()=>open('recentOrders'),'ios-page-link','查看全部最近订单'));
    const recent=el('div','ios-recent-order-rail');recent.setAttribute('aria-label','最近订单，可左右滑动');
    for(const id of state.recent.slice(0,3)){const record=window.wansoControls.recentOrderData(id);if(record)recent.append(recentOrderCard(record,open));}
    if(!recent.children.length)recent.append(el('p','ios-orders-empty','暂无记录。打开餐厅的下单预览后，会在这里保留。'));
    const recentNote=el('p','ios-order-record-note','费用预览记录 · 不会创建实际订单');
    const group=el('div','ios-group-heading');
    group.append(el('strong','','我的收藏夹'),btn('＋ 添加',()=>open('collections'),'ios-page-link','添加收藏夹'));
    const collection=btn(`❤️ 全部收藏 · ${ids.length} 家`,()=>open('collections'),'ios-collection-title','查看全部收藏');
    root.append(header,intro,recentHeading,recentNote,recent,group,collection);
    for (const id of ids.reverse()) {
      const store=window.wansoControls.storeFor(id);
      const card=el('article','ios-saved-store');
      const main=btn('',()=>open('catalogStore',id),'ios-saved-main','查看 '+store.name);
      const copy=el('span');
      copy.append(el('strong','',store.name),el('span','',`★ ${store.rating.toFixed(1)} · ${number(store.reviewCount)} 条评价`),
        el('small','',`${store.dishZh}  ${money(store.platforms.grab.price)}`));
      main.append(photo(store.image),copy);
      const actions=el('div','ios-saved-actions');
      actions.append(btn('',()=>open('moveSaved',id),'ios-saved-icon','移动 '+store.name+' 到收藏夹'),
        btn('',()=>open('removeSaved',id),'ios-saved-icon','移除 '+store.name+' 收藏'));
      actions.querySelectorAll('.ios-saved-icon').forEach((item,i)=>item.append(glyph(i?'trash':'folder'),el('span','',i?'取消收藏':'移动收藏夹')));
      card.append(main,actions);root.append(card);
    }
    if(!ids.length) root.append(el('p','ios-empty-copy','喜欢的餐厅会保存在这里。先看看附近的推荐餐厅。'));
    root.append(btn('✦ 发现新美食 →',()=>route('explore',false,'tab'),'ios-page-cta','发现新美食'));
  }
  function profile(root, data, state, route, open) {
    root.append(el('h1','ios-profile-title','个人资料'));
    const profile=el('div','ios-profile-card');
    const avatar=btn(state.avatarUrl?'':state.avatar,()=>open('avatar'),'ios-profile-avatar','更换头像');
    if(state.avatarUrl)avatar.append(photo(state.avatarUrl));
    profile.append(avatar);
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
    for(const taste of state.tastes) tags.append(el('span','',(state.tasteEmojis?.[taste]||'')+' '+taste));
    tags.append(btn('＋ 添加',()=>open('tastes'),'ios-page-link','添加口味标签'));
    tastes.append(label,tags,el('p','','用于补充推荐条件。对话里这次明确提出的要求优先。'));
    const preferences=el('div','ios-profile-settings');
    for (const [icon,label,detail,target,action] of [
      ['sliders','订单偏好',state.budget+' · '+state.mode+'模式','preferences'],
      ['bell','通知','推送 · 优惠 · 免打扰','notifications'],
      ['palette','应用设置',state.theme+'主题 · '+state.appLanguage,'settings'],
      ['shield','账户与安全','邮箱 · 电话 · 个人信息','account'],
      ['heart','发送反馈','记录推荐、价格或使用中的问题',null,'feedback'],
      ['shield','数据与价格说明','内容来源 · 优惠规则 · 结算依据',null,'dataInfo']
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
    scroll.setAttribute('aria-label',({home:'首页',explore:'探索',saved:'收藏',profile:'个人资料'})[id]+'，上下滚动查看');
    const render={home,explore,saved,profile}[id];
    scroll.refreshContent=()=>{
      const top=scroll.scrollTop;
      scroll.replaceChildren();
      const data=window.wansoNative.restaurants();
      const state=window.wansoControls.viewState();
      render(scroll,data,state,route,open);
      scroll.scrollTop=top;
    };
    scroll.refreshContent();layer.append(scroll);return scroll;
  }
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) document.querySelector('.ios-page-explore')?.updateTimeContent?.();
  });
  return {mount, timeOfDay, recentOrderCard};
})();
