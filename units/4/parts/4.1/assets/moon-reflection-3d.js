import * as THREE from './vendor/three/build/three.module.js';
import {RADII,INITIAL,constrainPosition,reflectionState,unit,sub,add,scale} from './moon-reflection-model.mjs?v=celestial-20261105';

export async function createMoonLab(root){
  const canvas=root.querySelector('canvas'),frame=root.querySelector('.moon-space-frame');
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  const textures=new THREE.TextureLoader();
  let earthMap,moonMap,sunMap;
  try{[earthMap,moonMap,sunMap]=await Promise.all([
    textures.loadAsync(new URL('./celestial-earth.jpg',import.meta.url).href),
    textures.loadAsync(new URL('./celestial-moon.jpg',import.meta.url).href),
    textures.loadAsync(new URL('./celestial-sun.jpg',import.meta.url).href)
  ]);}catch(error){renderer.dispose();throw error;}
  for(const map of[earthMap,moonMap,sunMap]){map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());}
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(40,1,.1,180);
  scene.background=new THREE.Color('#060e1b');
  const eyeCamera=new THREE.OrthographicCamera(-.9,.9,.9,-.9,.01,60);eyeCamera.layers.set(1);
  const target=new THREE.Vector3(-.5,0,0);let yaw=-.85,pitch=1.02,distance=23;
  const positions=Object.fromEntries(Object.entries(INITIAL).map(([k,v])=>[k,[...v]]));
  const names={sun:'太陽',earth:'地球',moon:'月球'},bodies={};
  const vertex=['varying vec2 vUv;varying vec3 vWorld;varying vec3 vNormalWorld;',
    'void main(){vUv=uv;vWorld=(modelMatrix*vec4(position,1.)).xyz;',
    'vNormalWorld=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}'].join('\n');
  const fragment=['uniform sampler2D map;uniform vec3 sunPosition;uniform vec3 occluder;uniform float occluderRadius;',
    'varying vec2 vUv;varying vec3 vWorld;varying vec3 vNormalWorld;',
    'void main(){vec3 lightVector=sunPosition-vWorld;float lightDistance=length(lightVector);vec3 l=normalize(lightVector);',
    'vec3 q=vWorld-occluder;float b=dot(q,l);float h=b*b-dot(q,q)+occluderRadius*occluderRadius;',
    'float blocked=0.;if(h>0.){float t=-b-sqrt(h);if(t>0.001&&t<lightDistance)blocked=1.;}',
    'float diffuse=max(dot(normalize(vNormalWorld),l),0.)*(1.-blocked);',
    'vec3 base=texture2D(map,vUv).rgb;gl_FragColor=vec4(base*(0.008+1.15*diffuse),1.);',
    '#include <tonemapping_fragment>','#include <colorspace_fragment>','}'].join('\n');
  function planet(name,map,other){
    const material=new THREE.ShaderMaterial({uniforms:{map:{value:map},sunPosition:{value:new THREE.Vector3()},occluder:{value:new THREE.Vector3()},occluderRadius:{value:RADII[other]}},vertexShader:vertex,fragmentShader:fragment});
    const mesh=new THREE.Mesh(new THREE.SphereGeometry(RADII[name],72,48),material);scene.add(mesh);bodies[name]=mesh;return mesh;
  }
  const earth=planet('earth',earthMap,'moon');earth.rotation.set(0,-.7,.41);
  const moon=planet('moon',moonMap,'earth');moon.layers.enable(1);
  const sun=new THREE.Mesh(new THREE.SphereGeometry(RADII.sun,64,40),new THREE.ShaderMaterial({
    uniforms:{sunMap:{value:sunMap}},vertexShader:vertex,fragmentShader:['uniform sampler2D sunMap;varying vec2 vUv;varying vec3 vNormalWorld;varying vec3 vWorld;',
      'void main(){vec3 n=normalize(vNormalWorld);',
      'float center=pow(abs(dot(n,normalize(cameraPosition-vWorld))),.35);vec3 color=texture2D(sunMap,vUv).rgb;',
      'gl_FragColor=vec4(color*(.8+center*.45),1.);','#include <colorspace_fragment>','}'].join('\n')
  }));bodies.sun=sun;scene.add(sun);
  const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=128;
  const ctx=glowCanvas.getContext('2d'),gradient=ctx.createRadialGradient(64,64,25,64,64,64);
  gradient.addColorStop(0,'rgba(255,184,45,.7)');gradient.addColorStop(.5,'rgba(255,145,25,.18)');gradient.addColorStop(1,'rgba(255,130,0,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
  const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(glowCanvas),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));glow.scale.set(7,7,1);sun.add(glow);
  let seed=723;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const stars=[];for(let i=0;i<1100;i++){const a=rand()*Math.PI*2,z=rand()*2-1,r=55+rand()*15;stars.push(Math.cos(a)*Math.sqrt(1-z*z)*r,z*r,Math.sin(a)*Math.sqrt(1-z*z)*r);}
  const starGeometry=new THREE.BufferGeometry();starGeometry.setAttribute('position',new THREE.Float32BufferAttribute(stars,3));scene.add(new THREE.Points(starGeometry,new THREE.PointsMaterial({color:'#bacbdf',size:.085,transparent:true,opacity:.65})));
  const grid=new THREE.GridHelper(22,22,'#27445c','#152c41');grid.position.y=-1.65;grid.material.transparent=true;grid.material.opacity=.38;scene.add(grid);
  const ring=new THREE.Mesh(new THREE.RingGeometry(.99,1.03,80),new THREE.MeshBasicMaterial({color:'#b9e4d3',transparent:true,opacity:.8,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;scene.add(ring);
  const rays=new THREE.Group();scene.add(rays);let segments=[];
  const packetGeometry=new THREE.SphereGeometry(.075,12,8);
  const packets=[0,1,2,3].map((_,i)=>{const m=new THREE.Mesh(packetGeometry,new THREE.MeshBasicMaterial({color:i<2?'#ffe8a4':'#b5efff'}));scene.add(m);return m;});
  let selected='moon',active=false,visible=true,failed=false,raf=0,lastFrame=0,readout;
  function updateCamera(){camera.position.set(target.x+distance*Math.sin(pitch)*Math.sin(yaw),distance*Math.cos(pitch),distance*Math.sin(pitch)*Math.cos(yaw));camera.lookAt(target);camera.updateMatrixWorld(true);}
  function arrow(a,b,color,opacity=1){
    const start=new THREE.Vector3(...a),delta=new THREE.Vector3(...b).sub(start),len=delta.length();if(len<.01)return;
    const helper=new THREE.ArrowHelper(delta.normalize(),start,len,color,Math.min(.32,len*.15),Math.min(.16,len*.08));
    helper.line.material.transparent=helper.cone.material.transparent=true;helper.line.material.opacity=helper.cone.material.opacity=opacity;rays.add(helper);
  }
  function clearRays(){for(const child of [...rays.children]){child.traverse(n=>{if(n.geometry)n.geometry.dispose();if(n.material)n.material.dispose();});rays.remove(child);}}
  function sync(){
    for(const name of Object.keys(bodies))bodies[name].position.fromArray(positions[name]);
    for(const [name,other]of[['earth','moon'],['moon','earth']]){bodies[name].material.uniforms.sunPosition.value.fromArray(positions.sun);bodies[name].material.uniforms.occluder.value.fromArray(positions[other]);}
    const direction=unit(sub(positions.earth,positions.moon));moon.rotation.y=Math.atan2(direction[0],direction[2]);
    const eye=add(positions.earth,scale(unit(sub(positions.moon,positions.earth)),RADII.earth*1.02));
    eyeCamera.position.fromArray(eye);eyeCamera.up.set(0,1,0);eyeCamera.lookAt(moon.position);eyeCamera.updateMatrixWorld(true);
    readout=reflectionState(positions);clearRays();segments=[];
    if(readout.patch){
      const point=readout.patch.point,n=readout.patch.normal;
      const start=add(positions.sun,scale(unit(sub(point,positions.sun)),RADII.sun*1.05));arrow(start,point,'#f7bf58');segments.push([start,point]);
      const normal=new THREE.Vector3(...n),tangent=new THREE.Vector3(0,1,0).cross(normal).normalize(),bitangent=normal.clone().cross(tangent).normalize();
      for(let i=0;i<6;i++){const a=i*Math.PI/3,dir=normal.clone().multiplyScalar(.7).addScaledVector(tangent,Math.cos(a)*.65).addScaledVector(bitangent,Math.sin(a)*.65).normalize();arrow(point,add(point,scale(dir.toArray(),1.6)),'#6cb8d9',.42);}
      if(readout.reachesEarth){arrow(point,eye,'#8eddf5');segments.push([point,eye]);}
    }else{
      const start=add(positions.sun,scale(unit(sub(positions.moon,positions.sun)),RADII.sun*1.05));
      const dir=unit(sub(positions.moon,start)),q=sub(start,positions.earth),b=q.reduce((s,v,i)=>s+v*dir[i],0),disc=b*b-q.reduce((s,v)=>s+v*v,0)+RADII.earth**2;
      if(disc>0)arrow(start,add(start,scale(dir,-b-Math.sqrt(disc))),'#f7bf58');
    }
    const percent=Math.round(readout.fraction*100);
    root.querySelector('#moon-phase-value').textContent=percent+'%';
    root.querySelector('#moon-model-status').textContent=readout.shadowed?'地球擋住了照向月球的陽光。':!readout.reachesEarth?'月球仍有受光面，但目前從地球方向看不到它。':'部分陽光經月面反射，沿藍色光路到達地球方向。';
    ring.position.copy(bodies[selected].position);ring.position.y=-1.5;ring.scale.setScalar(RADII[selected]*1.25);
    for(const button of root.querySelectorAll('[data-moon-body]'))button.setAttribute('aria-pressed',String(button.dataset.moonBody===selected));
    canvas.setAttribute('aria-label','可拖曳太陽、地球與月球的3D天體模型。目前選取'+names[selected]+'，可用方向鍵移動。');
    draw();
  }
  function draw(time=0){
    if(failed||!active||!visible||document.hidden)return;
    const width=canvas.clientWidth,height=canvas.clientHeight;if(!width||!height)return;
    updateCamera();
    for(const name of Object.keys(bodies)){
      const p=bodies[name].position.clone();p.y+=RADII[name]+.28;p.project(camera);
      const label=root.querySelector('[data-moon-label="'+name+'"]');label.style.left=Math.max(30,Math.min(width-35,(p.x+1)*width/2))+'px';label.style.top=Math.max(10,Math.min(height-40,(1-p.y)*height/2))+'px';
      label.classList.toggle('is-selected',selected===name);
    }
    for(let i=0;i<packets.length;i++){const segment=segments[Math.floor(i/2)];packets[i].visible=!!segment;if(segment){const t=((time*.0003)+(i%2)*.5)%1;packets[i].position.fromArray(add(segment[0],scale(sub(segment[1],segment[0]),t)));}}
    renderer.setScissorTest(false);renderer.setViewport(0,0,width,height);renderer.setClearColor('#060e1b');renderer.clear();renderer.render(scene,camera);
    const box=root.querySelector('.moon-earth-view').getBoundingClientRect(),bounds=canvas.getBoundingClientRect();
    const x=box.left-bounds.left,y=bounds.bottom-box.bottom,w=box.width,h=box.height;
    renderer.setScissorTest(true);renderer.setScissor(x,y,w,h);renderer.setViewport(x,y,w,h);renderer.setClearColor('#020711');renderer.clear();renderer.render(scene,eyeCamera);renderer.setScissorTest(false);
  }
  function loop(time){raf=0;if(!active||!visible||failed||document.hidden)return;if(time-lastFrame>30){draw(time);lastFrame=time;}raf=requestAnimationFrame(loop);}
  function schedule(){if(active&&visible&&!failed&&!document.hidden&&!raf)raf=requestAnimationFrame(loop);}
  function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;if(w&&h){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();draw();}}
  const observer=new ResizeObserver(resize);observer.observe(canvas);
  const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)schedule();else{cancelAnimationFrame(raf);raf=0;}},{rootMargin:'80px'});intersection.observe(frame);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;}else schedule();});
  function select(name){selected=name;sync();}
  for(const button of root.querySelectorAll('[data-moon-body]'))button.addEventListener('click',()=>{if(failed)return;select(button.dataset.moonBody);canvas.focus({preventScroll:true});});
  root.querySelector('#moon-positions-reset').addEventListener('click',()=>{if(failed)return;for(const name of Object.keys(INITIAL))positions[name]=[...INITIAL[name]];sync();});
  const raycaster=new THREE.Raycaster(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0),hit=new THREE.Vector3();let pointer=null;
  function cast(event){const b=canvas.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((event.clientX-b.left)/b.width*2-1,-(event.clientY-b.top)/b.height*2+1),camera);}
  canvas.addEventListener('pointerdown',event=>{
    if(failed||event.button!==0)return;cast(event);const pick=raycaster.intersectObjects(Object.values(bodies),false)[0];
    const name=pick&&Object.keys(bodies).find(n=>bodies[n]===pick.object);if(name)select(name);
    const projected=raycaster.ray.intersectPlane(plane,hit);pointer={id:event.pointerId,name,x:event.clientX,y:event.clientY,offset:name&&projected?sub(positions[name],hit.toArray()):[0,0,0]};
    canvas.setPointerCapture(event.pointerId);canvas.focus({preventScroll:true});canvas.style.cursor=name?'grabbing':'move';event.preventDefault();
  });
  canvas.addEventListener('pointermove',event=>{
    if(failed)return;cast(event);
    if(!pointer){canvas.style.cursor=raycaster.intersectObjects(Object.values(bodies),false).length?'grab':'move';return;}
    if(pointer.id!==event.pointerId)return;
    if(pointer.name){if(raycaster.ray.intersectPlane(plane,hit)){positions[pointer.name]=constrainPosition(pointer.name,add(hit.toArray(),pointer.offset),positions);sync();}}
    else{yaw-=(event.clientX-pointer.x)*.006;pitch=THREE.MathUtils.clamp(pitch+(event.clientY-pointer.y)*.006,.3,1.45);draw();}
    pointer.x=event.clientX;pointer.y=event.clientY;
  });
  const finish=()=>{pointer=null;canvas.style.cursor='grab';};canvas.addEventListener('pointerup',finish);canvas.addEventListener('pointercancel',finish);canvas.addEventListener('lostpointercapture',finish);
  canvas.addEventListener('wheel',event=>{if(failed)return;event.preventDefault();distance=THREE.MathUtils.clamp(distance*Math.exp(event.deltaY*.001),16,35);draw();},{passive:false});
  canvas.addEventListener('keydown',event=>{if(failed||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();const p=[...positions[selected]],step=event.shiftKey ? .7 : .25;if(event.key==='ArrowLeft')p[0]-=step;if(event.key==='ArrowRight')p[0]+=step;if(event.key==='ArrowUp')p[2]-=step;if(event.key==='ArrowDown')p[2]+=step;positions[selected]=constrainPosition(selected,p,positions);sync();});
  const api={setActive(value){active=value;if(active){resize();schedule();}else{cancelAnimationFrame(raf);raf=0;}},stop(){failed=true;cancelAnimationFrame(raf);raf=0;},};
  canvas.addEventListener('webglcontextlost',()=>api.stop());resize();sync();
  scene.updateMatrixWorld(true);updateCamera();
  await renderer.compileAsync(scene,camera);await renderer.compileAsync(scene,eyeCamera);
  return api;
}
