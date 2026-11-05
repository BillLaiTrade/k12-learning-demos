import {MIX_SETUP,footprint} from './mix-optics.mjs';
import {PRIMARY_KEYS,SECONDARY_KEYS,PROBE_SETUP,COLOUR_OPTIONS,DUO_LIGHTS as LIGHTS,PROBE_LINEAR,lightComponents,probeColourName} from './duo-quiz-model.mjs?v=compound-light-20261105';

// The same lens/pivot coordinates as section 3's PNG fallback.
const PIVOT={x:.5,y:.533566923133767};
const LENSES=[{x:.6569610174673752,y:.2900937051775024},{x:.5711946434095605,y:.2758852718060382},{x:.2896874191480514,y:.31584680182345587}];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const srgb=v=>{v=clamp(v,0,1);return v<=.0031308?v*12.92:1.055*v**(1/2.4)-.055;};
export function initialiseDuoProbe(root){
 const $=s=>root.querySelector(s),canvas=$('[data-duo-probe]'),ctx=canvas.getContext('2d'),scene=$('.duo-probe-scene'),buttons=[...root.querySelectorAll('[data-probe-torch]')];
 let lamps=[{colour:'red',x:.4,y:.5,on:true},{colour:'blue',x:.6,y:.5,on:true}],preset='pairs',drag=null,suppressClick=null,frame=0,loading=false,disposed=false;
 const studios=[],failed=new Set(),pixels=ctx.createImageData(canvas.width,canvas.height);
 const svg=()=>document.createElementNS('http://www.w3.org/2000/svg','svg'),filters=svg(),guide=svg();
 filters.classList.add('mix-torch-filters');filters.setAttribute('aria-hidden','true');filters.innerHTML=`<defs><filter id="duo-torch-gold" x="-30%" y="-40%" width="160%" height="180%" color-interpolation-filters="sRGB">
  <feComponentTransfer in="SourceAlpha" result="body"><feFuncA type="discrete" tableValues="0 0 0 0 0 1 1 1 1 1"/></feComponentTransfer>
  <feMorphology in="body" operator="dilate" radius="1.5" result="expanded"/>
  <feComposite in="expanded" in2="body" operator="out" result="rim"/>
  <feGaussianBlur in="expanded" stdDeviation="4" result="bloom"/>
  <feFlood flood-color="#efb642" flood-opacity=".85" result="gold"/>
  <feComposite in="gold" in2="bloom" operator="in" result="halo"/>
  <feFlood flood-color="#fff0bd" flood-opacity="1" result="edge"/>
  <feComposite in="edge" in2="rim" operator="in" result="outline"/>
  <feMerge><feMergeNode in="halo"/><feMergeNode in="outline"/><feMergeNode in="SourceGraphic"/></feMerge>
 </filter></defs>`;
 guide.classList.add('mix-drag-guide');guide.setAttribute('aria-hidden','true');guide.setAttribute('hidden','');guide.innerHTML=`<defs>
  <linearGradient id="duo-beam-color"><stop stop-color="currentColor" stop-opacity=".85"/><stop offset=".55" stop-color="currentColor" stop-opacity=".5"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient>
  <linearGradient id="duo-beam-light"><stop stop-color="#fff" stop-opacity=".95"/><stop offset=".3" stop-color="currentColor" stop-opacity=".8"/><stop offset=".85" stop-color="currentColor" stop-opacity=".25"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient>
  <filter id="duo-beam-soft" x="-50%" y="-100%" width="200%" height="300%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="3"/></filter>
  <filter id="duo-beam-bloom" x="-50%" y="-100%" width="200%" height="300%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="6"/></filter>
 </defs><g data-guide-beam><path class="mix-beam-bloom" data-beam-layer="outer"/><path class="mix-beam-body" data-beam-layer="body"/><path class="mix-beam-core" data-beam-layer="core"/><ellipse class="mix-beam-emitter" data-beam-emitter cx="0" cy="0"/></g>`;scene.append(filters,guide);
 function imagePose(i,box,screen){const lens=LENSES[LIGHTS[lamps[i].colour].torchIndex],x=box.left+PIVOT.x*box.width,y=box.top+PIVOT.y*box.height;return Math.atan2(screen.top+lamps[i].y*screen.height-y,screen.left+lamps[i].x*screen.width-x)-Math.atan2((lens.y-PIVOT.y)*box.height,(lens.x-PIVOT.x)*box.width);}
 function refreshPoses(){const screen=canvas.getBoundingClientRect();buttons.forEach((b,i)=>{const image=b.querySelector('img'),box=b.querySelector('.torch-drawing').getBoundingClientRect();image.style.transformOrigin=`${PIVOT.x*100}% ${PIVOT.y*100}%`;image.style.transform=`rotate(${imagePose(i,box,screen)}rad)`;studios[i]?.update(lamps[i],LIGHTS[lamps[i].colour].band);});}
 function updateGuide(){
  guide.dataset.lightOn=String(!!drag&&lamps[drag.i].on);
  if(!drag?.moved||!lamps[drag.i].on){guide.setAttribute('hidden','');return;}
  const i=drag.i,lamp=lamps[i],b=buttons[i],box=b.querySelector('.torch-drawing').getBoundingClientRect(),screen=canvas.getBoundingClientRect();
  if(!box.width||!box.height){guide.setAttribute('hidden','');return;}
  guide.removeAttribute('hidden');const bounds=guide.getBoundingClientRect();guide.setAttribute('viewBox',`0 0 ${bounds.width} ${bounds.height}`);guide.style.color=LIGHTS[lamp.colour].guide;guide.dataset.source=lamp.colour;
  let source;
  if(b.dataset.torchRenderer==='three'&&studios[i]){const lens=studios[i].getLensPosition();source={x:box.left+lens.x*box.width,y:box.top+lens.y*box.height};}
  else {const lens=LENSES[LIGHTS[lamp.colour].torchIndex],angle=imagePose(i,box,screen),dx=(lens.x-PIVOT.x)*box.width,dy=(lens.y-PIVOT.y)*box.height;source={x:box.left+PIVOT.x*box.width+dx*Math.cos(angle)-dy*Math.sin(angle),y:box.top+PIVOT.y*box.height+dx*Math.sin(angle)+dy*Math.cos(angle)};}
  const sx=source.x-bounds.left,sy=source.y-bounds.top,tx=screen.left-bounds.left+lamp.x*screen.width,ty=screen.top-bounds.top+lamp.y*screen.height,length=Math.hypot(tx-sx,ty-sy),radius=PROBE_SETUP.radius/PROBE_SETUP.width*screen.width,aperture=Math.max(1.5,box.width*.022);
  guide.querySelector('[data-guide-beam]').setAttribute('transform',`translate(${sx} ${sy}) rotate(${Math.atan2(ty-sy,tx-sx)*180/Math.PI})`);
  for(const [layer,spread,start]of[['outer',.68,1.5],['body',.34,1],['core',.12,.7]]){const near=aperture*start,far=Math.max(near,radius*spread);guide.querySelector(`[data-beam-layer=${layer}]`).setAttribute('d',`M0 ${-near}L${length} ${-far}L${length} ${far}L0 ${near}Z`);}
  const emitter=guide.querySelector('[data-beam-emitter]');emitter.setAttribute('rx',aperture*.65);emitter.setAttribute('ry',aperture);
 }
 function paint(){frame=0;const data=pixels.data,P=PROBE_SETUP,centres=lamps.map(s=>[s.x*P.width,s.y*P.height]),sources=lamps.map(s=>PROBE_LINEAR[s.colour]);
  for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){const px=(x+.5)/canvas.width*P.width,py=(y+.5)/canvas.height*P.height,a=lamps[0].on?clamp((1-Math.hypot(px-centres[0][0],py-centres[0][1])/P.radius)/P.edge,0,1):0,b=lamps[1].on?clamp((1-Math.hypot(px-centres[1][0],py-centres[1][1])/P.radius)/P.edge,0,1):0,at=(y*canvas.width+x)*4;for(let c=0;c<3;c++)data[at+c]=Math.round(255*srgb(MIX_SETUP.ambient+MIX_SETUP.exposure*(a*sources[0][c]+b*sources[1][c])));data[at+3]=255;}
  ctx.putImageData(pixels,0,0);
  updateObservation();
 }
 function updateObservation(){
  const result=$('[data-probe-result]'),active=lamps.filter(s=>s.on),name=key=>COLOUR_OPTIONS.find(c=>c[0]===key)[1],css=rgb=>`rgb(${rgb.join(', ')})`,setText=(node,text)=>{if(node.textContent!==text)node.textContent=text;};
  const sample=(x,y)=>{const at=(clamp(Math.floor(y*canvas.height),0,canvas.height-1)*canvas.width+clamp(Math.floor(x*canvas.width),0,canvas.width-1))*4;return[...pixels.data.slice(at,at+3)];};
  lamps.forEach((lamp,i)=>{const chip=$(`[data-probe-source="${i}"]`),rgb=PROBE_LINEAR[lamp.colour].map(v=>Math.round(255*srgb(PROBE_SETUP.ambient+PROBE_SETUP.exposure*v)));chip.dataset.on=String(lamp.on);chip.querySelector('i').style.backgroundColor=css(rgb);setText(chip.querySelector('[data-source-name]'),LIGHTS[lamp.colour].name+(lamp.on?'':'（關閉）'));});
  let phase,label,note,swatches;
  if(!active.length){phase='off';label='無色光';note='兩盞燈皆關閉，目前沒有色光照到白幕。';swatches=[sample(.5,.5)];}
  else if(active.length===1){const lamp=active[0],index=lamps.indexOf(lamp);phase='single';label=name(lamp.colour);note=`目前只有手電筒 ${index?'B':'A'} 的${LIGHTS[lamp.colour].name}照到白幕。`;swatches=[sample(lamp.x,lamp.y)];}
  else{
   const [a,b]=lamps,distance=Math.hypot((a.x-b.x)*PROBE_SETUP.width,(a.y-b.y)*PROBE_SETUP.height),overlaps=distance<2*PROBE_SETUP.radius-1e-7;
   if(!overlaps){phase='apart';label='尚未重疊';note=`光斑尚未重疊，白幕上分別呈${name(a.colour)}、${name(b.colour)}。`;swatches=lamps.map(s=>sample(s.x,s.y));}
   else{
    const x=Math.floor((a.x+b.x)/2*canvas.width),y=Math.floor((a.y+b.y)/2*canvas.height);let best=null,score=0;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const px=(clamp(x+dx,0,canvas.width-1)+.5)/canvas.width,py=(clamp(y+dy,0,canvas.height-1)+.5)/canvas.height,weight=Math.min(footprint(px,py,a),footprint(px,py,b));if(weight>score){score=weight;best=[px,py];}}
    if(!best){phase='edge';label='邊緣接近';note='光斑邊緣剛開始接觸，繼續靠近可比較混色。';swatches=[sample((a.x+b.x)/2,(a.y+b.y)/2)];}
    else{phase=distance<1e-7?'together':'overlap';label=probeColourName(sample(...best));note=phase==='together'?`兩束光完全重疊，重疊處呈${label}。`:a.colour===b.colour?`兩束${LIGHTS[a.colour].name}重疊後仍呈${label}；未重疊處也是${label}。`:`重疊處呈${label}；未重疊處仍是${name(a.colour)}、${name(b.colour)}。`;swatches=[sample(...best)];}
   }
  }
  result.dataset.phase=phase;setText($('[data-probe-operator]'),phase==='apart'?'／':'＋');setText($('[data-probe-result-name]'),label);setText($('[data-probe-result-note]'),note);
  [0,1].forEach(i=>{const swatch=$(`[data-probe-result-swatch="${i}"]`);swatch.hidden=!swatches[i];if(swatches[i])swatch.style.backgroundColor=css(swatches[i]);});
  canvas.setAttribute('aria-describedby','duo-probe-result-note');result.hidden=false;
 }
 function update(){
  root.dataset.probe=JSON.stringify(lamps);root.dataset.probePreset=preset;root.dataset.probeDragging=String(!!drag?.moved);
  buttons.forEach((b,i)=>{const lamp=lamps[i],name=`手電筒 ${i?'B':'A'}・${LIGHTS[lamp.colour].name}`,image=b.querySelector('img'),src=new URL(`./torch-${PRIMARY_KEYS[LIGHTS[lamp.colour].torchIndex]}.png`,import.meta.url).href;if(image.src!==src)image.src=src;b.style.setProperty('--torch-color',LIGHTS[lamp.colour].guide);b.querySelector('.torch-name').textContent=name;b.dataset.on=String(lamp.on);b.setAttribute('aria-pressed',String(lamp.on));b.setAttribute('aria-label',`${name}，目前${lamp.on?'開啟':'關閉'}；點按開關，拖曳或方向鍵調整照射位置，橫向${Math.round(lamp.x*100)}%、縱向${Math.round(lamp.y*100)}%`);});
  root.querySelectorAll('[data-probe-colour]').forEach(b=>b.setAttribute('aria-pressed',String(lamps[Number(b.dataset.probeLamp)].colour===b.dataset.probeColour)));
  root.querySelectorAll('[data-probe-compound]').forEach(select=>select.value=PRIMARY_KEYS.includes(lamps[Number(select.dataset.probeCompound)].colour)?'':lamps[Number(select.dataset.probeCompound)].colour);
  root.querySelectorAll('[data-probe-preset]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.probePreset===preset)));
  const description=lamps.map((s,i)=>`手電筒${i?'B':'A'}的${LIGHTS[s.colour].name}${s.on?'開啟':'關閉'}`).join('、');canvas.setAttribute('aria-label',`正面白幕：${description}。拖動下方手電筒調整光斑重疊。`);$('[data-probe-status]').textContent=description;
  refreshPoses();updateGuide();if(!frame)frame=requestAnimationFrame(paint);
 }
 function end(cancel=false){if(!drag)return;const current=drag;drag=null;if(current.moved||cancel)suppressClick=current.button;if(cancel){lamps[current.i]={...current.before};preset=current.preset;}current.button.removeAttribute('data-dragging');if(current.button.hasPointerCapture(current.id))current.button.releasePointerCapture(current.id);update();}
 buttons.forEach((b,i)=>{
  b.dataset.torchRenderer='image';
  b.addEventListener('pointerdown',e=>{if(e.button!==0||!e.isPrimary||drag)return;e.preventDefault();suppressClick=null;b.setAttribute('data-pointer-focus','');b.focus({preventScroll:true});const box=canvas.getBoundingClientRect();drag={i,id:e.pointerId,button:b,x:e.clientX,y:e.clientY,before:{...lamps[i]},preset,width:box.width,height:box.height,moved:false};b.setPointerCapture(e.pointerId);});
  b.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId||drag.button!==b)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(!drag.moved&&Math.hypot(dx,dy)<4)return;drag.moved=true;b.dataset.dragging='true';lamps[i].x=clamp(drag.before.x+dx/drag.width,.05,.95);lamps[i].y=clamp(drag.before.y+dy/drag.height,.08,.92);preset='custom';update();});
  for(const type of['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,e=>{if(drag?.id===e.pointerId&&drag.button===b)end(type!=='pointerup');});
  b.addEventListener('blur',()=>b.removeAttribute('data-pointer-focus'));
  b.addEventListener('keydown',e=>{if(e.key==='Escape'&&drag){e.preventDefault();end(true);return;}const d={ArrowLeft:[-.025,0],ArrowRight:[.025,0],ArrowUp:[0,-.025],ArrowDown:[0,.025]}[e.key];b.removeAttribute('data-pointer-focus');if(!d&&e.key!=='Home')return;e.preventDefault();end(true);if(d){lamps[i].x=clamp(lamps[i].x+d[0],.05,.95);lamps[i].y=clamp(lamps[i].y+d[1],.08,.92);}else lamps[i].x=lamps[i].y=.5;preset='custom';update();});
  b.addEventListener('click',e=>{if(e.detail!==0&&suppressClick===b){suppressClick=null;return;}end(true);lamps[i].on=!lamps[i].on;update();});
 });
 root.querySelectorAll('[data-probe-compound]').forEach(select=>{for(const key of[...SECONDARY_KEYS,'white']){const option=document.createElement('option');option.value=key;option.textContent=`${LIGHTS[key].name}（${lightComponents(key).replaceAll('光','')}）`;select.append(option);}select.addEventListener('change',()=>{if(!select.value)return;end(true);lamps[Number(select.dataset.probeCompound)].colour=select.value;update();});});
 root.querySelectorAll('[data-probe-colour]').forEach(b=>b.addEventListener('click',()=>{end(true);lamps[Number(b.dataset.probeLamp)].colour=b.dataset.probeColour;update();}));
 function arrange(kind){const positions={apart:[[.25,.5],[.75,.5]],pairs:[[.4,.5],[.6,.5]],together:[[.5,.5],[.5,.5]]}[kind];lamps.forEach((s,i)=>{s.x=positions[i][0];s.y=positions[i][1];});preset=kind;}
 root.querySelectorAll('[data-probe-preset]').forEach(b=>b.addEventListener('click',()=>{end(true);arrange(b.dataset.probePreset);update();}));
 function fallback(i){studios[i]?.dispose();studios[i]=null;failed.add(i);const b=buttons[i];b.querySelector('img').hidden=false;b.querySelector('canvas').hidden=true;b.dataset.torchRenderer='image';refreshPoses();updateGuide();}
 async function loadTorches(){if(loading||disposed)return;loading=true;try{const module=await import('./torch-studio.mjs?v=duo-free-torches-compound-20261105');if(disposed)return;buttons.forEach((b,i)=>{if(failed.has(i))return;try{const c=b.querySelector('canvas');studios[i]=module.createTorchStudio(c,LIGHTS[lamps[i].colour].torchIndex,{screen:canvas,unavailable(){fallback(i);},ready(){c.hidden=false;b.querySelector('img').hidden=true;b.dataset.torchRenderer='three';refreshPoses();updateGuide();}});studios[i].update(lamps[i],LIGHTS[lamps[i].colour].band);}catch{fallback(i);}});}catch{buttons.forEach((_,i)=>fallback(i));}}
 const onBlur=()=>end(true),onVisibility=()=>{if(document.hidden)end(true);};addEventListener('blur',onBlur);document.addEventListener('visibilitychange',onVisibility);
 const resize=new ResizeObserver(()=>{refreshPoses();updateGuide();});resize.observe(scene);resize.observe(canvas);buttons.forEach(b=>resize.observe(b.querySelector('.torch-drawing')));
 const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();loadTorches();}},{rootMargin:'180px'});observer.observe(scene);
 $('[data-probe-static]').setAttribute('hidden','');update();
 return{suspend(){end(true);},reproduce(colours){end(true);colours.forEach((colour,i)=>Object.assign(lamps[i],{colour,on:true}));arrange('pairs');update();buttons[0].focus({preventScroll:true});$('[data-probe-help]').textContent='已重現本題燈色。這裡只看白幕混光，未套用題目的色片與紙張；可拖曳調整光斑。';},dispose(){disposed=true;end(true);cancelAnimationFrame(frame);resize.disconnect();observer.disconnect();studios.forEach(s=>s?.dispose());removeEventListener('blur',onBlur);document.removeEventListener('visibilitychange',onVisibility);}};
}
