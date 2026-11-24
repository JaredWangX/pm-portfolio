/* Pointer-driven light: different settling speeds give depth without a cursor trail. */
(() => {
  const canvas=document.querySelector('#idea-field');
  if (!canvas) return;
  const ctx=canvas.getContext('2d');
  if (!ctx) return;
  const ambient=canvas.closest('.portfolio-ambient');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const fine=matchMedia('(hover: hover) and (pointer: fine)');
  const rest={x:.76,y:.30};
  const target={...rest},front={...rest},depth={...rest},shine={...rest};
  let width=1,height=1,frame=0,last=0,visible=true,rect;
  const enabled=()=>visible && !document.hidden && fine.matches && !reduced.matches && !document.body.classList.contains('ambient-paused');
  function light(x,y,rx,ry,angle,stops) {
    ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(rx,ry);
    const color=ctx.createRadialGradient(-.14,-.10,.03,0,0,1);
    stops.forEach(([at,value])=>color.addColorStop(at,value));
    ctx.fillStyle=color;ctx.fillRect(-1,-1,2,2);ctx.restore();
  }
  function draw() {
    ctx.clearRect(0,0,width,height);
    const size=Math.min(870,Math.max(560,width*.62));
    const x=front.x*width,y=front.y*height;
    const stretch=Math.min(.20,Math.hypot(front.x-depth.x,front.y-depth.y));
    const rotation=(front.y-depth.y)*.9-.3;
    light(depth.x*width+size*.11,depth.y*height+55,size*.73,size*.54,-.35,[
      [0,'rgba(40,113,240,.30)'],[.34,'rgba(69,140,247,.23)'],[.64,'rgba(112,178,255,.11)'],[1,'rgba(112,178,255,0)']
    ]);
    light(x-size*.12,y+28,size*(.65+stretch),size*.36,rotation,[
      [0,'rgba(70,158,255,.34)'],[.32,'rgba(91,175,255,.24)'],[.68,'rgba(137,200,255,.10)'],[1,'rgba(137,200,255,0)']
    ]);
    light(x+size*.25,y-size*.10,size*.48,size*.39,.65,[
      [0,'rgba(101,220,239,.27)'],[.42,'rgba(141,229,245,.16)'],[1,'rgba(141,229,245,0)']
    ]);
    light(shine.x*width-size*.12,shine.y*height-size*.14,size*.54,size*.28,-.58,[
      [0,'rgba(255,255,255,.86)'],[.4,'rgba(255,255,255,.56)'],[.75,'rgba(246,252,255,.13)'],[1,'rgba(246,252,255,0)']
    ]);
    light(x+size*.15,y-size*.26,size*.36,size*.16,-.38,[
      [0,'rgba(255,255,255,.7)'],[.48,'rgba(255,255,255,.24)'],[1,'rgba(255,255,255,0)']
    ]);
  }
  function tick(now) {
    frame=0;
    if (!enabled()) return;
    const dt=Math.min((now-last)/1000,.05);last=now;
    let distance=0;
    for (const [point,speed] of [[front,10],[depth,4.5],[shine,6]]) {
      const step=1-Math.exp(-speed*dt);
      point.x+=(target.x-point.x)*step;point.y+=(target.y-point.y)*step;
      distance=Math.max(distance,Math.abs(target.x-point.x)*width+Math.abs(target.y-point.y)*height);
    }
    draw();
    if (distance>.2) frame=requestAnimationFrame(tick);
  }
  function request() {
    if (enabled() && !frame) {last=performance.now();frame=requestAnimationFrame(tick);}
  }
  function sync() {
    cancelAnimationFrame(frame);frame=0;
    ambient.classList.toggle('ambient-idle',!enabled());
    if (reduced.matches || !fine.matches) {
      for (const point of [target,front,depth,shine]) Object.assign(point,rest);
      draw();
    }
    request();
  }
  function resize() {
    rect=ambient.getBoundingClientRect();
    const w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight);
    if (w===width && h===height) return;
    width=w;height=h;
    const dpr=Math.min(devicePixelRatio||1,1.25,Math.sqrt(1500000/(width*height)));
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);draw();
  }
  addEventListener('pointermove',event=>{
    if (event.pointerType!=='mouse' || !enabled() || !rect || document.querySelector('dialog[open]')) return;
    const y=event.clientY-rect.top;
    if (y<0 || y>height) return;
    target.x=Math.max(.02,Math.min(.98,(event.clientX-rect.left)/width));
    target.y=Math.max(.04,Math.min(.88,y/height));request();
  },{passive:true});
  document.documentElement.addEventListener('pointerleave',()=>{Object.assign(target,rest);request();});
  addEventListener('scroll',()=>{rect=ambient.getBoundingClientRect();},{passive:true});
  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync();}).observe(ambient);
  addEventListener('portfolio-ambient',sync);
  document.addEventListener('visibilitychange',sync);
  reduced.addEventListener('change',sync);fine.addEventListener('change',sync);
  addEventListener('pagehide',()=>{cancelAnimationFrame(frame);frame=0;});
  addEventListener('pageshow',sync);
  resize();sync();
})();
