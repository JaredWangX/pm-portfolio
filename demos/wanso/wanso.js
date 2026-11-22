'use strict';
const params = new URLSearchParams(location.search);
const embedded = params.has('embed');
if (embedded) document.documentElement.classList.add('embed');
const API = 'https://ai-work-platform-demo.freemyip.com:19558';
const media = '../../assets/wanso/';
const $ = s => document.querySelector(s);
const e = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const read = (key, fallback) => {try {return JSON.parse(localStorage.getItem('wanso-demo-' + key)) ?? fallback;} catch {return fallback;}};
const write = (key, value) => {try {localStorage.setItem('wanso-demo-' + key, JSON.stringify(value));} catch {}};
let lang = read('language', embedded ? 'zh' : 'vi');
if (!['zh','vi'].includes(lang)) lang = 'zh';
write('language',lang);
let city = read('city', 'hcm');
if (!['hcm','hanoi'].includes(city)) city = 'hcm';
let settings = read('settings', {name:'', budget:0, sort:'recommended', theme:'ocean'});
settings = {...{name:'', budget:0, sort:'recommended', theme:'ocean'}, ...(settings && typeof settings === 'object' && !Array.isArray(settings) ? settings : {})};
settings.name = String(settings.name).slice(0,24);
settings.budget = [0,50000,100000].includes(settings.budget) ? settings.budget : 0;
settings.sort = ['recommended','price'].includes(settings.sort) ? settings.sort : 'recommended';
settings.theme = settings.theme === 'paper' ? 'paper' : 'ocean';
let saved = read('saved', []), preferences = read('preferences', []), archives = read('history', []);
if (!Array.isArray(saved)) saved = [];
const preferenceNames = ['不吃鸡肉','不吃牛肉','不吃辣','尽量节省预算'];
preferences = Array.isArray(preferences) ? [...new Set(preferences.filter(x => typeof x==='string' && x.trim() && x.length<=24))].slice(0,9) : [];
for(const pref of preferences)if(!preferenceNames.includes(pref))preferenceNames.push(pref);
archives = Array.isArray(archives) ? archives.filter(x => x && typeof x.id === 'string' && Array.isArray(x.thread) && Array.isArray(x.messages)).slice(0,20) : [];
let data, view = 'home', messages = [], thread = [], pending = false, requestId = 0, controller, sessionId = '', lastQuestion = '', draft = read('draft','');
let menuQuery = '', menuBudget = settings.budget, menuSort = settings.sort, selectedItem = '', quantity = 1, sheetStack = [], compareState = null;
const T = (vi, zh) => lang === 'vi' ? vi : zh;
const money = n => new Intl.NumberFormat('vi-VN').format(n) + ' ₫';
const currentShops = () => data.shops.filter(s => (s.city || 'hcm') === city);
const currentItems = () => data.items.filter(i => currentShops().some(s => s.id === i.shop));
const prefText = i => T(['Không ăn gà','Không ăn bò','Không cay','Tiết kiệm'][i]||preferenceNames[i],preferenceNames[i]);
const icons = {
 home:'<path d="m3 10 9-7 9 7v10H3Z"/><path d="M9 20v-7h6v7"/>',
 explore:'<circle cx="12" cy="12" r="9"/><path d="m16 8-3 5-5 3 3-5Z"/>',
 saved:'<path d="M20 5c-3-3-7-1-8 1-1-2-5-4-8-1-5 5 8 15 8 15s13-10 8-15Z"/>',
 profile:'<circle cx="12" cy="7" r="4"/><path d="M4 21v-3a8 8 0 0 1 16 0v3"/>',
 history:'<path d="M3 11a9 9 0 1 1 2 7M3 4v7h7M12 7v5l3 2"/>',
 compare:'<path d="M8 3v18M16 3v18M4 7h8M12 16h8"/><circle cx="8" cy="7" r="3"/><circle cx="16" cy="16" r="3"/>'
};
const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name]}</svg>`;
const prompts = () => [T('Bữa trưa dưới 60k, không ăn gà','午餐预算 60,000 越南盾，不吃鸡肉'),T('Bữa tối cho 2 người, dưới 120k','两个人晚餐，餐费不超过 120,000 越南盾'),T('Không ăn thịt, có món trứng không?','不吃肉，可以帮我选鸡蛋类的餐品吗？')];
function persist() {write('saved',saved); write('preferences',preferences); write('settings',settings); write('language',lang); write('city',city);}
function saveThread() {
 if (!thread.length) return;
 if (!sessionId) sessionId = crypto.randomUUID();
 const record = {id:sessionId, city, date:new Date().toISOString(), title:(thread.find(x=>x.role==='user')?.content || '').slice(0,100), thread:thread.slice(-24), messages:messages.slice(-24)};
 archives = [record, ...archives.filter(x=>x.id!==sessionId)].slice(0,20);
 write('history',archives); write('active',sessionId);
}
function restoreActive() {
 const record = archives.find(x=>x.id===read('active','') && x.city===city);
 if (record) {sessionId=record.id; thread=record.thread; messages=record.messages;}
}
function captureDraft() {const input=$('#ask textarea');if(input&&!pending){draft=input.value;write('draft',draft);}}
function announce() {
 const scene = view === 'chat' ? 'home' : view;
 const titles = {home:'首页',recommend:'餐厅推荐',compare:'同店比价',profile:'个人中心',saved:'收藏餐品',explore:'探索灵感',history:'选餐历史'};
 const sequence = ['home','explore','compare','profile'];
 parent.postMessage({type:'portfolio-frame-changed', frame:scene, title:titles[scene] || 'Wanso', description:'在手机里继续操作，数据保存在当前浏览器。', counter:'可操作体验',canPrevious:sequence.indexOf(scene)>0},location.origin);
}
function composer(follow=false) {
 return `<form class="composer ${follow?'chat-composer':''}" id="ask"><div class="composer-input">${!follow?'<span class="input-spark" aria-hidden="true">✦</span>':''}<textarea aria-label="${T('Bạn muốn ăn gì?','输入选餐需求')}" maxlength="1200" rows="2" placeholder="${follow?T('Hỏi thêm về món ăn…','继续问问这份餐品…'):T('Thử: phở giá dưới 50k','试试：50k 以内的河粉')}" ${pending?'disabled':''}>${e(draft)}</textarea></div><div class="composer-footer"><span><i></i><i></i>${T('So sánh các nền tảng','比较各平台')}</span><button class="send" ${pending?'disabled':''}>⌕ ${T('Tìm kiếm','搜索')}</button></div></form>`;
}
function merchant(shop) {
 const items = data.items.filter(x=>x.shop===shop.id), prices=items.map(x=>x.price);
 const platform=shop.platform||(shop.id==='mcd'?'GrabFood':'ShopeeFood');
 return `<button class="merchant" data-shop="${shop.id}"><div class="merchant-image"><img src="${media+shop.image}" alt="${e(shop.name)} · ${T('ảnh minh họa','餐品示意图')}" loading="lazy"><span class="pick-tag">✦ ${T('WANSO GỢI Ý','WANSO 推荐')}</span></div><div class="merchant-body"><h3>${e(shop.name)}</h3><p>${T(shop.categoryVi||'Burger',shop.categoryZh||'汉堡')}</p><span class="meal-chip">${T('Thực đơn','餐品菜单')} · ${items.length}</span><span class="price">${money(Math.min(...prices))} ${T('trở lên','起')}</span><span class="merchant-platforms"><i class="platform-dot ${platform==='GrabFood'?'grab':'shopee'}">${platform==='GrabFood'?'G':'S'}</i><span>${T('Xem thực đơn','查看菜单')} →</span></span></div></button>`;
}
function card(item,reason='') {
 const shop = data.shops.find(s=>s.id===item.shop);
 if (!shop) return '';
 return `<article class="choice"><div class="choice-top">${item.image?`<img src="${media+item.image}" alt="${e(item.name)}">`:`<span class="dish-mark">${shop.id==='mcd'?'McD':e(shop.name.slice(0,2))}</span>`}<div><small>${e(shop.name)}</small><h3>${e(item.name)}</h3></div></div>${reason?`<p class="reason">${e(reason)}</p>`:''}<div class="choice-foot"><strong>${money(item.price)}</strong><div><button class="save-meal" data-save="${item.id}" aria-label="${T('Lưu món','收藏餐品')}" aria-pressed="${saved.includes(item.id)}">${saved.includes(item.id)?'♥':'♡'}</button><button class="select-meal" data-select="${item.id}">${T('Chọn món','选这份')} →</button></div></div></article>`;
}
function renderHome() {
 return `<div class="welcome"><span class="eyebrow">✦ ${T('TRỢ LÝ AI','AI 助手')}</span><h1>${T('Hôm nay bạn<br><em>muốn ăn gì</em> nhỉ?','今天，你<br><em>想吃点什么？</em>')}</h1><p>${T('Cho Wanso biết khẩu vị, ngân sách và món bạn đang thèm.','告诉 Wanso 你的口味、预算，以及现在想吃的。')}</p></div>${composer()}<div class="section-title native-picks-heading"><h2>✦ ${T('Wanso gợi ý','Wanso 推荐')}</h2><button class="inline-link" data-refresh-picks>↻ ${T('Làm mới','刷新')}</button></div><div class="merchant-strip">${currentShops().map(merchant).join('')}</div><div class="section-title"><h2>${icon('history')} ${T('Tìm kiếm gần đây','最近搜索')}</h2><button class="inline-link" data-nav="history">${T('Tất cả','全部')} →</button></div><div class="recent-searches">${archives.length?archives.slice(0,3).map(a=>`<button data-history="${e(a.id)}"><span>⌕</span><strong>${e(a.title)}</strong><b>↗</b></button>`).join(''):`<button data-suggest><span>⌕</span><strong>${T('Burger dưới 60k, không ăn gà','60k 内的汉堡，不吃鸡肉')}</strong><b>↗</b></button>`}</div><button class="native-protip" data-nav="profile"><span>✦</span><div><strong>${T('Mẹo hay từ Wanso','Wanso 小贴士')}</strong><p>${T('Thêm khẩu vị trong Profile để gợi ý hợp ý hơn.','设置日常口味，下次选餐更合心意。')}</p></div><b>›</b></button>`;
}
function renderRecommendations() {
 return `<div class="title"><span class="eyebrow">WANSO PICKS</span><h1>${T('Chọn quán, chọn món','找到合适的这一餐')}</h1><p>${T('Tìm theo tên quán, món ăn và ngân sách.','按餐厅、餐品和预算筛选已有菜单。')}</p></div><label class="search-field"><span aria-hidden="true">⌕</span><input id="menu-search" type="search" placeholder="${T('Tên quán hoặc món','搜索餐厅或餐品')}" value="${e(menuQuery)}" aria-label="${T('Tìm thực đơn','搜索菜单')}"></label><div class="filter-row"><label>${T('Ngân sách','餐费预算')}<select id="menu-budget">${[0,50000,100000].map(n=>`<option value="${n}" ${menuBudget===n?'selected':''}>${n?money(n)+T(' trở xuống','以内'):T('Tất cả','不限')}</option>`).join('')}</select></label><label>${T('Sắp xếp','排序')}<select id="menu-sort"><option value="recommended" ${menuSort==='recommended'?'selected':''}>${T('Mặc định','默认顺序')}</option><option value="price" ${menuSort==='price'?'selected':''}>${T('Giá tăng dần','价格从低到高')}</option></select></label></div><div id="menu-results">${recommendationResults()}</div>`;
}
function recommendationResults() {
 const q = menuQuery.trim().toLocaleLowerCase();
 let items = currentItems().filter(x=>(!menuBudget||x.price<=menuBudget)&&(!q||(x.name+' '+data.shops.find(s=>s.id===x.shop)?.name+' '+x.category).toLocaleLowerCase().includes(q)));
 if(menuSort==='price') items.sort((a,b)=>a.price-b.price);
 const shops = currentShops().filter(s=>items.some(x=>x.shop===s.id));
 return `<p class="result-count" role="status">${shops.length} ${T('quán','家餐厅')} · ${items.length} ${T('món','份餐品')}</p>${items.length?`${!q&&!menuBudget&&menuSort==='recommended'?`<div class="merchant-grid">${shops.map(merchant).join('')}</div>`:''}<div class="section-title"><h2>${T('Thực đơn đã lưu','采集菜单')}</h2></div>${items.map(x=>card(x)).join('')}`:`<div class="empty"><h2>${T('Chưa có kết quả','暂未找到餐品')}</h2><p>${T('Thử từ khóa khác hoặc tăng ngân sách.','换个关键词或放宽预算，再试一次。')}</p><button class="send" data-reset-filter>${T('Xóa bộ lọc','清除筛选')}</button></div>`}`;
}
function renderExplore() {
 const scenes=[['scenario_late',T('Làm khuya · Một mình','加班 · 一个人'),T('Đang làm khuya?','今晚还在加班？'),T('Đồ ăn ấm bụng, chọn món gọn hơn.','找一份暖胃、方便的晚餐。'),T('Tôi làm việc muộn, muốn bữa tối ấm bụng dưới 60k','我在加班，想要一份暖胃的晚餐，预算 60,000 越南盾')],['scenario_date',T('Tối nay · 2 người','今晚 · 两个人'),T('Hẹn hò tại nhà?','在家约会，吃点什么？'),T('Chọn hai phần, cùng kiểm tra tổng tiền.','一起选两份，核对总费用。'),T('Bữa tối cho hai người, ngân sách 120k','两个人晚餐，总餐费不超过 120,000 越南盾')],['scenario_gym',T('Sau buổi tập','运动之后'),T('Vừa tập xong?','刚结束运动？'),T('Nói khẩu vị và nguyên liệu bạn cần.','说说你的口味和食材偏好。'),T('Tôi vừa tập xong, muốn món có đạm, không cay, dưới 100k','刚运动完，想吃高蛋白、不辣的餐品，预算 100,000 越南盾')]];
 return `<div class="explore-hero"><img src="${media}explore_hero.webp" alt="${T('Bàn ăn Việt Nam','越南餐桌')}"><div><small>${city==='hanoi'?'HÀ NỘI':'THẢO ĐIỀN'} · ${T('BỮA ĂN CỦA BẠN','你的这一餐')}</small><h1>${T('Hôm nay<br>ăn gì?','今天，<br>吃点什么？')}</h1></div></div><div class="platform-overview"><div><span class="platform-duo"><i class="platform-dot grab">G</i><i class="platform-dot shopee">S</i></span><strong>${T('Cả 2 nền tảng','两家平台')}</strong><button data-nav="compare">✦ ${T('So sánh','比价')}</button></div><div class="platform-stats"><span><b>${currentShops().length}</b>${T('Quán','门店样例')}</span><span><b>${currentItems().length}</b>${T('Món','历史餐品')}</span><span><b>—</b>${T('Phí giao hàng','实时配送费')}</span></div></div><div class="section-title"><h2>${T('Lựa chọn hôm nay','今天的推荐')}</h2><button class="inline-link" data-nav="recommend">${T('Tất cả','查看全部')} →</button></div><div class="merchant-strip">${currentShops().map(merchant).join('')}</div><div class="section-title"><h2>${T('Tình huống của bạn','你的用餐场景')}</h2></div>${scenes.map(([f,tag,title,desc,prompt])=>`<button class="scenario" data-follow="${e(prompt)}"><img src="${media+f}.webp" alt=""><div><small>${tag}</small><h3>${title}</h3><p>${desc}</p><b>${T('Tìm món','帮我选餐')} →</b></div></button>`).join('')}`;
}
function renderChat() {
 return `<div class="chat-heading"><h1>${T('Chọn món cùng Wanso','和 Wanso 一起选餐')}</h1><button data-reset>${T('Mới','新对话')} ＋</button></div><div class="chat-log" aria-live="polite">${thread.map(x=>x.role==='user'?`<div class="message user-message">${e(x.content)}</div>`:`<div class="message assistant-message"><div class="assistant-label">✦ Wanso</div><div class="answer">${e(x.answer)}</div>${(x.picks||[]).map(p=>{const item=data.items.find(i=>i.id===p.id);return item?card(item,p.reason):'';}).join('')}<div class="followups">${(x.followups||[]).map(q=>`<button data-follow="${e(q)}" ${pending?'disabled':''}>${e(q)} ↗</button>`).join('')}</div></div>`).join('')}${pending?`<div class="waiting" role="status"><span class="orbit"></span><span>${T('Đang đối chiếu thực đơn…','正在核对菜单与预算…')}<small>${T('Bạn có thể tiếp tục xem các trang.','可以继续浏览，回答会保留在这里。')}</small></span><button data-cancel>${T('Dừng','停止')}</button></div>`:''}</div><div id="chat-error" role="alert"></div>${composer(true)}`;
}
function renderProfile() {
 const row=(action,symbol,title,sub)=>`<button ${action}><span class="menu-icon" aria-hidden="true">${symbol}</span><span><strong>${title}</strong><small>${sub}</small></span><b>›</b></button>`;
 return `<div class="title profile-title"><h1>${T('Cá nhân','个人中心')}</h1></div><button class="profile-identity" data-profile-edit aria-label="${T('Chỉnh tên hiển thị','编辑本机显示名称')}"><span class="profile-avatar">${icon('profile')}</span><h2>${e(settings.name)||T('Khách trải nghiệm','体验访客')}</h2><span class="profile-stats"><span><b>0</b>${T('Đơn hàng','订单')}</span><span><b>${archives.length}</b>${T('Tìm kiếm','搜索')}</span><span><b>${saved.length}</b>${T('Đã lưu','收藏')}</span></span></button><p class="profile-section-label">${T('KHẨU VỊ','口味档案')}</p><div class="profile-card"><h2><span>✦</span>${T('Wanso biết về bạn','Wanso 了解你')}<small>${preferences.length}/9</small></h2><div class="preferences">${preferences.map(x=>{const i=preferenceNames.indexOf(x);return `<button data-pref="${i}" aria-pressed="true">${prefText(i)} ×</button>`}).join('')}<button data-add-taste>＋ ${T('Thêm','添加')}</button></div><p class="taste-note">${T('Khẩu vị dùng cho gợi ý của Wanso.','这些口味将用于 Wanso 的选餐建议。')}</p></div><p class="profile-section-label">${T('TÙY CHỌN','偏好设置')}</p><div class="profile-menu">${row('data-order-settings','☷',T('Tùy chọn đặt món','订单偏好'),T('Ngân sách · AI · sắp xếp','预算 · AI · 排序'))}${row('data-notifications','♧',T('Thông báo','通知'),T('Tùy chọn thông báo','选餐状态提醒'))}${row('data-app-settings','◐',T('Cài đặt ứng dụng','应用设置'),T('Giao diện · ngôn ngữ · hành vi','主题 · 语言 · 使用偏好'))}${row('data-account','◇',T('Tài khoản & bảo mật','账户与安全'),T('Thông tin · dữ liệu riêng tư','个人信息 · 数据管理'))}${row('data-feedback','♡',T('Gửi phản hồi','发送反馈'),T('Cải thiện Wanso cùng nhau','一起把 Wanso 做得更好'))}</div><button class="native-signout" data-clear>${T('Xóa dữ liệu trải nghiệm','清除本机体验记录')}</button><button class="about-demo" data-about-demo>${T('Về bản trải nghiệm này','关于此体验')}</button>`;
}
function renderHistory() {
 return `<div class="title"><h1>${T('Lịch sử chọn món','选餐历史')}</h1><p>${T('Mở lại câu hỏi và tiếp tục lựa chọn.','找到之前的问题，接着选下去。')}</p></div><button class="new-chat" data-reset>＋ ${T('Cuộc trò chuyện mới','开始新的选餐对话')}</button>${archives.length?`<div class="history-list">${archives.map(a=>`<article><button data-history="${e(a.id)}"><strong>${e(a.title)}</strong><small>${a.city==='hanoi'?'Hà Nội':'TP.HCM'} · ${new Intl.DateTimeFormat(lang==='vi'?'vi-VN':'zh-CN',{timeZone:'Asia/Shanghai',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(a.date))}</small></button><button class="delete-history" data-delete-history="${e(a.id)}" aria-label="${T('Xóa lịch sử','删除这条历史记录')}">×</button></article>`).join('')}</div>`:`<div class="empty">${icon('history')}<h2>${T('Chưa có lịch sử','还没有选餐记录')}</h2><p>${T('Gửi một câu hỏi, câu trả lời sẽ được lưu ở đây.','发起一次选餐，之后可以在这里继续。')}</p></div>`}`;
}
function initCompare(id) {
 const item = comparisonItems().find(x=>x.id===id)||comparisonItems()[0];
 compareState={id:item.id,quantity:1,grabPrice:item.price,shopeePrice:item.shopeePrice||item.price,grabFee:0,shopeeFee:0,grabOff:0,shopeeOff:0};
}
function comparisonTotals(state) {
 const q = Math.max(1,Math.min(20,Math.trunc(Number(state.quantity)||1)));
 const n = key => Math.max(0,Math.min(10000000,Number(state[key])||0));
 const grab = Math.max(0,n('grabPrice')*q+n('grabFee')-n('grabOff'));
 const shopee = Math.max(0,n('shopeePrice')*q+n('shopeeFee')-n('shopeeOff'));
 return {grab,shopee,diff:Math.abs(grab-shopee)};
}
function renderCostEditor() {
 if(!compareState||!comparisonItems().some(x=>x.id===compareState.id)) initCompare();
 const s=compareState;
 return `<div class="title"><span class="eyebrow">${T('CÙNG MÓN · CÙNG KHẨU PHẦN','同一餐品 · 相同份数')}</span><h1>${T('Tính trước khi chọn','先算清楚，再选择')}</h1><p>${T('Nhập giá, phí giao hàng và ưu đãi trên hai nền tảng.','填写两家平台的费用，比较预计到手价。')}</p></div><form id="compare-form" class="comparison"><label class="field-label">${T('Món ăn','比较餐品')}<select name="item" id="compare-item">${comparisonItems().map(x=>`<option value="${x.id}" ${x.id===s.id?'selected':''}>${e(x.name)}</option>`).join('')}</select></label><div class="quantity-line"><span>${T('Số phần','相同份数')}</span><div class="quantity"><button type="button" data-compare-step="-1" aria-label="${T('Giảm số lượng','减少份数')}" ${s.quantity<=1?'disabled':''}>−</button><output id="compare-quantity">${s.quantity}</output><button type="button" data-compare-step="1" aria-label="${T('Tăng số lượng','增加份数')}" ${s.quantity>=20?'disabled':''}>＋</button></div></div><p class="helper">${T('Giá món mặc định từ thực đơn lưu trữ. Phí và ưu đãi ban đầu là 0; hãy sửa theo nền tảng. Không phải báo giá trực tiếp.','餐品单价默认取历史菜单；配送费、优惠初始为 0，请按平台实际金额修改。此处不是实时平台报价。')}</p><div class="platform-columns">${[['grab','GrabFood'],['shopee','ShopeeFood']].map(([key,title])=>`<fieldset class="platform-cost ${key}"><legend>${title}</legend>${[['Price',T('Giá mỗi phần','餐品单价')],['Fee',T('Phí giao hàng','配送费')],['Off',T('Giảm toàn đơn','整单优惠')]].map(([suffix,label])=>`<label>${label}<span class="currency-field"><input type="number" inputmode="numeric" min="0" max="10000000" step="1000" name="${key+suffix}" value="${s[key+suffix]}" aria-label="${title} ${label}"><small>₫</small></span></label>`).join('')}<div class="platform-total"><span>${T('Tổng dự kiến','预计总计')}</span><output id="${key}-total"></output></div></fieldset>`).join('')}</div><div id="compare-result" class="compare-result" aria-live="polite"></div>${s.id.startsWith('reference-')?'':`<button type="button" class="send full" data-select="${s.id}">${T('Xem món và lưu lựa chọn','查看餐品并收藏')} →</button>`}</form><p class="helper">${T('Tổng = giá mỗi phần × số phần + giao hàng − giảm toàn đơn. Kiểm tra đơn tối thiểu và trần ưu đãi trước khi nhập.','总计 = 单价 × 份数 + 配送费 − 整单优惠。优惠请填写核对门槛、封顶后的实际可用金额。')}</p>`;
}

// These rows are transcribed from portfolio page 14. They are a distinct roast-chicken example.
const comparisonReference = [
 ['Combo gà nướng 3',280000,250000],['Combo gà nướng 2',280000,250000],
 ['Nửa con gà + cơm lam',170000,149000],['Nửa con gà + 5 bánh bao',170000,149000],
 ['Nửa con gà nướng',170000,149000],['Combo gà nướng 1',265000,265000],
 ['Cơm lam thêm',20000,20000],['5 bánh bao hấp',20000,20000]
].map(([name,price,shopeePrice],i)=>({id:'reference-'+i,name,price,shopeePrice}));
const comparisonItems=()=>[...comparisonReference,...currentItems()];
function renderCompare() {
 return `<div class="native-page-heading"><button data-nav="explore" aria-label="${T('Quay lại','返回探索')}">←</button><strong>${T('Giá món ăn','餐品价格')}</strong><span>${T('NGUYÊN MẪU','原型样例')}</span></div><div class="title"><h1>${T('So sánh giá món','比较餐品价格')}</h1><p>${T('Cùng một món, cùng khẩu phần. Đơn vị tính là đồng Việt Nam (₫).','同一餐品，相同份数。金额单位为越南盾（₫）。')}</p></div><div class="native-price-table"><table><thead><tr><th>${T('Món ăn','餐品')}</th><th>GrabFood</th><th>ShopeeFood</th></tr></thead><tbody>${comparisonReference.map(x=>`<tr><th><button data-edit-reference="${x.id}">${x.name}</button></th><td>${new Intl.NumberFormat('vi-VN').format(x.price)}</td><td class="${x.shopeePrice<x.price?'better-price':''}">${new Intl.NumberFormat('vi-VN').format(x.shopeePrice)}</td></tr>`).join('')}</tbody></table></div><p class="comparison-source">${T('Ví dụ từ nguyên mẫu · giá món, chưa gồm phí giao hàng.','原作品集比价样例 · 餐品价未含配送费。')}</p><button class="compare-entry" data-edit-reference="reference-0">${icon('compare')}<span><strong>${T('Thêm phí và ưu đãi','算上配送与优惠')}</strong><small>${T('Chạm món để điều chỉnh tổng tiền','点击餐品，可以调整费用')}</small></span><b>→</b></button><button class="inline-link" data-nav="recommend">${T('Xem các thực đơn đã lưu','查看已有餐厅菜单')} →</button>`;
}
function showCostEditor(remember=true) {openSheet(T('Tổng tiền dự kiến','预计到手价'),renderCostEditor(),remember);updateCompare();}
function aboutDemo() {openSheet(T('Về bản trải nghiệm','关于此体验'),`<p class="sheet-copy">${T('Giao diện được đối chiếu với ứng dụng Android và nguyên mẫu Wanso. Thực đơn là dữ liệu đã lưu; bảng so sánh gà nướng lấy từ nguyên mẫu, không phải báo giá hiện tại.','页面依据 Wanso Android 应用与原作品集还原。菜单使用历史采集数据；烤鸡比价表来自原作品集，并非当前报价。')}</p><p class="sheet-copy">${T('Chat AI có kết nối mô hình. Sở thích, lịch sử và dữ liệu cá nhân chỉ lưu ở trình duyệt; trải nghiệm này không đặt hàng hoặc đăng nhập tài khoản thật.','AI 选餐已连接模型。偏好和历史保存在当前浏览器；此体验不会创建真实订单或登录外卖账户。')}</p><a class="inline-link" href="../../prototypes/wanso/#home" target="_blank" rel="noopener">${T('Mở nguyên mẫu gốc','查看原版页面')} ↗</a>`);}

function updateCompare() {
 const {grab,shopee,diff}=comparisonTotals(compareState);
 $('#grab-total').textContent=money(grab); $('#shopee-total').textContent=money(shopee);
 $('#compare-result').innerHTML=`<span>${T('THEO SỐ TIỀN ĐÃ NHẬP','按当前填写金额')}</span><strong>${diff?`${grab<shopee?'GrabFood':'ShopeeFood'} ${T('ít hơn','少')} ${money(diff)}`:T('Hai nền tảng bằng giá','两家平台预计总价相同')}</strong><p>${T('Kiểm tra tại nền tảng trước khi đặt món.','下单前，还需核对门店、配送地址与可售状态。')}</p>`;
}
function render() {
 if(!data)return;
 document.documentElement.lang=lang==='vi'?'vi':'zh-CN';
 document.documentElement.dataset.theme=settings.theme;
 $('#language').textContent=T('中文','VI'); $('#language').title=T('Chuyển sang tiếng Trung','切换为越南语');
 $('#city').innerHTML='<span>⌖</span> '+(city==='hanoi'?'Hà Nội':'TP.HCM')+' <small>⌄</small>';
 $('#history').innerHTML=icon('history')+'<span>'+T('Lịch sử','历史')+'</span>';  $('#history').setAttribute('aria-label',T('Lịch sử chọn món','查看选餐历史'));
 $('#demo-note').textContent='';
 $('.tabbar').innerHTML=['home','explore','saved','profile'].map((id,i)=>`<button data-nav="${id}" ${(view===id||id==='home'&&['recommend','compare','chat'].includes(view)||id==='profile'&&view==='history')?'aria-current="page"':''}>${icon(id)}${[T('Trang chủ','首页'),T('Khám phá','探索'),T('Đã lưu','收藏'),T('Cá nhân','个人中心')][i]}</button>`).join('');
 let html='';
 if(view==='home')html=renderHome();
 if(view==='recommend')html=renderRecommendations();
 if(view==='explore')html=renderExplore();
 if(view==='chat')html=renderChat();
 if(view==='profile')html=renderProfile();
 if(view==='history')html=renderHistory();
 if(view==='compare')html=renderCompare();
 if(view==='saved')html=`<div class="title"><h1>${T('Món đã lưu','收藏的餐品')}</h1><p>${T('Giữ lựa chọn cho bữa ăn tiếp theo.','把喜欢的选择留给下一餐。')}</p></div>${saved.length?saved.map(id=>data.items.find(x=>x.id===id)).filter(Boolean).map(x=>card(x)).join(''):`<div class="empty">${icon('saved')}<h2>${T('Chưa có món đã lưu','还没有收藏餐品')}</h2><p>${T('Nhấn trái tim trên món để lưu.','点击餐品卡片上的爱心，就能在这里找到它。')}</p><button class="send" data-nav="recommend">${T('Tìm món yêu thích','去选一份喜欢的')}</button></div>`}`;
 $('#screen').innerHTML=html;
 $('.phone-app').dataset.view=view;
 if($('#compare-form')) updateCompare();
 $('#return-chat').hidden=!pending&&!(thread.length&&view!=='chat');
 $('#return-chat').textContent=pending?T('Đang chọn món…','选餐进行中…'):T('Tiếp tục trò chuyện ↗','继续选餐对话 ↗');
 announce();
}
function navigate(target) {
 if(!['home','explore','recommend','compare','profile','saved','chat','history'].includes(target))return;
 captureDraft(); view=target; history.replaceState(null,'','#'+target); render();$('#screen').scrollTop=0;
}
function openSheet(title,body,remember=true) {
 if(remember&&$('#sheet').open)sheetStack.push({title:$('#sheet h2').textContent,body:$('#sheet-body').innerHTML});
 else if(!$('#sheet').open)sheetStack=[];
 $('#sheet h2').textContent=title;$('#sheet-body').innerHTML=body;$('#sheet-back').hidden=!sheetStack.length;
 if(!$('#sheet').open)$('#sheet').showModal();
 $('#sheet-body').scrollTop=0;
 if(embedded) parent.postMessage({type:'portfolio-phone-focus'},location.origin);
}
function showShop(id) {
 const shop=data.shops.find(x=>x.id===id);if(!shop)return;
 openSheet(shop.name,`<p class="sheet-copy">${T('Thực đơn lưu trữ · chưa gồm giao hàng','采集菜单 · 餐品价不含配送费')}</p><div class="menu-list">${data.items.filter(x=>x.shop===id).map(x=>`<button class="menu-row" data-select="${x.id}"><span>${e(x.name)}<small>${e(x.category)}</small></span><strong>${money(x.price)} →</strong></button>`).join('')}</div>`);
}
function selectMeal(id,remember=true) {
 const item=data.items.find(x=>x.id===id),shop=data.shops.find(x=>x.id===item?.shop);if(!item||!shop)return;
 if(selectedItem!==id){selectedItem=id;quantity=1;}
 openSheet(T('Xác nhận lựa chọn','确认你的选择'),`<div class="receipt"><span class="receipt-shop">${e(shop.name)}</span><h3>${e(item.name)}</h3>${item.description?`<p class="sheet-copy">${e(item.description)}</p>`:''}<div class="quantity-line"><span>${T('Số lượng','份数')}</span><div class="quantity"><button data-quantity="-1" aria-label="${T('Giảm','减少份数')}" ${quantity===1?'disabled':''}>−</button><output>${quantity}</output><button data-quantity="1" aria-label="${T('Tăng','增加份数')}" ${quantity===20?'disabled':''}>＋</button></div></div><div class="sum"><span>${T('Tạm tính món','餐费小计')}</span><span>${money(item.price*quantity)}</span></div></div><button class="compare-entry" data-compare-item="${id}">${icon('compare')}<span><strong>${T('So sánh tổng tiền','比较两家平台总价')}</strong><small>${T('Thêm phí và ưu đãi','填写配送费与优惠')}</small></span><b>→</b></button><button class="send full" data-save="${id}" aria-pressed="${saved.includes(id)}">${saved.includes(id)?T('Đã lưu · bỏ lưu','已收藏 · 取消收藏'):T('Lưu lựa chọn','收藏这份餐品')}</button><p class="helper">${T('Giá lưu trữ. Mở nền tảng để xác nhận trước khi đặt món; đây không tạo đơn hàng.','这是历史菜单价。打开平台后核实门店、餐品和最终费用；此处不会创建订单。')}</p><div class="compare-options"><a href="https://food.grab.com/vn/vi/" target="_blank" rel="noopener">GrabFood <span>${T('Mở nền tảng','打开平台')} ↗</span></a><a href="${e(shop.url||'https://shopeefood.vn/')}" target="_blank" rel="noopener">ShopeeFood <span>${T('Mở nền tảng','打开平台')} ↗</span></a></div>`,remember);
}
function orderSettings() {
 openSheet(T('Tùy chọn đặt món','订单偏好'),`<form id="order-settings" class="settings-form"><p class="sheet-copy">${T('Dùng cho lần tìm món tiếp theo. Yêu cầu trong cuộc trò chuyện được ưu tiên.','作为下次筛选与 AI 选餐的默认偏好，本次对话的明确要求优先。')}</p><fieldset><legend>${T('Ngân sách mỗi người','每人餐费预算')}</legend>${[50000,100000,0].map(n=>`<label class="radio-row"><span>${n?money(n)+T(' trở xuống','以内'):T('Không giới hạn','不限')}</span><input type="radio" name="budget" value="${n}" ${settings.budget===n?'checked':''}></label>`).join('')}</fieldset><fieldset><legend>${T('Sắp xếp mặc định','菜单默认排序')}</legend>${[['recommended',T('Thứ tự thực đơn','菜单原顺序')],['price',T('Giá thấp trước','价格从低到高')]].map(([v,l])=>`<label class="radio-row"><span>${l}</span><input type="radio" name="sort" value="${v}" ${settings.sort===v?'checked':''}></label>`).join('')}</fieldset><button class="send full">${T('Lưu tùy chọn','保存偏好')}</button></form>`);
}
function appSettings() {
 openSheet(T('Cài đặt ứng dụng','应用设置'),`<form id="app-settings" class="settings-form"><fieldset><legend>${T('Giao diện','显示主题')}</legend>${[['ocean',T('Ocean · xanh','海洋蓝')],['paper',T('Sáng · đơn giản','清晰浅色')]].map(([v,l])=>`<label class="radio-row"><span>${l}</span><input type="radio" name="theme" value="${v}" ${settings.theme===v?'checked':''}></label>`).join('')}</fieldset><label class="field-label">${T('Ngôn ngữ','显示语言')}<select name="language"><option value="zh" ${lang==='zh'?'selected':''}>简体中文</option><option value="vi" ${lang==='vi'?'selected':''}>Tiếng Việt</option></select></label><button class="send full">${T('Lưu cài đặt','保存设置')}</button></form><p class="helper">${T('Dữ liệu chỉ lưu trong trình duyệt. Xóa dữ liệu không thay đổi tài khoản thật.','数据仅保存在此浏览器。清除演示记录不会影响真实平台账户。')}</p><button class="clear-data" data-clear>${T('Xóa dữ liệu trải nghiệm','清除本机演示数据')}</button>`);
}
function toast(text) {$('#toast').textContent=text;$('#toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').hidden=true,2400);}
async function ask(question,retry=false) {
 question=String(question).trim();if(!question||question.length>1200)return;
 if(pending){navigate('chat');return;}
 lastQuestion=question;const id=++requestId;controller=new AbortController();pending=true;
 if(!retry){thread.push({role:'user',content:question});messages.push({role:'user',content:question});}
 draft='';write('draft','');saveThread();view='chat';render();$('#screen').scrollTop=$('#screen').scrollHeight;
 const history=messages.slice(-9).map(x=>({...x}));if(history[0]?.role==='assistant')history.shift();
 const prefs=preferences.map(x=>lang==='vi'?({'不吃鸡肉':'Không ăn gà','不吃牛肉':'Không ăn bò','不吃辣':'Không cay','尽量节省预算':'Tiết kiệm'}[x]||x):x);
 if(settings.budget)prefs.push(T('Ngân sách mặc định mỗi người: ','默认每人餐费预算：')+money(settings.budget));
 if(prefs.length)history[history.length-1].content+='\n'+T('Sở thích thường ngày (yêu cầu hiện tại ưu tiên): ','日常偏好（本次明确要求优先）：')+prefs.join(', ');
 try {
  const response=await fetch(API+'/api/wanso',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:history,city}),signal:AbortSignal.any([controller.signal,AbortSignal.timeout(75000)])});
  const result=await response.json();if(!response.ok||typeof result.answer!=='string')throw Error('model unavailable');if(id!==requestId)return;
  thread.push({role:'assistant',...result});messages.push({role:'assistant',content:JSON.stringify(result).slice(0,1500)});pending=false;saveThread();captureDraft();
  const previousScroll=$('#screen').scrollTop;render();$('#screen').scrollTop=previousScroll;
  if(view==='chat')requestAnimationFrame(()=>$('.assistant-message:last-of-type')?.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}));
  else if(settings.readyNotice!==false) toast(T('Wanso đã trả lời. Mở lại cuộc trò chuyện.','选餐结果已就绪，可继续查看对话。'));
 } catch(error) {
  if(id!==requestId)return;pending=false;draft=question;write('draft',draft);render();
  if(view==='chat'){$('#chat-error').innerHTML=`<p class="error">${e(error.name==='AbortError'?T('Đã dừng. Bạn có thể thử lại.','已停止，可以重新发送这个问题。'):T('Chưa nhận được câu trả lời. Hãy thử lại.','暂未收到回答，请重试。'))} <button data-retry>${T('Thử lại','重试')}</button></p>`;$('#screen').scrollTop=$('#screen').scrollHeight;}
  else toast(T('Chưa nhận được câu trả lời; mở lại để thử.','暂未收到回答，回到对话可以重试。'));
 }
}
function newThread(){if($('#ask textarea'))$('#ask textarea').value='';saveThread();controller?.abort();requestId++;pending=false;thread=[];messages=[];sessionId='';write('active','');draft='';write('draft','');navigate('home');}
$('#close').onclick=()=>$('#sheet').close();
$('#sheet-back').onclick=()=>{const previous=sheetStack.pop();if(previous)openSheet(previous.title,previous.body,false);};
$('#sheet').addEventListener('close',()=>{if($('#sheet').open)return;sheetStack=[];$('#sheet-body').replaceChildren();if(view==='profile')render();});
$('#sheet').addEventListener('click',event=>{if(event.target===$('#sheet')){const r=event.target.getBoundingClientRect();if(event.clientY<r.top||event.clientY>r.bottom||event.clientX<r.left||event.clientX>r.right)event.target.close();}});
$('#language').onclick=()=>{captureDraft();lang=lang==='vi'?'zh':'vi';persist();render();};
$('#history').onclick=()=>navigate('history');
$('#return-chat').onclick=()=>navigate('chat');
$('#city').onclick=()=>openSheet(T('Chọn thành phố','选择演示城市'),`<p class="sheet-copy">${T('Đổi thành phố sẽ mở cuộc trò chuyện mới. Lịch sử cũ được giữ lại.','切换城市会开始新的选餐对话，已有历史记录会保留。')}</p>${data.cities.map(c=>`<button class="city-option" data-city="${c.id}">${e(T(c.name,c.nameZh))}<span>${city===c.id?'✓':'→'}</span></button>`).join('')}`);
document.addEventListener('input',event=>{
 if(event.target.matches('#ask textarea')){draft=event.target.value;write('draft',draft);}
 if(event.target.id==='menu-search'){menuQuery=event.target.value;$('#menu-results').innerHTML=recommendationResults();}
 if(event.target.matches('#compare-form input')){const value=Number(event.target.value);compareState[event.target.name]=Number.isFinite(value)?Math.max(0,Math.min(10000000,value)):0;updateCompare();}
});
document.addEventListener('change',event=>{
 if(event.target.id==='menu-budget'){menuBudget=Number(event.target.value);$('#menu-results').innerHTML=recommendationResults();}
 if(event.target.id==='menu-sort'){menuSort=event.target.value;$('#menu-results').innerHTML=recommendationResults();}
 if(event.target.id==='compare-item'){initCompare(event.target.value);showCostEditor(false);}
 if(event.target.matches('#compare-form input'))event.target.value=compareState[event.target.name];
});
document.addEventListener('submit',event=>{
 const form=event.target;event.preventDefault();
 if(form.id==='taste-custom'){const taste=String(new FormData(form).get('taste')).trim();if(!taste||taste.length>24)return;if(preferences.includes(taste)){form.querySelector('.taste-error').textContent=T('Khẩu vị đã có','已经添加过这个口味');return;}if(preferences.length>=9){form.querySelector('.taste-error').textContent=T('Tối đa 9 khẩu vị','最多保存 9 个口味');return;}preferences.push(taste);if(!preferenceNames.includes(taste))preferenceNames.push(taste);persist();$('#sheet').close();render();toast(T('Đã thêm','口味已添加'));}
 if(form.id==='notification-settings'){settings.readyNotice=new FormData(form).get('ready')==='on';persist();$('#sheet').close();toast(T('Đã lưu','通知偏好已保存'));}
 if(form.id==='ask')ask(form.querySelector('textarea').value);
 if(form.id==='order-settings'){const values=new FormData(form);settings.budget=Number(values.get('budget'));settings.sort=values.get('sort');menuBudget=settings.budget;menuSort=settings.sort;persist();$('#sheet').close();render();toast(T('Đã lưu tùy chọn','偏好已保存，下次选餐时生效。'));}
 if(form.id==='app-settings'){const values=new FormData(form);captureDraft();settings.theme=values.get('theme');lang=values.get('language');persist();$('#sheet').close();render();toast(T('Đã lưu cài đặt','设置已保存'));}
 if(form.id==='profile-edit'){settings.name=String(new FormData(form).get('name')).trim().slice(0,24);persist();$('#sheet').close();render();toast(T('Đã lưu','显示名称已保存'));}
});
document.addEventListener('click',event=>{
 const b=event.target.closest('button');if(!b||!data)return;
 if(b.dataset.nav)navigate(b.dataset.nav);
 if(b.dataset.city){if(b.dataset.city!==city){saveThread();newThread();city=b.dataset.city;persist();compareState=null;menuQuery='';navigate('home');}$('#sheet').close();}
 if(b.dataset.prompt!==undefined)ask(prompts()[Number(b.dataset.prompt)]);
 if(b.dataset.follow)ask(b.dataset.follow);
 if(b.dataset.shop)showShop(b.dataset.shop);
 if(b.dataset.select)selectMeal(b.dataset.select);
 if(b.dataset.quantity){quantity=Math.max(1,Math.min(20,quantity+Number(b.dataset.quantity)));selectMeal(selectedItem,false);}
 if(b.dataset.compareItem){const item=data.items.find(x=>x.id===b.dataset.compareItem),shop=data.shops.find(x=>x.id===item?.shop);if(shop&&(shop.city||'hcm')!==city){saveThread();newThread();city=shop.city||'hcm';persist();}initCompare(b.dataset.compareItem);compareState.quantity=quantity;$('#sheet').close();navigate('compare');showCostEditor();}
 if(b.dataset.compareStep){compareState.quantity=Math.max(1,Math.min(20,compareState.quantity+Number(b.dataset.compareStep)));$('#compare-quantity').textContent=compareState.quantity;document.querySelectorAll('[data-compare-step]').forEach(btn=>btn.disabled=Number(btn.dataset.compareStep)<0?compareState.quantity===1:compareState.quantity===20);updateCompare();}
 if(b.dataset.save){const id=b.dataset.save;saved=saved.includes(id)?saved.filter(x=>x!==id):[...saved,id];persist();document.querySelectorAll('[data-save="'+id+'"]').forEach(el=>{el.setAttribute('aria-pressed',String(saved.includes(id)));el.textContent=el.classList.contains('save-meal')?(saved.includes(id)?'♥':'♡'):(saved.includes(id)?T('Đã lưu · bỏ lưu','已收藏 · 取消收藏'):T('Lưu lựa chọn','收藏这份餐品'));});toast(saved.includes(id)?T('Đã lưu món','已加入收藏'):T('Đã bỏ lưu','已取消收藏'));if(view==='saved')render();}
 if(b.hasAttribute('data-refresh-picks')){b.disabled=true;fetch('catalog.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(result=>{if(!Array.isArray(result.shops)||!Array.isArray(result.items))throw Error();data=result;if(view==='home')render();toast(T('Đã cập nhật thực đơn lưu trữ','已刷新历史菜单'));}).catch(()=>toast(T('Chưa tải được, thử lại sau','暂未刷新成功，请稍后重试'))).finally(()=>b.disabled=false);}
 if(b.hasAttribute('data-suggest')){draft=prompts()[0];write('draft',draft);render();$('#ask textarea').focus();}
 if(b.hasAttribute('data-add-taste'))openSheet(T('Thêm khẩu vị','添加口味'),`<div class="preferences">${preferenceNames.map((x,i)=>`<button data-pref="${i}" aria-pressed="${preferences.includes(x)}">${prefText(i)}${preferences.includes(x)?' ✓':' ＋'}</button>`).join('')}</div><form id="taste-custom" class="taste-custom"><input name="taste" maxlength="24" required aria-label="${T('Khẩu vị mới','自定义口味')}" placeholder="${T('Ví dụ: không ăn hành','例如：不吃洋葱')}"><p class="taste-error" role="status"></p><button class="send">${T('Thêm khẩu vị','添加口味')}</button></form>`);
 if(b.dataset.editReference){initCompare(b.dataset.editReference);showCostEditor();}
 if(b.hasAttribute('data-about-demo'))aboutDemo();
 if(b.hasAttribute('data-account'))openSheet(T('Tài khoản & bảo mật','账户与安全'),`<p class="sheet-copy">${T('Bạn đang dùng trải nghiệm không đăng nhập. Dữ liệu chỉ lưu ở trình duyệt này.','当前为免登录作品体验。显示名称、偏好与历史仅保存在此浏览器。')}</p><button class="city-option" data-profile-edit>${T('Tên hiển thị','修改显示名称')} →</button><button class="city-option" data-clear>${T('Xóa dữ liệu trên thiết bị','清除本机数据')} →</button>`);
 if(b.hasAttribute('data-notifications'))openSheet(T('Thông báo','通知'),`<p class="sheet-copy">${T('Nhắc khi câu trả lời sẵn sàng trong ứng dụng. Không gửi thông báo hệ thống.','在应用内提示选餐结果已就绪。不会向浏览器外发送系统通知。')}</p><form id="notification-settings" class="settings-form"><label class="radio-row"><span>${T('Nhắc khi có kết quả','选餐完成提醒')}</span><input type="checkbox" name="ready" ${settings.readyNotice!==false?'checked':''}></label><button class="send full">${T('Lưu','保存')}</button></form>`);
 if(b.hasAttribute('data-feedback'))openSheet(T('Gửi phản hồi','发送反馈'),`<p class="sheet-copy">${T('Chia sẻ điều bạn muốn Wanso làm tốt hơn.','欢迎告诉我：哪些地方顺手，哪些地方还需要改善。')}</p><a class="send feedback-email" href="mailto:13971032326@163.com?subject=Wanso%20体验反馈">${T('Viết email phản hồi','写邮件反馈')} ↗</a>`);
 if(b.dataset.pref!==undefined){const i=Number(b.dataset.pref),x=preferenceNames[i];if(!preferences.includes(x)&&preferences.length>=9){toast(T('Tối đa 9 khẩu vị','最多保存 9 个口味'));return;}preferences=preferences.includes(x)?preferences.filter(v=>v!==x):[...preferences,x];persist();b.setAttribute('aria-pressed',String(preferences.includes(x)));b.textContent=prefText(i)+(preferences.includes(x)?' ✓':' ＋');toast(T('Đã lưu khẩu vị','口味偏好已保存'));if(view==='profile'&&!$('#sheet').open)render();}
 if(b.hasAttribute('data-profile-edit'))openSheet(T('Tên hiển thị','显示名称'),`<form id="profile-edit" class="settings-form"><label class="field-label">${T('Tên trên thiết bị này','在本机显示的名字')}<input name="name" maxlength="24" value="${e(settings.name)}" placeholder="${T('Khách trải nghiệm','体验访客')}" autocomplete="off"></label><p class="helper">${T('Tên này không tạo tài khoản.','仅用于本机展示，不会创建平台账户。')}</p><button class="send full">${T('Lưu','保存名称')}</button></form>`);
 if(b.hasAttribute('data-order-settings'))orderSettings();
 if(b.hasAttribute('data-app-settings'))appSettings();
 if(b.hasAttribute('data-reset-filter')){menuBudget=0;menuQuery='';menuSort='recommended';render();}
 if(b.hasAttribute('data-cancel'))controller?.abort();
 if(b.hasAttribute('data-retry'))ask(lastQuestion,true);
 if(b.hasAttribute('data-reset'))newThread();
 if(b.dataset.history){const record=archives.find(x=>x.id===b.dataset.history);if(record){saveThread();controller?.abort();requestId++;pending=false;sessionId=record.id;city=record.city;messages=record.messages;thread=record.thread;persist();write('active',sessionId);navigate('chat');}}
 if(b.dataset.deleteHistory)openSheet(T('Xóa lịch sử?','删除这条记录？'),`<p class="sheet-copy">${T('Cuộc trò chuyện này sẽ bị xóa khỏi trình duyệt và không thể khôi phục.','这条选餐对话将从本机删除，删除后不可恢复。收藏的餐品不会受影响。')}</p><div class="sheet-actions"><button class="secondary" data-dismiss>${T('Hủy','取消')}</button><button class="send" data-confirm-history="${e(b.dataset.deleteHistory)}">${T('Xác nhận xóa','确认删除')}</button></div>`);
 if(b.dataset.confirmHistory){archives=archives.filter(x=>x.id!==b.dataset.confirmHistory);if(sessionId===b.dataset.confirmHistory){controller?.abort();requestId++;pending=false;sessionId='';thread=[];messages=[];write('active','');}write('history',archives);$('#sheet').close();render();}
 if(b.hasAttribute('data-dismiss'))$('#sheet').close();
 if(b.hasAttribute('data-clear'))openSheet(T('Xóa dữ liệu?','清除演示数据？'),`<p class="sheet-copy">${T('Xóa món đã lưu, sở thích, cài đặt và lịch sử trên thiết bị này. Không thể hoàn tác.','将清除本机的收藏、偏好、设置和选餐历史，清除后不可恢复。')}</p><div class="sheet-actions"><button class="secondary" data-dismiss>${T('Hủy','取消')}</button><button class="send" data-confirm-clear>${T('Xác nhận xóa','确认清除')}</button></div>`);
 if(b.hasAttribute('data-confirm-clear')){controller?.abort();requestId++;pending=false;saved=[];preferences=[];archives=[];thread=[];messages=[];sessionId='';draft='';settings={name:'',budget:0,sort:'recommended',theme:'ocean'};menuBudget=0;menuSort='recommended';persist();write('history',[]);write('active','');write('draft','');$('#sheet').close();render();toast(T('Đã xóa dữ liệu','演示数据已清除'));}
});
addEventListener('message',event=>{
 if(event.origin!==location.origin||event.source!==parent||!data)return;
 if(event.data?.type==='portfolio-show-frame'){if($('#sheet').open)$('#sheet').close();navigate(event.data.frame);}
 if(event.data?.type==='portfolio-device-action'){const sequence=['home','explore','compare','profile'];const index=Math.max(0,sequence.indexOf(view));navigate(sequence[Math.max(0,Math.min(3,index+(event.data.action==='previous'?-1:1)))]);}
});
addEventListener('storage',event=>{
 if(!event.key?.startsWith('wanso-demo-')||!data)return;
 if(event.key==='wanso-demo-saved'){const v=read('saved',[]);saved=Array.isArray(v)?v.filter(id=>data.items.some(x=>x.id===id)):[];}
 if(event.key==='wanso-demo-history'){const v=read('history',[]);if(Array.isArray(v))archives=v;}
 if(event.key==='wanso-demo-settings')settings=read('settings',settings);
 if(event.key==='wanso-demo-preferences')preferences=read('preferences',preferences);
 if(event.key==='wanso-demo-language')lang=read('language',lang);
 if(event.key==='wanso-demo-city'){city=read('city',city);compareState=null;}
 if(!pending&&['wanso-demo-history','wanso-demo-active','wanso-demo-city'].includes(event.key)){
  const active=read('active','');
  if(active)restoreActive();else{sessionId='';thread=[];messages=[];}
 }
 if(!pending&&!document.querySelector('#sheet[open]')&&!document.activeElement?.matches('textarea,input,select')){const scroll=$('#screen').scrollTop;captureDraft();render();$('#screen').scrollTop=scroll;}
});
addEventListener('keydown',event=>{if(event.key!=='Escape')return;if($('#sheet').open){event.preventDefault();$('#sheet').close();}else parent.postMessage({type:'portfolio-close-phone'},location.origin);});
fetch('catalog.json').then(r=>{if(!r.ok)throw Error();return r.json();}).then(result=>{
 data=result;saved=saved.filter(id=>data.items.some(x=>x.id===id));restoreActive();
 const target=location.hash.slice(1);view=['home','explore','recommend','compare','profile','saved','chat','history'].includes(target)?target:'home';render();
}).catch(()=>{$('#screen').innerHTML='<p class="error">菜单暂未加载，请刷新重试。<button class="send" onclick="location.reload()">刷新</button></p>';});
