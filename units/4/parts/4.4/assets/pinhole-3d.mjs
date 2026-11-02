import * as THREE from '../../4.1/assets/vendor/three/build/three.module.js';
import {PINHOLE as G,MARKERS,clampScreen,projectionState,blockedSegments} from './pinhole-optics.mjs?v=20261102-pinhole1';
const root=document.querySelector('[data-pinhole-lab]');
if(root) initialise().catch(error=>{
 root.dataset.ready='error';root.querySelector('[data-pinhole-fallback]').hidden=false;
 root.querySelector('[data-pinhole-status]').textContent='立體實驗台載入失敗，請重新整理，或使用支援 WebGL 的瀏覽器。';
 console.error('Pinhole scene:',error);
});
async function initialise(){
 const $=s=>root.querySelector(s),canvas=$('#pinhole-canvas');
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 const scene=new THREE.Scene();scene.background=new THREE.Color('#14251d');scene.fog=new THREE.Fog('#14251d',17,35);
 const camera=new THREE.PerspectiveCamera(43,1,.025,70),target=new THREE.Vector3(.25,1.15,0);
 const HOME={azimuth:-.95,polar:1.15,radius:10.1};let orbit={...HOME},screenX=G.screenInitial,front=false,showRays=false,tracked='both',pendingFrame=0;
 const hemi=new THREE.HemisphereLight('#b1c5b4','#26382b',.9);scene.add(hemi);
 const key=new THREE.DirectionalLight('#dce4cd',2.3);key.position.set(-1,7,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-6;key.shadow.camera.right=6;key.shadow.camera.top=5;key.shadow.camera.bottom=-5;key.shadow.bias=-.0002;scene.add(key);
 const rim=new THREE.DirectionalLight('#8ca6b7',.55);rim.position.set(5,4,-5);scene.add(rim);
 const mat=(color,opts={})=>new THREE.MeshStandardMaterial({color,roughness:.65,metalness:.1,...opts});
 const metal=mat('#617267',{metalness:.65,roughness:.32}),dark=mat('#1c2a22',{metalness:.45,roughness:.4}),brass=mat('#a78748',{metalness:.78,roughness:.31});
 function box(parent,size,pos,material,cast=true){const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),material);mesh.position.set(...pos);mesh.castShadow=cast;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
 function cylinder(parent,radius,height,pos,material){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,height,24),material);mesh.position.set(...pos);mesh.castShadow=true;parent.add(mesh);return mesh;}
 const wc=document.createElement('canvas');wc.width=1024;wc.height=256;const w=wc.getContext('2d');w.fillStyle='#a27e50';w.fillRect(0,0,1024,256);
 let seed=42;function random(){seed=(1664525*seed+1013904223)>>>0;return seed/2**32;}
 for(let i=0;i<180;i++){const y=random()*256;w.beginPath();w.moveTo(0,y);for(let x=0;x<1024;x+=64)w.quadraticCurveTo(x+32,y+(random()-.5)*7,x+64,y);w.strokeStyle=i%3?'#4d361a28':'#f8d8a722';w.lineWidth=.5+random();w.stroke();}
 const woodTexture=new THREE.CanvasTexture(wc);woodTexture.colorSpace=THREE.SRGBColorSpace;
 const wood=mat('#c9af83',{map:woodTexture,roughness:.6});
 box(scene,[8.5,.18,1.95],[.1,-.05,0],wood);box(scene,[8.5,.08,1.95],[.1,-.18,0],mat('#4a3522'));
 for(const z of [-.65,.65]){box(scene,[8.1,.09,.10],[.1,.085,z],metal);box(scene,[8.1,.025,.028],[.1,.142,z],dark);}
 for(const x of [-3.8,4])for(const z of [-.68,.68])box(scene,[.18,.25,.18],[x,-.08,z],dark);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(80,80),mat('#25362b',{roughness:.98}));floor.rotation.x=-Math.PI/2;floor.position.y=-.24;floor.receiveShadow=true;scene.add(floor);
 function mount(parent,x,top){
  box(parent,[.58,.15,1.45],[x,.22,0],dark);box(parent,[.42,.08,1.18],[x,.325,0],metal);
  cylinder(parent,.055,Math.max(.1,top-.36),[x,(top+.36)/2,-.52],metal);
  cylinder(parent,.11,.12,[x,top-.1,-.52],dark);
  for(const z of [-.68,.68]){const screw=cylinder(parent,.055,.05,[x,.32,z],brass);screw.rotation.z=Math.PI/2;}
 }
 function panelFrame(parent,x,width,height){
  for(const z of [-width/2-.03,width/2+.03])box(parent,[.11,height+.14,.09],[x-.055,G.axisY,z],dark);
  for(const y of [G.axisY-height/2-.03,G.axisY+height/2+.03])box(parent,[.11,.09,width+.14],[x-.055,y,0],dark);
  for(const y of [G.axisY-height/2-.025,G.axisY+height/2+.025])box(parent,[.035,.026,width+.14],[x-.012,y,0],metal);
  for(const z of [-width/2-.025,width/2+.025])box(parent,[.035,height+.14,.026],[x-.012,G.axisY,z],metal);
  for(const y of [G.axisY-height/2,G.axisY+height/2])for(const z of [-width/2,width/2]){const screw=new THREE.Mesh(new THREE.SphereGeometry(.026,12,8),brass);screw.position.set(x+.008,y,z);parent.add(screw);}
 }
 const sourceGroup=new THREE.Group();scene.add(sourceGroup);mount(sourceGroup,G.sourceX,G.axisY-G.cardHeight/2);panelFrame(sourceGroup,G.sourceX,G.cardWidth,G.cardHeight);
 const art=document.createElement('canvas');art.width=512;art.height=768;const a=art.getContext('2d');
 a.fillStyle='#fb685b';a.beginPath();a.moveTo(256,107.52);a.lineTo(196,234.24);a.lineTo(316,234.24);a.closePath();a.fill();
 a.fillStyle='#9bc86a';a.fillRect(247,261,18,223);a.fillStyle='#69a6e8';a.beginPath();a.arc(256,576,43,0,Math.PI*2);a.fill();
 const sourceTexture=new THREE.CanvasTexture(art);sourceTexture.colorSpace=THREE.SRGBColorSpace;
 const sourceMaterial=new THREE.MeshBasicMaterial({map:sourceTexture,transparent:true,toneMapped:false});
 const sourceBacking=new THREE.Mesh(new THREE.PlaneGeometry(G.cardWidth,G.cardHeight),mat('#0c140f',{side:THREE.DoubleSide}));sourceBacking.rotation.y=Math.PI/2;sourceBacking.position.set(G.sourceX-.005,G.axisY,0);sourceGroup.add(sourceBacking);
 const sourcePlane=new THREE.Mesh(new THREE.PlaneGeometry(G.cardWidth,G.cardHeight),sourceMaterial);sourcePlane.rotation.y=Math.PI/2;sourcePlane.position.set(G.sourceX,G.axisY,0);sourceGroup.add(sourcePlane);
 const sourceBack=sourcePlane.clone();sourceBack.rotation.y=-Math.PI/2;sourceBack.position.x=G.sourceX-.01;sourceGroup.add(sourceBack);
 const sourceGlow=new THREE.PointLight('#e0eac4',.28,1.6);sourceGlow.position.set(G.sourceX+.15,G.axisY,0);scene.add(sourceGlow);
 const plateGroup=new THREE.Group();scene.add(plateGroup);mount(plateGroup,0,.55);
 const plateShape=new THREE.Shape();plateShape.moveTo(-.79,-1.05);plateShape.lineTo(.79,-1.05);plateShape.lineTo(.79,1.05);plateShape.lineTo(-.79,1.05);plateShape.closePath();
 const hole=new THREE.Path();hole.absarc(0,0,G.holeRadius,0,Math.PI*2,true);plateShape.holes.push(hole);
 const plateGeometry=new THREE.ExtrudeGeometry(plateShape,{depth:G.plateThickness,bevelEnabled:false,curveSegments:36});
 const plate=new THREE.Mesh(plateGeometry,mat('#17241c',{roughness:.7,metalness:.2}));plate.rotation.y=Math.PI/2;plate.position.set(-G.plateThickness/2,G.axisY,0);plate.castShadow=true;plate.receiveShadow=true;plateGroup.add(plate);
 const holeRim=new THREE.Mesh(new THREE.TorusGeometry(G.holeRadius+.014,.009,8,40),brass);holeRim.rotation.y=Math.PI/2;holeRim.position.set(-G.plateThickness/2-.003,G.axisY,0);plateGroup.add(holeRim);
 for(const y of [G.axisY-.97,G.axisY+.97])for(const z of [-.70,.70]){const screw=new THREE.Mesh(new THREE.SphereGeometry(.026,12,8),brass);screw.position.set(-.045,y,z);plateGroup.add(screw);}
 const screenGroup=new THREE.Group();scene.add(screenGroup);mount(screenGroup,0,.33);
 // The rear backing is opaque; the receiving paper and image exist only on -X.
 box(screenGroup,[.12,G.screenHeight+.14,G.screenWidth+.14],[.045,G.axisY,0],dark);
 const paper=new THREE.Mesh(new THREE.PlaneGeometry(G.screenWidth,G.screenHeight),new THREE.MeshBasicMaterial({color:'#465247',toneMapped:false}));paper.rotation.y=-Math.PI/2;paper.position.set(-.017,G.axisY,0);paper.receiveShadow=true;screenGroup.add(paper);
 for(const z of [-G.screenWidth/2-.025,G.screenWidth/2+.025])box(screenGroup,[.04,G.screenHeight+.14,.028],[-.03,G.axisY,z],metal);
 for(const y of [G.axisY-G.screenHeight/2-.025,G.axisY+G.screenHeight/2+.025])box(screenGroup,[.04,.028,G.screenWidth+.14],[-.03,y,0],metal);
 for(const y of [G.axisY-G.screenHeight/2,G.axisY+G.screenHeight/2])for(const z of [-G.screenWidth/2,G.screenWidth/2]){const screw=new THREE.Mesh(new THREE.SphereGeometry(.026,12,8),brass);screw.position.set(-.045,y,z);screenGroup.add(screw);}
 const projectionCanvas=document.createElement('canvas');projectionCanvas.width=512;projectionCanvas.height=768;const pc=projectionCanvas.getContext('2d');
 const projectedTexture=new THREE.CanvasTexture(projectionCanvas);projectedTexture.colorSpace=THREE.SRGBColorSpace;
 const imageMaterial=new THREE.MeshBasicMaterial({map:projectedTexture,transparent:true,depthWrite:false,toneMapped:false});
 const imagePlane=new THREE.Mesh(new THREE.PlaneGeometry(G.screenWidth,G.screenHeight),imageMaterial);imagePlane.rotation.y=-Math.PI/2;imagePlane.position.set(-.021,G.axisY,0);screenGroup.add(imagePlane);
 const grip=box(screenGroup,[.30,.18,.35],[-.04,.36,.78],brass);const gripLines=new THREE.Group();screenGroup.add(gripLines);
 for(let n=0;n<4;n++)box(gripLines,[.305,.018,.30],[-.04,.30+n*.035,.78],dark,false);
 const highlight=new THREE.BoxHelper(screenGroup,'#b8d89f');highlight.visible=false;scene.add(highlight);
 const rays=new THREE.Group();scene.add(rays);
 function disposeRays(){for(const child of [...rays.children]){child.geometry?.dispose();child.material?.dispose();rays.remove(child);}}
 function rayLine(points,color,opacity=1){const geo=new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p)));const material=new THREE.LineBasicMaterial({color,transparent:true,opacity,depthTest:true});const line=new THREE.Line(geo,material);rays.add(line);return line;}
 function drawRays(g){
  disposeRays();rays.visible=showRays;if(!showRays)return;
  for(const name of ['top','bottom']){if(tracked!=='both'&&name!==tracked)continue;const p=MARKERS[name],end=[...g[name]];end[0]=screenX;
   // Stop on the receiving face. Recompute the actual line-plane intersection.
   const t=(end[0]-G.holeX)/(G.holeX-p[0]);end[1]=G.axisY-t*(p[1]-G.axisY);end[2]=-t*p[2];
   const color=name==='top'?'#eb7767':'#75b2e1';rayLine([p,[0,G.axisY,0],end],color);
   for(const segment of blockedSegments(p))rayLine([segment.from,segment.to],color,.32);
  }
 }
 function updateCamera(){
  const aspect=camera.aspect;
  if(front){const d=Math.min(2,screenX-.25);camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(Math.max(G.screenHeight+.65,(G.screenWidth+.5)/aspect)/(2*d)));camera.position.set(screenX-d,G.axisY,0);camera.lookAt(screenX,G.axisY,0);}
  else{camera.fov=43;const r=orbit.radius*Math.max(1,1.05/Math.max(aspect,.62));camera.position.set(target.x+r*Math.sin(orbit.polar)*Math.sin(orbit.azimuth),target.y+r*Math.cos(orbit.polar),target.z+r*Math.sin(orbit.polar)*Math.cos(orbit.azimuth));camera.lookAt(target);}
  camera.updateProjectionMatrix();camera.updateMatrixWorld();
 }
 function draw(){pendingFrame=0;if(!canvas.isConnected)return;renderer.render(scene,camera);}
 function requestDraw(){if(!pendingFrame)pendingFrame=requestAnimationFrame(draw);}
 function update(){
  const g=projectionState(screenX);screenGroup.position.x=screenX+.021;
  pc.clearRect(0,0,512,768);pc.save();pc.translate(256,384);pc.scale(g.imageWidth/G.screenWidth,g.imageHeight/G.screenHeight*-1);pc.filter='blur(1.1px)';pc.drawImage(art,-256,-384);pc.restore();projectedTexture.needsUpdate=true;imageMaterial.opacity=g.brightness;
  drawRays(g);scene.updateMatrixWorld(true);highlight.update();updateCamera();
  const relative=g.magnification<.985?'縮小':g.magnification>1.015?'放大':'等大';
  $('[data-pinhole-status]').textContent=showRays?(tracked==='top'?'圖卡上端的光沿直線穿過小孔，落在屏幕下方；其他方向的代表光線被孔板擋住。':tracked==='bottom'?'圖卡下端的光沿直線穿過小孔，落在屏幕上方；光穿孔後沒有轉彎。':'上端的光到下方，下端的光到上方；交會後各自沿直線繼續前進。'):`屏幕上形成倒立${relative}像。對照發光圖卡的上端與下端，找找它們出現在哪裡。`;
  $('[data-pinhole-position]').textContent=screenX<G.screenInitial-.15?'屏幕已移近小孔':screenX>G.screenInitial+.15?'屏幕已移遠小孔':'屏幕在初始位置';
  $('[data-pinhole-view]').textContent=front?'返回整體觀察':'正面看屏幕';$('[data-pinhole-view]').setAttribute('aria-pressed',String(front));
  $('[data-pinhole-hint]').textContent=front?'正面觀察同一片屏幕；返回整體觀察可拖動器材。':'拖曳屏幕底座沿光軌移動；拖曳空白處旋轉，滾輪或雙指縮放。';
  $('[data-pinhole-trace]').hidden=!showRays;$('[data-pinhole-rays]').checked=showRays;
  root.querySelectorAll('[data-pinhole-point]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.pinholePoint===tracked)));
  $('[data-pinhole-screen]').setAttribute('aria-label',`屏幕，${$('[data-pinhole-position]').textContent}。方向鍵移動，Home回到最近位置，End移到最遠位置。`);
  canvas.setAttribute('aria-label',`立體針孔成像實驗台，${front?'正面觀察屏幕':'可旋轉整體觀察'}，形成倒立${relative}像，輔助光路${showRays?'顯示':'隱藏'}`);
  root.dataset.view=front?'screen':'orbit';root.dataset.screenX=screenX.toFixed(4);root.dataset.magnification=g.magnification.toFixed(4);root.dataset.rays=String(showRays);root.dataset.point=tracked;
  requestDraw();
 }
 function resetPosition(){screenX=G.screenInitial;update();}
 $('[data-pinhole-reset]').addEventListener('click',resetPosition);
 $('[data-pinhole-home]').addEventListener('click',()=>{front=false;orbit={...HOME};update();});
 $('[data-pinhole-view]').addEventListener('click',()=>{front=!front;update();});
 $('[data-pinhole-rays]').addEventListener('change',e=>{showRays=e.target.checked;update();});
 root.querySelectorAll('[data-pinhole-point]').forEach(b=>b.addEventListener('click',()=>{tracked=b.dataset.pinholePoint;update();}));
 $('[data-pinhole-screen]').addEventListener('keydown',e=>{let next=screenX;if(e.key==='ArrowLeft'||e.key==='ArrowDown')next-=.06;else if(e.key==='ArrowRight'||e.key==='ArrowUp')next+=.06;else if(e.key==='Home')next=G.screenMin;else if(e.key==='End')next=G.screenMax;else return;e.preventDefault();screenX=clampScreen(next);update();});
 const raycaster=new THREE.Raycaster(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),-G.axisY),pointer=new THREE.Vector2(),intersection=new THREE.Vector3();
 const pointers=new Map();let gesture=null,initialPinch=0;
 function rayAtEvent(e){const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);}
 function hitScreen(e){rayAtEvent(e);scene.updateMatrixWorld(true);return raycaster.intersectObject(screenGroup,true)[0]||null;}
 function groundX(e){rayAtEvent(e);return raycaster.ray.intersectPlane(plane,intersection)?intersection.x:null;}
 const pinch=()=>{const p=[...pointers.values()];return p.length<2?0:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);};
 canvas.addEventListener('pointerdown',e=>{
  if(e.button!==0)return;e.preventDefault();pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);
  if(pointers.size>1){initialPinch=pinch();gesture={kind:'pinch',radius:orbit.radius};highlight.visible=false;requestDraw();return;}
  const hit=!front?hitScreen(e):null,selected=!!hit;if(hit)plane.constant=-hit.point.y;gesture={kind:selected?'screen':'orbit',startX:e.clientX,startY:e.clientY,screenX,groundX:selected?groundX(e):null,azimuth:orbit.azimuth,polar:orbit.polar,dragged:false};
  highlight.visible=selected;canvas.style.cursor=selected?'ew-resize':'grabbing';requestDraw();
 });
 canvas.addEventListener('pointermove',e=>{
  if(!pointers.has(e.pointerId)){const over=!front&&!!hitScreen(e);if(highlight.visible!==over){highlight.visible=over;requestDraw();}canvas.style.cursor=over?'ew-resize':'grab';return;}
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(!gesture)return;
  if(pointers.size>1){if(front)front=false;const d=pinch();orbit.radius=THREE.MathUtils.clamp(gesture.radius-(d-initialPinch)*.025,5.8,16);update();return;}
  const dx=e.clientX-gesture.startX,dy=e.clientY-gesture.startY;if(Math.hypot(dx,dy)<4&&!gesture.dragged)return;gesture.dragged=true;
  if(gesture.kind==='screen'){const x=groundX(e);if(x!==null&&gesture.groundX!==null){screenX=clampScreen(gesture.screenX+x-gesture.groundX);update();}}
  else{if(front)front=false;orbit.azimuth=gesture.azimuth-dx*.006;orbit.polar=THREE.MathUtils.clamp(gesture.polar+dy*.004,.36,1.48);update();}
 });
 function stop(e){pointers.delete(e.pointerId);gesture=null;initialPinch=0;highlight.visible=false;canvas.style.cursor='grab';requestDraw();}
 canvas.addEventListener('pointerup',stop);canvas.addEventListener('pointercancel',stop);canvas.addEventListener('lostpointercapture',stop);
 canvas.addEventListener('pointerleave',()=>{if(!pointers.size){highlight.visible=false;requestDraw();}});
 canvas.addEventListener('wheel',e=>{e.preventDefault();if(front)front=false;orbit.radius=THREE.MathUtils.clamp(orbit.radius+e.deltaY*.007,5.8,16);update();},{passive:false});
 canvas.addEventListener('keydown',e=>{const steps={ArrowLeft:[.08,0],ArrowRight:[-.08,0],ArrowUp:[0,-.06],ArrowDown:[0,.06]};if(!steps[e.key])return;e.preventDefault();front=false;orbit.azimuth+=steps[e.key][0];orbit.polar=THREE.MathUtils.clamp(orbit.polar+steps[e.key][1],.36,1.48);update();});
 function resize(){const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;updateCamera();requestDraw();}
 new ResizeObserver(resize).observe(canvas);resize();update();root.dataset.ready='true';
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)requestDraw();});
}
