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
  let panel = panels[0], frame = 0, paused = reduced.matches, visible = false, timer;
  function schedule() {
    clearTimeout(timer);
    const focused = document.activeElement;
    if (paused || !visible || document.hidden || overlay.open || (root.contains(focused) && !focused.hasAttribute('data-play'))) return;
    timer = setTimeout(() => {
      frame = (frame + 1) % panel.querySelectorAll('[data-scene]').length;
      render();
    }, 8500);
  }
  function render() {
    panels.forEach(el => { el.hidden = el !== panel; });
    switches.forEach(el => el.setAttribute('aria-pressed', String(el.dataset.project === panel.dataset.demo)));
    panel.querySelectorAll('[data-scene]').forEach((el, i) => { el.hidden = i !== frame; });
    panel.querySelectorAll('[data-step]').forEach((el, i) => el.setAttribute('aria-pressed', String(i === frame)));
    const play = panel.querySelector('[data-play]');
    play.setAttribute('aria-label', paused ? '播放演示' : '暂停演示');
    play.title = play.getAttribute('aria-label');
    play.firstElementChild.textContent = paused ? '▶' : 'Ⅱ';
    schedule();
  }
  root.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.hasAttribute('data-project')) {
      panel = panels.find(el => el.dataset.demo === button.dataset.project);
      frame = 0;
      paused = true;
    } else if (button.hasAttribute('data-step')) {
      frame = Number(button.dataset.step);
      paused = true;
    } else if (button.hasAttribute('data-next')) {
      frame = (frame + 1) % panel.querySelectorAll('[data-scene]').length;
      paused = true;
      panel.querySelector('[data-step="' + frame + '"]').focus({preventScroll: true});
    } else if (button.hasAttribute('data-play')) {
      paused = !paused;
    } else if (button.hasAttribute('data-image')) {
      paused = true;
    } else return;
    render();
  });
  root.addEventListener('focusin', () => clearTimeout(timer));
  root.addEventListener('focusout', () => requestAnimationFrame(schedule));
  document.addEventListener('visibilitychange', schedule);
  overlay.addEventListener('close', schedule);
  reduced.addEventListener('change', e => { if (e.matches) { paused = true; render(); } });
  const observer = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    schedule();
  }, {threshold: .48});
  observer.observe(root);
  if (panels.length > 1 && matchMedia('(min-width: 761px)').matches) panel = panels.find(el => el.dataset.demo === 'onentra');
  render();
}
document.querySelectorAll('[data-player]').forEach(attachPlayer);

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
