'use strict';

window.wansoNative = (() => {
  const t = value => window.wansoI18n?.text(value) ?? value;
  let query = t('Muốn ăn phở gà thanh đạm, tổng tiền cả giao hàng không quá 80.000đ, gợi ý 5 quán.');
  const menuTranslations = {
    'Phở gà đùi': ['Chicken thigh pho', '鸡腿汤河粉', '鶏もも肉のフォー', '닭다리살 쌀국수'],
    'Phở trộn gà đùi': ['Mixed pho with chicken thigh', '鸡腿拌河粉', '鶏もも肉の和えフォー', '닭다리살 비빔 쌀국수'],
    'Phở gà đùi nước': ['Chicken thigh pho soup', '鸡腿汤河粉', '鶏もも肉のスープフォー', '닭다리살 국물 쌀국수']
  };
  let archive;
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = t(text);
    return node;
  };
  const button = (text, className, action, label) => {
    const node = element('button', className, text);
    node.type = 'button';
    if (label) node.setAttribute('aria-label', t(label));
    node.addEventListener('click', action);
    return node;
  };
  const money = value => new Intl.NumberFormat(window.wansoI18n?.locale||'vi-VN').format(value) + 'đ';
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
    menu.setAttribute('aria-label', t('Thực đơn'));
    menu.append(element('h2', '', 'Thực đơn'));
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

  let location = {city:'hanoi',label:'Hà Nội · Hoàn Kiếm',district:'Hoàn Kiếm'};
  let featuredOffset = 0;
  const featuredRails = new Set();
  const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cityCatalogs=new Map();
  const catalogForLocation=()=>{
    if(window.wansoCatalogByCity?.[location.city])return window.wansoCatalogByCity[location.city];
    if(!cityCatalogs.has(location.city))cityCatalogs.set(location.city,window.wansoCatalog.filter(store=>store.city===location.city));
    return cityCatalogs.get(location.city);
  };
  const selectionCache=new Map();
  const imageLastSeen=new Map();
  const photoScene=store=>store.imageScene||store.image;
  let selectionSequence=0;
  function variedStores(candidates,{limit=5,key,preferredIds=[]}={}) {
    const cacheKey=location.city+':'+location.district+':'+key;
    if(key&&selectionCache.has(cacheKey))return selectionCache.get(cacheKey);
    const selected=[],images=new Set(),brands=new Set();
    const add=store=>{
      if(selected.length>=limit||images.has(photoScene(store)))return false;
      selected.push(store);images.add(photoScene(store));brands.add(store.name.split(' · ')[0]);return true;
    };
    // A price/quantity follow-up keeps its eligible restaurant identities; opening a
    // different page prefers pictures not shown elsewhere in this browser visit.
    const preferred=new Set(preferredIds);
    for(const store of candidates)if(preferred.has(store.id))add(store);
    selection: for(const photo of [true,false])for(const unseen of [true,false])for(const distinctBrand of [true,false]) {
      if(selected.length>=limit)break selection;
      const pool=unseen?candidates:[...candidates].sort((a,b)=>(imageLastSeen.get(photoScene(a))||0)-(imageLastSeen.get(photoScene(b))||0));
      for(const store of pool) {
        if((store.imageKind==='photo')!==photo||(!imageLastSeen.has(photoScene(store)))!==unseen)continue;
        if(distinctBrand&&brands.has(store.name.split(' · ')[0]))continue;
        add(store);
        if(selected.length>=limit)break;
      }
      if(selected.length>=limit)break;
    }
    const sequence=++selectionSequence;
    for(const store of selected)imageLastSeen.set(photoScene(store),sequence);
    if(key)selectionCache.set(cacheKey,selected);
    return selected;
  }
  let activeRequest=query;
  const normalizeQuery = text => String(text).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase();
  function criteria(input) {
    const text=normalizeQuery(input);
    const values={一:1,二:2,两:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9,十:10,mot:1,hai:2,ba:3,bon:4};
    const chineseNumber=value=>value.includes('十') ? (value.split('十')[0]?values[value.split('十')[0]]:1)*10+(values[value.split('十')[1]]||0) : values[value];
    const quantities=[...text.matchAll(/(\d+|两|二|三|四|一|\bmot|\bhai|\bba|\bbon)\s*(?:个人|人|位|份|nguoi\b|phan\b|suat\b)/g)].filter(match=>text[match.index-1]!=='各');
    const quantity=Math.max(1,Math.min(4,quantities.length?Number(quantities.at(-1)[1])||chineseNumber(quantities.at(-1)[1]):1));
    // Dots in 80.000đ are thousands separators, not sentence boundaries.
    const amounts=[...text.matchAll(/(\d{1,3}(?:[.,]\d{3})+)\s*(?:vnd|d\b|dong\b)?|(\d+(?:[.,]\d+)?)\s*(万|千|k\b|nghin\b|ngan\b|trieu\b)|([一二两三四五六七八九十]+)万|(?:预算|不超过|budget|ngan sach|khong qua|toi da|duoi)\s*(\d{4,7})|(\d{4,7})\s*(?:vnd|d\b|dong\b)/gi)];
    const last=amounts.at(-1);
    const budget=last ? last[1]?Number(last[1].replace(/[.,]/g,'')):last[2]?Number(last[2].replace(',','.'))*(last[3]==='万'?10000:last[3]==='trieu'?1000000:1000):last[4]?chineseNumber(last[4])*10000:Number(last[5]||last[6]) : 80000*quantity;
    const latest=(positive,negative)=>{
      const affirmative=[...text.matchAll(positive)].at(-1),negativeMatch=[...text.matchAll(negative)].at(-1);
      const yes=affirmative?affirmative.index+affirmative[0].length:-1;
      const no=negativeMatch?negativeMatch.index+negativeMatch[0].length:-1;
      return yes>=0 && yes>no;
    };
    const vegetarian=latest(/素食|吃素|vegetarian|vegan|\b(?:an |mon )?chay\b/gi,/不吃素|不要素食|荤素都行|改成鸡肉|换鸡肉|khong (?:an |chon )?chay|doi sang (?:thit )?ga/gi);
    const chicken=latest(/鸡肉|鸡腿|chicken|\bga\b/gi,/不吃鸡肉|不要鸡肉|鸡肉过敏|khong (?:an |chon |dung )?(?:thit )?ga|di ung (?:voi )?(?:thit )?ga/gi);
    const noChicken=latest(/不吃鸡肉|不要鸡肉|鸡肉过敏|khong (?:an |chon |dung )?(?:thit )?ga|di ung (?:voi )?(?:thit )?ga/gi,/想吃鸡肉|改成鸡肉|换鸡肉|muon an (?:thit )?ga|doi sang (?:thit )?ga/gi);
    const patterns=[['noodles',/河粉|\bpho\b/gi],['soup',/热汤|汤河粉|米线|喝汤|soup|nuoc dung|mon nuoc|\bbun\b|\bsup\b/gi],['mixed',/干拌|拌河粉|mixed|\btron\b/gi],['rice',/米饭|鸡肉饭|鸡饭|饭套餐|炒饭|rice|\bcom\b/gi],['bread',/法棍|面包|banh mi/gi],['coffee',/咖啡|coffee|ca phe/gi],['tea',/下午茶|奶茶|果茶|饮品|茶饮|tea|\btra\b|do uong|nuoc uong/gi],['veggie',/素食|吃素|vegetarian|vegan|\bchay\b/gi]];
    let categories=[],excluded=[];
    for(const clause of text.split(/[。！？!?;；\n]|\.(?!\d)/)) {
      const desired=[],rejected=[];
      for(const [name,pattern] of patterns) {
        const matches=[...clause.matchAll(pattern)];
        if(!matches.length) continue;
        const match=matches.at(-1),prefix=clause.slice(Math.max(0,match.index-24),match.index);
        if(/(?:不要|不吃|不喝|不想吃|不想喝|不选)$|(?:khong|bo qua)(?: muon)?(?: an| uong| chon)?\s*$/.test(prefix)) rejected.push(name);
        else desired.push(name);
      }
      if(/不要汤|不喝汤|khong (?:an |uong )?(?:mon )?(?:nuoc|sup)/.test(clause)) rejected.push('soup');
      if(desired.includes('noodles')&&!desired.includes('mixed')&&!/米线|\bbun\b/i.test(clause)) {
        const soup=desired.indexOf('soup');if(soup>=0)desired.splice(soup,1);
        desired.splice(desired.indexOf('noodles'),1);desired.push('pho');
      } else if(desired.some(name=>['soup','mixed'].includes(name))) {const genericNoodles=desired.indexOf('noodles');if(genericNoodles>=0)desired.splice(genericNoodles,1);}
      if(desired.includes('soup')&&/米线|\bbun\b/i.test(clause)&&!/河粉|\bpho\b/i.test(clause)) {desired.splice(desired.indexOf('soup'),1);desired.push('bun');}
      if(desired.includes('coffee')&&!/或|或者|都可以|\bhoac\b|deu duoc/.test(clause)) {const genericTea=desired.indexOf('tea');if(genericTea>=0)desired.splice(genericTea,1);}
      if(desired.length) {categories=desired;excluded=excluded.filter(name=>!desired.includes(name));}
      excluded=[...new Set([...excluded,...rejected])];
      categories=categories.filter(name=>!rejected.includes(name));
    }
    if(vegetarian) categories=['veggie'];
    else categories=categories.filter(name=>name!=='veggie');
    return {budget,quantity,vegetarian,noChicken,chicken:chicken&&!vegetarian&&!categories.some(name=>['coffee','tea'].includes(name)),categories,excluded,
      fullMeal:/午餐|晚餐|夜宵|正餐|bua trua|bua toi|an dem|bua chinh/.test(text)&&!categories.some(name=>['coffee','tea'].includes(name)),vegetables:/蔬菜|时蔬|\brau\b/.test(text),
      cheap:/便宜|最低|省钱|划算|总价|\bre\b|tiet kiem|loi hon|thap nhat|tong (?:tien|gia) thap/i.test(text),close:/近|快|赶时间|near|\bgan\b|nhanh|kip gio/i.test(text),notes:/香菜|辣椒|忌口|过敏|allerg|rau mui|ngo ri|\bot\b|di ung|kieng/i.test(text)};
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
      ['price','Giá món',other.price-winner.price,'thấp hơn','cao hơn'],
      ['merchant','Giảm từ quán',winner.merchantDiscount-other.merchantDiscount,'nhiều hơn','ít hơn'],
      ['coupon','Mã ưu đãi',winner.couponDiscount-other.couponDiscount,'giảm nhiều hơn','giảm ít hơn'],
      ['delivery','Phí giao hàng',other.netDeliveryFee-winner.netDeliveryFee,'thấp hơn','cao hơn']
    ].map(([key,label,amount,positive,negative])=>({key,label,amount,text:window.wansoI18n?.chinese
      ? amount ? `${t(label)}${['merchant','coupon'].includes(key)?amount>0?'多减':'少减':amount>0?'少付':'多付'} ${money(Math.abs(amount))}` : `${t(label)}相同`
      : amount?`${label} ${amount>0?positive:negative} ${money(Math.abs(amount))}`:`${label} bằng nhau`}));
    return {winnerKey,winner,other,differences,saving:other.total-winner.total};
  }
  function calculationText(offer) {
    return [`Tiền món ${money(offer.price)}`,...(offer.merchantDiscount?[`− giảm từ quán ${money(offer.merchantDiscount)}`]:[]),...(offer.couponDiscount?[`− mã ưu đãi ${money(offer.couponDiscount)}`]:[]),`＋ giao hàng ${money(offer.originalFee)}`,...(offer.deliveryDiscount?[`− giảm phí giao ${money(offer.deliveryDiscount)}`]:[]),`＝ ${money(offer.total)}`].join(' ');
  }
  function selectedStores({limit=5,query:request=query,surface='search',preferredIds=[]}={}) {
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
    return variedStores(candidates,{limit,key:surface+':'+request+':'+limit,preferredIds:(conditions.cheap||conditions.close)&&!preferredIds.length?candidates.slice(0,1).map(store=>store.id):preferredIds});
  }

  function picture(store,className='') {
    return window.wansoMedia.image(store.image,{className,alt:store.imageAlt||store.dishZh+' · Ảnh món ăn',width:220,height:112});
  }
  function platformBadge(key) {
    const badge=element('span','rich-platform-badge',key==='grab'?'G':'S');
    badge.dataset.platform=key;
    badge.title=key==='grab'?'GrabFood':'ShopeeFood';
    return badge;
  }
  function homeCard(store,open,route) {
    const card=button('','ios-home-restaurant rich-home-card',()=>open?open('catalogStore',store.id):route('store-first'),'Xem '+store.name);
    card.dataset.storeId=store.id;
    const cover=element('div','rich-pick-cover');
    cover.append(picture(store),element('span','rich-ai-pick','✦ AI GỢI Ý'));
    const details=element('div','ios-home-store-info');
    const tags=element('div','rich-tags');
    store.tags.forEach(tag=>tags.append(element('span','',tag)));
    const offer=bestOffer(store)[1];
    const platforms=element('div','rich-home-platforms');
    platforms.append(platformBadge('grab'),platformBadge('shopee'),element('span','','Hai nền tảng'));
    details.append(element('strong','',store.name),element('span','rich-category',store.category),tags,
      element('span','rich-pick-stats',`★ ${store.rating.toLocaleString(window.wansoI18n?.locale||'vi-VN',{minimumFractionDigits:1})} (${store.reviewCount.toLocaleString(window.wansoI18n?.locale||'vi-VN')}) · ${store.distance.toLocaleString(window.wansoI18n?.locale||'vi-VN',{minimumFractionDigits:1})} km`),
      element('span','rich-delivery',`🛵 ${offer.netDeliveryFee?'Phí giao '+money(offer.netDeliveryFee):'Miễn phí giao hàng'} · Khoảng ${store.eta} phút`),platforms);
    card.append(cover,details);
    return card;
  }
  function paintFeatured(rail) {
    const list=catalogForLocation();
    const candidates=[...list.slice(featuredOffset),...list.slice(0,featuredOffset)];
    const picked=variedStores(candidates,{key:'home:'+featuredOffset,limit:5});
    rail.replaceChildren(...picked.map(store=>homeCard(store,rail.openStore,rail.routeStore)));
    rail.scrollLeft=0;
    rail.dataset.batch=String(Math.floor(featuredOffset/5)+1);
  }
  function homeRestaurants(route,open) {
    const rail=element('div','ios-carousel ios-home-carousel rich-home-rail');
    rail.tabIndex=0; rail.setAttribute('aria-label',t('Wanso tuyển chọn, 5 quán trên hai nền tảng. Vuốt ngang để xem.'));
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
    const main=button('','ios-restaurant-main',()=>open('catalogStore',{id:store.id,request}),'Xem thực đơn '+store.name);
    const photo=element('div','ios-restaurant-photo');
    photo.append(picture(store),element('span','ios-rating','⭐ '+store.rating.toLocaleString(window.wansoI18n?.locale||'vi-VN',{minimumFractionDigits:1})));
    const info=element('div','ios-restaurant-info');
    const tags=element('div','rich-tags');
    tags.append(element('span','rich-smart','✨ Gợi ý phù hợp'),element('span','','💰 Trong ngân sách'),element('span','',store.tags[0]));
    const stats=element('dl','ios-restaurant-stats');
    const cheapest=bestOffer(store,request);
    for(const [name,value] of [['Tiền món',money(cheapest[1].price)],['Phí giao',money(cheapest[1].netDeliveryFee)],['Khoảng cách',store.distance.toLocaleString(window.wansoI18n?.locale||'vi-VN',{minimumFractionDigits:1})+'km']]) {
      const term=element('div');term.append(element('dt','',name),element('dd','',value));stats.append(term);
    }
    info.append(element('strong','ios-restaurant-name',store.name),tags,element('span','ios-sample','✦ '+store.dishZh),stats);
    main.append(photo,info);
    const offers=element('div','rich-offers');
    for(const key of Object.keys(store.platforms)) {
      const offer=offerFor(store,key,request);
      const row=button('','rich-offer',()=>open('catalogOrder',{id:store.id,platform:key,request}),store.name+' · '+offer.name+' · Đặt món');
      row.dataset.platform=key;
      row.append(platformBadge(key),element('span','',offer.name),element('strong','',money(offer.total)),element('b','','→'));
      offers.append(row);
    }
    card.append(main,element('small','rich-total-label',`${criteria(request).quantity} phần · Đã gồm giao hàng và ưu đãi`),offers);
    const reason=element('div','ios-card-reason rich-card-reason');
    const comparison=comparisonFor(store,request);
    const reasonText=window.wansoI18n?.chinese
      ? `${t(store.reason)}

💰 ${cheapest[1].name} 到手价 ${money(cheapest[1].total)}。${comparison.saving?comparison.differences.filter(item=>item.amount).map(item=>item.text).join('；')+'，合计省 '+money(comparison.saving)+'。':'两平台到手价相同，可结合预计送达时间与账号权益选择。'}
${cheapest[1].couponDiscount?'🎟️ '+t(cheapest[1].couponTerms):'本单没有额外可用平台券，已按满足条件的活动计算总价。'}`
      : store.reason+`\n\n💰 Tổng trên ${cheapest[1].name}: ${money(cheapest[1].total)}. `+(comparison.saving?`${comparison.differences.filter(item=>item.amount).map(item=>item.text).join('; ')}. Tổng cộng tiết kiệm ${money(comparison.saving)}.`:'Hai nền tảng có cùng tổng tiền. Bạn có thể cân nhắc thời gian giao dự kiến và quyền lợi tài khoản của mình.')+`\n${cheapest[1].couponDiscount?'🎟️ '+cheapest[1].couponTerms:'Đơn này không có mã nền tảng đủ điều kiện; các ưu đãi phù hợp đã được tính vào tổng.'}`;
    reason.append(element('span','','✨'),element('p','',reasonText));
    shell.append(card,reason);
    return shell;
  }

  function stepPanel(parent,done,{compact=false,request=query,onCancel}={}) {
    const stages=[['Hiểu nhu cầu của bạn','Ghi nhận món, ngân sách và món cần tránh'],['Xác định cách tìm','Dựa trên thành phố và điều kiện của bạn'],['Tìm trên hai nền tảng','Đối chiếu GrabFood và ShopeeFood'],['Sắp xếp lựa chọn','So độ phù hợp, tổng tiền và khoảng cách'],['Tổng hợp gợi ý','Nêu rõ món nên chọn và lý do'],['Sắp xong rồi','Kiểm tra phép tính và bước tiếp theo']];
    const panel=element('section','rich-processing'+(compact?' rich-processing-compact':''));
    panel.setAttribute('role','status');panel.setAttribute('aria-live','polite');
    const heading=element('h2','','Wanso đang chọn món cho bạn');
    const caption=element('p','rich-processing-query',request);
    const progress=element('div','rich-progress');const fill=element('span');progress.append(fill);
    const list=element('ol','rich-step-list');
    const rows=stages.map(([label,hint])=>{
      const item=element('li');item.dataset.state='pending';
      const marker=element('span','rich-step-marker','·');const copy=element('div');copy.append(element('strong','',label),element('small','',hint));
      item.append(marker,copy);list.append(item);return item;
    });
    panel.append(heading,caption,progress,list);
    parent.append(panel);
    let step=0,timer;
    const advance=()=>{
      if(!panel.isConnected) {panel.remove();onCancel?.();return;}
      rows.forEach((row,index)=>{
        row.dataset.state=index<step?'done':index===step?'active':'pending';
        row.querySelector('.rich-step-marker').textContent=t(index<step?'✓':index===step?'':'·');
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
    scroller.tabIndex=0;scroller.setAttribute('aria-label',t('Các bước tìm món phù hợp'));layer.append(scroller);
    return stepPanel(scroller,done);
  }
  function replyTextZh(request,stores,round=0) {
    const c=criteria(request),normalized=normalizeQuery(request),city=t(location.label||'Hà Nội');
    if(!stores.length)return `🔎 先保留你在意的条件
在${city}还没有找到同时符合预算、份数与口味要求的餐品。我没有把超预算的店混进推荐，也没有擅自放宽忌口。

可以怎样继续？
告诉我是否接受换一种主食、稍远一点的店，或把预算提高一些。之前提到的过敏和忌口会继续保留，我们一次只调整你愿意放宽的条件。`;
    const first=stores[0],result=comparisonFor(first,request),offer=result.winner;
    const dish=t(first.dishZh),drinks=['coffee','tea'].includes(first.key);
    const remarks=drinks?'少糖、少冰，小食单独包装':[
      /不辣|(?:不吃|不要|不放|不加)辣椒|khong (?:an |them |cho )?ot|khong cay/.test(normalized)?'不加辣椒':'辣椒另放',
      /(?:不吃|不要|不放|不加)香菜|khong (?:an |them |cho )?(?:rau mui|ngo ri)/.test(normalized)?'不放香菜':'香草另放','酱汁另放'].join('，');
    const equation=current=>`餐品 ${money(current.price)}${current.merchantDiscount?' − 店铺折扣 '+money(current.merchantDiscount):''}${current.couponDiscount?' − 平台券 '+money(current.couponDiscount):''} ＋ 配送 ${money(current.originalFee)}${current.deliveryDiscount?' − 配送优惠 '+money(current.deliveryDiscount):''} ＝ ${money(current.total)}`;
    const terms=current=>current.applied.length?current.applied.map(item=>`${t(item.label)}：${t(item.terms)}`).join('；')+'。':'本单没有满足门槛的优惠，按餐品金额加配送费计算。';
    const direction=result.differences.filter(item=>item.amount).map(item=>t(item.text)).join('；');
    const conclusion=result.saving?`${offer.name} 比 ${result.other.name} 少付 ${money(result.saving)}。${direction}；把四项差额合在一起，才是这单真正节省的金额。`:'两平台本单到手价相同，可再比较账号会员权益和预计送达时间。';
    if(round===1)return `💰 同一家店、同一道菜，先把账算清楚
这次比较${first.name}的${dish}，共 ${c.quantity} 份，预算 ${money(c.budget)} 包含配送。只扣除本单已满足门槛的优惠，不把“最高可减”直接当成实际优惠。

🟢 GrabFood · 本单费用
${equation(offerFor(first,'grab',request))}。
${terms(offerFor(first,'grab',request))}

🟠 ShopeeFood · 本单费用
${equation(offerFor(first,'shopee',request))}。
${terms(offerFor(first,'shopee',request))}

🔍 为什么这个平台更便宜？
${conclusion} 选 ${offer.name} 后，距离预算还余 ${money(Math.max(0,c.budget-offer.total))}。这部分可以留给确实需要的加菜，不必为了凑满减多买一份。

🎟️ 优惠券是怎么计算的？
先扣店铺折扣，再用折后餐费判断平台券门槛；同一订单只选择一张最划算的平台券。配送优惠单独计算，最多减到实际配送费，不会出现负运费。${offer.unavailable.length?'当前未采用：'+offer.unavailable.map(t).join('；'):'本单符合条件的优惠已计入上面的总价。'}

下面保留 ${stores.length} 家候选，方便继续横向比较。改成两人份或增加配菜后，优惠门槛和最便宜的平台可能变化，我会按新订单重新计算。`;
    if(round===2) {
      const other=stores[1];
      return `🥢 如果现在定一家，我会这样选
优先考虑${first.name}的${dish}。${t(first.description)} 保留你之前的用餐要求，按 ${c.quantity} 份计算，也能控制在 ${money(c.budget)} 的含配送预算内。

✨ 点什么，怎么备注？
选择${dish}，备注“${remarks}”。${drinks?'这是一份饮品搭配小食，适合下午休息；如果你需要完整正餐，可以继续说明饭量，我会切换到主食类。':'先尝原味，再决定是否补调味。想多吃一些蔬菜，可以查看同店加配价格，我会把加菜金额、优惠门槛和配送一起重算。'}

💸 去哪个平台更合适？
${equation(offer)}。
${conclusion}${offer.couponDiscount?' 本单已选「'+t(offer.couponName)+'」，条件为：'+t(offer.couponTerms)+'。':''}

🔄 再给你一个可替换的选择
${other?`${other.name}的${t(other.dishZh)}：${t(other.description)} 当前最低到手价 ${money(bestOffer(other,request)[1].total)}。可以打开菜单，比较肉的部位、份量和加配，再决定是否替换。`:'你可以继续提出想要更近、更多蔬菜，或换一种主食，我会重新筛选。'}

✅ 下单前确认这两件事
核对送餐地址和平台最终支付价；确认店家能否满足备注。若有食物过敏或严格忌口，请直接向店家确认配料与制作方式，不能仅凭推荐标签判断。`;
    }
    const alternatives=stores.slice(1,3).map((store,index)=>`${index+1}. ${store.name} · ${t(store.dishZh)}
${store.tags.slice(0,3).map(t).join(' · ')}。在 ${bestOffer(store,request)[1].name} 到手 ${money(bestOffer(store,request)[1].total)}，预计 ${store.eta} 分钟，距离约 ${store.distance.toFixed(1)} 公里。`).join('\n');
    return `🍽️ 这顿饭的要求，我记住了
位置在${city}，共 ${c.quantity} 份，含配送不超过 ${money(c.budget)}。按菜品、预算和距离筛选后，保留 ${stores.length} 家餐厅供你比较。${c.notes?'你提到的口味与忌口也会保留到下一轮。':'还可以补充口味、忌口或饭量，我会在当前预算内调整。'}

🎯 这道菜值得先看
${first.name} · ${dish}
${t(first.reason).replace(/^[^\p{L}\p{N}]+/u,'')}

💡 另外两种选择，各有侧重
${alternatives||'目前仅一家满足全部条件，可放宽一项要求后再比较。'}

💰 到手价不是只看菜单价
${equation(offer)}。
${conclusion}
${terms(offer)}

👇 接下来，你可以这样选
左右滑动查看每家店的具体菜品、推荐理由和两平台报价；打开店铺可以核对菜单、优惠条件和用餐建议。也可以继续问“算上配送哪个平台更便宜？”或“改成两个人，优惠怎么变？”，我会把份数、门槛与总价一起重算。`;
  }

  function replyText(request,stores,round=0) {
    if(window.wansoI18n?.chinese)return replyTextZh(request,stores,round);
    const conditions=criteria(request),normalized=normalizeQuery(request);
    const city=location.label || (location.city==='hcm'?'TP. Hồ Chí Minh':'Hà Nội');
    if(!stores.length) return `🔎 Mình vẫn giữ các yêu cầu của bạn
Chưa tìm thấy món tại ${city} đồng thời phù hợp ngân sách và yêu cầu ăn uống. Mình không đưa quán vượt ngân sách vào danh sách chỉ để có thêm kết quả.

Bạn muốn điều chỉnh điều kiện nào?
Có thể đổi loại món, tăng ngân sách hoặc xem quán xa hơn một chút. Cho mình biết ngân sách có cần bao gồm đồ uống không; các yêu cầu kiêng và dị ứng bạn đã nói vẫn được giữ cho lần tìm tiếp theo.`;
    const first=stores[0],comparison=comparisonFor(first,request),offer=comparison.winner;
    const drinks=['coffee','tea'].includes(first.key);
    const remarks=drinks?'ít đường, ít đá, món ăn nhẹ gói riêng':[/不辣|(?:不吃|不要|不放|不加)辣椒|khong (?:an |them |cho )?ot|khong cay/.test(normalized)?'không ớt':'ớt để riêng',/(?:不吃|不要|不放|不加)香菜|khong (?:an |them |cho )?(?:rau mui|ngo ri)/.test(normalized)?'không rau mùi':'rau thơm để riêng','sốt để riêng'].join(', ');
    const budgetLeft=money(Math.max(0,conditions.budget-offer.total));
    const joinedTerms=terms=>terms.map(term=>term.replace(/[.;]+$/u,'')).join('; ');
    const appliedText=current=>current.applied.length?'Đã áp dụng: '+current.applied.map(item=>item.label+' ('+item.terms+')').join('; ')+'.':'Đơn chưa có ưu đãi đủ điều kiện; tổng tiền gồm giá món và phí giao hàng.';
    const ruleText=appliedText(offer);
    const description=first.reason.replace(/^[^\p{L}\p{N}]+/u,'');
    const cause=comparison.differences.filter(item=>item.amount).map(item=>item.text).join('; ');
    const conclusion=comparison.saving?`${offer.name} thấp hơn ${comparison.other.name} ${money(comparison.saving)}. ${cause}; cộng các chênh lệch này mới ra số tiền tiết kiệm cuối cùng.`:'Hai nền tảng có cùng tổng tiền cho đơn này. Bạn có thể so thêm quyền lợi thành viên và thời gian giao dự kiến trên tài khoản của mình.';
    if(round===1) return `💰 So cùng quán, cùng món và cùng số phần
Mình tính lại ${first.dishZh} tại ${first.name}, ${conditions.quantity} phần, với ngân sách ${money(conditions.budget)} đã gồm giao hàng. Chỉ ưu đãi đủ điều kiện mới được trừ; mức “giảm tối đa” không tự động trở thành số tiền giảm của đơn.

🟢 GrabFood
${calculationText(offerFor(first,'grab',request))}.
${appliedText(offerFor(first,'grab',request))}

🟠 ShopeeFood
${calculationText(offerFor(first,'shopee',request))}.
${appliedText(offerFor(first,'shopee',request))}

🔍 Vì sao tổng tiền khác nhau?
${conclusion} Chọn ${offer.name} còn dư ${budgetLeft} so với ngân sách. Bạn có thể giữ khoản này cho món thêm cần thiết, thay vì mua thêm chỉ để đủ mức dùng mã.

🎟️ Điều kiện dùng mã
Mức tối thiểu tính trên tiền món sau giảm của quán. Mỗi đơn chọn một mã nền tảng có lợi nhất; ưu đãi giao hàng tính riêng và không vượt phí giao thực tế. ${offer.unavailable.length?'Ưu đãi chưa dùng: '+joinedTerms(offer.unavailable)+'.':'Tổng tiền đã bao gồm các ưu đãi mà đơn đủ điều kiện.'}

Mình giữ ${stores.length} quán ở dưới để bạn tiếp tục so sánh. Nếu đổi thành hai phần hoặc thêm món, điều kiện dùng mã và nền tảng rẻ nhất có thể thay đổi; mình sẽ tính lại theo đơn mới.`;
    if(round===2) {
      const runner=stores[1];
      return `🥢 Nếu chọn một quán ngay bây giờ
Mình nghiêng về ${first.dishZh} tại ${first.name}. ${first.description} Món vẫn đáp ứng yêu cầu hiện tại, số lượng ${conditions.quantity} phần và mức ngân sách bạn đặt ra.

✨ Nên đặt thế nào?
Chọn ${first.dishZh}, ghi chú “${remarks}”. ${drinks?'Đây là đồ uống đi cùng món nhẹ, hợp cho giờ nghỉ. Nếu bạn cần một bữa trưa đầy đủ, hãy nói thêm về khẩu phần để mình chuyển sang nhóm món chính.':'Bạn có thể nếm trước rồi thêm gia vị. Muốn thêm rau, hãy kiểm tra giá món thêm trong thực đơn để mình tính lại tổng tiền cùng đơn.'}

💸 Nên dùng nền tảng nào?
${calculationText(offer)}. ${conclusion} ${offer.couponDiscount?'Đơn đã dùng '+offer.couponName+'. '+offer.couponTerms+'.':''}

🔄 Một lựa chọn khác để cân nhắc
${runner?`${runner.dishZh} tại ${runner.name}: ${runner.description} Tổng thấp nhất là ${money(bestOffer(runner,request)[1].total)}. Bạn có thể mở thực đơn để so khẩu phần và món thêm trước khi quyết định.`:'Bạn có thể nói muốn quán gần hơn, thêm rau hoặc đổi món chính để mình tìm phương án khác.'}

✅ Hai việc nên kiểm tra trước khi đặt
Kiểm tra lại địa chỉ giao và giá thanh toán trên nền tảng; xác nhận quán có đáp ứng ghi chú không. Với dị ứng hoặc yêu cầu ăn uống nghiêm ngặt, hãy hỏi trực tiếp thành phần món và cách chế biến, đừng chỉ dựa vào nhãn gợi ý.`;
    }
    const alternatives=stores.slice(1,3).map((store,index)=>{
      const alternative=bestOffer(store,request)[1];
      return `${index+1}. ${store.name} · ${store.dishZh}. ${store.tags.slice(0,3).join(' · ')}. Tổng ${money(alternative.total)} trên ${alternative.name}, dự kiến ${store.eta} phút, cách khoảng ${store.distance.toLocaleString(window.wansoI18n?.locale||'vi-VN',{minimumFractionDigits:1})} km.`;
    }).join('\n');
    return `🍽️ Mình đã nắm yêu cầu cho bữa này
Tìm tại ${city}, ${conditions.quantity} phần, tối đa ${money(conditions.budget)} đã gồm phí giao hàng; có ${stores.length} quán để bạn tiếp tục so sánh. ${conditions.notes?'Các lưu ý khẩu vị và món cần tránh sẽ được giữ khi bạn hỏi tiếp.':'Bạn có thể bổ sung món cần tránh, loại món ưa thích hoặc khẩu phần; mình sẽ điều chỉnh trong ngân sách này.'}

🎯 Món đáng xem trước
${first.name}. ${description}

💡 Hai phương án khác cũng phù hợp
${alternatives||'Hiện chỉ một quán đáp ứng đủ điều kiện. Có thể nới một yêu cầu để so thêm phương án.'}

💰 Tổng tiền được tính thế nào?
${calculationText(offer)}. ${conclusion}
${ruleText}

👇 Bạn có thể chọn tiếp thế nào?
Vuốt ngang để xem lý do gợi ý từng quán; mở quán để xem thực đơn, mã ưu đãi và lưu ý khẩu vị. Hoặc hỏi “Đổi thành hai người thì mã giảm được bao nhiêu?” hay “Muốn thêm rau hơn”. Mình sẽ tính lại số phần, mức dùng mã và tổng tiền cùng nhau.`;
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
    header.append(element('strong','','Trò chuyện chọn món'),element('small','',location.label+' · '+new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date())));
    layer.append(header);
    scroller.tabIndex=0;scroller.setAttribute('aria-label',t('Cuộc trò chuyện chọn món, cuộn để xem'));
    const requests=[query];
    const reveal=node=>scroller.scrollTo({top:scroller.scrollTop+node.getBoundingClientRect().top-scroller.getBoundingClientRect().top,behavior:reducedMotion()?'instant':'smooth'});
    let busy=false,previousStores=[];
    const appendRound=(prompt,round,animate=false)=>{
      scroller.append(element('p','ios-user-message',prompt));
      const appendAnswer=()=>{
        const joined=requests.join('。');activeRequest=joined;const stores=selectedStores({query:joined,surface:'chat',preferredIds:/换五家|再推荐|其他店|换一批|doi.*quan|goi y.*khac|quan khac/.test(normalizeQuery(prompt))?[]:previousStores.map(store=>store.id)});
        previousStores=stores;
        const reply=element('div','ios-chat-reply');
        const avatar=element('span','ios-avatar','✦');avatar.setAttribute('aria-hidden','true');
        const content=element('div','ios-chat-answer');
        const text=replyText(joined,stores,round);
        content.append(answerContent(text));
        if(stores.length) {
          const rail=element('div','ios-carousel rich-chat-rail');rail.tabIndex=0;
          rail.setAttribute('aria-label',t(`${stores.length} quán được gợi ý, vuốt ngang để so sánh`));
          rail.append(...stores.map(store=>restaurantCard(store,route,open,joined)));
          const counter=element('p','rich-carousel-count',`1 / ${stores.length} quán · Vuốt ngang để xem`);
          let scheduled=false;
          rail.addEventListener('scroll',()=>{
            if(scheduled)return;scheduled=true;
            requestAnimationFrame(()=>{
              scheduled=false;
              const width=rail.firstElementChild?.getBoundingClientRect().width||1;
              const position=Math.min(stores.length,Math.round(rail.scrollLeft/(width+10*scroller.clientWidth/370))+1);
              counter.textContent=t(`${position} / ${stores.length} quán · Vuốt ngang để xem`);
            });
          },{passive:true});
          content.append(rail,counter);
        }
        const actions=element('div','ios-reply-actions');
        const copy=button('⧉ Sao chép','',async()=>{try{await navigator.clipboard.writeText(text);copy.textContent=t('Đã sao chép');}catch{open('share');}});
        const useful=button('👍 Hữu ích','',()=>{useful.setAttribute('aria-pressed',String(useful.getAttribute('aria-pressed')!=='true'));});
        useful.setAttribute('aria-pressed','false');actions.append(copy,useful,button('Góp ý','',()=>open('feedback')));
        content.append(actions);reply.append(avatar,content);scroller.append(reply);
        busy=false;
        if(animate)reveal(reply);
        if(send) send.disabled=!input.value.trim();
      };
      if(animate){busy=true;stepPanel(scroller,panel=>{panel.remove();appendAnswer();},{compact:true,request:prompt,onCancel:()=>{busy=false;scroller.append(element('p','rich-thread-label','Lượt hỏi này đã tạm dừng. Bạn có thể gửi lại.'));if(send)send.disabled=!input.value.trim();}});reveal(scroller.lastElementChild);}
      else appendAnswer();
    };
    let send,input;
    scroller.append(element('p','rich-thread-label','Chọn món · So giá · Chốt khẩu vị'));
    appendRound(query,0);
    const beverage=criteria(query).categories.some(name=>['coffee','tea'].includes(name));
    const followups=['Tính cả phí giao hàng thì nền tảng nào tiết kiệm hơn?',beverage?'Mình muốn ít đường, ít đá. Chọn giúp mình một quán phù hợp nhất.':'Giữ các yêu cầu ăn uống ở trên và chọn giúp mình một quán phù hợp nhất.'];
    followups.map(t).forEach((prompt,index)=>{requests.push(prompt);appendRound(prompt,index+1);});
    const composer=element('form','ios-composer');
    input=element('textarea');input.rows=1;input.enterKeyHint='enter';input.placeholder=t('Nhắn thêm yêu cầu…');
    input.setAttribute('aria-label',t('Hỏi tiếp'));input.maxLength=300;
    send=element('button','ios-send','➤');send.type='submit';send.disabled=true;send.setAttribute('aria-label',t('Gửi câu hỏi'));
    const resizeComposer=()=>window.wansoControls.resizeTextarea(input);
    input.addEventListener('input',()=>{send.disabled=busy||!input.value.trim();resizeComposer();});
    input.addEventListener('keydown',event=>{
      if(event.key==='Enter'&&!event.isComposing&&(event.ctrlKey||event.metaKey)) {event.preventDefault();composer.requestSubmit();}
    });
    composer.addEventListener('submit',event=>{
      event.preventDefault();const text=input.value.trim();if(!text||busy)return;
      input.value='';send.disabled=true;resizeComposer();
      requests.push(text);
      const normalized=normalizeQuery(text);
      const kind=/配送|便宜|平台|总价|费用|划算|giao hang|tiet kiem|nen tang|tong tien|chi phi|uu dai|ma giam|re hon/.test(normalized)?1:/香菜|辣椒|定一家|决定|备注|少糖|少冰|rau mui|ngo ri|it duong|it da|chon.*mot quan|ghi chu|khau vi/.test(normalized)?2:0;
      appendRound(text,kind,true);
    });
    composer.append(input,send);layer.append(scroller,composer);
    requestAnimationFrame(resizeComposer);
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
