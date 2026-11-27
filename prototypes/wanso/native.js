'use strict';

window.wansoNative = (() => {
  let query = '想吃鸡肉热汤，含配送费八万越南盾以内，帮我推荐五家店。';
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
    if(container.classList.contains('phone-scroll')) window.wansoStore.appendReviews(container,key);
    return menu;
  }

  let location = {city:'hanoi',label:'河内 · 还剑区',district:'还剑区'};
  let featuredOffset = 0;
  const featuredRails = new Set();
  const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cityCatalogs=new Map();
  const catalogForLocation=()=>{
    if(window.wansoCatalogByCity?.[location.city])return window.wansoCatalogByCity[location.city];
    if(!cityCatalogs.has(location.city))cityCatalogs.set(location.city,window.wansoCatalog.filter(store=>store.city===location.city));
    return cityCatalogs.get(location.city);
  };
  let activeRequest=query;
  function criteria(text) {
    const values={一:1,二:2,两:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9,十:10};
    const chineseNumber=value=>value.includes('十') ? (value.split('十')[0]?values[value.split('十')[0]]:1)*10+(values[value.split('十')[1]]||0) : values[value];
    const quantities=[...text.matchAll(/(\d+|两|二|三|四|一)\s*(?:个人|人|位|份)/g)].filter(match=>text[match.index-1]!=='各');
    const quantity=Math.max(1,Math.min(4,quantities.length?Number(quantities.at(-1)[1])||chineseNumber(quantities.at(-1)[1]):1));
    const amounts=[...text.matchAll(/(\d+(?:\.\d+)?)\s*(万|千|k|K)|([一二两三四五六七八九十]+)万|(?:预算|不超过|budget)\s*(\d{4,6})/gi)];
    const last=amounts.at(-1);
    const budget=last ? last[1]?Number(last[1])*(last[2]==='万'?10000:1000):last[3]?chineseNumber(last[3])*10000:Number(last[4]) : 80000*quantity;
    const latest=(positive,negative)=>{
      const affirmative=[...text.matchAll(positive)].at(-1),negativeMatch=[...text.matchAll(negative)].at(-1);
      const yes=affirmative?affirmative.index+affirmative[0].length:-1;
      const no=negativeMatch?negativeMatch.index+negativeMatch[0].length:-1;
      return yes>=0 && yes>no;
    };
    const vegetarian=latest(/素食|吃素|vegetarian|vegan/gi,/不吃素|不要素食|荤素都行|改成鸡肉|换鸡肉/gi);
    const chicken=latest(/鸡肉|鸡腿|chicken/gi,/不吃鸡肉|不要鸡肉|鸡肉过敏/gi);
    const noChicken=latest(/不吃鸡肉|不要鸡肉|鸡肉过敏/gi,/想吃鸡肉|改成鸡肉|换鸡肉/gi);
    const patterns=[['noodles',/河粉|pho|phở/gi],['soup',/热汤|汤河粉|米线|喝汤|soup/gi],['mixed',/干拌|拌河粉|mixed/gi],['rice',/米饭|鸡肉饭|鸡饭|饭套餐|炒饭|rice/gi],['bread',/法棍|面包|banh|bánh/gi],['coffee',/咖啡|coffee/gi],['tea',/下午茶|奶茶|果茶|饮品|茶饮|tea/gi],['veggie',/素食|吃素|vegetarian|vegan/gi]];
    let categories=[],excluded=[];
    for(const clause of text.split(/[。！？!?;；\n]/)) {
      const desired=[],rejected=[];
      for(const [name,pattern] of patterns) {
        const matches=[...clause.matchAll(pattern)];
        if(!matches.length) continue;
        const match=matches.at(-1),prefix=clause.slice(Math.max(0,match.index-5),match.index);
        if(/(?:不要|不吃|不喝|不想吃|不想喝|不选)$/.test(prefix)) rejected.push(name);
        else desired.push(name);
      }
      if(/不要汤|不喝汤/.test(clause)) rejected.push('soup');
      if(desired.includes('soup')&&desired.includes('noodles')&&!/米线|bún/i.test(clause)&&!desired.includes('mixed')) {
        desired.splice(desired.indexOf('soup'),1);desired.splice(desired.indexOf('noodles'),1);desired.push('pho');
      } else if(desired.some(name=>['soup','mixed'].includes(name))) {const genericNoodles=desired.indexOf('noodles');if(genericNoodles>=0)desired.splice(genericNoodles,1);}
      if(desired.includes('soup')&&/米线|bún/i.test(clause)&&!/河粉|pho|phở/i.test(clause)) {desired.splice(desired.indexOf('soup'),1);desired.push('bun');}
      if(desired.includes('coffee')&&!/或|或者|都可以/.test(clause)) {const genericTea=desired.indexOf('tea');if(genericTea>=0)desired.splice(genericTea,1);}
      if(desired.length) {categories=desired;excluded=excluded.filter(name=>!desired.includes(name));}
      excluded=[...new Set([...excluded,...rejected])];
      categories=categories.filter(name=>!rejected.includes(name));
    }
    if(vegetarian) categories=['veggie'];
    else categories=categories.filter(name=>name!=='veggie');
    return {budget,quantity,vegetarian,noChicken,chicken:chicken&&!vegetarian&&!categories.some(name=>['coffee','tea'].includes(name)),categories,excluded,
      fullMeal:/午餐|晚餐|夜宵|正餐/.test(text)&&!categories.some(name=>['coffee','tea'].includes(name)),vegetables:/蔬菜|时蔬/.test(text),
      cheap:/便宜|最低|省钱|划算|总价/i.test(text),close:/近|快|赶时间|near/i.test(text),notes:/香菜|辣椒|忌口|过敏|allerg/i.test(text)};
  }
  const categoryKeys={pho:['pho'],bun:['bun'],noodles:['pho','mixed'],soup:['pho','bun'],mixed:['mixed'],rice:['rice','veggie'],bread:['banh'],coffee:['coffee'],tea:['tea'],veggie:['veggie']};
  function offerFor(store,key,request=activeRequest) {
    return window.wansoOffers.calculate(store,key,criteria(request).quantity);
  }
  const bestOffer = (store,request='') => Object.keys(store.platforms).map(key=>[key,offerFor(store,key,request)]).sort((a,b)=>a[1].total-b[1].total)[0];
  function comparisonFor(store,request='') {
    const ranked=Object.keys(store.platforms).map(key=>[key,offerFor(store,key,request)]).sort((a,b)=>a[1].total-b[1].total);
    const [winnerKey,winner]=ranked[0],other=ranked[1][1];
    const differences=[
      ['餐品标价',other.price-winner.price,'便宜','贵'],
      ['店铺折扣',winner.merchantDiscount-other.merchantDiscount,'多减','少减'],
      ['优惠券',winner.couponDiscount-other.couponDiscount,'多减','少减'],
      ['配送费',other.netDeliveryFee-winner.netDeliveryFee,'少付','多付']
    ].map(([label,amount,positive,negative])=>({label,amount,text:amount?`${label}${amount>0?positive:negative} ${money(Math.abs(amount))}`:`${label}相同`}));
    return {winnerKey,winner,other,differences,saving:other.total-winner.total};
  }
  function calculationText(offer) {
    return [`餐品 ${money(offer.price)}`,...(offer.merchantDiscount?[`− 店铺折扣 ${money(offer.merchantDiscount)}`]:[]),...(offer.couponDiscount?[`− 优惠券 ${money(offer.couponDiscount)}`]:[]),`＋ 配送 ${money(offer.originalFee)}`,...(offer.deliveryDiscount?[`− 运费减免 ${money(offer.deliveryDiscount)}`]:[]),`＝ ${money(offer.total)}`].join(' ');
  }
  function selectedStores({limit=5,query:request=query}={}) {
    const conditions=criteria(request);
    const totals=new Map();
    const candidates=catalogForLocation().filter(store=>{
      if(conditions.vegetarian&&!store.vegetarian) return false;
      if(conditions.fullMeal&&['coffee','tea'].includes(store.key)) return false;
      if(conditions.chicken&&!['pho','mixed','rice','banh','bun'].includes(store.key)) return false;
      if(conditions.noChicken&&['pho','mixed','rice','banh','bun'].includes(store.key)) return false;
      if(conditions.excluded.some(name=>categoryKeys[name]?.includes(store.key))) return false;
      if(conditions.categories.length&&!conditions.categories.some(name=>categoryKeys[name]?.includes(store.key)))return false;
      const total=Math.min(...Object.keys(store.platforms).map(key=>conditions.quantity===1?store.platforms[key].total:window.wansoOffers.summary(store,key,conditions.quantity).total));
      if(total>conditions.budget)return false;
      totals.set(store.id,total);return true;
    });
    candidates.sort((a,b)=> {
      const vegScore=Number(conditions.vegetables&&['rice','veggie'].includes(b.key))-Number(conditions.vegetables&&['rice','veggie'].includes(a.key));
      if(vegScore)return vegScore;
      if(conditions.cheap)return totals.get(a.id)-totals.get(b.id) || a.distance-b.distance;
      const local=Number(b.district===location.district)-Number(a.district===location.district);
      if(local) return local;
      if(conditions.close) return a.eta-b.eta || a.distance-b.distance;
      return totals.get(a.id)-totals.get(b.id) || b.rating-a.rating;
    });
    const selected=[],images=new Set(),brands=new Set();
    // Choose varied branches within the matching ranked set, not five copies of one cuisine photo.
    for(const distinctBrand of [true,false])for(const store of candidates) {
      const brand=store.name.split(' · ')[0];
      if(images.has(store.image)||(distinctBrand&&brands.has(brand)))continue;
      selected.push(store);images.add(store.image);brands.add(brand);
      if(selected.length>=limit)return selected;
    }
    return selected;
  }
  function picture(store,className='') {
    const image=element('img',className);
    image.src=store.image; image.alt=store.imageAlt||store.dishZh+' · 示例餐品配图'; image.draggable=false;
    image.decoding='async'; image.width=220;image.height=112;
    return image;
  }
  function platformBadge(key) {
    const badge=element('span','rich-platform-badge',key==='grab'?'G':'S');
    badge.dataset.platform=key;
    badge.title=key==='grab'?'GrabFood':'ShopeeFood';
    return badge;
  }
  function homeCard(store,open,route) {
    const card=button('','ios-home-restaurant rich-home-card',()=>open?open('catalogStore',store.id):route('store-first'),'查看 '+store.name);
    card.dataset.storeId=store.id;
    const cover=element('div','rich-pick-cover');
    cover.append(picture(store),element('span','rich-ai-pick','✦ AI PICK'));
    const details=element('div','ios-home-store-info');
    const tags=element('div','rich-tags');
    store.tags.forEach(tag=>tags.append(element('span','',tag)));
    const offer=bestOffer(store)[1];
    const platforms=element('div','rich-home-platforms');
    platforms.append(platformBadge('grab'),platformBadge('shopee'),element('span','','双平台'));
    details.append(element('strong','',store.name),element('span','rich-category',store.category),tags,
      element('span','rich-pick-stats',`★ ${store.rating.toFixed(1)} (${store.reviewCount}) · ${store.distance.toFixed(1)} km`),
      element('span','rich-delivery',`🛵 ${offer.netDeliveryFee?'配送 '+money(offer.netDeliveryFee):'本单免配送'} · 约 ${store.eta} 分钟`),platforms);
    card.append(cover,details);
    return card;
  }
  function paintFeatured(rail) {
    const list=catalogForLocation();
    const picked=Array.from({length:Math.min(5,list.length)},(_,i)=>list[(featuredOffset+i)%list.length]);
    rail.replaceChildren(...picked.map(store=>homeCard(store,rail.openStore,rail.routeStore)));
    rail.scrollLeft=0;
    rail.dataset.batch=String(Math.floor(featuredOffset/5)+1);
  }
  function homeRestaurants(route,open) {
    const rail=element('div','ios-carousel ios-home-carousel rich-home-rail');
    rail.tabIndex=0; rail.setAttribute('aria-label','万象精选，本批 5 家双平台餐厅，可左右滑动');
    rail.routeStore=route;rail.openStore=open;
    featuredRails.add(rail);paintFeatured(rail);
    return rail;
  }
  function refreshFeatured() {
    featuredOffset=(featuredOffset+5)%catalogForLocation().length;
    for (const rail of featuredRails) {
      if(rail.isConnected) paintFeatured(rail);
      else featuredRails.delete(rail);
    }
    return Math.floor(featuredOffset/5)+1;
  }
  function restaurantCard(store,route,open,request) {
    const shell=element('article','ios-recommendation rich-recommendation');
    shell.dataset.storeId=store.id;
    const card=element('div','ios-restaurant rich-restaurant');
    const main=button('','ios-restaurant-main',()=>open('catalogStore',{id:store.id,request}),'查看 '+store.name+' 菜单');
    const photo=element('div','ios-restaurant-photo');
    photo.append(picture(store),element('span','ios-rating','⭐ '+store.rating.toFixed(1)));
    const info=element('div','ios-restaurant-info');
    const tags=element('div','rich-tags');
    tags.append(element('span','rich-smart','✨ 智能推荐'),element('span','','💰 预算内'),element('span','',store.tags[0]));
    const stats=element('dl','ios-restaurant-stats');
    const cheapest=bestOffer(store,request);
    for(const [name,value] of [['餐品',money(cheapest[1].price)],['配送',money(cheapest[1].netDeliveryFee)],['距离',store.distance.toFixed(1)+'km']]) {
      const term=element('div');term.append(element('dt','',name),element('dd','',value));stats.append(term);
    }
    info.append(element('strong','ios-restaurant-name',store.name),tags,element('span','ios-sample','✦ '+store.dishZh),stats);
    main.append(photo,info);
    const offers=element('div','rich-offers');
    for(const key of Object.keys(store.platforms)) {
      const offer=offerFor(store,key,request);
      const row=button('','rich-offer',()=>open('catalogOrder',{id:store.id,platform:key,request}),store.name+' · '+offer.name+' 下单');
      row.dataset.platform=key;
      row.append(platformBadge(key),element('span','',offer.name),element('strong','',money(offer.total)),element('b','','→'));
      offers.append(row);
    }
    card.append(main,element('small','rich-total-label',`${criteria(request).quantity}份餐品 · 含配送及示例优惠`),offers);
    const reason=element('div','ios-card-reason rich-card-reason');
    const comparison=comparisonFor(store,request);
    reason.append(element('span','','✨'),element('p','',store.reason+`\n\n💰 ${cheapest[1].name} 到手 ${money(cheapest[1].total)}。`+(comparison.saving?`${comparison.differences.filter(item=>item.amount).map(item=>item.text).join('；')}，合计省 ${money(comparison.saving)}。`:'两平台本单到手价相同，可结合配送距离和自己的账户权益选择。')+`\n${cheapest[1].couponDiscount?'🎟️ '+cheapest[1].couponTerms:'本单没有额外可用平台券，已按能满足的活动条件计算。'}`));
    shell.append(card,reason);
    return shell;
  }

  function stepPanel(parent,done,{compact=false,request=query,onCancel}={}) {
    const stages=[['正在理解你的想法','整理菜品、预算与忌口'],['选择最佳路径','结合所选城市和本次条件'],['全平台搜索中','核对 GrabFood 与 ShopeeFood'],['按重要程度排序','比较菜品匹配、总价与距离'],['整理清晰答案','说明具体菜品和推荐原因'],['马上就好','检查费用加总与下一步入口']];
    const panel=element('section','rich-processing'+(compact?' rich-processing-compact':''));
    panel.setAttribute('role','status');panel.setAttribute('aria-live','polite');
    const heading=element('h2','','万象正在为你选餐');
    const caption=element('p','rich-processing-query',request);
    const progress=element('div','rich-progress');const fill=element('span');progress.append(fill);
    const list=element('ol','rich-step-list');
    const rows=stages.map(([label,hint])=>{
      const item=element('li');item.dataset.state='pending';
      const marker=element('span','rich-step-marker','·');const copy=element('div');copy.append(element('strong','',label),element('small','',hint));
      item.append(marker,copy);list.append(item);return item;
    });
    panel.append(heading,caption,progress,list,element('small','rich-example-note','交互原型 · 按演示菜单执行筛选'));
    parent.append(panel);
    let step=0,timer;
    const advance=()=>{
      if(!panel.isConnected) {panel.remove();onCancel?.();return;}
      rows.forEach((row,index)=>{
        row.dataset.state=index<step?'done':index===step?'active':'pending';
        row.querySelector('.rich-step-marker').textContent=index<step?'✓':index===step?'':'·';
      });
      fill.style.transform=`scaleX(${Math.min(step/6,.88)})`;
      if(step===stages.length) {fill.style.transform='scaleX(1)';timer=setTimeout(()=>{if(panel.isConnected)done?.(panel);},120);return;}
      step+=1;
      timer=setTimeout(advance,reducedMotion()?170:480);
    };
    requestAnimationFrame(advance);
    return ()=>{clearTimeout(timer);panel.remove();};
  }
  function mountProgress(layer,done) {
    layer.querySelector('.rich-processing-screen')?.remove();
    const scroller=element('section','phone-scroll rich-processing-screen');
    scroller.tabIndex=0;scroller.setAttribute('aria-label','推荐处理步骤');layer.append(scroller);
    return stepPanel(scroller,done);
  }
  function replyText(request,stores,round=0) {
    const conditions=criteria(request);
    const city=location.label || (location.city==='hcm'?'胡志明市':'河内');
    if(!stores.length) return `🔎 这次先保留你的条件
在${city}的演示菜单里，没有找到同时满足预算和饮食要求的餐品。结果少的时候，我不会把超预算的店直接混进推荐。

可以继续调整
告诉我预算是否包含饮品、能否换一种主食，或者是否可以接受稍远一点的店。修改其中一个条件后，我会重新筛选，并继续沿用你已经说明的忌口。`;
    const first=stores[0],comparison=comparisonFor(first,request),offer=comparison.winner;
    const drinks=['coffee','tea'].includes(first.key);
    const remarks=drinks?'半糖、少冰，小食单独包装':[/(?:不吃|不要|不放|不加)辣椒|不辣/.test(request)?'不加辣椒':'辣椒另放',/(?:不吃|不要|不放|不加)香菜/.test(request)?'不加香菜':'香菜另放','酱汁分装'].join('、');
    const budgetLeft=money(Math.max(0,conditions.budget-offer.total));
    const joinedTerms=terms=>terms.map(term=>term.replace(/[。；]+$/u,'')).join('；');
    const appliedText=current=>current.applied.length?'已计入：'+current.applied.map(item=>item.label+'（'+item.terms+'）').join('；')+'。':'本单暂无符合条件的优惠，按餐品原价与配送费结算。';
    const ruleText=appliedText(offer);
    const description=[...new Set((first.description+first.reason.replace(/^[^\p{L}\p{N}]+/u,'')).split('。').filter(Boolean))].join('。')+'。';
    const cause=comparison.differences.filter(item=>item.amount).map(item=>item.text).join('；');
    const conclusion=comparison.saving?`${offer.name} 比 ${comparison.other.name} 少付 ${money(comparison.saving)}。${cause}，合并后才是这次实际的差价。`:'两平台本次到手价相同。可以继续比较自己的会员权益与平台显示的预计送达时间。';
    if(round===1) return `💰 按同店、同菜、同份量重新算
这次比较的是${first.name}的${first.dishZh}，${conditions.quantity} 份，含配送预算 ${money(conditions.budget)}。只计算本单满足门槛的活动，不把“最高可减”直接当作已减金额。

🟢 GrabFood
${calculationText(offerFor(first,'grab',request))}。
${appliedText(offerFor(first,'grab',request))}

🟠 ShopeeFood
${calculationText(offerFor(first,'shopee',request))}。
${appliedText(offerFor(first,'shopee',request))}

🔍 为什么最后是这个价格
${conclusion}本单选 ${offer.name} 后，预算还剩 ${budgetLeft}，可留作加配，而不是为了凑券继续增加不需要的餐品。

🎟️ 券怎么用
门槛按店铺折扣后的餐品金额判断；同类平台券取最优惠的一张，不重复叠加。配送减免单独核算，最多减到运费为零。${offer.unavailable.length?'本次没用上的活动：'+joinedTerms(offer.unavailable)+'。':'这份订单已计入符合条件的活动。'}

下方保留 ${stores.length} 家备选。换成两份或提高预算时，券门槛和最便宜的平台都可能变化，可以继续让我重算。`;
    if(round===2) {
      const runner=stores[1];
      return `🥢 如果现在定一家
我会先考虑${first.name}的${first.dishZh}。${first.description}与这次的主食要求、${conditions.quantity} 份和预算一起核对后，它仍在候选范围内。

✨ 具体怎么点
先选${first.dishZh}，备注“${remarks}”。${drinks?'这是一份饮品与轻食搭配，适合短暂休息；如果想把它当午餐，最好再说明饭量，我会改成更完整的餐品组合。':'建议先尝原味再加调料；如果想增加蔬菜，可以先查看菜单中的加配价格，再一起重算到手金额。'}

💸 从哪个平台下单
${calculationText(offer)}。${conclusion}${offer.couponDiscount?'本单已使用 '+offer.couponName+'，条件是 '+offer.couponTerms+'。':''}

🔄 如果更在意另一种体验
${runner?`${runner.name}的${runner.dishZh}也是备选：${runner.description}对应最低到手价 ${money(bestOffer(runner,request)[1].total)}。`:'可以继续告诉我想要更近、更多蔬菜，还是换一种主食，我再调整候选。'}

✅ 下单前再确认两件事
核对平台里的送餐位置与结算价；确认店家是否接受备注。有食物过敏或严格忌口时，需要直接核实配料，不能只依据推荐标签决定。`;
    }
    const alternatives=stores.slice(1,3).map((store,index)=>`${index+1}. ${store.name} · ${store.dishZh}：${store.description}最低到手 ${money(bestOffer(store,request)[1].total)}，示例距离 ${store.distance.toFixed(1)} km。`).join('\n');
    return `🍽️ 先把这顿饭的要求对齐
按${city}、${conditions.quantity} 份、含配送 ${money(conditions.budget)} 筛选，保留 ${stores.length} 家可以继续比较的店。${conditions.notes?'你提到的口味或忌口会继续保留在后续对话里。':'可以继续补充不吃什么、主食偏好和饭量，我会沿用这轮预算再选。'}

🎯 优先看这道菜
${first.name} · ${first.dishZh}。${description}

💡 也给你两种备选
${alternatives||'目前仅这家同时满足所有条件，可以放宽一个条件后再比较。'}

💰 到手价怎么来的
${calculationText(offer)}。${conclusion}
${ruleText}

👇 接下来怎么选
左右滑动看每家店的推荐理由，点店铺可查看菜单、券规则和评论示例；也可以直接问“换成两个人，券能减多少”或“想吃蔬菜多一点的”。演示预算、门槛和份数会一起重新计算。`;
  }
  function answerContent(text) {
    const message=element('div','ios-assistant-message');
    for(const block of text.split('\n\n')) {
      const paragraph=element('section','rich-answer-section');
      const [heading,...body]=block.split('\n');
      if(body.length) paragraph.append(element('strong','rich-answer-heading',heading),element('p','',body.join('\n')));
      else paragraph.append(element('p','',heading));
      message.append(paragraph);
    }
    return message;
  }
  function mountChat(layer,route,open,onCarousel) {
    const scroller=element('section','phone-scroll ios-chat rich-chat');
    const header=element('div','rich-chat-header');
    header.append(element('strong','',query),element('small','',location.label+' · '+new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date())));
    layer.append(header);
    scroller.tabIndex=0;scroller.setAttribute('aria-label','选餐对话，上下滚动查看');
    const requests=[query];
    const reveal=node=>scroller.scrollTo({top:scroller.scrollTop+node.getBoundingClientRect().top-scroller.getBoundingClientRect().top,behavior:reducedMotion()?'instant':'smooth'});
    let busy=false;
    const appendRound=(prompt,round,animate=false)=>{
      scroller.append(element('p','ios-user-message',prompt));
      const appendAnswer=()=>{
        const joined=requests.join('。');activeRequest=joined;const stores=selectedStores({query:joined});
        const reply=element('div','ios-chat-reply');
        const avatar=element('span','ios-avatar','✦');avatar.setAttribute('aria-hidden','true');
        const content=element('div','ios-chat-answer');
        const text=replyText(joined,stores,round);
        content.append(answerContent(text));
        if(stores.length) {
          const rail=element('div','ios-carousel rich-chat-rail');rail.tabIndex=0;
          rail.setAttribute('aria-label',`${stores.length} 家推荐餐厅，左右滑动比较`);
          rail.append(...stores.map(store=>restaurantCard(store,route,open,joined)));
          const counter=element('p','rich-carousel-count',`1 / ${stores.length} 家 · 左右滑动查看`);
          let scheduled=false;
          rail.addEventListener('scroll',()=>{
            if(scheduled)return;scheduled=true;
            requestAnimationFrame(()=>{
              scheduled=false;
              const width=rail.firstElementChild?.getBoundingClientRect().width||1;
              const position=Math.min(stores.length,Math.round(rail.scrollLeft/(width+10*scroller.clientWidth/370))+1);
              counter.textContent=`${position} / ${stores.length} 家 · 左右滑动查看`;
            });
          },{passive:true});
          content.append(rail,counter);
        }
        const actions=element('div','ios-reply-actions');
        const copy=button('⧉ 复制','',async()=>{try{await navigator.clipboard.writeText(text);copy.textContent='已复制';}catch{open('share');}});
        const useful=button('👍 有帮助','',()=>{useful.setAttribute('aria-pressed',String(useful.getAttribute('aria-pressed')!=='true'));});
        useful.setAttribute('aria-pressed','false');actions.append(copy,useful,button('反馈','',()=>open('feedback')));
        content.append(actions);reply.append(avatar,content);scroller.append(reply);
        busy=false;
        if(animate)reveal(reply);
        if(send) send.disabled=!input.value.trim();
      };
      if(animate){busy=true;stepPanel(scroller,panel=>{panel.remove();appendAnswer();},{compact:true,request:prompt,onCancel:()=>{busy=false;scroller.append(element('p','rich-thread-label','这次追问已暂停，可以重新发送。'));if(send)send.disabled=!input.value.trim();}});reveal(scroller.lastElementChild);}
      else appendAnswer();
    };
    let send,input;
    scroller.append(element('p','rich-thread-label','示例对话 · 选餐、费用核对、确认偏好'));
    appendRound(query,0);
    const beverage=criteria(query).categories.some(name=>['coffee','tea'].includes(name));
    const followups=['把配送费也算进去，哪个平台更划算？',beverage?'想要少糖少冰，帮我缩小到最合适的一家。':'继续保留前面的忌口，帮我缩小到最合适的一家。'];
    followups.forEach((prompt,index)=>{requests.push(prompt);appendRound(prompt,index+1);});
    const composer=element('form','ios-composer');
    input=element('input');input.type='text';input.placeholder='继续调整预算、口味或菜品…';
    input.setAttribute('aria-label','继续提问');input.maxLength=300;
    send=element('button','ios-send','➤');send.type='submit';send.disabled=true;send.setAttribute('aria-label','发送追问');
    input.addEventListener('input',()=>{send.disabled=busy||!input.value.trim();});
    composer.addEventListener('submit',event=>{
      event.preventDefault();const text=input.value.trim();if(!text||busy)return;
      input.value='';send.disabled=true;
      requests.push(text);
      const kind=/配送|便宜|平台|总价|费用|划算/.test(text)?1:/香菜|辣椒|定一家|决定|备注|少糖|少冰/.test(text)?2:0;
      appendRound(text,kind,true);
    });
    composer.append(input,send);layer.append(scroller,composer);
    return scroller;
  }
  function setLocation(value) {
    location={...location,...value};featuredOffset=0;
    for(const rail of featuredRails) {if(rail.isConnected)paintFeatured(rail);else featuredRails.delete(rail);}
  }
  return {load,appendMenu,mountChat,homeRestaurants,refreshFeatured,mountProgress,selectedStores,catalogForLocation,offerFor,comparisonFor,calculationText,
    setQuery:text=>{query=String(text).trim()||query;activeRequest=query;},getQuery:()=>query,setLocation,getLocation:()=>({...location}),
    resetChat:()=>{},restaurants:()=>archive};
})();
