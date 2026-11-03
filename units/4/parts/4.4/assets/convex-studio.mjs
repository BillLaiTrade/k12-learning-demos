import * as THREE from '../../4.1/assets/vendor/three/build/three.module.js';
import {parallelModel} from './parallel-optics.mjs?v=20261102-split1';
const root=document.querySelector('[data-convex-lab]');
if(root) initialise(root);

function initialise(root){
 const $=s=>root.querySelector(s),g=parallelModel('convex'),canvas=$('#convex-canvas'),svg=$('[data-convex-section]');
 const SCALE=.55,AXIS=1.75,world=p=>new THREE.Vector3(p[0]*SCALE,AXIS-p[1]*SCALE,0);
 let showRays=true,close=false,step='enter',studio=null;
 const NS='http://www.w3.org/2000/svg';
 function el(tag,attrs={},parent=svg){const e=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,String(v));parent.append(e);return e;}
 function path(points,attrs={}){return el('path',{d:points.map((p,i)=>`${i?'L':'M'}${p[0]} ${p[1]}`).join(' '),fill:'none',...attrs});}
 function renderDetail(){
  svg.replaceChildren();svg.setAttribute('viewBox',step==='enter'?'-.9 -1.9 2.4 1.8':'-.4 -1.9 2.4 1.8');
  svg.setAttribute('aria-label',step==='enter'?'第一個表面，光由空氣進入玻璃，偏向法線':'第二個表面，光由玻璃進入空氣，偏離法線');
  const defs=el('defs'),grad=el('linearGradient',{id:'convex-detail-glass'},defs);
  for(const[offset,color]of [['0','#98c3bb'],['.5','#eafffa'],['1','#94bfb8']])el('stop',{offset,'stop-color':color,'stop-opacity':.8},grad);
  const marker=el('marker',{id:'convex-detail-arrow',viewBox:'0 0 10 10',refX:8,refY:5,markerWidth:5,markerHeight:5,orient:'auto',markerUnits:'strokeWidth'},defs);el('path',{d:'M0 0L10 5L0 10Z',fill:'#bd7149'},marker);
  const boundary=[];for(let y=-g.halfHeight;y<=g.halfHeight+.0001;y+=.04)boundary.push([g.left(y),y]);for(let y=g.halfHeight;y>=-g.halfHeight-.0001;y-=.04)boundary.push([g.right(y),y]);
  const lens=path([...boundary,boundary[0]],{fill:'url(#convex-detail-glass)',stroke:'#6b9d92','stroke-width':.012,'data-lens-boundary':'convex'});lens.dataset.centerThickness=g.thickness;lens.dataset.edgeThickness=g.right(g.halfHeight)-g.left(g.halfHeight);
  const r=g.rays[0];
  if(showRays){
   for(const[part,points]of [['enter',[r.from,r.enter]],['inside',[r.enter,r.exit]],['exit',[r.exit,r.end]]]){
    const active=part==='inside'||part===step;
    path(points,{stroke:active?'#bd7149':'#bda35d','stroke-width':active?.018:.011,opacity:active?1:.42,'marker-end':'url(#convex-detail-arrow)','data-ray-part':part});
   }
   for(const[key,n]of [['enter',1],['exit',2]]){
    const p=r[key],active=key===step;el('circle',{cx:p[0],cy:p[1],r:active?.042:.022,fill:active?'#f1d681':'#6c9f8f',stroke:active?'#176b53':'none','stroke-width':.012,'data-interface':n});
    const t=el('text',{x:p[0]-.035,y:p[1]-.09,'font-size':.13,fill:'#176b53','font-weight':750});t.textContent=n;
   }
   const p=r[step],N=step==='enter'?r.N1:r.N2;
   path([[p[0]-N[0]*.65,p[1]-N[1]*.65],[p[0]+N[0]*.65,p[1]+N[1]*.65]],{stroke:'#586e62','stroke-width':.01,'stroke-dasharray':'.045 .035','data-surface-normal':step});
   const text=el('text',{x:step==='enter'?p[0]-.56:p[0]+.2,y:p[1]-.23,'font-size':.14,fill:'#3f5d4b'});text.textContent='法線';
  }
  for(const[x,y,s]of [[step==='enter'?-.33:-.15,-1.7,'空氣'],[.45,-.32,'玻璃'],[step==='enter'?1.13:1.4,-1.7,'空氣']]){const t=el('text',{x,y,'text-anchor':'middle','font-size':.15,fill:'#4c6a58'});t.textContent=s;}
 }
 function update(){
  renderDetail();
  $('[data-parallel-rays]').textContent=showRays?'隱藏輔助光路':'顯示輔助光路';$('[data-parallel-rays]').setAttribute('aria-pressed',String(showRays));
  $('[data-parallel-close]').textContent=close?'返回整體觀察':'近看折射';$('[data-parallel-close]').setAttribute('aria-pressed',String(close));
  root.querySelectorAll('[data-convex-step]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.convexStep===step)));
  $('[data-convex-explain]').textContent=step==='enter'?'先看第一個表面：光從空氣進入玻璃，偏向這個表面的法線，與法線的夾角變小。':'再看第二個表面：光從玻璃進入空氣，偏離這個表面的法線，與法線的夾角變大。';
  $('[data-result]').textContent=showRays?'凸透鏡中間厚、邊緣薄。這組平行光在另一側會聚，會聚位置稱為焦點 F。凸透鏡中心到 F 的距離叫焦距；光通過焦點後仍繼續前進。':'先觀察鏡片厚薄，再顯示輔助光路，追蹤入射、玻璃內部與出射的方向。';
  canvas.setAttribute('aria-label',`立體凸透鏡實驗台，${close?'近看'+(step==='enter'?'進入玻璃':'離開玻璃'):'平行光會聚於焦點'}，光路${showRays?'顯示':'隱藏'}`);
  root.dataset.view=close?'surface':'overall';root.dataset.rays=String(showRays);root.dataset.step=step;
  studio?.update();
 }
 $('[data-parallel-rays]').addEventListener('click',()=>{showRays=!showRays;update();});
 $('[data-parallel-close]').addEventListener('click',()=>{close=!close;if(close)showRays=true;update();});
 root.querySelectorAll('[data-convex-step]').forEach(b=>b.addEventListener('click',()=>{step=b.dataset.convexStep;showRays=true;update();}));
 try{studio=createStudio();root.dataset.webgl='ready';}catch(error){canvas.hidden=true;$('[data-convex-fallback]').hidden=false;$('[data-parallel-close]').hidden=true;root.dataset.webgl='unavailable';console.warn('Convex 3D:',error.message);}
 update();root.dataset.ready='true';

 function createStudio(){
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const scene=new THREE.Scene();scene.background=new THREE.Color('#839487');scene.fog=new THREE.Fog('#839487',25,60);
  const camera=new THREE.PerspectiveCamera(43,1,.03,90),target=new THREE.Vector3(1.25,1.35,0);
  let orbit={azimuth:-.26,polar:1.39,radius:11.5},nearZoom=1,pending=0;
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
  box(scene,[12.5,.2,1.75],[1.25,-.04,0],wood);box(scene,[12.5,.07,1.75],[1.25,-.18,0],material('#725437'));
  for(const z of [-.58,.58]){box(scene,[12.1,.09,.10],[1.25,.10,z],steel);box(scene,[12.1,.028,.03],[1.25,.16,z],dark);}
  for(const x of [-4.6,7.1])for(const z of [-.66,.66])box(scene,[.22,.25,.22],[x,-.19,z],dark);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(100,100),material('#8e9a84',{roughness:.98}));floor.rotation.x=-Math.PI/2;floor.position.y=-.34;floor.receiveShadow=true;scene.add(floor);
  function mount(x,top){box(scene,[.62,.15,1.4],[x,.26,0],dark);box(scene,[.48,.07,1.13],[x,.37,0],steel);cylinder(scene,.055,top-.4,[x,(top+.4)/2,0],steel);for(const z of [-.63,.63])cylinder(scene,.06,.045,[x,.37,z],brass);}
  const sourceX=g.rays[0].from[0]*SCALE;
  mount(sourceX-.3,AXIS-.99);const source=box(scene,[.64,1.95,.78],[sourceX-.33,AXIS,0],dark);box(scene,[.025,2.02,.84],[sourceX-.02,AXIS,0],steel);
  for(const r of g.rays)box(scene,[.008,.055,.43],[sourceX-.004,AXIS-r.from[1]*SCALE,0],new THREE.MeshBasicMaterial({color:'#ffe6a0',toneMapped:false}),false);
  for(const y of [AXIS-.87,AXIS+.87])for(const z of [-.33,.33]){const bolt=new THREE.Mesh(new THREE.SphereGeometry(.025,12,8),brass);bolt.position.set(sourceX+.02,y,z);scene.add(bolt);}
  const centerX=g.thickness*SCALE/2,R=g.halfHeight*SCALE,profile=[];
  for(let i=0;i<=72;i++){const r=g.halfHeight*i/72;profile.push(new THREE.Vector2(r*SCALE,g.left(r)*SCALE));}
  for(let i=72;i>=0;i--){const r=g.halfHeight*i/72;profile.push(new THREE.Vector2(r*SCALE,g.right(r)*SCALE));}
  const lensGeometry=new THREE.LatheGeometry(profile,96),glass=new THREE.MeshPhysicalMaterial({color:'#d8f2ee',metalness:0,roughness:.06,transparent:true,opacity:.6,transmission:.08,ior:g.index,thickness:g.thickness*SCALE,depthWrite:false,side:THREE.DoubleSide});
  const lens=new THREE.Mesh(lensGeometry,glass);lens.rotation.z=-Math.PI/2;lens.position.y=AXIS;scene.add(lens);
  for(const edge of ['left','right']){const points=[];for(let i=0;i<=96;i++){const y=-g.halfHeight+2*g.halfHeight*i/96;points.push(world([g[edge](y),y]));}const outline=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:'#def6ee',transparent:true,opacity:.65,depthWrite:false,toneMapped:false}));scene.add(outline);}
  for(const x of [g.left(g.halfHeight)*SCALE,g.right(g.halfHeight)*SCALE]){const ring=new THREE.Mesh(new THREE.TorusGeometry(R+.045,.035,12,96),steel);ring.rotation.y=Math.PI/2;ring.position.set(x,AXIS,0);ring.castShadow=true;scene.add(ring);}
  mount(centerX,AXIS-R-.08);box(scene,[.55,.12,.23],[centerX,AXIS-R-.025,0],steel);box(scene,[.58,.12,.23],[centerX,AXIS+R+.045,0],steel);
  const knob=cylinder(scene,.11,.14,[centerX,AXIS+R+.17,0],steel);for(let i=0;i<12;i++){const a=i*Math.PI/6;box(knob,[.017,.13,.025],[Math.cos(a)*.1,0,Math.sin(a)*.1],dark,false);}
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
  const selection=new THREE.Group();scene.add(selection);
  const selectedPoint=new THREE.Mesh(new THREE.SphereGeometry(.036,16,12),new THREE.MeshBasicMaterial({color:'#badd98',toneMapped:false}));selection.add(selectedPoint);
  const normal=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineDashedMaterial({color:'#e3eedb',dashSize:.045,gapSize:.025,depthTest:false}));normal.renderOrder=4;selection.add(normal);
  function updateCamera(){
   const aspect=Math.max(camera.aspect,.55);let aim=target;
   if(close){aim=world(g.rays[0][step]);const r=3.8*nearZoom*Math.max(1,.95/aspect);camera.position.set(aim.x-.65,aim.y+.25,r);camera.lookAt(aim);}
   else{const r=orbit.radius*Math.max(1,1.55/aspect);camera.position.set(target.x+r*Math.sin(orbit.polar)*Math.sin(orbit.azimuth),target.y+r*Math.cos(orbit.polar),target.z+r*Math.sin(orbit.polar)*Math.cos(orbit.azimuth));camera.lookAt(target);}
   camera.updateProjectionMatrix();camera.updateMatrixWorld();
  }
  const labels={source:{point:new THREE.Vector3(sourceX,AXIS+.92,0),dx:-10,dy:-18},thick:{point:new THREE.Vector3(centerX,AXIS,0),dx:42,dy:-8},thin:{point:new THREE.Vector3(centerX,AXIS+R*.94,0),dx:48,dy:-12},focus:{point:focus.position,dx:0,dy:-22},axis:{point:new THREE.Vector3(g.rays[0].end[0]*SCALE,AXIS,0),dx:-12,dy:29}};
  function updateLabels(){const rect=canvas.getBoundingClientRect();for(const[name,config]of Object.entries(labels)){const e=$(`[data-convex-label=${name}]`),v=config.point.clone().project(camera);e.hidden=(name==='focus'&&!showRays)||v.z< -1||v.z>1||Math.abs(v.x)>.96||Math.abs(v.y)>.9;if(e.hidden)continue;const x=(v.x+1)*rect.width/2+config.dx,y=(1-v.y)*rect.height/2+config.dy;e.style.left=Math.max(e.offsetWidth/2+5,Math.min(rect.width-e.offsetWidth/2-5,x))+'px';e.style.top=Math.max(67,y)+'px';}}
  let lastRayRadius=0;
  function draw(){pending=0;
   const distance=camera.position.distanceTo(close?world(g.rays[0][step]):target),pixelWorld=2*distance*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))/Math.max(1,canvas.clientHeight),radius=THREE.MathUtils.clamp(pixelWorld*.72,.004,.045);
   if(Math.abs(radius-lastRayRadius)>.0007){for(const tube of rays.children.filter(m=>m.geometry.type==='TubeGeometry')){const {path,tubularSegments}=tube.geometry.parameters;tube.geometry.dispose();tube.geometry=new THREE.TubeGeometry(path,tubularSegments,radius,7,false);}lastRayRadius=radius;}
   const scale=THREE.MathUtils.clamp(pixelWorld/.02,.4,2.5);arrowMeshes.forEach(m=>m.scale.setScalar(scale));focus.scale.setScalar(scale);
   renderer.render(scene,camera);updateLabels();
  }
  function requestDraw(){if(!pending)pending=requestAnimationFrame(draw);}
  function resize(){const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;updateCamera();requestDraw();}
  function update(){rays.visible=showRays;focus.visible=showRays;selection.visible=showRays&&close;selectedPoint.position.copy(world(g.rays[0][step]));const p=g.rays[0][step],N=step==='enter'?g.rays[0].N1:g.rays[0].N2;normal.geometry.dispose();normal.geometry=new THREE.BufferGeometry().setFromPoints([world([p[0]-N[0]*.8,p[1]-N[1]*.8]),world([p[0]+N[0]*.8,p[1]+N[1]*.8])]);normal.computeLineDistances();updateCamera();requestDraw();}
  const pointers=new Map();let gesture=null;
  const pinch=()=>{const p=[...pointers.values()];return p.length<2?0:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);};
  canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);gesture=pointers.size>1?{kind:'pinch',distance:pinch(),radius:orbit.radius,nearZoom}:{kind:'orbit',x:e.clientX,y:e.clientY,azimuth:orbit.azimuth,polar:orbit.polar};});
  canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId)||!gesture)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(gesture.kind==='pinch'){const ratio=gesture.distance/Math.max(20,pinch());if(close)nearZoom=THREE.MathUtils.clamp(gesture.nearZoom*ratio,.7,1.8);else orbit.radius=THREE.MathUtils.clamp(gesture.radius*ratio,7,19);}else if(!close){orbit.azimuth=THREE.MathUtils.clamp(gesture.azimuth-(e.clientX-gesture.x)*.004,-.9,.7);orbit.polar=THREE.MathUtils.clamp(gesture.polar+(e.clientY-gesture.y)*.003,.85,1.55);}updateCamera();requestDraw();});
  function stop(e){pointers.delete(e.pointerId);gesture=null;}
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,stop);
  canvas.addEventListener('wheel',e=>{e.preventDefault();if(close)nearZoom=THREE.MathUtils.clamp(nearZoom+e.deltaY*.002,.7,1.8);else orbit.radius=THREE.MathUtils.clamp(orbit.radius+e.deltaY*.008,7,19);updateCamera();requestDraw();},{passive:false});
  canvas.addEventListener('keydown',e=>{const map={ArrowLeft:[-.07,0],ArrowRight:[.07,0],ArrowUp:[0,-.05],ArrowDown:[0,.05]};if(!map[e.key]||close)return;e.preventDefault();orbit.azimuth=THREE.MathUtils.clamp(orbit.azimuth+map[e.key][0],-.9,.7);orbit.polar=THREE.MathUtils.clamp(orbit.polar+map[e.key][1],.85,1.55);updateCamera();requestDraw();});
  new ResizeObserver(resize).observe(canvas);resize();document.addEventListener('visibilitychange',()=>{if(!document.hidden)requestDraw();});
  return {update,scene,camera,renderer,lens,rays,focus,source,selection,g,world};
 }
}
