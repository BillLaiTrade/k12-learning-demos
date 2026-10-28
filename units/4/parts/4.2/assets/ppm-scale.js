import * as THREE from 'three';
import {RoomEnvironment} from '../../../../../parts/3.1/assets/vendor/three/examples/jsm/environments/RoomEnvironment.js';
import {DENSITY_MG_MM3,GRAIN_VOLUME_MM3,WORLD_WIDTH_MM,WATER,SAMPLES,sampleState,grainPositions,scaleBarPixels,magnification} from './ppm-scale-state.js?v=physical-1';
const root=document.getElementById('ppm-lab'),stage=document.getElementById('ppm-scale-scene'),canvas=document.getElementById('ppm-scale-canvas');
const lens=document.getElementById('ppm-lens'),lensCanvas=document.getElementById('ppm-lens-canvas'),live=document.getElementById('ppm-status');
const selects=[...document.querySelectorAll('[data-ppm-sample]')];
let key='milligram',opened=false,view=null,disposed=false,cleanupFailed=()=>{};
const formatted=n=>n.toLocaleString('en-US',{maximumFractionDigits:4});
function update(){
  const s=sampleState(key);root.dataset.sample=key;root.dataset.ppm=String(s.ppm);root.dataset.totalMg=String(s.totalMg);root.dataset.solventMg=String(s.solventMg);
  root.dataset.solidVolumeMm3=String(s.solidVolumeMm3);root.dataset.grainCount=String(s.grainCount);root.dataset.density=String(DENSITY_MG_MM3);
  root.dataset.lensOpen=String(opened);lens.hidden=!opened;
  for(const b of selects){b.setAttribute('aria-pressed',String(b.dataset.ppmSample===key));if(b.classList.contains('ppm-dish'))b.setAttribute('aria-expanded',String(opened&&b.dataset.ppmSample===key));}
  const fields={mass:s.label,numerator:`${formatted(s.massMg)} 毫克`,ppm:`${formatted(s.ppm)} ppm`,percent:`＝ ${formatted(s.percent)}%`,'lens-title':`${s.label}糖・放大觀察`};
  for(const node of document.querySelectorAll('[data-ppm]'))if(node.dataset.ppm in fields)node.textContent=fields[node.dataset.ppm];
  view?.draw(key,opened);
}
function choose(next,zoom=true){if(!SAMPLES[next])return;key=next;opened=zoom&&root.dataset.ready==='true';update();live.textContent=`觀察${SAMPLES[key].label}糖。每1公斤溶液含此糖量，濃度為${formatted(sampleState(key).ppm)} ppm。${zoom?'已展開放大觀察。':''}`;}
selects.forEach(b=>b.addEventListener('click',()=>choose(b.dataset.ppmSample)));
document.getElementById('ppm-close-lens').addEventListener('click',()=>{opened=false;update();document.getElementById(key==='gram'?'ppm-gram':'ppm-milligram').focus();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&opened){opened=false;update();}});
document.getElementById('mix-reset').addEventListener('click',()=>{key='milligram';opened=false;update();});
update();

function signedVolume(geo){const p=geo.attributes.position;let sum=0;const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();for(let i=0;i<p.count;i+=3){a.fromBufferAttribute(p,i);b.fromBufferAttribute(p,i+1);c.fromBufferAttribute(p,i+2);sum+=a.dot(b.cross(c))/6;}return Math.abs(sum);}
async function initialize(){
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});let zoomRenderer;try{zoomRenderer=new THREE.WebGLRenderer({canvas:lensCanvas,antialias:true,alpha:false});}catch(error){renderer.dispose();throw error;}cleanupFailed=()=>{renderer.dispose();zoomRenderer.dispose();};
  for(const r of [renderer,zoomRenderer]){r.setPixelRatio(Math.min(devicePixelRatio||1,1.5));r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=1;r.shadowMap.enabled=true;r.shadowMap.type=THREE.PCFSoftShadowMap;}
  const scene=new THREE.Scene(),macro=new THREE.Scene();macro.background=new THREE.Color('#f7f5ee');
  const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment(),environment=pmrem.fromScene(room,.03);room.dispose();pmrem.dispose();
  const macroPmrem=new THREE.PMREMGenerator(zoomRenderer),macroRoom=new RoomEnvironment(),macroEnvironment=macroPmrem.fromScene(macroRoom,.03);macroRoom.dispose();macroPmrem.dispose();
  scene.environment=environment.texture;macro.environment=macroEnvironment.texture;cleanupFailed=()=>{environment.dispose();macroEnvironment.dispose();renderer.dispose();zoomRenderer.dispose();};
  for(const s of [scene,macro]){s.environmentIntensity=.65;s.add(new THREE.HemisphereLight(0xfffaed,0xb1a18d,.8));const light=new THREE.DirectionalLight(0xfff9ee,2);light.position.set(-120,300,220);light.castShadow=true;light.shadow.mapSize.set(1024,1024);const extent=s===macro?22:200;light.shadow.camera.left=light.shadow.camera.bottom=-extent;light.shadow.camera.right=light.shadow.camera.top=extent;light.shadow.camera.near=1;light.shadow.camera.far=1000;light.shadow.bias=-.00002;light.shadow.normalBias=.002;s.add(light);const fill=new THREE.DirectionalLight(0xeaf3ff,1);fill.position.set(200,160,-100);s.add(fill);}
  const background=await new THREE.TextureLoader().loadAsync(new URL('./ppm-table.webp',import.meta.url).href);background.colorSpace=THREE.SRGBColorSpace;scene.background=background;const releaseEarly=cleanupFailed;cleanupFailed=()=>{background.dispose();releaseEarly();};
  const camera=new THREE.OrthographicCamera(-180,180,120,-120,.1,2000);camera.position.set(0,258,700);camera.lookAt(0,68,0);camera.updateMatrixWorld();
  const macroCamera=new THREE.OrthographicCamera(-1.8,1.8,1.8,-1.8,.1,2000);
  // Isolated photographic glass, mapped to the calibrated vessel dimensions.
  // The water itself remains the measured 3D cylinder, not image-generated pixels.
  const cupTexture=await new THREE.TextureLoader().loadAsync(new URL('./concentration-beaker.webp',import.meta.url).href);cupTexture.colorSpace=THREE.SRGBColorSpace;cupTexture.repeat.set(410/1536,504/1024);cupTexture.offset.set(807/1536,(1024-208-504)/1024);
  const cup=new THREE.Mesh(new THREE.PlaneGeometry(133.1,164),new THREE.MeshBasicMaterial({map:cupTexture,transparent:true,depthWrite:false,toneMapped:false}));cup.quaternion.copy(camera.quaternion);cup.position.set(-96,80,55);cup.renderOrder=4;scene.add(cup);
  const waterMaterial=new THREE.MeshPhysicalMaterial({color:0xe5eee8,roughness:.07,transparent:true,opacity:.18,depthWrite:false,ior:1.333,envMapIntensity:.3});
  const water=new THREE.Mesh(new THREE.CylinderGeometry(WATER.radiusMm,WATER.radiusMm,WATER.heightMm,96),waterMaterial);water.position.set(-96,4+WATER.heightMm/2,0);scene.add(water);
  // Thin meniscus at the exact cylinder height. It is a visual surface detail,
  // not extra volume in the one-liter mathematical cylinder.
  const surface=new THREE.Mesh(new THREE.CircleGeometry(WATER.radiusMm-.2,96),new THREE.MeshBasicMaterial({color:0xc9ded6,transparent:true,opacity:.24,side:THREE.DoubleSide,depthWrite:false}));surface.rotation.x=-Math.PI/2;surface.position.set(-96,4+WATER.heightMm+.02,0);surface.renderOrder=2;scene.add(surface);
  const meniscus=new THREE.Mesh(new THREE.TorusGeometry(WATER.radiusMm-.1,.25,8,96),new THREE.MeshBasicMaterial({color:0x7e9990,transparent:true,opacity:.7,depthWrite:false}));meniscus.renderOrder=3;meniscus.rotation.x=Math.PI/2;meniscus.position.set(-96,4+WATER.heightMm,0);scene.add(meniscus);
  const porcelain=new THREE.MeshPhysicalMaterial({color:0xfffdf7,roughness:.26,clearcoat:.4});
  const trayGeo=new THREE.LatheGeometry([[0,.8],[15,.8],[20,2],[22,5],[21.6,5.5],[19.5,2.7],[15,1.8],[0,1.8]].map(([x,y])=>new THREE.Vector2(x,y)),64);
  for(const x of [43,126]){const tray=new THREE.Mesh(trayGeo,porcelain);tray.receiveShadow=true;tray.position.x=x;scene.add(tray);}
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=128;const c=shadowCanvas.getContext('2d'),g=c.createRadialGradient(64,64,3,64,64,64);g.addColorStop(0,'#30291842');g.addColorStop(.55,'#30291815');g.addColorStop(1,'#30291800');c.fillStyle=g;c.fillRect(0,0,128,128);const shadowTexture=new THREE.CanvasTexture(shadowCanvas),shadowMat=new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false});
  for(const [x,radius] of [[-96,65],[43,28],[126,28]]){const shade=new THREE.Mesh(new THREE.PlaneGeometry(radius*2,radius*2),shadowMat);shade.rotation.x=-Math.PI/2;shade.position.set(x,-.1,0);scene.add(shade);}
  // Unit-volume faceted crystals. Geometry volume is integrated, then normalized
  // before applying the mass/density volume; image visibility never rescales it.
  const grainGeo=new THREE.IcosahedronGeometry(1,0);const unitFactor=Math.cbrt(1/signedVolume(grainGeo));grainGeo.scale(unitFactor,unitFactor,unitFactor);grainGeo.computeVertexNormals();
  const sugarMaterial=new THREE.MeshPhysicalMaterial({color:0xf3eee3,roughness:.4,transmission:.1,ior:1.56,thickness:.35,clearcoat:.15,flatShading:true});
  const models={},matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),euler=new THREE.Euler(),scale=new THREE.Vector3(),p=new THREE.Vector3(),edge=Math.cbrt(GRAIN_VOLUME_MM3);
  for(const [id,s] of Object.entries(SAMPLES)){
    const positions=grainPositions(s.massMg),mesh=new THREE.InstancedMesh(grainGeo,sugarMaterial,positions.length);let height=0;
    positions.forEach((v,i)=>{const a=1+.06*Math.sin(i*2.17),b=1+.06*Math.cos(i*1.83),z=1/(a*b);scale.set(edge*a,edge*b,edge*z);euler.set(.04*Math.sin(i*3),.05*Math.cos(i*2),.04*Math.sin(i));q.setFromEuler(euler);p.set(v.x,v.y+1.8,v.z);matrix.compose(p,q,scale);mesh.setMatrixAt(i,matrix);height=Math.max(height,p.y+edge/2);});
    mesh.castShadow=true;mesh.receiveShadow=true;mesh.instanceMatrix.needsUpdate=true;mesh.position.x=s.x;root.dataset[id+'RenderedVolumeMm3']=String(positions.length*GRAIN_VOLUME_MM3*signedVolume(grainGeo));scene.add(mesh);
    const enlarged=mesh.clone();enlarged.position.x=0;models[id]={main:mesh,macro:enlarged,height};
  }
  const macroFloor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),porcelain);macroFloor.rotation.x=-Math.PI/2;macroFloor.position.y=1.8;macroFloor.receiveShadow=true;macro.add(macroFloor);
  const anchor=(x,y,z)=>{const a=new THREE.Vector3(x,y,z).project(camera);return{x:(a.x+1)*50,y:(1-a.y)*50};};
  for(const [id,s] of Object.entries(SAMPLES)){const b=document.getElementById(id==='gram'?'ppm-gram':'ppm-milligram'),pos=anchor(s.x,1.8,0);b.style.left=`${pos.x}%`;b.style.top=`${pos.y-7}%`;}
  const waterAnchor=anchor(-96,0,0);document.getElementById('ppm-water-label').style.left=`${waterAnchor.x}%`;document.getElementById('ppm-water-label').style.top=`${waterAnchor.y+6}%`;
  root.dataset.waterVolumeMm3=String(Math.PI*WATER.radiusMm**2*WATER.heightMm);root.dataset.grainGeometryVolume=String(signedVolume(grainGeo));root.dataset.waterDiameterMm=String(WATER.radiusMm*2);
  let previous=null;
  function draw(next,isOpen){
    if(disposed)return;
    const width=stage.clientWidth;renderer.setSize(width,width*2/3,false);renderer.render(scene,camera);
    if(!isOpen)return;
    if(previous!==next){if(previous)macro.remove(models[previous].macro);macro.add(models[next].macro);previous=next;}
    const s=SAMPLES[next],size=lensCanvas.parentElement.clientWidth,field=s.fieldMm,focusY=1.8+(models[next].height-1.8)/2;
    macroCamera.left=macroCamera.bottom=-field/2;macroCamera.right=macroCamera.top=field/2;macroCamera.updateProjectionMatrix();macroCamera.position.set(0,focusY+190,700);macroCamera.lookAt(0,focusY,0);macroCamera.updateMatrixWorld();zoomRenderer.setSize(size,size,false);zoomRenderer.render(macro,macroCamera);
    const barMm=next==='gram'?10:1,bar=scaleBarPixels(barMm,field,size);document.getElementById('ppm-scale-bar').style.width=`${bar}px`;document.getElementById('ppm-scale-bar-label').textContent=`${barMm} mm`;
    const zoom=magnification(size,field,width);document.getElementById('ppm-zoom-factor').textContent=`畫面放大 ${formatted(Math.round(zoom*10)/10)} 倍`;
    root.dataset.lensFieldMm=String(field);root.dataset.scaleBarMm=String(barMm);root.dataset.scaleBarPixels=String(bar);root.dataset.zoom=String(zoom);
  }
  view={draw};const observer=new ResizeObserver(()=>update());observer.observe(stage);root.dataset.ready='true';selects.forEach(b=>b.disabled=false);update();
  const lose=event=>{event.preventDefault();root.dataset.ready='error';view=null;opened=false;update();live.classList.add('error');live.textContent='比例畫面暫時無法顯示，請重新整理頁面。下方公式與數值仍可對照。';};canvas.addEventListener('webglcontextlost',lose);
  window.addEventListener('pagehide',event=>{if(event.persisted)return;disposed=true;observer.disconnect();const geos=new Set(),mats=new Set();for(const s of [scene,macro])s.traverse(o=>{if(o.geometry)geos.add(o.geometry);if(o.material)mats.add(o.material);});geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());background.dispose();cupTexture.dispose();shadowTexture.dispose();environment.dispose();macroEnvironment.dispose();renderer.dispose();zoomRenderer.dispose();});
}
initialize().catch(()=>{cleanupFailed();view=null;root.dataset.ready='error';live.classList.add('error');live.textContent='比例畫面無法載入，請重新整理頁面。下方公式與數值仍可對照。';selects.forEach(b=>b.disabled=false);});
