import * as THREE from '../../4.1/assets/vendor/three/build/three.module.js';
import {PRISM,SOURCE,SCREEN_X,SCREEN_RANGE,prismRays,LIGHTS,MATERIALS,FILTERS,rgbCss} from './color-model.mjs';
import {drawScreen} from './rendering.mjs';
import {createSurfaceAppearance} from './surface-appearance.mjs?v=merged-surface-20261103';
const AXIS=1.65;
function woodTexture(){
 const c=document.createElement('canvas');c.width=512;c.height=256;const x=c.getContext('2d');x.fillStyle='#b38a59';x.fillRect(0,0,512,256);
 for(let y=0;y<256;y++){const v=128+Math.sin(y*.25)*10+Math.sin(y*.93)*5;x.strokeStyle=`rgba(${v},85,44,.19)`;x.beginPath();for(let i=0;i<=512;i+=8){const q=y+Math.sin(i*.02+y*.17)*2;if(!i)x.moveTo(i,q);else x.lineTo(i,q);}x.stroke();}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(2,2);return t;
}
function basic(rgb){return new THREE.MeshBasicMaterial({color:new THREE.Color().setRGB(...rgb),toneMapped:false,side:THREE.DoubleSide});}
export function createStudio(root,callbacks){
 const canvas=root.querySelector('[data-studio]'),surface=root.dataset.lab==='surface';
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 const scene=new THREE.Scene();scene.background=new THREE.Color(surface?'#283126':'#91a190');scene.fog=new THREE.Fog(surface?'#283126':'#91a190',23,50);
 const camera=new THREE.PerspectiveCamera(40,1,.05,70),target=surface?new THREE.Vector3(-1.6,1.05,.1):new THREE.Vector3(0,1.1,-.65);
 const orbit=surface?{azimuth:-1.05,polar:1.16,radius:7.0}:{azimuth:-.85,polar:1.08,radius:12.6};let topView=false,frame=0,state=null,signal=null,drag=null,canvasWidth=0,fit=1;
 scene.add(new THREE.HemisphereLight('#fff7e2','#6a7a60',surface?.08:2.2));const sun=new THREE.DirectionalLight('#fff4dc',surface?.28:3.3);sun.position.set(-4,8,6);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-7,right:7,top:7,bottom:-7});sun.shadow.bias=-.0006;scene.add(sun);
 const fill=new THREE.DirectionalLight('#d6f0f7',surface?.1:1.3);fill.position.set(6,4,-3);scene.add(fill);
 const metal=new THREE.MeshStandardMaterial({color:'#82928b',metalness:.8,roughness:.28}),dark=new THREE.MeshStandardMaterial({color:'#293d36',metalness:.5,roughness:.35}),brass=new THREE.MeshStandardMaterial({color:'#bd9a63',metalness:.75,roughness:.3}),paper=new THREE.MeshStandardMaterial({color:'#e8e9de',roughness:.92,side:THREE.DoubleSide});
 const box=(parent,size,position,material,shadow=true)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(...size),material);m.position.set(...position);m.castShadow=shadow;m.receiveShadow=true;parent.add(m);return m;};
 const cylinder=(parent,radius,height,position,material)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,height,48),material);m.position.set(...position);m.castShadow=true;parent.add(m);return m;};
 box(scene,[9.6,.28,7.6],[0,.1,-.9],new THREE.MeshStandardMaterial({map:woodTexture(),roughness:.7}));
 box(scene,[9.65,.11,7.65],[0,-.095,-.9],new THREE.MeshStandardMaterial({color:'#765332',roughness:.7}));
 for(const z of[-.28,.28])box(scene,[8,.035,.035],[-.1,.27,z],metal,false);
 for(const[x,z]of[[-4.3,-3.9],[4.3,-3.9],[-4.3,2.1],[4.3,2.1]])box(scene,[.22,2,.22],[x,-1,z],dark);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(120,120),new THREE.MeshStandardMaterial({color:'#b8c3a8',roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-2;floor.receiveShadow=true;scene.add(floor);
 function mount(parent,x,z,height=.65){box(parent,[.65,.1,.55],[x,.3,z],dark);box(parent,[.55,.045,.46],[x,.37,z],metal);cylinder(parent,.047,height,[x,.39+height/2,z],metal);cylinder(parent,.085,.13,[x,.55,z],brass);}
 const lamp=new THREE.Group();scene.add(lamp);mount(lamp,-3.6,0,.92);
 const lampHousing=cylinder(lamp,.25,.75,[-3.6,AXIS,0],dark);lampHousing.rotation.z=Math.PI/2;
 for(const x of[-3.94,-3.32]){const ring=new THREE.Mesh(new THREE.TorusGeometry(.25,.025,12,48),metal);ring.rotation.y=Math.PI/2;ring.position.set(x,AXIS,0);lamp.add(ring);}
 const lampGlow=new THREE.Mesh(new THREE.CircleGeometry(.22,48),basic([1,1,1]));lampGlow.rotation.y=Math.PI/2;lampGlow.position.set(-3.205,AXIS,0);lamp.add(lampGlow);
 const slit=new THREE.Group();scene.add(slit);mount(slit,-2.65,0,.87);for(const z of[-.145,.145])box(slit,[.07,.7,.24],[-2.65,AXIS,z],dark);box(slit,[.085,.04,.54],[-2.65,AXIS+.36,0],metal);
 const prism=new THREE.Group();scene.add(prism);mount(prism,0,0,.57);box(prism,[1.8,.10,1.55],[0,1.03,0],metal);
 const vertices=[],indices=[];for(const y of[1.09,2.23])for(const[x,z]of PRISM)vertices.push(x,y,z);
 indices.push(0,2,1,3,4,5);for(let i=0;i<3;i++){const j=(i+1)%3;indices.push(i,j,j+3,i,j+3,i+3);}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);const solid=geometry.toNonIndexed();solid.computeVertexNormals();
 const glass=new THREE.Mesh(solid,new THREE.MeshPhysicalMaterial({color:'#c1e3d8',metalness:0,roughness:.06,transparent:true,opacity:.34,transmission:.25,ior:1.52,depthWrite:false,side:THREE.DoubleSide}));glass.castShadow=true;glass.userData.prism=true;prism.add(glass);
 const edges=new THREE.LineSegments(new THREE.EdgesGeometry(geometry),new THREE.LineBasicMaterial({color:'#d8fff3',transparent:true,opacity:.8}));prism.add(edges);
 for(const[x,z]of PRISM)cylinder(prism,.035,.18,[x,1.08,z],brass);
 const screen=new THREE.Group();scene.add(screen);const screenCanvas=document.createElement('canvas');screenCanvas.width=640;screenCanvas.height=320;
 const texture=new THREE.CanvasTexture(screenCanvas);texture.colorSpace=THREE.SRGBColorSpace;
 const screenPaper=new THREE.Mesh(new THREE.PlaneGeometry(SCREEN_RANGE[1]-SCREEN_RANGE[0],2.35),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,toneMapped:false}));screenPaper.rotation.y=-Math.PI/2;screenPaper.position.set(SCREEN_X,1.6,(SCREEN_RANGE[0]+SCREEN_RANGE[1])/2);screen.add(screenPaper);
 for(const z of SCREEN_RANGE){box(screen,[.065,2.48,.06],[SCREEN_X,1.6,z],metal);mount(screen,SCREEN_X,z,.35);}for(const y of[.39,2.81])box(screen,[.065,.06,SCREEN_RANGE[1]-SCREEN_RANGE[0]+.1],[SCREEN_X,y,(SCREEN_RANGE[0]+SCREEN_RANGE[1])/2],metal);
 const sample=new THREE.Group();scene.add(sample);mount(sample,0,0,.5);box(sample,[.11,.14,1.37],[0,.97,0],dark);
 const card=new THREE.Mesh(new THREE.PlaneGeometry(1.25,1.4),basic(MATERIALS.red.rgb));card.rotation.y=-Math.PI/2;card.position.y=AXIS;sample.add(card);
 const surfaceAppearance=surface?createSurfaceAppearance(scene,card):null;
 for(const z of[-.65,.65])box(sample,[.07,1.55,.045],[0,AXIS,z],metal);for(const y of[AXIS-.75,AXIS+.75])box(sample,[.07,.045,1.35],[0,y,0],metal);
 const observer=new THREE.Group();scene.add(observer);mount(observer,0,0,.75);
 const eyeCanvas=document.createElement('canvas');eyeCanvas.width=256;eyeCanvas.height=160;const ec=eyeCanvas.getContext('2d');ec.fillStyle='#eff2e8';ec.fillRect(0,0,256,160);ec.beginPath();ec.moveTo(30,80);ec.quadraticCurveTo(128,-10,226,80);ec.quadraticCurveTo(128,170,30,80);ec.fillStyle='#fffdf5';ec.fill();ec.strokeStyle='#637e6c';ec.lineWidth=7;ec.stroke();ec.beginPath();ec.arc(128,80,35,0,Math.PI*2);ec.fillStyle='#536e61';ec.fill();ec.beginPath();ec.arc(128,80,15,0,Math.PI*2);ec.fillStyle='#203c31';ec.fill();const eyeTexture=new THREE.CanvasTexture(eyeCanvas);eyeTexture.colorSpace=THREE.SRGBColorSpace;
 const eyeSign=new THREE.Mesh(new THREE.PlaneGeometry(1.25,.78),new THREE.MeshBasicMaterial({map:eyeTexture,side:THREE.DoubleSide,toneMapped:false}));eyeSign.position.y=AXIS;observer.add(eyeSign);
 const blocker=new THREE.Group();scene.add(blocker);mount(blocker,0,0,.65);box(blocker,[1.15,1.65,.07],[0,AXIS,0],new THREE.MeshStandardMaterial({color:'#263830',roughness:.9}));
 const rays=new THREE.Group();scene.add(rays);
 function clearRays(){const materials=new Set();for(const node of [...rays.children]){rays.remove(node);node.traverse(part=>{part.geometry?.dispose();if(part.material)materials.add(part.material);});}for(const material of materials)material.dispose();}
 function line(points,color,opacity=.9){const m=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:new THREE.Color().setRGB(...color),transparent:true,opacity,depthWrite:false,toneMapped:false}));rays.add(m);}
 function arrow(a,b,color,at=.55){const material=basic(color),cone=new THREE.Mesh(new THREE.ConeGeometry(.035,.12,10),material);const dir=b.clone().sub(a).normalize();cone.position.copy(a).lerp(b,at);cone.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir);rays.add(cone);}
 const v=([x,z],y=AXIS)=>new THREE.Vector3(x,y,z);
 function update(next,modelSignal){
  state=next;signal=modelSignal;const isPrism=state.kind==='prism',isFilter=state.kind==='filter'||state.kind==='eye'&&state.mode==='transmission';
  slit.visible=isPrism;prism.visible=isPrism;sample.visible=!isPrism;observer.visible=state.kind==='eye';blocker.visible=state.kind==='eye'&&state.blocked;screen.visible=isPrism||state.kind==='filter';
  prism.position.z=state.inserted?0:2.05;lampGlow.material.color.setRGB(...LIGHTS[state.light||'white'].rgb);
  if(isPrism){drawScreen(screenCanvas,state,false);texture.needsUpdate=true;}
  else{
   const material=isFilter?FILTERS[state.filter||'green']:MATERIALS[state.material||'green'];
   card.material.color.setRGB(...(isFilter?material.rgb:signal.outgoing));card.material.transparent=isFilter;card.material.opacity=isFilter?.38:1;card.material.needsUpdate=true;sample.visible=!(state.kind==='filter'&&state.filter==='clear');
   if(state.kind==='filter'){
    const c=screenCanvas.getContext('2d');c.fillStyle='#192b23';c.fillRect(0,0,640,320);const glow=c.createRadialGradient(320,160,20,320,160,150);glow.addColorStop(0,rgbCss(signal.outgoing));glow.addColorStop(.7,rgbCss(signal.outgoing));glow.addColorStop(1,'#192b23');c.fillStyle=glow;c.fillRect(0,0,640,320);texture.needsUpdate=true;
   }
  }
  const eyeTarget=new THREE.Vector3(...(state.mode==='transmission'?[2.8,0,0]:[-1.8,0,2.7]));observer.position.copy(eyeTarget);observer.rotation.y=state.mode==='transmission'?-Math.PI/2:-.6;
  blocker.position.copy(eyeTarget).multiplyScalar(.52);blocker.rotation.y=state.mode==='transmission'?Math.PI/2:-.6;
  if(surface)surfaceAppearance.illuminate(signal);
  clearRays();rays.visible=state.rays;
  if(state.rays){
   if(surface)surfaceAppearance.update(signal,rays);
   else if(isPrism){
    const trace=prismRays(state.light,state.inserted);const visible=state.inserted?trace.filter((_,i)=>i%2===0):[trace[Math.floor(trace.length/2)]];
    if(state.inserted)for(const y of[AXIS-.07,AXIS,AXIS+.07])line([v(SOURCE,y),v(trace[0].points[1],y)],LIGHTS[state.light].rgb,.95);
    for(const ray of visible){const color=state.light==='white'?(state.inserted?ray.rgb:[1,1,1]):LIGHTS[state.light].rgb;for(const y of[AXIS-.07,AXIS,AXIS+.07])line((state.inserted?ray.points.slice(1):ray.points).map(p=>v(p,y)),color,state.inserted?.75:.9);}
    arrow(v(SOURCE),v(state.inserted?trace[0].points[1]:[SCREEN_X,0]),LIGHTS[state.light].rgb,.45);
    if(state.inserted)for(const wavelength of[450,550,650]){const ray=trace.reduce((a,b)=>Math.abs(a.wavelength-wavelength)<Math.abs(b.wavelength-wavelength)?a:b);arrow(v(ray.points[2]),v(ray.points[3]),state.light==='white'?ray.rgb:LIGHTS[state.light].rgb,.55);}
   }else{
    const source=v([-3.2,0]),origin=v([0,0]);line([source,origin],signal.incoming);arrow(source,origin,signal.incoming);
    const output=signal.outgoing;
    if(Math.max(...output)>.008){
     if(isFilter){const end=state.kind==='eye'?new THREE.Vector3(eyeTarget.x,AXIS,eyeTarget.z):v([SCREEN_X,0]);if(blocker.visible)end.lerp(origin,.48);line([origin,end],output);arrow(origin,end,output);}
     else{
      for(const end of[v([-2.2,1.7]),v([-1.2,-1.6]),new THREE.Vector3(eyeTarget.x,AXIS,eyeTarget.z)]){if(blocker.visible&&end.z>2)end.lerp(origin,.48);line([origin,end],output,.8);arrow(origin,end,output);}
     }
    }
   }
  }
  requestDraw();
 }
 function updateCamera(){if(topView){if(surface){camera.position.set(-1.35,9.2,.05);camera.lookAt(-1.35,.5,0);}else{camera.position.set(-.1,12.7,-.4);camera.lookAt(0,.5,-.7);}}else{camera.position.set(target.x+Math.sin(orbit.azimuth)*Math.sin(orbit.polar)*orbit.radius*fit,target.y+Math.cos(orbit.polar)*orbit.radius*fit,target.z+Math.cos(orbit.azimuth)*Math.sin(orbit.polar)*orbit.radius*fit);camera.lookAt(target);}camera.updateProjectionMatrix();}
 function requestDraw(){if(frame)return;frame=requestAnimationFrame(()=>{frame=0;updateCamera();renderer.render(scene,camera);root.dataset.orbit=JSON.stringify({radius:orbit.radius,azimuth:orbit.azimuth,polar:orbit.polar});});}
 function resize(){const width=canvas.clientWidth,height=canvas.clientHeight;if(!width||!height)return;if(canvasWidth!==width||surface){canvasWidth=width;fit=Math.max(1,1.33/(width/height));}renderer.setSize(width,height,false);camera.aspect=width/height;requestDraw();}
 new ResizeObserver(resize).observe(canvas);
 function pointer(event){const r=canvas.getBoundingClientRect();return new THREE.Vector2((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);}
 const raycaster=new THREE.Raycaster(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),-AXIS),pointers=new Map();
 function world(event){raycaster.setFromCamera(pointer(event),camera);return raycaster.ray.intersectPlane(plane,new THREE.Vector3());}
 function pinch(){const p=[...pointers.values()];return p.length<2?0:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);}
 canvas.addEventListener('pointerdown',event=>{
  if(event.button!==0)return;event.preventDefault();canvas.setPointerCapture(event.pointerId);pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
  if(pointers.size>1){if(drag?.kind==='prism'){const inserted=drag.moved?prism.position.z<1.05:state.inserted;callbacks.prism(inserted);root.dataset.dragging='false';}drag={kind:'pinch',distance:pinch(),radius:orbit.radius};return;}
  raycaster.setFromCamera(pointer(event),camera);const hit=state?.kind==='prism'&&raycaster.intersectObject(glass).length;
  drag=hit?{kind:'prism',x:event.clientX,y:event.clientY,z:prism.position.z}:{kind:'orbit',x:event.clientX,y:event.clientY,azimuth:orbit.azimuth,polar:orbit.polar};
 });
 canvas.addEventListener('pointermove',event=>{
  if(!pointers.has(event.pointerId)||!drag)return;pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
  if(drag.kind==='prism'){
   const point=world(event);if(!point)return;const moved=Math.hypot(event.clientX-drag.x,event.clientY-drag.y)>7;if(!moved&&!drag.moved)return;drag.moved=true;prism.position.z=THREE.MathUtils.clamp(point.z,0,2.1);rays.visible=false;root.dataset.dragging='true';requestDraw();
  }else if(drag.kind==='pinch')orbit.radius=THREE.MathUtils.clamp(drag.radius*drag.distance/Math.max(10,pinch()),surface?5.8:8.5,surface?14:18);
  else if(!topView){orbit.azimuth=THREE.MathUtils.clamp(drag.azimuth-(event.clientX-drag.x)*.004,-1.35,.7);orbit.polar=THREE.MathUtils.clamp(drag.polar+(event.clientY-drag.y)*.003,.65,1.45);}requestDraw();
 });
 function end(event){
  if(drag?.kind==='prism'){const inserted=event.type==='pointercancel'?state.inserted:drag.moved?prism.position.z<1.05:!state.inserted;callbacks.prism(inserted);root.dataset.dragging='false';}
  pointers.delete(event.pointerId);drag=null;
 }
 for(const type of['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,end);
 canvas.addEventListener('wheel',event=>{event.preventDefault();orbit.radius=THREE.MathUtils.clamp(orbit.radius+event.deltaY*.008,surface?5.8:8.5,surface?14:18);requestDraw();},{passive:false});
 canvas.addEventListener('keydown',event=>{const delta={ArrowLeft:[-.075,0],ArrowRight:[.075,0],ArrowUp:[0,-.05],ArrowDown:[0,.05]}[event.key];if(!delta)return;event.preventDefault();if(topView)return;orbit.azimuth=THREE.MathUtils.clamp(orbit.azimuth+delta[0],-1.35,.7);orbit.polar=THREE.MathUtils.clamp(orbit.polar+delta[1],.65,1.45);requestDraw();});
 canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();callbacks.unavailable?.();});
 resize();
 return{update,setView(value){topView=value;requestDraw();}};
}
