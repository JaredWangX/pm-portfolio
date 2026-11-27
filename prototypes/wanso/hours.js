'use strict';

// Status reflects the supplied hours in Vietnam time, not a live platform availability signal.
window.wansoHours = (() => {
  const clock=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  function status(store,date=new Date()) {
    const schedule=String(store.hours||'').trim();
    if(schedule==='24小时'||schedule==='全天营业')return {state:'open',label:'营业中',detail:'24 小时营业',schedule};
    const parts=schedule.match(/^(\d{1,2}):(\d{2})\s*[–—-]\s*(\d{1,2}):(\d{2})$/);
    const unknown={state:'unknown',label:'营业时间待确认',detail:'请向平台或店家确认营业时间',schedule:''};
    if(!parts)return unknown;
    const [,sh,sm,eh,em]=parts.map(Number);
    if(sh>23||eh>24||sm>59||em>59||(eh===24&&em!==0))return unknown;
    const start=sh*60+sm,end=eh*60+em;if(start===end)return unknown;
    const [hour,minute]=clock.format(date).split(':').map(Number),current=hour*60+minute;
    const overnight=end<start;
    const open=overnight?(current>=start||current<end):(current>=start&&current<end);
    const format=value=>String(Math.floor(value/60)).padStart(2,'0')+':'+String(value%60).padStart(2,'0');
    const detail=open?'营业至 '+(overnight&&current>=start?'次日 ':'')+format(end):(current>=end&&!overnight?'明日 ':'')+format(start)+' 开始营业';
    return {state:open?'open':'closed',label:open?'营业中':'休息中',detail,schedule:format(start)+'–'+format(end)};
  }
  return {status};
})();
