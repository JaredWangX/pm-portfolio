'use strict';
// Live text replaces rasterized settings while keeping the native navigation and state.
window.wansoSettings = (() => {
  const titles={settings:'Cài đặt',preferences:'Tùy chọn tìm kiếm',history:'Lịch sử trò chuyện',notifications:'Thông báo',account:'Thông tin cá nhân',theme:'Giao diện',language:'Ngôn ngữ'};
  const el=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls||'';if(text!==undefined)n.textContent=text;return n;};
  function mount(parent,id,route,open) {
    const root=el('section','phone-scroll ios-data-page wanso-settings-page'+(id==='history'?' has-tabs':''));root.dataset.settings=id;root.tabIndex=0;root.setAttribute('aria-label',titles[id]);
    const header=el('header','wanso-settings-header');
    const back=el('button','wanso-settings-back','‹');back.type='button';back.setAttribute('aria-label','Quay lại');back.onclick=()=>route(['theme','language'].includes(id)?'settings':id==='history'?'home':'profile',false,'back');
    header.append(back,el('h1','',titles[id]));const content=el('div','wanso-settings-content');root.append(header,content);parent.append(root);
    function refresh(){
      const state=window.wansoControls.viewState(),display=window.wansoControls.displayValue||String;
      content.replaceChildren();
      const section=(title)=>{const part=el('section','wanso-settings-group');if(title)part.append(el('h2','',title));content.append(part);return part;};
      const row=(part,label,value,fn,options={})=>{
        const b=el('button','wanso-settings-row');b.type='button';b.onclick=fn;b.disabled=Boolean(options.disabled);const copy=el('span','wanso-settings-row-copy');copy.append(el('strong','',label));if(options.note)copy.append(el('small','',options.note));b.append(copy);
        if(options.toggle){b.setAttribute('role','switch');b.setAttribute('aria-checked',String(Boolean(value)));b.append(el('span','wanso-settings-switch'));}
        else {if(value!==undefined&&value!=='')b.append(el('span','wanso-settings-value',display(value)));b.append(el('span','wanso-settings-chevron','›'));}
        if(options.danger)b.classList.add('is-danger');part.append(b);return b;
      };
      const toggle=(part,label,key,note)=>row(part,label,state[key],()=>open('toggle',key),{toggle:true,note,disabled:id==='notifications'&&key!=='push'&&!state.push});
      const note=text=>content.append(el('p','wanso-settings-note',text));
      if(id==='settings') {
        let s=section('Hiển thị');row(s,'Giao diện',state.theme,()=>route('theme'));row(s,'Ngôn ngữ',state.appLanguage,()=>route('language'));
        s=section('Trải nghiệm');toggle(s,'Phản hồi rung','haptics');toggle(s,'Chia sẻ dữ liệu ẩn danh','analytics','Giúp cải thiện trải nghiệm tìm và so sánh món.');row(s,'Xóa lịch sử hoạt động','',()=>open('activityClear'),{danger:true});
        s=section('Thông tin');row(s,'Điều khoản dịch vụ','',()=>open('terms'));row(s,'Chính sách quyền riêng tư','',()=>open('privacy'));
      } else if(id==='preferences') {
        let s=section('Hội viên của bạn');toggle(s,'GrabUnlimited','grab','Tính ưu đãi giao hàng dành cho hội viên.');toggle(s,'ShopeeFood+','shopee','Tính mã miễn giảm phí giao của hội viên.');
        s=section('Ngân sách mỗi bữa');for(const key of ['5万以下','10万以下','不限']){const b=row(s,display(key),state.budget===key?'✓':'',()=>open('budget',key));b.setAttribute('aria-pressed',String(state.budget===key));}
        s=section('Cách sắp xếp');for(const key of ['平衡','距离优先','价格优先']){const b=row(s,display(key),state.mode===key?'✓':'',()=>open('mode',key));b.setAttribute('aria-pressed',String(state.mode===key));}
        note('Bạn có thể nêu yêu cầu cụ thể trong từng cuộc trò chuyện để điều chỉnh gợi ý.');
      } else if(id==='history') {
        let s=section();row(s,'Tìm cuộc trò chuyện','',()=>open('historySearch'));
        if(state.history){s=section('Gần đây');row(s,state.query,'',()=>open('openHistory'),{note:'Xem món gợi ý và so sánh chi phí trên hai nền tảng.'});row(s,'Xóa cuộc trò chuyện','',()=>open('historyClear'),{danger:true});}
        else {content.append(el('div','wanso-settings-empty','Chưa có cuộc trò chuyện. Hãy bắt đầu từ một món bạn muốn ăn.'));const b=el('button','wanso-settings-primary','Tìm món ăn');b.onclick=()=>route('home');content.append(b);}
      } else if(id==='notifications') {
        let s=section('Cho phép thông báo');toggle(s,'Nhận thông báo','push');
        s=section('Nội dung bạn quan tâm');for(const [label,key] of [['Ưu đãi và mã giảm giá','offers'],['Món giảm giá','priceDrop'],['Quán mới gần bạn','newPlaces'],['Cập nhật giao hàng','delivery'],['Tổng hợp AI hằng tuần','digest']])toggle(s,label,key);
        s=section('Giờ yên tĩnh');toggle(s,'Không làm phiền','quiet');row(s,'Bắt đầu',state.start,()=>open('account','start'),{disabled:!state.push||!state.quiet});row(s,'Kết thúc',state.end,()=>open('account','end'),{disabled:!state.push||!state.quiet});
      } else if(id==='account') {
        const s=section('Thông tin của bạn');for(const [label,key] of [['Email','email'],['Số điện thoại','phone'],['Ngày sinh','birthday'],['Địa chỉ','address']])row(s,label,state[key]||'Chưa cập nhật',()=>open('account',key));row(s,'Giới tính',state.gender||'Chưa cập nhật',()=>open('gender'));
        row(section('Quản lý tài khoản'),'Xóa tài khoản','',()=>open('removeAccount'),{danger:true});
      } else if(id==='theme') {
        const s=section('Chọn màu bạn thích');for(const [key,color] of [['森林','#27846a'],['海洋','#4388da'],['薰衣草','#9976d6'],['日落','#de8b5e'],['午夜','#27334d'],['赛博','#4f80c8']]){const b=row(s,display(key),state.theme===key?'✓':'',()=>open('theme',key));b.setAttribute('aria-pressed',String(state.theme===key));const swatch=el('span','wanso-settings-swatch');swatch.style.background=color;b.prepend(swatch);}
      } else if(id==='language') {
        const s=section('Ngôn ngữ hiển thị');for(const [key,label] of [['跟随系统','Theo hệ thống'],['English','Tiếng Anh'],['Tiếng Việt','Tiếng Việt'],['中文','Tiếng Trung']]){const b=row(s,label,state.appLanguage===key?'✓':'',()=>open('language',key));b.setAttribute('aria-pressed',String(state.appLanguage===key));}
      }
    }
    root.refreshContent=refresh;refresh();return root;
  }
  return {mount,has:id=>Boolean(titles[id]),titles};
})();
