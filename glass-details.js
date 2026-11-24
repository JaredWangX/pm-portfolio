/* One active reflection: no perpetual loop, card tilt, or scroll-triggered reveal. */
(() => {
  const selectors = '.intro-note,.device-project,.project-summary,.decision-project,.strengths article,.practice-card,.education,.honor-grid article,.contact-card,.role-panel,.study-flow>li,.screen-board,.desktop-stage,.resource-grid>article,.workspace-map,.satisfaction,.test-results>div,.product-film,.product-entry,.reader-cover-insight,.reader-contents,.prd-decision,.prd-flow,.decision-example';
  const cards = [...document.querySelectorAll(selectors)];
  const motion = matchMedia('(hover:hover) and (pointer:fine) and (prefers-reduced-motion:no-preference)');
  let active, bounds, frame = 0, point;
  cards.forEach(card => {
    card.classList.add('glass-surface');
    // Nested screens use the outside frame's reflection, never two overlapping layers.
    if (card.parentElement.closest(selectors)) return;
    card.dataset.reflection = '';
    const light = document.createElement('span');
    light.className = 'surface-reflection';
    light.setAttribute('aria-hidden', 'true');
    light.innerHTML = '<span class="surface-sheen"></span><span class="surface-edge"></span>';
    card.append(light);
  });
  function clear() {
    if (active) active.classList.remove('is-reflecting');
    active = bounds = null;
    cancelAnimationFrame(frame); frame = 0;
  }
  function paint() {
    frame = 0;
    if (!active || !bounds) return;
    const x = Math.max(0, Math.min(bounds.width, point.x - bounds.left));
    const y = Math.max(0, Math.min(1, (point.y - bounds.top) / bounds.height));
    active.querySelector('.surface-sheen').style.transform = `translateX(${x}px) skewX(${-20 + y * 8}deg)`;
    active.querySelector('.surface-edge').style.transform = `translateX(${x}px)`;
  }
  document.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || !motion.matches || document.querySelector('dialog[open]')) { clear(); return; }
    const card = event.target.closest('[data-reflection]');
    if (card !== active) {
      clear();
      if (!card) return;
      bounds = card.getBoundingClientRect(); active = card;
      active.classList.add('is-reflecting');
    }
    if (!active) return;
    point = {x:event.clientX, y:event.clientY};
    if (!frame) frame = requestAnimationFrame(paint);
  }, {passive:true});
  // Scrolling, opening a dialog or moving into an embedded product ends the effect.
  document.addEventListener('pointerover', e => { if (e.target.matches('iframe')) clear(); }, {passive:true});
  document.documentElement.addEventListener('pointerleave', clear);
  addEventListener('scroll', clear, {passive:true, capture:true});
  addEventListener('resize', clear, {passive:true});
  addEventListener('blur', clear);
  addEventListener('pagehide', clear);
  document.addEventListener('visibilitychange', clear);
  motion.addEventListener('change', clear);
})();
