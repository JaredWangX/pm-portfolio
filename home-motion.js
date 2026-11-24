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
  // Finish the entrance if focus moves into it; keyboard navigation is never hidden.
  hero.addEventListener('focusin',()=>{gsap.getTweensOf(hero.querySelectorAll('.intro-line-text,.intro-note>p,.button')).forEach(t=>t.progress(1));});
})();
