'use strict';

// Status reflects the supplied hours in Vietnam time, not a live platform availability signal.
window.wansoHours = (() => {
  const clock=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  function status(store,date=new Date()) {
    const schedule=String(store.hours||'').trim();
    if(schedule==='24小时'||schedule==='全天营业'||schedule==='24 giờ'||schedule==='24/7')return {state:'open',label:'Đang mở cửa',detail:'Mở cửa 24 giờ',schedule};
    const parts=schedule.match(/^(\d{1,2}):(\d{2})\s*[–—-]\s*(\d{1,2}):(\d{2})$/);
    const unknown={state:'unknown',label:'Chưa rõ giờ mở cửa',detail:'Vui lòng kiểm tra giờ mở cửa trên nền tảng hoặc với quán',schedule:''};
    if(!parts)return unknown;
    const [,sh,sm,eh,em]=parts.map(Number);
    if(sh>23||eh>24||sm>59||em>59||(eh===24&&em!==0))return unknown;
    const start=sh*60+sm,end=eh*60+em;if(start===end)return unknown;
    const [hour,minute]=clock.format(date).split(':').map(Number),current=hour*60+minute;
    const overnight=end<start;
    const open=overnight?(current>=start||current<end):(current>=start&&current<end);
    const format=value=>String(Math.floor(value/60)).padStart(2,'0')+':'+String(value%60).padStart(2,'0');
    const detail=open?'Mở đến '+format(end)+(overnight&&current>=start?' ngày mai':''):'Mở lúc '+format(start)+(current>=end&&!overnight?' ngày mai':'');
    return {state:open?'open':'closed',label:open?'Đang mở cửa':'Đã đóng cửa',detail,schedule:format(start)+'–'+format(end)};
  }
  return {status};
})();
