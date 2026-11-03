import {MIX_SETUP,MIX_KEYS,MIX_SOURCES,SOURCE_LINEAR,arrangeMix,mixSample,mixtureRegions,torchAim} from './mix-optics.mjs?v=mix-front-20261102';

const NAMES=['紅','綠','藍'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const srgb=v=>{v=clamp(v,0,1);return v<=.0031308?v*12.92:1.055*v**(1/2.4)-.055;};

function observation(spots,regions){
 const active=spots.flatMap((s,i)=>s.on?[i]:[]);
 if(!active.length)return'三支手電筒都關閉了，白幕上沒有這三支燈照出的光斑。';
 if(active.length===1)return`只開${NAMES[active[0]]}光時，白幕上只看到${NAMES[active[0]]}色光斑。`;
 if(regions.includes(7))return'重疊的地方顏色變了，三色一起照的共同區看起來是白色！';
 const pairs=[[3,'紅光和綠光重疊處看起來是黃色'],[5,'紅光和藍光重疊處看起來是洋紅色'],[6,'綠光和藍光重疊處看起來是青色']].filter(([mask])=>regions.includes(mask)).map(([,s])=>s);
 if(pairs.length)return pairs.join('；')+'。';
 return'光斑分開時，可以分別看到每支手電筒原本的色光。';
}

export function initialiseFrontMix(root){
 const canvas=root.querySelector('[data-mix]'),ctx=canvas.getContext('2d'),torchButtons=[...root.querySelectorAll('[data-torch]')];
 let spots=arrangeMix(),preset='pairs',drag=null,frame=0;
 const studios=[],defaultAim=arrangeMix().map((spot,i)=>torchAim(i,spot));let loadingTorches=false;
 torchButtons.forEach((button,i)=>{
  const image=new URL(`./torch-${MIX_KEYS[i]}.png?v=torch-metal-20261103`,import.meta.url).href;
  button.querySelector('[data-torch-drawing]').innerHTML=`<img src="${image}" width="360" height="260" alt="" aria-hidden="true" data-torch-image><canvas width="360" height="260" aria-hidden="true" data-torch-canvas hidden></canvas>`;
  button.dataset.torchRenderer='image';
 });
 function fallbackTorch(i){const button=torchButtons[i];button.querySelector('[data-torch-image]').hidden=false;button.querySelector('[data-torch-canvas]').hidden=true;button.dataset.torchRenderer='image';}
 async function loadTorches(){
  if(loadingTorches)return;loadingTorches=true;
  try{
   const module=await import('./torch-studio.mjs?v=torch-metal-20261103');
   torchButtons.forEach((button,i)=>{
    try{const canvas=button.querySelector('[data-torch-canvas]');studios[i]=module.createTorchStudio(canvas,i,{unavailable(){studios[i]?.dispose();studios[i]=null;fallbackTorch(i);},ready(){canvas.hidden=false;button.querySelector('[data-torch-image]').hidden=true;button.dataset.torchRenderer='three';}});studios[i].update(spots[i]);}
    catch{fallbackTorch(i);}
   });
  }catch{torchButtons.forEach((_,i)=>fallbackTorch(i));}
 }

 const pixels=ctx.createImageData(canvas.width,canvas.height),{width,height,radius,edge,ambient,exposure}=MIX_SETUP;
 function paint(){
  frame=0;
  const centers=spots.map(s=>[s.x*width,s.y*height,s.on]),buffer=pixels.data;
  const weights=new Float64Array(3),base=Math.round(255*srgb(ambient));
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   for(let i=0;i<3;i++){const[cx,cy,on]=centers[i],dx=x+.5-cx,dy=y+.5-cy;weights[i]=on?clamp((1-Math.sqrt(dx*dx+dy*dy)/radius)/edge,0,1):0;}
   const at=(y*width+x)*4;
   if(weights[0]===0&&weights[1]===0&&weights[2]===0)buffer[at]=buffer[at+1]=buffer[at+2]=base;
   else for(let c=0;c<3;c++)buffer[at+c]=Math.round(255*srgb(ambient+exposure*(weights[0]*SOURCE_LINEAR[0][c]+weights[1]*SOURCE_LINEAR[1][c]+weights[2]*SOURCE_LINEAR[2][c])));
   buffer[at+3]=255;
  }
  ctx.putImageData(pixels,0,0);root.dataset.paintedSpots=JSON.stringify(spots);
 }
 function requestPaint(){if(!frame)frame=requestAnimationFrame(paint);}
 function update(announce=true){
  const regions=mixtureRegions(spots),message=observation(spots,regions);
  root.dataset.spots=JSON.stringify(spots);root.dataset.preset=preset;root.dataset.center=JSON.stringify(mixSample(.5,.5,spots).linear);root.dataset.regions=JSON.stringify(regions);
  root.dataset.aim=JSON.stringify(spots.map((s,i)=>torchAim(i,s)));
  torchButtons.forEach((b,i)=>{
   const aim=torchAim(i,spots[i]);b.querySelector('[data-torch-image]').style.transform=`rotate(${((aim.angle-defaultAim[i].angle)*.28).toFixed(2)}deg)`;
   studios[i]?.update(spots[i]);b.dataset.on=String(spots[i].on);b.setAttribute('aria-label',`${NAMES[i]}色手電筒：拖曳或用方向鍵調整照射位置，目前${spots[i].on?'開啟':'關閉'}，落點橫向${Math.round(spots[i].x*100)}%、縱向${Math.round(spots[i].y*100)}%`);
  });
  for(const b of root.querySelectorAll('[data-lamp]')){const i=MIX_KEYS.indexOf(b.dataset.lamp);b.setAttribute('aria-pressed',String(spots[i].on));b.querySelector('[data-lamp-label]').textContent=`${NAMES[i]}光 ${spots[i].on?'開':'關'}`;}
  for(const b of root.querySelectorAll('[data-preset]'))b.setAttribute('aria-pressed',String(b.dataset.preset===preset));
  const condition=root.querySelector('[data-conditions]');condition.textContent=`紅光：${spots[0].on?'開':'關'}　綠光：${spots[1].on?'開':'關'}　藍光：${spots[2].on?'開':'關'}　白幕：正面觀察`;
  root.closest('section').querySelector('[data-mix-observation]').textContent=message;
  if(announce)root.querySelector('[data-result]').textContent=message;
  canvas.setAttribute('aria-label','同一片白幕的正面：'+message);requestPaint();
 }
 function end(cancel=false){
  if(!drag)return;const current=drag;drag=null;
  if(cancel){spots[current.i]={...current.before};preset=current.preset;}
  root.dataset.dragging='false';current.button.removeAttribute('data-dragging');
  if(current.button.hasPointerCapture(current.id))current.button.releasePointerCapture(current.id);
  update();
 }
 torchButtons.forEach((button,i)=>{
  button.addEventListener('pointerdown',e=>{
   if(e.button!==0||drag)return;e.preventDefault();button.focus({preventScroll:true});
   const box=canvas.getBoundingClientRect();drag={i,id:e.pointerId,button,x:e.clientX,y:e.clientY,before:{...spots[i]},preset,width:box.width,height:box.height,moved:false};button.setPointerCapture(e.pointerId);
  });
  button.addEventListener('pointermove',e=>{
   if(!drag||drag.id!==e.pointerId||drag.button!==button)return;
   const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(!drag.moved&&Math.hypot(dx,dy)<4)return;
   drag.moved=true;root.dataset.dragging='true';button.dataset.dragging='true';
   spots[i].x=clamp(drag.before.x+dx/drag.width,.05,.95);spots[i].y=clamp(drag.before.y+dy/drag.height,.08,.92);preset='custom';update(false);
  });
  for(const event of['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,e=>{if(drag?.id===e.pointerId&&drag.button===button)end(event!=='pointerup');});
  button.addEventListener('keydown',e=>{
   const d={ArrowLeft:[-.025,0],ArrowRight:[.025,0],ArrowUp:[0,-.025],ArrowDown:[0,.025]}[e.key];
   if(e.key==='Escape'&&drag){e.preventDefault();end(true);return;}
   if(!d)return;e.preventDefault();end(true);spots[i].x=clamp(spots[i].x+d[0],.05,.95);spots[i].y=clamp(spots[i].y+d[1],.08,.92);preset='custom';update();
  });
 });
 root.addEventListener('click',e=>{
  const b=e.target.closest('button[data-lamp],button[data-preset]');if(!b||b.disabled)return;end(true);
  if(b.hasAttribute('data-preset')){preset=b.dataset.preset;spots=arrangeMix(preset,spots);}
  else{const i=MIX_KEYS.indexOf(b.dataset.lamp);spots[i].on=!spots[i].on;}update();
 });
 for(const b of root.querySelectorAll('[data-pending],[data-torch]'))b.disabled=false;
 root.querySelector('[data-load-note]').hidden=true;root.dataset.ready='true';root.dataset.dragging='false';root.dataset.renderer='front';
 root.dataset.sources=JSON.stringify(MIX_SOURCES);update();
 const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();loadTorches();}},{rootMargin:'180px'});observer.observe(root);
}
