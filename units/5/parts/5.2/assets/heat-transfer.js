(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const form=$('heat-quiz'),result=$('heat-quiz-result');
  form.noValidate=true;
  form.addEventListener('submit',event=>{
    event.preventDefault();const data=new FormData(form);result.replaceChildren();result.hidden=false;
    const add=text=>{const p=document.createElement('p');p.textContent=text;result.append(p);};
    const correct={direction:'outside',metal:'conduction',air:'convection',sun:'radiation'};
    if(Object.keys(correct).some(key=>!data.get(key))){add('先完成熱傳方向與三條路徑的判斷，再一起核對。');return;}
    const feedback={direction:'比較 25°C 的環境與 10°C 的冷水：熱由環境傳向冷水。',metal:'能量沿金屬瓶蓋與瓶壁傳遞，屬於傳導。',air:'流動空氣攜帶能量，屬於對流。',sun:'陽光直接傳來的能量，屬於輻射。'};
    const wrong=Object.keys(correct).filter(key=>data.get(key)!==correct[key]);
    if(wrong.length===0){add('判斷都合理！保冷要減慢外界向水壺內部的熱交換。');add('同一個水壺可能同時存在多種傳熱方式，需要分別找出路徑。');}
    else{add('再看一下這幾條路徑：');wrong.forEach(key=>add(feedback[key]));}
  });
  form.addEventListener('reset',()=>{result.hidden=true;result.replaceChildren();});
  const links=[...document.querySelectorAll('.route a[href^="#"]')];
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
    if(entry.isIntersecting)links.forEach(link=>{if(link.hash===`#${entry.target.id}`)link.setAttribute('aria-current','step');else link.removeAttribute('aria-current');});
  }),{rootMargin:'-20% 0px -65% 0px'});
  links.forEach(link=>observer.observe(document.querySelector(link.hash)));
})();
