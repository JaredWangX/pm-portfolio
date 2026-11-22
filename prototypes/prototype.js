'use strict';
const $ = selector => document.querySelector(selector);
const embed = new URLSearchParams(location.search).has('embed');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
document.body.classList.add('show-hotspots');
document.body.classList.toggle('embed', embed);
const screen = $('.screen'), viewport = $('.viewport');
const phone = document.body.dataset.product === 'wanso';
let picture = $('.original-screen');
let transition;
const layer = document.createElement('div');
layer.className = 'page-layer';
screen.append(layer);
layer.append(picture, $('.hotspots'));
let activeLayer = layer;
const duration = 10000;
let frames = [], flows = [], flow = 0, current = -1, playing = false, zoomed = false, guided = true;
let visible = true, parentVisible = true, loading = false, loadId = 0, ready = false, failed = false;
let tick = 0, hintTimer = 0, elapsed = 0, previousTime = 0;
const cached = new Map();
const steps = () => flows[flow]?.steps || [];
const stepIndex = () => guided ? steps().findIndex(s => s.id === frames[current]?.id) : -1;
const activeStep = () => steps()[stepIndex()];
function fit() {
  const f = frames[current];
  if (!f) return;
  const nativeWidth = phone ? 402 : 1440;
  const height = phone ? 2808 : f.height;
  const scale = zoomed ? nativeWidth / f.width : Math.min((viewport.clientWidth - 20) / f.width, (viewport.clientHeight - 20) / height, nativeWidth / f.width);
  screen.style.width = Math.max(1, f.width * scale) + 'px';
  screen.style.height = Math.max(1, height * scale) + 'px';
}
function decoded(f) {
  if (!cached.has(f.id)) {
    cached.set(f.id, new Promise((resolve, reject) => {
      const image = new Image();
      const timeout = setTimeout(() => {cached.delete(f.id); reject(Error('image timeout'));}, 15000);
      image.src = f.src;
      image.decode().then(() => {clearTimeout(timeout);resolve(image);}).catch(error => {clearTimeout(timeout);cached.delete(f.id); reject(error);});
    }));
  }
  // Bound decoded image memory while retaining the current page and nearby steps.
  if (cached.size > 8) {
    const oldest = [...cached.keys()].find(id => id !== f.id && id !== frames[current]?.id);
    if (oldest) cached.delete(oldest);
  }
  return cached.get(f.id);
}
function canPlay() { return ready && playing && visible && parentVisible && !document.hidden && !loading && !failed; }
function updatePlayback() {
  const play = $('.autoplay');
  play.setAttribute('aria-pressed', String(playing));
  play.textContent = playing ? 'Ⅱ 暂停' : '▶ 继续播放';
  $('.play-status').textContent = playing ? '自动演示' : '已暂停，可自由查看';
  $('.play-progress').classList.toggle('paused', !canPlay());
}
function animate(now) {
  if (!canPlay()) {previousTime = 0; return;}
  if (previousTime) elapsed += Math.min(now - previousTime, 250);
  previousTime = now;
  $('.play-progress span').style.transform = `scaleX(${Math.min(1, elapsed / duration)})`;
  if (elapsed >= duration) {elapsed = 0; previousTime = 0; next(false);}
  else tick = requestAnimationFrame(animate);
}
function schedule() {
  cancelAnimationFrame(tick);
  previousTime = 0;
  updatePlayback();
  if (canPlay()) tick = requestAnimationFrame(animate);
}
function setPlaying(value) {playing = value; schedule();}
function hint(text) {
  clearTimeout(hintTimer);
  $('.interaction-hint').textContent = text;
  $('.interaction-hint').hidden = false;
  hintTimer = setTimeout(() => {$('.interaction-hint').hidden = true;}, 4200);
}
function makeButton(text, fn, className) {
  const b = document.createElement('button');
  b.type = 'button'; b.textContent = text;
  if (className) b.className = className;
  b.addEventListener('click', fn);
  return b;
}
function renderFlow() {
  $('.flow-summary').textContent = flows[flow].summary;
  $('.flow-selector').querySelectorAll('button').forEach((b,i) => b.setAttribute('aria-pressed',String(i===flow)));
  $('.flow-steps').replaceChildren(...steps().map((step, i) => {
    const b = makeButton('', () => {guided=true;show(step.id,true,true);}, 'flow-step');
    b.dataset.step = step.id;
    const number = document.createElement('span'); number.textContent = String(i+1).padStart(2,'0');
    const label = document.createElement('strong'); label.textContent = step.label;
    b.append(number, label); return b;
  }));
}
function renderFrame() {
  const f = frames[current], position = stepIndex(), step = activeStep();
  $('.page-title').textContent = f.title;
  $('.page-counter').textContent = position >= 0 ? `${position+1} / ${steps().length}` : `${current+1} / ${frames.length}`;
  $('.step-eyebrow').textContent = position >= 0 ? `${flows[flow].title} · ${String(position+1).padStart(2,'0')}` : '自由浏览 · ' + f.group;
  $('.step-caption').textContent = step?.caption || `查看${f.title}，点击箭头翻页。`;
  $('.page-description').textContent = step?.reason || f.note;
  $('.continue').textContent = position < 0 ? '回到流程 →' : position === steps().length-1 ? '重新体验 ↺' : '继续 →';
  $('.previous').disabled = position < 0 ? current === 0 : position === 0;
  $('.next').disabled = false;
  for (const b of document.querySelectorAll('[data-screen],[data-step]')) {
    if ((b.dataset.screen || b.dataset.step) === f.id) b.setAttribute('aria-current','step');
    else b.removeAttribute('aria-current');
  }
  const nextId = steps()[(position+1) % steps().length]?.id;
  const preferred = position >= 0 ? f.hotspots.find(h => h.target === nextId) : f.hotspots.find(h=>h.target!==f.id);
  activeLayer.querySelector('.hotspots').replaceChildren(...f.hotspots.map(h => {
    const b = makeButton('', () => {
      if (h.target === f.id) {setPlaying(false);hint('你已经在这个页面。可点击其他发光点，或继续体验下一步。');}
      else {guided=steps().some(s=>s.id===h.target);show(h.target);}
    }, 'hotspot');
    b.setAttribute('aria-label',h.label); b.dataset.target = h.target;
    const height = phone ? 2808 : f.height;
    const shift = phone && h.y >= 88 ? height - f.height : 0;
    Object.assign(b.style,{left:h.x+'%',top:(h.y * f.height / 100 + shift) / height * 100+'%',width:h.w+'%',height:h.h * f.height / height+'%'});
    if (h === preferred) {b.classList.add('suggested');const dot=document.createElement('span');dot.className='hotspot-dot';dot.setAttribute('aria-hidden','true');b.append(dot);}
    return b;
  }));
  fit();
  history.replaceState(null,'','#'+f.id);
  const upcoming = [nextId, steps()[(position+2) % steps().length]?.id, frames[current+1]?.id];
  for (const id of new Set(upcoming)) {
    const f = frames.find(f=>f.id===id);
    if (f && f.id!==frames[current].id) decoded(f).catch(()=>{});
  }
}
async function show(id, manual = true, returnToViewer = false) {
  const index = frames.findIndex(f => f.id === id);
  if (index < 0) return;
  const request = ++loadId;
  if (manual) setPlaying(false);
  loading = true; failed = false; schedule();
  $('.viewer').setAttribute('aria-busy','true');
  const loadingNotice = setTimeout(() => {if (request === loadId && loading) $('.image-loading').hidden = false;}, 180);
  $('.image-loading').textContent = '正在载入原版页面…';
  $('.load-error').hidden = true;
  try {
    const image = await decoded(frames[index]);
    if (request !== loadId) return;
    const hadPage = current >= 0;
    const backwards = index < current;
    current = index;
    transition?.cancel();
    screen.querySelectorAll('.page-layer.leaving').forEach(node => node.remove());
    const oldLayer = activeLayer;
    oldLayer.classList.add('leaving');
    oldLayer.inert = true;
    oldLayer.setAttribute('aria-hidden', 'true');
    activeLayer = document.createElement('div');
    activeLayer.className = 'page-layer';
    picture = image.cloneNode();
    picture.className = 'original-screen';
    picture.draggable = false;
    picture.alt = `${document.body.dataset.product.toUpperCase()} · ${frames[index].title} · 原版页面`;
    activeLayer.append(picture);
    if (phone) {
      // The original phone pages have two heights. Keep their UI at one scale;
      // extend only the blank area before the bottom navigation, never stretch text.
      activeLayer.style.setProperty('--source-height', frames[index].height / 2808 * 100 + '%');
      const footer = picture.cloneNode();
      footer.className = 'screen-bottom'; footer.alt = ''; footer.setAttribute('aria-hidden','true');
      activeLayer.append(footer);
    }
    const hotspots = document.createElement('div'); hotspots.className = 'hotspots';
    activeLayer.append(hotspots);
    screen.append(activeLayer);
    renderFrame();
    if (hadPage && !reduced.matches) {
      transition = activeLayer.animate([
        {opacity:0,transform:`translateX(${backwards ? -12 : 12}px)`},
        {opacity:1,transform:'translateX(0)'}
      ], {duration:280,easing:'cubic-bezier(.22,1,.36,1)'});
      transition.finished.then(() => oldLayer.remove()).catch(() => oldLayer.remove());
    } else oldLayer.remove();
    if (returnToViewer && !embed && matchMedia('(max-width:760px)').matches) {
      $('.viewer').scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'start'});
    }

    elapsed = 0;
    $('.play-progress span').style.transform = 'scaleX(0)';
  } catch {
    if (request !== loadId) return;
    failed = true;
    setPlaying(false);
    $('.load-error').hidden = false;
    $('.load-error').dataset.retry = id;
  } finally {
    clearTimeout(loadingNotice);
    if (request === loadId) {
      loading = false;
      $('.viewer').removeAttribute('aria-busy');
      $('.image-loading').hidden = true;
      schedule();
    }
  }
}
function next(manual = true) {
  if (!ready) return;
  if (!guided && manual) {show(frames[(current+1) % frames.length].id);return;}
  const position = stepIndex();
  show(steps()[position < 0 ? 0 : (position+1) % steps().length].id, manual);
}
function previous() {
  if (!ready) return;
  const position = stepIndex();
  const id = position < 0 ? frames[Math.max(0,current-1)].id : steps()[Math.max(0,position-1)].id;
  show(id);
}
$('.previous').addEventListener('click',previous);
$('.next').addEventListener('click',()=>next());
$('.continue').addEventListener('click',()=>{
  if (!guided) {guided=true;show(steps()[0].id);}
  else next();
});
$('.autoplay').addEventListener('click',()=>{
  if (playing) setPlaying(false);
  else if (stepIndex()<0) {guided=true;show(steps()[0].id,false);setPlaying(true);}
  else setPlaying(true);
});
$('.hotspot-toggle').addEventListener('click',event=>{
  const enabled=document.body.classList.toggle('show-hotspots');
  event.currentTarget.setAttribute('aria-pressed',String(enabled));
});
$('.zoom-toggle').addEventListener('click',event=>{
  zoomed=!zoomed;
  document.body.classList.toggle('zoomed',zoomed);
  event.currentTarget.textContent=zoomed?'适应':'放大';
  event.currentTarget.setAttribute('aria-pressed',String(zoomed));
  setPlaying(false);fit();
});
let swipeStart, ignoreClick = false;
screen.addEventListener('pointerdown', event => {
  if (event.pointerType === 'mouse' || zoomed) return;
  setPlaying(false);
  swipeStart = {x:event.clientX,y:event.clientY,id:event.pointerId};
});
screen.addEventListener('pointercancel', () => {swipeStart = null;});
screen.addEventListener('pointerup', event => {
  if (!swipeStart || swipeStart.id !== event.pointerId) return;
  const dx = event.clientX - swipeStart.x, dy = event.clientY - swipeStart.y;
  swipeStart = null;
  if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.6) {
    ignoreClick = true;
    dx < 0 ? next() : previous();
    setTimeout(() => {ignoreClick = false;}, 350);
  }
});
screen.addEventListener('click', event => {
  if (ignoreClick) {event.preventDefault();event.stopImmediatePropagation();}
}, true);
$('.screen').addEventListener('click',event=>{
  if (!event.target.closest('.hotspot')) {
    setPlaying(false);
    hint('点击页面按钮或左右滑动查看。想自由输入，可以打开在线体验。');
  }
});
$('.retry').addEventListener('click',()=>{
  if (!ready) location.reload();
  else show($('.load-error').dataset.retry || frames[current]?.id || steps()[0].id);
});
document.addEventListener('keydown',event=>{
  if (event.altKey || event.ctrlKey || event.metaKey || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
  if (event.key==='ArrowRight') {event.preventDefault();next();}
  if (event.key==='ArrowLeft') {event.preventDefault();previous();}
  if (event.key==='Escape' && zoomed) $('.zoom-toggle').click();
});
document.addEventListener('visibilitychange',schedule);
window.addEventListener('message',event=>{
  if (event.origin!==location.origin || event.source!==parent || event.data?.type!=='portfolio-visibility') return;
  parentVisible=event.data.visible===true;schedule();
});
new ResizeObserver(fit).observe(viewport);
new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;schedule();},{threshold:.1}).observe($('.viewer'));
reduced.addEventListener('change',event=>{if(event.matches)setPlaying(false);});
window.addEventListener('hashchange',()=>{if(ready && location.hash.slice(1)!==frames[current]?.id)show(location.hash.slice(1));});
fetch('screens.json?v=reading3',{signal:AbortSignal.timeout(15000)}).then(r=>{if(!r.ok)throw Error('screens');return r.json();}).then(async data=>{
  frames=data.frames; flows=data.flows;
  if(!frames.length || !flows.length)throw Error('empty');
  $('.flow-selector').replaceChildren(...flows.map((f,i)=>makeButton(f.title,()=>{
    flow=i;guided=true;renderFlow();show(steps()[0].id,true,true);
  })));
  const groups=[...new Set(frames.map(f=>f.group))];
  for(const group of groups){
    const h=document.createElement('h2');h.textContent=group;$('.screen-nav').append(h);
    frames.filter(f=>f.group===group).forEach(f=>{
      const b=makeButton(f.title,()=>{guided=false;show(f.id,true,true);});b.dataset.screen=f.id;$('.screen-nav').append(b);
    });
  }
  $('.catalog-count').textContent=frames.length+' 页';
  const start=frames.some(f=>f.id===location.hash.slice(1))?location.hash.slice(1):data.default;
  const matching=flows.findIndex(f=>f.steps.some(s=>s.id===start));
  if(matching>=0)flow=matching;
  renderFlow(); ready=true;
  document.querySelectorAll('.viewer button').forEach(b=>b.disabled=false);
  const initialLoad=loadId+1;
  await show(start,false);
  if(loadId===initialLoad && !failed && !reduced.matches)setPlaying(true);
}).catch(()=>{
  failed=true;setPlaying(false);$('.load-error').hidden=false;$('.image-loading').hidden=true;
});
