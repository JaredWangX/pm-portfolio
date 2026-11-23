(()=>{
'use strict';
const contents = document.querySelector('.reader-contents');
const compactContents = matchMedia('(max-width:900px)');
const adaptContents = () => { contents.open = !compactContents.matches; };
adaptContents();
compactContents.addEventListener('change', adaptContents);
const links = [...contents.querySelectorAll('nav a')];
const sections = links.map(link => document.querySelector(link.hash));
let scheduled = false;
function highlight() {
  let active = 0;
  sections.forEach((section, index) => {if (section.getBoundingClientRect().top < 180) active = index;});
  links.forEach((link, index) => {
    if (index === active && !link.hasAttribute('aria-current')) link.setAttribute('aria-current','location');
    else if (index !== active && link.hasAttribute('aria-current')) link.removeAttribute('aria-current');
  });
}
addEventListener('scroll', () => {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {highlight();scheduled = false;});
}, {passive:true});
highlight();

})();
