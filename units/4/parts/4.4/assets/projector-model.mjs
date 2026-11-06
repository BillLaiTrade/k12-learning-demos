import * as THREE from '../../4.1/assets/vendor/three/build/three.module.js';
import {createLensGeometry} from './lens-geometry.mjs?v=20261104-lens-clear5';
import {bindProjectorOrbit} from './projector-orbit.mjs?v=20261106-projector-orbit2';
import {PROJECTOR as G,projectorRays} from './projector-optics.mjs';

export function createProjectorModel(canvas,cardCanvas,paperCanvas,onLayout,onFailure){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 const scene=new THREE.Scene();scene.background=new THREE.Color('#e8e5db');
 const camera=new THREE.OrthographicCamera(-9,9,4,-4,.1,150),target=new THREE.Vector3(5.1,2.2,0),radius=Math.hypot(21.1,5.6,20);
 const orbit=bindProjectorOrbit(canvas,{getSpan:()=>({width:camera.right-camera.left,height:camera.top-camera.bottom}),onChange:request});
 function applyView(){const v=orbit.getState(),r=radius*Math.sin(v.polar);camera.position.set(target.x+r*Math.sin(v.azimuth),target.y+radius*Math.cos(v.polar),target.z+r*Math.cos(v.azimuth));camera.lookAt(target);camera.zoom=v.zoom;camera.updateMatrixWorld();canvas.dataset.projectorView=JSON.stringify(v);canvas.dataset.camera=JSON.stringify(camera.position.toArray());}
 applyView();
 scene.add(new THREE.HemisphereLight('#fff9ed','#72806b',2.6));
 const sun=new THREE.DirectionalLight('#fff0d5',3.2);sun.position.set(-4,11,10);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-14,right:18,top:10,bottom:-8,near:.1,far:50});sun.shadow.normalBias=.025;sun.shadow.bias=-.0003;scene.add(sun);sun.target.position.set(5,1,0);scene.add(sun.target);
 const rim=new THREE.DirectionalLight('#e7f4f1',1.7);rim.position.set(12,7,-5);scene.add(rim);
 const envCanvas=document.createElement('canvas');envCanvas.width=512;envCanvas.height=256;const ec=envCanvas.getContext('2d'),eg=ec.createLinearGradient(0,0,0,256);eg.addColorStop(0,'#fff8e9');eg.addColorStop(.55,'#e6e6d9');eg.addColorStop(1,'#6a7b64');ec.fillStyle=eg;ec.fillRect(0,0,512,256);ec.fillStyle='#fff';ec.fillRect(50,30,40,145);ec.fillRect(330,40,100,130);const env=new THREE.CanvasTexture(envCanvas);env.mapping=THREE.EquirectangularReflectionMapping;env.colorSpace=THREE.SRGBColorSpace;const pmrem=new THREE.PMREMGenerator(renderer),environment=pmrem.fromEquirectangular(env);scene.environment=environment.texture;env.dispose();pmrem.dispose();
 const mat=(color,opt={})=>new THREE.MeshStandardMaterial({color,roughness:.48,metalness:.18,...opt});
 const green=mat('#3d5c48',{metalness:.55,roughness:.35}),steel=mat('#b7c1b3',{metalness:.82,roughness:.28}),brass=mat('#bfa269',{metalness:.7,roughness:.32}),cream=mat('#ded7c4',{roughness:.65}),dark=mat('#263d31');
 const rig=new THREE.Group();scene.add(rig);
 function rounded(w,h,d,r=.06){
  r=Math.min(r,w/3,h/3,d/3);const x=-w/2,y=-h/2,s=new THREE.Shape();s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);
  const geo=new THREE.ExtrudeGeometry(s,{depth:d-r*.5,bevelEnabled:true,bevelThickness:r*.25,bevelSize:r*.25,bevelSegments:3,steps:1,curveSegments:6});geo.center();return geo;
 }
 function box(parent,w,h,d,x,y,z,material,round=.04){const m=new THREE.Mesh(rounded(w,h,d,round),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 function cyl(parent,r,h,x,y,z,material,axis='y'){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,40),material);if(axis==='z')m.rotation.x=Math.PI/2;if(axis==='x')m.rotation.z=Math.PI/2;m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;}
 function grain(){const c=document.createElement('canvas');c.width=1024;c.height=256;const ctx=c.getContext('2d');ctx.fillStyle='#b48a5e';ctx.fillRect(0,0,1024,256);let seed=831;for(let i=0;i<310;i++){seed=(1664525*seed+1013904223)>>>0;const y=seed/2**32*256;ctx.beginPath();ctx.moveTo(0,y);ctx.bezierCurveTo(280,y-8,650,y+8,1024,y);ctx.strokeStyle=i%3?'#593a2225':'#fff2c646';ctx.lineWidth=.8;ctx.stroke();}const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
 const woodTexture=grain(),wood=mat('#e0b782',{map:woodTexture,roughness:.74,metalness:0});
 const tableTexture=woodTexture.clone();tableTexture.wrapS=tableTexture.wrapT=THREE.RepeatWrapping;tableTexture.repeat.set(6,12);tableTexture.needsUpdate=true;const floor=new THREE.Mesh(new THREE.PlaneGeometry(80,65),mat('#e5cdaa',{map:tableTexture,roughness:.88,metalness:0}));floor.rotation.x=-Math.PI/2;floor.position.y=-.28;floor.receiveShadow=true;scene.add(floor);
 const wall=new THREE.Mesh(new THREE.PlaneGeometry(90,30),mat('#e7e3d8',{roughness:1,metalness:0}));wall.position.set(6,12,-7);scene.add(wall);
 box(rig,15,.28,1.8,5.25,.05,0,wood,.07);box(rig,15.05,.09,1.84,5.25,-.12,0,mat('#7c5635'),.025);
 for(const z of [-.63,.63]){box(rig,14.7,.08,.105,5.25,.235,z,steel,.015);box(rig,14.65,.022,.025,5.25,.289,z,dark,.005);}
 for(let x=-1.7;x<12.6;x+=.2)box(rig,.012,.008,.08,x,.205,.8,brass,.002);
 for(const x of [-1.5,12]){box(rig,.7,.23,2,x,-.04,0,green,.05);box(rig,.82,.08,2.08,x,-.2,0,dark,.025);}
 function mount(group,top){box(group,.75,.19,1.55,0,.42,0,green,.05);box(group,.6,.065,1.35,0,.555,0,steel,.02);cyl(group,.048,Math.max(.1,top-.59),0,(top+.59)/2,0,steel);cyl(group,.15,.13,0,.47,.86,brass,'z');for(let i=0;i<24;i++){const a=i*Math.PI/12;cyl(group,.01,.13,Math.sin(a)*.15,.47+Math.cos(a)*.15,.86,dark,'z');}}
 const lamp=new THREE.Group();rig.add(lamp);lamp.position.x=-.7;mount(lamp,G.axis-.85);const housing=new THREE.Group();housing.position.z=-.45;lamp.add(housing);box(housing,1.22,1.6,1.52,0,G.axis,0,green,.12);
 // Frosted side window makes the light source readable around the apparatus.
 box(housing,.84,1.12,.035,.02,G.axis,.78,brass,.04);box(housing,.7,.98,.04,.02,G.axis,.805,new THREE.MeshBasicMaterial({color:'#fff1be',toneMapped:false}),.035);
 box(housing,.04,1.23,1.15,.635,G.axis,0,brass,.025);box(housing,.045,1.1,1.02,.66,G.axis,0,new THREE.MeshBasicMaterial({color:'#fff4cf',toneMapped:false}),.025);
 for(let y=0;y<5;y++)box(housing,.022,.055,.62,-.626,G.axis+.36-y*.18,0,dark,.012);
 for(const x of [-.45,.45])for(const y of [-.62,.62])cyl(housing,.027,.025,x,G.axis+y,.78,steel,'z');
 const source=new THREE.Group();rig.add(source);mount(source,G.axis-.92);
 const glass=new THREE.MeshPhysicalMaterial({color:'#eff6ef',roughness:.16,transparent:true,opacity:.17,depthWrite:false,side:THREE.DoubleSide});const glassCard=box(source,.025,1.82,1.65,0,G.axis,0,glass,.015);const cardEdges=new THREE.LineSegments(new THREE.EdgesGeometry(glassCard.geometry),new THREE.LineBasicMaterial({color:'#aab9a5',transparent:true,opacity:.8}));cardEdges.position.copy(glassCard.position);source.add(cardEdges);
 const cardTexture=new THREE.CanvasTexture(cardCanvas);cardTexture.colorSpace=THREE.SRGBColorSpace;
 const cardPlane=new THREE.Mesh(new THREE.PlaneGeometry(1.5,1.65),new THREE.MeshBasicMaterial({map:cardTexture,transparent:true,side:THREE.DoubleSide,toneMapped:false,depthWrite:false}));cardPlane.rotation.y=-Math.PI/2;cardPlane.position.set(-.025,G.axis,0);source.add(cardPlane);
 box(source,.16,.1,.22,0,G.axis-.92,0,brass,.02);
 const lensGroup=new THREE.Group();rig.add(lensGroup);mount(lensGroup,G.axis-1.1);let lens=null,currentKind='';
 // Leave both curved faces visible; support the glass only at its lower edge.
 box(lensGroup,.22,.13,.25,0,G.axis-1.12,0,steel,.025);
 box(lensGroup,.19,.12,.32,0,G.axis-1.025,0,brass,.025);
 function lensVisual(kind){
  const halfThickness=r=>kind==='convex'?.025+.14*(1-r*r):.025+.16*r*r;
  const geometry=createLensGeometry(THREE,{radius:1,halfThickness});
  const material=new THREE.MeshPhysicalMaterial({color:'#b8dfdd',metalness:0,roughness:.06,transmission:.72,ior:1.5,thickness:geometry.userData.centerThickness,clearcoat:1,clearcoatRoughness:.08,envMapIntensity:1.2,attenuationColor:'#9ac8c4',attenuationDistance:1.4});
  const glass=new THREE.Mesh(geometry,material);glass.userData.presentation='projector-solid-glass';
  const edge=[];for(let i=0;i<128;i++){const a=2*Math.PI*i/128;edge.push(new THREE.Vector3(0,Math.cos(a),Math.sin(a)));}
  const contour=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(edge),new THREE.LineBasicMaterial({color:'#8cb4ad',transparent:true,opacity:.4,depthWrite:false,toneMapped:false}));
  contour.raycast=()=>{};glass.add(contour);
  // Short, soft reflections follow the glass surfaces, without drawing full
  // meridians through the center as if they were structural wires.
  for(const side of [-1,1]){
   const points=[];for(let i=0;i<=64;i++){const t=i/64,y=.75-.66*t,z=side*(.16+.3*Math.sin(t*Math.PI/2));points.push(new THREE.Vector3(side*(halfThickness(Math.hypot(y,z))+.008),y,z));}
   const reflection=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:'#f3ffff',transparent:true,opacity:.65,depthWrite:false,toneMapped:false}));reflection.raycast=()=>{};glass.add(reflection);
  }
  return glass;
 }
 const screen=new THREE.Group();rig.add(screen);screen.position.x=G.screen;mount(screen,.68);box(screen,.17,G.paperHeight+.26,G.paperWidth+.26,.05,G.axis,0,cream,.055);
 const paperTexture=new THREE.CanvasTexture(paperCanvas);paperTexture.colorSpace=THREE.SRGBColorSpace;
 const paperPlane=new THREE.Mesh(new THREE.PlaneGeometry(G.paperWidth,G.paperHeight),new THREE.MeshBasicMaterial({map:paperTexture,toneMapped:false}));paperPlane.rotation.y=-Math.PI/2;paperPlane.position.set(-.05,G.axis,0);screen.add(paperPlane);
 const rays=new THREE.Group();scene.add(rays);let state=null,queued=0,disposed=false;
 function disposeTree(group){group.traverse(o=>{o.geometry?.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});}
 function fit(){
  const b=canvas.getBoundingClientRect();if(!b.width||!b.height)return false;renderer.setSize(b.width,b.height,false);
  scene.updateMatrixWorld(true);const points=[];
  rig.traverse(o=>{if(!o.isMesh)return;if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();const box=o.geometry.boundingBox;for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])points.push(new THREE.Vector3(x,y,z).applyMatrix4(o.matrixWorld).applyMatrix4(camera.matrixWorldInverse));});
  const xs=points.map(p=>p.x),ys=points.map(p=>p.y),w=Math.max(...xs)-Math.min(...xs)+.8,rawH=Math.max(...ys)-Math.min(...ys),aspect=b.width/b.height,h=Math.max(w/aspect,(rawH+.3)/.79),cx=(Math.min(...xs)+Math.max(...xs))/2+orbit.getState().panX,cy=(Math.min(...ys)+Math.max(...ys))/2+h*.07+orbit.getState().panY;
  camera.left=cx-h*aspect/2;camera.right=cx+h*aspect/2;camera.top=cy+h/2;camera.bottom=cy-h/2;camera.updateProjectionMatrix();return true;
 }
 function project(x,y,z=0){const p=new THREE.Vector3(x,y,z).project(camera),b=canvas.getBoundingClientRect();return {x:(p.x+1)*b.width/2,y:(1-p.y)*b.height/2};}
 function draw(){queued=0;if(disposed)return;applyView();if(!fit())return;renderer.render(scene,camera);onLayout?.({lamp:project(-.7,G.axis+.88),card:project(state?.card??2.3,G.axis+.98),lens:project(state?.lens??5.5,G.axis+1.12),screen:project(G.screen,G.axis+G.paperHeight/2)});}
 function request(){if(!queued&&!disposed)queued=requestAnimationFrame(draw);}
 const observer=new ResizeObserver(request);observer.observe(canvas);
 function update(next){
  state=next;source.position.x=next.card;lensGroup.position.x=next.lens;cardTexture.needsUpdate=true;paperTexture.needsUpdate=true;
  if(next.kind!==currentKind){if(lens){lensGroup.remove(lens);disposeTree(lens);}currentKind=next.kind;lens=lensVisual(next.kind);lens.position.y=G.axis;lensGroup.add(lens);}
  for(const child of [...rays.children]){rays.remove(child);disposeTree(child);}
  if(next.rays)for(const ray of projectorRays(next)){
   let end=ray.end;const minY=.3,maxY=5.15;if(end[1]<minY||end[1]>maxY){const y=Math.max(minY,Math.min(maxY,end[1])),t=(y-ray.lens[1])/(end[1]-ray.lens[1]);end=[ray.lens[0]+(end[0]-ray.lens[0])*t,y,0];}
   const geo=new THREE.BufferGeometry().setFromPoints([ray.from,ray.lens,end].map(p=>new THREE.Vector3(...p)));rays.add(new THREE.Line(geo,new THREE.LineBasicMaterial({color:ray.point>0?'#c26c53':'#4389a8',transparent:true,opacity:.9,depthTest:false,toneMapped:false})));
  }
  request();
 }
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();onFailure?.();});
 return {update,project,resetView:()=>orbit.reset(),dispose(){disposed=true;orbit.dispose();observer.disconnect();if(queued)cancelAnimationFrame(queued);const materials=new Set();scene.traverse(o=>{o.geometry?.dispose();if(o.material)materials.add(o.material);});for(const m of materials)m.dispose();for(const t of [cardTexture,paperTexture,woodTexture,tableTexture])t.dispose();environment.dispose();renderer.dispose();}};
}
