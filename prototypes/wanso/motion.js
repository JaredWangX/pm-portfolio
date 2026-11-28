'use strict';

// Motion decorates an already-complete interaction; it never owns navigation or state.
window.wansoMotion = (() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const active = new Map();
  const pageTargets = new Set();
  const pressable = '.sheet-button,.sheet-close,.ios-home-clear,.ios-home-search-submit,.ios-home-refresh,.ios-send,.native-store-toolbar button,.native-choice-chip,.native-city-row,.native-collection-row,.wanso-settings-row';
  let pointer;

  function stop(target) {
    const record = active.get(target);
    if (!record) return;
    active.delete(target);
    record.context?.revert();
    target.classList.remove('wanso-motion-active');
  }
  function run(target, from, to) {
    if (!target?.isConnected || reduced.matches || !window.gsap || document.hidden) return;
    stop(target);
    const record = {context: null};
    active.set(target, record);
    target.classList.add('wanso-motion-active');
    record.context = window.gsap.context(() => {
      window.gsap.fromTo(target, from, {
        duration: .24, ease: 'power3.out', overwrite: 'auto', ...to,
        onComplete: () => { if (active.get(target) === record) stop(target); }
      });
    });
  }
  function cancelPage() {
    pageTargets.forEach(stop);
    pageTargets.clear();
  }
  function enterPage(layer, {direction = 'initial'} = {}) {
    cancelPage();
    // Keep the opaque page background, phone chrome and glass navigation still.
    // Moving the scroller itself would briefly reveal the archived screenshot below it.
    const content = layer?.querySelector(':scope > .ios-data-page, :scope > .ios-chat, :scope > .phone-scroll');
    if (!content) return;
    const bounds = content.getBoundingClientRect();
    const targets = [...content.children].filter(child => {
      const rect = child.getBoundingClientRect();
      return rect.width && rect.height && rect.bottom > bounds.top && rect.top < bounds.bottom;
    }).slice(0, 4);
    const x = direction === 'back' || direction === 'tab-back' ? -8 : direction === 'forward' || direction === 'tab-forward' ? 8 : 0;
    targets.forEach(target => {
      pageTargets.add(target);
      run(target, {x, y: x ? 0 : 5, opacity: .94}, {x: 0, y: 0, opacity: 1, duration: .22});
    });
  }
  function sheet(surface) {
    // Native <dialog> opening/closing is handled by CSS discrete transitions.
    if (!surface || surface.tagName === 'DIALOG') return;
    const detail = surface.classList.contains('native-store-view');
    run(surface, {x: detail ? 18 : 0, y: detail ? 0 : 12, opacity: .9}, {x: 0, y: 0, opacity: 1, duration: .28});
  }
  function feedback(target, type = 'press') {
    // Completion feedback may arrive before an async button is enabled in finally.
    const confirmed = type === 'success' || type === 'saved';
    if (!target || (target.disabled && !confirmed) || target.closest('.phone-nav')) return;
    const icon = type === 'saved' ? target.querySelector('svg') || target : target;
    run(icon, {scale: type === 'saved' ? .74 : .96}, {
      scale: 1, duration: type === 'saved' ? .42 : .22,
      ease: type === 'saved' ? 'back.out(2.6)' : 'power2.out'
    });
  }
  function settleAll() {
    for (const target of [...active.keys()]) stop(target);
    pageTargets.clear();
    pointer = null;
  }
  document.addEventListener('pointerdown', event => {
    // A finger always takes priority over a still-running entrance.
    for (const target of [...active.keys()]) if (target.contains(event.target)) stop(target);
    const target = event.target.closest?.(pressable);
    pointer = event.isPrimary && event.button === 0 && target && !target.disabled
      ? {id: event.pointerId, target, x: event.clientX, y: event.clientY} : null;
  }, {capture: true, passive: true});
  document.addEventListener('pointerup', event => {
    const press = pointer;
    pointer = null;
    if (press?.id === event.pointerId && press.target.contains(event.target) && Math.hypot(event.clientX - press.x, event.clientY - press.y) < 8) feedback(press.target);
  }, {capture: true, passive: true});
  document.addEventListener('pointercancel', () => {pointer = null;}, {passive: true});
  document.addEventListener('click', event => {
    if (event.detail === 0) feedback(event.target.closest?.(pressable));
  }, {capture: true});
  document.addEventListener('visibilitychange', () => {if (document.hidden) settleAll();});
  window.addEventListener('pagehide', settleAll);
  reduced.addEventListener('change', () => {if (reduced.matches) settleAll();});
  return {enterPage, cancelPage, sheet, feedback, stop};
})();
