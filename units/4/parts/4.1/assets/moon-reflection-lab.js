const panel=document.querySelector('#moon-reflection-explanation');
if(panel){
  const root=panel.querySelector('.moon-lab'),canvas=root.querySelector('canvas'),notice=root.querySelector('#moon-model-message');
  let api=null,promise=null,failed=false;
  const fail=error=>{
    if(failed)return;const hadFocus=root.contains(document.activeElement);failed=true;api?.stop();root.dataset.moonState='failed';root.setAttribute('aria-busy','false');
    notice.textContent='天體模型未能載入，請重新整理頁面後再試。';notice.hidden=false;notice.setAttribute('role','alert');
    canvas.setAttribute('aria-disabled','true');canvas.tabIndex=-1;notice.tabIndex=-1;
    if(hadFocus)notice.focus({preventScroll:true});
    root.querySelectorAll('button').forEach(b=>b.disabled=true);
    root.querySelector('#moon-model-status').textContent='目前無法觀察天體與反射光路。';
    console.error('Moon reflection model unavailable',error);
  };
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();fail('WebGL context lost');});
  const load=()=>{
    if(!panel.open){api?.setActive(false);return;}
    if(failed)return;
    if(api){api.setActive(true);return;}
    if(promise)return;
    root.dataset.moonState='loading';root.setAttribute('aria-busy','true');notice.hidden=false;
    promise=import('./moon-reflection-3d.js?v=celestial-20261105').then(m=>m.createMoonLab(root)).then(value=>{
      api=value;if(failed){api.stop();return;}
      root.dataset.moonState='ready';root.setAttribute('aria-busy','false');notice.hidden=true;canvas.removeAttribute('aria-disabled');canvas.tabIndex=0;
      root.querySelectorAll('button').forEach(b=>b.disabled=false);api.setActive(panel.open);
    }).catch(fail);
  };
  panel.addEventListener('toggle',load);load();
}
