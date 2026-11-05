/* Qualitative flow overlays, not a CFD or temperature measurement.
   The same observation clock drives the moving arrows and revealed observations. */
(() => {
  'use strict';
  const root = document.getElementById('convection-lab');
  if (!root) return;
  const $ = id => document.getElementById(id);
  const play = $('convection-play');
  const heater = $('convection-heater');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const paths = ['left', 'right'].map(side => ({node:$(`convection-${side}`), length:0}));
  const arrows = [...root.querySelectorAll('[data-flow-arrow]')].map(node => ({
    node, path:paths[node.dataset.flowArrow === 'left' ? 0 : 1], phase:Number(node.dataset.phase),
    outline:node.querySelector('.convection-arrow-outline'), tail:node.querySelector('.convection-arrow-tail'), head:node.querySelector('.convection-arrow-head')
  }));
  const routes = {
    water: [
      'M480 404C468 375 494 305 465 267C440 228 366 219 302 236C234 254 224 306 239 352C253 395 336 410 402 410C442 412 469 409 480 404Z',
      'M520 404C532 375 506 305 535 267C560 228 634 219 698 236C766 254 776 306 761 352C747 395 664 410 598 410C558 412 531 409 520 404Z'
    ],
    air: [
      'M480 427C463 380 488 280 456 223C425 166 333 144 252 166C178 186 178 296 190 382C205 476 314 517 416 520L480 520Z',
      'M520 427C537 380 512 280 544 223C575 166 667 144 748 166C822 186 822 296 810 382C795 476 686 517 584 520L520 520Z'
    ]
  };
  const copy = {
    water:{name:'水',scene:'玻璃容器中的水',heater:'底部加熱',device:'電熱板',hint:'沿著箭頭，觀察受熱處的水與周圍的水各往哪裡移動。'},
    air:{name:'空氣',scene:'房間剖面',heater:'暖氣機',device:'暖氣機',hint:'空氣本身看不見；箭頭顯示暖氣機附近與房間周圍空氣的流動。'}
  };
  const assets = Object.fromEntries(['water','air'].map(key => [key,{
    image:$(`convection-${key}-photo`), source:$(`convection-${key}-photo`).dataset.src,
    status:'idle', request:0
  }]));
  let medium = 'water', time = 0, playing = false, frame = 0, previous = null;
  const warm = [206,125,62], cool = [47,99,140];
  function setText(id, text) { const node=$(id); if(node.textContent!==text)node.textContent=text; }
  function configureRoutes() {
    paths.forEach((path,i)=>{path.node.setAttribute('d',routes[medium][i]);path.length=path.node.getTotalLength();});
    $('convection-motion').setAttribute('clip-path',`url(#convection-${medium}-mask)`);
  }
  function drawArrows() {
    arrows.forEach(({node,path,phase,outline,tail,head})=>{
      const progress=(time/12+phase)%1, end=progress*path.length, length=medium==='water'?108:145;
      const points=[];
      for(let i=0;i<=8;i++){
        const distance=(end-length+length*i/8+path.length)%path.length;
        const p=path.node.getPointAtLength(distance);
        points.push(`${i?'L':'M'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`);
      }
      const trail=points.join('');
      outline.setAttribute('d',trail);tail.setAttribute('d',trail);
      const p=path.node.getPointAtLength(end), next=path.node.getPointAtLength((end+2)%path.length);
      const angle=Math.atan2(next.y-p.y,next.x-p.x)*180/Math.PI;
      head.setAttribute('transform',`translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) rotate(${angle.toFixed(1)})`);
      const warmth=Math.max(0,Math.min(1,1-Math.abs(p.x-500)/170));
      head.setAttribute('fill',`rgb(${cool.map((v,i)=>Math.round(v+(warm[i]-v)*warmth)).join(',')})`);
      node.dataset.progress=progress.toFixed(4);
    });
  }
  function render() {
    const text=copy[medium], started=time>0||playing, asset=assets[medium];
    root.dataset.medium=medium;root.dataset.playing=String(playing);root.dataset.elapsed=time.toFixed(3);
    root.dataset.started=String(started);root.dataset.assets=asset.status;
    root.dataset.stage=!started?'ready':time<3?'rising':time<12?'circulating':'observed';
    root.setAttribute('aria-busy',String(asset.status==='loading'));
    $('convection-water-scene').toggleAttribute('hidden',medium!=='water');
    $('convection-air-scene').toggleAttribute('hidden',medium!=='air');
    $('convection-power-off').toggleAttribute('hidden',started);
    setText('convection-heater-label',text.heater);setText('convection-hint',text.hint);
    $('convection-motion').setAttribute('opacity',started&&asset.status==='ready'?'1':'0');
    root.querySelectorAll('button[data-medium]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.medium===medium)));
    drawArrows();
    setText('convection-step-1',!started?'受熱處的流體會往哪裡動？':`受熱的${text.name}膨脹，密度變小，逐漸上升。`);
    setText('convection-step-2',time<3?'流到上方後，會往哪裡去？':`較暖的${text.name}流向周圍，並向較冷的周圍散熱。`);
    setText('convection-step-3',time<6?'周圍的流體會怎麼補入？':`較冷、密度較大的${text.name}下沉，補入下方受熱處，形成循環。`);
    const note=!started?`點擊${text.device}或按下「開始觀察」，留意受熱處與兩側的流動。`
      :time<3?`受熱的${text.name}膨脹、密度變小，逐漸上升。`
      :time<6?`較暖的${text.name}向周圍流動，並向較冷的周圍散熱。`
      :`受熱的${text.name}上升，周圍較冷的${text.name}下沉補入，形成循環。`;
    setText('convection-note',note);
    setText('convection-status',!started?'尚未開始':playing?'觀察進行中':'觀察已暫停');
    setText('convection-play',playing?'暫停觀察':time>0?'繼續觀察':'開始觀察');
    heater.disabled=play.disabled=asset.status!=='ready';
    const heaterAction=`點擊${text.device}，開始或繼續觀察${text.name}的流動`;
    heater.setAttribute('aria-label',heaterAction);heater.title=heaterAction;
    play.setAttribute('aria-pressed',String(playing));
    $('convection-discovery').hidden=time<12;
    $('convection-apparatus').setAttribute('aria-label',`${text.scene}：${text.heater}，${started?'箭頭顯示中央上升、兩側下沉的自然對流示意。':'尚未開始觀察。'}`);
    setText('convection-loading-text',asset.status==='error'?'觀察場景未能載入，請重新載入或切換另一種流體。':'觀察場景載入中…');
    $('convection-retry').hidden=asset.status!=='error';
  }
  function tick(now) {
    if(!playing)return;
    const dt=previous===null?0:Math.max(0,Math.min(.05,(now-previous)/1000));previous=now;
    time+=dt*(reduced.matches?.55:1);render();frame=requestAnimationFrame(tick);
  }
  function stop(){playing=false;cancelAnimationFrame(frame);frame=0;previous=null;render();}
  function reset(){stop();time=0;render();}
  async function loadScene(key,retry=false){
    const asset=assets[key];
    if(!retry&&(asset.status==='ready'||asset.status==='loading')){render();return;}
    const request=++asset.request,url=asset.source+(retry?`&retry=${request}`:'');asset.status='loading';render();
    try{
      await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>image.naturalWidth?resolve():reject();image.onerror=reject;image.src=url;});
      if(request!==asset.request)return;
      asset.image.setAttribute('href',url);asset.status='ready';
    }catch{if(request!==asset.request)return;asset.status='error';}
    if(key===medium)render();
  }
  function start(){
    if(playing||assets[medium].status!=='ready')return;
    playing=true;previous=null;render();frame=requestAnimationFrame(tick);
  }
  play.addEventListener('click',()=>{if(playing)stop();else start();});
  heater.addEventListener('click',start);
  $('convection-reset').addEventListener('click',reset);
  root.querySelectorAll('button[data-medium]').forEach(button=>button.addEventListener('click',()=>{
    if(medium===button.dataset.medium)return;
    stop();medium=button.dataset.medium;time=0;root.querySelector('details').open=false;
    configureRoutes();render();loadScene(medium);
  }));
  $('convection-retry').addEventListener('click',()=>loadScene(medium,true));
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  addEventListener('pagehide',stop);
  configureRoutes();render();loadScene(medium);
})();
