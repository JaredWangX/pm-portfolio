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
  function appendReviews(container,store) {
    const id=typeof store==='string'?store:store.id;
    container.querySelector('.native-store-reviews')?.remove();
    const reviews=window.wansoReviews?.forStore(store)||[];
    if(!reviews.length)return;
    const section=el('section','native-store-reviews');section.dataset.storeReviews=id;
    const heading=el('div','native-store-reviews-heading');
    const source=el('a','native-store-review-example','内容说明 ↗');source.href='../../assets/wanso/catalog/credits.html';source.target='_blank';source.rel='noopener';
    heading.append(el('h2','native-store-section-heading','口味参考'),source);
    section.append(heading);
    for(const review of reviews) {
      const card=el('article','native-store-review');
      const header=el('header','native-store-review-author');
      const identity=el('div');identity.append(el('strong','',(review.tags||[])[0]||'餐品搭配'),el('small','',(review.tags||[])[1]||'口味与食用建议'));
      const mark=el('span','native-store-review-avatar');mark.append(icon('heart'));header.append(mark,identity);
      card.append(header,el('p','native-store-review-dish','餐品 · '+review.dish),el('p','native-store-review-text',review.text));
      section.append(card);
    }
    container.append(section);return section;
  }
  function mount(parent,store,{request='',onClose,onAction,state={}}={}) {
    const root=el('section','native-store-view');root.dataset.storeId=store.id;root.setAttribute('aria-label',store.name+' · 餐厅详情');
    const scroll=el('div','native-store-scroll');scroll.tabIndex=0;scroll.setAttribute('aria-label','餐厅详情，可上下滑动');
    root.append(scroll);parent.append(root);
    let languageSheet,previousFocus,selectedLanguage=legacyLanguages[state.menuLanguage?.[store.id]]||'original',appliedLanguage=legacyLanguages[state.translated?.[store.id]]||'original';
    const offers=Object.fromEntries(Object.keys(store.platforms).map(key=>[key,window.wansoNative.offerFor(store,key,request)]));
    const entries=Object.entries(offers),winner=entries.reduce((a,b)=>a[1].total<=b[1].total?a:b);
    const quantity=winner[1].quantity;
    const result=window.wansoNative.comparisonFor(store,request);
    const hero=el('div','native-store-hero');
    const image=el('img');image.src=store.image;image.alt=store.imageAlt||store.dishZh+' · 菜品示意';image.width=402;image.height=240;image.draggable=false;image.decoding='async';
    const toolbar=el('div','native-store-toolbar');
    const back=button('native-store-circle native-store-back','返回上一页',()=>onClose?.());back.append(icon('back'));
    const share=button('native-store-circle','分享餐厅',()=>onAction?.('catalogShare',{id:store.id}));share.append(icon('share'));
    const heart=button('native-store-circle native-store-heart','收藏餐厅',()=>{
      if(state.group?.[store.id]) {delete state.group[store.id];refreshSaved();}
      else onAction?.('catalogSave',{id:store.id});
    });heart.append(icon('heart'));
    const right=el('div');right.append(share,heart);toolbar.append(back,right);
    const open=el('span','native-store-open','可查看菜单');open.prepend(el('i'));
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
    const priceLink=button('native-store-price-link','查看本单比价',()=>scroll.scrollTo({top:overview.getBoundingClientRect().top-scroll.getBoundingClientRect().top+scroll.scrollTop,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}));priceLink.textContent=result.saving?'为什么 '+result.winner.name+' 能省 '+money(result.saving)+'？ →':'查看两平台完整费用 →';
    summaryText.append(el('h2','','AI 推荐理由'),el('p','',store.reason),summaryOffer,priceLink);summary.append(spark,summaryText);body.append(summary);
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
    const overview=el('section','native-store-price-overview');
    overview.append(el('p','native-store-order-context',`${quantity} 份${store.dishZh} · 同店同规格 · 含配送`));
    const overviewHeading=el('div','native-store-price-heading');
    overviewHeading.append(el('h2','',result.saving?`${result.winner.name} 更实惠`:'两平台本单同价'),el('strong','',result.saving?'省 '+money(result.saving):money(result.winner.total)));
    overview.append(overviewHeading);
    const strongest=result.differences.filter(item=>item.amount>0).sort((a,b)=>b.amount-a.amount)[0];
    const advantage={
      '餐品标价':`${result.winner.name} 餐品标价 ${money(result.winner.price)}，比 ${result.other.name} 低 ${money(strongest?.amount||0)}`,
      '店铺折扣':`${result.winner.name} 店铺折扣减 ${money(result.winner.merchantDiscount)}，比 ${result.other.name} 多减 ${money(strongest?.amount||0)}`,
      '优惠券':`${result.winner.name} 用「${result.winner.couponName}」减 ${money(result.winner.couponDiscount)}，比 ${result.other.name} 多减 ${money(strongest?.amount||0)}`,
      '配送费':`${result.winner.name} ${result.winner.netDeliveryFee?'优惠后配送费 '+money(result.winner.netDeliveryFee):'本单免配送'}，${result.other.name} 配送仍需 ${money(result.other.netDeliveryFee)}`
    };
    overview.append(el('p','native-store-price-reason',result.saving>0&&strongest?advantage[strongest.label]+'。其余折扣一起算完，本单最终少付 '+money(result.saving)+'。':'两平台含配送的实付金额相同。可以按常用平台选择，优惠明细仍可逐项核对。'));
    const totals=el('div','native-store-quote-pair');
    for(const [key,offer] of entries) {
      const total=el('div');total.dataset.platform=key;total.classList.toggle('is-lowest',offer.total===result.winner.total);
      total.append(el('span','',offer.name+' 实付'),el('strong','',money(offer.total)));totals.append(total);
    }
    overview.append(totals);body.append(overview);
    const platforms=el('section','native-store-platforms');platforms.setAttribute('aria-label','双平台配送与价格');
    const offerRules=el('div','native-store-rules-list');
    for(const [key,offer] of entries) {
      const card=el('article','native-store-platform');card.dataset.platform=key;card.classList.toggle('is-lowest',result.saving>0&&key===result.winnerKey);
      const header=el('div','native-store-platform-heading'),mark=el('span','native-store-platform-mark',key==='grab'?'GF':'SF');
      const platformRating=el('p','native-store-platform-rating');platformRating.append(el('span','',`★ ${(store.platforms[key].rating||store.rating).toFixed(1)}`),el('span','',`${store.platforms[key].reviewCount||store.reviewCount} 条评价`));
      header.append(mark,el('h2','',offer.name),platformRating);
      const detail=el('div','native-store-platform-body');
      for(const [label,amount,isDiscount] of [
        ['餐品金额',offer.price,false],['店铺折扣',offer.merchantDiscount,true],
        ['平台优惠券',offer.couponDiscount,true],['配送费',offer.originalFee,false],
        ['运费减免',offer.deliveryDiscount,true]
      ]) {
        const row=el('p',isDiscount&&amount?'native-store-promo':'native-store-delivery');
        row.append(el('span','',label),el('strong','',(isDiscount&&amount?'−':'')+money(amount)));detail.append(row);
      }
      const rules=el('details','native-store-offer-rules');rules.dataset.platform=key;rules.append(el('summary','',offer.name+' · 优惠规则与适用条件'));
      rules.append(el('p','',offer.qualification));
      for(const term of offer.terms)rules.append(el('p','',term));
      for(const term of offer.unavailable)rules.append(el('p','native-store-ineligible',term));
      if(!offer.terms.length)rules.append(el('p','','本店本单暂无可用活动，按餐品标价与配送费计算。'));
      offerRules.append(rules);
      const total=el('div','native-store-platform-total');total.append(el('span','',`${quantity} 份 · 含配送`),el('strong','',money(offer.total)));
      const order=button('native-store-order','立即下单 · '+offer.name,()=>onAction?.('catalogOrder',{id:store.id,platform:key,request}));order.append(el('span','','立即下单'),icon('arrow'));
      const footer=el('div','native-store-platform-footer');footer.append(total,order);
      const coupon=el('div','native-store-applied-coupon');coupon.dataset.platform=key;
      coupon.append(el('strong','',offer.name+' · '+(offer.couponDiscount?'已用 '+offer.couponName:'未使用平台券')),el('span','',offer.couponDiscount?offer.couponTerms:offer.couponTerms+'，未计入任何未达门槛的券。'));
      card.append(header,detail,footer);platforms.append(card);offerRules.insertBefore(coupon,rules);
    }
    body.append(platforms);
    const compare=el('section','native-store-compare');
    compare.append(el('h2','native-store-section-heading','差价是这样算出来的'));
    const comparison=el('div','native-store-comparison-card');
    const verdict=el('div','native-store-verdict');
    verdict.append(el('small','','同店同份量 · 已计入符合门槛的优惠'),
      el('strong','',result.saving?`${result.winner.name} 本单省 ${money(result.saving)}`:'两平台本单到手价相同'),
      el('span','',`${quantity} 份${store.dishZh}，含配送 ${money(result.winner.total)}`));comparison.append(verdict);
    const breakdown=el('div','native-store-saving-breakdown');
    const start=el('p','native-store-price-start');start.append(el('span','',result.other.name+' 实付作为起点'),el('strong','',money(result.other.total)));breakdown.append(start);
    for(const difference of result.differences) {
      const row=el('p');row.dataset.effect=difference.amount>0?'saving':difference.amount<0?'extra':'same';
      const label={餐品标价:'餐品价格差',店铺折扣:'店铺折扣差',优惠券:'平台券差额',配送费:'配送实付差'}[difference.label];
      row.append(el('span','',label),el('strong','',(difference.amount>0?'−':difference.amount<0?'+':'')+money(Math.abs(difference.amount))));breakdown.append(row);
    }
    const end=el('p','native-store-price-end');end.append(el('span','',result.winner.name+' 最终实付'),el('strong','',money(result.winner.total)));breakdown.append(end);
    comparison.append(breakdown,el('p','native-store-comparison-note',`从 ${result.other.name} 换到 ${result.winner.name}，减号代表少花的钱，加号代表多花的钱。四项合并，最终${result.saving?'省 '+money(result.saving):'同价'}。`));
    const couponHeading=el('h3','native-store-coupon-heading','本单用了什么优惠');
    comparison.append(couponHeading,offerRules);
    const menuPrices=el('details','native-store-menu-comparison');
    menuPrices.append(el('summary','',`查看 ${store.menu.length} 道菜的标价对比`));
    const legend=el('p','native-store-comparison-note','左侧 GrabFood · 右侧 ShopeeFood；以下为单份餐品标价，尚未计算优惠及配送。');menuPrices.append(legend);
    for(const [index,item] of store.menu.entries()) {
      const prices=itemPrices(item,index);
      const row=el('div','native-store-compare-row');
      const heading=el('div','native-store-compare-name');heading.append(el('strong','',nameFor(item,'zh')),el('span','',prices.grab===prices.shopee?'同价':`差 ${money(Math.abs(prices.grab-prices.shopee))}`));
      heading.lastElementChild.dataset.platform=prices.grab<=prices.shopee?'grab':'shopee';
      const priceRow=el('div','native-store-price-pair');
      for(const key of ['grab','shopee']) {const cell=el('span','',money(prices[key]));cell.dataset.platform=key;cell.classList.toggle('is-cheaper',prices[key]<=prices[key==='grab'?'shopee':'grab']);cell.prepend(el('i'));priceRow.append(cell);}
      row.append(heading,priceRow);menuPrices.append(row);
    }
    comparison.append(menuPrices);compare.append(comparison);body.append(compare);
    const menu=el('section','native-store-menu');body.append(menu);renderMenu();
    appendReviews(body,store);
    body.append(el('p','native-store-demo-note','费用按页面所列条件估算。实际可售情况、券资格与结算金额以平台为准。'));
    const dataInfo=button('native-store-image-credit','数据与价格说明',()=>onAction?.('dataInfo'));dataInfo.textContent='数据与价格说明';body.append(dataInfo);
    const imageCredit=el('a','native-store-image-credit','配图来源 ↗');imageCredit.href='../../assets/wanso/catalog/credits.html';imageCredit.target='_blank';imageCredit.rel='noopener';body.append(imageCredit);
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
    function refreshLanguage() {languageValue.textContent=languages.find(item=>item[0]===selectedLanguage)[2];apply.querySelector('span').textContent=appliedLanguage!=='original'&&appliedLanguage===selectedLanguage?'已翻译':'翻译';}
    function closeLanguagePicker() {languageSheet?.remove();languageSheet=null;scroll.inert=false;previousFocus?.focus({preventScroll:true});}
    function showLanguagePicker() {
      if(languageSheet)return;
      previousFocus=document.activeElement;scroll.inert=true;
      languageSheet=el('div','native-store-language-overlay');
      const dialog=el('section','native-store-language-sheet');dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label','翻译菜单语言');
      const heading=el('header');heading.append(el('h2','','翻译为'));const close=button('native-store-language-close','关闭语言选择',closeLanguagePicker);close.append(icon('close'));heading.append(close);dialog.append(heading);
      for(const [code,glyph,label] of languages) {
        const choice=button('native-store-language-choice',label,()=>{selectedLanguage=code;state.menuLanguage??={};state.menuLanguage[store.id]=legacyLanguages.indexOf(code);if(code==='original'){appliedLanguage='original';state.translated??={};state.translated[store.id]=0;renderMenu();}refreshLanguage();closeLanguagePicker();});
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
  return {mount,appendReviews};
})();
