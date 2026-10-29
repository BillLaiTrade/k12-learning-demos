import * as THREE from 'three';
import {RoomEnvironment} from '../../../../1/parts/1.1/assets/vendor/three/examples/jsm/environments/RoomEnvironment.js';
import {POOL,SALT,saltPortion} from './ppm-quantity-model.js?v=scale-1';

export function createQuantityView(root){
  const stage=root.querySelector('.pool-volume-scene'),canvas=root.querySelector('#pool-geometry-canvas');
  const inset=root.querySelector('.pool-salt-inset'),guide=root.querySelector('.pool-quantity-guide');
  const scene=new THREE.Scene();scene.background=new THREE.Color('#e8eeeb');
  const macro=new THREE.Scene();macro.background=new THREE.Color('#eee8db');
  const camera=new THREE.OrthographicCamera(-8,8,5,-5,.01,100);
  camera.position.set(11,12,14);camera.lookAt(0,1,0);camera.updateMatrixWorld();
  const macroCamera=new THREE.OrthographicCamera(-.12,.12,.09,-.09,.001,10);
  macroCamera.position.set(.05,.14,.25);macroCamera.lookAt(0,.015,0);macroCamera.updateMatrixWorld();
  let renderer;
  try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});}
  catch{return createFallback(root,canvas,stage,inset,guide,camera);}
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment(),environment=pmrem.fromScene(room,.04);room.dispose();pmrem.dispose();
  for(const s of [scene,macro]){
    const detailed=s===macro;s.environment=environment.texture;s.environmentIntensity=detailed ? .35 : .55;
    s.add(new THREE.HemisphereLight(0xf4fbff,0x9b947e,detailed?1.2:1.8));
    const sun=new THREE.DirectionalLight(0xfff5df,detailed?3:2.6);sun.position.set(...(detailed?[-.3,.5,.2]:[-8,18,10]));sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);const extent=detailed ? .2 : 10;sun.shadow.camera.left=sun.shadow.camera.bottom=-extent;sun.shadow.camera.right=sun.shadow.camera.top=extent;sun.shadow.camera.near=detailed ? .01 : .5;sun.shadow.camera.far=detailed?3:80;sun.shadow.normalBias=detailed ? .00002 : .003;sun.shadow.bias=-.00001;s.add(sun);
  }
  const tile=makeTile(),tileMat=new THREE.MeshStandardMaterial({map:tile,roughness:.64,color:'#d7ece8'});
  const concrete=new THREE.MeshStandardMaterial({color:'#e0e2d7',roughness:.88});
  const deckMat=new THREE.MeshStandardMaterial({color:'#d5c8ae',roughness:.85});
  const addBox=(w,h,d,x,y,z,material)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;scene.add(m);return m;};
  const {lengthM:l,widthM:w,waterDepthM:h,wallM:t,freeboardM:f}=POOL;
  addBox(l+.3,.15,w+.3,0,-.075,0,tileMat);
  addBox(t,h+f,w+.3,-(l+t)/2,(h+f)/2,0,tileMat);
  addBox(t,h+f,w+.3,(l+t)/2,(h+f)/2,0,tileMat);
  addBox(l,h+f,t,0,(h+f)/2,-(w+t)/2,tileMat);
  // A translucent front wall makes the internal water depth visible in the capacity model.
  const cutaway=new THREE.MeshPhysicalMaterial({color:'#bed8d8',transparent:true,opacity:.18,roughness:.2,depthWrite:false});
  addBox(l,h+f,t,0,(h+f)/2,(w+t)/2,cutaway);
  const deckY=h+f;
  addBox(l+2.6,.12,1.15,0,deckY-.06,w/2+.725,deckMat);
  addBox(l+2.6,.12,1.15,0,deckY-.06,-w/2-.725,deckMat);
  addBox(1.15,.12,w+.3,-l/2-.725,deckY-.06,0,deckMat);
  addBox(1.15,.12,w+.3,l/2+.725,deckY-.06,0,deckMat);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(80,80),new THREE.MeshStandardMaterial({color:'#e9eee5',roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.17;ground.receiveShadow=true;scene.add(ground);
  const waterGeometry=new THREE.BoxGeometry(l,h,w);
  const water=new THREE.Mesh(waterGeometry,new THREE.MeshPhysicalMaterial({color:'#40a8bf',transparent:true,opacity:.44,roughness:.16,metalness:.02,ior:1.333,depthWrite:false}));water.position.y=h/2;scene.add(water);
  const waterEdges=new THREE.LineSegments(new THREE.EdgesGeometry(waterGeometry),new THREE.LineBasicMaterial({color:'#5d9da7',transparent:true,opacity:.42}));waterEdges.position.copy(water.position);scene.add(waterEdges);
  const surface=new THREE.Mesh(new THREE.PlaneGeometry(l,w),new THREE.MeshPhysicalMaterial({color:'#39aac3',normalMap:makeWaterNormal(),normalScale:new THREE.Vector2(.3,.3),roughness:.1,transparent:true,opacity:.6,metalness:.08,clearcoat:.5,side:THREE.DoubleSide}));surface.rotation.x=-Math.PI/2;surface.position.y=h;scene.add(surface);
  root.dataset.geometryWaterLiters=String(waterGeometry.parameters.width*waterGeometry.parameters.height*waterGeometry.parameters.depth*1000);
  root.dataset.poolInnerLengthM=String(l);root.dataset.poolInnerWidthM=String(w);root.dataset.poolWaterDepthM=String(h);
  const source=new THREE.Group();source.position.set(3.7,deckY+.002,w/2+.72);scene.add(source);
  const closeup=new THREE.Group();macro.add(closeup);
  const dishMaterial=new THREE.MeshStandardMaterial({color:'#384a45',roughness:.57,metalness:.04});
  const profile=[new THREE.Vector2(0,.001),new THREE.Vector2(.06,.001),new THREE.Vector2(.079,.005),new THREE.Vector2(.08,.011),new THREE.Vector2(.077,.014),new THREE.Vector2(.07,.008),new THREE.Vector2(.06,.006),new THREE.Vector2(0,.006)];
  const dishGeometry=new THREE.LatheGeometry(profile,64);
  for(const g of [source,closeup]){const dish=new THREE.Mesh(dishGeometry,dishMaterial);dish.castShadow=dish.receiveShadow=true;g.add(dish);}
  const macroFloor=new THREE.Mesh(new THREE.PlaneGeometry(3,3),deckMat);macroFloor.rotation.x=-Math.PI/2;macroFloor.receiveShadow=true;macroFloor.position.y=-.001;macro.add(macroFloor);
  const grainGeometry=new THREE.BoxGeometry(1,1,1);
  const saltMaterial=new THREE.MeshPhysicalMaterial({color:'#f4f1e9',roughness:.52,ior:1.54,transmission:.03,thickness:.001,clearcoat:.05});
  let meshes=[],portion;
  function setSalt(massG){
    portion=saltPortion(massG);
    meshes.forEach((m,i)=>{[source,closeup][i].remove(m);m.dispose?.();});meshes=[];
    const matrix=new THREE.Matrix4(),quaternion=new THREE.Quaternion(),euler=new THREE.Euler(),scale=new THREE.Vector3().setScalar(portion.edgeM),position=new THREE.Vector3();
    for(const group of [source,closeup]){
      const grains=new THREE.InstancedMesh(grainGeometry,saltMaterial,portion.count);
      portion.positions.forEach((p,i)=>{euler.set(Math.sin(i*2.17)*.04,Math.sin(i*1.31)*.04,Math.cos(i*.97)*.04);quaternion.setFromEuler(euler);position.set(p.x,p.y,p.z);matrix.compose(position,quaternion,scale);grains.setMatrixAt(i,matrix);});
      grains.instanceMatrix.needsUpdate=true;grains.castShadow=grains.receiveShadow=true;group.add(grains);meshes.push(grains);
    }
    root.dataset.sourceScale=String(source.scale.x);root.dataset.insetScale=String(closeup.scale.x);
    metrics(root,portion);root.dataset.saltRenderedVolumeM3=String(meshes[0].count*scale.x*scale.y*scale.z);draw();
  }
  function draw(){
    if(!portion)return;
    const width=stage.clientWidth,height=stage.clientHeight;if(!width||!height)return;
    renderer.setScissorTest(false);renderer.setSize(width,height,false);camera.left=-8;camera.right=8;camera.top=8*height/width;camera.bottom=-camera.top;camera.updateProjectionMatrix();
    renderer.setViewport(0,0,width,height);renderer.clear();renderer.render(scene,camera);
    const box=inset.getBoundingClientRect(),bounds=stage.getBoundingClientRect(),x=box.left-bounds.left,y=height-(box.top-bounds.top)-box.height;
    macroCamera.left=-SALT.fieldWidthM/2;macroCamera.right=SALT.fieldWidthM/2;macroCamera.top=SALT.fieldWidthM*box.height/box.width/2;macroCamera.bottom=-macroCamera.top;macroCamera.updateProjectionMatrix();
    renderer.setScissorTest(true);renderer.setScissor(x,y,box.width,box.height);renderer.setViewport(x,y,box.width,box.height);renderer.clear();renderer.render(macro,macroCamera);renderer.setScissorTest(false);
    annotations(root,camera,source.position,width,height,box,bounds,guide);
  }
  const observer=new ResizeObserver(draw);observer.observe(stage);root.dataset.renderer='webgl';
  return{setSalt,dispose(){observer.disconnect();renderer.dispose();environment.dispose();}};
}

function makeWaterNormal(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const c=canvas.getContext('2d'),image=c.createImageData(128,128);
  for(let y=0;y<128;y++)for(let x=0;x<128;x++){const i=(y*128+x)*4,nx=Math.sin(x*.31+y*.15)*.24+Math.cos(y*.18-x*.09)*.1,ny=Math.cos(y*.29-x*.13)*.2+Math.sin(x*.17+y*.08)*.1;image.data[i]=128+nx*100;image.data[i+1]=128+ny*100;image.data[i+2]=255;image.data[i+3]=255;}
  c.putImageData(image,0,0);const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(6,3);return texture;
}
function makeTile(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d');c.fillStyle='#dcebe8';c.fillRect(0,0,256,256);c.strokeStyle='#a8c8c7';c.lineWidth=2;for(let i=0;i<=256;i+=32){c.beginPath();c.moveTo(i,0);c.lineTo(i,256);c.moveTo(0,i);c.lineTo(256,i);c.stroke();}
  const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(10,5);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
function metrics(root,p){
  root.dataset.saltDensityGPerCm3=String(SALT.densityGPerCm3);root.dataset.saltGrainCount=String(p.count);root.dataset.saltGrainEdgeM=String(p.edgeM);root.dataset.saltSolidVolumeCm3=String(p.solidVolumeCm3);root.dataset.saltRenderedVolumeM3=String(p.solidVolumeM3);root.dataset.saltPileDiameterCm=String(p.radiusM*200);root.dataset.saltPileHeightCm=String(p.heightM*100);root.dataset.saltDishDiameterCm='16';
}
function annotations(root,camera,source,width,height,box,bounds,guide){
  const project=(x,y,z)=>{const v=new THREE.Vector3(x,y,z).project(camera);return{x:(v.x+1)*width/2,y:(1-v.y)*height/2};};
  const lines=[['length',[-5,2,2.65],[5,2,2.65]],['width',[5.2,2,-2.5],[5.2,2,2.5]],['depth',[-5.18,0,2.65],[-5.18,2,2.65]]];
  guide.setAttribute('viewBox',`0 0 ${width} ${height}`);
  lines.forEach(([id,a,b])=>{const p=project(...a),q=project(...b),line=guide.querySelector(`[data-dimension-line="${id}"]`);for(const[k,v]of Object.entries({x1:p.x,y1:p.y,x2:q.x,y2:q.y}))line.setAttribute(k,String(v));const label=root.querySelector(`[data-dimension-label="${id}"]`);label.style.left=`${(p.x+q.x)/2}px`;label.style.top=`${(p.y+q.y)/2}px`;});
  const p=project(source.x,source.y+.02,source.z),circle=guide.querySelector('[data-salt-source]'),line=guide.querySelector('[data-salt-guide]');circle.setAttribute('cx',p.x);circle.setAttribute('cy',p.y);for(const[k,v]of Object.entries({x1:p.x,y1:p.y,x2:box.left-bounds.left+box.width*.5,y2:box.bottom-bounds.top}))line.setAttribute(k,String(v));
  const label=root.querySelector('.pool-salt-source-label');label.style.left=`${p.x}px`;label.style.top=`${p.y+11}px`;
  root.querySelector('.pool-salt-scale').style.width=`${.05/SALT.fieldWidthM*box.width}px`;
}
function createFallback(root,oldCanvas,stage,inset,guide,camera){
  const canvas=oldCanvas.cloneNode();oldCanvas.replaceWith(canvas);const ctx=canvas.getContext('2d');let portion;
  root.dataset.sourceScale='1';root.dataset.insetScale='1';root.dataset.renderer='canvas';root.dataset.geometryWaterLiters=String(POOL.lengthM*POOL.widthM*POOL.waterDepthM*1000);root.dataset.poolInnerLengthM='10';root.dataset.poolInnerWidthM='5';root.dataset.poolWaterDepthM='2';
  function draw(){
    if(!portion)return;const w=stage.clientWidth,h=stage.clientHeight,dpr=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#edf1ec';ctx.fillRect(0,0,w,h);
    camera.top=8*h/w;camera.bottom=-camera.top;camera.updateProjectionMatrix();
    const project=(x,y,z)=>{const v=new THREE.Vector3(x,y,z).project(camera);return[(v.x+1)*w/2,(1-v.y)*h/2];};
    const polygon=(points,color)=>{ctx.beginPath();points.forEach((p,i)=>{const q=project(...p);if(i)ctx.lineTo(...q);else ctx.moveTo(...q);});ctx.closePath();ctx.fillStyle=color;ctx.fill();ctx.strokeStyle='#88aeb1';ctx.stroke();};
    polygon([[-5,0,2.5],[5,0,2.5],[5,2,2.5],[-5,2,2.5]],'#acd5da');polygon([[5,0,-2.5],[5,0,2.5],[5,2,2.5],[5,2,-2.5]],'#8cbec9');polygon([[-5,2,-2.5],[5,2,-2.5],[5,2,2.5],[-5,2,2.5]],'#83cdd6');
    const source=new THREE.Vector3(3.7,2.152,3.22),p=project(source.x,source.y,source.z);ctx.fillStyle='#354a42';ctx.beginPath();ctx.ellipse(p[0],p[1],.08/16*w,.04/16*w,0,0,Math.PI*2);ctx.fill();
    const b=inset.getBoundingClientRect(),s=stage.getBoundingClientRect(),x=b.left-s.left,y=b.top-s.top;ctx.fillStyle='#e4d9c5';ctx.fillRect(x,y,b.width,b.height);ctx.fillStyle='#354a42';ctx.beginPath();ctx.ellipse(x+b.width/2,y+b.height*.62,.08/SALT.fieldWidthM*b.width,.04/SALT.fieldWidthM*b.width,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#faf9f3';portion.positions.slice().sort((a,b)=>a.z-b.z||a.y-b.y).forEach(v=>{const px=x+b.width/2+v.x/SALT.fieldWidthM*b.width,py=y+b.height*.62+(v.z*.48-v.y)/SALT.fieldWidthM*b.width,size=portion.edgeM/SALT.fieldWidthM*b.width;ctx.fillRect(px-size/2,py-size/2,size,size);});annotations(root,camera,source,w,h,b,s,guide);
  }
  const observer=new ResizeObserver(draw);observer.observe(stage);
  return{setSalt(mass){portion=saltPortion(mass);metrics(root,portion);draw();},dispose(){observer.disconnect();}};
}
