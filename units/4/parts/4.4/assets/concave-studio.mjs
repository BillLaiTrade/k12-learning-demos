import {createParallelLabels} from './parallel-labels.mjs?v=20261104-lens-clear5';
import {createLensVisual} from './lens-geometry.mjs?v=20261104-lens-clear5';
import * as THREE from '../../4.1/assets/vendor/three/build/three.module.js';
import {renderConcaveRefraction} from './concave-refraction.mjs?v=20261107-concave-fold2';
import {parallelModel} from './parallel-optics.mjs?v=20261107-refraction-angles1';
const root=document.querySelector('[data-concave-lab]');
if(root) initialise(root);

function initialise(root){
 const $=s=>root.querySelector(s),g=parallelModel('concave',{rayHeight:2.25}),canvas=$('#concave-canvas');
 g.rays.forEach(r=>r.from[0]=-10);
 const SCALE=.55,AXIS=2.0,world=p=>new THREE.Vector3(p[0]*SCALE,AXIS-p[1]*SCALE,0);
 let showRays=true,extensions=true,step='enter',activeRay=0,activePanel=null,studio=null;
 function renderPanel(panel){
  const svg=panel.querySelector('svg'),mode=panel.dataset.mode||'enter',upper=panel.dataset.concaveRay==='upper',direction=upper?'上':'下';
  renderConcaveRefraction(svg,g,{rayIndex:upper?0:2,mode,showRays,extensions,width:svg.parentElement.clientWidth||960});
  panel.querySelector('[data-concave-key]').hidden=!showRays||mode==='overall'||svg.dataset.compact!=='true';
  panel.querySelectorAll('[data-concave-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.concaveMode===mode)));
  panel.querySelector('[data-concave-copy]').textContent=!showRays?'顯示輔助光路，觀察光線的轉向。':mode==='overall'?`${upper?'上':'下'}方光線向外發散。${extensions?'虛線是反向延長線，非實際光線。':''}`:mode==='enter'?`① 空氣 → 玻璃：偏向法線，往${direction}轉向。`:`② 玻璃 → 空氣：偏離法線，繼續往${direction}轉向。`;
 }
 function update(){
  root.querySelectorAll('[data-concave-ray]').forEach(renderPanel);
  $('[data-parallel-rays]').textContent=showRays?'隱藏輔助光路':'顯示輔助光路';$('[data-parallel-rays]').setAttribute('aria-pressed',String(showRays));
  $('[data-result]').textContent=showRays?(extensions?'平行光通過凹透鏡後發散；出射光的反向延長線交於入射側的虛焦點 F，出射光沒有在 F 實際會聚。':'凹透鏡中間薄、邊緣厚。這組平行光通過後向外發散。'):'先觀察鏡片厚薄，再顯示輔助光路，追蹤入射、玻璃內部與出射的方向。';
  canvas.setAttribute('aria-label',`立體凹透鏡觀察台，平行光向外發散，光路${showRays?'顯示':'隱藏'}`);
  root.dataset.view='overall';root.dataset.rays=String(showRays);root.dataset.step=step;root.dataset.extensions=String(showRays&&extensions);
  $('[data-concave-extension-note]').hidden=!(showRays&&extensions);
  $('[data-parallel-extensions]').hidden=!showRays;$('[data-parallel-extensions]').textContent=extensions?'隱藏反向延長線':'顯示反向延長線';$('[data-parallel-extensions]').setAttribute('aria-pressed',String(showRays&&extensions));
  studio?.update();
 }
 $('[data-parallel-extensions]').addEventListener('click',()=>{extensions=!extensions;update();});
 $('[data-parallel-rays]').addEventListener('click',()=>{showRays=!showRays;update();});
 root.querySelectorAll('[data-concave-mode]').forEach(b=>b.addEventListener('click',()=>{const panel=b.closest('[data-concave-ray]');activePanel=panel;panel.dataset.mode=b.dataset.concaveMode;activeRay=panel.dataset.concaveRay==='upper'?0:2;if(panel.dataset.mode!=='overall')step=panel.dataset.mode;showRays=true;update();}));
 const widths=new WeakMap(),observer=new ResizeObserver(entries=>{for(const {target,contentRect} of entries)if(contentRect.width>0&&Math.abs(contentRect.width-(widths.get(target)||0))>.5){widths.set(target,contentRect.width);renderPanel(target.closest('[data-concave-ray]'));}});
 root.querySelectorAll('[data-concave-ray]').forEach(panel=>{observer.observe(panel.querySelector('.convex-detail-scene'));panel.addEventListener('toggle',()=>{const current=panel.open?panel:root.querySelector('[data-concave-ray][open]');activePanel=current;if(current){activeRay=current.dataset.concaveRay==='upper'?0:2;if(current.dataset.mode!=='overall')step=current.dataset.mode;}update();});});
 try{studio=createStudio();root.dataset.webgl='ready';}catch(error){canvas.hidden=true;$('[data-concave-fallback]').hidden=false;root.dataset.webgl='unavailable';console.warn('Concave 3D:',error.message);}
 update();root.dataset.ready='true';

 function createStudio(){
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const scene=new THREE.Scene();scene.background=new THREE.Color('#839487');scene.fog=new THREE.Fog('#839487',25,60);
  const camera=new THREE.PerspectiveCamera(43,1,.03,90),target=new THREE.Vector3(.6,1.85,0);
  let orbit={azimuth:-.22,polar:1.46,radius:12},overallFit=10,pending=0;
  scene.add(new THREE.HemisphereLight('#eff1e4','#5a6e56',2));
  const key=new THREE.DirectionalLight('#fff4d6',3);key.position.set(-2,7,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-8,right:9,top:6,bottom:-4});key.shadow.bias=-.0003;scene.add(key);
  const rim=new THREE.DirectionalLight('#d9f0ee',1.7);rim.position.set(3,4,-4);scene.add(rim);
  const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.5,metalness:.1,...extra});
  const steel=material('#aab9ad',{metalness:.4,roughness:.25,emissive:'#354b3c',emissiveIntensity:.18}),dark=material('#293d32',{metalness:.4,roughness:.45}),brass=material('#aa955b',{metalness:.7,roughness:.3});
  function box(parent,size,pos,mat,shadow=true){const m=new THREE.Mesh(new THREE.BoxGeometry(...size),mat);m.position.set(...pos);m.castShadow=shadow;m.receiveShadow=true;parent.add(m);return m;}
  function cylinder(parent,radius,height,pos,mat){const m=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,height,32),mat);m.position.set(...pos);m.castShadow=true;parent.add(m);return m;}
  const textureCanvas=document.createElement('canvas');textureCanvas.width=1024;textureCanvas.height=128;const ctx=textureCanvas.getContext('2d');ctx.fillStyle='#ad8655';ctx.fillRect(0,0,1024,128);let seed=37;
  for(let i=0;i<120;i++){seed=(1664525*seed+1013904223)>>>0;const y=seed/2**32*128;ctx.strokeStyle=i%3?'#65462038':'#f3d4a436';ctx.lineWidth=.5;ctx.beginPath();ctx.moveTo(0,y);ctx.bezierCurveTo(300,y-3,650,y+3,1024,y);ctx.stroke();}
  const woodTexture=new THREE.CanvasTexture(textureCanvas);woodTexture.colorSpace=THREE.SRGBColorSpace;
  const wood=material('#dcc49a',{map:woodTexture,roughness:.55});
  box(scene,[15,.2,1.75],[.3,-.04,0],wood);box(scene,[15,.07,1.75],[.3,-.18,0],material('#725437'));
  for(const z of [-.58,.58]){box(scene,[14.6,.09,.10],[.3,.10,z],steel);box(scene,[14.6,.028,.03],[.3,.16,z],dark);}
  for(const x of [-6.6,7.1])for(const z of [-.66,.66])box(scene,[.22,.25,.22],[x,-.19,z],dark);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(100,100),material('#8e9a84',{roughness:.98}));floor.rotation.x=-Math.PI/2;floor.position.y=-.34;floor.receiveShadow=true;scene.add(floor);
  function mount(x,top){box(scene,[.62,.15,1.4],[x,.26,0],dark);box(scene,[.48,.07,1.13],[x,.37,0],steel);cylinder(scene,.055,top-.4,[x,(top+.4)/2,0],steel);for(const z of [-.63,.63])cylinder(scene,.06,.045,[x,.37,z],brass);}
  const sourceX=g.rays[0].from[0]*SCALE;
  const sourceHalf=Math.max(...g.rays.map(r=>Math.abs(r.from[1])))*SCALE+.16;mount(sourceX-.3,AXIS-sourceHalf);const source=box(scene,[.64,sourceHalf*2,.78],[sourceX-.33,AXIS,0],dark);box(scene,[.025,sourceHalf*2+.07,.84],[sourceX-.02,AXIS,0],steel);
  for(const r of g.rays)box(scene,[.008,.055,.43],[sourceX-.004,AXIS-r.from[1]*SCALE,0],new THREE.MeshBasicMaterial({color:'#ffe6a0',toneMapped:false}),false);
  for(const y of [AXIS-sourceHalf+.1,AXIS+sourceHalf-.1])for(const z of [-.33,.33]){const bolt=new THREE.Mesh(new THREE.SphereGeometry(.025,12,8),brass);bolt.position.set(sourceX+.02,y,z);scene.add(bolt);}
  const centerX=g.thickness*SCALE/2,R=g.halfHeight*SCALE;
  const lens=createLensVisual(THREE,{radius:R,halfThickness:r=>(g.thickness/2-g.left(r/SCALE))*SCALE,index:g.index});lens.position.set(centerX,AXIS,0);scene.add(lens);
  mount(centerX,AXIS-R-.08);box(scene,[.4,.11,.28],[centerX,AXIS-R-.065,0],steel);
  const axisGeo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(sourceX-.05,AXIS,0),new THREE.Vector3(g.rays[0].end[0]*SCALE+.35,AXIS,0)]),axis=new THREE.Line(axisGeo,new THREE.LineDashedMaterial({color:'#e9eee2',dashSize:.12,gapSize:.08,transparent:true,opacity:.8}));axis.computeLineDistances();scene.add(axis);
  const rays=new THREE.Group(),arrowMeshes=[];scene.add(rays);
  const direction=new THREE.Vector3(0,1,0);
  function arrow(a,b,color,t,size){const dir=b.clone().sub(a).normalize(),cone=new THREE.Mesh(new THREE.ConeGeometry(size*.36,size,12),new THREE.MeshBasicMaterial({color,toneMapped:false}));cone.position.copy(a).lerp(b,t);cone.quaternion.setFromUnitVectors(direction,dir);rays.add(cone);arrowMeshes.push(cone);}
  for(const[i,r]of g.rays.entries()){
   const color=i===0?'#f0a272':'#f5d276';for(const[part,a,b]of [['enter',r.from,r.enter],['inside',r.enter,r.exit],['exit',r.exit,r.end]]){
    const A=world(a),B=world(b),tube=new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(A,B),part==='inside'?2:20,.009,7,false),new THREE.MeshBasicMaterial({color,toneMapped:false}));tube.userData={part,rayIndex:i};rays.add(tube);
    arrow(A,B,color,part==='exit'?.29:.58,part==='inside'?.07:.13);if(part==='exit')arrow(A,B,color,.91,.13);
   }
  }
  const focus=new THREE.Mesh(new THREE.SphereGeometry(.052,20,16),new THREE.MeshBasicMaterial({color:'#ffedb1',toneMapped:false}));focus.position.copy(world([g.focus,0]));scene.add(focus);
  const surfaceMarker=new THREE.Mesh(new THREE.SphereGeometry(.065,20,16),new THREE.MeshBasicMaterial({color:'#ffe39a',depthTest:false,toneMapped:false}));surfaceMarker.renderOrder=5;scene.add(surfaceMarker);
  const extensionGroup=new THREE.Group();scene.add(extensionGroup);for(const r of g.rays){if(r.focus===null)continue;const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([world(r.exit),world([g.focus,0])]),new THREE.LineDashedMaterial({color:'#e6eacb',dashSize:.1,gapSize:.07,depthTest:false,transparent:true,opacity:.85}));line.computeLineDistances();line.renderOrder=4;extensionGroup.add(line);}
  function updateCamera(){
   const r=overallFit*orbit.radius/12;camera.position.set(target.x+r*Math.sin(orbit.polar)*Math.sin(orbit.azimuth),target.y+r*Math.cos(orbit.polar),target.z+r*Math.sin(orbit.polar)*Math.cos(orbit.azimuth));camera.lookAt(target);camera.updateProjectionMatrix();camera.updateMatrixWorld();
  }
  root.dataset.kind='concave';
  const placeLabels=createParallelLabels({THREE,root,canvas,camera,lens,radius:R,halfThickness:r=>(g.thickness/2-g.left(r/SCALE))*SCALE,prefix:'concave',focus,sourceX,axisY:AXIS,endX:g.rays[0].end[0]*SCALE,showRays:()=>showRays,showFocus:()=>showRays&&extensions,lightPaths:()=>g.rays.flatMap(r=>[[world(r.from),world(r.enter)],[world(r.enter),world(r.exit)],[world(r.exit),world(r.end)],...(extensions&&r.focus!==null?[[world(r.exit),world([g.focus,0])]]:[])])});
  function updateLabels(){updateFocalDistance(canvas.getBoundingClientRect());placeLabels();}
  function updateFocalDistance(rect){
   const overlay=$('[data-concave-focal-distance]'),a=new THREE.Vector3(centerX,AXIS,0).project(camera),b=focus.position.clone().project(camera);
   overlay.toggleAttribute('hidden',!showRays||!extensions||[a,b].some(v=>v.z< -1||v.z>1||Math.abs(v.x)>.96||Math.abs(v.y)>.8));if(overlay.hasAttribute('hidden'))return;
   overlay.setAttribute('viewBox',`0 0 ${rect.width} ${rect.height}`);overlay.style.height=rect.height+'px';
   const ax=(a.x+1)*rect.width/2,ay=(1-a.y)*rect.height/2,bx=(b.x+1)*rect.width/2,by=(1-b.y)*rect.height/2,offset=rect.width<600?48:66;
   $('[data-focal-guides]').setAttribute('d',`M${ax} ${ay}V${ay+offset}M${bx} ${by}V${by+offset}`);
   const dot=$('[data-focal-center]');dot.setAttribute('cx',ax);dot.setAttribute('cy',ay);
   const line=$('[data-focal-distance]');for(const[k,v]of Object.entries({x1:ax,y1:ay+offset,x2:bx,y2:by+offset}))line.setAttribute(k,v);
   $('[data-focal-label]').setAttribute('transform',`translate(${(ax+bx)/2} ${(ay+by)/2+offset})`);
   const label=$('[data-focal-center-label]');label.setAttribute('transform',`translate(${ax} ${ay+offset+25})`);
  }
  let lastRayRadius=0;
  function draw(){pending=0;
   const distance=camera.position.distanceTo(target),pixelWorld=2*distance*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))/Math.max(1,canvas.clientHeight),radius=THREE.MathUtils.clamp(pixelWorld*.72,.004,.045);
   if(Math.abs(radius-lastRayRadius)>.0007){for(const tube of rays.children.filter(m=>m.geometry.type==='TubeGeometry')){const {path,tubularSegments}=tube.geometry.parameters;tube.geometry.dispose();tube.geometry=new THREE.TubeGeometry(path,tubularSegments,radius*(tube.userData.rayIndex===0?1.25:.85),7,false);}lastRayRadius=radius;}
   const scale=THREE.MathUtils.clamp(pixelWorld/.02,.4,2.5);arrowMeshes.forEach(m=>m.scale.setScalar(scale));focus.scale.setScalar(scale);surfaceMarker.scale.setScalar(scale*1.25);
   renderer.render(scene,camera);updateLabels();
  }
  function requestDraw(){if(!pending)pending=requestAnimationFrame(draw);}
  function resize(){const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();const direction=new THREE.Vector3(Math.sin(1.46)*Math.sin(-.22),Math.cos(1.46),Math.sin(1.46)*Math.cos(-.22)),bounds=[];for(const x of [sourceX-.7,g.rays[0].end[0]*SCALE+.5])for(const y of [.1,3.7])for(const z of [-.9,.9])bounds.push(new THREE.Vector3(x,y,z));for(const ray of g.rays)for(const p of [ray.from,ray.enter,ray.exit,ray.end])bounds.push(world(p));overallFit=5;for(let i=0;i<90;i++){camera.position.copy(target).addScaledVector(direction,overallFit);camera.lookAt(target);camera.updateMatrixWorld();if(bounds.every(p=>{const q=p.clone().project(camera);return Math.abs(q.x)<.94&&q.y>-.77&&q.y<.72;}))break;overallFit*=1.045;}updateCamera();updateLabels();requestDraw();}
  function update(){surfaceMarker.visible=showRays&&!!activePanel?.open&&activePanel.dataset.mode!=='overall';surfaceMarker.position.copy(world(g.rays[activeRay][step]));rays.visible=showRays;focus.visible=showRays&&extensions;extensionGroup.visible=showRays&&extensions;updateCamera();updateLabels();requestDraw();}
  const pointers=new Map();let gesture=null;
  const pinch=()=>{const p=[...pointers.values()];return p.length<2?0:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);};
  canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);gesture=pointers.size>1?{kind:'pinch',distance:pinch(),radius:orbit.radius}:{kind:'orbit',x:e.clientX,y:e.clientY,azimuth:orbit.azimuth,polar:orbit.polar};});
  canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId)||!gesture)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(gesture.kind==='pinch'){const ratio=gesture.distance/Math.max(20,pinch());orbit.radius=THREE.MathUtils.clamp(gesture.radius*ratio,7,19);}else{orbit.azimuth=THREE.MathUtils.clamp(gesture.azimuth-(e.clientX-gesture.x)*.004,-.9,.7);orbit.polar=THREE.MathUtils.clamp(gesture.polar+(e.clientY-gesture.y)*.003,.85,1.55);}updateCamera();updateLabels();requestDraw();});
  function stop(e){pointers.delete(e.pointerId);gesture=null;}
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,stop);
  canvas.addEventListener('wheel',e=>{e.preventDefault();orbit.radius=THREE.MathUtils.clamp(orbit.radius+e.deltaY*.008,7,19);updateCamera();updateLabels();requestDraw();},{passive:false});
  canvas.addEventListener('keydown',e=>{const map={ArrowLeft:[-.07,0],ArrowRight:[.07,0],ArrowUp:[0,-.05],ArrowDown:[0,.05]};if(!map[e.key])return;e.preventDefault();orbit.azimuth=THREE.MathUtils.clamp(orbit.azimuth+map[e.key][0],-.9,.7);orbit.polar=THREE.MathUtils.clamp(orbit.polar+map[e.key][1],.85,1.55);updateCamera();updateLabels();requestDraw();});
  new ResizeObserver(resize).observe(canvas);resize();document.addEventListener('visibilitychange',()=>{if(!document.hidden)requestDraw();});
  return {update,scene,camera,renderer,lens,rays,focus,source,extensionGroup,surfaceMarker,g,world};
 }
}
