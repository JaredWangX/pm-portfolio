'use strict';

// Layout follows Home / Explore / Saved / Profile in the iOS app.
window.wansoPages = (() => {
  const t = value => window.wansoI18n?.text(value) ?? value;
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = t(text);
    return node;
  };
  const btn = (text, fn, className = 'ios-page-button', label = text) => {
    const node = el('button', className, text);
    node.type = 'button'; node.setAttribute('aria-label', t(label));
    node.addEventListener('click', fn);
    return node;
  };
  const photo = (src, className = '') => window.wansoMedia.image(src, {className, alt:''});
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
  const number = value => value.toLocaleString(window.wansoI18n?.locale||'vi-VN');
  const decimal = value => value.toLocaleString(window.wansoI18n?.locale||'vi-VN', {minimumFractionDigits:1, maximumFractionDigits:1});
  const money = value => value.toLocaleString(window.wansoI18n?.locale||'vi-VN') + 'đ';
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
    morning: {label:'Buổi sáng',title:'Nạp năng lượng.\nĂn sáng thôi!',picks:'Gợi ý bữa sáng',stories:[
      ['Trước giờ làm','Một tô nóng để bắt đầu ngày mới','Phở nước thanh nhẹ cùng thịt gà, ưu tiên những quán gần nơi bạn xuất phát.','Gợi ý bữa sáng gần đây: phở gà nước thanh, không rau mùi, tổng tiền gồm giao hàng dưới 80.000đ.','scenario_late.webp'],
      ['Đang vội','Bữa sáng mang đi, kịp giờ nhé','Bánh mì dễ mang theo. Kiểm tra cả giá món và phí giao để chủ động thời gian.','Muốn ăn sáng mang đi, bánh mì gà hoặc cơm nắm, tổng tiền gồm giao hàng dưới 60.000đ.','scenario_rain.png'],
      ['Sau buổi tập','Thêm đạm, nhẹ gia vị','Kết hợp gà, trứng và rau; có thể ghi chú để riêng nước sốt.','Sau buổi tập sáng, muốn ăn gà và rau, ít dầu, không cay, ngân sách 90.000đ gồm giao hàng, gợi ý 5 quán.','scenario_gym.webp'],
      ['Sáng cuối tuần','Ăn chậm lại, cùng bạn bè','Chọn đủ phần cho hai người, rồi cân nhắc món nóng và đồ uống riêng.','Ăn sáng cho 2 người: một phần phở và một bánh mì, tổng ngân sách 150.000đ gồm giao hàng.','scenario_date.webp']
    ]},
    noon: {label:'Bữa trưa',title:'Đến giờ trưa rồi.\nHôm nay ăn gì?',picks:'Gợi ý bữa trưa',stories:[
      ['Trưa ngày làm việc','Ăn ngon rồi làm tiếp','Một phần cơm, gà và rau; so sánh khoảng cách và tổng tiền trước khi chọn.','Bữa trưa muốn ăn cơm gà có rau, ít dầu, ngân sách 80.000đ gồm giao hàng.','scenario_popular.png'],
      ['Ăn nhẹ buổi trưa','Vừa đủ no, vẫn nhẹ bụng','Ưu tiên món nước, hấp hoặc sốt để riêng; kiểm tra đúng thành phần món ăn.','Bữa trưa muốn ăn phở hoặc salad thanh nhẹ, không cay, không rau mùi, ngân sách 80.000đ gồm giao hàng.','scenario_healthy.png'],
      ['Đặt cùng đồng nghiệp','Chọn bữa trưa cho cả hai','Thống nhất ngân sách và số phần, rồi kiểm tra món kiêng của từng người.','Bữa trưa cho 2 người, một người không ăn cay, một người muốn ăn gà, ngân sách 160.000đ gồm giao hàng.','scenario_date.webp'],
      ['Ưu tiên ngân sách','Dưới 60.000đ vẫn ăn ngon','Tính giá món, giao hàng và điều kiện giảm giá trên cùng một đơn.','Bữa trưa cơm hoặc bánh mì, dưới 60.000đ gồm giao hàng, so sánh cả hai nền tảng.','scenario_value.png']
    ]},
    afternoon: {label:'Buổi chiều',title:'Nghỉ một chút nhé.\nTrà hay cà phê?',picks:'Chọn cho buổi chiều',stories:[
      ['Giờ cà phê','Nạp chút tỉnh táo cho buổi chiều','Chọn rõ cỡ ly và độ ngọt, rồi thêm một món ăn nhẹ vừa đủ.','Muốn uống cà phê và ăn nhẹ, ít đường, ngân sách 70.000đ gồm giao hàng.','scenario_date.webp'],
      ['Trước giờ tăng ca','Ăn lót dạ, làm việc tiếp','Bánh mì hoặc cuốn nhỏ gọn hơn một phần ăn lớn nhiều dầu.','Đói buổi chiều, muốn bánh mì gà hoặc cuốn, ít dầu, không cay, ngân sách 60.000đ gồm giao hàng.','scenario_late.webp'],
      ['Trước buổi tập','Ăn nhẹ, thêm năng lượng','Chọn rau và lượng tinh bột vừa đủ theo lịch tập của bạn.','Trước buổi tập tối muốn một phần nhỏ có rau và gà, ngân sách 80.000đ gồm giao hàng.','scenario_gym.webp'],
      ['Trà chiều cùng nhau','Một buổi chiều cho hai người','Xác nhận số đồ uống và món ăn, rồi so sánh tổng tiền cùng một tổ hợp.','Trà chiều cho 2 người, đồ uống và món ăn nhẹ ít đường, ngân sách 120.000đ gồm giao hàng.','scenario_explore.png']
    ]},
    night: {label:'Tối nay',title:'Tối nay\nbạn muốn ăn gì?',picks:'Gợi ý tối nay',stories:[
      ['Ăn sau giờ làm','Một tô nóng sau ngày dài','Chọn phở gà đùi hoặc ức gà, thêm rau thơm theo khẩu vị.','Sau giờ làm muốn phở gà nước nóng, không cay, không rau mùi, ngân sách 80.000đ gồm giao hàng.','scenario_late.webp'],
      ['Bữa tối cho hai','Cùng nhau chọn một bữa ngon','Ưu tiên khẩu vị của cả hai, tính món chính và món kèm theo cùng số phần.','Bữa tối cho 2 người, món Việt có gà và rau, ngân sách 180.000đ gồm giao hàng.','scenario_date.webp'],
      ['Bữa ăn sau tập','Nhẹ gia vị, đủ hài lòng','Kết hợp gà và rau, chọn cách chế biến ít dầu, để riêng sốt nếu cần.','Bữa tối sau tập có gà, rau và ít tinh bột, ít dầu, không cay, ngân sách 90.000đ gồm giao hàng.','scenario_gym.webp'],
      ['Đổi vị một chút','Thử một quán khác tối nay','Giữ ngân sách và món kiêng của bạn, khám phá thêm cách nấu mới.','Tối nay muốn đổi quán, gợi ý 5 quán khác nhau, ngân sách 90.000đ gồm giao hàng, không rau mùi.','scenario_explore.png']
    ]}
  };
  function chooseScenario(prompt, state, route) {
    state.query = prompt;
    window.wansoNative.setQuery(prompt);
    route('generating', true);
  }
  function home(root, data, state, route, open) {
    const top=el('header','ios-home-top');
    const location=btn('',()=>open('cities'),'ios-home-location','Chọn vị trí');
    location.append(el('span','ios-location-mark','⌖'),el('span','',state.location.label),el('span','ios-location-chevron','⌄'));
    top.append(location,btn('◷ Lịch sử',()=>route('history'),'ios-home-history','Lịch sử trò chuyện'));
    const headline=el('div','ios-home-headline');
    headline.append(el('span','ios-home-ai-label','✨ Trợ lý AI'));
    const title=el('h1');
    title.append(el('span','','Hôm nay'),el('br'),el('em','','muốn ăn'),document.createTextNode(t(' gì nào?')));
    headline.append(title,el('p','','Nói một câu, chọn được bữa ăn phù hợp.'));
    const form=el('form','ios-home-search');
    const inputRow=el('div','ios-home-search-input');
    const icon=el('span','ios-home-input-icon','✦');icon.setAttribute('aria-hidden','true');
    const input=window.wansoControls.createSearchInput(()=>open('runSearch'));
    input.setAttribute('aria-label',t('Nhập yêu cầu món ăn'));input.placeholder=t('Món muốn ăn, ngân sách và món kiêng');
    input.addEventListener('input',()=>window.wansoNative.setQuery(input.value));
    const clear=btn('×',()=>{state.query='';input.value='';window.wansoNative.setQuery('');window.wansoControls.resizeTextarea(input);input.focus({preventScroll:true});},'ios-home-clear','Xóa yêu cầu món ăn');
    inputRow.append(icon,input,clear);
    const tools=el('div','ios-home-search-tools');
    const compare=btn('',()=>open('toggle','compareAll'),'ios-home-compare','Cài đặt so sánh nền tảng');
    compare.append(el('i','ios-grab-dot'),el('i','ios-shopee-dot'),el('span','',state.compareAll?'So sánh hai nền tảng':'Theo nền tảng mặc định'));
    const search=btn('⌕ Tìm món',()=>open('runSearch'),'ios-home-search-submit','Tìm kiếm');
    tools.append(compare,search);form.append(inputRow,tools);
    form.addEventListener('submit',event=>{event.preventDefault();open('runSearch');});
    const section=el('section','ios-home-featured');
    const sectionHead=el('div','ios-home-featured-heading');
    sectionHead.append(el('h2','','✦ Wanso tuyển chọn'),btn('↻ Đổi gợi ý',()=>open('featured'),'ios-home-refresh','Đổi quán Wanso tuyển chọn'));
    section.append(sectionHead,window.wansoNative.homeRestaurants(route,open));
    const suggestion=el('div','ios-home-suggestions');
    suggestion.append(heading('Tìm kiếm gần đây'));
    const recent=state.historyEntries?.length?state.historyEntries.slice(0,3).map(entry=>entry.query||entry.prompt||entry.title).filter(Boolean):[state.query].filter(Boolean);
    for(const text of recent){
      const item=btn('',()=>chooseScenario(text,state,route),'ios-home-recent','Tìm lại: '+text);
      item.append(el('span','ios-recent-query',text),el('span','','↗'));suggestion.append(item);
    }
    const tip=btn('',()=>open('tastes'),'ios-home-tip','Thiết lập khẩu vị');
    tip.append(el('strong','','✦ Mẹo từ Wanso'),el('span','','Lưu món kiêng và ngân sách thường dùng để lần sau chọn món nhanh hơn.'),el('b','','Lưu khẩu vị →'));
    suggestion.append(tip);root.append(top,headline,form,section,suggestion);
  }
  function explore(root, data, state, route, open) {
    const hero=el('section','ios-explore-hero');
    hero.append(photo(asset('explore_hero.webp')),btn('◷ Lịch sử',()=>route('history'),'ios-photo-history','Lịch sử trò chuyện'));
    const intro=el('div','ios-photo-copy');
    const label=btn('',()=>open('cities'),'ios-explore-location','Chọn vị trí');
    const title=el('h1');intro.append(label,title);hero.append(intro);
    const insight=btn('',()=>nextInsight(),'ios-explore-insight','Đổi mẹo Wanso');
    insight.append(el('span','ios-insight-icon','✦'));
    const insightCopy=el('span');const insightTitle=el('strong');const insightText=el('span');
    insightCopy.append(insightTitle,insightText);
    const insightIndex=el('span','ios-insight-counter');insight.append(insightCopy,insightIndex);
    const insights=[
      ['So sánh giá','Cùng một quán có thể khác giá giữa các nền tảng. Hãy tính cả món, phí giao và ưu đãi.'],
      ['Khẩu vị của bạn','Cho biết món cần tránh và ngân sách; lý do gợi ý sẽ gắn với từng món cụ thể.'],
      ['Mẹo đặt món','Đặt cho nhiều người cần chốt số phần trước để so sánh điều kiện ưu đãi và tổng tiền.']
    ];
    let insightNumber=0;
    function nextInsight(advance=true){
      if(advance)insightNumber=(insightNumber+1)%insights.length;
      insightTitle.textContent=t('Mẹo Wanso · '+insights[insightNumber][0]);
      insightText.textContent=t(insights[insightNumber][1]);insightIndex.textContent=t((insightNumber+1)+' / '+insights.length);
    }
    nextInsight(false);
    const body=el('div','ios-page-content');const stats=el('section','ios-explore-stats');
    const statsHeader=el('div','ios-stats-heading');
    statsHeader.append(el('strong','','🟢 🟠 Hai nền tảng'),el('span','','Trong thành phố · Kho gợi ý'));
    const catalog=window.wansoNative.catalogForLocation();const values=el('dl','ios-stat-values');
    const quotes=catalog.map(store=>Object.values(store.platforms));
    const promoCount=quotes.filter(offers=>offers.some(p=>p.discount>0)).length;
    const freeCount=quotes.filter(offers=>offers.some(p=>p.netDeliveryFee===0)).length;
    for(const [value,text] of [[catalog.length,'Quán ăn'],[promoCount,'Có ưu đãi'],[freeCount,'Miễn phí giao']]){
      const pair=el('div');pair.append(el('dd','',number(value)),el('dt','',text));values.append(pair);
    }
    stats.append(statsHeader,values);const picksHeading=heading('');
    const picks=el('div','ios-carousel ios-explore-picks');
    picks.tabIndex=0;picks.setAttribute('aria-label',t('Vuốt ngang để xem 5 quán tuyển chọn'));
    function paintMealPicks(bucket) {
      const query={morning:'Bữa sáng dưới 80.000đ',noon:'Cơm gà dưới 80.000đ',afternoon:'Cà phê hoặc trà chiều dưới 80.000đ',night:'Món nước nóng dưới 80.000đ'}[bucket];
      picks.replaceChildren();
      for(const store of window.wansoNative.selectedStores({limit:5,query,surface:'explore:'+bucket})){
      const card=btn('',()=>open('catalogStore',store.id),'ios-explore-store','Xem '+store.name);
      const image=el('div','ios-explore-cover');image.append(photo(store.image),el('strong','ios-photo-name',store.name.split(' · ')[0]));
      const details=el('div','ios-explore-details');const price=Math.min(store.platforms.grab.total,store.platforms.shopee.total);
      details.append(el('strong','',`★ ${decimal(store.rating)} · ${store.district} · ${decimal(store.distance)} km`),el('span','',store.dishZh+' · Tổng từ '+money(price)));
      const brands=el('div','ios-explore-platforms');
      brands.append(el('span','ios-platform-grab','G GrabFood'),el('span','ios-platform-shopee','S ShopeeFood'));
      details.append(brands);card.append(image,details);picks.append(card);
    }
    }
    const storyHead=heading('Bữa ăn theo nhịp ngày','Gợi ý theo giờ Việt Nam, phù hợp với lúc này.');
    const stories=el('div','ios-time-scenarios');let currentBucket='';
    root.updateTimeContent=()=>{
      const bucket=timeOfDay();if(bucket===currentBucket)return;
      currentBucket=bucket;root.dataset.timeOfDay=bucket;const meal=meals[bucket];
      label.textContent=t(state.location.label+' · '+meal.label+' ⌄');title.textContent=t(meal.title);
      picksHeading.querySelector('h2').textContent=t(meal.picks);
      const scrollTop=root.scrollTop;
      paintMealPicks(bucket);stories.replaceChildren();
      for(const [tag,headline,description,prompt,image] of meal.stories){
        const story=btn('',()=>chooseScenario(prompt,state,route),'ios-scenario',headline);story.dataset.scenario=tag;
        story.append(photo(asset(image)),el('span','ios-scenario-tag',tag));
        const copy=el('div','ios-scenario-copy');copy.append(el('strong','',headline),el('span','',description),el('b','','Gợi ý cho tôi →'));
        story.append(copy);stories.append(story);
      }
      root.scrollTop=scrollTop;
    };
    root.updateTimeContent();
    const ask=btn('',()=>route('home',false,'tab'),'ios-page-cta','Vẫn chưa chọn được?');
    ask.append(el('strong','','Vẫn chưa chọn được?'),el('span','','Nói với Wanso ngân sách, món kiêng và điều bạn muốn ăn.'),el('b','','Hỏi AI →'));
    body.append(stats,picksHeading,picks,storyHead,stories,ask);root.append(hero,insight,body);
  }
  function recentOrderCard(record, open) {
    const card=el('article','ios-order-record');card.dataset.orderId=record.id;card.dataset.platform=record.platform;
    const main=btn('',()=>open(record.detailAction,record.detailValue),'ios-order-record-main','Xem quán trong đơn · '+record.name);
    const copy=el('span');copy.append(el('span','ios-order-record-platform',record.platformName),el('strong','',record.name));
    main.append(photo(record.image),copy);
    const dish=el('p','ios-order-record-dish',record.dish+' · '+record.quantity+' phần');
    const costs=el('dl','ios-order-record-costs');
    for(const [label,value] of [['Món ăn',money(record.price)],['Giao hàng',record.fee===null?'Theo nền tảng':money(record.fee)],['Ưu đãi',record.discount?'−'+money(record.discount):'Chưa có']]){
      const row=el('div');row.append(el('dt','',label),el('dd','',value));costs.append(row);
    }
    const total=el('div','ios-order-record-total');total.append(el('span','','Tổng gồm giao hàng'),el('strong','',record.total===null?'Chờ xác nhận':money(record.total)));
    card.append(main,dish,costs,total,btn('Đặt lại ↗',()=>open(record.orderAction,record.id),'ios-order-record-reopen','Đặt lại · '+record.name+' · '+record.platformName));
    return card;
  }
  function saved(root, data, state, route, open) {
    const header=el('div','ios-page-heading');
    header.append(el('h1','','♥ Đã lưu'),btn('◷ Lịch sử',()=>route('history'),'ios-page-link','Lịch sử trò chuyện'));
    const ids=Object.keys(state.group).filter(id=>state.group[id]&&window.wansoControls.storeFor(id));
    const intro=el('div','ios-saved-intro');
    intro.append(el('strong','',`Đã lưu ${ids.length} quán · Wanso`),el('span','','Giữ những quán yêu thích và sắp xếp theo bộ sưu tập.'));
    const recentHeading=el('div','ios-group-heading');recentHeading.append(el('strong','','Đơn gần đây'),btn('Xem tất cả →',()=>open('recentOrders'),'ios-page-link','Xem tất cả đơn gần đây'));
    const recent=el('div','ios-recent-order-rail');recent.setAttribute('aria-label',t('Đơn gần đây, vuốt ngang để xem'));
    for(const id of state.recent.slice(0,3)){const record=window.wansoControls.recentOrderData(id);if(record)recent.append(recentOrderCard(record,open));}
    if(!recent.children.length)recent.append(el('p','ios-orders-empty','Chưa có lịch sử. Xem trước đơn tại trang quán để lưu thông tin ở đây.'));
    const recentNote=el('p','ios-order-record-note','Lịch sử xem chi phí · Không tạo đơn thực tế');
    const group=el('div','ios-group-heading');
    group.append(el('strong','','Bộ sưu tập của tôi'),btn('＋ Thêm',()=>open('collections'),'ios-page-link','Thêm bộ sưu tập'));
    const collection=btn(`❤️ Tất cả · ${ids.length} quán`,()=>open('collections'),'ios-collection-title','Xem tất cả quán đã lưu');
    root.append(header,intro,recentHeading,recentNote,recent,group,collection);
    for (const id of ids.reverse()) {
      const store=window.wansoControls.storeFor(id);
      const card=el('article','ios-saved-store');
      const main=btn('',()=>open('catalogStore',id),'ios-saved-main','Xem '+store.name);
      const copy=el('span');
      copy.append(el('strong','',store.name),el('span','',`★ ${decimal(store.rating)} · ${number(store.reviewCount)} đánh giá`),
        el('small','',`${store.dishZh}  ${money(store.platforms.grab.price)}`));
      main.append(photo(store.image),copy);
      const actions=el('div','ios-saved-actions');
      actions.append(btn('',()=>open('moveSaved',id),'ios-saved-icon','Chuyển '+store.name+' vào bộ sưu tập'),
        btn('',()=>open('removeSaved',id),'ios-saved-icon','Bỏ lưu '+store.name));
      actions.querySelectorAll('.ios-saved-icon').forEach((item,i)=>item.append(glyph(i?'trash':'folder'),el('span','',i?'Bỏ lưu':'Chuyển bộ sưu tập')));
      card.append(main,actions);root.append(card);
    }
    if(!ids.length) root.append(el('p','ios-empty-copy','Quán yêu thích sẽ xuất hiện ở đây. Hãy khám phá các gợi ý gần bạn.'));
    root.append(btn('✦ Khám phá món mới →',()=>route('explore',false,'tab'),'ios-page-cta','Khám phá món mới'));
  }
  function profile(root, data, state, route, open) {
    root.append(el('h1','ios-profile-title','Hồ sơ'));
    const profile=el('div','ios-profile-card');
    const avatar=btn(state.avatarUrl?'':state.avatar,()=>open('avatar'),'ios-profile-avatar','Đổi ảnh đại diện');
    if(state.avatarUrl)avatar.append(photo(state.avatarUrl));
    profile.append(avatar);
    const copy=el('div');
    copy.append(btn(state.name+' ✎',()=>open('account','name'),'ios-profile-name','Đổi tên hiển thị'));
    const counts=el('div','ios-profile-counts');
    for (const [n,label,fn] of [[state.recent.length,'Xem trước đơn',()=>open('recentOrders')],[state.history?1:0,'So sánh',()=>route('history')],[Object.keys(state.group).length,'Đã lưu',()=>route('saved',false,'tab')]]) {
      const count=btn('',fn,'ios-profile-count',label);count.append(el('strong','',String(n)),el('span','',label));counts.append(count);
    }
    copy.append(counts);profile.append(copy);root.append(profile,heading('Khẩu vị của bạn'));
    const tastes=el('section','ios-taste-card');
    const label=el('div','ios-group-heading');label.append(el('strong','','✦ Hồ sơ khẩu vị'),el('span','',state.tastes.length+'/9'));
    const tags=el('div','ios-taste-tags');
    for(const taste of state.tastes) tags.append(el('span','',(state.tasteEmojis?.[taste]||'')+' '+taste));
    tags.append(btn('＋ Thêm',()=>open('tastes'),'ios-page-link','Thêm thẻ khẩu vị'));
    tastes.append(label,tags,el('p','','Bổ sung điều kiện gợi ý. Yêu cầu bạn nêu trong cuộc trò chuyện luôn được ưu tiên.'));
    const preferences=el('div','ios-profile-settings');
    for (const [icon,label,detail,target,action] of [
      ['sliders','Tùy chọn đặt món',window.wansoControls.displayValue(state.budget)+' · '+window.wansoControls.displayValue(state.mode),'preferences'],
      ['bell','Thông báo','Thông báo · Ưu đãi · Không làm phiền','notifications'],
      ['palette','Cài đặt ứng dụng',window.wansoControls.displayValue(state.theme)+' · '+window.wansoControls.displayValue(state.appLanguage),'settings'],
      ['shield','Tài khoản và bảo mật','Email · Điện thoại · Thông tin cá nhân','account'],
      ['heart','Gửi góp ý','Góp ý về gợi ý món, giá và trải nghiệm',null,'feedback'],
      ['shield','Thông tin dữ liệu và giá','Nguồn nội dung · Ưu đãi · Tổng tiền',null,'dataInfo']
    ]) {
      const row=btn('',()=>target?route(target):open(action),'ios-profile-setting',label);
      const text=el('span');text.append(el('strong','',label),el('small','',detail));
      const symbol=el('span','ios-setting-icon');symbol.append(glyph(icon));
      row.append(symbol,text,el('span','','›'));preferences.append(row);
    }
    root.append(tastes,heading('Tùy chọn'),preferences,btn('Đăng xuất',()=>open('logout'),'ios-page-cta'));
  }
  function mount(layer, id, route, open) {
    const scroll=el('section','phone-scroll ios-data-page ios-page-'+id);
    scroll.tabIndex=0;scroll.setAttribute('role','region');
    scroll.setAttribute('aria-label',t(({home:'Trang chủ',explore:'Khám phá',saved:'Đã lưu',profile:'Hồ sơ'})[id]+', cuộn lên xuống để xem'));
    const render={home,explore,saved,profile}[id];
    scroll.refreshContent=()=>{
      const top=scroll.scrollTop;
      const rails=[...scroll.querySelectorAll('.ios-carousel, .ios-recent-order-rail')].map(rail=>rail.scrollLeft);
      scroll.replaceChildren();
      const data=window.wansoNative.restaurants();
      const state=window.wansoControls.viewState();
      render(scroll,data,state,route,open);
      scroll.scrollTop=top;
      scroll.querySelectorAll('.ios-carousel, .ios-recent-order-rail').forEach((rail,index)=>{rail.scrollLeft=rails[index]||0;});
    };
    scroll.refreshContent();layer.append(scroll);return scroll;
  }
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) document.querySelector('.ios-page-explore')?.updateTimeContent?.();
  });
  return {mount, timeOfDay, recentOrderCard};
})();
