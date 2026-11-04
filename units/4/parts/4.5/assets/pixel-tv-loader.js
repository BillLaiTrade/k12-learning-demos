/* Keep the colour controls independent of the rest of the lesson. */
(() => {
 const root=document.querySelector('.pixel-tv-quiz');
 if(!root)return;
 const source=new URL('./pixel-tv.mjs?v=tv-concept-20261104',document.currentScript.src);
 const note=root.querySelector('[data-tv-load-note]');
 const message=root.querySelector('[data-tv-load-message]');
 const retry=root.querySelector('[data-tv-retry]');
 retry.addEventListener('click',()=>location.reload());
 root.dataset.loadState='loading';
 let slow=setTimeout(()=>{
  if(root.dataset.ready==='true')return;
  message.textContent='調色工具仍在載入；若等候後仍無法點選，可重新載入頁面。';
  retry.hidden=false;
 },8000);
 import(source.href).then(module=>{
  module.initialisePixelTv(root);
  root.dataset.loadState='ready';
 }).catch(error=>{
  root.dataset.loadState='error';
  note.hidden=false;
  message.textContent='調色工具載入失敗，目前無法調色。請重新載入頁面再試。';
  retry.hidden=false;
  console.error('4.5 pixel TV failed',error);
 }).finally(()=>clearTimeout(slow));
})();
