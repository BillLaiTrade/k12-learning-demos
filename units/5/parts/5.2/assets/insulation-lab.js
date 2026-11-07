/* Controlled construction comparisons. The particle animation is a qualitative
   mechanism model; plotted curves are not measured bottle temperatures. */
(() => {
  'use strict';
  const root=document.getElementById('insulation-lab');if(!root)return;
  const $=id=>document.getElementById(id),play=$('insulation-play'),sources=['a','b'].map(k=>$(`insulation-source-${k}`));
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const comparisons={
    gap:{title:'夾層剖面示意',a:{label:'空氣夾層',gas:true,lining:false,gap:'有空氣'},b:{label:'真空夾層',gas:false,lining:false,gap:'抽去大部分空氣'},note:'空氣分子隨機運動並碰撞傳能；抽氣後，這條氣體傳熱路徑減少。',discovery:'抽去大部分空氣，會減少氣體傳熱；輻射和瓶口的固體傳熱仍存在。'},
    lining:{title:'兩瓶皆為真空夾層',a:{label:'無亮面反射層',gas:false,lining:false,gap:'無亮面反射層'},b:{label:'有亮面反射層',gas:false,lining:true,gap:'亮面金屬層'},note:'亮面金屬層能降低輻射換熱；瓶口、支撐仍會傳熱。',discovery:'亮面金屬層能讓輻射換熱少一點，可是瓶口、支撐還會傳熱，所以水還是會慢慢變涼。'}
  };
  const assets={bench:{src:$('insulation-bench').dataset.src,status:'idle',request:0},matte:{src:'assets/insulation-flask-matte.webp?v=flask-1',status:'idle',request:0},lining:{src:'assets/insulation-flask-lining.webp?v=flask-1',status:'idle',request:0}};
  let comparison='gap',time=0,playing=false,frame=0,previous=null;
  const workspace=$('insulation-workspace'),dialog=$('insulation-dialog'),expand=$('insulation-expand');
  const placeholder=document.createElement('div');placeholder.hidden=true;placeholder.setAttribute('aria-hidden','true');
  workspace.before(placeholder);
  let readingPosition;
  function fitBottles(){
    if(!dialog.open||innerWidth<900){workspace.style.removeProperty('--insulation-canvas-height');return;}
    const grid=root.querySelector('.insulation-bottle-grid'),style=getComputedStyle(grid);
    const width=(grid.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight)-parseFloat(style.columnGap))/2;
    const captions=[...grid.querySelectorAll('figcaption')].map(n=>n.getBoundingClientRect().height);
    const height=grid.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom)-Math.max(...captions);
    const value=Math.max(1,Math.min(height,width*570/440)).toFixed(2)+'px';
    if(workspace.style.getPropertyValue('--insulation-canvas-height')!==value)workspace.style.setProperty('--insulation-canvas-height',value);
  }
  new ResizeObserver(fitBottles).observe(root.querySelector('.insulation-bottle-grid'));
  expand.addEventListener('click',()=>{
    if(dialog.open)return;
    readingPosition={left:scrollX,top:scrollY};
    placeholder.style.height=workspace.getBoundingClientRect().height+'px';placeholder.hidden=false;
    dialog.append(workspace);document.documentElement.classList.add('insulation-focus-open');dialog.showModal();fitBottles();
  });
  $('insulation-return').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{
    placeholder.after(workspace);placeholder.hidden=true;
    document.documentElement.classList.remove('insulation-focus-open');
    expand.focus({preventScroll:true});if(readingPosition)scrollTo({...readingPosition,behavior:'instant'});
  });
  expand.disabled=false;
  const WINDOW=14,moleculeGroups=[...root.querySelectorAll('.micro-particles')].map((group,index)=>({group,index})),bottleMolecules=[...root.querySelectorAll('#insulation-gas-motion circle')];
  const setText=(id,text)=>{const n=$(id);if(n.textContent!==text)n.textContent=text;};
  const required=()=>comparison==='lining'?['bench','matte','lining']:['bench','matte'];
  const assetState=()=>required().some(k=>assets[k].status==='error')?'error':required().every(k=>assets[k].status==='ready')?'ready':'loading';
  function putImage(node,url){if(node.getAttribute('href')!==url)node.setAttribute('href',url);}
  // Both comparisons use the same normalized drawing template. It makes no
  // quantitative claim about the relative benefit of vacuum versus a coating.
  function ordinate(role,p){return Math.exp(-(role==='a'?2.05:1.5)*p);}
  function reflect(position,min,max){const span=max-min,cycle=((position-min)%(span*2)+span*2)%(span*2);return min+(cycle<=span?cycle:span*2-cycle);}
  function moveMolecules(){
    moleculeGroups.forEach(({group,index})=>group.querySelectorAll('circle').forEach((node,i)=>{
      const seed=i+index*11+1,x0=48+((seed*47)%198),y0=20+((seed*31)%54),vx=((seed*17)%29-14)*.11,vy=((seed*23)%27-13)*.12;
      node.setAttribute('cx',reflect(x0+time*vx,40,260).toFixed(1));node.setAttribute('cy',reflect(y0+time*vy,14,82).toFixed(1));
      node.setAttribute('opacity','.82');
    }));
    bottleMolecules.forEach((node,i)=>{node.setAttribute('cx',reflect(141+i%2*8+time*(i%2?1:-1)*(1.2+i*.14),137,153).toFixed(1));node.setAttribute('cy',reflect(238+i*37+time*(i%2?1:-1)*(4+i*.4),218,414).toFixed(1));});
  }
  function plot(){
    const p=Math.min(1,time/WINDOW);root.dataset.progress=p.toFixed(4);
    $('insulation-progress').value=p;
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
    setText('insulation-scene-heading',cfg.title);setText('insulation-note',started?cfg.note:'點擊任一瓶身外壁，開始同步觀察傳熱機制與溫度趨勢。');
    setText('insulation-chart-title',comparison==='gap'?'模型預測的降溫趨勢':'定性比較降溫快慢');setText('insulation-chart-caveat',comparison==='gap'?'定性模型，非實測數據':'曲線為定性示意，非實測數據');
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
    $('insulation-mechanism').hidden=!(comparison==='gap'&&started&&status==='ready');root.querySelector('.insulation-route-key').hidden=comparison==='gap'&&started&&status==='ready';
    $('insulation-gap-leader-a').setAttribute('d',comparison==='gap'?'M90 290L142 290':'M90 290L154 290');
    $('insulation-gap-leader-b').setAttribute('d','M391 289L305 316');
    moveMolecules();
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
