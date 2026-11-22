'use strict';

const menu = document.querySelector('.menu');
const mobileNav = document.querySelector('#mobile-nav');
function setMenu(open) {
  mobileNav.hidden = !open;
  menu.setAttribute('aria-expanded', String(open));
  menu.setAttribute('aria-label', open ? '关闭导航' : '打开导航');
}
menu.addEventListener('click', () => setMenu(mobileNav.hidden));
mobileNav.addEventListener('click', () => setMenu(false));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !mobileNav.hidden) {
    setMenu(false);
    menu.focus();
  }
});

const overlay = document.querySelector('#overlay');
const content = overlay.querySelector('.modal-content');
let opener;
function openDialog(trigger, title, child) {
  opener = trigger;
  overlay.querySelector('#dialog-title').textContent = title;
  content.replaceChildren(child);
  overlay.showModal();
  overlay.querySelector('.close').focus();
}
document.querySelector('[data-launch]')?.addEventListener('click', event => {
  const frame = document.createElement('iframe');
  frame.src = 'https://jaredwangx.github.io/ai-work-platform/#home';
  frame.title = 'ONENTRA 公开工作台';
  frame.referrerPolicy = 'no-referrer';
  overlay.classList.add('workspace-modal');
  openDialog(event.currentTarget, 'ONENTRA 在线工作台', frame);
});
document.addEventListener('click', event => {
  const trigger = event.target.closest('[data-image],[data-quick]');
  if (!trigger) return;
  if (trigger.dataset.image) {
    const picture = new Image();
    picture.alt = trigger.dataset.title;
    picture.src = trigger.dataset.image;
    picture.addEventListener('load', () => {
      if (picture.naturalWidth / picture.naturalHeight > 1.4) picture.classList.add('wide-evidence');
    });
    openDialog(trigger, trigger.dataset.title, picture);
  } else {
    const key = trigger.dataset.quick;
    openDialog(trigger, key === 'wanso' ? 'Wanso 万象外卖' : 'ONENTRA 工作平台',
      document.getElementById('quick-' + key).content.cloneNode(true));
  }
});
overlay.querySelector('.close').addEventListener('click', () => overlay.close());
overlay.addEventListener('click', event => {
  if (event.target !== overlay) return;
  const rect = overlay.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) overlay.close();
});
overlay.addEventListener('close', () => {
  content.replaceChildren();
  overlay.classList.remove('workspace-modal');
  opener?.focus({preventScroll: true});
});

const reduced = matchMedia('(prefers-reduced-motion: reduce)');
function attachPlayer(root) {
  const panels = [...root.querySelectorAll('[data-demo]')];
  const switches = [...root.querySelectorAll('[data-project]')];
  const phone = root.querySelector('.native-phone');
  const video = root.querySelector('video[data-reel]');
  let panel = panels[0], frame = 0, paused = reduced.matches, visible = false, timer;
  let failedVideo = false;
  if (phone) phone.tabIndex = 0;
  const scenes = () => panel.querySelectorAll('[data-scene]');
  function canPlay() {
    const focused = document.activeElement;
    return !paused && visible && !document.hidden && !overlay.open &&
      (!root.contains(focused) || focused.hasAttribute('data-play'));
  }
  function advance() {
    if (!canPlay()) return;
    frame = (frame + 1) % scenes().length;
    render();
  }
  function schedule() {
    clearTimeout(timer);
    const onVideo = video && panel.dataset.demo === 'wanso' && frame === 0;
    if (video && (!onVideo || !canPlay())) video.pause();
    if (!onVideo && video && video.currentTime) {
      video.currentTime = 0;
      video.classList.remove('ready');
    }
    if (!canPlay() || scenes().length <= 1) return;
    if (onVideo && !failedVideo) {
      if (!video.getAttribute('src')) video.src = video.dataset.reel;
      video.play().catch(error => {
        if (error.name !== 'AbortError') {
          failedVideo = true;
          schedule();
        }
      });
      return;
    }
    timer = setTimeout(advance, 8500);
  }
  function render() {
    panels.forEach(el => { el.hidden = el !== panel; });
    switches.forEach(el => el.setAttribute('aria-pressed', String(el.dataset.project === panel.dataset.demo)));
    scenes().forEach((el, i) => { el.hidden = i !== frame; });
    panel.querySelectorAll('[data-caption]').forEach((el,i) => {el.hidden = i !== frame;});
    panel.querySelectorAll('[data-step]').forEach((el, i) => el.setAttribute('aria-pressed', String(i === frame)));
    if (phone) phone.classList.toggle('can-swipe', panel.dataset.demo === 'wanso' && frame < 2);
    const play = panel.querySelector('[data-play]');
    if (play) {
      play.setAttribute('aria-label', paused ? '播放演示' : '暂停演示');
      play.title = play.getAttribute('aria-label');
      play.firstElementChild.textContent = paused ? '▶' : 'Ⅱ';
    }
    schedule();
  }
  function choose(i) {
    frame = i;
    paused = true;
    render();
  }
  if (video) {
    video.addEventListener('playing', () => video.classList.add('ready'));
    video.addEventListener('ended', advance);
    video.addEventListener('error', () => {failedVideo = true;video.classList.remove('ready');schedule();});
  }
  root.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.hasAttribute('data-project')) {
      panel = panels.find(el => el.dataset.demo === button.dataset.project);
      frame = 0;
      render();
    } else if (button.hasAttribute('data-step')) {
      choose(Number(button.dataset.step));
    } else if (button.hasAttribute('data-goto')) {
      choose(Number(button.dataset.goto));
      panel.querySelector('[data-step="' + frame + '"]').focus({preventScroll:true});
    } else if (button.hasAttribute('data-play')) {
      paused = !paused;
      render();
    } else if (button.hasAttribute('data-image') || button.hasAttribute('data-launch')) {
      paused = true;
      render();
    }
  });
  if (phone) {
    let startY, lastWheel = 0;
    function scrollToScene(delta) {
      if ((frame === 0 && delta > 28) || (frame === 1 && delta < -28)) {
        choose(delta > 0 ? 1 : 0);
        return true;
      }
      return false;
    }
    phone.addEventListener('pointerdown', e => {startY = e.clientY;});
    phone.addEventListener('pointercancel', () => {startY = undefined;});
    phone.addEventListener('pointerup', e => {
      if (startY !== undefined) scrollToScene(startY-e.clientY);
      startY = undefined;
    });
    phone.addEventListener('wheel', e => {
      if (performance.now()-lastWheel < 550) return;
      if (scrollToScene(e.deltaY)) {e.preventDefault();lastWheel=performance.now();}
    },{passive:false});
    phone.addEventListener('keydown',e=>{
      if ((e.key==='ArrowDown' || e.key==='ArrowUp') && scrollToScene(e.key==='ArrowDown' ? 60 : -60)) e.preventDefault();
    });
  }
  root.addEventListener('focusin', schedule);
  root.addEventListener('focusout', () => requestAnimationFrame(schedule));
  document.addEventListener('visibilitychange', schedule);
  new MutationObserver(schedule).observe(overlay, {attributes:true,attributeFilter:['open']});
  reduced.addEventListener('change', e => { if (e.matches) {paused = true;render();} });
  new IntersectionObserver(([entry]) => {visible = entry.isIntersecting;schedule();}, {threshold:.35}).observe(root);
  if (panels.length > 1 && matchMedia('(min-width: 761px)').matches) panel = panels.find(el => el.dataset.demo === 'onentra');
  render();
}
document.querySelectorAll('[data-player]').forEach(attachPlayer);

document.querySelectorAll('.faithful-switcher').forEach(root => {
  const choose = project => {
    root.querySelectorAll('[data-demo]').forEach(panel => {panel.hidden = panel.dataset.demo !== project;});
    root.querySelectorAll('[data-project]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.project === project)));
  };
  root.querySelectorAll('[data-project]').forEach(button => button.addEventListener('click', () => choose(button.dataset.project)));
  choose(matchMedia('(max-width:760px)').matches ? 'wanso' : 'onentra');
});

const slider = document.getElementById('cost');
if (slider) {
  const format = value => value.toLocaleString('en-US') + ' ₫';
  function compare() {
    const cost = Number(slider.value);
    const shopee = cost + 12000 - Math.min(Math.round(cost * .15), 15000);
    document.getElementById('price').textContent = format(cost);
    document.getElementById('grab').textContent = format(cost);
    document.getElementById('shopee').textContent = format(shopee);
    document.getElementById('verdict').textContent = cost === shopee ? '两家平台到手价相同。' :
      (cost < shopee ? 'GrabFood' : 'ShopeeFood') + ' 便宜 ' + format(Math.abs(cost - shopee)) + '。';
  }
  slider.addEventListener('input', compare);
  compare();
}
const contents = [...document.querySelectorAll('.sidecard nav a')];
if (contents.length) {
  function highlight() {
    let current = contents[0];
    for (const link of contents) {
      if (document.querySelector(link.hash).getBoundingClientRect().top <= 140) current = link;
    }
    for (const link of contents) {
      if (link === current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  }
  let queued = false;
  addEventListener('scroll', () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { highlight(); queued = false; });
  }, {passive: true});
  highlight();
}

document.querySelectorAll('[data-doc]').forEach(button=>button.addEventListener('click',()=>{
  const key=button.dataset.doc;
  openDialog(button,key==='wanso'?'Wanso · 选餐推荐与费用确认':'ONENTRA · 任务上下文与文件交付',document.getElementById('doc-'+key).content.cloneNode(true));
}));
