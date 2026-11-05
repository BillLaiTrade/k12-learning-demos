import * as THREE from './vendor/three/build/three.module.js';
import {RADII,ORBIT,EARTH,SUN,LIGHT,MAIN_VIEW,orbitBasis,orbitAngle,lunarVector,reflectionState,rayPaths,wrapAngle,add,sub,scale,unit} from './moon-reflection-model.mjs?v=reflection-play-20261105';

export async function createMoonLab(root){
  const canvas=root.querySelector('#moon-model-canvas'),eyeCanvas=root.querySelector('#moon-eye-canvas'),frame=root.querySelector('.moon-views'),button=root.querySelector('#moon-play-toggle');
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true});let eyeRenderer;
  try{eyeRenderer=new THREE.WebGLRenderer({canvas:eyeCanvas,antialias:true});}catch(error){renderer.dispose();throw error;}
  for(const r of [renderer,eyeRenderer]){r.setPixelRatio(Math.min(devicePixelRatio,1.5));r.outputColorSpace=THREE.SRGBColorSpace;r.setClearColor('#081423');}
  const textures=new THREE.TextureLoader();let earthMap,moonMap,sunMap;
  try{[earthMap,moonMap,sunMap]=await Promise.all(['earth','moon','sun'].map(n=>textures.loadAsync(new URL('./celestial-'+n+'.jpg',import.meta.url).href)));}catch(error){renderer.dispose();eyeRenderer.dispose();throw error;}
  for(const map of [earthMap,moonMap,sunMap]){map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());}
  const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-8.4,8.4,5.5,-5.5,.1,100),eyeCamera=new THREE.PerspectiveCamera(22,1,.01,60);eyeCamera.layers.set(1);
  camera.position.fromArray(MAIN_VIEW);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);
  const vertex='varying vec2 vUv;varying vec3 nWorld;void main(){vUv=uv;nWorld=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.);}';
  const fragment='uniform sampler2D map;uniform vec3 lightDirection;varying vec2 vUv;varying vec3 nWorld;void main(){float lit=max(dot(normalize(nWorld),lightDirection),0.);gl_FragColor=vec4(texture2D(map,vUv).rgb*lit*1.4,1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}';
  const bodies={};
  function planet(name,map){const material=new THREE.ShaderMaterial({uniforms:{map:{value:map},lightDirection:{value:new THREE.Vector3(...LIGHT)}},vertexShader:vertex,fragmentShader:fragment});const mesh=new THREE.Mesh(new THREE.SphereGeometry(RADII[name],72,48),material);scene.add(mesh);bodies[name]=mesh;return mesh;}
  const earth=planet('earth',earthMap);earth.position.fromArray(EARTH);earth.rotation.set(0,-.7,.41);
  const moon=planet('moon',moonMap);moon.layers.enable(1);
  const sun=new THREE.Mesh(new THREE.SphereGeometry(RADII.sun,72,48),new THREE.ShaderMaterial({uniforms:{map:{value:sunMap}},vertexShader:vertex,fragmentShader:'uniform sampler2D map;varying vec2 vUv;void main(){vec3 t=texture2D(map,vUv).rgb;float detail=dot(t,vec3(.2126,.7152,.0722));gl_FragColor=vec4(vec3(1.,.94,.77)*(.6+detail*.65),1.);\n#include <colorspace_fragment>\n}'}));sun.position.fromArray(SUN);bodies.sun=sun;scene.add(sun);
  const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=128;
  const ctx=glowCanvas.getContext('2d'),g=ctx.createRadialGradient(64,64,30,64,64,64);g.addColorStop(0,'rgba(255,244,204,.22)');g.addColorStop(1,'rgba(255,244,204,0)');ctx.fillStyle=g;ctx.fillRect(0,0,128,128);
  const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(glowCanvas),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));glow.scale.setScalar(RADII.sun*2.5);sun.add(glow);
  let seed=41;const stars=[];for(let i=0;i<90;i++){seed=(seed*1664525+1013904223)>>>0;const x=(seed/4294967296-.5)*32;seed=(seed*1664525+1013904223)>>>0;stars.push(x,(seed/4294967296-.5)*25,-19);}
  const starGeometry=new THREE.BufferGeometry();starGeometry.setAttribute('position',new THREE.Float32BufferAttribute(stars,3));scene.add(new THREE.Points(starGeometry,new THREE.PointsMaterial({color:'#9aaebd',size:.035,transparent:true,opacity:.45})));
  const orbitLine=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({length:180},(_,i)=>new THREE.Vector3(...add(EARTH,lunarVector(i*2))))),new THREE.LineBasicMaterial({color:'#849da9',transparent:true,opacity:.46}));scene.add(orbitLine);
  const basis=orbitBasis(),orbitPlane=new THREE.Plane(new THREE.Vector3(...basis.normal),0).translate(earth.position);
  // Small 3D person, with the reflected ray terminating between the two actual eyes.
  const person=new THREE.Group();scene.add(person);
  const skin=new THREE.MeshBasicMaterial({color:'#edc597'}),coat=new THREE.MeshBasicMaterial({color:'#d5c4a2'}),hair=new THREE.MeshBasicMaterial({color:'#46362b'}),pants=new THREE.MeshBasicMaterial({color:'#788f8c'});
  function part(geometry,material,x,y,z){const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);person.add(mesh);return mesh;}
  part(new THREE.CylinderGeometry(.075,.085,.23,16),coat,0,.285,0);
  for(const x of [-.045,.045])part(new THREE.CylinderGeometry(.022,.025,.17,10),pants,x,.1,0);
  part(new THREE.SphereGeometry(.103,20,16),skin,0,.48,0);
  part(new THREE.SphereGeometry(.107,20,16,0,Math.PI*2,0,Math.PI*.48),hair,0,.495,0);
  for(const x of [-.035,.035])part(new THREE.SphereGeometry(.012,10,8),new THREE.MeshBasicMaterial({color:'#2b3232'}),x,.49,.094);
  const eyeMarker=part(new THREE.SphereGeometry(.02,12,8),new THREE.MeshBasicMaterial({color:'#67f0db'}),0,.49,.105);
  const rays=new THREE.Group();scene.add(rays);
  const shaftGeometry=new THREE.CylinderGeometry(1,1,1,10),headGeometry=new THREE.ConeGeometry(1,1,14);
  function makeArrow(color,radius,head){const group=new THREE.Group(),material=new THREE.MeshBasicMaterial({color}),shaft=new THREE.Mesh(shaftGeometry,material),tip=new THREE.Mesh(headGeometry,material);group.add(shaft,tip);rays.add(group);return{group,shaft,tip,radius,head};}
  function placeArrow(arrow,segment){arrow.group.visible=!!segment;if(!segment)return;const delta=new THREE.Vector3(...sub(segment.end,segment.start)),len=delta.length(),head=Math.min(.27,len*.2);arrow.group.position.fromArray(segment.start);arrow.group.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());arrow.shaft.position.y=(len-head)/2;arrow.shaft.scale.set(arrow.radius,len-head,arrow.radius);arrow.tip.position.y=len-head/2;arrow.tip.scale.set(arrow.head,head,arrow.head);}
  const incoming=Array.from({length:3},()=>makeArrow('#f4ce54',.025,.11)),outgoing=makeArrow('#42e4e2',.035,.13),diffuse=Array.from({length:2},()=>makeArrow('#8dd7ec',.012,.075));
  const contacts=Array.from({length:3},()=>{const p=new THREE.Mesh(new THREE.SphereGeometry(.06,12,8),new THREE.MeshBasicMaterial({color:'#fff4ba'}));scene.add(p);return p;});
  const packets=Array.from({length:5},(_,i)=>{const mesh=new THREE.Mesh(new THREE.SphereGeometry(.045,10,8),new THREE.MeshBasicMaterial({color:i<3?'#fff1ac':'#b0ffff'}));scene.add(mesh);return mesh;});
  const pickSphere=new THREE.Mesh(new THREE.SphereGeometry(RADII.moon*1.08,12,8),new THREE.MeshBasicMaterial({visible:false}));scene.add(pickSphere);
  let angle=ORBIT.initial,playing=false,active=false,visible=true,failed=false,raf=0,lastTick=null,elapsed=0,readout,paths;
  function canDraw(){return active&&visible&&!failed&&!document.hidden;}
  function label(selector,x0,y0,occupied){
    const el=root.querySelector(selector),w=canvas.clientWidth,h=canvas.clientHeight,lw=el.offsetWidth,lh=el.offsetHeight;
    const offsets=[[0,0]];for(const dy of [0,-28,28,-56,56,-84,84])for(const dx of [0,45,-45,90,-90])offsets.push([dx,dy]);offsets.sort((a,b)=>Math.hypot(...a)-Math.hypot(...b));
    for(const [dx,dy] of offsets){
      const x=Math.max(lw/2+7,Math.min(w-lw/2-7,x0+dx)),y=Math.max(lh+6,Math.min(h-8,y0+dy)),b={left:x-lw/2,right:x+lw/2,top:y-lh,bottom:y};
      if(occupied.some(a=>b.left<a.right+4&&b.right>a.left-4&&b.top<a.bottom+4&&b.bottom>a.top-4))continue;
      el.style.left=x+'px';el.style.top=y+'px';occupied.push(b);return;
    }
  }
  function sync(){
    readout=reflectionState(angle);paths=rayPaths(readout);moon.position.fromArray(readout.positions.moon);pickSphere.position.copy(moon.position);
    const towardEarth=new THREE.Vector3(...unit(sub(EARTH,readout.positions.moon))),up=new THREE.Vector3(...basis.normal),x=up.clone().cross(towardEarth).normalize();moon.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,up,towardEarth));
    const o=readout.observer;person.position.fromArray(o.base);person.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(...o.right),new THREE.Vector3(...o.up),new THREE.Vector3(...o.forward)));
    eyeCamera.position.fromArray(o.eye);eyeCamera.up.fromArray(o.up);eyeCamera.lookAt(moon.position);eyeCamera.updateMatrixWorld(true);
    contacts.forEach((p,i)=>{p.visible=!!readout.patches[i];if(p.visible)p.position.fromArray(add(readout.patches[i].point,scale(readout.patches[i].normal,.015)));});
    incoming.forEach((arrow,i)=>placeArrow(arrow,paths.incident[i]));placeArrow(outgoing,paths.reflected);diffuse.forEach((arrow,i)=>placeArrow(arrow,paths.scattered[i]));
    const d=eyeCamera.position.distanceTo(moon.position),aspect=eyeCamera.aspect;eyeCamera.fov=THREE.MathUtils.radToDeg(2*Math.atan(RADII.moon*Math.max(1.4,1.4/aspect)/d));eyeCamera.updateProjectionMatrix();
    scene.updateMatrixWorld(true);
  }
  function draw(){
    if(!canDraw())return;
    const width=canvas.clientWidth,height=canvas.clientHeight;
    const project=point=>{const p=new THREE.Vector3(...point).project(camera);return{x:(p.x+1)*width/2,y:(1-p.y)*height/2};};
    const moonPixel=project(readout.positions.moon),earthPixel=project(EARTH),eyePixel=project(readout.observer.eye),pixelsPerUnit=width/(camera.right-camera.left);
    const occupied=[{left:moonPixel.x-RADII.moon*pixelsPerUnit-4,right:moonPixel.x+RADII.moon*pixelsPerUnit+4,top:moonPixel.y-RADII.moon*pixelsPerUnit-4,bottom:moonPixel.y+RADII.moon*pixelsPerUnit+4},{left:earthPixel.x-RADII.earth*pixelsPerUnit-4,right:earthPixel.x+RADII.earth*pixelsPerUnit+4,top:earthPixel.y-RADII.earth*pixelsPerUnit-4,bottom:earthPixel.y+RADII.earth*pixelsPerUnit+4}];
    const sunPixel=project([SUN[0]+RADII.sun-.25,1.8,0]);label('[data-moon-label="sun"]',sunPixel.x,sunPixel.y,occupied);
    label('[data-moon-label="moon"]',moonPixel.x,moonPixel.y-RADII.moon*pixelsPerUnit-10,occupied);
    label('[data-moon-label="earth"]',earthPixel.x+RADII.earth*pixelsPerUnit+32,earthPixel.y+9,occupied);
    label('[data-moon-label="observer"]',eyePixel.x+42,eyePixel.y-30,occupied);
    const observerLabel=root.querySelector('[data-moon-label="observer"]'),leader=root.querySelector('.moon-observer-link');leader.setAttribute('viewBox','0 0 '+width+' '+height);leader.querySelector('path').setAttribute('d','M '+eyePixel.x+' '+eyePixel.y+' L '+parseFloat(observerLabel.style.left)+' '+(parseFloat(observerLabel.style.top)+3));
    const segments=[...paths.incident,paths.reflected,paths.reflected];
    packets.forEach((mesh,i)=>{const segment=segments[i];mesh.visible=!!segment;if(segment){const t=(elapsed*.6+i*.21)%1;mesh.position.fromArray(add(segment.start,scale(sub(segment.end,segment.start),t)));}});
    renderer.render(scene,camera);eyeRenderer.render(scene,eyeCamera);
  }
  function loop(time){raf=0;if(!canDraw()||!playing){lastTick=null;return;}if(lastTick===null)lastTick=time;
    if(time-lastTick>=32){const dt=Math.min((time-lastTick)/1000,.25);lastTick=time;angle=wrapAngle(angle+ORBIT.speed*dt);elapsed+=dt;sync();draw();}
    raf=requestAnimationFrame(loop);
  }
  function halt(){cancelAnimationFrame(raf);raf=0;lastTick=null;}
  function schedule(){if(canDraw()&&playing&&!raf){lastTick=null;raf=requestAnimationFrame(loop);}}
  function setPlaying(value){if(playing===value)return;playing=value;root.dataset.playing=String(value);button.querySelector('span').textContent=value?'暫停':'播放';button.setAttribute('aria-label',value?'暫停月球運行':'播放月球運行');button.querySelector('path').setAttribute('d',value?'M3 2H8V18H3ZM12 2H17V18H12Z':'M4 2 L18 10 L4 18Z');root.querySelector('#moon-model-status').textContent=value?'月球正在繞地球運行，光路與右側畫面同步變化。':'目前暫停。按下播放，觀察月球移動時的反射光路。';if(value)schedule();else halt();}
  button.addEventListener('click',()=>{if(!failed)setPlaying(!playing);});
  function resize(){
    const w=canvas.clientWidth,h=canvas.clientHeight,ew=eyeCanvas.clientWidth,eh=eyeCanvas.clientHeight;if(!w||!h||!ew||!eh)return;
    renderer.setSize(w,h,false);eyeRenderer.setSize(ew,eh,false);
    const width=Math.max(16.8,14.5*w/h),height=width*h/w;camera.left=-width/2;camera.right=width/2;camera.top=height/2;camera.bottom=-height/2;camera.updateProjectionMatrix();
    eyeCamera.aspect=ew/eh;sync();draw();
  }
  const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(frame);
  const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible){draw();schedule();}else halt();},{rootMargin:'40px'});intersection.observe(frame);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)halt();else{draw();schedule();}});
  const raycaster=new THREE.Raycaster(),hit=new THREE.Vector3();let pointer=null;
  function cast(event){const r=canvas.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1),camera);}
  function moveTo(value){setPlaying(false);angle=wrapAngle(value);sync();draw();}
  canvas.addEventListener('pointerdown',event=>{if(failed||event.button!==0)return;cast(event);if(!raycaster.intersectObject(pickSphere,false).length)return;
    const onPlane=raycaster.ray.intersectPlane(orbitPlane,hit);if(!onPlane)return;pointer={id:event.pointerId,offset:angle-orbitAngle(sub(hit.toArray(),EARTH))};setPlaying(false);canvas.setPointerCapture(event.pointerId);canvas.focus({preventScroll:true});canvas.style.cursor='grabbing';event.preventDefault();});
  canvas.addEventListener('pointermove',event=>{if(failed||pointer?.id!==event.pointerId)return;cast(event);if(raycaster.ray.intersectPlane(orbitPlane,hit))moveTo(orbitAngle(sub(hit.toArray(),EARTH))+pointer.offset);});
  const finish=()=>{pointer=null;canvas.style.cursor='grab';};for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,finish);
  canvas.addEventListener('keydown',event=>{if(failed||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();moveTo(angle+(['ArrowRight','ArrowUp'].includes(event.key)?1:-1)*(event.shiftKey?15:3));});
  const api={setActive(value){active=value;if(active){resize();draw();schedule();}else setPlaying(false);},stop(){failed=true;playing=false;halt();renderer.dispose();eyeRenderer.dispose();}};
  for(const c of [canvas,eyeCanvas])c.addEventListener('webglcontextlost',()=>{failed=true;playing=false;halt();});
  sync();resize();scene.updateMatrixWorld(true);await renderer.compileAsync(scene,camera);await eyeRenderer.compileAsync(scene,eyeCamera);return api;
}
