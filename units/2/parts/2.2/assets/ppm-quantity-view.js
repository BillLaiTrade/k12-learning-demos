import * as THREE from 'three';
import {RoomEnvironment} from '../../../../1/parts/1.1/assets/vendor/three/examples/jsm/environments/RoomEnvironment.js';
import {POOL,SALT,saltPortion} from './ppm-quantity-model.js?v=polish-1';
import {createPoolNavigation,overviewPose} from './ppm-pool-camera.js?v=orbit-1';

export function createQuantityView(root){
  const stage=root.querySelector('.pool-volume-scene'),canvas=root.querySelector('#pool-geometry-canvas');
  const guide=root.querySelector('.pool-quantity-guide');
  const scene=new THREE.Scene();scene.background=new THREE.Color('#edf0ec');
  const camera=new THREE.PerspectiveCamera(38,stage.clientWidth/stage.clientHeight,.004,150);
  const overview=overviewPose(camera,camera.aspect);camera.position.copy(overview.position);camera.lookAt(overview.target);camera.updateMatrixWorld();
  let renderer;
  try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});}
  catch{return createFallback(root,canvas,stage,guide,camera);}
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.92;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
  const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();
  const environment=pmrem.fromScene(room,.04);room.dispose();pmrem.dispose();
  scene.environment=environment.texture;scene.environmentIntensity=.38;
  scene.add(new THREE.HemisphereLight(0xe6f4ff,0x8f826a,1.05));
  const sun=new THREE.DirectionalLight(0xfff6e8,3.1);
  sun.position.set(-9,17,-14);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-11,right:11,top:11,bottom:-11,near:.5,far:80});
  sun.shadow.normalBias=.002;sun.shadow.bias=-.00002;sun.shadow.radius=3;scene.add(sun);
  const fill=new THREE.DirectionalLight(0xe4f5ff,.6);fill.position.set(6,7,-8);scene.add(fill);
  const tile=makeTile(),stone=makeStone();
  const tileMat=new THREE.MeshStandardMaterial({map:tile,roughness:.36,color:'#ffffff'});
  const deckMat=new THREE.MeshStandardMaterial({map:stone,roughness:.83,color:'#d9cfb9'});
  const copingMat=new THREE.MeshStandardMaterial({map:stone,roughness:.65,color:'#f3efe3'});
  const addBox=(w,h,d,x,y,z,material)=>{
    const geometry=new THREE.BoxGeometry(w,h,d);worldUVs(geometry,w,h,d);
    const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;scene.add(m);return m;
  };
  const {lengthM:l,widthM:w,waterDepthM:h,wallM:t,freeboardM:f}=POOL,deckY=h+f;
  addBox(l+2*t,.15,w+2*t,0,-.075,0,tileMat);
  // The nearest walls become cutaways as the viewer turns around the pool.
  const walls=[];
  for(const sign of [-1,1]){
    const side=tileMat.clone();side.transparent=true;
    const front=tileMat.clone();front.transparent=true;
    walls.push({mesh:addBox(t,h+f,w+2*t,sign*(l+t)/2,(h+f)/2,0,side),normal:new THREE.Vector3(sign,0,0)});
    walls.push({mesh:addBox(l,h+f,t,0,(h+f)/2,sign*(w+t)/2,front),normal:new THREE.Vector3(0,0,sign)});
  }
  addBox(l+2.6,.16,1.15,0,deckY-.08,w/2+.725,deckMat);
  addBox(l+2.6,.16,1.15,0,deckY-.08,-w/2-.725,deckMat);
  addBox(1.15,.16,w+.3,-l/2-.725,deckY-.08,0,deckMat);
  addBox(1.15,.16,w+.3,l/2+.725,deckY-.08,0,deckMat);
  // Individual coping stones give the rim a real edge and visible joints.
  for(const side of [-1,1]){
    for(let x=-l/2;x<l/2;x+=.5)addBox(.492,.065,.3,x+.25,deckY+.0325,side*(w/2+.085),copingMat);
    for(let z=-w/2-.15;z<w/2+.15;z+=.53)addBox(.3,.065,.522,side*(l/2+.085),deckY+.0325,z+.265,copingMat);
  }
  // Dark lane marks and the stainless ladder make the scale legible as a pool.
  const marking=new THREE.MeshStandardMaterial({color:'#174c60',roughness:.48});
  for(const z of [-1.1,1.1]){
    addBox(8.2,.003,.075,0,.003,z,marking).castShadow=false;
    for(const x of [-4.1,4.1])addBox(.075,.003,.6,x,.003,z,marking).castShadow=false;
  }
  addLadder(scene,-3.45,deckY,-w/2);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(80,80),new THREE.MeshStandardMaterial({color:'#edf0e9',roughness:1}));
  ground.rotation.x=-Math.PI/2;ground.position.y=-.17;ground.receiveShadow=false;scene.add(ground);
  const contact=new THREE.Mesh(new THREE.PlaneGeometry(16,10),new THREE.MeshBasicMaterial({map:makeContactShadow(),transparent:true,opacity:.32,depthWrite:false}));contact.rotation.x=-Math.PI/2;contact.position.y=-.168;scene.add(contact);
  const caustics=new THREE.Mesh(new THREE.PlaneGeometry(l,w),new THREE.MeshBasicMaterial({map:makeCaustics(),transparent:true,opacity:.3,depthWrite:false}));
  caustics.rotation.x=-Math.PI/2;caustics.position.y=.008;scene.add(caustics);
  const waterGeometry=new THREE.BoxGeometry(l,h,w);
  const water=new THREE.Mesh(waterGeometry,new THREE.MeshBasicMaterial({color:'#198f9e',transparent:true,opacity:.16,depthWrite:false}));
  water.position.y=h/2;scene.add(water);
  const waterEdges=new THREE.LineSegments(new THREE.EdgesGeometry(waterGeometry),new THREE.LineBasicMaterial({color:'#397f8d',transparent:true,opacity:.25}));waterEdges.position.copy(water.position);scene.add(waterEdges);
  const surface=new THREE.Mesh(new THREE.PlaneGeometry(l,w),new THREE.MeshPhysicalMaterial({color:'#72cbd7',map:makeWaterColor(),normalMap:makeWaterNormal(),normalScale:new THREE.Vector2(.35,.35),roughness:.17,transparent:true,opacity:.52,envMapIntensity:.4,specularIntensity:.23,metalness:0,ior:1.333,clearcoat:.12,clearcoatRoughness:.2,side:THREE.DoubleSide,depthWrite:false}));
  surface.rotation.x=-Math.PI/2;surface.position.y=h;scene.add(surface);
  root.dataset.geometryWaterLiters=String(waterGeometry.parameters.width*waterGeometry.parameters.height*waterGeometry.parameters.depth*1000);
  root.dataset.poolInnerLengthM=String(l);root.dataset.poolInnerWidthM=String(w);root.dataset.poolWaterDepthM=String(h);
  const source=new THREE.Group();source.position.set(3.7,deckY+.002,w/2+.72);scene.add(source);
  const dishMaterial=new THREE.MeshPhysicalMaterial({color:'#26463f',roughness:.24,metalness:.07,clearcoat:.8,clearcoatRoughness:.18});
  const profile=[new THREE.Vector2(0,.001),new THREE.Vector2(.052,.001),new THREE.Vector2(.069,.003),new THREE.Vector2(.078,.007),new THREE.Vector2(.08,.011),new THREE.Vector2(.079,.013),new THREE.Vector2(.077,.014),new THREE.Vector2(.074,.0115),new THREE.Vector2(.07,.008),new THREE.Vector2(.06,.006),new THREE.Vector2(0,.006)];
  const dishGeometry=new THREE.LatheGeometry(profile,96);
  const dish=new THREE.Mesh(dishGeometry,dishMaterial);dish.castShadow=dish.receiveShadow=true;source.add(dish);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(.0788,.00065,8,96),new THREE.MeshStandardMaterial({color:'#829b8b',roughness:.3,metalness:.15}));
  rim.rotation.x=Math.PI/2;rim.position.y=.0123;source.add(rim);
  const grainGeometry=makeSaltCrystal();
  const saltMaterial=new THREE.MeshPhysicalMaterial({color:'#fffdf4',roughness:.39,ior:1.54,transmission:.045,thickness:.001,clearcoat:.12});
  let grains,portion,shadowsDirty=true;
  const navigation=createPoolNavigation(root,camera,canvas,source.position,draw);
  function setSalt(massG){
    portion=saltPortion(massG);
    if(grains){source.remove(grains);grains.dispose?.();}
    const matrix=new THREE.Matrix4(),quaternion=new THREE.Quaternion(),euler=new THREE.Euler();
    const scale=new THREE.Vector3().setScalar(portion.edgeM),position=new THREE.Vector3(),color=new THREE.Color();
    grains=new THREE.InstancedMesh(grainGeometry,saltMaterial,portion.count);
    portion.positions.forEach((p,i)=>{
      euler.set(Math.sin(i*2.17)*.04,Math.sin(i*1.31)*.08,Math.cos(i*.97)*.04);quaternion.setFromEuler(euler);position.set(p.x,p.y,p.z);
      matrix.compose(position,quaternion,scale);grains.setMatrixAt(i,matrix);
      const shade=.9+.1*(.5+.5*Math.sin(i*47.13));color.setRGB(shade,shade,shade*.98);grains.setColorAt(i,color);
    });
    grains.instanceMatrix.needsUpdate=true;grains.castShadow=grains.receiveShadow=true;source.add(grains);
    root.dataset.sourceScale=String(source.scale.x);
    metrics(root,portion);root.dataset.saltRenderedVolumeM3=String(grains.count*scale.x*scale.y*scale.z);shadowsDirty=true;draw();
  }
  function draw(){
    if(!portion)return;
    const width=stage.clientWidth,height=stage.clientHeight;if(!width||!height)return;
    camera.aspect=width/height;camera.updateProjectionMatrix();camera.updateMatrixWorld();
    const distance=camera.position.distanceTo(navigation.controls.target);
    for(const {mesh,normal} of walls){
      const cutaway=THREE.MathUtils.smoothstep(normal.dot(camera.position.clone().sub(mesh.position)),0,1.2);
      mesh.material.opacity=THREE.MathUtils.lerp(1,.16,cutaway);mesh.material.depthWrite=cutaway<.01;
    }
    renderer.setScissorTest(false);renderer.setSize(width,height,false);
    renderer.setViewport(0,0,width,height);renderer.clear();renderer.shadowMap.needsUpdate=shadowsDirty;renderer.render(scene,camera);
    shadowsDirty=false;
    annotations(root,camera,source.position,width,height,guide,distance);
    root.dataset.cameraPosition=JSON.stringify(camera.position.toArray().map(v=>Number(v.toFixed(5))));
    root.dataset.cameraTarget=JSON.stringify(navigation.controls.target.toArray().map(v=>Number(v.toFixed(5))));
    root.dataset.cameraDistance=distance.toFixed(5);root.dataset.cameraProjection='perspective';
  }
  const observer=new ResizeObserver(()=>navigation.scheduleDraw());observer.observe(stage);root.dataset.renderer='webgl';
  return{setSalt,dispose(){observer.disconnect();navigation.dispose();renderer.dispose();environment.dispose();}};
}

// Small, closed corner bevels catch the light. Normalize the integrated volume
// back to one so the existing mass/density scaling remains unchanged.
function makeSaltCrystal(){
  const vertices=[],faces=[];
  for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1]){
    const points=[[x*.34,y*.5,z*.5],[x*.5,y*.34,z*.5],[x*.5,y*.5,z*.34]];
    vertices.push(...points);faces.push({n:new THREE.Vector3(x,y,z).normalize(),points});
  }
  for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){const n=new THREE.Vector3();n.setComponent(axis,sign);faces.push({n,points:vertices.filter(p=>p[axis]===sign*.5)});}
  const out=[],ref=new THREE.Vector3();
  for(const {n,points} of faces){
    const center=points.reduce((sum,p)=>sum.add(new THREE.Vector3(...p)),new THREE.Vector3()).divideScalar(points.length);
    ref.set(...(Math.abs(n.y)<.8 ? [0,1,0] : [1,0,0]));const u=new THREE.Vector3().crossVectors(n,ref).normalize(),v=new THREE.Vector3().crossVectors(n,u);
    const ordered=points.map(p=>new THREE.Vector3(...p)).sort((a,b)=>{const da=a.clone().sub(center),db=b.clone().sub(center);return Math.atan2(da.dot(v),da.dot(u))-Math.atan2(db.dot(v),db.dot(u));});
    for(let i=1;i<ordered.length-1;i++)out.push(...ordered[0].toArray(),...ordered[i].toArray(),...ordered[i+1].toArray());
  }
  let volume=0;for(let i=0;i<out.length;i+=9){const a=new THREE.Vector3(...out.slice(i,i+3)),b=new THREE.Vector3(...out.slice(i+3,i+6)),c=new THREE.Vector3(...out.slice(i+6,i+9));volume+=a.dot(b.cross(c))/6;}
  const factor=Math.cbrt(1/Math.abs(volume));const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(out.map(v=>v*factor),3));geometry.computeVertexNormals();return geometry;
}
function worldUVs(geometry,w,h,d){
  const uv=geometry.attributes.uv,dims=[[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]];
  for(let face=0;face<6;face++)for(let k=0;k<4;k++){const i=face*4+k;uv.setXY(i,uv.getX(i)*dims[face][0],uv.getY(i)*dims[face][1]);}
}
function addLadder(scene,x,y,z){
  const material=new THREE.MeshStandardMaterial({color:'#e4ebeb',roughness:.18,metalness:.92});
  const tube=(curve,r=.022)=>{const m=new THREE.Mesh(new THREE.TubeGeometry(curve,32,r,10,false),material);m.castShadow=m.receiveShadow=true;scene.add(m);};
  for(const dx of [-.25,.25]){
    const points=[[x+dx,y,z-.63],[x+dx,y+.52,z-.61],[x+dx,y+.63,z-.22],[x+dx,y+.44,z+.25],[x+dx,y-1.25,z+.28]].map(p=>new THREE.Vector3(...p));
    tube(new THREE.CatmullRomCurve3(points));
    const foot=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,.015,20),material);foot.position.set(x+dx,y+.008,z-.63);scene.add(foot);
  }
  for(let k=0;k<5;k++)tube(new THREE.LineCurve3(new THREE.Vector3(x-.25,y-1.15+k*.27,z+.28),new THREE.Vector3(x+.25,y-1.15+k*.27,z+.28)),.018);
}
function makeContactShadow(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const c=canvas.getContext('2d');
  c.shadowColor='#20342b';c.shadowBlur=40;c.fillStyle='#20342b';c.shadowOffsetY=8;c.fillRect(88,104,336,304);
  const texture=new THREE.CanvasTexture(canvas);return texture;
}
function makeWaterColor(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d'),image=c.createImageData(256,256);
  for(let y=0;y<256;y++)for(let x=0;x<256;x++){
    const u=x/256*Math.PI*2,v=y/256*Math.PI*2;
    const a=Math.sin(u*7+Math.sin(v*3)*.8)+Math.cos(v*5+Math.sin(u*4)*.9),b=Math.sin(u*12-v*8+Math.sin(v*2));
    const shine=Math.pow(Math.max(0,(a+b*.35)/2.35),9),i=(y*256+x)*4;
    image.data[i]=155+shine*95;image.data[i+1]=216+shine*39;image.data[i+2]=226+shine*29;image.data[i+3]=255;
  }
  c.putImageData(image,0,0);const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(2,1);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
function makeStone(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const c=canvas.getContext('2d');
  c.fillStyle='#e9e3d8';c.fillRect(0,0,512,512);
  for(let i=0;i<18000;i++){const x=fract(Math.sin(i*19.13)*4783.3)*512,y=fract(Math.sin(i*31.71)*3713.7)*512;const a=.025+fract(Math.sin(i*4.4)*135.2)*.07;c.fillStyle=`rgba(94,80,61,${a})`;c.fillRect(x,y,1.5,1.5);}
  c.strokeStyle='#bcb4a520';c.lineWidth=1;for(let i=0;i<=512;i+=256){c.beginPath();c.moveTo(i,0);c.lineTo(i,512);c.moveTo(0,i);c.lineTo(512,i);c.stroke();}
  const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;return texture;
}
const fract=n=>n-Math.floor(n);
function makeCaustics(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d'),image=c.createImageData(256,256);
  for(let y=0;y<256;y++)for(let x=0;x<256;x++){
    const u=x/256*6,v=y/256*6;let a=9,b=9;
    for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){
      const gx=Math.floor(u)+i,gy=Math.floor(v)+j,px=gx+.5+Math.sin(gx*1.7+gy*4.1)*.28,py=gy+.5+Math.cos(gx*3.3-gy*2.5)*.28;
      const d=Math.hypot(u-px,v-py);if(d<a){b=a;a=d;}else if(d<b)b=d;
    }
    const k=(y*256+x)*4,brightness=Math.exp(-(b-a)*16);image.data[k]=205;image.data[k+1]=253;image.data[k+2]=255;image.data[k+3]=brightness*210;
  }
  c.putImageData(image,0,0);const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(4,2);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}

function makeWaterNormal(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const c=canvas.getContext('2d'),image=c.createImageData(128,128);
  for(let y=0;y<128;y++)for(let x=0;x<128;x++){const i=(y*128+x)*4,nx=Math.sin(x*.31+y*.15)*.24+Math.cos(y*.18-x*.09)*.1,ny=Math.cos(y*.29-x*.13)*.2+Math.sin(x*.17+y*.08)*.1;image.data[i]=128+nx*100;image.data[i+1]=128+ny*100;image.data[i+2]=255;image.data[i+3]=255;}
  c.putImageData(image,0,0);const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(3,1.5);return texture;
}
function makeTile(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const c=canvas.getContext('2d');
  c.fillStyle='#9cbcc0';c.fillRect(0,0,512,512);
  for(let y=0;y<4;y++)for(let x=0;x<4;x++){
    const shade=Math.sin(x*7.3+y*13.7)*5;
    c.fillStyle=`rgb(${90+shade},${161+shade},${177+shade})`;c.fillRect(x*128+2,y*128+2,124,124);
    const gradient=c.createLinearGradient(x*128,y*128,x*128+128,y*128+128);gradient.addColorStop(0,'#ffffff0c');gradient.addColorStop(1,'#0834470c');c.fillStyle=gradient;c.fillRect(x*128+2,y*128+2,124,124);
  }
  const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;return texture;
}
function metrics(root,p){
  root.querySelector('.pool-salt-source-label').textContent=`食鹽 ${p.massG.toLocaleString('en-US')} 克・實際比例`;
  root.dataset.saltDensityGPerCm3=String(SALT.densityGPerCm3);root.dataset.saltGrainCount=String(p.count);root.dataset.saltGrainEdgeM=String(p.edgeM);root.dataset.saltSolidVolumeCm3=String(p.solidVolumeCm3);root.dataset.saltRenderedVolumeM3=String(p.solidVolumeM3);root.dataset.saltPileDiameterCm=String(p.radiusM*200);root.dataset.saltPileHeightCm=String(p.heightM*100);root.dataset.saltDishDiameterCm='16';
}
function annotations(root,camera,source,width,height,guide,distance=20){
  const project=(x,y,z)=>{const v=new THREE.Vector3(x,y,z).project(camera);return{x:(v.x+1)*width/2,y:(1-v.y)*height/2,visible:v.z>=-1&&v.z<=1&&Math.abs(v.x)<.96&&Math.abs(v.y)<.94};};
  const nearX=(camera.position.x<0?-1:1)*(POOL.lengthM/2+.32),nearZ=(camera.position.z<0?-1:1)*(POOL.widthM/2+.32);
  const lines=[['length',[-5,2,nearZ],[5,2,nearZ]],['width',[nearX,2,-2.5],[nearX,2,2.5]],['depth',[nearX,0,nearZ],[nearX,2,nearZ]]];
  const center=project(0,1,0);guide.setAttribute('viewBox',`0 0 ${width} ${height}`);
  for(const [id,a,b] of lines){
    const p=project(...a),q=project(...b),line=guide.querySelector(`[data-dimension-line="${id}"]`),label=root.querySelector(`[data-dimension-label="${id}"]`);
    const visible=distance>5&&p.visible&&q.visible;line.style.display=visible?'':'none';label.hidden=!visible;
    if(!visible)continue;
    for(const[k,v]of Object.entries({x1:p.x,y1:p.y,x2:q.x,y2:q.y}))line.setAttribute(k,String(v));
    const x=(p.x+q.x)/2,y=(p.y+q.y)/2,dx=x-center.x,dy=y-center.y,length=Math.hypot(dx,dy)||1;
    label.style.left=`${Math.max(35,Math.min(width-35,x+dx/length*13))}px`;label.style.top=`${Math.max(14,Math.min(height-14,y+dy/length*13))}px`;
  }
  const p=project(source.x,source.y+.02,source.z),circle=guide.querySelector('[data-salt-source]');
  circle.style.display=p.visible&&distance>5?'':'none';
  circle.setAttribute('cx',p.x);circle.setAttribute('cy',p.y);
  const label=root.querySelector('.pool-salt-source-label');label.hidden=!p.visible;
  if(p.visible){
    const rim=Array.from({length:16},(_,i)=>project(source.x+.08*Math.cos(i*Math.PI/8),source.y,source.z+.08*Math.sin(i*Math.PI/8)));
    label.style.left=`${Math.max(70,Math.min(width-70,p.x))}px`;label.style.top=`${Math.min(height-28,Math.max(...rim.map(point=>point.y))+10)}px`;
  }
}
function createFallback(root,oldCanvas,stage,guide,camera){
  const canvas=oldCanvas.cloneNode();oldCanvas.replaceWith(canvas);const ctx=canvas.getContext('2d');let portion;
  canvas.removeAttribute('tabindex');canvas.setAttribute('aria-label','泳池與100克食鹽的固定視角比例示意圖');
  root.dataset.interactive='false';root.querySelector('#pool-model-hint').textContent='目前瀏覽器無法顯示可旋轉的 3D 模型，已顯示固定視角示意圖。';
  root.dataset.sourceScale='1';root.dataset.renderer='canvas';root.dataset.geometryWaterLiters=String(POOL.lengthM*POOL.widthM*POOL.waterDepthM*1000);root.dataset.poolInnerLengthM='10';root.dataset.poolInnerWidthM='5';root.dataset.poolWaterDepthM='2';
  function draw(){
    if(!portion)return;const w=stage.clientWidth,h=stage.clientHeight,dpr=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#edf1ec';ctx.fillRect(0,0,w,h);
    camera.aspect=w/h;camera.updateProjectionMatrix();camera.updateMatrixWorld();
    const project=(x,y,z)=>{const v=new THREE.Vector3(x,y,z).project(camera);return[(v.x+1)*w/2,(1-v.y)*h/2];};
    const polygon=(points,color)=>{ctx.beginPath();points.forEach((p,i)=>{const q=project(...p);if(i)ctx.lineTo(...q);else ctx.moveTo(...q);});ctx.closePath();ctx.fillStyle=color;ctx.fill();ctx.strokeStyle='#88aeb1';ctx.stroke();};
    polygon([[-5,0,2.5],[5,0,2.5],[5,2,2.5],[-5,2,2.5]],'#acd5da');polygon([[5,0,-2.5],[5,0,2.5],[5,2,2.5],[5,2,-2.5]],'#8cbec9');polygon([[-5,2,-2.5],[5,2,-2.5],[5,2,2.5],[-5,2,2.5]],'#83cdd6');
    const source=new THREE.Vector3(3.7,2.152,3.22);
    ctx.fillStyle='#354a42';ctx.beginPath();
    for(let i=0;i<32;i++){
      const angle=i*Math.PI/16,p=project(source.x+.08*Math.cos(angle),source.y,source.z+.08*Math.sin(angle));
      if(i)ctx.lineTo(...p);else ctx.moveTo(...p);
    }
    ctx.closePath();ctx.fill();ctx.fillStyle='#faf9f3';
    for(const grain of portion.positions){
      const p=project(source.x+grain.x,source.y+grain.y,source.z+grain.z),q=project(source.x+grain.x+portion.edgeM,source.y+grain.y,source.z+grain.z),size=Math.abs(q[0]-p[0]);
      ctx.fillRect(p[0]-size/2,p[1]-size/2,size,size);
    }
    annotations(root,camera,source,w,h,guide);
  }
  const observer=new ResizeObserver(draw);observer.observe(stage);
  return{setSalt(mass){portion=saltPortion(mass);metrics(root,portion);draw();},dispose(){observer.disconnect();}};
}
