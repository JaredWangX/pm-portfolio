// A pleated sheet twists around its centre line. Draw it locally so the page
// can honour reduced motion and stop rendering as soon as the hero leaves view.
(() => {
  const field = document.querySelector('.light-field');
  if (!field) return;
  const canvas = field.querySelector('canvas');
  const toggle = document.querySelector('[data-motion-toggle]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = reduced.matches, visible = true, raf = 0, elapsed = 0, previous = 0;
  let stored;
  try { stored = sessionStorage.getItem('portfolio-motion'); } catch {}
  if (stored === 'off') paused = true;
  const gl = canvas.getContext('webgl', {alpha: true, antialias: true, depth: true, powerPreference: 'low-power'});
  const vertex = `
    attribute vec2 uv; uniform float phase, band, aspect;
    varying vec3 n; varying vec2 st; varying float edge;
    vec3 sheet(float t, float v) {
      float time = phase;
      float xc = -1.48 + 2.98*t;
      float turn = 5.7*t - 1.12 + 0.47*sin(time + 2.3*t) + band*.87;
      float rise = .43*sin(6.0*t - .68 + .26*sin(time)) + .23*sin(9.0*t+.31*time+band*.5);
      float centre = -.41 + .96*t - rise + band*.17;
      float spread = .18 + .20*sin(2.7*t+.40);
      float fold = pow(abs(sin((v+1.)*49.)),1.40) * .010;
      float bend = (1.-v*v)*.055+fold;
      float y = centre + spread*v*cos(turn) + bend*sin(turn);
      float z = spread*v*sin(turn) - bend*cos(turn) + .14*cos(6.1*t) + .09*band;
      return vec3(xc + .105*v*sin(turn), y, z);
    }
    void main(){
      float t=uv.x, v=uv.y;vec3 p=sheet(t,v);
      vec3 dx=sheet(t+.0004,v)-sheet(t-.0004,v);
      vec3 dy=sheet(t,v+.001)-sheet(t,v-.001);
      n=normalize(cross(vec3(dx.x*aspect,dx.yz),vec3(dy.x*aspect,dy.yz)));
      gl_Position=vec4(p.x,p.y,-p.z*.8,1.);
      st=uv;edge=band;
    }`;
  const fragment = `
    precision mediump float; varying vec3 n; varying vec2 st; varying float edge; uniform float phase;
    void main(){
      vec3 N=normalize(n); if(N.z<0.)N=-N;
      vec3 l=normalize(vec3(-.32,.70,1.0));float light=clamp(dot(N,l),0.,1.);
      float glint=pow(max(dot(N,normalize(l+vec3(0.,0.,1.))),0.),12.);
      float grain=.5+.5*cos(st.y*99.);
      float gleam=smoothstep(.15,.9,light)*.66 + glint*.23 + grain*.06;
      vec3 shadow=mix(vec3(.18,.39,.72),vec3(.25,.50,.86),edge);
      vec3 gold=mix(vec3(.53,.76,1.),vec3(.70,.86,1.),edge);
      vec3 col=mix(shadow,gold,gleam);col=mix(col,vec3(.91,.97,1.),glint*.53);
      gl_FragColor=vec4(col,1.);
    }`;
  let draw;
  if (gl) {
    const compile = (kind, source) => {
      const shader = gl.createShader(kind);
      gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) throw Error('Shader compilation failed');
      return shader;
    };
    try {
      const program=gl.createProgram();
      gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));
      gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program,gl.LINK_STATUS)) throw Error('Shader linking failed');
      gl.useProgram(program);
      const points=[], ids=[], across=64, ribs=112;
      for(let i=0;i<=across;i++) for(let j=0;j<=ribs;j++) points.push(i/across,j/ribs*2-1);
      for(let i=0;i<across;i++) for(let j=0;j<ribs;j++){
        const a=i*(ribs+1)+j,b=a+ribs+1;ids.push(a,b,a+1,a+1,b,b+1);
      }
      const vertices=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vertices);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(points),gl.STATIC_DRAW);
      const attr=gl.getAttribLocation(program,'uv');gl.enableVertexAttribArray(attr);gl.vertexAttribPointer(attr,2,gl.FLOAT,false,0,0);
      const indices=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indices);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(ids),gl.STATIC_DRAW);
      const phase=gl.getUniformLocation(program,'phase'),band=gl.getUniformLocation(program,'band'),aspect=gl.getUniformLocation(program,'aspect');
      gl.enable(gl.DEPTH_TEST);gl.clearColor(0,0,0,0);
      draw=()=>{
        const w=Math.min(1200,Math.round(canvas.clientWidth)), h=Math.round(w*canvas.clientHeight/Math.max(1,canvas.clientWidth));
        if (w<2 || h<2) return;
        if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
        gl.viewport(0,0,w,h);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
        gl.uniform1f(phase,elapsed*.34+.25);gl.uniform1f(aspect,w/h);
        for(const k of [1,0]){gl.uniform1f(band,k);gl.drawElements(gl.TRIANGLES,ids.length,gl.UNSIGNED_SHORT,0);}
        field.classList.add('rendered');
      };
    } catch { draw = undefined; }
  }
  const running=()=>!paused && visible && !document.hidden;
  function frame(now){
    if(!running() || !draw)return;
    if(!previous || now-previous>=30){elapsed+=previous?Math.min((now-previous)/1000,.13):0;previous=now;draw();}
    raf=requestAnimationFrame(frame);
  }
  function sync(){
    cancelAnimationFrame(raf);previous=0;
    field.classList.toggle('moving',running());
    toggle.setAttribute('aria-pressed', String(!paused));
    toggle.setAttribute('aria-label', paused?'播放背景动画':'暂停背景动画');
    toggle.title=toggle.getAttribute('aria-label');
    toggle.firstElementChild.textContent=paused?'▶':'Ⅱ';
    if(draw){draw();if(running())raf=requestAnimationFrame(frame);}
  }
  toggle.addEventListener('click',()=>{paused=!paused;try{sessionStorage.setItem('portfolio-motion',paused?'off':'on')}catch{}sync();});
  reduced.addEventListener('change',e=>{paused=e.matches;sync()});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();draw=undefined;field.classList.remove('rendered');sync();});
  new ResizeObserver(sync).observe(field);
  new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync();}).observe(field);
  document.addEventListener('visibilitychange',sync);
  sync();
})();
