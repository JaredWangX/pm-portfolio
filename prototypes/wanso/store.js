'use strict';

// MerchantDetailView.swift: one scroll view, the same detail screen from every entry point.
window.wansoStore = (() => {
  const t = value => window.wansoI18n?.text(value) ?? value;
  const zh=window.wansoI18n?.chinese;
  const el=(tag,className,text)=>{
    const node=document.createElement(tag);
    if(className)node.className=className;
    if(text!==undefined)node.textContent=t(text);
    return node;
  };
  const money=value=>new Intl.NumberFormat(window.wansoI18n?.locale||'vi-VN').format(value)+'đ';
  const languages=[['original','◎','Bản gốc'],['en','A','Tiếng Anh'],['vi','V','Tiếng Việt'],['zh','ZH','Tiếng Trung'],['ja','JA','Tiếng Nhật'],['ko','KO','Tiếng Hàn']];
  const legacyLanguages=['original','en','vi','zh','ja','ko'];
  const icons={walk:'M13 3a1.5 1.5 0 1 0 .01 0M10 8l3-2 2 5 4 2M13 7l-1 6 4 8M12 13l-5 7M10 8l-3 5',back:'M14 5 7 12l7 7',share:'M12 15V3m-4 4 4-4 4 4M7 11H4v10h16V11h-3',heart:'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',pin:'M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0ZM9 10a3 3 0 1 0 6 0 3 3 0 0 0-6 0',chevron:'m9 5 7 7-7 7',close:'m6 6 12 12M18 6 6 18',arrow:'M7 17 17 7M7 7h10v10'};
  const icon=name=>{
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.8');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');svg.setAttribute('aria-hidden','true');
    const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',icons[name]);svg.append(path);return svg;
  };
  const button=(className,label,action)=>{
    const node=el('button',className);node.type='button';node.setAttribute('aria-label',t(label));node.addEventListener('click',action);return node;
  };
  function appendReviews(container,store) {
    const id=typeof store==='string'?store:store.id;
    container.querySelector('.native-store-reviews')?.remove();
    const reviews=window.wansoReviews?.forStore(store)||[];
    if(!reviews.length)return;
    const section=el('section','native-store-reviews');section.dataset.storeReviews=id;
    const heading=el('div','native-store-reviews-heading');
    const source=el('a','native-store-review-example','Về nội dung ↗');source.href='../../assets/wanso/catalog/credits.html';source.target='_blank';source.rel='noopener';
    heading.append(el('h2','native-store-section-heading','Gợi ý thưởng thức'),source);
    section.append(heading);
    for(const review of reviews) {
      const card=el('article','native-store-review');
      const header=el('header','native-store-review-author');
      const identity=el('div');identity.append(el('strong','',(review.tags||[])[0]||'Kết hợp món ăn'),el('small','',(review.tags||[])[1]||'Hương vị và cách thưởng thức'));
      const mark=el('span','native-store-review-avatar');mark.append(icon('heart'));header.append(mark,identity);
      card.append(header,el('p','native-store-review-dish','Món ăn · '+review.dish),el('p','native-store-review-text',review.text));
      section.append(card);
    }
    container.append(section);return section;
  }
  function mount(parent,store,{request='',onClose,onAction,state={}}={}) {
    const root=el('section','native-store-view');root.dataset.storeId=store.id;root.setAttribute('aria-label',t(store.name+' · Chi tiết quán'));
    const scroll=el('div','native-store-scroll');scroll.tabIndex=0;scroll.setAttribute('aria-label',t('Chi tiết quán, cuộn để xem thêm'));
    root.append(scroll);parent.append(root);
    let languageSheet,previousFocus,selectedLanguage=legacyLanguages[state.menuLanguage?.[store.id]]||'original',appliedLanguage=legacyLanguages[state.translated?.[store.id]]||'original';
    const offers=Object.fromEntries(Object.keys(store.platforms).map(key=>[key,window.wansoNative.offerFor(store,key,request)]));
    const entries=Object.entries(offers),winner=entries.reduce((a,b)=>a[1].total<=b[1].total?a:b);
    const quantity=winner[1].quantity;
    const result=window.wansoNative.comparisonFor(store,request);
    const hero=el('div','native-store-hero');
    const image=window.wansoMedia.image(store.image,{detail:true,eager:true,alt:store.imageAlt||store.dishZh,width:402,height:240});
    const toolbar=el('nav','native-store-toolbar');toolbar.setAttribute('aria-label',t('Thao tác với quán'));
    const navTitle=el('div','native-store-nav-title');navTitle.setAttribute('aria-hidden','true');
    const navStatus=el('small');navTitle.append(el('strong','','Chi tiết quán'),navStatus);
    const back=button('native-store-circle native-store-back','Quay lại',()=>onClose?.());back.append(icon('back'));
    const share=button('native-store-circle','Chia sẻ quán',()=>onAction?.('catalogShare',{id:store.id,request}));share.append(icon('share'));
    const heart=button('native-store-circle native-store-heart','Lưu quán',()=>{
      onAction?.('catalogSave',{id:store.id});
    });heart.append(icon('heart'));
    const right=el('div','native-store-toolbar-actions');right.append(share,heart);toolbar.append(back,navTitle,right);
    root.prepend(toolbar);
    const open=el('span','native-store-open');const openLabel=el('span');open.append(el('i'),openLabel);
    hero.append(image,open);scroll.append(hero);
    const info=el('section','native-store-info');
    const title=el('h1','',store.name);
    const rating=el('div','native-store-rating');rating.append(el('span','native-store-star','★'),el('strong','',store.rating.toFixed(1)),el('span','',`(${new Intl.NumberFormat('en-US').format(store.reviewCount)})`),el('span','','·'),icon('walk'),el('span','',`${store.distance.toFixed(1)} km`));
    const tags=el('div','native-store-tags');for(const tag of [store.category.split(' · ')[0],...store.tags].slice(0,8))tags.append(el('span','',tag));
    const address=el('div','native-store-address');address.append(icon('pin'),el('span','',store.address||`${store.district} · ${store.city==='hcm'?'TP. Hồ Chí Minh':'Hà Nội'}`));
    const hours=el('div','native-store-hours');const hoursText=el('span');hours.append(el('span','','◷'),hoursText);
    info.append(title,rating,tags,address,hours);scroll.append(info);
    function refreshHours() {
      const current=window.wansoHours.status(store);
      open.dataset.state=current.state;openLabel.textContent=t(current.label);
      open.title=t(current.detail)+(zh?' · 按越南当地时间，平台接单状态以下单页面为准':' · Theo giờ Việt Nam; kiểm tra tình trạng nhận đơn trên nền tảng');
      hoursText.textContent=t(current.schedule?'Giờ mở cửa '+current.schedule+' · Giờ Việt Nam':current.detail);
      navStatus.textContent=t(current.label);navStatus.dataset.state=current.state;
    }
    refreshHours();const hoursTimer=setInterval(refreshHours,60000);
    const onVisibility=()=>{if(!document.hidden)refreshHours();};document.addEventListener('visibilitychange',onVisibility);
    function updateToolbar() {root.classList.toggle('is-scrolled',scroll.scrollTop>hero.offsetHeight-toolbar.offsetHeight);}
    scroll.addEventListener('scroll',updateToolbar,{passive:true});
    function scrollToSection(selector,behavior='instant') {
      const target=root.querySelector(selector);
      if(target)scroll.scrollTo({top:scroll.scrollTop+target.getBoundingClientRect().top-scroll.getBoundingClientRect().top-toolbar.offsetHeight-12,behavior});
    }
    const body=el('div','native-store-body');scroll.append(body);
    const summary=el('section','native-store-summary');
    const spark=el('span','native-store-spark','✦'),summaryText=el('div');
    const summaryOffer=el('div','native-store-summary-offer');
    const summaryOfferLabel=el('div');summaryOfferLabel.append(el('span','',`${quantity} phần ${store.dishZh}`),el('small','',winner[1].name+' · Đã gồm giao hàng'));
    summaryOffer.append(summaryOfferLabel,el('strong','',money(winner[1].total)));
    const priceLink=button('native-store-price-link','Xem so sánh giá',()=>scrollToSection('.native-store-price-overview',matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'));priceLink.textContent=t(result.saving?'Vì sao '+result.winner.name+' tiết kiệm '+money(result.saving)+'? →':'Xem đầy đủ chi phí hai nền tảng →');
    summaryText.append(el('h2','','Vì sao AI gợi ý quán này'),el('p','',store.reason),summaryOffer,priceLink);summary.append(spark,summaryText);body.append(summary);
    const translate=el('div','native-store-translate');
    const choose=button('native-store-choose-language','Chọn ngôn ngữ thực đơn',showLanguagePicker);
    const label=el('span'),languageValue=el('small');label.append(el('strong','','Ngôn ngữ'),languageValue);choose.append(label,icon('chevron'));
    const apply=button('native-store-apply-translation','Dịch thực đơn',()=>{
      if(selectedLanguage==='original'){showLanguagePicker();return;}
      appliedLanguage=selectedLanguage;
      state.translated??={};state.translated[store.id]=legacyLanguages.indexOf(appliedLanguage);
      renderMenu();apply.querySelector('span').textContent=t('Đã dịch');
    });apply.dataset.action='translate';apply.append(el('b','','A↔'),el('span','','Dịch'));
    translate.append(choose,apply);body.append(translate);
    const overview=el('section','native-store-price-overview');
    overview.append(el('p','native-store-order-context',`${quantity} phần ${store.dishZh} · Cùng quán, cùng khẩu phần · Đã gồm giao hàng`));
    const overviewHeading=el('div','native-store-price-heading');
    overviewHeading.append(el('h2','',result.saving?`${result.winner.name} tiết kiệm hơn`:'Hai nền tảng có cùng tổng tiền'),el('strong','',result.saving?'Tiết kiệm '+money(result.saving):money(result.winner.total)));
    overview.append(overviewHeading);
    const strongest=result.differences.filter(item=>item.amount>0).sort((a,b)=>b.amount-a.amount)[0];
    const advantage=zh?{
      price:`${result.winner.name} 的餐品原价为 ${money(result.winner.price)}，比 ${result.other.name} 少 ${money(strongest?.amount||0)}`,
      merchant:`${result.winner.name} 店铺折扣减 ${money(result.winner.merchantDiscount)}，比 ${result.other.name} 多减 ${money(strongest?.amount||0)}`,
      coupon:`${result.winner.name} 使用「${t(result.winner.couponName)}」减 ${money(result.winner.couponDiscount)}，比 ${result.other.name} 多减 ${money(strongest?.amount||0)}`,
      delivery:`${result.winner.name} ${result.winner.netDeliveryFee?'优惠后配送费为 '+money(result.winner.netDeliveryFee):'本单免配送费'}，${result.other.name} 配送费为 ${money(result.other.netDeliveryFee)}`
    }:{
      'price':`${result.winner.name} có giá món ${money(result.winner.price)}, thấp hơn ${result.other.name} ${money(strongest?.amount||0)}`,
      'merchant':`${result.winner.name} giảm từ quán ${money(result.winner.merchantDiscount)}, nhiều hơn ${result.other.name} ${money(strongest?.amount||0)}`,
      'coupon':`${result.winner.name} dùng mã “${result.winner.couponName}” giảm ${money(result.winner.couponDiscount)}, nhiều hơn ${result.other.name} ${money(strongest?.amount||0)}`,
      'delivery':`${result.winner.name} ${result.winner.netDeliveryFee?'có phí giao hàng sau ưu đãi '+money(result.winner.netDeliveryFee):'miễn phí giao hàng cho đơn này'}; phí giao hàng trên ${result.other.name} là ${money(result.other.netDeliveryFee)}`
    };
    overview.append(el('p','native-store-price-reason',result.saving>0&&strongest?advantage[strongest.key]+(zh?'。计入全部优惠后，本单合计省 ':'. Sau khi tính toàn bộ ưu đãi, bạn tiết kiệm ')+money(result.saving)+(zh?'。':'.'):'Tổng tiền đã gồm giao hàng bằng nhau. Bạn có thể chọn nền tảng quen dùng và đối chiếu từng ưu đãi bên dưới.'));
    const totals=el('div','native-store-quote-pair');
    for(const [key,offer] of entries) {
      const total=el('div');total.dataset.platform=key;total.classList.toggle('is-lowest',offer.total===result.winner.total);
      total.append(el('span','',offer.name+' · Tổng tiền'),el('strong','',money(offer.total)));totals.append(total);
    }
    overview.append(totals);body.append(overview);
    const platforms=el('section','native-store-platforms');platforms.setAttribute('aria-label',t('Giá và phí giao hàng trên hai nền tảng'));
    const offerRules=el('div','native-store-rules-list');
    for(const [key,offer] of entries) {
      const card=el('article','native-store-platform');card.dataset.platform=key;card.classList.toggle('is-lowest',result.saving>0&&key===result.winnerKey);
      const header=el('div','native-store-platform-heading'),mark=el('span','native-store-platform-mark',key==='grab'?'GF':'SF');
      const platformRating=el('p','native-store-platform-rating');platformRating.append(el('span','',`★ ${(store.platforms[key].rating||store.rating).toFixed(1)}`),el('span','',`${store.platforms[key].reviewCount||store.reviewCount} đánh giá`));
      header.append(mark,el('h2','',offer.name),platformRating);
      const detail=el('div','native-store-platform-body');
      for(const [label,amount,isDiscount] of [
        ['Tiền món',offer.price,false],['Quán giảm',offer.merchantDiscount,true],
        ['Mã giảm giá',offer.couponDiscount,true],['Phí giao hàng',offer.originalFee,false],
        ['Giảm phí giao',offer.deliveryDiscount,true]
      ]) {
        const row=el('p',isDiscount&&amount?'native-store-promo':'native-store-delivery');
        row.append(el('span','',label),el('strong','',(isDiscount&&amount?'−':'')+money(amount)));detail.append(row);
      }
      const rules=el('details','native-store-offer-rules');rules.dataset.platform=key;rules.append(el('summary','',offer.name+' · Điều kiện ưu đãi'));
      rules.append(el('p','',offer.qualification));
      for(const term of offer.terms)rules.append(el('p','',term));
      for(const term of offer.unavailable)rules.append(el('p','native-store-ineligible',term));
      if(!offer.terms.length)rules.append(el('p','','Đơn này chưa có ưu đãi phù hợp; tổng tiền gồm giá món và phí giao hàng.'));
      offerRules.append(rules);
      const total=el('div','native-store-platform-total');total.append(el('span','',`${quantity} phần · Gồm giao hàng`),el('strong','',money(offer.total)));
      const order=button('native-store-order','Đặt ngay · '+offer.name,()=>onAction?.('catalogOrder',{id:store.id,platform:key,request}));order.append(el('span','','Đặt ngay'),icon('arrow'));
      const footer=el('div','native-store-platform-footer');footer.append(total,order);
      const coupon=el('div','native-store-applied-coupon');coupon.dataset.platform=key;
      coupon.append(el('strong','',offer.name+' · '+(offer.couponDiscount?'Đã dùng '+offer.couponName:'Chưa dùng mã giảm giá')),el('span','',offer.couponDiscount?offer.couponTerms:offer.couponTerms+'. Không tính các mã chưa đủ điều kiện.'));
      card.append(header,detail,footer);platforms.append(card);offerRules.insertBefore(coupon,rules);
    }
    body.append(platforms);
    const compare=el('section','native-store-compare');
    compare.append(el('h2','native-store-section-heading','Vì sao có chênh lệch giá?'));
    const comparison=el('div','native-store-comparison-card');
    const verdict=el('div','native-store-verdict');
    verdict.append(el('small','','Cùng quán, cùng khẩu phần · Chỉ tính ưu đãi đủ điều kiện'),
      el('strong','',result.saving?`${result.winner.name} tiết kiệm ${money(result.saving)}`:'Hai nền tảng có cùng tổng thanh toán'),
      el('span','',`${quantity} phần ${store.dishZh}, gồm giao hàng ${money(result.winner.total)}`));comparison.append(verdict);
    const breakdown=el('div','native-store-saving-breakdown');
    const start=el('p','native-store-price-start');start.append(el('span','',result.other.name+' · Tổng tiền ban đầu'),el('strong','',money(result.other.total)));breakdown.append(start);
    for(const difference of result.differences) {
      const row=el('p');row.dataset.effect=difference.amount>0?'saving':difference.amount<0?'extra':'same';
      const label={price:'Chênh lệch giá món',merchant:'Chênh lệch giảm từ quán',coupon:'Chênh lệch mã giảm giá',delivery:'Chênh lệch phí giao hàng'}[difference.key];
      row.append(el('span','',label),el('strong','',(difference.amount>0?'−':difference.amount<0?'+':'')+money(Math.abs(difference.amount))));breakdown.append(row);
    }
    const end=el('p','native-store-price-end');end.append(el('span','',result.winner.name+' · Tổng thanh toán'),el('strong','',money(result.winner.total)));breakdown.append(end);
    comparison.append(breakdown,el('p','native-store-comparison-note',zh?`从 ${result.other.name} 换到 ${result.winner.name}，减号代表少付的钱，加号代表增加的费用。将四项差额合计，最终${result.saving?'省 '+money(result.saving):'到手价相同'}。`:`So với ${result.other.name}, trên ${result.winner.name} dấu trừ là khoản tiết kiệm, dấu cộng là khoản tăng thêm. Cộng bốn khoản, kết quả ${result.saving?'Tiết kiệm '+money(result.saving):'bằng nhau'}.`));
    const couponHeading=el('h3','native-store-coupon-heading','Ưu đãi được áp dụng cho đơn này');
    comparison.append(couponHeading,offerRules);
    const menuPrices=el('details','native-store-menu-comparison');
    menuPrices.append(el('summary','',`So sánh giá niêm yết của ${store.menu.length} món`));
    const legend=el('p','native-store-comparison-note','GrabFood bên trái · ShopeeFood bên phải. Giá dưới đây tính cho một phần, chưa gồm ưu đãi và giao hàng.');menuPrices.append(legend);
    for(const [index,item] of store.menu.entries()) {
      const prices=itemPrices(item,index);
      const row=el('div','native-store-compare-row');
      const heading=el('div','native-store-compare-name');heading.append(el('strong','',nameFor(item,'vi')),el('span','',prices.grab===prices.shopee?'Bằng giá':`Chênh ${money(Math.abs(prices.grab-prices.shopee))}`));
      heading.lastElementChild.dataset.platform=prices.grab<=prices.shopee?'grab':'shopee';
      const priceRow=el('div','native-store-price-pair');
      for(const key of ['grab','shopee']) {const cell=el('span','',money(prices[key]));cell.dataset.platform=key;cell.classList.toggle('is-cheaper',prices[key]<=prices[key==='grab'?'shopee':'grab']);cell.prepend(el('i'));priceRow.append(cell);}
      row.append(heading,priceRow);menuPrices.append(row);
    }
    comparison.append(menuPrices);compare.append(comparison);body.append(compare);
    const menu=el('section','native-store-menu');body.append(menu);renderMenu();
    appendReviews(body,store);
    body.append(el('p','native-store-demo-note','Chi phí được tính theo điều kiện trên trang. Món còn bán, điều kiện mã và số tiền thanh toán cần xác nhận trên nền tảng.'));
    const dataInfo=button('native-store-image-credit','Thông tin dữ liệu và giá',()=>onAction?.('dataInfo'));dataInfo.textContent=t('Thông tin dữ liệu và giá');body.append(dataInfo);
    const imageCredit=el('a','native-store-image-credit','Nguồn ảnh ↗');imageCredit.href='../../assets/wanso/catalog/credits.html';imageCredit.target='_blank';imageCredit.rel='noopener';body.append(imageCredit);
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
      menu.replaceChildren(el('h2','native-store-section-heading','Thực đơn'));
      const grouped=new Map();
      for(const item of store.menu) {
        const category=item.categoryTranslations?.[appliedLanguage==='original'?'vi':appliedLanguage]||item.category||(item===store.menu[0]?'Món nên thử':'Đồ uống và món thêm');
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
    function refreshSaved() {const saved=Boolean(state.group?.[store.id]);heart.setAttribute('aria-pressed',String(saved));heart.setAttribute('aria-label',t(saved?'Quản lý quán đã lưu':'Lưu quán'));}
    function refreshLanguage() {languageValue.textContent=t(languages.find(item=>item[0]===selectedLanguage)[2]);apply.querySelector('span').textContent=t(appliedLanguage!=='original'&&appliedLanguage===selectedLanguage?'Đã dịch':'Dịch');}
    function closeLanguagePicker() {languageSheet?.remove();languageSheet=null;scroll.inert=false;toolbar.inert=false;previousFocus?.focus({preventScroll:true});}
    function showLanguagePicker() {
      if(languageSheet)return;
      previousFocus=document.activeElement;scroll.inert=true;toolbar.inert=true;
      languageSheet=el('div','native-store-language-overlay');
      const dialog=el('section','native-store-language-sheet');dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label',t('Ngôn ngữ dịch thực đơn'));
      const heading=el('header');heading.append(el('h2','','Dịch sang'));const close=button('native-store-language-close','Đóng chọn ngôn ngữ',closeLanguagePicker);close.append(icon('close'));heading.append(close);dialog.append(heading);
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
    return {element:root,refreshSaved,scrollToSection,destroy:()=>{gesture=null;clearInterval(hoursTimer);document.removeEventListener('visibilitychange',onVisibility);languageSheet?.remove();root.remove();}};
  }
  return {mount,appendReviews};
})();
