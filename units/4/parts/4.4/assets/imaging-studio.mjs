import {paintBenchProjection} from './screen-projection.mjs?v=20261104-bench-proportion1';
import {createBenchLabels} from './convex-bench-labels.mjs?v=20261104-bench-proportion1';
import {bindBenchRuler} from './convex-bench-workspace.mjs?v=20261104-imaging-focus1';
import {createBenchApparatus} from './convex-bench-scene.mjs?v=20261104-lens-solid4';
import {BENCH_HOME,createBenchArt} from './convex-bench-model.mjs?v=20261104-bench-proportion1';
import {fitBench} from './convex-bench-workspace.mjs?v=20261104-imaging-focus1';
import {createImagingWorkspace} from './imaging-workspace.mjs?v=20261104-imaging-focus1';
import * as THREE from '../../4.1/assets/vendor/three/build/three.module.js';
import {IMAGING as G,moveImaging,imagingState,imagingRays,imagingKeypointState} from './imaging-optics.mjs?v=20261104-bench-proportion1';
const root=document.querySelector('[data-imaging-lab]');
if(root) initialise(root);
function initialise(root){
 const $=s=>root.querySelector(s),$$=s=>[...root.querySelectorAll(s)],canvas=$('#imaging-canvas');
 let state={object:320,screen:240},showRays=true,extensions=false,point='both',front=false,selected='screen',studio=null;
 state=moveImaging(state,'screen',imagingState(state).v);
 const distanceLabel=value=>{const n=Number((value/G.f).toFixed(3));return n===1?'F':`${n}F`;};
 const workspace=createImagingWorkspace(root);

 const art=createBenchArt();
 const paper=$('[data-imaging-paper]');
 function paintProjection(){return paintBenchProjection(paper,art,G,state);}
 function clearGestureNotice(){const note=$('[data-imaging-gesture-note]');note.hidden=true;root.dataset.gestureHelp='false';$$('[data-imaging-ruler]').forEach(r=>r.removeAttribute('data-guided'));}
 function showGestureNotice(key){clearGestureNotice();$$('[data-imaging-ruler]').forEach(r=>r.toggleAttribute('data-guided',r.dataset.imagingRuler===key));const note=$('[data-imaging-gesture-note]');note.textContent=key==='lens'?'凸透鏡是固定的。':`請使用下方金框標示的${key==='object'?'圖卡尺':'屏幕尺'}的刻度按鈕或綠色把手調整距離。`;note.hidden=false;root.dataset.gestureHelp='true';}
 function update(){
  const g=paintProjection();$('[data-imaging-extensions]').disabled=g.type!=='virtual';$('[data-imaging-extensions]').setAttribute('aria-pressed',String(extensions));$('[data-imaging-extensions]').textContent=extensions?'隱藏反向延長線':'顯示反向延長線';
  $$('[data-imaging-device]').forEach(b=>{const key=b.dataset.imagingDevice;b.textContent=key==='object'?'圖卡 ↔':'屏幕 ↔';b.setAttribute('aria-pressed',String(key===selected));b.setAttribute('aria-label',`${key==='object'?'發光圖卡':'屏幕'}，${key==='object'&&state.atInfinity?'無窮遠':distanceLabel(state[key])}，可用方向鍵移動`);});
  for(const handle of $$('[data-imaging-ruler-handle]')){const key=handle.dataset.imagingRulerHandle,max=G[key+'Max'];handle.hidden=key==='object'&&!!state.atInfinity;handle.style.left=`${(key==='object'?1-state[key]/max:state[key]/max)*100}%`;handle.setAttribute('aria-valuemin',String(G[key+'Min']/G.f));handle.setAttribute('aria-valuemax',String(max/G.f));handle.setAttribute('aria-valuenow',String(Number((state[key]/G.f).toFixed(3))));handle.setAttribute('aria-valuetext',`${key==='object'?'圖卡':'屏幕'}距離透鏡${key==='object'&&state.atInfinity?'無窮遠':distanceLabel(state[key])}`);}
  const target=$('[data-imaging-target]');target.hidden=!g.finite||g.type!=='real'||g.unreachable;target.dataset.distance=g.finite&&g.type==='real'?String(g.v):'';target.style.setProperty('--target-position',`${g.finite?g.v/G.screenMax*100:0}%`);$('[data-imaging-target-label]').setAttribute('aria-label',g.finite&&g.type==='real'?`屏幕移至清楚像位置，${distanceLabel(g.v)}`:'沒有有限距離的清楚像位置');
  $('[data-imaging-target-status]').hidden=g.type==='real'&&g.finite&&!g.unreachable;
  $('[data-imaging-target-status]').textContent=g.type==='virtual'?`虛像在圖卡側${distanceLabel(Math.abs(g.v))}，放大${Number(g.m.toFixed(2))}倍。`:!g.finite?'圖卡位於焦點，沒有有限距離的清楚像。':g.unreachable?`清楚像在 ${distanceLabel(g.v)}，已超出軌道。`:`清楚像位置：${distanceLabel(g.v)}`;
  for(const key of ['object','screen']){const output=$(`[data-imaging-distance=${key}]`);output.textContent=key==='object'&&state.atInfinity?'∞':distanceLabel(state[key]);output.setAttribute('aria-label',`${key==='object'?'物距':'屏幕距離'} ${key==='object'&&state.atInfinity?'無窮遠':distanceLabel(state[key])}`);}
  $('[data-imaging-rays]').textContent=showRays?'隱藏輔助光路':'顯示輔助光路';$('[data-imaging-rays]').setAttribute('aria-pressed',String(showRays));$('[data-imaging-trace]').hidden=!showRays||!!state.atInfinity;
  $('[id=imaging-object-ruler-help]').textContent=state.atInfinity?'無窮遠：點刻度返回有限距離':'點選刻度按鈕或移動圖卡';
  $$('[data-imaging-point]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.imagingPoint===point)));
  $('[data-imaging-view]').textContent=front?'返回實驗台':'屏幕視角';$('[data-imaging-view]').setAttribute('aria-label',front?'返回實驗台視角':'切換到屏幕視角');$('[data-imaging-view]').setAttribute('aria-pressed',String(front));

  let message=g.clear?`屏幕已對焦：倒立${g.sizeLabel}的實像。`:'屏幕尚未對焦。移動屏幕，找清楚的倒立像。';
  if(state.atInfinity)message=g.clear?'無窮遠的軸上物點以平行光入射，在透鏡另一側F會聚成點像。':'無窮遠物點的像在另一側F；移動屏幕至F可接到點像。';
  else if(g.type==='virtual')message=`圖卡在F內，虛像位於透鏡前、圖卡同側${distanceLabel(Math.abs(g.v))}，比圖卡離透鏡更遠，正立且放大${Number(g.m.toFixed(2))}倍；屏幕接不到清楚像。虛線是光線的反向延長線。`;
  else if(!g.finite)message='同一物點的出射光彼此平行，沒有在有限距離交會；像在無窮遠，屏幕接不到清楚像。';
  else if(g.unreachable)message='清楚像的位置已超出軌道，屏幕移到最遠仍無法對焦。請把圖卡移遠透鏡一些，再重新找像。';
  if(g.clipped&&g.type==='real'&&!state.atInfinity)message+=' 部分投影超出屏幕；保留實際比例，不縮小圖案填入。';
  if(showRays&&g.finite&&g.type==='real'&&!state.atInfinity)message+=point==='top'?' 紅線追蹤圖卡上端，在清楚像的下方會聚。':point==='bottom'?' 藍線追蹤圖卡下端，在清楚像的上方會聚。':' 紅、藍線來自不同物點，分別形成對應的像點。';
  $('[data-imaging-condition]').textContent=state.atInfinity?'無窮遠物點以平行光入射，在另一側F形成點像。':g.type==='infinity'?'同一物點的出射光彼此平行，像在無窮遠；屏幕接不到清楚像。':g.type==='virtual'?`F內：正立、放大虛像，在圖卡側 ${distanceLabel(Math.abs(g.v))}；屏幕接不到清楚像。`:g.clear?`屏幕已對焦：倒立、${g.sizeLabel}的實像。`:`實像在${distanceLabel(g.v)}，移動屏幕找清楚像。`;$('[data-result]').textContent=message;$('[data-imaging-badge]').textContent=state.atInfinity?(g.clear?'點像':'屏幕尚未對焦'):g.type==='virtual'?'屏幕接不到清楚像':!g.finite?'屏幕接不到清楚像':g.unreachable?'清楚像超出軌道':g.clear?`倒立、${g.sizeLabel}的實像`:'屏幕尚未對焦';
  const keypoint=state.atInfinity?'infinity':g.type==='virtual'?'inside':!g.finite?'focus':!g.clear?'':Math.abs(state.object-G.f*2)<.05?'double':state.object>G.f*2?'beyond':'between';
  $$('[data-imaging-keypoint]').forEach(row=>{const active=row.dataset.imagingKeypoint===keypoint;row.dataset.active=String(active);row.querySelector('button').setAttribute('aria-pressed',String(active));});
  root.dataset.extensions=extensions;root.dataset.atInfinity=String(!!state.atInfinity);root.dataset.imageType=g.type;root.dataset.imagePosition=g.finite?g.v:'';root.dataset.object=state.object;root.dataset.screen=state.screen;root.dataset.clear=String(g.clear);root.dataset.magnification=g.finite?String(g.m):'';root.dataset.projectionScale=g.projectionScale;root.dataset.spread=g.spread;root.dataset.rays=showRays;root.dataset.view=front?'screen':'orbit';root.dataset.point=point;
  canvas.setAttribute('aria-label',`旋轉與縮放觀察的立體凸透鏡成像台，使用下方位置尺調整距離，物距${state.atInfinity?'無窮遠':distanceLabel(state.object)}，屏幕距離${distanceLabel(state.screen)}，${$('[data-imaging-badge]').textContent}`);
  studio?.update();
 }
 function move(key,value){clearGestureNotice();state=moveImaging(state,key,value);if(state.object>=G.f)extensions=false;selected=key;update();}
 for(const handle of $$('[data-imaging-ruler-handle]')){const key=handle.dataset.imagingRulerHandle;bindBenchRuler({track:$(`[data-imaging-ruler-track=${key}]`),handle,key,min:G[key+'Min'],max:G[key+'Max'],reverse:key==='object',get:()=>state[key],move});}
 $('[data-imaging-target-label]').addEventListener('click',e=>{e.stopPropagation();const g=imagingState(state);if(g.finite&&g.type==='real'&&!g.unreachable)move('screen',g.v);});
 $('[data-imaging-extensions]').addEventListener('click',()=>{extensions=!extensions;if(extensions)showRays=true;update();});
 $('[data-imaging-rays]').addEventListener('click',()=>{showRays=!showRays;if(!showRays)extensions=false;update();});$('[data-imaging-view]').addEventListener('click',()=>{clearGestureNotice();front=!front;update();});
 $$('[data-imaging-point]').forEach(b=>b.addEventListener('click',()=>{point=b.dataset.imagingPoint;update();}));
 $$('[data-imaging-device]').forEach(b=>{const key=b.dataset.imagingDevice;b.addEventListener('click',()=>{selected=key;update();});b.addEventListener('keydown',e=>{let value=state[key];if(e.key==='Home')value=G[key+'Min'];else if(e.key==='End')value=G[key+'Max'];else if(['ArrowLeft','ArrowRight','ArrowDown','ArrowUp'].includes(e.key)){const direction=['ArrowLeft','ArrowDown'].includes(e.key)?-1:1;value+=(key==='object'?-direction:direction)*(e.shiftKey?.2:1);}else return;e.preventDefault();move(key,value);});});
 $$('[data-imaging-keypoint]').forEach(b=>b.addEventListener('click',()=>{
  const next=imagingKeypointState(b.dataset.imagingKeypoint);if(!next)return;clearGestureNotice();state=next;extensions=imagingState(next).type==='virtual';if(extensions)showRays=true;selected='screen';front=false;update();studio?.frameCase();
 }));
 try{studio=createStudio();root.dataset.webgl='ready';}catch(error){canvas.hidden=true;$('[data-imaging-fallback]').hidden=false;$('[data-imaging-view]').hidden=true;root.dataset.webgl='unavailable';console.warn('Imaging 3D:',error.message);}
 update();root.dataset.ready='true';
 workspace.start();
 function createStudio(){
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const scene=new THREE.Scene();scene.background=new THREE.Color('#566b5b');scene.fog=new THREE.Fog('#566b5b',35,80);
  const camera=new THREE.PerspectiveCamera(39,1,.03,120),target=new THREE.Vector3(-G.f*.75*G.scale,1.75,0);let orbit={...BENCH_HOME},fitRadius=9,pending=0,viewport=null,frameMode='bench',frameState={...state};root.dataset.framing='bench';
  const clampZoom=value=>THREE.MathUtils.clamp(value,.2,2.2);
  const {source,lens,lensGroup,screen,screenPlane,projectedTexture,artTex}=createBenchApparatus(THREE,scene,G,art,paper);
  const virtualImage=new THREE.Group();virtualImage.name='imaging-virtual-image';virtualImage.visible=false;scene.add(virtualImage);
  const virtualArt=new THREE.Mesh(new THREE.PlaneGeometry(G.cardWidth,G.cardHeight),new THREE.MeshBasicMaterial({map:artTex,transparent:true,opacity:.72,depthWrite:false,depthTest:false,side:THREE.DoubleSide,toneMapped:false}));virtualArt.renderOrder=8;virtualImage.add(virtualArt);
  const virtualOutline=new THREE.Line(new THREE.BufferGeometry().setFromPoints([[-.2*G.cardWidth,-G.cardHeight/2,0],[-.2*G.cardWidth,G.cardHeight/2,0],[.2*G.cardWidth,G.cardHeight/2,0],[.2*G.cardWidth,-G.cardHeight/2,0],[-.2*G.cardWidth,-G.cardHeight/2,0]].map(p=>new THREE.Vector3(...p))),new THREE.LineDashedMaterial({color:'#eaf2d8',dashSize:.055,gapSize:.035,transparent:true,opacity:.85,depthWrite:false,depthTest:false,toneMapped:false}));virtualOutline.computeLineDistances();virtualOutline.renderOrder=9;virtualImage.add(virtualOutline);
  const rays=new THREE.Group();scene.add(rays);
  function updateRays(){for(const m of [...rays.children]){m.geometry.dispose();m.material.dispose();rays.remove(m);}rays.visible=showRays&&!front;if(!showRays)return;for(const r of imagingRays(state,point)){const color=r.name==='top'?'#f4a17e':'#88c7ee';for(const [from,to]of [[r.from,r.lens],[r.lens,r.end]]){const A=new THREE.Vector3(...from),B=new THREE.Vector3(...to),tube=new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(A,B),1,.009,6,false),new THREE.MeshBasicMaterial({color,toneMapped:false}));tube.userData={name:r.name,from,to};rays.add(tube);const arrow=new THREE.Mesh(new THREE.ConeGeometry(.036,.13,10),new THREE.MeshBasicMaterial({color,toneMapped:false}));arrow.position.copy(A).lerp(B,.64);arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),B.clone().sub(A).normalize());rays.add(arrow);}if(r.virtual&&extensions){const A=new THREE.Vector3(...r.lens),B=new THREE.Vector3(...r.virtual),line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([A,B]),new THREE.LineDashedMaterial({color,dashSize:.07,gapSize:.05,transparent:true,opacity:.85,depthTest:false,depthWrite:false}));line.computeLineDistances();line.renderOrder=10;line.userData={name:r.name,from:r.lens,to:r.virtual,virtual:true};rays.add(line);}}}
  function directionFor(azimuth,polar){return new THREE.Vector3(Math.sin(polar)*Math.sin(azimuth),Math.cos(polar),Math.sin(polar)*Math.cos(azimuth));}
  function fitToViewport(){
   if(frameMode!=='virtual'){fitRadius=fitBench(THREE,camera,target);return;}
   const sample={...frameState,object:Math.max(frameState.object,.6*G.f)},g=imagingState(sample),bounds=[];
   const add=(xs,ys,zs)=>{for(const x of xs)for(const y of ys)for(const z of zs)bounds.push(new THREE.Vector3(x,y,z));};
   // Keep the actual screen and nearby virtual images in view; the focus may crop distant rail marks.
   add([Math.min(-G.f*G.scale,g.v*G.scale-.25*G.cardWidth*g.m),frameState.screen*G.scale+.2],[-.22,.4],[-1,1]);
   add([g.v*G.scale-.25*G.cardWidth*g.m,g.v*G.scale+.25*G.cardWidth*g.m],[G.axis-G.cardHeight*g.m/2-.1,G.axis+G.cardHeight*g.m/2+.3],[0]);
   add([-frameState.object*G.scale-.12,-frameState.object*G.scale+.12],[.25,G.axis+G.cardHeight/2+.12],[-.85,.85]);
   add([-.14,.14],[.25,G.axis+1.12],[-1,1]);
   add([frameState.screen*G.scale-.2,frameState.screen*G.scale+.2],[.25,G.axis+G.screenHeight/2+.12],[-G.screenWidth/2-.1,G.screenWidth/2+.1]);
   target.set((Math.min(...bounds.map(p=>p.x))+Math.max(...bounds.map(p=>p.x)))/2,1.8,0);camera.fov=39;camera.updateProjectionMatrix();
   const direction=directionFor(orbit.azimuth,orbit.polar);let radius=3;
   for(let i=0;i<120;i++){camera.position.copy(target).addScaledVector(direction,radius);camera.lookAt(target);camera.updateMatrixWorld();if(bounds.every(p=>{const q=p.clone().project(camera);return Math.abs(q.x)<.91&&q.y>-.94&&q.y<.86;}))break;radius*=1.04;}
   fitRadius=radius;
  }
  function updateCamera(){
   if(front){const d=Math.min(1.1,state.screen*G.scale-.2);camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(Math.max(G.screenHeight+.65,(G.screenWidth+.6)/camera.aspect)/(2*d)));camera.position.set(state.screen*G.scale-d,G.axis,0);camera.lookAt(state.screen*G.scale,G.axis,0);}
   else{camera.fov=39;camera.position.copy(target).addScaledVector(directionFor(orbit.azimuth,orbit.polar),fitRadius*orbit.zoom);camera.lookAt(target);}
   camera.far=Math.max(120,fitRadius*6);camera.updateProjectionMatrix();
   if(viewport){const r=canvas.getBoundingClientRect(),p=camera.projectionMatrix.elements;p[0]*=viewport.width/r.width;p[5]*=viewport.height/r.height;p[8]=1-2*(viewport.left+viewport.width/2)/r.width;p[9]=2*(viewport.top+viewport.height/2)/r.height-1;camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();}
   camera.updateMatrixWorld();virtualImage.rotation.y=Math.atan2(camera.position.x-virtualImage.position.x,camera.position.z-virtualImage.position.z);virtualImage.updateMatrixWorld(true);
  }
  const updateImageLabels=createBenchLabels({THREE,root,canvas,camera,virtualImage,G,state:()=>imagingState(state),viewport:()=>viewport,front:()=>front,rays:()=>showRays,receiver:()=>state.screen,receiverName:'屏幕',lightPaths:()=>showRays?imagingRays(state,point):[]});
  function draw(){pending=0;renderer.render(scene,camera);updateImageLabels();}
  function requestDraw(){updateImageLabels();if(!pending)pending=requestAnimationFrame(draw);}
  function syncScene(){const g=imagingState(state);virtualImage.visible=g.type==='virtual'&&!front;if(g.type==='virtual'){virtualImage.position.set(g.v*G.scale,G.axis,0);virtualImage.scale.set(g.m,g.m,1);}source.visible=!state.atInfinity;source.position.x=-state.object*G.scale;screen.position.x=state.screen*G.scale;projectedTexture.needsUpdate=true;updateRays();updateCamera();scene.updateMatrixWorld(true);requestDraw();}
  const devices={object:source,screen,lens:lensGroup},pointers=new Map(),raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let gesture=null;
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
  function stop(e){pointers.delete(e.pointerId);gesture=null;canvas.style.cursor='grab';}
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,stop);
  canvas.addEventListener('wheel',e=>{e.preventDefault();clearGestureNotice();if(front)return;orbit.zoom=clampZoom(orbit.zoom+e.deltaY*.001);update();},{passive:false});
  canvas.addEventListener('keydown',e=>{const steps={ArrowLeft:[.06,0],ArrowRight:[-.06,0],ArrowUp:[0,-.05],ArrowDown:[0,.05]};if(!steps[e.key])return;e.preventDefault();clearGestureNotice();front=false;orbit.azimuth=orbit.azimuth+steps[e.key][0];orbit.polar=THREE.MathUtils.clamp(orbit.polar+steps[e.key][1],.25,1.55);update();});
  function resize(){const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(r.width,r.height,false);viewport=workspace.safeRect();camera.aspect=viewport.width/viewport.height;fitToViewport();updateCamera();requestDraw();}new ResizeObserver(resize).observe(canvas);resize();
  function frameCase(){orbit.zoom=1;frameState={...state};frameMode=imagingState(state).type==='virtual'?'virtual':'bench';root.dataset.framing=frameMode;fitToViewport();updateCamera();requestDraw();}
  return {update:syncScene,target,frameCase,scene,camera,renderer,source,lens,screen,screenPlane,rays,devices,virtualImage,virtualArt,virtualOutline};
 }
}
