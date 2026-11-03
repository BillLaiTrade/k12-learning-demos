import * as THREE from '../../4.1/assets/vendor/three/build/three.module.js';
import {torchAim} from './mix-optics.mjs?v=mix-front-20261102';

// Actual turned metal geometry; the light on the wall stays in mix-optics.
function studioEnvironment(){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;
 const c=canvas.getContext('2d');c.fillStyle='#44464a';c.fillRect(0,0,1024,512);
 const top=c.createLinearGradient(0,0,0,512);top.addColorStop(0,'#bfc4cc');top.addColorStop(.55,'#555b62');top.addColorStop(1,'#302c28');c.fillStyle=top;c.fillRect(0,0,1024,512);
 for(const[x,y,w,h,color]of[[130,80,120,250,'#fcfcff'],[670,50,80,280,'#d5e1ee'],[380,10,240,75,'#ffffff']]){c.fillStyle=color;c.fillRect(x,y,w,h);}
 const map=new THREE.CanvasTexture(canvas);map.mapping=THREE.EquirectangularReflectionMapping;map.colorSpace=THREE.SRGBColorSpace;return map;
}
function gripTextures(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const c=canvas.getContext('2d'),pixels=c.createImageData(128,128);
 for(let y=0;y<128;y++)for(let x=0;x<128;x++){
  const a=(x+y)%32,b=(x-y+256)%32,diamond=Math.min(Math.min(a,32-a),Math.min(b,32-b))/16;
  const v=Math.round(42+diamond*178),i=(y*128+x)*4;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=v;pixels.data[i+3]=255;
 }
 c.putImageData(pixels,0,0);const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(9,4);texture.anisotropy=4;return texture;
}
export function createTorchStudio(canvas,index,{unavailable,ready}={}){
 const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:'low-power'});
 renderer.setSize(360,260,false);renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.setClearColor(0x000000,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 const scene=new THREE.Scene();scene.environment=studioEnvironment();
 const camera=new THREE.OrthographicCamera(-1.83,1.83,1.32,-1.32,.1,30);camera.position.set(0,2.8,6.5);camera.lookAt(0,0,-.05);camera.updateMatrixWorld(true);
 scene.add(new THREE.HemisphereLight('#f4f6ff','#5b5147',1.2));
 const key=new THREE.DirectionalLight('#fff8ed',4);key.position.set(-3,5,4);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-3,right:3,top:3,bottom:-3,near:.1,far:15});key.shadow.bias=-.0003;key.shadow.normalBias=.02;key.shadow.radius=3;scene.add(key);
 const fill=new THREE.DirectionalLight('#dce8ff',2);fill.position.set(3,2,-4);scene.add(fill);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(12,12),new THREE.ShadowMaterial({opacity:.16,depthWrite:false}));floor.rotation.x=-Math.PI/2;floor.position.y=-.46;floor.receiveShadow=true;scene.add(floor);
 const torch=new THREE.Group();torch.position.y=-.075;scene.add(torch);
 const black=new THREE.MeshStandardMaterial({color:'#141517',metalness:.82,roughness:.35,envMapIntensity:1.1});
 const satin=new THREE.MeshStandardMaterial({color:'#222326',metalness:.9,roughness:.29,envMapIntensity:1.1});
 const rubber=new THREE.MeshStandardMaterial({color:'#0e0f10',metalness:.08,roughness:.76});
 const grip=new THREE.MeshStandardMaterial({color:'#191a1b',metalness:.78,roughness:.5,bumpMap:gripTextures(),bumpScale:.035,envMapIntensity:.8});
 const band=new THREE.MeshStandardMaterial({color:['#b82b29','#278541','#2457b7'][index],metalness:.55,roughness:.3,envMapIntensity:.85});
 function lathe(profile,material){const geometry=new THREE.LatheGeometry(profile.map(([radius,z])=>new THREE.Vector2(radius,z)),96);geometry.rotateX(Math.PI/2);const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;torch.add(mesh);return mesh;}
 // Narrow barrel, broader head, beveled retaining collars and a rear rubber switch.
 lathe([[0,-1.58],[.36,-1.58],[.405,-1.56],[.43,-1.51],[.43,-1.30],[.41,-1.22],[.38,-1.13],[.34,-1.02],[.31,-.96],[.31,-.82]],satin);
 lathe([[.429,-1.44],[.437,-1.425],[.437,-1.35],[.429,-1.335]],band);
 for(const z of[-1.17,-1.08,-.99])lathe([[.315,z],[.365,z+.015],[.365,z+.055],[.315,z+.07]],black);
 lathe([[.30,-.84],[.32,-.81],[.32,-.72],[.30,-.69],[.288,-.67],[.288,.79],[.30,.81],[.32,.84],[.32,.92],[.30,.95]],black);
 lathe([[.292,-.60],[.303,-.57],[.303,.65],[.292,.69]],grip);
 // Machined diamond facets catch real highlights, even at the small page size.
 const facets=[],count=64,step=Math.PI*2/count,pitch=.08;
 const vertex=(angle,z,r)=>[Math.cos(angle)*r,Math.sin(angle)*r,z];
 for(let row=0;row<29;row++)for(let column=0;column<count;column++){
  const angle=(column+(row%2)*.5)*step,z=-.54+row*pitch/2,center=vertex(angle,z,.312),corners=[vertex(angle-step/2,z,.304),vertex(angle,z-pitch/2,.304),vertex(angle+step/2,z,.304),vertex(angle,z+pitch/2,.304)];
  for(let j=0;j<4;j++)facets.push(...center,...corners[j],...corners[(j+1)%4]);
 }
 const knurlGeometry=new THREE.BufferGeometry();knurlGeometry.setAttribute('position',new THREE.Float32BufferAttribute(facets,3));knurlGeometry.computeVertexNormals();
 const knurl=new THREE.Mesh(knurlGeometry,new THREE.MeshStandardMaterial({color:'#202123',metalness:.82,roughness:.43,envMapIntensity:.85,side:THREE.DoubleSide}));knurl.castShadow=true;torch.add(knurl);
 for(const z of[-.68,.73,.87])lathe([[.302,z],[.318,z+.008],[.318,z+.025],[.302,z+.035]],satin);
 lathe([[.30,.94],[.32,.97],[.32,1.20],[.30,1.25],[0,1.25]],black);
 for(let i=0;i<32;i++){const angle=i/32*Math.PI*2,r=.321,mesh=new THREE.Mesh(new THREE.BoxGeometry(.016,.014,.16),black);mesh.position.set(Math.cos(angle)*r,Math.sin(angle)*r,1.075);mesh.rotation.z=angle;mesh.castShadow=true;torch.add(mesh);}
 const tail=new THREE.Mesh(new THREE.CylinderGeometry(.23,.23,.025,64),rubber);tail.rotation.x=Math.PI/2;tail.position.z=1.27;torch.add(tail);
 const switchButton=new THREE.Mesh(new THREE.CylinderGeometry(.145,.145,.027,64),rubber);switchButton.rotation.x=Math.PI/2;switchButton.position.z=1.29;torch.add(switchButton);
 const seam=new THREE.Mesh(new THREE.TorusGeometry(.245,.008,8,64),satin);seam.position.z=1.279;torch.add(seam);
 // The lens faces the screen, away from the learner, and never glows at them.
 const lens=new THREE.Mesh(new THREE.CircleGeometry(.355,64),new THREE.MeshPhysicalMaterial({color:'#30363b',metalness:.15,roughness:.16,transparent:true,opacity:.65}));lens.position.z=-1.585;lens.rotation.y=Math.PI;torch.add(lens);
 let frame=0,disposed=false,lastPose='';
 function draw(){frame=0;if(!disposed){renderer.render(scene,camera);if(canvas.dataset.ready!=='true'){canvas.dataset.ready='true';ready?.();}}}
 function update(spot){
  const pitch=.035+(.5-spot.y)*.08,aim=torchAim(index,spot),screen=canvas.closest('.mix-scene')?.querySelector('[data-mix]'),bounds=canvas.parentElement.getBoundingClientRect();
  let yaw=Math.atan2(-aim.direction[0],-aim.direction[2]);camera.zoom=1;camera.updateProjectionMatrix();
  if(screen&&bounds.width&&bounds.height){
   const r=screen.getBoundingClientRect(),target={x:r.left+spot.x*r.width,y:r.top+spot.y*r.height},up=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,1),vertical=Math.sin(pitch)*up.y-Math.cos(pitch)*up.z;
   const align=()=>{const pivot=torch.position.clone().project(camera),x=bounds.left+(pivot.x+1)*bounds.width/2,y=bounds.top+(1-pivot.y)*bounds.height/2,dx=(target.x-x)*(camera.right-camera.left)/bounds.width,dy=(y-target.y)*(camera.top-camera.bottom)/bounds.height;return-Math.atan2(dx*vertical,Math.max(1e-6,dy));};
   yaw=align();torch.rotation.set(pitch,yaw,0);torch.updateMatrixWorld(true);
   // Keep the full barrel in its own frame at the most sideways aiming angles.
   const ends=[-1.59,1.31].map(z=>new THREE.Vector3(0,0,z).applyMatrix4(torch.matrixWorld).project(camera)),mx=.437*2/(camera.right-camera.left),my=.437*2/(camera.top-camera.bottom),extent=Math.max(...ends.flatMap(p=>[Math.abs(p.x)+mx,Math.abs(p.y)+my]));
   camera.zoom=Math.min(1,.94/extent);camera.updateProjectionMatrix();yaw=align();
  }
  torch.rotation.set(pitch,yaw,0);const pose=[pitch,yaw,camera.zoom].join(',');if(pose===lastPose)return;lastPose=pose;
  canvas.dataset.orientation=JSON.stringify(torch.rotation.toArray().slice(0,3));if(!frame)frame=requestAnimationFrame(draw);
 }
 function getLensPosition(){
  scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
  const point=lens.getWorldPosition(new THREE.Vector3()).project(camera);
  return{x:(point.x+1)/2,y:(1-point.y)/2};
 }
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();disposed=true;unavailable?.();});
 return{update,getLensPosition,dispose(){disposed=true;cancelAnimationFrame(frame);renderer.dispose();scene.traverse(n=>{n.geometry?.dispose();if(n.material)for(const m of(Array.isArray(n.material)?n.material:[n.material]))m.dispose();});scene.environment.dispose();grip.bumpMap.dispose();}};
}
