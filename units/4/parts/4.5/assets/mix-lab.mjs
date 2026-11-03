import {MIX_SETUP,MIX_KEYS,MIX_SOURCES,SOURCE_LINEAR,arrangeMix,mixSample,mixtureRegions,torchAim} from './mix-optics.mjs?v=mix-front-20261102';

const NAMES=['紅','綠','藍'];
const GUIDE_COLORS=['#ff8072','#8bedaa','#a5caff'];
// Lens centres projected from the same camera/poses used to export the fallback PNGs.
const IMAGE_PIVOT={x:.5,y:.533566923133767};
const IMAGE_LENSES=[{x:.6569610174673752,y:.2900937051775024},{x:.5711946434095605,y:.2758852718060382},{x:.2896874191480514,y:.31584680182345587}];
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
 const scene=root.querySelector('.mix-scene'),guide=document.createElementNS('http://www.w3.org/2000/svg','svg');
 guide.classList.add('mix-drag-guide');guide.setAttribute('aria-hidden','true');guide.setAttribute('hidden','');
 guide.innerHTML=`<defs>
  <linearGradient id="mix-beam-color"><stop stop-color="currentColor" stop-opacity=".85"/><stop offset=".55" stop-color="currentColor" stop-opacity=".5"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient>
  <linearGradient id="mix-beam-light"><stop stop-color="#fff" stop-opacity=".95"/><stop offset=".3" stop-color="currentColor" stop-opacity=".8"/><stop offset=".85" stop-color="currentColor" stop-opacity=".25"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient>
  <filter id="mix-beam-soft" x="-50%" y="-100%" width="200%" height="300%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="3"/></filter>
  <filter id="mix-beam-bloom" x="-50%" y="-100%" width="200%" height="300%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="6"/></filter>
 </defs><g data-guide-beam><path class="mix-beam-bloom" data-beam-layer="outer"/><path class="mix-beam-body" data-beam-layer="body"/><path class="mix-beam-core" data-beam-layer="core"/><ellipse class="mix-beam-emitter" data-beam-emitter cx="0" cy="0"/></g>`;
 scene.append(guide);
 const studios=[];let loadingTorches=false;
 torchButtons.forEach((button,i)=>{
  const image=new URL(`./torch-${MIX_KEYS[i]}.png?v=torch-metal-20261103`,import.meta.url).href;
  button.querySelector('[data-torch-drawing]').innerHTML=`<img src="${image}" width="360" height="260" alt="" aria-hidden="true" data-torch-image><canvas width="360" height="260" aria-hidden="true" data-torch-canvas hidden></canvas>`;
  button.dataset.torchRenderer='image';
 });
 function fallbackTorch(i){const button=torchButtons[i];button.querySelector('[data-torch-image]').hidden=false;button.querySelector('[data-torch-canvas]').hidden=true;button.dataset.torchRenderer='image';refreshTorchPoses();updateGuide();}
 async function loadTorches(){
  if(loadingTorches)return;loadingTorches=true;
  try{
   const module=await import('./torch-studio.mjs?v=mix-soft-beam-20261103');
   torchButtons.forEach((button,i)=>{
    try{const canvas=button.querySelector('[data-torch-canvas]');studios[i]=module.createTorchStudio(canvas,i,{unavailable(){studios[i]?.dispose();studios[i]=null;fallbackTorch(i);},ready(){canvas.hidden=false;button.querySelector('[data-torch-image]').hidden=true;button.dataset.torchRenderer='three';refreshTorchPoses();updateGuide();}});studios[i].update(spots[i]);}
    catch{fallbackTorch(i);}
   });
  }catch{torchButtons.forEach((_,i)=>fallbackTorch(i));}
 }

 function imagePose(i,frame,screen){
  const pivot=IMAGE_PIVOT,lens=IMAGE_LENSES[i],spot=spots[i],x=frame.left+pivot.x*frame.width,y=frame.top+pivot.y*frame.height;
  return Math.atan2(screen.top+spot.y*screen.height-y,screen.left+spot.x*screen.width-x)-Math.atan2((lens.y-pivot.y)*frame.height,(lens.x-pivot.x)*frame.width);
 }
 function refreshTorchPoses(){
  const screen=canvas.getBoundingClientRect();
  torchButtons.forEach((button,i)=>{const image=button.querySelector('[data-torch-image]'),frame=button.querySelector('[data-torch-drawing]').getBoundingClientRect();image.style.transformOrigin=`${IMAGE_PIVOT.x*100}% ${IMAGE_PIVOT.y*100}%`;image.style.transform=`rotate(${imagePose(i,frame,screen)}rad)`;studios[i]?.update(spots[i]);});
 }
 function updateGuide(){
  guide.dataset.lightOn=String(!!drag&&spots[drag.i].on);
  if(!drag?.moved||!spots[drag.i].on){guide.setAttribute('hidden','');return;}
  const i=drag.i,spot=spots[i],button=torchButtons[i],frame=button.querySelector('[data-torch-drawing]').getBoundingClientRect();
  if(!frame.width||!frame.height){guide.setAttribute('hidden','');return;}
  guide.removeAttribute('hidden');const bounds=guide.getBoundingClientRect(),screen=canvas.getBoundingClientRect();
  guide.setAttribute('viewBox',`0 0 ${bounds.width} ${bounds.height}`);guide.dataset.source=MIX_KEYS[i];guide.dataset.lightOn=String(spot.on);guide.style.color=spot.on?GUIDE_COLORS[i]:'#d5dfd4';
  let source;
  if(button.dataset.torchRenderer==='three'&&studios[i]){const lens=studios[i].getLensPosition();source={x:frame.left+lens.x*frame.width,y:frame.top+lens.y*frame.height};}
  else{
   const lens=IMAGE_LENSES[i],pivot=IMAGE_PIVOT,angle=imagePose(i,frame,screen),dx=(lens.x-pivot.x)*frame.width,dy=(lens.y-pivot.y)*frame.height;
   source={x:frame.left+pivot.x*frame.width+dx*Math.cos(angle)-dy*Math.sin(angle),y:frame.top+pivot.y*frame.height+dx*Math.sin(angle)+dy*Math.cos(angle)};
  }
  const sx=source.x-bounds.left,sy=source.y-bounds.top,tx=screen.left-bounds.left+spot.x*screen.width,ty=screen.top-bounds.top+spot.y*screen.height;
  const length=Math.hypot(tx-sx,ty-sy),radius=MIX_SETUP.radius/MIX_SETUP.width*screen.width,aperture=Math.max(1.5,frame.width*.022),beam=guide.querySelector('[data-guide-beam]');
  beam.setAttribute('transform',`translate(${sx} ${sy}) rotate(${Math.atan2(ty-sy,tx-sx)*180/Math.PI})`);
  // Filled, feathered volumes: a broad spill, a narrower body, and a luminous core.
  for(const [layer,spread,start]of[['outer',.68,1.5],['body',.34,1],['core',.12,.7]]){
   const near=aperture*start,far=Math.max(near,radius*spread);
   guide.querySelector(`[data-beam-layer=${layer}]`).setAttribute('d',`M0 ${-near}L${length} ${-far}L${length} ${far}L0 ${near}Z`);
  }
  const emitter=guide.querySelector('[data-beam-emitter]');emitter.setAttribute('rx',aperture*.65);emitter.setAttribute('ry',aperture);
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
  refreshTorchPoses();
  torchButtons.forEach((b,i)=>{
   b.dataset.on=String(spots[i].on);b.setAttribute('aria-label',`${NAMES[i]}色手電筒：拖曳或用方向鍵調整照射位置，目前${spots[i].on?'開啟':'關閉'}，落點橫向${Math.round(spots[i].x*100)}%、縱向${Math.round(spots[i].y*100)}%`);
  });
  for(const b of root.querySelectorAll('[data-lamp]')){const i=MIX_KEYS.indexOf(b.dataset.lamp);b.setAttribute('aria-pressed',String(spots[i].on));b.querySelector('[data-lamp-label]').textContent=`${NAMES[i]}光 ${spots[i].on?'開':'關'}`;}
  for(const b of root.querySelectorAll('[data-preset]'))b.setAttribute('aria-pressed',String(b.dataset.preset===preset));
  const condition=root.querySelector('[data-conditions]');condition.textContent=`紅光：${spots[0].on?'開':'關'}　綠光：${spots[1].on?'開':'關'}　藍光：${spots[2].on?'開':'關'}　白幕：正面觀察`;
  root.closest('section').querySelector('[data-mix-observation]').textContent=message;
  if(announce)root.querySelector('[data-result]').textContent=message;
  canvas.setAttribute('aria-label','同一片白幕的正面：'+message);requestPaint();updateGuide();
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
 window.addEventListener('blur',()=>end(true));
 document.addEventListener('visibilitychange',()=>{if(document.hidden)end(true);});
 const guideResize=new ResizeObserver(()=>{refreshTorchPoses();updateGuide();});guideResize.observe(scene);guideResize.observe(canvas);for(const button of torchButtons)guideResize.observe(button.querySelector('[data-torch-drawing]'));
 for(const b of root.querySelectorAll('[data-pending],[data-torch]'))b.disabled=false;
 root.querySelector('[data-load-note]').hidden=true;root.dataset.ready='true';root.dataset.dragging='false';root.dataset.renderer='front';
 root.dataset.sources=JSON.stringify(MIX_SOURCES);update();
 const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();loadTorches();}},{rootMargin:'180px'});observer.observe(root);
}
