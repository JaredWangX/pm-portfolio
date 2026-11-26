'use strict';

// MerchantDetailView.swift: one scroll view, the same detail screen from every entry point.
window.wansoStore = (() => {
  const el=(tag,className,text)=>{
    const node=document.createElement(tag);
    if(className)node.className=className;
    if(text!==undefined)node.textContent=text;
    return node;
  };
  const money=value=>new Intl.NumberFormat('vi-VN').format(value)+'đ';
  const languages=[['original','◎','原文'],['en','A','English'],['vi','V','Tiếng Việt'],['zh','中','中文'],['ja','あ','日本語'],['ko','한','한국어']];
  const legacyLanguages=['original','en','vi','zh','ja','ko'];
  const icons={walk:'M13 3a1.5 1.5 0 1 0 .01 0M10 8l3-2 2 5 4 2M13 7l-1 6 4 8M12 13l-5 7M10 8l-3 5',back:'M14 5 7 12l7 7',share:'M12 15V3m-4 4 4-4 4 4M7 11H4v10h16V11h-3',heart:'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',pin:'M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0ZM9 10a3 3 0 1 0 6 0 3 3 0 0 0-6 0',chevron:'m9 5 7 7-7 7',close:'m6 6 12 12M18 6 6 18',arrow:'M7 17 17 7M7 7h10v10'};
  const icon=name=>{
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.8');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');svg.setAttribute('aria-hidden','true');
    const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',icons[name]);svg.append(path);return svg;
  };
  const button=(className,label,action)=>{
    const node=el('button',className);node.type='button';node.setAttribute('aria-label',label);node.addEventListener('click',action);return node;
  };
  function mount(parent,store,{request='',onClose,onAction,state={}}={}) {
    const root=el('section','native-store-view');root.dataset.storeId=store.id;root.setAttribute('aria-label',store.name+' · 餐厅详情');
    const scroll=el('div','native-store-scroll');scroll.tabIndex=0;scroll.setAttribute('aria-label','餐厅详情，可上下滑动');
    root.append(scroll);parent.append(root);
    let languageSheet,previousFocus,selectedLanguage=legacyLanguages[state.menuLanguage?.[store.id]]||'original',appliedLanguage=legacyLanguages[state.translated?.[store.id]]||'original';
    const offers=Object.fromEntries(Object.keys(store.platforms).map(key=>[key,window.wansoNative.offerFor(store,key,request)]));
    const entries=Object.entries(offers),winner=entries.reduce((a,b)=>a[1].total<=b[1].total?a:b);
    const quantity=winner[1].quantity;
    const hero=el('div','native-store-hero');
    const image=el('img');image.src=store.image;image.alt=store.dishZh+' · 菜品示意';image.width=402;image.height=240;image.draggable=false;image.decoding='async';
    const toolbar=el('div','native-store-toolbar');
    const back=button('native-store-circle native-store-back','返回上一页',()=>onClose?.());back.append(icon('back'));
    const share=button('native-store-circle','分享餐厅',()=>onAction?.('catalogShare',{id:store.id}));share.append(icon('share'));
    const heart=button('native-store-circle native-store-heart','收藏餐厅',()=>{
      if(state.group?.[store.id]) {delete state.group[store.id];refreshSaved();}
      else onAction?.('catalogSave',{id:store.id});
    });heart.append(icon('heart'));
    const right=el('div');right.append(share,heart);toolbar.append(back,right);
    const open=el('span','native-store-open','示例营业中');open.prepend(el('i'));
    hero.append(image,toolbar,open);scroll.append(hero);
    const info=el('section','native-store-info');
    const title=el('h1','',store.name);
    const rating=el('div','native-store-rating');rating.append(el('span','native-store-star','★'),el('strong','',store.rating.toFixed(1)),el('span','',`(${new Intl.NumberFormat('en-US').format(store.reviewCount)})`),el('span','','·'),icon('walk'),el('span','',`${store.distance.toFixed(1)} km`));
    const tags=el('div','native-store-tags');for(const tag of [store.category.split(' · ')[0],...store.tags].slice(0,8))tags.append(el('span','',tag));
    const address=el('div','native-store-address');address.append(icon('pin'),el('span','',store.address||`${store.district} · ${store.city==='hcm'?'胡志明市':'河内'}`));
    info.append(title,rating,tags,address);scroll.append(info);
    const body=el('div','native-store-body');scroll.append(body);
    const summary=el('section','native-store-summary');
    const spark=el('span','native-store-spark','✦'),summaryText=el('div');
    const summaryOffer=el('div','native-store-summary-offer');
    const summaryOfferLabel=el('div');summaryOfferLabel.append(el('span','',`${quantity} 份${store.dishZh}`),el('small','',winner[1].name+' · 含配送'));
    summaryOffer.append(summaryOfferLabel,el('strong','',money(winner[1].total)));
    summaryText.append(el('h2','','AI 推荐理由'),el('p','',store.reason),summaryOffer);summary.append(spark,summaryText);body.append(summary);
    const translate=el('div','native-store-translate');
    const choose=button('native-store-choose-language','选择菜单翻译语言',showLanguagePicker);
    const label=el('span'),languageValue=el('small');label.append(el('strong','','选择语言'),languageValue);choose.append(label,icon('chevron'));
    const apply=button('native-store-apply-translation','翻译菜单',()=>{
      if(selectedLanguage==='original'){showLanguagePicker();return;}
      appliedLanguage=selectedLanguage;
      state.translated??={};state.translated[store.id]=legacyLanguages.indexOf(appliedLanguage);
      renderMenu();apply.querySelector('span').textContent='已翻译';
    });apply.dataset.action='translate';apply.append(el('b','','文A'),el('span','','翻译'));
    translate.append(choose,apply);body.append(translate);
    const platforms=el('section','native-store-platforms');platforms.setAttribute('aria-label','双平台配送与价格');
    for(const [key,offer] of entries) {
      const card=el('article','native-store-platform');card.dataset.platform=key;
      const header=el('div','native-store-platform-heading'),mark=el('span','native-store-platform-mark',key==='grab'?'GF':'SF');
      const platformRating=el('p','native-store-platform-rating');platformRating.append(el('span','',`★ ${(store.platforms[key].rating||store.rating).toFixed(1)}`),el('span','',`${store.platforms[key].reviewCount||store.reviewCount} 条评价`));
      header.append(mark,el('h2','',offer.name),platformRating);
      const detail=el('div','native-store-platform-body');
      const delivery=el('p','native-store-delivery');delivery.append(el('span','','配送费'),el('strong','',money(offer.fee)));
      const promo=el('p','native-store-promo');promo.append(el('span','','示例优惠'),el('strong','',offer.discount?'−'+money(offer.discount):'暂无'));
      const total=el('div','native-store-platform-total');total.append(el('span','',`${quantity} 份 · 含配送`),el('strong','',money(offer.total)));
      detail.append(delivery,promo,total);
      const order=button('native-store-order','立即下单 · '+offer.name,()=>onAction?.('catalogOrder',{id:store.id,platform:key,request}));order.append(el('span','','立即下单'),icon('arrow'));
      card.append(header,detail,order);platforms.append(card);
    }
    body.append(platforms);
    const compare=el('section','native-store-compare');
    compare.append(el('h2','native-store-section-heading','菜品比价'));
    const comparison=el('div','native-store-comparison-card');
    const differing=store.menu.filter((item,index)=>itemPrices(item,index).grab!==itemPrices(item,index).shopee);
    const unitTotals=differing.reduce((sum,item)=>{const prices=itemPrices(item,store.menu.indexOf(item));sum.grab+=prices.grab;sum.shopee+=prices.shopee;return sum;},{grab:0,shopee:0});
    const cheaper=unitTotals.grab<=unitTotals.shopee?'grab':'shopee';
    const verdict=el('div','native-store-verdict');
    verdict.append(el('small','','✦ 万象判断'),el('strong','',differing.length?`🏆 ${offers[cheaper].name} 菜品更省`:'两边菜品标价相同'),el('span','',`相同规格的 ${differing.length} 道菜，标价共差 ${money(Math.abs(unitTotals.grab-unitTotals.shopee))}`));comparison.append(verdict);
    for(const [index,item] of store.menu.entries()) {
      const prices=itemPrices(item,index);if(prices.grab===prices.shopee&&differing.length)continue;
      const row=el('div','native-store-compare-row');
      const heading=el('div','native-store-compare-name');heading.append(el('strong','',nameFor(item,'zh')),el('span','',prices.grab===prices.shopee?'同价':`−${money(Math.abs(prices.grab-prices.shopee))}`));
      heading.lastElementChild.dataset.platform=prices.grab<=prices.shopee?'grab':'shopee';
      const priceRow=el('div','native-store-price-pair');
      for(const key of ['grab','shopee']) {const cell=el('span','',money(prices[key]));cell.dataset.platform=key;cell.classList.toggle('is-cheaper',prices[key]<=prices[key==='grab'?'shopee':'grab']);cell.prepend(el('i'));priceRow.append(cell);}
      row.append(heading,priceRow);comparison.append(row);
    }
    comparison.append(el('p','native-store-comparison-note',`以上为单份菜品标价。${quantity}份合并配送后的总价，请看上方平台卡片。`));
    compare.append(comparison);body.append(compare);
    const menu=el('section','native-store-menu');body.append(menu);renderMenu();
    body.append(el('p','native-store-demo-note','演示店铺、菜单与费用 · 照片为菜品示意，实际可售情况以平台为准。'));
    refreshSaved();refreshLanguage();

    function itemPrices(item,index) {
      return {grab:item.prices?.grab??(index===0?store.platforms.grab.price:item.price),shopee:item.prices?.shopee??(index===0?store.platforms.shopee.price:item.price)};
    }
    function nameFor(item,language) {
      const translated=item.translations?.[language];
      if(translated)return translated;
      const [original,chinese]=item.name.split(' · ');
      if(language==='zh')return chinese||original;
      return original;
    }
    function renderMenu() {
      menu.replaceChildren(el('h2','native-store-section-heading','菜单'));
      const grouped=new Map();
      for(const item of store.menu) {
        const category=item.categoryTranslations?.[appliedLanguage==='original'?'vi':appliedLanguage]||item.category||(item===store.menu[0]?'推荐餐品':'饮品与加配');
        if(!grouped.has(category))grouped.set(category,[]);
        grouped.get(category).push(item);
      }
      for(const [category,items] of grouped) {
        const group=el('section','native-store-menu-group');group.append(el('h3','',category));
        const list=el('div','native-store-menu-items');
        for(const item of items) {
          const row=el('article','native-store-menu-row'),copy=el('div');
          const original=nameFor(item,'vi'),translated=nameFor(item,appliedLanguage);
          copy.append(el('h4','',translated));
          if(appliedLanguage!=='original'&&translated!==original)copy.append(el('small','native-store-original-name',original));
          const description=item.descriptions?.[appliedLanguage==='original'?'vi':appliedLanguage]||item.translationsDescriptions?.[appliedLanguage]||item.description;
          if(description)copy.append(el('p','',description));
          row.append(copy,el('strong','native-store-menu-price',money(item.prices?.grab??item.price)));list.append(row);
        }
        group.append(list);menu.append(group);
      }
    }
    function refreshSaved() {const saved=Boolean(state.group?.[store.id]);heart.setAttribute('aria-pressed',String(saved));heart.setAttribute('aria-label',saved?'取消收藏餐厅':'收藏餐厅');}
    function refreshLanguage() {languageValue.textContent=languages.find(item=>item[0]===selectedLanguage)[2];}
    function closeLanguagePicker() {languageSheet?.remove();languageSheet=null;scroll.inert=false;previousFocus?.focus({preventScroll:true});}
    function showLanguagePicker() {
      if(languageSheet)return;
      previousFocus=document.activeElement;scroll.inert=true;
      languageSheet=el('div','native-store-language-overlay');
      const dialog=el('section','native-store-language-sheet');dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label','翻译菜单语言');
      const heading=el('header');heading.append(el('h2','','翻译为'));const close=button('native-store-language-close','关闭语言选择',closeLanguagePicker);close.append(icon('close'));heading.append(close);dialog.append(heading);
      for(const [code,glyph,label] of languages) {
        const choice=button('native-store-language-choice',label,()=>{selectedLanguage=code;state.menuLanguage??={};state.menuLanguage[store.id]=legacyLanguages.indexOf(code);if(code==='original'){appliedLanguage='original';state.translated??={};state.translated[store.id]=0;renderMenu();}refreshLanguage();apply.querySelector('span').textContent='翻译';closeLanguagePicker();});
        choice.dataset.language=code;choice.setAttribute('aria-pressed',String(selectedLanguage===code));choice.append(el('span','native-store-language-glyph',glyph),el('strong','',label),el('span','native-store-language-check',selectedLanguage===code?'✓':''));dialog.append(choice);
      }
      languageSheet.append(dialog);root.append(languageSheet);close.focus({preventScroll:true});
      languageSheet.addEventListener('click',event=>{if(event.target===languageSheet)closeLanguagePicker();});
      languageSheet.addEventListener('keydown',event=>{
        if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeLanguagePicker();}
        if(event.key==='Tab'){const focusable=[...dialog.querySelectorAll('button')],first=focusable[0],last=focusable.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}
      });
    }
    // The native detail sheet dismisses from its left edge or a downward pull at the top.
    let gesture;
    root.addEventListener('touchstart',event=>{
      if(event.touches.length!==1||languageSheet||event.target.closest('button,a,input,select,textarea')) {gesture=null;return;}
      const touch=event.touches[0],bounds=root.getBoundingClientRect();
      gesture={x:touch.clientX,y:touch.clientY,edge:touch.clientX-bounds.left<=18,pull:scroll.scrollTop<=1&&Boolean(event.target.closest('.native-store-hero')),claimed:false};
    },{passive:true});
    root.addEventListener('touchmove',event=>{
      if(!gesture||event.touches.length!==1) {gesture=null;return;}
      const touch=event.touches[0],dx=touch.clientX-gesture.x,dy=touch.clientY-gesture.y;
      const horizontal=gesture.edge&&dx>12&&Math.abs(dy)<35&&dx>Math.abs(dy)*2;
      const downward=gesture.pull&&scroll.scrollTop<=1&&dy>12&&Math.abs(dx)<40&&dy>Math.abs(dx)*2;
      if(horizontal||downward) {gesture.claimed=true;if(event.cancelable)event.preventDefault();}
      else if(Math.abs(dy)>35&&!gesture.pull)gesture.edge=false;
    },{passive:false});
    root.addEventListener('touchend',event=>{
      if(!gesture)return;
      const start=gesture;gesture=null;
      const touch=event.changedTouches[0];if(!touch)return;
      const dx=touch.clientX-start.x,dy=touch.clientY-start.y;
      if(start.claimed&&((start.edge&&dx>60&&Math.abs(dy)<35)||(start.pull&&scroll.scrollTop<=1&&dy>90&&Math.abs(dx)<40)))onClose?.();
    },{passive:true});
    root.addEventListener('touchcancel',()=>{gesture=null;},{passive:true});
    return {element:root,refreshSaved,destroy:()=>{gesture=null;languageSheet?.remove();root.remove();}};
  }
  return {mount};
})();
