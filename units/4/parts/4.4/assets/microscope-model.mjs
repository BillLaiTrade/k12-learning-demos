import {drawSpecimen} from './microscope-specimen.mjs?v=20261105-micro-specimen10';
import * as THREE from '../../4.1/assets/vendor/three/build/three.module.js';

// Fixed cutaway geometry. Optical overlays are projected from the same world
// positions as the objective, intermediate plane and ocular; no artistic ray bends.
export function createMicroscopeModel(canvas,onProject){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-380,380,390,-390,1,4000);
 camera.position.set(780,-30,1700);camera.lookAt(440,-425,0);camera.updateMatrixWorld();
 scene.add(new THREE.HemisphereLight('#fff7e7','#536959',2));
 const key=new THREE.DirectionalLight('#fff4d7',3.1);key.position.set(100,200,900);scene.add(key);
 const fill=new THREE.DirectionalLight('#c2e5e8',1.3);fill.position.set(850,-200,-300);scene.add(fill);
 const envCanvas=document.createElement('canvas');envCanvas.width=512;envCanvas.height=256;
 const ctx=envCanvas.getContext('2d'),gradient=ctx.createLinearGradient(0,0,0,256);
 gradient.addColorStop(0,'#f4f0df');gradient.addColorStop(.5,'#b7c1b1');gradient.addColorStop(1,'#52695a');ctx.fillStyle=gradient;ctx.fillRect(0,0,512,256);ctx.fillStyle='#ffffff';ctx.fillRect(55,25,36,150);ctx.fillRect(100,25,12,150);ctx.fillStyle='#fff4d7';ctx.fillRect(320,45,85,100);
 const env=new THREE.CanvasTexture(envCanvas);env.mapping=THREE.EquirectangularReflectionMapping;env.colorSpace=THREE.SRGBColorSpace;
 const pmrem=new THREE.PMREMGenerator(renderer),environment=pmrem.fromEquirectangular(env);scene.environment=environment.texture;env.dispose();pmrem.dispose();
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-520,right:520,top:520,bottom:-520,near:1,far:2000});key.target.position.set(440,-450,0);scene.add(key.target);key.shadow.normalBias=1.5;key.shadow.bias=-.0002;key.shadow.radius=4;
 const mat=(color,extra={})=>new THREE.MeshPhysicalMaterial({color,roughness:.32,metalness:.05,clearcoat:.6,...extra});
 const ivory=mat('#d9ceb5'),dark=mat('#243b32',{roughness:.45}),metal=mat('#aab5a1',{metalness:.68,roughness:.25}),glass=mat('#93d3d0',{transmission:.35,transparent:true,opacity:.8,roughness:.12,metalness:0,ior:1.5,clearcoat:1}),gold=mat('#b89a57',{metalness:.55}),cut=mat('#496251',{roughness:.55,side:THREE.DoubleSide});
 const mesh=(geo,material,x,y,z=0)=>{const m=new THREE.Mesh(geo,material);m.position.set(x,-y,z);m.castShadow=true;m.receiveShadow=true;scene.add(m);return m;};
 const cylinder=(r,h,material,x,y,z=0)=>mesh(new THREE.CylinderGeometry(r,r,h,64),material,x,y,z);
 const box=(w,h,d,material,x,y,z=0)=>mesh(new THREE.BoxGeometry(w,h,d),material,x,y,z);
 function shape(points,depth,material,z=0){const s=new THREE.Shape();points(s);const m=mesh(new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelThickness:5,bevelSize:5,bevelSegments:5,curveSegments:64}),material,0,0,z-depth/2);return m;}
 shape(s=>{s.moveTo(310,-694);s.quadraticCurveTo(270,-702,282,-724);s.quadraticCurveTo(300,-749,340,-746);s.lineTo(608,-746);s.quadraticCurveTo(660,-737,644,-712);s.quadraticCurveTo(625,-690,580,-687);s.closePath();},155,ivory);
 box(290,14,130,dark,465,749,-1);
 shape(s=>{s.moveTo(478,-321);s.bezierCurveTo(620,-295,650,-351,643,-455);s.lineTo(619,-690);s.lineTo(549,-693);s.lineTo(573,-456);s.bezierCurveTo(583,-385,561,-382,478,-389);s.closePath();},68,ivory,-20);
 const knob=cylinder(46,36,dark,606,418,40);knob.rotation.x=Math.PI/2;
 const knobFace=cylinder(38,6,metal,606,418,61);knobFace.rotation.x=Math.PI/2;
 for(let i=0;i<40;i++){const a=i*Math.PI/20,m=box(3,7,34,dark,606+45*Math.cos(a),418+45*Math.sin(a),40);m.rotation.z=-a;}
 box(64,96,34,dark,579,586,-25);
 box(225,17,143,dark,441,658,0);box(225,3,143,metal,441,648,0);
 box(86,3,42,glass,432,642,0);box(82,1,39,glass,432,639,0);
 for(const x of [378,484]){box(34,4,9,metal,x,639,25);cylinder(5,12,metal,x-9,633,25);}
 cylinder(31,16,dark,432,684,0);const condenser=cylinder(24,5,glass,432,675,0);condenser.scale.y=.6;
 cylinder(49,14,dark,432,721,12);cylinder(39,3,gold,432,712,12);cylinder(31,2,mat('#fff0bd',{emissive:'#f3c76e',emissiveIntensity:.55}),432,709,12);
 // The front half of the finite microscope tube is removed, exposing empty air.
 const tube=mesh(new THREE.CylinderGeometry(40,40,264,80,1,true,Math.PI/2,Math.PI),cut,432,366);
 const back=mesh(new THREE.CylinderGeometry(43,43,264,80,1,true,Math.PI/2,Math.PI),ivory,432,366);back.material.side=THREE.DoubleSide;tube.receiveShadow=false;back.receiveShadow=false;
 for(const y of [235,499]){const ring=mesh(new THREE.TorusGeometry(42,3,12,80,Math.PI),metal,432,y);ring.rotation.x=Math.PI/2;ring.rotation.z=Math.PI/2;}
 const ocular=mesh(new THREE.CylinderGeometry(40,40,40,64,1,true,Math.PI/2,Math.PI),dark,432,204);dark.side=THREE.DoubleSide;
 const lip=mesh(new THREE.TorusGeometry(40,3,12,80),dark,432,182);lip.rotation.x=Math.PI/2;
 const eyeglass=mesh(new THREE.SphereGeometry(1,48,24),glass,432,220);eyeglass.scale.set(30,5,30);
 cylinder(54,16,metal,432,506);cylinder(55,4,dark,432,515);
 for(const [x,angle]of [[388,.45],[476,-.45]]){const group=new THREE.Group();group.position.set(x,-519,0);group.rotation.z=angle;scene.add(group);for(const[r,h,dy,m]of [[16,43,-20,metal],[17,6,-33,gold],[12,12,-47,dark]]){const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,48),m);o.position.y=dy;group.add(o);}}
 const objective=cylinder(20,56,metal,432,542);objective.material=metal;
 const open=mesh(new THREE.CylinderGeometry(20.5,20.5,52,64,1,true,Math.PI/2,Math.PI),ivory,432,542);objective.visible=false;
 cylinder(21,4,gold,432,566);cylinder(13,12,dark,432,574);
 const objglass=mesh(new THREE.SphereGeometry(1,48,24),glass,432,550);objglass.scale.set(16,4,16);
 const specimenCanvas=document.createElement('canvas');specimenCanvas.width=specimenCanvas.height=512;
 const specimenCtx=specimenCanvas.getContext('2d');specimenCtx.translate(256,256);specimenCtx.scale(2,2);drawSpecimen(specimenCtx);
 const specimenTexture=new THREE.CanvasTexture(specimenCanvas);specimenTexture.colorSpace=THREE.SRGBColorSpace;
 const sample=mesh(new THREE.PlaneGeometry(11.2,11.2),new THREE.MeshBasicMaterial({map:specimenTexture,transparent:true,side:THREE.DoubleSide,depthWrite:false}),432,638);sample.rotation.set(-Math.PI/2,0,-Math.PI/2);sample.castShadow=false;
 // Small point markers identify the original and its image; they are overlays.
 for(const [x,y,color]of [[436,638,'#ec8b6d'],[428,638,'#6dbde3'],[420,286,'#ec8b6d'],[444,286,'#6dbde3']]){
  const mark=mesh(new THREE.SphereGeometry(3,20,12),new THREE.MeshBasicMaterial({color}),x,y,0);mark.castShadow=false;mark.receiveShadow=false;
 }
 // Image plane is an annotation, not a screen or another glass element.
 const plane=mesh(new THREE.RingGeometry(29,31,64),new THREE.MeshBasicMaterial({color:'#f4dfa4',transparent:true,opacity:.25,side:THREE.DoubleSide,depthWrite:false}),432,286);
 plane.rotation.x=-Math.PI/2;
 const floor=mesh(new THREE.PlaneGeometry(1800,1800),new THREE.ShadowMaterial({opacity:.19}),440,757,0);floor.rotation.x=-Math.PI/2;floor.castShadow=false;floor.receiveShadow=true;
 let queued=0,currentStep=null,currentView='objective',overview='',overviewCamera=null,overviewAspect=1,span=500,center=460;
 let motion=null;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 function frameCamera(width,height){
  camera.position.set(772,395-center,1700);camera.lookAt(432,-center,0);camera.updateMatrixWorld();
  camera.top=span/2;camera.bottom=-span/2;camera.left=-span/2*width/height;camera.right=span/2*width/height;camera.updateProjectionMatrix();
 }
 function project(x,y,z=0){const p=new THREE.Vector3(x,-y,z).project(camera);return[(p.x+1)*380,(1-p.y)*390];}
 function render(now=performance.now()){
  queued=0;const b=canvas.getBoundingClientRect();if(!b.width||!b.height)return;
  if(motion){const t=Math.min(1,(now-motion.start)/300),ease=t*t*(3-2*t);span=motion.fromSpan+(motion.span-motion.fromSpan)*ease;center=motion.fromCenter+(motion.center-motion.fromCenter)*ease;if(t===1)motion=null;}
  renderer.setSize(b.width,b.height,false);
  if(!overview){const saved=[span,center];span=780;center=425;frameCamera(b.width,b.height);renderer.render(scene,camera);overview=canvas.toDataURL('image/png');overviewCamera=camera.clone();overviewAspect=b.width/b.height;[span,center]=saved;}
  frameCamera(b.width,b.height);renderer.render(scene,camera);onProject?.();if(motion)request();
 }
 const request=()=>{if(!queued)queued=requestAnimationFrame(render);};
 const observer=new ResizeObserver(request);observer.observe(canvas);request();
 return{
  project,get overview(){return overview;},get overviewAspect(){return overviewAspect;},
  overviewRegion(view){
   const box=view==='objective'?[335,240,530,680]:[355,100,515,365];
   const points=[[box[0],box[1]],[box[2],box[1]],[box[0],box[3]],[box[2],box[3]]].map(([x,y])=>new THREE.Vector3(x,-y,0).project(overviewCamera||camera));
   const xs=points.map(p=>(p.x+1)*380),ys=points.map(p=>(1-p.y)*390),x=Math.min(...xs),y=Math.min(...ys);
   return[x,y,Math.max(...xs)-x,Math.max(...ys)-y];
  },
  update(step,view='whole'){
   plane.material.opacity=step==='objective'?.28:.43;
   if(currentStep===step&&currentView===view)return;
   currentStep=step;
   if(currentView!==view){currentView=view;const target=view==='objective'?{span:500,center:460}:view==='eyepiece'?{span:340,center:240}:{span:780,center:425};
    if(reduced.matches){span=target.span;center=target.center;motion=null;}else motion={...target,fromSpan:span,fromCenter:center,start:performance.now()};
   }
   request();
  },
  dispose(){observer.disconnect();if(queued)cancelAnimationFrame(queued);const materials=new Set();scene.traverse(o=>{o.geometry?.dispose();if(o.material)materials.add(o.material);});for(const m of materials)m.dispose();specimenTexture.dispose();environment.dispose();renderer.dispose();}
 };
}
