import * as THREE from '../../../../1/parts/1.1/assets/vendor/three/build/three.module.js';
import { RoomEnvironment } from '../../../../1/parts/1.1/assets/vendor/three/examples/jsm/environments/RoomEnvironment.js';

// Reuse the environment lighting and physical-water approach of 2.2 / section 02.
const smooth = (a,b,x) => {const v=THREE.MathUtils.clamp((x-a)/(b-a),0,1);return v*v*(3-2*v);};
const v3=(x,y,z=0)=>new THREE.Vector3(x,y,z);
function base(host, width) {
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
  renderer.setClearColor(0xf0ede4,1);
  renderer.domElement.setAttribute('aria-hidden','true');renderer.domElement.className='oxygen-webgl';
  const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();
  const env=pmrem.fromScene(room,.04);room.dispose();pmrem.dispose();
  function scene() {
    const scene=new THREE.Scene();scene.background=new THREE.Color(0xded7c7);scene.environment=env.texture;scene.environmentIntensity=.65;
    scene.add(new THREE.HemisphereLight(0xfff8eb,0x8e8b79,.4));
    const key=new THREE.DirectionalLight(0xfff5e4,1.5);key.position.set(-3,7,5);key.castShadow=true;
    key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=key.shadow.camera.bottom=-5;key.shadow.camera.right=key.shadow.camera.top=5;key.shadow.normalBias=.025;scene.add(key);
    const fill=new THREE.DirectionalLight(0xe5f3ff,.45);fill.position.set(4,3,-4);scene.add(fill);
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(60,60),new THREE.MeshStandardMaterial({color:0xc3b79e,roughness:.72}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
    return scene;
  }
  const camera=new THREE.PerspectiveCamera(32,1,.1,60);
  host.append(renderer.domElement);
  let lastWidth=0,lastHeight=0;function size() {const r=host.getBoundingClientRect();if(!r.width||!r.height)return false;if(r.width!==lastWidth||r.height!==lastHeight){renderer.setSize(r.width,r.height,false);lastWidth=r.width;lastHeight=r.height;}camera.aspect=r.width/r.height;camera.updateProjectionMatrix();return true;}
  return {renderer,scene,camera,size,width};
}
function contactShadow(parent,r,x=0,z=0){const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d'),g=ctx.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(40,35,25,.32)');g.addColorStop(.4,'rgba(40,35,25,.16)');g.addColorStop(1,'rgba(40,35,25,0)');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);const mat=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false});const m=new THREE.Mesh(new THREE.PlaneGeometry(r*3,r*3),mat);m.rotation.x=-Math.PI/2;m.position.set(x,.012,z);parent.add(m);}
function mesh(parent,geometry,material,x=0,y=0,z=0) {const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);parent.add(m);return m;}
function lathe(parent,profile,material,x=0,y=0,z=0) {return mesh(parent,new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p)),64),material,x,y,z);}
function cylinder(parent,r,h,material,x=0,y=0,z=0) {return mesh(parent,new THREE.CylinderGeometry(r,r,h,48),material,x,y,z);}
function glass() {return new THREE.MeshPhysicalMaterial({color:0xffffff,metalness:0,roughness:.012,transmission:1,ior:1.5,thickness:.003,clearcoat:1,envMapIntensity:1.65,side:THREE.FrontSide});}
function rim(parent,r,y,x=0,z=0) {const ring=mesh(parent,new THREE.TorusGeometry(r,.018,8,64),new THREE.MeshPhysicalMaterial({color:0x9caaa0,roughness:.08,metalness:.55,transparent:true,opacity:.85,envMapIntensity:1.7}),x,y,z);ring.rotation.x=Math.PI/2;return ring;}
function water(parent,r,height,x,y,z=0) {
 const geom=new THREE.CylinderGeometry(r,r,1,48,3,false),original=geom.attributes.position.array.slice();
 const material=new THREE.MeshPhysicalMaterial({color:0x8fc8d3,roughness:.065,transmission:0,clearcoat:1,transparent:true,opacity:.48,ior:1.333,thickness:.25,envMapIntensity:1.1,side:THREE.DoubleSide,depthWrite:false,depthTest:false});
 const m=mesh(parent,geom,material,x,y,z);m.renderOrder=6;
 return {mesh:m,update(h,time,wave=.005){m.visible=h>.003;m.position.y=y+h/2;m.scale.y=Math.max(.001,h);material.thickness=h;const p=geom.attributes.position.array;for(let i=0;i<p.length;i+=3){const top=original[i+1]>.49; p[i+1]=original[i+1]+(top?(Math.sin(original[i]*14-time*3.5)+Math.sin(original[i+2]*12+time*2.8))*wave/Math.max(h,.01):0);}geom.attributes.position.needsUpdate=true;geom.computeVertexNormals();}};
}
function bubbles(parent,count,range) {
 const material=new THREE.MeshPhysicalMaterial({color:0xf8ffff,roughness:.02,metalness:.05,transparent:true,opacity:.5,transmission:.3,ior:1.05,depthWrite:false,envMapIntensity:2});
 material.depthTest=false;const m=new THREE.InstancedMesh(new THREE.SphereGeometry(1,12,8),material,count);m.renderOrder=6;parent.add(m);const dummy=new THREE.Object3D();
 return {mesh:m,update(time,enabled,x,y0,y1,z=0){let visible=0;for(let i=0;i<count;i++){const phase=(time*(.43+(i%5)*.055)+i*.6180339)%1;const envelope=Math.sin(phase*Math.PI);const r=enabled?(.016+(i%4)*.006)*envelope:0;if(r>.002)visible++;dummy.position.set(x+Math.sin(i*2.399+time*.6)*range,y0+(y1-y0)*phase,z+Math.cos(i*2.399)*range);dummy.scale.set(r,r*1.08,r);dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix);}m.instanceMatrix.needsUpdate=true;return visible;}};
}
function curveTube(parent,material) {
 const points=[v3(-2.1,2.47),v3(-2.1,2.9),v3(-1.7,3),v3(.1,3),v3(.45,2.8),v3(.7,1.25),v3(.8,.56),v3(.86,.56),v3(.86,.64)];
 const curve=new THREE.CatmullRomCurve3(points,false,'catmullrom',.08);
 const geometry=new THREE.TubeGeometry(curve,64,.037,10,false),m=mesh(parent,geometry,material);
 return {mesh:m,update(tipX,raise=0){
  points[0].y=2.47+raise;points[1].y=2.9+raise;points[2].y=3+raise;points[7].x=points[8].x=tipX;
  curve.updateArcLengths();const frames=curve.computeFrenetFrames(64,false),position=geometry.attributes.position,normal=geometry.attributes.normal;
  for(let i=0;i<=64;i++){const point=curve.getPointAt(i/64),n=frames.normals[i],binormal=frames.binormals[i];for(let j=0;j<=10;j++){const angle=j/10*Math.PI*2,c=-Math.cos(angle),ss=Math.sin(angle),nx=c*n.x+ss*binormal.x,ny=c*n.y+ss*binormal.y,nz=c*n.z+ss*binormal.z,k=i*11+j;normal.setXYZ(k,nx,ny,nz);position.setXYZ(k,point.x+.037*nx,point.y+.037*ny,point.z+.037*nz);}}
  position.needsUpdate=normal.needsUpdate=true;geometry.computeBoundingSphere();
 }};
}

function caption(host,text,x,y,cls='') {const el=document.createElement('span');el.className='oxygen-scene-label '+cls;el.textContent=text;el.style.left=x;el.style.top=y;host.append(el);return el;}

export function createPreparationView(host) {
 const b=base(host,8),scene=b.scene(),{camera,renderer}=b;
 camera.position.set(2.1,3,7.2);camera.lookAt(0,1.45,0);camera.zoom=.94;
 // Photographic proportions with a genuinely rounded, hollow glass wall.
 const outer=[[0,0.035],[.52,.035],[.67,.06],[.72,.13],[.73,.23],[.68,.43],[.33,1.55],[.24,1.78],[.24,2.4],[.26,2.43],[.26,2.47],[.22,2.47],[.21,2.42],[.21,1.78],[.30,1.55],[.65,.43],[.69,.23],[.67,.14],[.5,.09],[0,.09]];
 contactShadow(scene,.8,-2.1);
 const flask=lathe(scene,outer,glass(),-2.1,0);flask.renderOrder=4;rim(scene,.247,2.44,-2.1);
 const reagentLiquid=lathe(scene,[[0,.1],[.65,.1],[.65,.21],[.54,.66],[0,.66]],new THREE.MeshPhysicalMaterial({color:0xa4d0d3,roughness:.05,clearcoat:1,transparent:true,opacity:.46,depthWrite:false,depthTest:false}),-2.1);reagentLiquid.renderOrder=6;
 const grainMat=new THREE.MeshStandardMaterial({color:0x31342d,roughness:.9});
 const grains=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.028,0),grainMat,100),dummy=new THREE.Object3D();scene.add(grains);
 for(let i=0;i<100;i++){const a=i*2.399,r=Math.sqrt((i+.5)/100)*.6;dummy.position.set(-2.1+Math.cos(a)*r,.12+(i%4)*.008,Math.sin(a)*r);dummy.scale.set(1+(i%3)*.3,.55,1);dummy.rotation.set(i*.3,i,0);dummy.updateMatrix();grains.setMatrixAt(i,dummy.matrix);}grains.castShadow=false;
 const stopper=cylinder(scene,.235,.18,new THREE.MeshStandardMaterial({color:0x9b8768,roughness:.85}),-2.1,2.45);stopper.castShadow=false;
 const tube=curveTube(scene,new THREE.MeshPhysicalMaterial({color:0xdce9e3,roughness:.12,metalness:.08,transparent:true,opacity:.8,envMapIntensity:1.5}));
 const tank=new THREE.Group();tank.position.set(1.8,0,0);scene.add(tank);
 const tankMat=new THREE.MeshPhysicalMaterial({color:0xe9f3ef,roughness:.05,metalness:.1,transparent:true,opacity:.15,clearcoat:1,envMapIntensity:1.4,side:THREE.DoubleSide,depthWrite:false});
 for(const [w,h,d,x,y,z] of [[3.2,.045,1.55,0,.04,0],[3.2,1.23,.035,0,.66,-.76],[3.2,1.23,.035,0,.66,.76],[.035,1.23,1.55,-1.6,.66,0],[.035,1.23,1.55,1.6,.66,0]]){const side=mesh(tank,new THREE.BoxGeometry(w,h,d),tankMat,x,y,z);side.renderOrder=5;const edge=new THREE.LineSegments(new THREE.EdgesGeometry(side.geometry),new THREE.LineBasicMaterial({color:0x81938c,transparent:true,opacity:.55}));edge.position.copy(side.position);tank.add(edge);}
 const tankWater=mesh(tank,new THREE.BoxGeometry(3.12,.88,1.47),new THREE.MeshPhysicalMaterial({color:0x86bac6,roughness:.05,transparent:true,opacity:.38,ior:1.333,depthWrite:false}),0,.49);tankWater.renderOrder=1;
 const surface=mesh(tank,new THREE.PlaneGeometry(3.12,1.47,32,20),new THREE.MeshPhysicalMaterial({color:0xb4d5cd,roughness:.07,transparent:true,opacity:.38,clearcoat:1,ior:1.333,side:THREE.DoubleSide,depthWrite:false}));surface.rotation.x=-Math.PI/2;surface.position.y=.94;
 const jarX=1.93,jarBottom=.54;
 const jar=lathe(scene,[[.43,0],[.43,1.67],[.415,1.75],[.36,1.79],[0,1.8],[0,1.77],[.35,1.76],[.395,1.72],[.4,1.66],[.4,0]],glass(),jarX,jarBottom);jar.renderOrder=4;rim(scene,.422,jarBottom,jarX);
 const jarLiquid=water(scene,.393,1.75,jarX,jarBottom);
 const cover=mesh(scene,new THREE.BoxGeometry(1.04,.035,1),new THREE.MeshPhysicalMaterial({color:0xd9e8df,roughness:.09,transmission:.6,transparent:true,opacity:.6,ior:1.5}),jarX,.52);cover.renderOrder=5;
 const reaction=bubbles(scene,24,.25),escaping=bubbles(scene,12,.045),collected=bubbles(scene,18,.12);
 const note=caption(host,'在水下蓋上玻璃片','58%','9%','oxygen-scene-note');const reagentLabel=caption(host,'雙氧水＋二氧化錳','25%','88%');const tankLabel=caption(host,'水槽','82%','62%');const gasLabel=caption(host,'氧氣','70%','32%');
 let latest=null;
 function draw(time,f){latest=[time,f];const seconds=time/1000;
  const cap=1-smooth(200,1100,time);stopper.position.y=2.45+cap*.35;
  const slide=smooth(3400,3900,time)*(1-smooth(7000,7560,time)),tipX=.86+(jarX-.86)*slide;
  tube.update(tipX,cap*.35);
  jarLiquid.update((1-f.collected)*1.75,seconds,.003);
  cover.position.x=jarX+1.0*(1-smooth(7560,8300,time));cover.visible=true;
  const n1=reaction.update(seconds,f.stage===1||f.stage===2,-2.1,.16,.65);
  const n2=escaping.update(seconds,f.stage===1,.86,.65,.94);
  const n3=collected.update(seconds,f.collecting&&slide>.95&&(1-f.collected)*1.75>.12,jarX,jarBottom+.04,jarBottom+Math.max(.08,(1-f.collected)*1.75-.03));
  const pos=surface.geometry.attributes.position;for(let i=0;i<pos.count;i++){const x=pos.getX(i),y=pos.getY(i);pos.setZ(i,Math.sin(x*8-seconds*3)*Math.cos(y*6+seconds*2)*.0035);}pos.needsUpdate=true;surface.geometry.computeVertexNormals();
  note.textContent=['集氣瓶先裝滿水並倒置','起初的混合氣先排出，不收集','氧氣進入，瓶內的水逐漸排出','移開導管，在水下蓋片'][f.stage];
  const label=(el,point)=>{point.project(camera);el.style.left=`${(point.x*.5+.5)*100}%`;el.style.top=`${(-point.y*.5+.5)*100}%`;};label(reagentLabel,v3(-2.1,-.15,.1));label(tankLabel,v3(3.2,1.3,0));label(gasLabel,v3(jarX,1.9,.5));gasLabel.style.visibility=f.collected>.25?'visible':'hidden';
  host.dataset.tipX=tipX.toFixed(4);host.dataset.waterHeight=((1-f.collected)*1.75).toFixed(4);host.dataset.bubbles=String(n1+n2+n3);host.dataset.ripple=String(pos.getZ(10));host.dataset.triangles=String(renderer.info.render.triangles);host.dataset.coverX=cover.position.x.toFixed(4);host.dataset.time=time.toFixed(1);
  if(b.size())renderer.render(scene,camera);
 }
 const observer=new ResizeObserver(()=>{if(latest)draw(...latest)});observer.observe(host);
 return {draw};
}

function woodTexture(){const canvas=document.createElement('canvas');canvas.width=64;canvas.height=512;const ctx=canvas.getContext('2d');ctx.fillStyle='#b58c5b';ctx.fillRect(0,0,64,512);for(let i=0;i<75;i++){ctx.strokeStyle=`rgba(${i%2?72:242},${i%2?48:205},${i%2?24:151},.16)`;ctx.lineWidth=.5+(i%3)*.5;ctx.beginPath();ctx.moveTo((i*17)%64,0);for(let y=0;y<=512;y+=16)ctx.lineTo((i*17)%64+Math.sin(y*.017+i)*2,y);ctx.stroke();}const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;return t;}
function flame(parent){
 const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,depthTest:false,side:THREE.DoubleSide,uniforms:{time:{value:0},strength:{value:1}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec2 vUv;uniform float time;uniform float strength;
 void main(){float y=vUv.y;float sway=sin(y*8.-time*5.)*.045*y+sin(y*17.+time*7.)*.018*y;float x=abs(vUv.x-.5-sway);float width=.40*pow(1.-y,.65)*(1.+sin(time*6.+y*12.)*.08);float edge=1.-smoothstep(width*.65,width,x);float base=smoothstep(0.,.07,y);float alpha=edge*base*(1.-smoothstep(.9,1.,y))*strength;float core=(1.-smoothstep(width*.25,width*.55,x))*(1.-smoothstep(.55,.85,y));vec3 color=mix(vec3(1.,.38,.04),vec3(1.,.98,.72),core);gl_FragColor=vec4(color,alpha);}`});
 const group=new THREE.Group();parent.add(group);for(const angle of[0]){const p=mesh(group,new THREE.PlaneGeometry(.6,.62),material,0,.31);p.rotation.y=angle;p.renderOrder=6;}
 const glowMaterial=new THREE.SpriteMaterial({map:(()=>{const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,165,42,.28)');g.addColorStop(1,'rgba(255,165,42,0)');x.fillStyle=g;x.fillRect(0,0,64,64);return new THREE.CanvasTexture(c)})(),transparent:true,depthWrite:false,opacity:.7});
 const glow=new THREE.Sprite(glowMaterial);glow.scale.set(.9,1,1);glow.position.y=.25;glow.renderOrder=6;group.add(glow);return {group,update(t,strength){group.visible=strength>.001;material.uniforms.time.value=t;material.uniforms.strength.value=strength;glowMaterial.opacity=strength*.7;}};
}
export function createComparisonView(host,figures) {
 const b=base(host,3),{renderer,camera}=b;renderer.setClearColor(0xf0ede4,0);renderer.setScissorTest(true);
 camera.fov=30;camera.position.set(1.8,2.6,5.8);camera.lookAt(0,1.45,0);
 const wood=woodTexture();
 const samples=figures.map((fig,i)=>{
  const scene=b.scene();contactShadow(scene,.8);const jar=lathe(scene,[[.60,.05],[.66,.09],[.67,.18],[.67,1.75],[.69,1.78],[.69,1.82],[.65,1.82],[.64,1.77],[.64,.2],[.60,.13],[0,.13],[0,.05]],glass());jar.renderOrder=4;rim(scene,.675,1.8);rim(scene,.62,.13);
  const stick=new THREE.Group();scene.add(stick);
  const shaft=cylinder(stick,.044,1.8,new THREE.MeshStandardMaterial({map:wood,roughness:.7}),0,0);shaft.castShadow=true;
  cylinder(stick,.045,.19,new THREE.MeshStandardMaterial({color:0x302d25,roughness:1}),0,-.84);
  const ember=mesh(stick,new THREE.SphereGeometry(.045,12,8),new THREE.MeshStandardMaterial({color:0x7a4530,emissive:0xd84910,emissiveIntensity:i?1.6:0}),0,-.93);
  const fire=flame(stick);fire.group.position.y=-.93;
  const light=new THREE.PointLight(0xffab42,0,2);light.position.set(0,1.1,0);scene.add(light);
  return {scene,stick,ember,fire,light,fig};
 });
 let latest=null;
 function draw(time,f){latest=[time,f];if(!b.size())return;const rect=host.getBoundingClientRect();renderer.setScissorTest(false);renderer.clear();renderer.setScissorTest(true);
  for(const [i,sample] of samples.entries()){
   sample.stick.position.y=2.05+(1-f.inserted)*1.08;
   sample.fire.group.quaternion.copy(camera.quaternion);sample.fire.update(time/1000,i?f.ignition:0);sample.light.intensity=i?f.ignition*.35:0;
   sample.ember.material.emissiveIntensity=i?1.2:1.2*(1-f.fading);sample.ember.material.color.set(i?0xa34c21:0x4f493c);
   const r=sample.fig.querySelector('svg').getBoundingClientRect();const x=r.left-rect.left,y=rect.bottom-r.bottom;
   renderer.setViewport(x,y,r.width,r.height);renderer.setScissor(x,y,r.width,r.height);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();renderer.render(sample.scene,camera);
  }
  host.dataset.time=time.toFixed(1);host.dataset.stickY=samples[0].stick.position.y.toFixed(4);host.dataset.flame=f.ignition.toFixed(4);
 }
 new ResizeObserver(()=>{if(latest)draw(...latest)}).observe(host);return {draw};
}
