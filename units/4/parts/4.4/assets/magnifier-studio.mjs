import {paintBenchProjection} from './screen-projection.mjs?v=20261104-view-conditions1';
import {createBenchLabels} from './convex-bench-labels.mjs?v=20261104-mag-fixed-eye1';
import {createBenchApparatus} from './convex-bench-scene.mjs?v=20261104-view-conditions1';
import {createBenchArt} from './convex-bench-model.mjs?v=20261104-convex-unified1';
import {MAGNIFIER_HOME,fitMagnifier,clipProjectedRay} from './magnifier-framing.mjs?v=20261104-mag-overview1';
import {createMagnifierWorkspace} from './magnifier-workspace.mjs?v=20261104-mag-overview1';
import {createIncomingBundle} from './magnifier-bundle.mjs?v=20261104-mag-bundle1';
import * as THREE from '../../4.1/assets/vendor/three/build/three.module.js';
import {MAGNIFIER as G,magnifierState,moveMagnifier,magnifierRays,magnifierDisplayRays,eyeRays} from './magnifier-optics.mjs?v=20261104-mag-bundle1';
const root=document.querySelector('[data-magnifier-lab]');
if(root) initialise(root);
function initialise(root){
 const $=s=>root.querySelector(s),$$=s=>[...root.querySelectorAll(s)],canvas=$('#magnifier-canvas');
 let state={object:50,screen:50,eye:G.eye,screenIn:false},showRays=true,extensions=false,point='both',front=false,selected='object',studio=null;
 const distanceLabel=value=>`${Number((value/G.f).toFixed(3))}F`;
 const workspace=createMagnifierWorkspace(root,{G,move,observe(preset){state={object:preset.object,eye:G.eye,screen:50,screenIn:preset.screenIn};if(preset.rays)showRays=true;extensions=false;front=false;selected='object';update();studio?.frameObservation();}});
 const art=createBenchArt();
 const paintBundle=createIncomingBundle(root);
 const eyeCanvas=$('[data-mag-eye]'),reference=$('[data-mag-reference]'),paper=$('[data-mag-paper]');
 eyeCanvas.getContext('2d',{willReadFrequently:true});reference.getContext('2d',{willReadFrequently:true});
 let observerKey='',paperKey='';
 function drawArt(ctx,width,height,factor){ctx.save();ctx.translate(width/2,height/2);ctx.scale(factor*G.cardWidth/art.width,factor*G.cardHeight/art.height);ctx.drawImage(art,-art.width/2,-art.height/2);ctx.restore();}
 function paintObserver(){
  const g=magnifierState(state),key=state.object+'|'+state.eye+'|'+state.screenIn+'|'+state.screen;if(key===observerKey)return g;observerKey=key;const W=eyeCanvas.width,H=eyeCanvas.height,c=eyeCanvas.getContext('2d'),pixels=W/(2*Math.tan(G.fov*Math.PI/360)),r=pixels*G.aperture/(g.eye*G.scale);
  c.clearRect(0,0,W,H);c.fillStyle='#fffdf3';c.fillRect(0,0,W,H);c.save();c.beginPath();c.arc(W/2,H/2,r,0,Math.PI*2);c.clip();c.fillStyle='#fffdf3';c.fillRect(0,0,W,H);
  if(g.blocked){c.fillStyle='#657260';c.fillRect(0,0,W,H);c.strokeStyle='#aebaa4';c.lineWidth=10;c.strokeRect(W*.15,H*.12,W*.7,H*.76);c.fillStyle='#f5f5e5';c.font='24px system-ui';c.textAlign='center';c.fillText('屏幕背面',W/2,H*.48);c.font='20px system-ui';c.fillText('視線被擋住',W/2,H*.56);}
  else if(!g.resolved){
   // Preserve continuity at F; this is an illustrative defocused outline, not a resolved image.
   c.filter=`blur(${g.blurRadius}px)`;drawArt(c,W,H,pixels*g.previewScale);c.filter='none';
  }else drawArt(c,W,H,pixels*g.imageScale);
  c.restore();
  const rc=reference.getContext('2d');rc.clearRect(0,0,reference.width,reference.height);rc.fillStyle='#fffdf3';rc.fillRect(0,0,reference.width,reference.height);drawArt(rc,reference.width,reference.height,pixels*g.referenceScale);
  for(const context of [c,rc]){context.save();context.strokeStyle='#80967855';context.lineWidth=1;context.setLineDash([6,7]);context.beginPath();context.moveTo(12,H/2);context.lineTo(W-12,H/2);context.stroke();context.restore();}
  eyeCanvas.setAttribute('aria-label',g.blocked?'屏幕擋住眼睛視線':!g.resolved?'此眼睛位置無法清楚對焦':g.eyeMode==='parallel'?'同一物點的平行光進入眼睛，眼睛放鬆可看見像在無窮遠':`${g.eyeMode==='real'?'倒立實像':'正立虛像'}，與同一眼睛位置的原物參照比較視角大小`);return g;
 }
 function paintPaper(){const key=state.object+'|'+state.screen;if(key===paperKey)return;paperKey=key;paintBenchProjection(paper,art,G,state);}
 function update(){
  const g=paintObserver();paintBundle({g,G,point,visible:showRays&&!front});if(state.screenIn)paintPaper();$('[data-mag-extensions]').disabled=g.type!=='virtual';
  $('[data-mag-paper-description]').textContent=g.type==='virtual'?'有光到達，但無法直接接到這個正立放大的虛像。':g.type==='infinity'?'各物點出射平行光，有限距離的屏幕接不到清楚像。':g.screenClear?`屏幕已在 ${distanceLabel(g.v)} 接到清楚倒立實像；前方固定眼位能否看清仍要另行判斷。`:`實像在屏幕側${distanceLabel(g.v)}，目前屏幕${distanceLabel(state.screen)}未在清楚像位置。`;
  $('[data-mag-rays]').textContent=showRays?'隱藏輔助光路':'顯示輔助光路';$('[data-mag-rays]').setAttribute('aria-pressed',String(showRays));$('[data-mag-extensions]').textContent=extensions?'隱藏反向延長線':'顯示反向延長線';$('[data-mag-extensions]').setAttribute('aria-pressed',String(extensions));$('[data-mag-trace]').hidden=!showRays;
  $$('[data-mag-point]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.magPoint===point)));
  $('[data-mag-screen]').textContent=state.screenIn?'取下屏幕':'放入屏幕';$('[data-mag-screen]').setAttribute('aria-pressed',String(state.screenIn));$('[data-mag-front]').hidden=!state.screenIn||root.dataset.webgl==='unavailable';$('[data-mag-front]').textContent=front?'返回整體觀察':'正面看屏幕';$('[data-mag-front]').setAttribute('aria-pressed',String(front));
  $('[data-mag-screen-controls]').hidden=!state.screenIn;$('[data-mag-paper-detail]').hidden=!state.screenIn;$('[data-mag-legend]').hidden=!showRays;$('[data-mag-ray-key]').hidden=!showRays;
  $$('[data-mag-distance]').forEach(e=>e.textContent=distanceLabel(state[e.dataset.magDistance]));$('[data-mag-eye-position]').textContent='靠近鏡片・固定';
  $$('[data-mag-device]').forEach(b=>{if(b.getAttribute('role')!=='slider')b.setAttribute('aria-pressed',String(selected===b.dataset.magDevice));b.setAttribute('aria-label',`${b.dataset.magDevice==='object'?'圖卡':b.dataset.magDevice==='eye'?'眼睛':'屏幕'}，${distanceLabel(state[b.dataset.magDevice])}，方向鍵可沿軌道移動`);});
  $$('[data-mag-nudge]').forEach(b=>{const key=b.dataset.magNudge;b.disabled=Number(b.dataset.direction)<0?state[key]<=G[key+'Min']:state[key]>=G[key+'Max'];});
  const size=g.angularGain===null?'':Math.abs(g.angularGain-1)<.02?'視角相近':g.angularGain>1?'比原物大':'比原物小';
  const viewMessage=g.blocked?'屏幕擋住視線':g.eyeMode==='at-image'?'眼睛在實像位置':g.eyeMode==='too-close'?'離實像太近':g.eyeMode==='converging'?'會聚入眼・無法對焦':g.eyeMode==='parallel'?'平行光・像在無窮遠':`${g.eyeMode==='real'?'倒立':'正立'}・${size}`;
  $('[data-mag-eye-badge]').textContent=viewMessage;
  const condition=g.blocked?'屏幕擋住視線，取下後再比較。':g.eyeMode==='virtual'?'正立、放大虛像；屏幕接不到，眼睛仍可看見。':g.eyeMode==='parallel'?'光線平行；留在原位放鬆觀看像在無窮遠。':`仍形成實像；會聚光入眼，此固定眼位無法對焦。`;
  $('[data-mag-condition]').textContent=condition;
  $('[data-mag-eye-note]').textContent=g.blocked?'取下屏幕後再比較。':g.resolved?'相同尺度，直接比較圖案大小。':'光束仍在會聚；模糊程度為示意。';
  root.dataset.blurRadius=g.blurRadius;
  $('[data-mag-ray-name]').textContent=point==='top'?'紅：代表光':point==='bottom'?'藍：代表光':'紅／藍：代表光';
  let message=condition;if(g.type==='virtual')message+=' 這是正立放大虛像，屏幕無法直接接到清楚像。';
  if(extensions&&g.type==='virtual')message+=` 虛線往回交於圖卡同側${distanceLabel(Math.abs(g.v))}，正立放大的透明圖案標示虛像；光沒有真的在那裡會聚。`;
  if(showRays&&point!=='both')message+=point==='top'?' 紅線來自圖卡上端。':' 藍線來自圖卡下端。';$('[data-result]').textContent=message;
  $('[data-mag-label=virtual]').textContent=g.type==='virtual'?`虛像・圖卡側${distanceLabel(Math.abs(g.v))}`:'';
  root.dataset.screenClear=g.screenClear;root.dataset.rayRegime=g.type==='virtual'?'diverging':g.type==='infinity'?'parallel':'converging';root.dataset.eye=G.eye;root.dataset.object=state.object;root.dataset.screen=state.screen;root.dataset.screenIn=state.screenIn;root.dataset.rays=showRays;root.dataset.extensions=extensions;root.dataset.point=point;root.dataset.view=front?'screen':'orbit';root.dataset.imageType=g.type;root.dataset.eyeMode=g.eyeMode;root.dataset.imageScale=g.imageScale??'';root.dataset.referenceScale=g.referenceScale;root.dataset.angularGain=g.angularGain??'';root.dataset.virtualX=g.type==='virtual'?g.v*G.scale:'';
  canvas.setAttribute('aria-label',`立體放大鏡觀察台，物距${distanceLabel(state.object)}，固定透鏡與眼睛，只移動圖卡，${state.screenIn?'屏幕已插入光路':condition}，右側同步顯示眼睛視角`);workspace.update(state,showRays,extensions);studio?.update();
 }
 function clearGestureNotice(){$('[data-mag-gesture-note]').hidden=true;$$('[data-mag-ruler]').forEach(r=>r.removeAttribute('data-guided'));}
 function showGestureNotice(key){const note=$('[data-mag-gesture-note]');note.textContent=key==='eye'?'眼睛固定，請移動圖卡比較光路與大小。':key==='lens'?'凸透鏡是固定的。':`請使用下方${key==='object'?'圖卡':key==='eye'?'眼睛':'比較屏幕'}位置尺調整。`;note.hidden=false;$$('[data-mag-ruler]').forEach(r=>r.toggleAttribute('data-guided',r.dataset.magRuler===key));}
 function move(key,value){if(!['object','screen'].includes(key))return;clearGestureNotice();state=moveMagnifier(state,key,value);if(state.object>=G.f)extensions=false;selected=key;update();}
 $('[data-mag-rays]').addEventListener('click',()=>{showRays=!showRays;if(!showRays)extensions=false;update();});$('[data-mag-extensions]').addEventListener('click',()=>{extensions=!extensions;if(extensions)showRays=true;update();studio?.frameObservation();});
 $('[data-mag-screen]').addEventListener('click',()=>{state={...state,screenIn:!state.screenIn};front=false;if(!state.screenIn)selected='object';update();});$('[data-mag-front]').addEventListener('click',()=>{front=!front;update();});
 $$('[data-mag-point]').forEach(b=>b.addEventListener('click',()=>{point=b.dataset.magPoint;update();}));
 $$('[data-mag-device]').forEach(b=>{const key=b.dataset.magDevice;b.addEventListener('click',()=>{selected=key;update();});b.addEventListener('keydown',e=>{let v=state[key];if(e.key==='Home')v=G[key+'Min'];else if(e.key==='End')v=G[key+'Max'];else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))v+=(['ArrowLeft','ArrowDown'].includes(e.key)?-1:1)*(key==='object'?-1:1)*(e.shiftKey?.2:1);else return;e.preventDefault();move(key,v);});});
 $$('[data-mag-nudge]').forEach(b=>b.addEventListener('click',()=>move(b.dataset.magNudge,state[b.dataset.magNudge]+Number(b.dataset.direction))));
 try{studio=createStudio();root.dataset.webgl='ready';}catch(error){canvas.hidden=true;$('[data-mag-fallback]').hidden=false;$$('.magnifier-anchor,.magnifier-focus').forEach(e=>e.hidden=true);root.dataset.webgl='unavailable';console.warn('Magnifier 3D:',error.message);}
 update();root.dataset.ready='true';
 function createStudio(){
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const scene=new THREE.Scene();scene.background=new THREE.Color('#566b5b');scene.fog=new THREE.Fog('#566b5b',35,80);
  const camera=new THREE.PerspectiveCamera(39,1,.03,120),target=new THREE.Vector3( .7,1.6,0);let orbit={...MAGNIFIER_HOME},fitRadius=6,pending=0,viewport=null;
  const {source,lens,lensGroup,screen,screenPlane,projectedTexture,artTex,eye}=createBenchApparatus(THREE,scene,G,art,paper,{withEye:true});const eyeMark=eye.getObjectByName('eye-marker');eyeMark.scale.setScalar(1.35);eyeMark.position.x*=1.35;
  const virtualImage=new THREE.Group();virtualImage.name='magnifier-virtual-image';virtualImage.visible=false;scene.add(virtualImage);
  const virtualArt=new THREE.Mesh(new THREE.PlaneGeometry(G.cardWidth,G.cardHeight),new THREE.MeshBasicMaterial({map:artTex,transparent:true,opacity:.72,depthWrite:false,depthTest:false,side:THREE.DoubleSide,toneMapped:false}));virtualArt.renderOrder=8;virtualImage.add(virtualArt);
  const virtualOutline=new THREE.Line(new THREE.BufferGeometry().setFromPoints([[-G.cardWidth/2,-G.cardHeight/2,0],[-G.cardWidth/2,G.cardHeight/2,0],[G.cardWidth/2,G.cardHeight/2,0],[G.cardWidth/2,-G.cardHeight/2,0],[-G.cardWidth/2,-G.cardHeight/2,0]].map(p=>new THREE.Vector3(...p))),new THREE.LineDashedMaterial({color:'#eaf2d8',dashSize:.055,gapSize:.035,transparent:true,opacity:.85,depthWrite:false,depthTest:false,toneMapped:false}));virtualOutline.computeLineDistances();virtualOutline.renderOrder=9;virtualImage.add(virtualOutline);
  const rays=new THREE.Group(),extensionGroup=new THREE.Group(),receivedRays=new THREE.Group();scene.add(rays,extensionGroup,receivedRays);const highlight=new THREE.BoxHelper(source,'#d8eaa0');highlight.visible=false;scene.add(highlight);
  function clear(group){for(const m of [...group.children]){m.geometry?.dispose();m.material?.dispose();group.remove(m);}}
  function updateRays(){clear(rays);clear(extensionGroup);clear(receivedRays);receivedRays.visible=showRays&&!front;rays.visible=showRays&&!front;extensionGroup.visible=extensions&&!front;
   if(!showRays)return;
   for(const r of magnifierDisplayRays(state,point)){const color=r.name==='top'?'#f4a17e':'#88c7ee';for(const [from,to]of [[r.from,r.lens],[r.lens,r.end]]){const A=new THREE.Vector3(...from),B=new THREE.Vector3(...to),tube=new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(A,B),1,.009,6,false),new THREE.MeshBasicMaterial({color,toneMapped:false}));tube.userData={name:r.name,from,to};rays.add(tube);const arrow=new THREE.Mesh(new THREE.ConeGeometry(.036,.13,10),new THREE.MeshBasicMaterial({color,toneMapped:false}));arrow.position.copy(A).lerp(B,.62);arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),B.clone().sub(A).normalize());rays.add(arrow);}
    if(extensions&&r.virtual){const A=new THREE.Vector3(...r.lens),B=new THREE.Vector3(...r.virtual);const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([A,B]),new THREE.LineDashedMaterial({color,dashSize:.07,gapSize:.05,transparent:true,opacity:.8}));line.computeLineDistances();line.userData={name:r.name,from:A.toArray(),to:B.toArray()};extensionGroup.add(line);}
   }
  }
  function updateReceived(){for(const r of eyeRays(state,point)){const A=new THREE.Vector3(...r.from),B=new THREE.Vector3(...r.to),line=new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(A,B),1,.012,6,false),new THREE.MeshBasicMaterial({color:'#fff0a6',toneMapped:false}));line.userData=r;receivedRays.add(line);}}
  function fitToViewport(){fitRadius=fitMagnifier(THREE,camera,target);}
  function updateCamera(){
   if(front){const d=1.1;camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(Math.max(G.screenHeight+.65,(G.screenWidth+.6)/camera.aspect)/(2*d)));camera.position.set(state.screen*G.scale-d,G.axis,0);camera.lookAt(state.screen*G.scale,G.axis,0);}
   else{camera.fov=38;const direction=new THREE.Vector3(Math.sin(orbit.polar)*Math.sin(orbit.azimuth),Math.cos(orbit.polar),Math.sin(orbit.polar)*Math.cos(orbit.azimuth));camera.position.copy(target).addScaledVector(direction,fitRadius*orbit.zoom);camera.lookAt(target);}
   camera.far=Math.max(120,fitRadius*6);camera.updateProjectionMatrix();
   if(viewport){const r=canvas.getBoundingClientRect(),p=camera.projectionMatrix.elements;p[0]*=viewport.width/r.width;p[5]*=viewport.height/r.height;p[8]=1-2*(viewport.left+viewport.width/2)/r.width;p[9]=2*(viewport.top+viewport.height/2)/r.height-1;camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();}
   camera.updateMatrixWorld();virtualImage.rotation.y=Math.atan2(camera.position.x-virtualImage.position.x,camera.position.z-virtualImage.position.z);virtualImage.updateMatrixWorld(true);
  }
  const labels=createBenchLabels({THREE,root,canvas,camera,virtualImage,G,state:()=>magnifierState(state),viewport:()=>viewport,front:()=>front,rays:()=>showRays,receiver:()=>state.eye,receiverName:'固定眼睛',lightPaths:()=>showRays?[...magnifierDisplayRays(state,point),...eyeRays(state,point)]:[]});
  function annotations(){
   const r=canvas.getBoundingClientRect(),overlay=$('[data-mag-ray-edges]');overlay.setAttribute('viewBox',`0 0 ${r.width} ${r.height}`);overlay.replaceChildren();
   const placedArrows=[];const project=p=>{const v=new THREE.Vector3(...p).project(camera);return{x:(v.x+1)*r.width/2,y:(1-v.y)*r.height/2,z:v.z};};
   if(showRays&&!front)for(const ray of magnifierDisplayRays(state,point)){const a=project(ray.lens),b=project(ray.end),cut=clipProjectedRay(a,b,{left:8,top:viewport.top,width:r.width-16,height:r.height-viewport.top-44});if(!cut||(state.screenIn&&!cut.clipped)||a.z< -1||a.z>1)continue;if(magnifierState(state).type==='real'&&placedArrows.some(p=>p.name===ray.name&&Math.hypot(p.x-cut.end.x,p.y-cut.end.y)<12))continue;placedArrows.push({...cut.end,name:ray.name});const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy),ux=dx/length,uy=dy/length,p=cut.end,path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',`M${p.x-ux*11-uy*5},${p.y-uy*11+ux*5} L${p.x},${p.y} L${p.x-ux*11+uy*5},${p.y-uy*11-ux*5}`);path.setAttribute('stroke',ray.name==='top'?'#f4a17e':'#88c7ee');path.setAttribute('data-continuation',ray.name);overlay.append(path);}
   const focus=$('[data-mag-focus]');if(!focus.hidden)focus.style.top=Math.max(viewport.top+focus.offsetHeight/2,parseFloat(focus.style.top)-26)+'px';
   const image=magnifierState(state);if(image.type==='real'&&!image.blocked&&!front){const p=project([image.v*G.scale,G.axis+image.m*G.pointTop,0]);if(p.x<0||p.x>r.width||p.y<0||p.y>r.height)$('[data-mag-condition]').textContent=`實像在畫面外 ${distanceLabel(image.v)}；會聚光入眼，此眼位無法對焦。`;}
   const link=$('[data-mag-bundle-link]');link.replaceChildren();link.hidden=!showRays||front||image.blocked;
   if(!link.hidden){const eyePoint=project([G.eye*G.scale,G.axis,0]),column=link.getBoundingClientRect();link.setAttribute('viewBox',`0 0 ${r.width} ${column.height}`);if(eyePoint.z< -1||eyePoint.z>1||eyePoint.x<8||eyePoint.x>r.width-8||eyePoint.y<8||eyePoint.y>r.height-12)link.hidden=true;else{const ns='http://www.w3.org/2000/svg',circle=document.createElementNS(ns,'circle'),line=document.createElementNS(ns,'path');circle.setAttribute('cx',eyePoint.x);circle.setAttribute('cy',eyePoint.y);circle.setAttribute('r',8);line.setAttribute('d',`M${eyePoint.x+6} ${eyePoint.y+6}L${r.width-10} ${r.height-8}V${r.height+23}`);link.append(circle,line);}}
   for(const [i,key]of ['object','lens','eye'].entries()){const e=$(`[data-mag-apparatus=${key}]`),x=key==='object'?-state.object*G.scale:key==='eye'?G.eye*G.scale:0,p=project([x,.22,1.05]);e.hidden=front||p.z< -1||p.z>1;if(e.hidden)continue;const outside=p.x<20||p.x>r.width-20;e.textContent=outside&&key==='object'?`圖卡在畫面外・${distanceLabel(state.object)}`:key==='object'?'圖卡':key==='lens'?'透鏡':'眼睛';const half=e.offsetWidth/2+5;e.style.left=Math.max(half,Math.min(r.width-half,p.x))+'px';e.style.top=Math.min(r.height-44,p.y+(i===1?8:28))+'px';}
  }
  function draw(){pending=0;renderer.render(scene,camera);labels();annotations();}
  function requestDraw(){labels();annotations();if(!pending)pending=requestAnimationFrame(draw);}
  function syncScene(){const g=magnifierState(state);eye.position.x=state.eye*G.scale;virtualImage.visible=extensions&&g.type==='virtual'&&!front;if(g.type==='virtual'){virtualImage.position.set(g.v*G.scale,G.axis,0);virtualImage.scale.set(g.m,g.m,1);}source.position.x=-state.object*G.scale;screen.position.x=state.screen*G.scale;screen.visible=state.screenIn;projectedTexture.needsUpdate=true;updateRays();if(showRays&&!front)updateReceived();updateCamera();scene.updateMatrixWorld(true);highlight.update();requestDraw();}
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
