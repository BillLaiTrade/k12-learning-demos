import * as THREE from './vendor/three/build/three.module.js';
import {RADII,PHYSICAL,ORBIT,EARTH,SUN,SUN_DIRECTIONS,orbitBasis,orbitAngle,lunarVector,positionsAt,reflectionState,wrapAngle,unit,sub,add,scale,dot} from './moon-reflection-model.mjs?v=orbit-20261105b';

export async function createMoonLab(root){
  const canvas=root.querySelector('canvas'),frame=root.querySelector('.moon-space-frame'),slider=root.querySelector('#moon-orbit-position');
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.outputColorSpace=THREE.SRGBColorSpace;
  const textures=new THREE.TextureLoader();let earthMap,moonMap,sunMap;
  try{[earthMap,moonMap,sunMap]=await Promise.all(['earth','moon','sun'].map(name=>textures.loadAsync(new URL('./celestial-'+name+'.jpg',import.meta.url).href)));}catch(error){renderer.dispose();throw error;}
  for(const map of[earthMap,moonMap,sunMap]){map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());}
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(40,1,.1,180);
  scene.background=new THREE.Color('#060e1b');
  const eyeCamera=new THREE.OrthographicCamera(-.39,.39,.39,-.39,.01,60);eyeCamera.layers.set(1);
  const target=new THREE.Vector3(-1.8,0,0);let yaw=-.45,pitch=.85,distance=27,angle=ORBIT.initial;
  const positions=positionsAt(angle),bodies={},basis=orbitBasis();
  const vertex=['varying vec2 vUv;varying vec3 vWorld;varying vec3 vNormalWorld;',
    'void main(){vUv=uv;vWorld=(modelMatrix*vec4(position,1.)).xyz;',
    'vNormalWorld=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}'].join('\n');
  // Shadows use real Earth–Moon proportions, never the compressed display positions.
  const fragment=['uniform sampler2D map;uniform vec3 bodyCenter;uniform vec3 physicalCenter;uniform float physicalRadius;',
    'uniform float displayRadius;uniform vec3 occluder;uniform float occluderRadius;uniform vec3 sunDirections[13];',
    'varying vec2 vUv;varying vec3 vWorld;varying vec3 vNormalWorld;',
    'void main(){vec3 n=normalize(vNormalWorld);vec3 p=physicalCenter+(vWorld-bodyCenter)*physicalRadius/displayRadius;float light=0.;',
    'for(int i=0;i<13;i++){vec3 l=sunDirections[i];vec3 q=p-occluder;float b=dot(q,l);float h=b*b-dot(q,q)+occluderRadius*occluderRadius;',
    'float blocked=0.;if(h>0.&&-b-sqrt(h)>0.000001)blocked=1.;light+=max(dot(n,l),0.)*(1.-blocked)/13.;}',
    'vec3 base=texture2D(map,vUv).rgb;gl_FragColor=vec4(base*(1.15*light),1.);',
    '#include <tonemapping_fragment>','#include <colorspace_fragment>','}'].join('\n');
  function planet(name,map,other){
    const material=new THREE.ShaderMaterial({uniforms:{map:{value:map},bodyCenter:{value:new THREE.Vector3()},physicalCenter:{value:new THREE.Vector3()},physicalRadius:{value:PHYSICAL[name]},displayRadius:{value:RADII[name]},occluder:{value:new THREE.Vector3()},occluderRadius:{value:PHYSICAL[other]},sunDirections:{value:SUN_DIRECTIONS.map(v=>new THREE.Vector3(...v))}},vertexShader:vertex,fragmentShader:fragment});
    const mesh=new THREE.Mesh(new THREE.SphereGeometry(RADII[name],72,48),material);scene.add(mesh);bodies[name]=mesh;return mesh;
  }
  const earth=planet('earth',earthMap,'moon');earth.rotation.set(0,-.7,.41);
  const moon=planet('moon',moonMap,'earth');moon.layers.enable(1);
  const sun=new THREE.Mesh(new THREE.SphereGeometry(RADII.sun,64,40),new THREE.ShaderMaterial({
    uniforms:{sunMap:{value:sunMap}},vertexShader:vertex,fragmentShader:['uniform sampler2D sunMap;varying vec2 vUv;varying vec3 vNormalWorld;varying vec3 vWorld;',
      'void main(){float center=pow(abs(dot(normalize(vNormalWorld),normalize(cameraPosition-vWorld))),.35);',
      'vec3 tex=texture2D(sunMap,vUv).rgb;float detail=dot(tex,vec3(.2126,.7152,.0722));',
      'gl_FragColor=vec4(vec3(1.,.95,.82)*(.75+.4*detail)*(.8+center*.3),1.);','#include <colorspace_fragment>','}'].join('\n')
  }));bodies.sun=sun;scene.add(sun);
  const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=128;
  const ctx=glowCanvas.getContext('2d'),gradient=ctx.createRadialGradient(64,64,25,64,64,64);
  gradient.addColorStop(0,'rgba(255,248,210,.55)');gradient.addColorStop(.5,'rgba(255,245,210,.12)');gradient.addColorStop(1,'rgba(255,245,210,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
  const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(glowCanvas),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));glow.scale.set(7,7,1);sun.add(glow);
  let seed=723;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const stars=[];for(let i=0;i<1100;i++){const a=rand()*Math.PI*2,z=rand()*2-1,r=55+rand()*15;stars.push(Math.cos(a)*Math.sqrt(1-z*z)*r,z*r,Math.sin(a)*Math.sqrt(1-z*z)*r);}
  const starGeometry=new THREE.BufferGeometry();starGeometry.setAttribute('position',new THREE.Float32BufferAttribute(stars,3));scene.add(new THREE.Points(starGeometry,new THREE.PointsMaterial({color:'#bacbdf',size:.085,transparent:true,opacity:.65})));
  function pathLine(points,color,opacity=.7){const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p))),new THREE.LineBasicMaterial({color,transparent:true,opacity}));scene.add(line);return line;}
  const orbitLine=pathLine(Array.from({length:181},(_,i)=>add(EARTH,lunarVector(i*2))),'#94bdbb');
  const earthOrbitRadius=EARTH[0]-SUN[0];
  pathLine(Array.from({length:101},(_,i)=>{const a=-.53+i*.0106;return[SUN[0]+earthOrbitRadius*Math.cos(a),0,earthOrbitRadius*Math.sin(a)];}),'#647ea3',.55);
  // A faint ecliptic reference patch makes the small orbital tilt legible.
  const planePatch=new THREE.Mesh(new THREE.CircleGeometry(ORBIT.radius+.3,96),new THREE.MeshBasicMaterial({color:'#264460',transparent:true,opacity:.09,side:THREE.DoubleSide,depthWrite:false}));planePatch.rotation.x=-Math.PI/2;planePatch.position.fromArray(EARTH);scene.add(planePatch);
  const observer=new THREE.Mesh(new THREE.SphereGeometry(.075,16,12),new THREE.MeshBasicMaterial({color:'#a8f0cd'}));scene.add(observer);
  const orbitHandle=new THREE.Mesh(new THREE.SphereGeometry(.5,16,12),new THREE.MeshBasicMaterial({visible:false}));scene.add(orbitHandle);
  const rays=new THREE.Group();scene.add(rays);let segments=[];
  const packetGeometry=new THREE.SphereGeometry(.055,10,8);
  const packets=Array.from({length:6},(_,i)=>{const m=new THREE.Mesh(packetGeometry,new THREE.MeshBasicMaterial({color:i%2?'#b5efff':'#ffe8a4'}));scene.add(m);return m;});
  let active=false,visible=true,failed=false,raf=0,lastFrame=0,readout;
  function updateCamera(){camera.position.set(target.x+distance*Math.sin(pitch)*Math.sin(yaw),distance*Math.cos(pitch),distance*Math.sin(pitch)*Math.cos(yaw));camera.lookAt(target);camera.updateMatrixWorld(true);}
  function arrow(a,b,color,opacity=1){
    const start=new THREE.Vector3(...a),delta=new THREE.Vector3(...b).sub(start),len=delta.length();if(len<.01)return;
    const helper=new THREE.ArrowHelper(delta.normalize(),start,len,color,Math.min(.18,len*.15),Math.min(.085,len*.08));
    helper.line.material.transparent=helper.cone.material.transparent=true;helper.line.material.opacity=helper.cone.material.opacity=opacity;rays.add(helper);
  }
  function clearRays(){for(const child of [...rays.children]){child.traverse(n=>{if(n.geometry)n.geometry.dispose();if(n.material)n.material.dispose();});rays.remove(child);}}
  function sync(){
    Object.assign(positions,positionsAt(angle));for(const name of Object.keys(bodies))bodies[name].position.fromArray(positions[name]);
    readout=reflectionState(angle);
    for(const name of ['earth','moon']){
      const uniforms=bodies[name].material.uniforms;uniforms.bodyCenter.value.fromArray(positions[name]);
      uniforms.physicalCenter.value.fromArray(name==='moon'?readout.physicalMoon:[0,0,0]);uniforms.occluder.value.fromArray(name==='earth'?readout.physicalMoon:[0,0,0]);
    }
    const direction=new THREE.Vector3(...readout.earthDirection),up=new THREE.Vector3(...basis.normal),x=up.clone().cross(direction).normalize();
    moon.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,up,direction));
    const eye=add(EARTH,scale(unit(sub(positions.moon,EARTH)),RADII.earth*1.015));observer.position.fromArray(eye);orbitHandle.position.copy(moon.position);
    // Direction-only Earth view: an orthographic camera avoids artificial near-distance perspective.
    eyeCamera.position.fromArray(eye);eyeCamera.up.set(0,1,0);eyeCamera.lookAt(moon.position);eyeCamera.updateMatrixWorld(true);
    clearRays();segments=[];
    const patches=readout.patches.length?readout.patches:readout.samples.filter((_,i)=>i%400===0).slice(0,3);
    for(const patch of patches){
      const point=add(positions.moon,scale(patch.normal,RADII.moon*1.002));
      const start=add(point,[-2.8,0,0]);arrow(start,point,'#f7bf58',.85);segments.push([start,point]);
      const normal=new THREE.Vector3(...patch.normal),tangent=new THREE.Vector3(0,1,0).cross(normal).normalize(),bitangent=normal.clone().cross(tangent).normalize();
      for(let i=0;i<2;i++){const a=i*Math.PI+.7,dir=normal.clone().multiplyScalar(.8).addScaledVector(tangent,Math.cos(a)*.6).addScaledVector(bitangent,Math.sin(a)*.6).normalize();arrow(point,add(point,scale(dir.toArray(),.85)),'#6cb8d9',.42);}
      if(patch.viewCos>0&&dot(patch.normal,sub(eye,point))>0){arrow(point,eye,'#8eddf5',.8);segments.push([point,eye]);}else segments.push(null);
    }
    const percent=Math.round(readout.fraction*100);root.querySelector('#moon-phase-value').textContent=percent+'%';slider.value=String(angle);
    canvas.setAttribute('aria-label','沿軌道拖動月球的3D天體模型。可用方向鍵調整月球位置，目前可見亮面約百分之'+percent+'。');
    root.querySelector('#moon-model-status').textContent=readout.shadowed?'地球遮住照向月球的陽光，呈現月食的簡化情境。':percent<2?'月球受光的一側大多背向地球，從地球方向看見的亮面很少。':'月球沿軌道移動時，我們看見受光月面的比例會改變；一般月相變化來自觀看方向的不同。';
    draw();
  }
  let labelBoxes=[];
  function labelAt(selector,point,width,height){
    const p=new THREE.Vector3(...point).project(camera),label=root.querySelector(selector),w=label.offsetWidth,h=label.offsetHeight;
    const baseX=(p.x+1)*width/2,baseY=(1-p.y)*height/2;
    for(const [dx,dy] of [[0,0],[0,-30],[0,30],[-65,0],[65,0],[0,-60],[0,60]]){
      const x=Math.max(w/2+8,Math.min(width-w/2-8,baseX+dx)),y=Math.max(h+8,Math.min(height-8,baseY+dy)),box={left:x-w/2,right:x+w/2,top:y-h,bottom:y};
      if(labelBoxes.some(b=>box.left<b.right+5&&box.right>b.left-5&&box.top<b.bottom+5&&box.bottom>b.top-5))continue;
      label.style.left=x+'px';label.style.top=y+'px';labelBoxes.push(box);return;
    }
    label.style.left=Math.max(w/2+8,Math.min(width-w/2-8,baseX))+'px';label.style.top=Math.max(h+8,Math.min(height-8,baseY-85))+'px';
  }
  function draw(time=0){
    if(failed||!active||!visible||document.hidden)return;const width=canvas.clientWidth,height=canvas.clientHeight;if(!width||!height)return;updateCamera();
    const inset=root.querySelector('.moon-earth-view').getBoundingClientRect(),canvasBox=canvas.getBoundingClientRect();labelBoxes=[{left:inset.left-canvasBox.left,right:inset.right-canvasBox.left,top:inset.top-canvasBox.top,bottom:inset.bottom-canvasBox.top}];
    for(const name of Object.keys(bodies)){const p=[...positions[name]];p[1]+=RADII[name]+.2;labelAt('[data-moon-label="'+name+'"]',p,width,height);}
    labelAt('[data-moon-orbit-label]',add(EARTH,lunarVector(320)),width,height);
    labelAt('[data-earth-orbit-label]',[EARTH[0]-.9,0,-4.4],width,height);
    labelAt('[data-earth-observer-label]',add(observer.position.toArray(),[0,.25,0]),width,height);
    for(let i=0;i<packets.length;i++){const segment=segments[i];packets[i].visible=!!segment;if(segment){const t=(time*.0003+i*.19)%1;packets[i].position.fromArray(add(segment[0],scale(sub(segment[1],segment[0]),t)));}}
    renderer.setScissorTest(false);renderer.setViewport(0,0,width,height);renderer.setClearColor('#060e1b');renderer.clear();renderer.render(scene,camera);
    const box=root.querySelector('.moon-earth-view').getBoundingClientRect(),bounds=canvas.getBoundingClientRect();
    const x=box.left-bounds.left,y=bounds.bottom-box.bottom,w=box.width,h=box.height;
    renderer.setScissorTest(true);renderer.setScissor(x,y,w,h);renderer.setViewport(x,y,w,h);renderer.setClearColor('#020711');renderer.clear();renderer.render(scene,eyeCamera);renderer.setScissorTest(false);
  }
  function loop(time){raf=0;if(!active||!visible||failed||document.hidden)return;if(time-lastFrame>30){draw(time);lastFrame=time;}raf=requestAnimationFrame(loop);}
  function schedule(){if(active&&visible&&!failed&&!document.hidden&&!raf)raf=requestAnimationFrame(loop);}
  function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;if(w&&h){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();draw();}}
  const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(canvas);
  const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)schedule();else{cancelAnimationFrame(raf);raf=0;}},{rootMargin:'80px'});intersection.observe(frame);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;}else schedule();});
  function setAngle(value){angle=wrapAngle(value);sync();}
  slider.addEventListener('input',()=>{if(!failed)setAngle(Number(slider.value));});
  root.querySelector('#moon-positions-reset').addEventListener('click',()=>{if(!failed)setAngle(ORBIT.initial);});
  const raycaster=new THREE.Raycaster(),plane=new THREE.Plane(new THREE.Vector3(...basis.normal),0).translate(new THREE.Vector3(...EARTH)),hit=new THREE.Vector3();let pointer=null;
  function cast(event){const b=canvas.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((event.clientX-b.left)/b.width*2-1,-(event.clientY-b.top)/b.height*2+1),camera);}
  canvas.addEventListener('pointerdown',event=>{
    if(failed||event.button!==0)return;cast(event);const picked=raycaster.intersectObject(orbitHandle,false).length>0,projected=raycaster.ray.intersectPlane(plane,hit),relative=projected?sub(hit.toArray(),EARTH):null;
    const nearOrbit=relative&&Math.abs(Math.hypot(...relative)-ORBIT.radius)<.35;
    pointer={id:event.pointerId,orbit:!!(picked||nearOrbit),offset:picked&&relative?angle-orbitAngle(relative):0,x:event.clientX,y:event.clientY};
    if(pointer.orbit&&relative&&!picked)setAngle(orbitAngle(relative));
    canvas.setPointerCapture(event.pointerId);canvas.focus({preventScroll:true});canvas.style.cursor=pointer.orbit?'grabbing':'move';event.preventDefault();
  });
  canvas.addEventListener('pointermove',event=>{
    if(failed)return;cast(event);
    if(!pointer){const projected=raycaster.ray.intersectPlane(plane,hit);canvas.style.cursor=raycaster.intersectObject(orbitHandle,false).length||projected&&Math.abs(hit.distanceTo(earth.position)-ORBIT.radius)<.35?'grab':'move';return;}
    if(pointer.id!==event.pointerId)return;
    if(pointer.orbit){if(raycaster.ray.intersectPlane(plane,hit))setAngle(orbitAngle(sub(hit.toArray(),EARTH))+pointer.offset);}
    else{yaw-=(event.clientX-pointer.x)*.006;pitch=THREE.MathUtils.clamp(pitch+(event.clientY-pointer.y)*.006,.3,1.45);draw();}
    pointer.x=event.clientX;pointer.y=event.clientY;
  });
  const finish=()=>{pointer=null;canvas.style.cursor='grab';};canvas.addEventListener('pointerup',finish);canvas.addEventListener('pointercancel',finish);canvas.addEventListener('lostpointercapture',finish);
  canvas.addEventListener('wheel',event=>{if(failed)return;event.preventDefault();distance=THREE.MathUtils.clamp(distance*Math.exp(event.deltaY*.001),22,38);draw();},{passive:false});
  canvas.addEventListener('keydown',event=>{if(failed||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();setAngle(angle+(event.key==='ArrowRight'||event.key==='ArrowUp'?1:-1)*(event.shiftKey?15:3));});
  const api={setActive(value){active=value;if(active){resize();schedule();}else{cancelAnimationFrame(raf);raf=0;}},stop(){failed=true;cancelAnimationFrame(raf);raf=0;},};
  canvas.addEventListener('webglcontextlost',()=>api.stop());resize();sync();scene.updateMatrixWorld(true);updateCamera();
  await renderer.compileAsync(scene,camera);await renderer.compileAsync(scene,eyeCamera);return api;
}
