'use strict';
const $ = selector => document.querySelector(selector);
const embed = new URLSearchParams(location.search).has('embed');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
document.body.classList.add('show-hotspots');
document.body.classList.toggle('embed', embed);
const screen = $('.screen'), viewport = $('.viewport');
const phone = document.body.dataset.product === 'wanso';
const capturedPhone = document.body.dataset.capture === 'ios';
const expanded = new URLSearchParams(location.search).has('expanded');
const device = new URLSearchParams(location.search).has('device');
document.body.classList.toggle('device-embed', device);
const stageHeight = f => f.height;
let flowDialog;
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
  const height = stageHeight(f);
  const inset = device ? 0 : phone ? 4 : 20;
  const scale = zoomed ? nativeWidth / f.width : Math.min((viewport.clientWidth - inset) / f.width, (viewport.clientHeight - inset) / height, nativeWidth / f.width);
  screen.style.width = Math.max(1, f.width * scale) + 'px';
  screen.style.height = Math.max(1, height * scale) + 'px';
}
function decoded(f) {
  if (!cached.has(f.id)) {
    const entry = Promise.all([f.src, f.scroll?.src].filter(Boolean).map(src => new Promise((resolve, reject) => {
      const image = new Image();
      const timeout = setTimeout(() => reject(Error('image timeout')), 12000);
      image.src = src;
      image.decode().then(() => resolve(image), reject).finally(() => clearTimeout(timeout));
    }))).catch(error => {
      if (cached.get(f.id) === entry) cached.delete(f.id);
      throw error;
    });
    cached.set(f.id, entry);
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
  if (phone) play.textContent = playing ? 'Ⅱ 暂停' : '▶ 播放';
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
function selectFrame(id, returnToViewer = false, runSearch = false) {
  const matching = flows.findIndex(item => item.steps.some(step => step.id === id));
  guided = matching >= 0;
  if (guided && matching !== flow) {
    flow = matching;
    renderFlow();
  }
  return show(id, true, returnToViewer, runSearch);
}
function renderFrame() {
  const f = frames[current], position = stepIndex(), step = activeStep();
  screen.toggleAttribute('data-swipeable', Boolean(f.swipeLeft || f.swipeRight));
  $('.page-title').textContent = f.title;
  $('.page-counter').textContent = position >= 0 ? `${position+1} / ${steps().length}` : `${current+1} / ${frames.length}`;
  $('.step-eyebrow').textContent = position >= 0 ? `${flows[flow].title} · ${String(position+1).padStart(2,'0')}` : '自由浏览 · ' + f.group;
  $('.step-caption').textContent = step?.caption || `查看${f.title}，点击箭头翻页。`;
  $('.page-description').textContent = step?.reason || f.note;
  $('.source-page')?.replaceChildren(document.createTextNode(
    capturedPhone ? 'iOS 模拟器截图 · 历史菜单样本' : '公开工作台截图'
  ));
  const liveLink = $('.live-link');
  if (liveLink && !phone && /^#[a-z0-9/-]+$/.test(f.route || '')) liveLink.hash = f.route;
  $('.continue').textContent = position < 0 ? '回到流程 →' : position === steps().length-1 ? '重新体验 ↺' : '继续 →';
  $('.previous').disabled = position < 0 ? current === 0 : position === 0;
  $('.next').disabled = false;
  for (const b of document.querySelectorAll('[data-screen],[data-step],[data-shortcut]')) {
    const active = b.dataset.shortcut ? b.dataset.shortcut === (f.section || f.id) : (b.dataset.screen || b.dataset.step) === f.id;
    if (active) b.setAttribute('aria-current','step');
    else b.removeAttribute('aria-current');
  }
  const nextId = steps()[(position+1) % steps().length]?.id;
  const preferred = position >= 0 ? f.hotspots.find(h => h.target === nextId) : f.hotspots.find(h=>h.target && h.target!==f.id);
  for (const h of f.hotspots) {
    const select = () => {
      if (h.notice) {setPlaying(false);hint(h.notice);return;}
      if (h.target === f.id) {setPlaying(false);hint('你已经在这个页面。可点击其他发光点，或继续体验下一步。');}
      else if (h.target) selectFrame(h.target, false, h.runSearch);
    };
    let b;
    if (h.href && /^https:\/\/(food\.grab\.com|shopeefood\.vn)\//.test(h.href)) {
      b = document.createElement('a');
      b.className = 'hotspot';
      b.href = h.href;
      b.target = '_blank';
      b.rel = 'noopener noreferrer';
      b.draggable = false;
      b.addEventListener('click', () => setPlaying(false));
    } else b = makeButton('', select, 'hotspot');
    b.setAttribute('aria-label',h.label); if(h.target) b.dataset.target = h.target;
    Object.assign(b.style,{left:h.x+'%',top:h.y+'%',width:h.w+'%',height:h.h+'%'});
    if (h === preferred) {b.classList.add('suggested');const dot=document.createElement('span');dot.className='hotspot-dot';dot.setAttribute('aria-hidden','true');b.append(dot);}
    activeLayer.querySelector(h.scroll ? '.scroll-content .hotspots' : ':scope > .hotspots').append(b);
  }
  fit();
  history.replaceState(null,'','#'+f.id);
  if (embed) parent.postMessage({type:'portfolio-frame-changed',frame:f.id,section:f.section,route:f.route,title:f.title,description:f.note,canPrevious:!$('.previous').disabled,counter:$('.page-counter').textContent},location.origin);
  const upcoming = [f.swipeLeft, f.swipeRight, nextId, frames[current+1]?.id];
  for (const id of new Set(upcoming)) {
    const f = frames.find(f=>f.id===id);
    if (f && f.id!==frames[current].id) decoded(f).catch(()=>{});
  }
}
async function show(id, manual = true, returnToViewer = false, runSearch = false) {
  const index = frames.findIndex(f => f.id === id);
  if (index < 0) return;
  if (returnToViewer && flowDialog?.open) flowDialog.close();
  const request = ++loadId;
  if (manual) setPlaying(false);
  loading = true; failed = false; schedule();
  $('.viewer').setAttribute('aria-busy','true');
  const loadingNotice = setTimeout(() => {if (request === loadId && loading) $('.image-loading').hidden = false;}, 180);
  $('.image-loading').textContent = '正在载入原版页面…';
  $('.load-error').hidden = true;
  try {
    const frame = frames[index];
    const [image, scrollImage] = await decoded(frame);
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
    for (const metric of frame.metrics || []) {
      const label = document.createElement('span');
      label.className = 'screen-metric';
      label.dataset.tone = metric.tone || '';
      label.textContent = metric.text;
      Object.assign(label.style, {
        left: metric.x + '%', top: metric.y + '%', width: metric.w + '%'
      });
      activeLayer.append(label);
    }
    // Keep the source image intact, including its own navigation and device frame.
    activeLayer.classList.toggle('native-page',phone && !!frames[index].native);
    const hotspots = document.createElement('div'); hotspots.className = 'hotspots';
    activeLayer.append(hotspots);
    if (scrollImage) {
      const scroll = document.createElement('div');
      scroll.className = 'phone-scroll';
      scroll.tabIndex = 0;
      scroll.setAttribute('role', 'region');
      scroll.setAttribute('aria-label', frame.title + '，上下滚动查看');
      scroll.style.top = frame.scroll.top + '%';
      scroll.style.height = frame.scroll.height + '%';
      const content = document.createElement('div');
      content.className = 'scroll-content';
      const contentImage = scrollImage.cloneNode();
      contentImage.width = scrollImage.naturalWidth;
      contentImage.height = scrollImage.naturalHeight;
      contentImage.draggable = false;
      contentImage.alt = '';
      const contentHotspots = document.createElement('div');
      contentHotspots.className = 'hotspots';
      content.append(contentImage, contentHotspots);
      scroll.append(content);
      activeLayer.append(scroll);
    }
    screen.append(activeLayer);
    document.querySelectorAll('.viewer button, .flow-dialog .viewer-tools button').forEach(b=>b.disabled=false);
    renderFrame();
    if (frame.scroll?.startAt) {
      const scroll = activeLayer.querySelector('.phone-scroll');
      scroll.scrollTop = scroll.scrollHeight * frame.scroll.startAt / 100;
    }
    if (hadPage && !capturedPhone && !device && !reduced.matches) {
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
    const nextFrame = frames[index].afterSearch;
    if (runSearch && nextFrame) {
      setTimeout(() => {
        if (request === loadId) selectFrame(nextFrame, false, true);
      }, 1500);
    }
  } catch {
    if (request !== loadId) return;
    failed = true;
    setPlaying(false);
    $('.load-error').hidden = false;
    $('.load-error').dataset.retry = id;
    $('.load-error').dataset.runSearch = String(Boolean(runSearch));
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
  if (flowDialog?.open) flowDialog.close();
});
let swipeStart, ignoreClick = false;
screen.addEventListener('pointerdown', event => {
  ignoreClick = false;
  if (!event.isPrimary || event.button !== 0 || (event.pointerType === 'mouse' && !capturedPhone)) return;
  const horizontal = !capturedPhone || screen.hasAttribute('data-swipeable');
  const scroller = event.target.closest('.phone-scroll');
  if ((!horizontal && !scroller) || (zoomed && !capturedPhone)) return;
  setPlaying(false);
  swipeStart = {
    x: event.clientX, y: event.clientY, id: event.pointerId,
    horizontal, scroller, top: scroller?.scrollTop, axis: ''
  };
});
screen.addEventListener('pointermove', event => {
  if (swipeStart?.id !== event.pointerId) return;
  const dx = event.clientX - swipeStart.x, dy = event.clientY - swipeStart.y;
  if (!swipeStart.axis) {
    if (swipeStart.horizontal && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.4) swipeStart.axis = 'x';
    else if (swipeStart.scroller && Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) swipeStart.axis = 'y';
    if (swipeStart.axis && !screen.hasPointerCapture(event.pointerId)) screen.setPointerCapture(event.pointerId);
  }
  if (swipeStart.axis === 'y') swipeStart.scroller.scrollTop = swipeStart.top - dy;
});
screen.addEventListener('pointercancel', () => {swipeStart = null;});
screen.addEventListener('lostpointercapture', event => {
  if (event.target === screen && swipeStart?.id === event.pointerId) swipeStart = null;
});
screen.addEventListener('pointerup', event => {
  if (!swipeStart || swipeStart.id !== event.pointerId) return;
  const dx = event.clientX - swipeStart.x, dy = event.clientY - swipeStart.y;
  const {axis, horizontal} = swipeStart;
  swipeStart = null;
  const changedCard = horizontal && axis !== 'y' && Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.4;
  if (changedCard) {
    const frame = frames[current];
    const target = dx < 0 ? frame?.swipeLeft : frame?.swipeRight;
    if (target) selectFrame(target);
    else if (!capturedPhone) dx < 0 ? next() : previous();
  }
  if (axis || changedCard) ignoreClick = true;
});
screen.addEventListener('click', event => {
  if (ignoreClick && event.detail > 0) {
    ignoreClick = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}, true);
$('.screen').addEventListener('click',event=>{
  if (!event.target.closest('.hotspot')) {
    setPlaying(false);
    hint(capturedPhone ? '点击搜索、餐厅卡片或 Order。推荐结果支持左右滑动。' : '点击页面按钮或左右滑动查看。');
  }
});
$('.retry').addEventListener('click',()=>{
  if (!ready) loadManifest();
  else show($('.load-error').dataset.retry || frames[current]?.id || steps()[0].id, true, false, $('.load-error').dataset.runSearch === 'true');
});
document.addEventListener('keydown',event=>{
  if (flowDialog?.open) return;
  if (event.key === 'Escape' && phone && expanded && !zoomed) parent.postMessage({type:'portfolio-close-phone'}, location.origin);
  if (event.altKey || event.ctrlKey || event.metaKey || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
  if (event.key==='ArrowRight') {event.preventDefault();next();}
  if (event.key==='ArrowLeft') {event.preventDefault();previous();}
  if (event.key==='Escape' && zoomed) $('.zoom-toggle').click();
});
document.addEventListener('visibilitychange',schedule);
window.addEventListener('message',event=>{
  if (event.origin!==location.origin || event.source!==parent) return;
  if (event.data?.type==='portfolio-visibility') {parentVisible=event.data.visible===true;schedule();}
  if (event.data?.type==='portfolio-show-frame' && ready && frames.some(f=>f.id===event.data.frame)) {
    selectFrame(event.data.frame, true);
  }
  if (device && event.data?.type==='portfolio-device-action') {
    if (event.data.action==='next') next();
    if (event.data.action==='previous') previous();
  }
});
new ResizeObserver(fit).observe(viewport);
new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;schedule();},{threshold:.1}).observe($('.viewer'));
reduced.addEventListener('change',event=>{if(event.matches)setPlaying(false);});
window.addEventListener('hashchange',()=>{if(ready && location.hash.slice(1)!==frames[current]?.id)show(location.hash.slice(1));});
if (phone) {
  document.body.classList.add('phone-player');
  document.body.classList.toggle('expanded', expanded);
  flowDialog = document.createElement('dialog');
  flowDialog.className = 'flow-dialog';
  flowDialog.id = 'flow-dialog';
  flowDialog.setAttribute('aria-labelledby', 'flow-title');
  const heading = document.createElement('div');
  heading.className = 'flow-dialog-heading';
  const title = document.createElement('h2');
  title.id = 'flow-title'; title.textContent = '场景与页面';
  const close = makeButton('×', () => flowDialog.close(), 'flow-close');
  close.setAttribute('aria-label', '关闭场景选择');
  heading.append(title, close);
  flowDialog.append(heading, $('.viewer-tools'), $('.review-side'));
  document.body.append(flowDialog);
  const choose = makeButton('场景', () => {setPlaying(false);flowDialog.showModal();choose.setAttribute('aria-expanded','true');}, 'flow-toggle');
  choose.setAttribute('aria-haspopup', 'dialog');
  choose.setAttribute('aria-controls', 'flow-dialog');
  choose.setAttribute('aria-expanded', 'false');
  choose.disabled = true;
  $('.viewer-footer').insertBefore(choose, $('.autoplay'));
  flowDialog.addEventListener('close', () => choose.setAttribute('aria-expanded','false'));
  flowDialog.addEventListener('click', event => {
    if (event.target !== flowDialog) return;
    const box = flowDialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) flowDialog.close();
  });
  $('.expand').textContent = '展开 ↗';
  $('.expand').addEventListener('click', event => {
    if (embed && parent !== window) {
      event.preventDefault();setPlaying(false);parent.postMessage({type:'portfolio-open-phone',frame:frames[current]?.id || ''}, location.origin);
    }
  });
}
async function loadManifest() {
  $('.load-error').hidden = true;
  $('.image-loading').hidden = false;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch('screens.json?v=devices3', {signal: controller.signal});
    if (!response.ok) throw Error('screens');
    const data = await response.json();
    frames = data.frames;
    flows = data.flows;
    if (!frames.length || !flows.length) throw Error('empty');
    $('.flow-selector').replaceChildren(...flows.map((f, i) => makeButton(f.title, () => {
      flow = i;
      guided = true;
      renderFlow();
      show(steps()[0].id, true, true);
    })));
    const catalog = $('.screen-nav');
    catalog.replaceChildren();
    for (const group of new Set(frames.map(f => f.group))) {
      const heading = document.createElement('h2');
      heading.textContent = group;
      catalog.append(heading);
      for (const f of frames.filter(f => f.group === group)) {
        const button = makeButton(f.title, () => {
          guided = false;
          show(f.id, true, true);
        });
        button.dataset.screen = f.id;
        catalog.append(button);
      }
    }
    $('.catalog-count').textContent = frames.length + ' 页';
    const requested = location.hash.slice(1);
    const start = frames.some(f => f.id === requested) ? requested : data.default;
    const matching = flows.findIndex(f => f.steps.some(s => s.id === start));
    if (matching >= 0) flow = matching;
    renderFlow();
    ready = true;
    if (phone && !device) {
      const shortcuts = document.createElement('nav');
      shortcuts.className = 'phone-shortcuts';
      shortcuts.setAttribute('aria-label', '常用场景');
      for (const [id, label] of data.shortcuts) {
        const button = makeButton(label, () => selectFrame(id));
        button.dataset.shortcut = id;
        shortcuts.append(button);
      }
      $('.viewer').prepend(shortcuts);
    }
    const initialLoad = loadId + 1;
    await show(start, false);
    if (loadId === initialLoad && !failed && !reduced.matches && !device && !capturedPhone) setPlaying(true);
  } catch {
    ready = false;
    failed = true;
    setPlaying(false);
    $('.load-error').hidden = false;
    $('.image-loading').hidden = true;
  } finally {
    clearTimeout(timeout);
  }
}
loadManifest();
