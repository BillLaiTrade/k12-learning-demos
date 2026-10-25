import * as THREE from './vendor/three/build/three.module.js';
import { SVGRenderer } from './vendor/three/examples/jsm/renderers/SVGRenderer.js?v=optics-svg-186';

const $ = (selector) => document.querySelector(selector);
const clamp = THREE.MathUtils.clamp;
const mat = (color, options = {}) => new THREE.MeshPhongMaterial({ color, shininess: options.shininess ?? 34, specular: options.specular ?? '#68736b', transparent: options.opacity !== undefined, opacity: options.opacity ?? 1, side: options.side ?? THREE.FrontSide, depthWrite: options.depthWrite ?? true });
const wood = mat('#90643f', { shininess: 19, specular: '#8c6846' });
const woodEdge = mat('#553a25', { shininess: 16, specular: '#72563a' });
const steel = mat('#84968a', { shininess: 80, specular: '#eef3e9' });
const deepGreen = mat('#20352f', { shininess: 48, specular: '#a3b2a6' });
const boardMat = mat('#263a33', { shininess: 48, specular: '#bdcabb' });
const cream = new THREE.MeshBasicMaterial({ color: '#faf7ed', side: THREE.DoubleSide });
const gold = mat('#ddb653', { shininess: 90, specular: '#fff0b4' });
const glowMat = new THREE.MeshBasicMaterial({ color: '#ffe29a', transparent: true, opacity: .22, side: THREE.DoubleSide, depthWrite: false });
const beamMat = new THREE.MeshBasicMaterial({ color: '#ffe8a9', transparent: true, opacity: .12, side: THREE.DoubleSide, depthWrite: false });
const darkMat = new THREE.MeshBasicMaterial({ color: '#26342f', transparent: true, opacity: .56, side: THREE.DoubleSide, depthWrite: false });
const contactMat = new THREE.MeshBasicMaterial({ color: '#27362f', transparent: true, opacity: .14, side: THREE.DoubleSide, depthWrite: false });

function box(parent, size, position, material, castShadow = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position); mesh.castShadow = castShadow; mesh.receiveShadow = true; mesh.renderOrder = material === wood || material === woodEdge ? 1 : 4; parent.add(mesh); return mesh;
}
function cylinder(parent, radiusTop, radiusBottom, height, position, material, radial = 28) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radial), material);
  mesh.position.set(...position); mesh.castShadow = true; mesh.renderOrder=4; parent.add(mesh); return mesh;
}
function sphere(parent, radius, position, material = deepGreen, detail = 36) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, detail, Math.max(16, detail * .65)), material);
  mesh.position.set(...position); mesh.castShadow = true; mesh.renderOrder=8; parent.add(mesh); return mesh;
}
function line(parent, points, color = '#53675e', width = 1) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3(...p)));
  const mesh = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color, linewidth: width, transparent: true, opacity: .2 })); parent.add(mesh); return mesh;
}
function stageBase(scene, span = 8.8) {
  scene.background = null;
  scene.add(new THREE.AmbientLight('#fffdf1', .72));
  const key = new THREE.DirectionalLight('#fff5d9', .95); key.position.set(-4, 8, 6); scene.add(key);
  const fill = new THREE.DirectionalLight('#d6e4e1', .48); fill.position.set(5, 5, -5); scene.add(fill);
  const softKey = new THREE.PointLight('#fff0d5', .82, 0); softKey.position.set(-3.8,5.5,5.5); scene.add(softKey);
  box(scene, [span, .22, 2.35], [0, .02, 0], woodEdge);
  box(scene, [span-.12, .12, 2.28], [0, .18, 0], wood);
  for (const x of [-3.2,3.2]) for (const z of [-.72,.72]) box(scene,[.18,.52,.18],[x,-.36,z],woodEdge);
  return scene;
}
function addLamp(scene, x = -3.55) {
  const contact=new THREE.Mesh(new THREE.CircleGeometry(1,36),contactMat);contact.rotation.x=-Math.PI/2;contact.position.set(x,.252,.02);contact.scale.set(.52,.34,1);contact.renderOrder=2;scene.add(contact);
  cylinder(scene,.24,.3,.15,[x,.34,0],steel);
  cylinder(scene,.12,.17,.62,[x,.7,0],deepGreen);
  cylinder(scene,.24,.26,.12,[x,1.06,0],woodEdge);
  sphere(scene,.2,[x,1.22,0],gold,28);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(.48,24,16),new THREE.MeshBasicMaterial({color:'#ffe6a2',transparent:true,opacity:.19,depthWrite:false}));glow.position.set(x,1.22,0);scene.add(glow);
  return new THREE.Vector3(x+.25,1.22,0);
}
function clippedShadowGeometry(radius, halfWidth=.88, halfHeight=1.08) {
  let polygon=Array.from({length:96},(_,i)=>[Math.cos(i*Math.PI*2/96)*radius,Math.sin(i*Math.PI*2/96)*radius]);
  const clip=(points,inside,intersect)=>{const out=[];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],ia=inside(a),ib=inside(b);if(ia&&ib)out.push(b);else if(ia&&!ib)out.push(intersect(a,b));else if(!ia&&ib){out.push(intersect(a,b));out.push(b);}}return out;};
  polygon=clip(polygon,p=>p[0]>=-halfWidth,(a,b)=>[ -halfWidth,a[1]+(b[1]-a[1])*(-halfWidth-a[0])/(b[0]-a[0]) ]);
  polygon=clip(polygon,p=>p[0]<=halfWidth,(a,b)=>[ halfWidth,a[1]+(b[1]-a[1])*(halfWidth-a[0])/(b[0]-a[0]) ]);
  polygon=clip(polygon,p=>p[1]>=-halfHeight,(a,b)=>[a[0]+(b[0]-a[0])*(-halfHeight-a[1])/(b[1]-a[1]),-halfHeight]);
  polygon=clip(polygon,p=>p[1]<=halfHeight,(a,b)=>[a[0]+(b[0]-a[0])*(halfHeight-a[1])/(b[1]-a[1]),halfHeight]);
  const shape=new THREE.Shape();if(polygon.length){shape.moveTo(polygon[0][0],polygon[0][1]);for(const p of polygon.slice(1))shape.lineTo(p[0],p[1]);shape.closePath();}return new THREE.ShapeGeometry(shape);
}
function addScreen(scene, x = 3.55, shadow = null) {
  const group = new THREE.Group(); group.position.set(x,0,0); scene.add(group);
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.92,2.42),cream);
  panel.rotation.y=-Math.PI/2; panel.position.set(-.06,1.72,0); panel.renderOrder=2; group.add(panel);
  const frameMat=steel;
  const top=box(group,[.12,.1,2.08],[.08,2.99,0],frameMat);top.renderOrder=6;
  const bottom=box(group,[.12,.1,2.08],[.08,.45,0],frameMat);bottom.renderOrder=6;
  const left=box(group,[.12,2.64,.1],[.08,1.72,-.99],frameMat);left.renderOrder=6;
  const right=box(group,[.12,2.64,.1],[.08,1.72,.99],frameMat);right.renderOrder=6;
  const feet=box(group,[.16,.12,2.2],[.12,.31,0],woodEdge);feet.renderOrder=6;
  if (shadow) {
    const disc = new THREE.Mesh(clippedShadowGeometry(shadow.radius),darkMat);
    disc.rotation.y=-Math.PI/2; disc.position.set(-.085,1.72,0); disc.renderOrder=7; group.add(disc); shadow.mesh=disc;
  }
  return group;
}
function makeRig(stage, target = new THREE.Vector3(0,1.45,0), home = {yaw:-.26,pitch:1.18,radius:11.8}) {
  const scene = new THREE.Scene();stageBase(scene);
  const camera = new THREE.PerspectiveCamera(37,1,.1,60);
  const renderer = new SVGRenderer();renderer.setPrecision(2);renderer.setClearColor('#e9eee8',1);renderer.domElement.style.background='transparent';renderer.domElement.setAttribute('aria-hidden','true');renderer.domElement.style.pointerEvents='none';stage.appendChild(renderer.domElement);
  const view={...home};
  const sync=()=>{const w=Math.max(1,stage.clientWidth),h=Math.max(1,stage.clientHeight);renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();const fit=Math.max(view.radius,view.radius*(1.18/Math.max(camera.aspect,.72)));camera.position.set(target.x+fit*Math.sin(view.pitch)*Math.sin(view.yaw),target.y+fit*Math.cos(view.pitch),target.z+fit*Math.sin(view.pitch)*Math.cos(view.yaw));camera.lookAt(target);renderer.render(scene,camera);};
  let active=null,startPoint=null;const pointers=new Map(),raycaster=new THREE.Raycaster(),ndc=new THREE.Vector2();
  const rayAt=(e)=>{const r=stage.getBoundingClientRect();ndc.set(((e.clientX-r.left)/r.width)*2-1,-((e.clientY-r.top)/r.height)*2+1);raycaster.setFromCamera(ndc,camera);};
  stage.addEventListener('pointerdown',e=>{if(e.button!==undefined&&e.button!==0)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});startPoint={x:e.clientX,y:e.clientY};rayAt(e);active={id:e.pointerId,kind:'view',lastX:e.clientX,lastY:e.clientY};const hits=raycaster.intersectObjects(scene.children,true);for(const hit of hits){let obj=hit.object;while(obj&&obj!==scene){if(obj.userData.dragKind){active={id:e.pointerId,kind:obj.userData.dragKind,index:obj.userData.index,object:obj.parent?.userData.dragKind?obj.parent:(obj.userData.parentRig||obj),lastX:e.clientX,lastY:e.clientY,hit:hit.point.clone()};break;}obj=obj.parent;}if(active.kind!=='view')break;}stage.classList.add('is-dragging');stage.setPointerCapture(e.pointerId);});
  const onMove=e=>{if(!active||active.id!==e.pointerId)return;const dx=e.clientX-active.lastX,dy=e.clientY-active.lastY;active.lastX=e.clientX;active.lastY=e.clientY;const rect=stage.getBoundingClientRect();if(active.kind==='view'){view.yaw=clamp(view.yaw+dx*.009,-1.05,1.05);view.pitch=clamp(view.pitch+dy*.006,.62,1.55);}else if(active.kind==='plate'){active.object.position.y=clamp(active.object.position.y-dy/rect.height*5,.62,2.8);active.object.userData.onMove?.(active.object.position.y);}else if(active.kind==='blocker'||active.kind==='size-object'){const range=active.kind==='blocker'?[-3.05,2.8]:[-2.9,2.9];active.object.position.x=clamp(active.object.position.x+dx/rect.width*9,...range);active.object.userData.onMove?.(active.object.position.x);}sync();};
  stage.addEventListener('pointermove',onMove);const end=e=>{pointers.delete(e.pointerId);if(active?.id===e.pointerId){active=null;stage.classList.remove('is-dragging');}};stage.addEventListener('pointerup',end);stage.addEventListener('pointercancel',end);
  stage.addEventListener('wheel',e=>{e.preventDefault();view.radius=clamp(view.radius*(e.deltaY<0?.92:1.08),7,19);sync();},{passive:false});
  const resize=new ResizeObserver(sync);resize.observe(stage);sync();return {scene,camera,renderer,view,sync,rayAt};
}
function makePlate(scene,index,x,height,onMove){
 const contact=new THREE.Mesh(new THREE.CircleGeometry(1,36),contactMat);contact.rotation.x=-Math.PI/2;contact.position.set(x,.252,.05);contact.scale.set(.58,.3,1);contact.renderOrder=2;scene.add(contact);
 const g=new THREE.Group();g.position.set(x,height,0);g.userData.dragKind='plate';g.userData.index=index;g.userData.onMove=onMove;scene.add(g);
 box(g,[.11,.19,.72],[0,-.91,0],steel);box(g,[.48,.16,.68],[0,-.78,0],deepGreen);
 const shape=new THREE.Shape();shape.moveTo(-.67,-.83);shape.lineTo(.67,-.83);shape.lineTo(.67,.83);shape.lineTo(-.67,.83);shape.closePath();
 const aperture=new THREE.Path();aperture.absellipse(0,0,.205,.205,0,Math.PI*2,true);shape.holes.push(aperture);
 const geometry=new THREE.ExtrudeGeometry(shape,{depth:.075,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.025,bevelThickness:.02,curveSegments:40});geometry.rotateY(Math.PI/2);
 const face=new THREE.Mesh(geometry,boardMat);face.castShadow=true;face.receiveShadow=true;face.renderOrder=5;g.add(face);
 const rim=new THREE.Mesh(new THREE.TorusGeometry(.22,.022,8,48),gold);rim.position.x=.06;rim.rotation.y=-Math.PI/2;rim.renderOrder=6;g.add(rim);
 const pick=new THREE.Mesh(new THREE.BoxGeometry(.13,1.7,1.4),new THREE.MeshBasicMaterial({transparent:true,opacity:.001,depthWrite:false,side:THREE.DoubleSide}));pick.userData.dragKind='plate';pick.userData.index=index;pick.userData.parentRig=g;g.add(pick);
 return g;
}
function installAperture(){
 const stage=$('#aperture-3d-scene');if(!stage)return;const status=$('#aperture-result'),obs=$('#aperture-xiaokui-observation'),input=$('#aperture-offset'),output=$('#aperture-offset-output');
 const rig=makeRig(stage,new THREE.Vector3(0,1.42,0),{yaw:-.48,pitch:1.2,radius:10.6}),{scene,sync}=rig;
 const source=addLamp(scene,-3.65);const screenX=3.7;addScreen(scene,screenX);
 const plateX=[-2.35,-.5,1.4],initial=[1.22,1.68,1.22],plates=[];let selected=1;
 const lineGeo=new THREE.BufferGeometry().setFromPoints([source,new THREE.Vector3(screenX-.2,1.22,0)]);const beam=new THREE.Line(lineGeo,new THREE.LineDashedMaterial({color:'#dcb552',dashSize:.15,gapSize:.1,transparent:true,opacity:.8}));beam.computeLineDistances();scene.add(beam);
 const spot=sphere(scene,.085,[screenX-.19,1.22,0],gold,24);spot.visible=false;
 const refresh=()=>{plates.forEach((p,i)=>p.position.y=initial[i]);const ys=plates.map(p=>p.position.y),spread=Math.max(...ys)-Math.min(...ys),pass=spread<.16;spot.visible=pass;beam.material.opacity=pass?.82:.22;beam.material.color.set(pass?'#e7b84f':'#a7aaa0');const slight=spread<.34;status.classList.toggle('is-blocked',!slight);status.querySelector('span:last-child').textContent=pass?'三個小孔排成一直線，屏幕上出現清楚的亮點。':slight?'小孔稍微偏離直線，屏幕上的亮點變暗。':'小孔沒有排成一直線，光被孔板擋住，屏幕亮點消失。';obs.textContent=pass?'三個小孔排成一直線時，光可以穿過孔板，在屏幕上形成亮點。':slight?'小孔稍微偏離直線時，屏幕上的亮點變暗了。':'小孔偏離太多，光沒有繞過孔板，屏幕上的亮點消失了。';document.querySelectorAll('[data-plate]').forEach((b,i)=>{b.setAttribute('aria-pressed',String(i===selected));b.classList.toggle('is-transmitting',Math.abs(ys[i]-1.22)<.34);});input.value=String(Math.round((plates[selected].position.y-1.22)/.62*100));const v=Number(input.value);output.textContent=Math.abs(v)<4?'標準高度':`${v>0?'上移':'下移'} ${Math.abs(v)}%`;output.classList.toggle('is-standard',Math.abs(v)<4);sync();};
 plateX.forEach((x,i)=>plates.push(makePlate(scene,i,x,initial[i],y=>{initial[i]=y;refresh()})));
 // Make the visual response follow the ray through the three apertures.
 plates.forEach((p,i)=>{p.userData.onMove=y=>{initial[i]=y;refresh()};p.children.forEach(c=>{if(c.userData.dragKind==='plate')c.userData.onMove=y=>{initial[i]=y;refresh()}})});
 document.querySelectorAll('[data-plate]').forEach((b,i)=>b.addEventListener('click',()=>{selected=i;refresh()}));input.addEventListener('input',()=>{initial[selected]=1.22+Number(input.value)/100*.62;refresh()});
 $('#aperture-reset').addEventListener('click',()=>{initial.splice(0,3,1.22,1.68,1.22);plates.forEach((p,i)=>p.position.y=initial[i]);selected=1;refresh()});$('#aperture-view-reset').addEventListener('click',()=>{rig.view.yaw=-.48;rig.view.pitch=1.2;rig.view.radius=10.6;sync()});refresh();
}
function makeBallOnRail(scene,x,kind,onMove,ballRadius=.46){
 const groundShadow=new THREE.Mesh(new THREE.CircleGeometry(1,40),contactMat);groundShadow.rotation.x=-Math.PI/2;groundShadow.position.set(x,.252,0);groundShadow.scale.set(.62,.35,1);groundShadow.renderOrder=2;scene.add(groundShadow);
 const holder=new THREE.Group();holder.position.set(x,.28,0);holder.userData.dragKind=kind;holder.userData.onMove=value=>{groundShadow.position.x=value;onMove(value)};scene.add(holder);
 box(holder,[.52,.15,.45],[0,0,0],steel);cylinder(holder,.075,.09,.74,[0,.43,0],steel);sphere(holder,ballRadius,[0,1.05,0],deepGreen,40);
 const hit=new THREE.Mesh(new THREE.SphereGeometry(.6,20,16),new THREE.MeshBasicMaterial({transparent:true,opacity:.001,depthWrite:false}));hit.position.y=1.05;hit.userData.dragKind=kind;hit.userData.onMove=onMove;holder.add(hit);return holder;
}
function addRail(scene){box(scene,[7.1,.1,.12],[0,.28,.8],steel);for(let x=-3.2;x<=3.2;x+=.8)box(scene,[.035,.18,.18],[x,.29,.8],gold,false);}
function makeBeam(scene,sourceX,targetX){const rays=new THREE.Group();const material=new THREE.LineDashedMaterial({color:'#e8c873',dashSize:.18,gapSize:.12,transparent:true,opacity:.62});for(const y of [.64,2.82]){const g=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(sourceX,1.22,0),new THREE.Vector3(targetX,y,0)]);const ray=new THREE.Line(g,material);ray.computeLineDistances();rays.add(ray);}scene.add(rays);return rays;}
function makeShadowScene(stage,initialX,withToggle){
 const status=$(withToggle?'#shadow-scene-status':'#shadow-size-scene-status'),feedback=$('#shadow-size-feedback'),obs=$(withToggle?'#shadow-xiaokui-observation':'#shadow-size-xiaokui-observation');
 const rig=makeRig(stage,new THREE.Vector3(0,1.4,0),{yaw:-.48,pitch:1.2,radius:10.2}),{scene,sync}=rig;
 const source=addLamp(scene,-3.65);addRail(scene);const beam=makeBeam(scene,-3.4,3.38);const shadow={radius:.32,y:1.65};const screen=addScreen(scene,3.55,shadow);const ball=makeBallOnRail(scene,initialX,withToggle?'blocker':'size-object',x=>update(x),withToggle?.46:.34);
 const setShadow=(x)=>{const dist=Math.max(.5,x+3.65),projection=(3.55+3.65)/dist;shadow.radius=clamp((withToggle?.46:.34)*projection,.16,.92);shadow.y=1.65;shadow.mesh.geometry.dispose();shadow.mesh.geometry=clippedShadowGeometry(shadow.radius);};
 const update=(x)=>{if(withToggle){const blocked=x<=-.15;ball.position.z=blocked?0:1.35;setShadow(x);status.textContent=blocked?'球擋住光路，屏幕上形成影子。':'球停在光路旁，屏幕均勻受光。';obs.textContent=blocked?'球擋住光線後，光照不到的地方就在屏幕上形成影子。':'球移到光路旁後，光線照到屏幕，影子消失了。';if(shadow.mesh)shadow.mesh.visible=blocked;}else{setShadow(x);status.textContent=x<-.85?'球體靠近光源，屏幕上的影子較大。':x>.9?'球體遠離光源，屏幕上的影子較小。':'球體在光源和屏幕之間移動，影子大小正在改變。';feedback.textContent='拖曳球體沿導軌前後移動，比較屏幕上的影子大小。';obs.textContent=x<-.85?'球靠近光源時，屏幕上的影子變大了。':x>.9?'球遠離光源、靠近屏幕時，屏幕上的影子變小了。':'移動球體時，屏幕上的影子大小也跟著改變。';if(shadow.mesh)shadow.mesh.visible=true;}sync();};
 if(withToggle){const toggle=$('#shadow-block-toggle'),label=$('#shadow-toggle-label');const toggleState=blocked=>{ball.position.x=blocked?-.15:.8;ball.position.z=blocked?0:1.35;toggle.setAttribute('aria-pressed',String(blocked));toggle.setAttribute('aria-label',blocked?'將遮擋球沿導軌滑出光路':'將遮擋球沿導軌滑入光路');label.textContent=blocked?'滑出光路':'滑入光路';update(ball.position.x)};toggle.addEventListener('click',()=>toggleState(toggle.getAttribute('aria-pressed')!=='true'));$('#shadow-view-reset').addEventListener('click',()=>{rig.view.yaw=-.48;rig.view.pitch=1.2;rig.view.radius=10.2;sync()});toggleState(false);}else{$('#shadow-size-view-reset').addEventListener('click',()=>{rig.view.yaw=-.48;rig.view.pitch=1.2;rig.view.radius=10.2;sync()});update(initialX);}
}
installAperture();makeShadowScene($('#shadow-3d-scene'),2.25,true);makeShadowScene($('#shadow-size-3d-scene'),-1.1,false);
