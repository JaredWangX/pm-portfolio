'use strict';
const $ = selector => document.querySelector(selector);
const embed = new URLSearchParams(location.search).has('embed');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
document.body.classList.toggle('embed', embed);
const screen = $('.screen'), viewport = $('.viewport');
const phone = document.body.dataset.product === 'wanso';
const capturedPhone = document.body.dataset.capture === 'ios';
const expanded = new URLSearchParams(location.search).has('expanded');
const device = new URLSearchParams(location.search).has('device');
document.body.classList.toggle('device-embed', device);
const stageHeight = f => f.height;
let flowDialog;
const layer = document.createElement('div');
layer.className = 'page-layer';
screen.append(layer);
layer.append($('.original-screen'), $('.hotspots'));
let activeLayer = layer;
screen.tabIndex = -1;
const duration = 10000;
let frames = [], flows = [], flow = 0, current = -1, playing = false, zoomed = false, guided = true;
let visible = true, parentVisible = true, loading = false, loadId = 0, ready = false, failed = false;
let tick = 0, hintTimer = 0, elapsed = 0, previousTime = 0;
const cached = new Map();
const screenHistory = [];
const phoneTabs = new Set(['home', 'explore', 'saved', 'profile']);
const tabViews = new Map();
let phoneTab = 'home', chatNodes;
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
    const entry = Promise.all([f.src, !f.livePage && f.scroll?.src].filter(Boolean).map(src => new Promise((resolve, reject) => {
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
  if (cached.size > 16) {
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
function selectFrame(id, returnToViewer = false, runSearch = false, navigation = 'reset') {
  const tab = navigation === 'tab' ? tabViews.get(id) : null;
  const destination = tab?.view.id || id;
  const matching = flows.findIndex(item => item.steps.some(step => step.id === destination));
  guided = matching >= 0;
  if (guided && matching !== flow) {
    flow = matching;
    renderFlow();
  }
  return show(id, true, returnToViewer, runSearch, navigation);
}
function currentPhoneView() {
  const width = screen.clientWidth || 1;
  const scroll = activeLayer.querySelector('.phone-scroll');
  const carousel = activeLayer.querySelector('.ios-carousel');
  return {id: frames[current]?.id, scroll: scroll?.scrollTop / width || 0, slide: carousel?.scrollLeft / width || 0};
}
function goBack(fallback) {
  const target = screenHistory.at(-1)?.id || fallback;
  if (target) return selectFrame(target, false, false, 'back');
}
function openPhoneAction(hotspot) {
  setPlaying(false);
  window.wansoControls.open(hotspot, frames[current], screen, (id, runSearch = false, navigation = 'forward') =>
    navigation === 'back' ? goBack(id) : selectFrame(id, false, runSearch, navigation));
}
function renderFrame(buildHotspots = true) {
  const f = frames[current], position = stepIndex(), step = activeStep();
  screen.toggleAttribute('data-swipeable', Boolean(f.swipeLeft || f.swipeRight));
  $('.page-title').textContent = f.title;
  $('.page-counter').textContent = position >= 0 ? `${position+1} / ${steps().length}` : `${current+1} / ${frames.length}`;
  $('.step-eyebrow').textContent = position >= 0 ? `${flows[flow].title} · ${String(position+1).padStart(2,'0')}` : '自由浏览 · ' + f.group;
  $('.step-caption').textContent = step?.caption || f.note;
  $('.page-description').textContent = step?.reason || f.note;
  $('.source-page')?.replaceChildren(document.createTextNode(
    capturedPhone ? 'iOS 版布局与界面 · 历史菜单样本' : '公开工作台截图'
  ));
  const liveLink = $('.live-link');
  if (liveLink && !phone && /^#[a-z0-9/-]+$/.test(f.route || '')) liveLink.hash = f.route;
  $('.continue').textContent = position < 0 ? '回到流程 →' : position === steps().length-1 ? '重新体验 ↺' : '继续 →';
  $('.previous').disabled = !(capturedPhone && screenHistory.length) && (position < 0 ? current === 0 : position === 0);
  $('.next').disabled = false;
  for (const b of document.querySelectorAll('[data-screen],[data-step],[data-shortcut]')) {
    const active = b.dataset.shortcut ? b.dataset.shortcut === (f.section || f.id) : (b.dataset.screen || b.dataset.step) === f.id;
    if (active) b.setAttribute('aria-current','step');
    else b.removeAttribute('aria-current');
  }
  const nextId = steps()[(position+1) % steps().length]?.id;
  const hits = f.hotspots.filter(h => !f.livePage || !h.scroll);
  if (activeLayer.classList.contains('ios-store-push')) {
    hits.push(...frames.find(entry => entry.chat).hotspots.filter(h => h.nav));
  }
  for (const h of buildHotspots ? hits : []) {
    const select = () => {
      if (h.notice) {setPlaying(false);hint(h.notice);return;}
      if (h.action) openPhoneAction(h);
      else if (h.back) goBack(h.target);
      else if (h.target) selectFrame(h.target, false, h.runSearch, h.nav && capturedPhone ? 'tab' : h.nav ? 'reset' : h.swap ? 'preserve' : 'forward');
    };
    const b = f.id === 'home' && h.action === 'search'
      ? window.wansoControls.createSearchInput(() => openPhoneAction({action:'runSearch'}))
      : makeButton('', select, 'hotspot');
    b.setAttribute('aria-label',h.label); if(h.target) b.dataset.target = h.target;
    if (h.nav && !h.scroll && h.target === (capturedPhone ? phoneTab : f.id)) b.setAttribute('aria-current', 'page');
    Object.assign(b.style,{left:h.x+'%',top:h.y+'%',width:h.w+'%',height:h.h+'%'});
    if (b.tagName === 'BUTTON') window.wansoControls?.register(b, h, f);
    activeLayer.querySelector(h.scroll ? '.scroll-content .hotspots' : ':scope > .hotspots').append(b);
  }
  if (buildHotspots) window.wansoControls?.paint(activeLayer, f);
  if (buildHotspots) fit();
  if (location.hash !== '#' + f.id) history.replaceState(null, '', '#' + f.id);
  if (embed) parent.postMessage({type:'portfolio-frame-changed',frame:f.id,section:f.section,route:f.route,title:f.title,description:f.note,canPrevious:!$('.previous').disabled,counter:$('.page-counter').textContent},location.origin);
  const upcoming = buildHotspots ? [f.swipeLeft, f.swipeRight, nextId, f.afterSearch] : [];
  for (const id of new Set(upcoming)) {
    const f = frames.find(f=>f.id===id);
    if (f && f.id!==frames[current].id) decoded(f).catch(()=>{});
  }
}
async function show(id, manual = true, returnToViewer = false, runSearch = false, navigation = 'reset') {
  const tab = navigation === 'tab' ? id : null;
  if (tab === phoneTab) return;
  const recalled = tabViews.get(tab);
  if (recalled) id = recalled.view.id;
  const index = frames.findIndex(f => f.id === id);
  if (index < 0) return;
  if (returnToViewer && flowDialog?.open) flowDialog.close();
  const request = ++loadId;
  if (manual) setPlaying(false);
  loading = true; failed = false; schedule();
  $('.viewer').setAttribute('aria-busy','true');
  const loadingNotice = setTimeout(() => {if (request === loadId && loading) $('.image-loading').hidden = false;}, 450);
  $('.load-error').hidden = true;
  try {
    const frame = frames[index];
    const previousFrame = frames[current];
    if (current === index && !tab) {
      renderFrame(false);
      if (runSearch) queueSearchStep(frame, request);
      return;
    }
    if (frame.chat && previousFrame?.chat && !tab) {
      current = index;
      const rail = activeLayer.querySelector('.ios-carousel');
      rail.scrollLeft = frame.chat === 'second' ? rail.scrollWidth : 0;
      renderFrame(false);
      return;
    }
    const [image, scrollImage] = await decoded(frame);
    if (request !== loadId) return;
    const oldView = currentPhoneView();
    let restore = navigation === 'back' ? screenHistory.pop() : null;
    if (navigation === 'forward' && current >= 0) {
      screenHistory.push(oldView);
    } else if (tab) {
      tabViews.set(phoneTab, {view: oldView, stack: [...screenHistory]});
      phoneTab = tab;
      screenHistory.splice(0, screenHistory.length, ...(recalled?.stack || []));
      restore = recalled?.view;
    } else if (navigation === 'reset') {
      screenHistory.length = 0;
      if (phoneTabs.has(frame.id)) phoneTab = frame.id;
    } else if (navigation === 'preserve' && frame.store && frame.store === previousFrame?.store) {
      restore = oldView;
    }
    const restoreFocus = activeLayer.contains(document.activeElement) && document.activeElement.matches(':focus-visible');
    current = index;
    activeLayer = document.createElement('div');
    activeLayer.className = 'page-layer';
    const storeOrigin = frame.store && frames.find(entry => entry.id === screenHistory.at(-1)?.id);
    const pushedStore = storeOrigin && (storeOrigin.chat || storeOrigin.id === 'saved');
    activeLayer.classList.toggle('ios-store-push', Boolean(pushedStore));
    image.className = 'original-screen';
    image.draggable = false;
    image.alt = `${document.body.dataset.product.toUpperCase()} · ${frame.title}`;
    activeLayer.append(image);
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
    if (pushedStore || (frame.hotspots.some(h => h.nav) && ['explore', 'saved'].includes(phoneTab) && !phoneTabs.has(frame.id))) {
      const chrome = document.createElement('div');
      chrome.className = 'ios-tab-chrome';
      chrome.style.backgroundImage = `url(${frames.find(entry => entry.id === phoneTab).src})`;
      activeLayer.append(chrome);
    }
    const hotspots = document.createElement('div'); hotspots.className = 'hotspots';
    activeLayer.append(hotspots);
    if (scrollImage) {
      const scroll = document.createElement('div');
      scroll.className = 'phone-scroll';
      scroll.tabIndex = 0;
      scroll.setAttribute('role', 'region');
      scroll.setAttribute('aria-label', frame.title + '，上下滚动查看');
      scroll.style.top = (pushedStore ? 0 : frame.scroll.top) + '%';
      scroll.style.height = (pushedStore ? 90.9 : frame.scroll.height) + '%';
      const content = document.createElement('div');
      content.className = 'scroll-content';
      scrollImage.width = scrollImage.naturalWidth;
      scrollImage.height = scrollImage.naturalHeight;
      scrollImage.draggable = false;
      scrollImage.alt = '';
      const contentHotspots = document.createElement('div');
      contentHotspots.className = 'hotspots';
      content.append(scrollImage, contentHotspots);
      if (frame.id === 'home' && capturedPhone) {
        scroll.classList.add('ios-home-scroll');
        content.append(window.wansoNative.homeRestaurants(target => selectFrame(target, false, false, 'forward')));
      }
      scroll.append(content);
      if (frame.store) window.wansoNative.appendMenu(scroll, frame.store, window.wansoControls.menuLanguage(frame.store));
      activeLayer.append(scroll);
      if (pushedStore) {
        const status = document.createElement('div');
        status.className = 'ios-status-chrome';
        status.style.backgroundImage = `url(${frames.find(entry => entry.id === 'home').src})`;
        activeLayer.append(status);
      } else if (storeOrigin && ['home', 'explore'].includes(storeOrigin.id)) {
        const swipe = document.createElement('div');
        swipe.className = 'ios-sheet-swipe';
        activeLayer.append(swipe);
      }
    }
    if (frame.livePage) {
      window.wansoPages.mount(activeLayer, frame.id,
        (target, runSearch = false, mode = 'forward') => selectFrame(target, false, runSearch, mode),
        (action, value) => openPhoneAction({action, value}));
    }
    if (frame.chat) {
      if (!chatNodes) {
        window.wansoNative.mountChat(activeLayer,
          (target, runSearch = false, mode = 'forward') => selectFrame(target, false, runSearch, mode),
          (action, value) => openPhoneAction({action, value}),
          target => {
            if (loading || !frames[current]?.chat || frames[current].id === target) return;
            current = frames.findIndex(f => f.id === target);
            renderFrame(false);
          });
        chatNodes = Array.from(activeLayer.querySelectorAll('.ios-chat, .ios-composer'));
      } else activeLayer.append(...chatNodes);
    }
    if (capturedPhone && frame.hotspots.some(h => h.back)) {
      const edge = document.createElement('div');
      edge.className = 'ios-back-edge';
      edge.setAttribute('aria-hidden', 'true');
      activeLayer.append(edge);
    }
    // Reuse the decoded image and swap the complete frame on one paint.
    screen.replaceChildren(activeLayer);
    document.querySelectorAll('.viewer-footer button, .viewer-tools button, .phone-shortcuts button, .continue')
      .forEach(b=>b.disabled=false);
    renderFrame();
    const scroll = activeLayer.querySelector('.phone-scroll');
    if (scroll) {
      const width = screen.clientWidth;
      const initialOffset = frame.scroll?.startAt ? frame.scroll.startAt * width / 402 : 0;
      scroll.scrollTop = restore ? restore.scroll * width : initialOffset;
      const rail = activeLayer.querySelector('.ios-carousel');
      if (rail) rail.scrollLeft = restore ? restore.slide * width : frame.chat === 'second' ? rail.scrollWidth : 0;
    }
    if (restoreFocus) screen.focus({preventScroll: true});
    if (returnToViewer && !embed && matchMedia('(max-width:760px)').matches) {
      const viewer = $('.viewer');
      const {top} = viewer.getBoundingClientRect();
      if (top < 0 || top > innerHeight / 4) viewer.scrollIntoView({behavior:'instant',block:'start'});
    }

    elapsed = 0;
    $('.play-progress span').style.transform = 'scaleX(0)';
    if (runSearch) queueSearchStep(frame, request);
  } catch {
    if (request !== loadId) return;
    failed = true;
    setPlaying(false);
    $('.load-error').hidden = false;
    $('.load-error').dataset.retry = id;
    $('.load-error').dataset.runSearch = String(Boolean(runSearch));
    $('.load-error').dataset.navigation = navigation;
    $('.load-error').classList.toggle('over-preview', current >= 0);
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
function queueSearchStep(frame, request) {
  if (!frame.afterSearch) return;
  setTimeout(() => {
    if (request === loadId) selectFrame(frame.afterSearch, false, true, 'preserve');
  }, 1500);
}
function next(manual = true) {
  if (!ready) return;
  if (!guided && manual) {show(frames[(current+1) % frames.length].id);return;}
  const position = stepIndex();
  show(steps()[position < 0 ? 0 : (position+1) % steps().length].id, manual);
}
function previous() {
  if (!ready) return;
  if (capturedPhone && screenHistory.length) {
    goBack();
    return;
  }
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
  const rail = event.target.closest('.ios-carousel');
  const edge = event.target.closest('.ios-back-edge');
  const sheet = event.target.closest('.ios-sheet-swipe');
  const horizontal = rail || !capturedPhone || screen.hasAttribute('data-swipeable');
  const scroller = event.target.closest('.phone-scroll');
  if ((!horizontal && !scroller && !edge && !sheet) || (zoomed && !capturedPhone)) return;
  setPlaying(false);
  if (capturedPhone && event.pointerType === 'touch' && !edge && !sheet && (rail || scroller)) return;
  swipeStart = {
    x: event.clientX, y: event.clientY, id: event.pointerId,
    horizontal, scroller, rail, top: scroller?.scrollTop, left: rail?.scrollLeft, edge, sheet, axis: ''
  };
});
screen.addEventListener('pointermove', event => {
  if (swipeStart?.id !== event.pointerId) return;
  const dx = event.clientX - swipeStart.x, dy = event.clientY - swipeStart.y;
  if (!swipeStart.axis) {
    if (swipeStart.edge && dx > 12 && dx > Math.abs(dy) * 1.4) swipeStart.axis = 'edge';
    else if (swipeStart.sheet && dy > 12 && dy > Math.abs(dx) * 1.4) swipeStart.axis = 'sheet';
    else if (swipeStart.horizontal && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.4) swipeStart.axis = 'x';
    else if (swipeStart.scroller && Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) swipeStart.axis = 'y';
    if (swipeStart.axis && !screen.hasPointerCapture(event.pointerId)) screen.setPointerCapture(event.pointerId);
  }
  if (swipeStart.axis === 'x' && swipeStart.rail) swipeStart.rail.scrollLeft = swipeStart.left - dx;
  if (swipeStart.axis === 'y') swipeStart.scroller.scrollTop = swipeStart.top - dy;
});
screen.addEventListener('pointercancel', () => {swipeStart = null;});
screen.addEventListener('lostpointercapture', event => {
  if (event.target === screen && swipeStart?.id === event.pointerId) swipeStart = null;
});
screen.addEventListener('pointerup', event => {
  if (!swipeStart || swipeStart.id !== event.pointerId) return;
  const dx = event.clientX - swipeStart.x, dy = event.clientY - swipeStart.y;
  const {axis, horizontal, rail} = swipeStart;
  swipeStart = null;
  if ((axis === 'edge' && dx > 58) || (axis === 'sheet' && dy > 58)) {
    goBack(frames[current]?.hotspots.find(h => h.back)?.target);
  }
  const changedCard = !rail && horizontal && axis === 'x' && Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.4;
  if (changedCard) {
    const frame = frames[current];
    const target = dx < 0 ? frame?.swipeLeft : frame?.swipeRight;
    if (target) selectFrame(target, false, false, 'preserve');
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
screen.addEventListener('click', event => {
  if (playing && !event.target.closest('.hotspot')) setPlaying(false);
});
$('.retry').addEventListener('click',()=>{
  if (!ready) loadManifest();
  else {
    const {retry, runSearch, navigation} = $('.load-error').dataset;
    show(retry || frames[current]?.id || steps()[0].id, true, false, runSearch === 'true', navigation);
  }
});
document.addEventListener('keydown',event=>{
  if (flowDialog?.open || window.wansoControls?.isOpen()) return;
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
    const id = event.data.frame;
    selectFrame(id, true, phone && id === 'generating');
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
  const pages = $('.review-side');
  const tools = $('.viewer-tools');
  const wideReview = matchMedia('(min-width: 850px)');
  const placeGuide = () => {
    if (flowDialog.open) flowDialog.close();
    const besidePhone = !embed && wideReview.matches;
    document.body.classList.toggle('wide-phone-review', besidePhone);
    if (besidePhone) {
      pages.append(tools);
      $('.review').append(pages);
    } else flowDialog.append(tools, pages);
  };
  flowDialog.append(heading, tools);
  document.body.append(flowDialog);
  wideReview.addEventListener('change', placeGuide);
  placeGuide();
  const choose = makeButton('全部页面', () => {
    setPlaying(false);
    $('.catalog').open = true;
    if (document.body.classList.contains('wide-phone-review')) {
      $('.catalog summary').focus({preventScroll:true});
      $('.catalog').scrollIntoView({block:'nearest'});
      return;
    }
    flowDialog.showModal();
    choose.setAttribute('aria-expanded','true');
  }, 'flow-toggle');
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
    const response = await fetch(capturedPhone ? 'screens.json?v=home-fit' : 'screens.json?v=prototype5', {signal: controller.signal});
    if (!response.ok) throw Error('screens');
    const data = await response.json();
    if (capturedPhone) await window.wansoNative.load(controller.signal);
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
    if (device) parent.postMessage({type:'portfolio-manifest-ready'}, location.origin);
    if (phone && !device) {
      const shortcuts = document.createElement('nav');
      shortcuts.className = 'phone-shortcuts';
      shortcuts.setAttribute('aria-label', '常用场景');
      for (const [id, label] of data.shortcuts) {
        const button = makeButton(label, () => selectFrame(id, false, id === 'generating'));
        button.dataset.shortcut = id;
        shortcuts.append(button);
      }
      shortcuts.append($('.flow-toggle'));
      $('.viewer').prepend(shortcuts);
    }
    await show(start, false);
    // Warm the four native tabs once; switching no longer waits on a long-image decode.
    if (capturedPhone) {
      const warmTabs = async () => {
        for (const id of ['home','explore','saved','profile','recommend','store-first','store-second']) {
          const frame = frames.find(item => item.id === id);
          if (frame) await decoded(frame).catch(() => {});
        }
      };
      if ('requestIdleCallback' in window) requestIdleCallback(warmTabs, {timeout: 1800});
      else setTimeout(warmTabs, 300);
    }
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
