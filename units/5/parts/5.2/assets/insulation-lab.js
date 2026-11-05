/* Controlled construction comparisons. Cooling curves are qualitative drawing
   positions in a finite observation window, not measured bottle temperatures. */
(() => {
  'use strict';
  const root=document.getElementById('insulation-lab');if(!root)return;
  const $=id=>document.getElementById(id),play=$('insulation-play'),sources=['a','b'].map(k=>$(`insulation-source-${k}`));
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const comparisons={
    gap:{title:'夾層剖面示意',a:{label:'空氣夾層',gas:true,lining:false,gap:'有空氣'},b:{label:'真空夾層',gas:false,lining:false,gap:'抽去大部分空氣'},note:'真空減少氣體傳導與對流，輻射仍可傳遞能量。',discovery:'抽掉空氣能減少氣體傳熱，可是輻射和瓶口的傳導還在，難怪水還是會慢慢變涼。'},
    lining:{title:'兩瓶皆為真空夾層',a:{label:'無亮面反射層',gas:false,lining:false,gap:'無亮面反射層'},b:{label:'有亮面反射層',gas:false,lining:true,gap:'亮面金屬層'},note:'亮面金屬層能降低輻射換熱；瓶口、支撐仍會傳熱。',discovery:'亮面金屬層能讓輻射換熱少一點，可是瓶口、支撐還會傳熱，所以水還是會慢慢變涼。'}
  };
  const assets={bench:{src:$('insulation-bench').dataset.src,status:'idle',request:0},matte:{src:'assets/insulation-flask-matte.webp?v=flask-1',status:'idle',request:0},lining:{src:'assets/insulation-flask-lining.webp?v=flask-1',status:'idle',request:0}};
  let comparison='gap',time=0,playing=false,frame=0,previous=null;
  const WINDOW=14,gasPath=$('insulation-gas-route'),gasLength=gasPath.getTotalLength(),gasArrows=[...root.querySelectorAll('.insulation-gas-arrow')];
  const setText=(id,text)=>{const n=$(id);if(n.textContent!==text)n.textContent=text;};
  const required=()=>comparison==='lining'?['bench','matte','lining']:['bench','matte'];
  const assetState=()=>required().some(k=>assets[k].status==='error')?'error':required().every(k=>assets[k].status==='ready')?'ready':'loading';
  function putImage(node,url){if(node.getAttribute('href')!==url)node.setAttribute('href',url);}
  // Both comparisons use the same normalized drawing template. It makes no
  // quantitative claim about the relative benefit of vacuum versus a coating.
  function ordinate(role,p){return Math.exp(-(role==='a'?3.2:1.5)*p);}
  function plot(){
    const p=Math.min(1,time/WINDOW);root.dataset.progress=p.toFixed(4);
    ['a','b'].forEach(role=>{
      const ps=[];for(let x=0;x<p;x+=.012)ps.push(x);ps.push(p);
      const d=ps.map((x,i)=>`${i?'L':'M'}${(72+783*x).toFixed(2)} ${(224-179*ordinate(role,x)).toFixed(2)}`).join('');
      $(`insulation-curve-${role}`).setAttribute('d',d);
      const y=224-179*ordinate(role,p),point=$(`insulation-point-${role}`);point.setAttribute('cx',(72+783*p).toFixed(2));point.setAttribute('cy',y.toFixed(2));point.toggleAttribute('hidden',p===0);
      const tag=$(`insulation-tag-${role}`);tag.style.top=(y/280*100).toFixed(3)+'%';tag.hidden=p<1;
    });
  }
  function render(){
    const cfg=comparisons[comparison],status=assetState(),started=playing||time>0;
    root.dataset.comparison=comparison;root.dataset.assets=status;root.dataset.playing=String(playing);root.dataset.started=String(started);root.dataset.elapsed=time.toFixed(3);root.dataset.stage=!started?'ready':time<WINDOW?'comparing':'observed';
    root.dataset.gasA=String(cfg.a.gas);root.dataset.gasB=String(cfg.b.gas);root.dataset.liningA=String(cfg.a.lining);root.dataset.liningB=String(cfg.b.lining);
    root.setAttribute('aria-busy',String(status==='loading'));play.disabled=status!=='ready';sources.forEach(n=>n.disabled=status!=='ready');play.setAttribute('aria-pressed',String(playing));
    setText('insulation-play',playing?'暫停觀察':time>0?'繼續觀察':'開始觀察');setText('insulation-status',!started?'尚未開始':playing?'觀察進行中':'觀察已暫停');
    setText('insulation-scene-heading',cfg.title);setText('insulation-note',started?cfg.note:'點擊任一瓶身或按下「開始觀察」，比較這一組的降溫快慢。');
    root.querySelectorAll('[data-insulation-comparison]').forEach(n=>n.setAttribute('aria-pressed',String(n.dataset.insulationComparison===comparison)));
    ['a','b'].forEach(role=>{
      const c=cfg[role];setText(`insulation-label-${role}`,c.label);setText(`insulation-legend-${role}`,c.label);setText(`insulation-gap-label-${role}`,c.gap);
      $(`insulation-bottle-${role}`).setAttribute('aria-label',`${role.toUpperCase()}瓶：${c.label}，同型已加蓋保溫瓶的夾層剖面示意。`);
      $(`insulation-source-${role}`).setAttribute('aria-label',`點擊${role.toUpperCase()}瓶（${c.label}），開始或繼續比較`);
      $(`insulation-motion-${role}`).setAttribute('opacity',started&&status==='ready'?'1':'0');
      const fade=Math.max(.25,ordinate(role,Math.min(1,time/WINDOW)));
      $(`insulation-motion-${role}`).querySelector('.insulation-solid-motion').setAttribute('stroke-dashoffset',(-time*20).toFixed(2));
      const ray=$(`insulation-radiation-${role}`);ray.setAttribute('opacity',((c.lining?.45:1)*(.5+.5*fade)).toFixed(3));ray.setAttribute('stroke-dasharray','12 7');ray.setAttribute('stroke-dashoffset',(-time*15).toFixed(2));
      if(assets.matte.status==='ready')putImage($(`insulation-matte-${role}`),assets.matte.url);
      if(assets.bench.status==='ready')putImage($(`insulation-local-bench-${role}`),assets.bench.url);
    });
    if(assets.bench.status==='ready'&&$('insulation-bench').getAttribute('src')!==assets.bench.url)$('insulation-bench').src=assets.bench.url;
    if(assets.lining.status==='ready')putImage($('insulation-lining-photo'),assets.lining.url);
    $('insulation-lining-photo').toggleAttribute('hidden',!cfg.b.lining);
    $('insulation-gas-motion').toggleAttribute('hidden',!cfg.a.gas);
    $('insulation-gap-leader-a').setAttribute('d',comparison==='gap'?'M90 290L142 290':'M90 290L154 290');
    $('insulation-gap-leader-b').setAttribute('d','M391 289L305 316');
    gasArrows.forEach(n=>{const distance=((time/5+Number(n.dataset.phase))%1)*gasLength,p=gasPath.getPointAtLength(distance),q=gasPath.getPointAtLength((distance+1)%gasLength);n.setAttribute('transform',`translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) rotate(${(Math.atan2(q.y-p.y,q.x-p.x)*180/Math.PI).toFixed(1)})`);});
    plot();$('insulation-discovery').hidden=time<WINDOW;setText('insulation-discovery-text',cfg.discovery);
    setText('insulation-loading-text',status==='error'?'比較場景未能載入，請重新載入或切換比較。':'比較場景載入中…');$('insulation-retry').hidden=status!=='error';
  }
  function tick(now){if(!playing)return;const dt=previous===null?0:Math.max(0,Math.min(.05,(now-previous)/1000));previous=now;time+=dt*(reduced.matches?.55:1);render();frame=requestAnimationFrame(tick);}
  function start(){if(playing||assetState()!=='ready')return;playing=true;previous=null;render();frame=requestAnimationFrame(tick);}
  function stop(){playing=false;cancelAnimationFrame(frame);frame=0;previous=null;render();}
  function reset(){stop();time=0;render();}
  function loadAssets(retry=false){
    required().forEach(key=>{const a=assets[key];if(a.status==='ready'||a.status==='loading')return;const request=++a.request,url=a.src+(retry?`&retry=${request}`:'');a.status='loading';
      const image=new Image();image.onload=()=>{if(request!==a.request)return;a.status=image.naturalWidth?'ready':'error';if(a.status==='ready')a.url=url;render();};image.onerror=()=>{if(request!==a.request)return;a.status='error';render();};image.src=url;
    });render();
  }
  play.addEventListener('click',()=>{if(playing)stop();else start();});sources.forEach(n=>n.addEventListener('click',start));$('insulation-reset').addEventListener('click',reset);
  root.querySelectorAll('[data-insulation-comparison]').forEach(n=>n.addEventListener('click',()=>{if(n.dataset.insulationComparison===comparison)return;stop();comparison=n.dataset.insulationComparison;time=0;root.querySelector('details').open=false;render();loadAssets();}));
  $('insulation-retry').addEventListener('click',()=>loadAssets(true));document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});addEventListener('pagehide',stop);
  render();loadAssets();
})();
