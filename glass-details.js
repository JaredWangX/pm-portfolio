/* A small magnetic field lives in the empty space; content never moves. */
(() => {
  const selectors = '[data-surface="card"],[data-surface="frame"],[data-surface="inset"]';
  const motion = matchMedia('(hover:hover) and (pointer:fine) and (prefers-reduced-motion:no-preference)');
  const transparency = matchMedia('(prefers-reduced-transparency:reduce)');
  const canvas = document.createElement('canvas');
  canvas.className = 'surface-points'; canvas.setAttribute('aria-hidden','true');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const exclusions = 'h1,h2,h3,h4,h5,p,a,button,summary,dt,dd,img,svg,iframe,video,pre,table,strong,small';
  let active, bounds, needle, pending = null, points = [], masks = [], maskPath, frame = 0, previous = 0, inside = false;
  let pointer = {x:0,y:0}, alpha = 0;
  const resize = new ResizeObserver(() => {
    if (!active) return;
    const box = active.getBoundingClientRect();
    if (Math.abs(box.width-bounds.width)>1 || Math.abs(box.height-bounds.height)>1) clear();
  });
  document.querySelectorAll(selectors).forEach(card => {
    if (card.parentElement.closest(selectors)) return;
    card.classList.add('glass-surface'); card.dataset.playSurface = '';
  });
  document.querySelectorAll('.ability-symbol[data-ability="check"] path,.ability-symbol[data-ability="conversation"] path:last-child').forEach(path => path.setAttribute('pathLength','1'));
  function clear() {
    if (active) {resize.unobserve(active);active.classList.remove('is-playing');}
    needle?.style.removeProperty('--needle-angle');
    cancelAnimationFrame(frame); frame = 0; active = bounds = null;
    canvas.remove(); points = []; masks = []; maskPath = needle = pending = null; alpha = 0;
  }
  function start(card, event) {
    clear();
    bounds = card.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(1000000 / (bounds.width*bounds.height)));
    canvas.width = Math.round(bounds.width*dpr); canvas.height = Math.round(bounds.height*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    // Measure once on entry. Exclude words, controls and product screens from the playground.
    const addMask = r => {if(r.width && r.height) masks.push({x:r.left-bounds.left-6,y:r.top-bounds.top-5,w:r.width+12,h:r.height+10});};
    card.querySelectorAll(exclusions).forEach(e => [...e.getClientRects()].forEach(addMask));
    // Direct labels in lists/spans need protection without masking the whole diagram.
    const text = document.createTreeWalker(card,NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    for(let node=text.nextNode();node;node=text.nextNode()) {
      if(!node.textContent.trim() || node.parentElement.closest(exclusions+', [aria-hidden="true"]')) continue;
      range.selectNodeContents(node); [...range.getClientRects()].forEach(addMask);
    }
    maskPath = new Path2D();
    for(const r of masks) maskPath.rect(r.x,r.y,r.w,r.h);
    const spacing = Math.max(24, Math.sqrt(bounds.width*bounds.height/650));
    const cols = Math.floor((bounds.width-36)/spacing), rows = Math.floor((bounds.height-36)/spacing);
    const ox = (bounds.width-(cols-1)*spacing)/2, oy = (bounds.height-(rows-1)*spacing)/2;
    for (let row=0; row<rows; row++) for (let col=0; col<cols; col++) {
      const x=ox+col*spacing, y=oy+row*spacing;
      if (!masks.some(r => x>r.x && x<r.x+r.w && y>r.y && y<r.y+r.h)) points.push({bx:x,by:y,x,y,vx:0,vy:0});
    }
    active = card; needle = card.querySelector('[data-ability="compass"]');
    card.append(canvas); card.classList.add('is-playing'); inside = true;
    resize.observe(card); move(event);
  }
  function move(event) {
    pointer = {x:event.clientX-bounds.left,y:event.clientY-bounds.top};
    // Only the compass needle rotates; the frame and text keep their position.
    needle?.style.setProperty('--needle-angle',`${((pointer.x/bounds.width-.5)*65).toFixed(2)}deg`);
  }
  function draw() {
    ctx.clearRect(0,0,bounds.width,bounds.height);
    for (const dot of points) {
      const nearby = Math.max(0,1-Math.hypot(dot.x-pointer.x,dot.y-pointer.y)/165);
      ctx.fillStyle = `rgba(45,119,225,${alpha*(.12+nearby*.66)})`;
      ctx.beginPath(); ctx.arc(dot.x,dot.y,1.4+nearby*2,0,Math.PI*2); ctx.fill();
    }
    // The displaced dots also stay outside text, not just their rest positions.
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = '#000'; ctx.fill(maskPath);
    ctx.globalCompositeOperation = 'source-over';
  }
  function tick(now) {
    frame = 0;
    // Coalesce high-frequency input: measure, write and draw at most once per frame.
    if (pending) {
      const event = pending; pending = null;
      if (document.querySelector('dialog[open]')) {clear();return;}
      const card = event.target instanceof Element ? event.target.closest('[data-play-surface]') : null;
      if (!card) leave();
      else if (card !== active) start(card,event);
      else {if(!inside){inside=true;card.classList.add('is-playing');}move(event);}
    }
    if (!active) return;
    const dt = Math.min((now-previous)/16.667,2); previous = now;
    const blend = 1-Math.pow(.82,dt), damping = Math.pow(.74,dt);
    alpha += ((inside?1:0)-alpha)*blend;
    let unsettled = Math.abs((inside?1:0)-alpha)>.004;
    for (const dot of points) {
      const dx=dot.bx-pointer.x,dy=dot.by-pointer.y,d=Math.hypot(dx,dy);
      const force=inside?Math.pow(Math.max(0,1-d/140),2)*28:0;
      const tx=dot.bx+(d?dx/d:1)*force,ty=dot.by+(d?dy/d:0)*force;
      dot.vx=(dot.vx+(tx-dot.x)*.16*dt)*damping;
      dot.vy=(dot.vy+(ty-dot.y)*.16*dt)*damping;
      dot.x+=dot.vx*dt; dot.y+=dot.vy*dt;
      if(Math.abs(tx-dot.x)+Math.abs(ty-dot.y)+Math.abs(dot.vx)+Math.abs(dot.vy)>.07) unsettled=true;
    }
    draw();
    if (unsettled) frame=requestAnimationFrame(tick);
    else if (!inside) clear();
  }
  function request() { if (!frame) {previous=performance.now();frame=requestAnimationFrame(tick);} }
  function leave() { if (!active || !inside) return; inside=false;active.classList.remove('is-playing');needle?.style.removeProperty('--needle-angle'); }
  document.addEventListener('pointermove', event => {
    if (event.pointerType!=='mouse' || !motion.matches || transparency.matches) {clear();return;}
    pending = {clientX:event.clientX,clientY:event.clientY,target:event.target}; request();
  },{passive:true});
  document.addEventListener('pointerover',event => {if(event.target instanceof Element && event.target.matches('iframe')) clear();},{passive:true});
  document.documentElement.addEventListener('pointerleave',()=>{pending=null;leave();request();});
  // Geometry is stale after scroll or resize; never follow yesterday's coordinates.
  addEventListener('scroll',clear,{passive:true,capture:true});
  addEventListener('resize',clear,{passive:true});
  addEventListener('blur',clear); addEventListener('pagehide',clear);
  document.addEventListener('visibilitychange',clear);
  motion.addEventListener('change',clear); transparency.addEventListener('change',clear);
})();
