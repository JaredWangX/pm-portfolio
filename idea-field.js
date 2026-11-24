/* Slow optical ribbons, confined to the opening viewport. */
(() => {
  const canvas = document.querySelector('#idea-field');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const ambient = canvas.closest('.portfolio-ambient');
  let visible = true, width = 1, height = 1, frame = 0, last = 0, time = 0;
  const running = () => visible && !document.hidden && !reduced.matches && !document.body.classList.contains('ambient-paused');
  function resize() {
    const w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight);
    if (width === w && height === h) return;
    width = w; height = h;
    const dpr = Math.min(devicePixelRatio || 1, width < 760 ? 1 : 1.25);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }
  function curve(i) {
    const phase = time * .16;
    return [
      [-.16 * width, height * (.62 + i * .032)],
      [width * (.30 + Math.sin(phase + i * .13) * .045), height * (1.02 + i * .022)],
      [width * (.55 + Math.cos(phase * .8) * .035), height * (-.20 + i * .022)],
      [width * 1.16, height * (.20 + i * .052)]
    ];
  }
  function trace(p) {
    ctx.moveTo(...p[0]); ctx.bezierCurveTo(...p[1], ...p[2], ...p[3]);
  }
  function draw() {
    ctx.clearRect(0, 0, width, height);
    // Shared control points keep the ribbons connected as the field slowly bends.
    for (let i = 0; i < 6; i++) {
      const p = curve(i), band = height * (.026 + i * .004);
      const fill = ctx.createLinearGradient(width * .1, height * .75, width, height * .12);
      fill.addColorStop(0, 'rgba(120,190,255,0)');
      fill.addColorStop(.36, `rgba(79,150,247,${.05 + i * .009})`);
      fill.addColorStop(.72, `rgba(66,143,244,${.10 + i * .015})`);
      fill.addColorStop(1, 'rgba(190,231,255,.02)');
      ctx.beginPath(); trace(p);
      ctx.lineTo(p[3][0],p[3][1]+band);
      ctx.bezierCurveTo(p[2][0],p[2][1]+band,p[1][0],p[1][1]+band,p[0][0],p[0][1]+band);
      ctx.closePath();ctx.fillStyle=fill;ctx.fill();
      const edge=ctx.createLinearGradient(0,0,width,0);
      edge.addColorStop(0,'rgba(255,255,255,0)');
      edge.addColorStop(.45,'rgba(255,255,255,.8)');
      edge.addColorStop(.72,'rgba(84,158,248,.3)');
      edge.addColorStop(1,'rgba(255,255,255,0)');
      ctx.beginPath();trace(p);ctx.strokeStyle=edge;ctx.lineWidth=i%2 ? 1 : 1.4;ctx.stroke();
      if (i % 2) {
        const progress=(time * .025 + i * .21) % 1, u=1-progress;
        const x=u*u*u*p[0][0]+3*u*u*progress*p[1][0]+3*u*progress*progress*p[2][0]+progress**3*p[3][0];
        const y=u*u*u*p[0][1]+3*u*u*progress*p[1][1]+3*u*progress*progress*p[2][1]+progress**3*p[3][1];
        const alpha=Math.sin(Math.PI*progress)*.62;
        const glow=ctx.createRadialGradient(x,y,0,x,y,18);
        glow.addColorStop(0,`rgba(255,255,255,${alpha})`);glow.addColorStop(.2,`rgba(72,150,255,${alpha*.6})`);glow.addColorStop(1,'rgba(72,150,255,0)');
        ctx.fillStyle=glow;ctx.fillRect(x-18,y-18,36,36);
      }
    }
  }
  function tick(now) {
    frame=0;
    if (!running()) return;
    if (now-last >= (width<760 ? 50 : 33)) {
      time+=Math.min((now-last)/1000,.08);last=now;draw();
    }
    frame=requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(frame);frame=0;last=performance.now();
    ambient.classList.toggle('ambient-idle',!running());
    if (running()) frame=requestAnimationFrame(tick);
  }
  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync();}).observe(ambient);
  document.addEventListener('visibilitychange',sync);
  addEventListener('portfolio-ambient',sync);
  reduced.addEventListener('change',()=>{draw();sync();});
  addEventListener('pagehide',()=>{cancelAnimationFrame(frame);frame=0;});
  addEventListener('pageshow',sync);
  resize();sync();
})();
