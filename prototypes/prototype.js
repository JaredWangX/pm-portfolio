'use strict';
const $ = s => document.querySelector(s);
const embed = new URLSearchParams(location.search).has('embed');
document.body.classList.toggle('embed', embed);
let frames = [], tour = [], current = 0, playing = false, zoomed = false, timer, visible = true;
const screen = $('.screen'), viewport = $('.viewport'), picture = $('.original-screen');
function fit() {
  const f = frames[current];
  if (!f) return;
  const width = viewport.clientWidth - (embed ? 16 : 28);
  const height = viewport.clientHeight - (embed ? 16 : 28);
  const nativeWidth = document.body.dataset.product === 'wanso' ? 402 : 1440;
  const scale = zoomed ? nativeWidth / f.width : Math.min(width / f.width, height / f.height, nativeWidth / f.width);
  screen.style.width = Math.max(1, Math.round(f.width * scale)) + 'px';
  screen.style.height = Math.max(1, Math.round(f.height * scale)) + 'px';
}
function schedule() {
  clearTimeout(timer);
  if (playing && visible && !document.hidden) timer = setTimeout(() => {
    const next = tour[(tour.indexOf(frames[current].id) + 1) % tour.length];
    show(frames.findIndex(f => f.id === next), false);
  }, 12000);
}
function setPlaying(value) {
  playing = value;
  $('.autoplay').setAttribute('aria-pressed', String(value));
  $('.autoplay').textContent = value ? '暂停演示' : '自动演示';
  schedule();
}
function show(index, manual = true) {
  current = Math.max(0, Math.min(frames.length - 1, index));
  if (manual) setPlaying(false);
  const f = frames[current];
  picture.src = f.src;
  picture.alt = `${document.body.dataset.product.toUpperCase()} · ${f.title} · 原版完整页面`;
  $('.page-title').textContent = f.title;
  $('.page-counter').textContent = `${current + 1} / ${frames.length}`;
  $('.page-description').textContent = f.note;
  $('.previous').disabled = current === 0;
  $('.next').disabled = current === frames.length - 1;
  for (const b of document.querySelectorAll('[data-screen]')) {
    if (b.dataset.screen === f.id) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  }
  const hits = f.hotspots.map(h => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'hotspot'; b.setAttribute('aria-label', h.label);
    Object.assign(b.style, {left:h.x+'%',top:h.y+'%',width:h.w+'%',height:h.h+'%'});
    b.addEventListener('click', () => show(frames.findIndex(item => item.id === h.target)));
    return b;
  });
  $('.hotspots').replaceChildren(...hits);
  fit();
  history.replaceState(null, '', '#' + f.id);
  if (current + 1 < frames.length) {const next = new Image(); next.src = frames[current + 1].src;}
  schedule();
}
$('.previous').addEventListener('click', () => show(current - 1));
$('.next').addEventListener('click', () => show(current + 1));
$('.autoplay').addEventListener('click', () => setPlaying(!playing));
$('.hotspot-toggle').addEventListener('click', e => {
  const on = document.body.classList.toggle('show-hotspots');
  e.currentTarget.setAttribute('aria-pressed', String(on));
  e.currentTarget.textContent = on ? '隐藏热点' : '显示热点';
});
$('.zoom-toggle').addEventListener('click', e => {
  zoomed = !zoomed; document.body.classList.toggle('zoomed', zoomed);
  e.currentTarget.textContent = zoomed ? '适应画面' : '放大查看';
  e.currentTarget.setAttribute('aria-pressed', String(zoomed));
  setPlaying(false); fit();
});
document.addEventListener('keydown', e => {
  if (e.altKey || e.metaKey || e.ctrlKey) return;
  if (e.key === 'ArrowRight') {e.preventDefault(); show(current + 1);}
  if (e.key === 'ArrowLeft') {e.preventDefault(); show(current - 1);}
});
document.addEventListener('visibilitychange', schedule);
new ResizeObserver(fit).observe(viewport);
new IntersectionObserver(([entry]) => {visible = entry.isIntersecting; schedule();}, {threshold:.2}).observe($('.viewer'));
window.addEventListener('hashchange', () => {
  const index = frames.findIndex(f => f.id === location.hash.slice(1));
  if (index >= 0 && index !== current) show(index);
});
fetch('screens.json').then(r => {if (!r.ok) throw new Error('screens'); return r.json();}).then(data => {
  frames = data.frames;
  tour = data.tour || frames.map(f => f.id);
  let group;
  frames.forEach((f, i) => {
    if (f.group !== group) {group = f.group; const h = document.createElement('h2'); h.textContent = group; $('.screen-nav').append(h);}
    const b = document.createElement('button'); b.type = 'button'; b.dataset.screen = f.id;
    const number = document.createElement('span'); number.textContent = String(i+1).padStart(2,'0');
    b.append(number, document.createTextNode(f.title)); b.addEventListener('click', () => show(i)); $('.screen-nav').append(b);
  });
  const start = frames.findIndex(f => f.id === (location.hash.slice(1) || data.default));
  show(Math.max(0,start), false);
  if (embed && !matchMedia('(prefers-reduced-motion: reduce)').matches) setPlaying(true);
}).catch(() => {$('.load-error').hidden = false;});
