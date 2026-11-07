/* A qualitative, synchronized illustration of radiation, reflection and absorption.
   Plot progress is illustrative; it is not a surface-temperature or spectral model. */
(() => {
  'use strict';
  const root=document.getElementById('radiation-lab');if(!root)return;
  const $=id=>document.getElementById(id),play=$('radiation-play'),source=$('radiation-source');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const ARRIVAL=2.4,ABSORPTION=3.3,HEATING=4,PLOT_DURATION=12;
  const assets=['space','ground'].map(key=>({node:$(`radiation-${key}-photo`),status:'idle',request:0}));
  let playing=false,time=0,frame=0,previous=null;
  function setText(id,text){const n=$(id);if(n.textContent!==text)n.textContent=text;}
  function assetState(){return assets.some(a=>a.status==='error')?'error':assets.every(a=>a.status==='ready')?'ready':'loading';}
  function drawCurve(){
    const span=Math.min(PLOT_DURATION,Math.max(0,time-HEATING)),points=[];
    for(let t=0;t<span;t+=.18)points.push(t);points.push(span);
    const curve=points.map((t,i)=>`${i?'L':'M'}${(30+280*t/PLOT_DURATION).toFixed(2)} ${(129-91*(1-Math.exp(-t/3.7))).toFixed(2)}`).join('');
    $('radiation-heat-curve').setAttribute('d',curve);
    $('radiation-heat-point').setAttribute('cx',(30+280*span/PLOT_DURATION).toFixed(2));
    $('radiation-heat-point').setAttribute('cy',(129-91*(1-Math.exp(-span/3.7))).toFixed(2));
    $('radiation-heat-point').toggleAttribute('hidden',span===0);
    root.dataset.heatProgress=(span/PLOT_DURATION).toFixed(4);
  }
  // Green lines annotate the same place at two scales; they are not energy rays.
  // Resolve the eye and A markers from actual layout so mobile reflow stays linked.
  function updateLinks(){
    const ground=$('radiation-ground'),matrix=ground.getScreenCTM();if(!matrix)return;
    const box=root.getBoundingClientRect(),ox=box.left+root.clientLeft,oy=box.top+root.clientTop;
    const lines=$('radiation-link-lines');lines.setAttribute('viewBox',`0 0 ${root.clientWidth} ${root.clientHeight}`);
    const a=ground.createSVGPoint();a.x=420;a.y=350;const surface=a.matrixTransform(matrix);
    const local=$('radiation-local-view'),localBox=local.getBoundingClientRect();
    $('radiation-ground-site').style.left=`${surface.x-localBox.left-local.clientLeft}px`;
    $('radiation-ground-site').style.top=`${surface.y-localBox.top-local.clientTop}px`;
    const eye=$('radiation-eye-icon').getBoundingClientRect(),target=ground.createSVGPoint();target.x=eye.left+eye.width*.12;target.y=eye.top+eye.height*.58;
    const eyeEnd=target.matrixTransform(matrix.inverse()),ray=`M420 350L${eyeEnd.x.toFixed(2)} ${eyeEnd.y.toFixed(2)}`;
    $('radiation-reflection-ray').setAttribute('d',ray);$('radiation-reflection-outline').setAttribute('d',ray);
    const earth=$('radiation-earth-site').getBoundingClientRect(),anchor=$('radiation-temperature-anchor').getBoundingClientRect();
    const zoom=`M${(earth.left+earth.width/2-ox).toFixed(2)} ${(earth.top+earth.height/2-oy).toFixed(2)}L${(localBox.left+localBox.width*.94-ox).toFixed(2)} ${(localBox.top-oy).toFixed(2)}`;
    const temperature=`M${(surface.x-ox).toFixed(2)} ${(surface.y-oy).toFixed(2)}L${(anchor.left+anchor.width/2-ox).toFixed(2)} ${(anchor.top+anchor.height/2-oy).toFixed(2)}`;
    for(const id of ['radiation-zoom-halo','radiation-zoom-line'])$(id).setAttribute('d',zoom);
    for(const id of ['radiation-temperature-halo','radiation-temperature-line'])$(id).setAttribute('d',temperature);
  }
  function render(){
    const status=assetState(),started=playing||time>0,arrived=time>=ARRIVAL,absorbed=time>=ABSORPTION;
    root.dataset.assets=status;root.dataset.playing=String(playing);root.dataset.started=String(started);root.dataset.elapsed=time.toFixed(3);
    root.dataset.stage=!started?'ready':!arrived?'travelling':!absorbed?'at-surface':time<HEATING?'absorbed':time<HEATING+PLOT_DURATION?'warming':'observed';
    root.setAttribute('aria-busy',String(status==='loading'));
    play.disabled=source.disabled=status!=='ready';play.setAttribute('aria-pressed',String(playing));
    setText('radiation-play',playing?'暫停觀察':time>0?'繼續觀察':'開始觀察');
    setText('radiation-status',!started?'尚未開始':playing?'觀察進行中':'觀察已暫停');
    $('radiation-space-motion').setAttribute('opacity',started&&status==='ready'?'1':'0');
    $('radiation-travel-window').setAttribute('width',(540*Math.min(1,time/ARRIVAL)).toFixed(2));
    $('radiation-rays').setAttribute('stroke-dashoffset',(-time*32).toFixed(2));
    $('radiation-ground-incoming').setAttribute('opacity',arrived?'1':'0');
    $('radiation-ground-incoming').setAttribute('stroke-dashoffset',(-time*30).toFixed(2));
    $('radiation-ground-outcomes').setAttribute('opacity',absorbed?'1':'0');
    $('radiation-temperature-connection').setAttribute('opacity',absorbed?'1':'0');
    $('radiation-ground-outcomes').setAttribute('stroke-dashoffset',(-time*30).toFixed(2));
    $('radiation-space').setAttribute('aria-label',started?'太陽輻射攜帶能量，穿越近真空的太空傳向地球。':'太陽與地球之間的輻射傳遞示意，尚未開始觀察。');
    drawCurve();$('radiation-discovery').hidden=time<HEATING+PLOT_DURATION;
    setText('radiation-note',!started?'點擊太陽或按下「開始觀察」，追蹤能量到達地表後的變化。':!arrived?'太陽輻射攜帶能量，穿越近真空的太空。':!absorbed?'能量到達地表，一部分被反射，一部分被吸收。':time<HEATING?'地表反射的可見光進入眼睛；地表吸收的能量使它受熱。':'輻射攜帶能量 → 地表吸收 → 地表受熱');
    setText('radiation-loading-text',status==='error'?'觀察場景未能載入，請重新載入。':'觀察場景載入中…');
    $('radiation-retry').hidden=status!=='error';
  }
  function tick(now){if(!playing)return;const dt=previous===null?0:Math.max(0,Math.min(.05,(now-previous)/1000));previous=now;time+=dt*(reduced.matches?.55:1);render();frame=requestAnimationFrame(tick);}
  function start(){if(playing||assetState()!=='ready')return;playing=true;previous=null;render();frame=requestAnimationFrame(tick);}
  function stop(){playing=false;cancelAnimationFrame(frame);frame=0;previous=null;render();}
  function reset(){stop();time=0;render();}
  function loadAssets(retry=false){
    assets.forEach(asset=>{
      if(asset.status==='ready'||asset.status==='loading')return;
      const request=++asset.request,url=asset.node.dataset.src+(retry?`&retry=${request}`:'');asset.status='loading';
      const image=new Image();
      image.onload=()=>{if(request!==asset.request)return;if(!image.naturalWidth){asset.status='error';render();return;}asset.node.setAttribute('href',url);asset.status='ready';render();};
      image.onerror=()=>{if(request!==asset.request)return;asset.status='error';render();};image.src=url;
    });render();
  }
  play.addEventListener('click',()=>{if(playing)stop();else start();});source.addEventListener('click',start);
  $('radiation-reset').addEventListener('click',reset);$('radiation-retry').addEventListener('click',()=>loadAssets(true));
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});addEventListener('pagehide',stop);
  const resize=new ResizeObserver(updateLinks);resize.observe(root);resize.observe($('radiation-local-view'));resize.observe($('radiation-eye'));
  addEventListener('resize',updateLinks);document.fonts?.ready.then(updateLinks);
  render();loadAssets();updateLinks();
})();
