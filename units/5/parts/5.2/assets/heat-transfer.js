(() => {
  'use strict';
  const links=[...document.querySelectorAll('.route a[href^="#"]')];
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
    if(entry.isIntersecting)links.forEach(link=>{if(link.hash===`#${entry.target.id}`)link.setAttribute('aria-current','step');else link.removeAttribute('aria-current');});
  }),{rootMargin:'-20% 0px -65% 0px'});
  links.forEach(link=>observer.observe(document.querySelector(link.hash)));
})();
