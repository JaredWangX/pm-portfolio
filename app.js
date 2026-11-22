'use strict';

// Deep links land immediately; smooth scrolling only starts after initial layout.
addEventListener('load', () => {
  const target = document.querySelector(':target');
  if (target) target.scrollIntoView({behavior:'instant', block:'start'});
  requestAnimationFrame(() => document.documentElement.classList.add('smooth-scroll'));
}, {once:true});

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

document.querySelectorAll('.faithful-switcher').forEach(root => {
  const choose = project => {
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

document.querySelectorAll('[data-note]').forEach(button => button.addEventListener('click', () => {
  const title = button.querySelector('strong').textContent;
  openDialog(button, title, document.getElementById('note-' + button.dataset.note).content.cloneNode(true));
}));

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
    homeLinks.forEach(link => link === current ? link.setAttribute('aria-current','location') : link.removeAttribute('aria-current'));
  }
  addEventListener('scroll', () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {updateSection(); queued = false;});
  }, {passive:true});
  updateSection();
}
