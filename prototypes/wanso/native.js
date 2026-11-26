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
    return menu;
  }

  let location = {city:'hanoi',label:'河内 · 还剑区',district:'还剑区'};
  let featuredOffset = 0;
  const featuredRails = new Set();
  const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const catalogForLocation = () => window.wansoCatalog.filter(store => store.city === location.city);
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
      if(desired.some(name=>['soup','mixed'].includes(name))) {const genericNoodles=desired.indexOf('noodles');if(genericNoodles>=0)desired.splice(genericNoodles,1);}
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
  const categoryKeys={noodles:['pho','mixed'],soup:['pho','bun'],mixed:['mixed'],rice:['rice','veggie'],bread:['banh'],coffee:['coffee'],tea:['tea'],veggie:['veggie']};
  function offerFor(store,key,request=activeRequest) {
    const quantity=criteria(request).quantity,offer=store.platforms[key];
    return {...offer,quantity,unitPrice:offer.price,price:offer.price*quantity,total:offer.price*quantity+offer.fee-offer.discount};
  }
  const bestOffer = (store,request='') => Object.keys(store.platforms).map(key=>[key,offerFor(store,key,request)]).sort((a,b)=>a[1].total-b[1].total)[0];
  function selectedStores({limit=5,query:request=query}={}) {
    const conditions=criteria(request);
    const candidates=catalogForLocation().filter(store=>{
      if(bestOffer(store,request)[1].total>conditions.budget) return false;
      if(conditions.vegetarian&&!store.vegetarian) return false;
      if(conditions.fullMeal&&['coffee','tea'].includes(store.key)) return false;
      if(conditions.chicken&&!['pho','mixed','rice','banh','bun'].includes(store.key)) return false;
      if(conditions.noChicken&&['pho','mixed','rice','banh','bun'].includes(store.key)) return false;
      if(conditions.excluded.some(name=>categoryKeys[name]?.includes(store.key))) return false;
      return !conditions.categories.length || conditions.categories.some(name=>categoryKeys[name]?.includes(store.key));
    });
    return candidates.sort((a,b)=> {
      const vegScore=Number(conditions.vegetables&&['rice','veggie'].includes(b.key))-Number(conditions.vegetables&&['rice','veggie'].includes(a.key));
      if(vegScore)return vegScore;
      const local=Number(b.district===location.district)-Number(a.district===location.district);
      if(local) return local;
      if(conditions.close) return a.eta-b.eta || a.distance-b.distance;
      return bestOffer(a,request)[1].total-bestOffer(b,request)[1].total || b.rating-a.rating;
    }).slice(0,limit);
  }
  function picture(store,className='') {
    const image=element('img',className);
    image.src=store.image; image.alt=store.dishZh+' · 示例餐品配图'; image.draggable=false;
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
      element('span','rich-delivery',`🛵 配送 ${money(offer.fee)} · 约 ${store.eta} 分钟`),platforms);
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
    for(const [name,value] of [['餐品',money(cheapest[1].price)],['配送',money(cheapest[1].fee)],['距离',store.distance.toFixed(1)+'km']]) {
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
    reason.append(element('span','','✨'),element('p','',store.reason+` 当前示例中，${cheapest[1].name} 合计 ${money(cheapest[1].total)}，比另一平台省 ${money(Math.abs(offerFor(store,'grab',request).total-offerFor(store,'shopee',request).total))}。`));
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
    const short=location.label || (location.city==='hcm'?'胡志明市':'河内');
    if(!stores.length) return `🔎 在${short}的演示菜单里，暂时没有同时满足这些条件的店铺。我保留了你的本次要求，先不把超预算或不符合饮食偏好的餐品放进结果。可以把预算提高一点，或告诉我主食是否可以更换。`;
    const first=stores[0], [key,offer]=bestOffer(first,request);
    const portions=`${conditions.quantity} 人 / ${conditions.quantity} 份`;
    const drinks=['coffee','tea'].includes(first.key);
    const remarks=drinks?'半糖、少冰，饼干单独包装':'辣椒和香菜另放，酱汁分装';
    if(round===1) return `💰 这次按“${conditions.quantity} 份餐品＋一次配送费－示例优惠”重新核对，预算仍为 ${money(conditions.budget)}。${first.name} 的${first.dishZh} ${conditions.quantity} 份在 ${offer.name} 合计 ${money(offer.total)}：餐品 ${money(offer.price)}＋配送 ${money(offer.fee)}－优惠 ${money(offer.discount)}。\n\n同店同份量比较，另一平台合计 ${money(offerFor(first,key==='grab'?'shopee':'grab',request).total)}。下方 ${stores.length} 家都能继续打开两边的费用明细，不把菜价最低直接当作到手最便宜。🛵 约 ${first.eta} 分钟为演示预计，实际以平台结算页为准。`;
    if(round===2) return `🥢 如果现在要定一家，我会先看 ${first.name} 的${first.dishZh}。${first.description}\n\n✨ 选择它的依据是符合本次主食与预算、含配送合计 ${money(offer.total)}，并且可打开菜单检查具体配料。备注可以写“${remarks}”。店家是否接受备注需要确认，有过敏情况要直接问清配方与交叉接触风险。\n\n✅ 想下决定，可以点 ${offer.name} 查看同一份餐品的明细；也保留其余 ${Math.max(stores.length-1,0)} 家作为备选。`;
    return `🍽️ 我先按${short}、${portions}和 ${money(conditions.budget)} 含配送预算筛选，再对照菜品和两边费用。这里给你 ${stores.length} 家选择，先看具体吃什么，再决定从哪个平台下单。\n\n✨ 优先推荐 ${first.name} 的${first.dishZh}。${first.description} ${offer.name} 示例合计 ${money(offer.total)}，预算还余 ${money(conditions.budget-offer.total)}。\n\n👇 左右滑动可以逐家查看特点和完整理由，也能继续问“含运费哪个更划算”“不吃香菜怎么选”。图片、评分和费用用于产品演示，外卖报价以实际平台为准。`;
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
        content.append(element('p','ios-assistant-message',text));
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
    const followups=['把配送费也算进去，哪个平台更划算？',beverage?'想要少糖少冰，帮我缩小到最合适的一家。':'辣椒和香菜分开放，帮我缩小到最合适的一家。'];
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
  return {load,appendMenu,mountChat,homeRestaurants,refreshFeatured,mountProgress,selectedStores,catalogForLocation,offerFor,
    setQuery:text=>{query=String(text).trim()||query;activeRequest=query;},getQuery:()=>query,setLocation,getLocation:()=>({...location}),
    resetChat:()=>{},restaurants:()=>archive};
})();
