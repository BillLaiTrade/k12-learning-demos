import {createBenchLabels} from './convex-bench-labels.mjs?v=20261104-bench-proportion1';
import {createBenchApparatus} from './convex-bench-scene.mjs?v=20261104-lens-clear5';
import {createBenchArt} from './convex-bench-model.mjs?v=20261104-bench-proportion1';
import {MAGNIFIER_HOME,fitMagnifier,clipProjectedRay} from './magnifier-framing.mjs?v=20261104-bench-proportion1';
import {createMagnifierWorkspace} from './magnifier-workspace.mjs?v=20261104-mag-virtual1';
import * as THREE from '../../4.1/assets/vendor/three/build/three.module.js';
import {MAGNIFIER as G,magnifierState,moveMagnifier,magnifierDisplayRays} from './magnifier-optics.mjs?v=20261104-mag-virtual1';
const root=document.querySelector('[data-magnifier-lab]');
if(root) initialise(root);
function initialise(root){
 const $=s=>root.querySelector(s),$$=s=>[...root.querySelectorAll(s)],canvas=$('#magnifier-canvas');
 let state={object:50,screen:50,eye:G.eye,screenIn:false},showRays=false,extensions=false,point='both',front=false,selected='object',studio=null;
 const distanceLabel=value=>`${Number((value/G.f).toFixed(3))}F`;
 const workspace=createMagnifierWorkspace(root,{G,move,observe(preset){state={object:preset.object,eye:G.eye,screen:50,screenIn:preset.screenIn};if(preset.rays)showRays=true;front=false;selected='object';update();studio?.frameObservation();}});
 const art=createBenchArt();
 const eyeCanvas=$('[data-mag-eye]'),reference=$('[data-mag-reference]');
 eyeCanvas.getContext('2d',{willReadFrequently:true});reference.getContext('2d',{willReadFrequently:true});
 let observerKey='';
 function drawArt(ctx,width,height,factor){ctx.save();ctx.translate(width/2,height/2);ctx.scale(factor*G.cardWidth/art.width,factor*G.cardHeight/art.height);ctx.drawImage(art,-art.width/2,-art.height/2);ctx.restore();}
 function paintObserver(){
  const g=magnifierState(state),key=state.object+'|'+state.eye+'|'+state.screenIn+'|'+state.screen;if(key===observerKey)return g;observerKey=key;const W=eyeCanvas.width,H=eyeCanvas.height,c=eyeCanvas.getContext('2d'),pixels=W/(2*Math.tan(G.fov*Math.PI/360)),r=pixels*G.aperture/(g.eye*G.opticalScale);
  c.clearRect(0,0,W,H);c.fillStyle='#fffdf3';c.fillRect(0,0,W,H);c.save();c.beginPath();c.arc(W/2,H/2,r,0,Math.PI*2);c.clip();c.fillStyle='#fffdf3';c.fillRect(0,0,W,H);
  if(g.blocked){c.fillStyle='#657260';c.fillRect(0,0,W,H);c.strokeStyle='#aebaa4';c.lineWidth=10;c.strokeRect(W*.15,H*.12,W*.7,H*.76);c.fillStyle='#f5f5e5';c.font='24px system-ui';c.textAlign='center';c.fillText('屏幕背面',W/2,H*.48);c.font='20px system-ui';c.fillText('視線被擋住',W/2,H*.56);}
  else if(!g.resolved){
   // Preserve continuity at F; this is an illustrative defocused outline, not a resolved image.
   c.filter=`blur(${g.blurRadius}px)`;drawArt(c,W,H,pixels*g.previewScale);c.filter='none';
  }else drawArt(c,W,H,pixels*g.imageScale);
  c.restore();
  const rc=reference.getContext('2d');rc.clearRect(0,0,reference.width,reference.height);rc.fillStyle='#fffdf3';rc.fillRect(0,0,reference.width,reference.height);drawArt(rc,reference.width,reference.height,pixels*g.referenceScale);
  for(const context of [c,rc]){context.save();context.strokeStyle='#80967855';context.lineWidth=1;context.setLineDash([6,7]);context.beginPath();context.moveTo(12,H/2);context.lineTo(W-12,H/2);context.stroke();context.restore();}
  eyeCanvas.setAttribute('aria-label',g.blocked?'屏幕擋住眼睛視線':!g.resolved?'此眼睛位置無法清楚對焦':g.eyeMode==='parallel'?'圖卡在F，眼睛留在原位放鬆觀看':`${g.eyeMode==='real'?'倒立實像':'正立虛像'}，與同一眼睛位置的原物參照比較視角大小`);return g;
 }
 function update(){
  const g=paintObserver(),activeExtensions=showRays&&extensions&&g.type==='virtual';
  $('[data-mag-extensions]').hidden=!showRays;$('[data-mag-extensions]').disabled=g.type!=='virtual';$('[data-mag-extensions]').setAttribute('aria-pressed',String(activeExtensions));$('[data-mag-extensions]').textContent=activeExtensions?'隱藏反向延長線':'顯示反向延長線';$('[data-mag-extension-key]').hidden=!activeExtensions;
  $('[data-mag-rays]').textContent=showRays?'隱藏輔助光路':'顯示輔助光路';$('[data-mag-rays]').setAttribute('aria-pressed',String(showRays));$('[data-mag-trace]').hidden=!showRays;
  $$('[data-mag-point]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.magPoint===point)));
  $('[data-mag-ray-key]').hidden=!showRays;$('[data-mag-legend]').hidden=!showRays;
  $('[data-mag-distance=object]').textContent=distanceLabel(state.object);$('[data-mag-eye-position]').textContent='靠近鏡片・固定';
  $('[data-mag-device=object]').setAttribute('aria-label',`圖卡，距離透鏡${distanceLabel(state.object)}，方向鍵可沿軌道移動`);
  const size=g.angularGain===null?'':Math.abs(g.angularGain-1)<.02?'視角相近':g.angularGain>1?'比原物大':'比原物小';
  $('[data-mag-eye-badge]').textContent=g.eyeMode==='converging'?'此固定眼位無法清楚對焦':g.eyeMode==='parallel'?'可放鬆觀看':`正立・${size}`;
  const condition=g.type==='virtual'?'圖卡在 F 內，可當放大鏡使用。':g.type==='infinity'?'圖卡恰好在 F，可留在原位放鬆觀看。':'圖卡已超過 F；此固定眼位無法清楚對焦。';
  $('[data-mag-condition]').textContent=condition;
  $('[data-mag-eye-note]').textContent=g.type==='virtual'?(showRays?'看到的，就是主圖標示的虛像。':'透過鏡片看見的是正立放大的虛像。'):g.resolved?'相同尺度，直接比較圖案大小。':'模糊程度為示意。';
  root.dataset.blurRadius=g.blurRadius;
  $('[data-mag-ray-name]').textContent=point==='top'?'紅：代表光':point==='bottom'?'藍：代表光':'紅／藍：代表光';
  $('[data-result]').textContent=condition;
  root.dataset.screenClear=g.screenClear;root.dataset.rayRegime=g.type==='virtual'?'diverging':g.type==='infinity'?'parallel':'converging';root.dataset.eye=G.eye;root.dataset.object=state.object;root.dataset.screen=state.screen;root.dataset.screenIn=state.screenIn;root.dataset.rays=showRays;root.dataset.extensions=activeExtensions;root.dataset.point=point;root.dataset.view=front?'screen':'orbit';root.dataset.imageType=g.type;root.dataset.eyeMode=g.eyeMode;root.dataset.imageScale=g.imageScale??'';root.dataset.referenceScale=g.referenceScale;root.dataset.angularGain=g.angularGain??'';root.dataset.virtualX=g.type==='virtual'?g.v*G.scale:'';
  canvas.setAttribute('aria-label',`立體放大鏡觀察台，物距${distanceLabel(state.object)}，固定透鏡與眼睛，只移動圖卡，${condition}`);workspace.update(state);studio?.update();
 }
 function clearGestureNotice(){$('[data-mag-gesture-note]').hidden=true;$$('[data-mag-ruler]').forEach(r=>r.removeAttribute('data-guided'));}
 function showGestureNotice(key){const note=$('[data-mag-gesture-note]');note.textContent=key==='eye'?'眼睛固定，請移動圖卡比較光路與大小。':key==='lens'?'凸透鏡是固定的。':`請使用下方${key==='object'?'圖卡':key==='eye'?'眼睛':'比較屏幕'}位置尺調整。`;note.hidden=false;$$('[data-mag-ruler]').forEach(r=>r.toggleAttribute('data-guided',r.dataset.magRuler===key));}
 function move(key,value){if(key!=='object')return;clearGestureNotice();state=moveMagnifier(state,key,value);selected=key;update();}
 $("[data-mag-rays]").addEventListener('click',()=>{showRays=!showRays;extensions=showRays;update();studio?.frameObservation();});
 $('[data-mag-extensions]').addEventListener('click',()=>{extensions=!extensions;update();});
 $('[data-mag-compare-screen]').addEventListener('click',()=>document.querySelector('#lab4 [data-imaging-keypoint=inside] button')?.click());
 $$('[data-mag-point]').forEach(b=>b.addEventListener('click',()=>{point=b.dataset.magPoint;update();}));
 $$('[data-mag-device]').forEach(b=>{const key=b.dataset.magDevice;b.addEventListener('click',()=>{selected=key;update();});b.addEventListener('keydown',e=>{let v=state[key];if(e.key==='Home')v=G[key+'Min'];else if(e.key==='End')v=G[key+'Max'];else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))v+=(['ArrowLeft','ArrowDown'].includes(e.key)?-1:1)*(key==='object'?-1:1)*(e.shiftKey?.2:1);else return;e.preventDefault();move(key,v);});});
 try{studio=createStudio();root.dataset.webgl='ready';}catch(error){canvas.hidden=true;$('[data-mag-fallback]').hidden=false;$$('.magnifier-anchor,.magnifier-focus').forEach(e=>e.hidden=true);root.dataset.webgl='unavailable';console.warn('Magnifier 3D:',error.message);}
 update();root.dataset.ready='true';
 function createStudio(){
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const scene=new THREE.Scene();scene.background=new THREE.Color('#566b5b');scene.fog=new THREE.Fog('#566b5b',35,80);
  const camera=new THREE.PerspectiveCamera(39,1,.03,120),target=new THREE.Vector3( .7,1.6,0);let orbit={...MAGNIFIER_HOME},fitRadius=6,pending=0,viewport=null;
  const {source,lens,lensGroup,screen,screenPlane,projectedTexture,artTex,eye}=createBenchApparatus(THREE,scene,G,art,art,{withEye:true});const eyeMark=eye.getObjectByName('eye-marker');eyeMark.scale.setScalar(1.35);eyeMark.position.x*=1.35;
  const virtualImage=new THREE.Group();virtualImage.name='magnifier-virtual-image';virtualImage.visible=false;scene.add(virtualImage);
  const virtualArt=new THREE.Mesh(new THREE.PlaneGeometry(G.cardWidth,G.cardHeight),new THREE.MeshBasicMaterial({map:artTex,transparent:true,opacity:.72,depthWrite:false,depthTest:false,side:THREE.DoubleSide,toneMapped:false}));virtualArt.renderOrder=8;virtualImage.add(virtualArt);
  const virtualOutline=new THREE.Line(new THREE.BufferGeometry().setFromPoints([[-.2*G.cardWidth,-G.cardHeight/2,0],[-.2*G.cardWidth,G.cardHeight/2,0],[.2*G.cardWidth,G.cardHeight/2,0],[.2*G.cardWidth,-G.cardHeight/2,0],[-.2*G.cardWidth,-G.cardHeight/2,0]].map(p=>new THREE.Vector3(...p))),new THREE.LineDashedMaterial({color:'#eaf2d8',dashSize:.055,gapSize:.035,transparent:true,opacity:.85,depthWrite:false,depthTest:false,toneMapped:false}));virtualOutline.computeLineDistances();virtualOutline.renderOrder=9;virtualImage.add(virtualOutline);
  const rays=new THREE.Group(),extensionGroup=new THREE.Group(),receivedRays=new THREE.Group();scene.add(rays,extensionGroup,receivedRays);const highlight=new THREE.BoxHelper(source,'#d8eaa0');highlight.visible=false;scene.add(highlight);
  function clear(group){for(const m of [...group.children]){m.geometry?.dispose();m.material?.dispose();group.remove(m);}}
  function updateRays(){clear(rays);clear(extensionGroup);clear(receivedRays);receivedRays.visible=false;rays.visible=showRays&&!front;extensionGroup.visible=showRays&&extensions&&magnifierState(state).type==='virtual'&&!front;
   if(!showRays)return;
   for(const r of magnifierDisplayRays(state,point)){const color=r.name==='top'?'#f4a17e':'#88c7ee';for(const [from,to]of [[r.from,r.lens],[r.lens,r.end]]){const A=new THREE.Vector3(...from),B=new THREE.Vector3(...to),tube=new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(A,B),1,.009,6,false),new THREE.MeshBasicMaterial({color,toneMapped:false}));tube.userData={name:r.name,from,to};rays.add(tube);const arrow=new THREE.Mesh(new THREE.ConeGeometry(.036,.13,10),new THREE.MeshBasicMaterial({color,toneMapped:false}));arrow.position.copy(A).lerp(B,.62);arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),B.clone().sub(A).normalize());rays.add(arrow);}
    if(extensions&&r.virtual){const A=new THREE.Vector3(...r.lens),B=new THREE.Vector3(...r.virtual);const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([A,B]),new THREE.LineDashedMaterial({color,dashSize:.07,gapSize:.05,transparent:true,opacity:.85,depthTest:false,depthWrite:false}));line.computeLineDistances();line.renderOrder=10;line.userData={name:r.name,from:A.toArray(),to:B.toArray()};extensionGroup.add(line);}
   }
  }
  function fitToViewport(){fitRadius=fitMagnifier(THREE,camera,target);}
  function updateCamera(){
   if(front){const d=1.1;camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(Math.max(G.screenHeight+.65,(G.screenWidth+.6)/camera.aspect)/(2*d)));camera.position.set(state.screen*G.scale-d,G.axis,0);camera.lookAt(state.screen*G.scale,G.axis,0);}
   else{camera.fov=38;const direction=new THREE.Vector3(Math.sin(orbit.polar)*Math.sin(orbit.azimuth),Math.cos(orbit.polar),Math.sin(orbit.polar)*Math.cos(orbit.azimuth));camera.position.copy(target).addScaledVector(direction,fitRadius*orbit.zoom);camera.lookAt(target);}
   camera.far=Math.max(120,fitRadius*6);camera.updateProjectionMatrix();
   if(viewport){const r=canvas.getBoundingClientRect(),p=camera.projectionMatrix.elements;p[0]*=viewport.width/r.width;p[5]*=viewport.height/r.height;p[8]=1-2*(viewport.left+viewport.width/2)/r.width;p[9]=2*(viewport.top+viewport.height/2)/r.height-1;camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();}
   camera.updateMatrixWorld();virtualImage.rotation.y=Math.atan2(camera.position.x-virtualImage.position.x,camera.position.z-virtualImage.position.z);virtualImage.updateMatrixWorld(true);
  }
  const labels=createBenchLabels({THREE,root,canvas,camera,virtualImage,G,state:()=>magnifierState(state),viewport:()=>viewport,front:()=>front,rays:()=>showRays,receiver:()=>state.eye,receiverName:'固定眼睛',lightPaths:()=>showRays?magnifierDisplayRays(state,point):[]});
  function annotations(){
   const r=canvas.getBoundingClientRect(),overlay=$('[data-mag-ray-edges]');overlay.setAttribute('viewBox',`0 0 ${r.width} ${r.height}`);overlay.replaceChildren();
   const placedArrows=[];const project=p=>{const v=new THREE.Vector3(...p).project(camera);return{x:(v.x+1)*r.width/2,y:(1-v.y)*r.height/2,z:v.z};};
   if(showRays&&!front)for(const ray of magnifierDisplayRays(state,point)){const a=project(ray.lens),b=project(ray.end),cut=clipProjectedRay(a,b,{left:8,top:viewport.top,width:r.width-16,height:r.height-viewport.top-44});if(!cut||(state.screenIn&&!cut.clipped)||a.z< -1||a.z>1)continue;if(magnifierState(state).type==='real'&&placedArrows.some(p=>p.name===ray.name&&Math.hypot(p.x-cut.end.x,p.y-cut.end.y)<12))continue;placedArrows.push({...cut.end,name:ray.name});const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy),ux=dx/length,uy=dy/length,p=cut.end,path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',`M${p.x-ux*11-uy*5},${p.y-uy*11+ux*5} L${p.x},${p.y} L${p.x-ux*11+uy*5},${p.y-uy*11-ux*5}`);path.setAttribute('stroke',ray.name==='top'?'#f4a17e':'#88c7ee');path.setAttribute('data-continuation',ray.name);overlay.append(path);}
   const focus=$('[data-mag-focus]');if(!focus.hidden)focus.style.top=Math.max(viewport.top+focus.offsetHeight/2,parseFloat(focus.style.top)-26)+'px';
   const occupied=[...root.querySelectorAll('[data-mag-focus]')].filter(e=>!e.hidden).map(e=>{const b=e.getBoundingClientRect();return {left:b.left-r.left,right:b.right-r.left,top:b.top-r.top,bottom:b.bottom-r.top};});
   for(const [i,key]of ['object','lens','eye'].entries()){const e=$(`[data-mag-apparatus=${key}]`),x=key==='object'?-state.object*G.scale:key==='eye'?G.eye*G.scale:0,p=project([x,.22,1.05]);e.hidden=front||p.z< -1||p.z>1;if(e.hidden)continue;const outside=p.x<20||p.x>r.width-20;e.textContent=outside&&key==='object'?`圖卡在畫面外・${distanceLabel(state.object)}`:key==='object'?'圖卡':key==='lens'?'凸透鏡':'眼睛';const half=e.offsetWidth/2+5;const xPos=Math.max(half,Math.min(r.width-half,p.x)),h=e.offsetHeight,w=e.offsetWidth,base=p.y+(i===1?8:28),candidates=[0,24,-24,48,-48,72,-72].map(d=>{const y=Math.max(viewport.top+h/2,Math.min(r.height-44,base+d));return {left:xPos-w/2,right:xPos+w/2,top:y-h/2,bottom:y+h/2,y};}),chosen=candidates.find(a=>!occupied.some(b=>a.left<b.right+3&&a.right>b.left-3&&a.top<b.bottom+3&&a.bottom>b.top-3))||candidates[0];e.style.left=xPos+'px';e.style.top=chosen.y+'px';occupied.push(chosen);}
  }
  function draw(){pending=0;renderer.render(scene,camera);labels();annotations();}
  function requestDraw(){labels();annotations();if(!pending)pending=requestAnimationFrame(draw);}
  function syncScene(){const g=magnifierState(state);eye.position.x=state.eye*G.scale;virtualImage.visible=showRays&&g.type==='virtual'&&!front;if(g.type==='virtual'){virtualImage.position.set(g.v*G.scale,G.axis,0);virtualImage.scale.set(g.m,g.m,1);}source.position.x=-state.object*G.scale;screen.position.x=state.screen*G.scale;screen.visible=state.screenIn;updateRays();updateCamera();scene.updateMatrixWorld(true);highlight.update();requestDraw();}
  const devices={object:source,screen,eye,lens:lensGroup},pointers=new Map(),raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let gesture=null;
  function ray(e){const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);raycaster.setFromCamera(pointer,camera);}
  function hit(e){if(front)return null;ray(e);const h=raycaster.intersectObjects(Object.values(devices).filter(group=>group.visible),true)[0];if(!h)return null;let group=h.object;while(group.parent!==scene&&group.parent)group=group.parent;return {...h,key:Object.keys(devices).find(key=>devices[key]===group)};}
  const pinch=()=>{const p=[...pointers.values()];return p.length<2?0:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);};
  canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);if(pointers.size>1){clearGestureNotice();gesture={kind:'pinch',distance:pinch(),zoom:orbit.zoom};return;}const h=hit(e);if(!h)clearGestureNotice();gesture={kind:h?'apparatus':'orbit',key:h?.key,startX:e.clientX,startY:e.clientY,azimuth:orbit.azimuth,polar:orbit.polar};});
  canvas.addEventListener('pointermove',e=>{
   if(!pointers.has(e.pointerId)){canvas.style.cursor=hit(e)?'help':'grab';return;}pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(!gesture)return;
   if(pointers.size>1){if(gesture.kind!=='pinch')return;front=false;orbit.zoom=clampZoom(gesture.zoom*gesture.distance/Math.max(pinch(),1));update();return;}
   if(gesture.kind==='pinch')return;
   if(gesture.kind==='apparatus'){if(Math.hypot(e.clientX-gesture.startX,e.clientY-gesture.startY)>=4)showGestureNotice(gesture.key);return;}
   front=false;orbit.azimuth=gesture.azimuth-(e.clientX-gesture.startX)*.005;orbit.polar=THREE.MathUtils.clamp(gesture.polar+(e.clientY-gesture.startY)*.004,.25,1.55);update();
  });
  const clampZoom=value=>THREE.MathUtils.clamp(value,.2,2.2);
  function stop(e){pointers.delete(e.pointerId);gesture=null;canvas.style.cursor='grab';}
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,stop);
  canvas.addEventListener('wheel',e=>{e.preventDefault();clearGestureNotice();if(front)return;orbit.zoom=THREE.MathUtils.clamp(orbit.zoom+e.deltaY*.001,.2,2.2);update();},{passive:false});
  canvas.addEventListener('keydown',e=>{const steps={ArrowLeft:[.06,0],ArrowRight:[-.06,0],ArrowUp:[0,-.05],ArrowDown:[0,.05]};if(!steps[e.key])return;e.preventDefault();front=false;orbit.azimuth=orbit.azimuth+steps[e.key][0];orbit.polar=THREE.MathUtils.clamp(orbit.polar+steps[e.key][1],.25,1.55);update();});
  function resize(){const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(r.width,r.height,false);workspace.layout();viewport=workspace.safeRect();camera.aspect=viewport.width/viewport.height;fitToViewport();updateCamera();requestDraw();}new ResizeObserver(resize).observe(canvas);resize();
  function frameObservation(){orbit.zoom=1;resize();}
  return {update:syncScene,frameObservation,target,virtualImage,virtualArt,virtualOutline,scene,camera,renderer,source,lens,screen,screenPlane,rays,extensionGroup,devices,eye,receivedRays};
 }
}
