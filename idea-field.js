/* An ambient sketch of ideas finding a structure. It never drives page layout. */
(() => {
  const canvas = document.querySelector('#idea-field');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let width = 1, height = 1, frame = 0, last = 0, time = 0;
  let pointer = {x:.72, y:.32}, aim = {...pointer};
  const running = () => !document.hidden && !reduced.matches && !document.body.classList.contains('ambient-paused');
  function resize() {
    width = innerWidth; height = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = width * dpr; canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }
  function draw() {
    ctx.clearRect(0,0,width,height);
    const shiftX = (pointer.x - .5) * 28, shiftY = (pointer.y - .5) * 22;
    // Three curved paths carry the ideas between loose clusters and an ordered grid.
    for (let lane = 0; lane < 3; lane++) {
      const y = height * (.21 + lane * .31) + shiftY;
      const path = x => y + Math.sin(x / width * 5 + time * .13 + lane) * height * .085;
      const grad = ctx.createLinearGradient(0,0,width,0);
      grad.addColorStop(0,'rgba(59,130,246,0)');
      grad.addColorStop(.35,'rgba(59,130,246,.12)');
      grad.addColorStop(.7,'rgba(98,165,255,.25)');
      grad.addColorStop(1,'rgba(59,130,246,0)');
      ctx.beginPath();
      for (let x = -10; x <= width+10; x += 8) ctx.lineTo(x,path(x));
      ctx.lineWidth = 1; ctx.strokeStyle = grad; ctx.stroke();
      for (let i=0;i<6;i++) {
        const p = ((i / 6 + time * .013 + lane * .11) % 1);
        const x = p * (width + 80) - 40;
        ctx.beginPath(); ctx.arc(x,path(x),2.1,0,Math.PI*2);
        ctx.fillStyle='rgba(47,118,235,.45)';ctx.fill();
        ctx.beginPath();ctx.arc(x,path(x),7,0,Math.PI*2);
        ctx.fillStyle='rgba(75,151,248,.055)';ctx.fill();
      }
    }
    const points=[];
    for (let i=0;i<30;i++) {
      const col=i%6,row=Math.floor(i/6), settle=(1+Math.sin(time*.18))*.5;
      const x=width*.64+col*width*.067+Math.sin(i*3.7+time*.11)*(1-settle)*35+shiftX;
      const y=height*.13+row*height*.135+Math.cos(i*2.3+time*.12)*(1-settle)*32+shiftY;
      points.push({x,y});
      ctx.beginPath();ctx.roundRect(x-3,y-3,6,6,1.6);
      ctx.fillStyle=i%7===0?'rgba(43,116,233,.42)':'rgba(61,132,225,.20)';ctx.fill();
      if (col && (i+Math.floor(time/8))%3!==0) {
        ctx.beginPath();ctx.moveTo(points[i-1].x,points[i-1].y);ctx.lineTo(x,y);
        ctx.strokeStyle=`rgba(52,128,225,${.04+settle*.07})`;ctx.lineWidth=.8;ctx.stroke();
      }
    }
  }
  function tick(now) {
    frame=0;
    if (!running()) return;
    if (now-last >= 32) {
      time += Math.min((now-last)/1000,.05);last=now;
      pointer.x+=(aim.x-pointer.x)*.06;pointer.y+=(aim.y-pointer.y)*.06;
      draw();
    }
    frame=requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(frame);frame=0;last=performance.now();draw();
    if (running()) frame=requestAnimationFrame(tick);
  }
  addEventListener('pointermove',event=>{if(event.pointerType==='mouse')aim={x:event.clientX/width,y:event.clientY/height};},{passive:true});
  addEventListener('resize',resize,{passive:true});
  addEventListener('portfolio-ambient',sync);
  document.addEventListener('visibilitychange',sync);
  reduced.addEventListener('change',sync);
  resize();sync();
})();
