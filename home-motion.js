(() => {
  const gsap=window.gsap;
  if (!gsap || !document.body.classList.contains('home-page')) return;
  const hero=document.querySelector('.portfolio-intro');
  let entered=false;
  const media=gsap.matchMedia();
  media.add('(prefers-reduced-motion: no-preference)',()=>{
    // One entrance only; returning to an anchor never hides existing content.
    const paint=performance.getEntriesByName('first-contentful-paint')[0];
    const timely=!paint || performance.now()-paint.startTime<120;
    if (!entered && timely && !location.hash && scrollY<30) {
      entered=true;
      gsap.timeline({defaults:{ease:'power3.out',duration:.85}})
        .from('.intro-line-text',{yPercent:105,autoAlpha:0,stagger:.11,clearProps:'transform,opacity,visibility'},0)
        .from('.intro-note>p',{y:14,autoAlpha:0,clearProps:'transform,opacity,visibility'},.18)
        .from('.intro-note .button',{y:12,autoAlpha:0,stagger:.09,clearProps:'transform,opacity,visibility'},.32)
        .fromTo('.intro-line-text em',{'--underline-progress':0},{'--underline-progress':1,duration:.9},.4);
    }
  });
  media.add('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)',()=>{
    const cleanups=[];
    document.querySelectorAll('.device-project,.project-summary,.decision-project,.strengths article,.practice-card,.contact-card').forEach(card=>{
      const wrap=document.createElement('span');wrap.className='glass-light-wrap';wrap.setAttribute('aria-hidden','true');
      const light=document.createElement('span');light.className='glass-light';wrap.append(light);card.append(wrap);card.classList.add('motion-glass');
      const xTo=gsap.quickTo(light,'x',{duration:.55,ease:'power3.out'}), yTo=gsap.quickTo(light,'y',{duration:.55,ease:'power3.out'});
      let rect;
      function enter(e) {rect=card.getBoundingClientRect();gsap.set(light,{x:e.clientX-rect.left,y:e.clientY-rect.top});gsap.to(light,{opacity:.8,duration:.3,overwrite:'auto'});}
      function move(e) {if(rect){xTo(e.clientX-rect.left);yTo(e.clientY-rect.top);}}
      function leave() {if(!rect)return;rect=null;gsap.to(light,{opacity:0,duration:.3,overwrite:'auto'});}
      card.addEventListener('pointerenter',enter);card.addEventListener('pointermove',move);card.addEventListener('pointerleave',leave);
      // A scrolling card changes coordinates; clear the spotlight instead of remeasuring each frame.
      addEventListener('scroll',leave,{passive:true});
      cleanups.push(()=>{card.removeEventListener('pointerenter',enter);card.removeEventListener('pointermove',move);card.removeEventListener('pointerleave',leave);removeEventListener('scroll',leave);wrap.remove();card.classList.remove('motion-glass');});
    });
    return ()=>cleanups.forEach(clean=>clean());
  });
  // Finish the entrance if focus moves into it; keyboard navigation is never hidden.
  hero.addEventListener('focusin',()=>{gsap.getTweensOf(hero.querySelectorAll('.intro-line-text,.intro-note>p,.button')).forEach(t=>t.progress(1));});
})();
