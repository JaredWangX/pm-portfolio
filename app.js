'use strict';

// Let the browser restore the anchor or the visitor's scroll position.
requestAnimationFrame(() => document.documentElement.classList.add('smooth-scroll'));

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
  if (!overlay.open) overlay.showModal();
  overlay.querySelector('.close').focus();
}
document.querySelector('[data-launch]')?.addEventListener('click', event => {
  const frame = document.createElement('iframe');
  frame.src = 'https://jiaruiwang13.github.io/ai-work-platform/#home';
  frame.title = 'ONENTRA 公开工作台';
  frame.referrerPolicy = 'no-referrer';
  overlay.classList.add('workspace-modal');
  openDialog(event.currentTarget, 'ONENTRA 在线工作台', frame);
});
function openPhone(trigger, frameId = '') {
  const frame = document.createElement('iframe');
  frame.src = new URL('prototypes/wanso/?embed=1&device=1&expanded=1&lang=zh&v=wanso-saved-scale3', document.querySelector('.identity').href).href;
  if (/^[a-z0-9-]{1,40}$/.test(frameId)) frame.src += '#' + frameId;
  frame.title = 'Wanso 中文展示版手机原型';
  frame.referrerPolicy = 'no-referrer';
  frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms');
  const focusTarget = overlay.contains(trigger) ? opener : trigger;
  overlay.classList.remove('workspace-modal');
  overlay.classList.add('phone-modal');
  openDialog(focusTarget, 'Wanso · 手机端原型', frame);
}
document.addEventListener('click', event => {
  const phoneLink = event.target.closest('[data-phone-preview]');
  if (phoneLink && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
    event.preventDefault();openPhone(phoneLink, new URL(phoneLink.href).hash.slice(1));return;
  }
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
  overlay.classList.remove('workspace-modal', 'phone-modal');
  opener?.focus({preventScroll: true});
});

document.querySelectorAll('.faithful-switcher').forEach(root => {
  const choose = project => {
    root.dataset.activeProject = project;
    root.querySelectorAll('[data-demo]').forEach(panel => {
      const active = panel.dataset.demo === project;
      panel.hidden = !active;
      panel.querySelector('iframe')?.contentWindow?.postMessage({type:'portfolio-visibility', visible:active}, location.origin);
    });
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
    const bar = document.querySelector('.study-nav');
    const threshold = bar ? bar.getBoundingClientRect().bottom + 40 : 140;
    for (const link of contents) {
      if (document.querySelector(link.hash).getBoundingClientRect().top <= threshold) current = link;
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

document.querySelectorAll('[data-copy-email]').forEach(button => button.addEventListener('click', async () => {
  const feedback = button.closest('.contact-card').querySelector('.copy-feedback');
  try {
    await navigator.clipboard.writeText('13971032326@163.com');
    feedback.textContent = '邮箱已复制，可以粘贴到你的邮件应用。';
    button.textContent = '已复制 ✓';
    setTimeout(() => {button.textContent = '复制邮箱';}, 2500);
  } catch {
    feedback.textContent = '复制未成功，请长按或选中上方邮箱复制。';
  }
}));

const homeLinks = [...document.querySelectorAll('.home-page .navwrap nav a')];
if (homeLinks.length) {
  let queued = false;
  function updateSection() {
    let current;
    for (const link of homeLinks) {
      if (document.querySelector(link.hash)?.getBoundingClientRect().top <= 160) current = link;
    }
    if (scrollY + innerHeight >= document.documentElement.scrollHeight - 5) current = homeLinks.at(-1);
    homeLinks.forEach(link => {
      if (link === current && !link.hasAttribute('aria-current')) link.setAttribute('aria-current','location');
      else if (link !== current && link.hasAttribute('aria-current')) link.removeAttribute('aria-current');
    });
  }
  addEventListener('scroll', () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {updateSection(); queued = false;});
  }, {passive:true});
  updateSection();
}

// Only the site's own preview frames can open or dismiss the phone dialog.
addEventListener('message', event => {
  if (event.origin !== location.origin) return;
  const frame = [...document.querySelectorAll('.wanso-preview iframe, .phone-modal iframe')]
    .find(item => item.contentWindow === event.source);
  if (!frame) return;
  if (event.data?.type === 'portfolio-phone-focus' && !overlay.contains(frame)) {
    const rect = frame.getBoundingClientRect();
    const top = (document.querySelector('body>header')?.getBoundingClientRect().bottom || 88) + 20;
    if (rect.top < top || rect.bottom > innerHeight - 16) window.scrollBy({top:rect.top-top,behavior:'instant'});
  }
  if (event.data?.type === 'portfolio-open-phone') openPhone(frame, event.data.frame);
  if (event.data?.type === 'portfolio-close-phone' && overlay.contains(frame)) overlay.close();
});

// Keep the phone controls synchronized with its current page.
const deviceFrames = [...document.querySelectorAll('[data-device-frame]')];
document.querySelectorAll('[data-device-target]').forEach(button => button.addEventListener('click', () => {
  const frame = deviceFrames.find(frame => frame.dataset.deviceFrame === button.dataset.deviceTarget);
  frame?.contentWindow?.postMessage({type:'portfolio-show-frame',frame:button.dataset.frame},location.origin);
}));
document.querySelectorAll('[data-device-action]').forEach(button => button.addEventListener('click',()=>{
  button.closest('[data-device-project]').querySelector('iframe').contentWindow.postMessage({type:'portfolio-device-action',action:button.dataset.deviceAction},location.origin);
}));
addEventListener('message', event => {
  if (event.origin !== location.origin) return;
  const frame = deviceFrames.find(frame => frame.contentWindow === event.source);
  if (!frame) return;
  const section = frame.closest('[data-device-project]');
  if (event.data?.type === 'portfolio-manifest-ready') {
    section.querySelectorAll('[data-device-target]').forEach(button => button.disabled = false);
    return;
  }
  if (event.data?.type !== 'portfolio-frame-changed') return;
  const id = event.data.frame;
  section.querySelectorAll('button').forEach(button=>button.disabled=false);
  section.querySelector('[data-device-action="previous"]').disabled = !event.data.canPrevious;

  section.querySelectorAll('[data-frame]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.frame === (event.data.section || id))));

  const description = section.querySelector('[data-device-description]');
  if (description) description.textContent = event.data.description;
  const productLink = section.querySelector('[data-current-product]');
  if (productLink && /^#[a-z0-9/-]+$/.test(event.data.route || '')) productLink.hash = event.data.route;
  const expand = section.querySelector('[data-phone-preview]');
  if (expand) expand.hash = id;
});
const ambientToggle = document.querySelector('[data-ambient-toggle]');
if (ambientToggle) {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  function setAmbient(playing) {
    playing = playing && !reducedMotion.matches && finePointer.matches;
    ambientToggle.disabled = reducedMotion.matches || !finePointer.matches;
    document.body.classList.toggle('ambient-paused',!playing);
    ambientToggle.setAttribute('aria-pressed',String(playing));
    ambientToggle.setAttribute('aria-label',reducedMotion.matches?'已跟随系统关闭背景动效':!finePointer.matches?'触屏设备使用静态背景':playing?'暂停鼠标光影':'开启鼠标光影');
    ambientToggle.innerHTML = '<span class="ambient-toggle-icon" aria-hidden="true">'+(playing?'Ⅱ':'▷')+'</span><span>'+(ambientToggle.disabled?'静态背景':'鼠标光影')+'</span>';
    ambientToggle.title = ambientToggle.getAttribute('aria-label');
    window.dispatchEvent(new CustomEvent('portfolio-ambient',{detail:{playing}}));
  }
  setAmbient(!reducedMotion.matches);
  ambientToggle.addEventListener('click',()=>setAmbient(ambientToggle.getAttribute('aria-pressed')!=='true'));
  reducedMotion.addEventListener('change',event=>setAmbient(!event.matches));
  finePointer.addEventListener('change',event=>setAmbient(event.matches));
}
