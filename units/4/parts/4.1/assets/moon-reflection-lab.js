const panel=document.querySelector('#moon-reflection-explanation');
if(panel){
  const root=panel.querySelector('.moon-lab'),canvases=[...root.querySelectorAll('canvas')],canvas=root.querySelector('#moon-model-canvas'),notice=root.querySelector('#moon-model-message');
  let api=null,promise=null,failed=false;
  const fail=error=>{
    if(failed)return;const hadFocus=root.contains(document.activeElement);failed=true;api?.stop();root.dataset.moonState='failed';root.setAttribute('aria-busy','false');
    notice.textContent='天體模型未能載入，請重新整理頁面後再試。';notice.hidden=false;notice.setAttribute('role','alert');
    for(const c of canvases){c.setAttribute('aria-disabled','true');c.tabIndex=-1;}notice.tabIndex=-1;root.dataset.playing='false';const toggle=root.querySelector('#moon-play-toggle');toggle.querySelector('span').textContent='播放';toggle.setAttribute('aria-label','播放月球運行');toggle.querySelector('path').setAttribute('d','M4 2 L18 10 L4 18Z');
    if(hadFocus)notice.focus({preventScroll:true});
    root.querySelectorAll('button,input').forEach(b=>b.disabled=true);
    root.querySelector('#moon-model-status').textContent='目前無法觀察天體與反射光路。';
    console.error('Moon reflection model unavailable',error);
  };
  canvases.forEach(c=>c.addEventListener('webglcontextlost',event=>{event.preventDefault();fail('WebGL context lost');}));
  const load=()=>{
    if(!panel.open){api?.setActive(false);return;}
    if(failed)return;
    if(api){api.setActive(true);return;}
    if(promise)return;
    root.dataset.moonState='loading';root.setAttribute('aria-busy','true');notice.hidden=false;
    promise=import('./moon-reflection-3d.js?v=reflection-play-20261105').then(m=>m.createMoonLab(root)).then(value=>{
      api=value;if(failed){api.stop();return;}
      root.dataset.moonState='ready';root.setAttribute('aria-busy','false');notice.hidden=true;canvas.removeAttribute('aria-disabled');canvas.tabIndex=0;
      root.querySelectorAll('button,input').forEach(b=>b.disabled=false);api.setActive(panel.open);
    }).catch(fail);
  };
  panel.addEventListener('toggle',load);load();
}
