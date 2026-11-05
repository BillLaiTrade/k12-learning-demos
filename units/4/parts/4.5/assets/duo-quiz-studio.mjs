import * as THREE from '../../4.1/assets/vendor/three/build/three.module.js';
import {DUO_LIGHTS as LIGHTS,DUO_FILTERS as FILTERS,PAPER_TYPES,CHALLENGE_LAYOUT as L,filterIntersection} from './duo-quiz-model.mjs?v=single-change-20261105';

export function createChallengeStudio(canvas,{unavailable,onLabels}={}){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
 const scene=new THREE.Scene();scene.background=new THREE.Color('#283126');
 const paperScene=new THREE.Scene(),filterScene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(38,1,.1,60),target=new THREE.Vector3(-.1,1.1,0);
 const orbit={yaw:-.72,pitch:1.05,radius:10.6};let question,signal,lit=false,frame=0,drag=null,disposed=false;
 scene.add(new THREE.HemisphereLight('#fff4df','#414a3d',1.1));const key=new THREE.DirectionalLight('#fff3df',2.5);key.position.set(-4,7,6);scene.add(key);
 const metal=new THREE.MeshStandardMaterial({color:'#7d8780',metalness:.8,roughness:.3}),black=new THREE.MeshStandardMaterial({color:'#151c19',metalness:.65,roughness:.38});
 const wood=document.createElement('canvas');wood.width=512;wood.height=256;const wc=wood.getContext('2d');wc.fillStyle='#846039';wc.fillRect(0,0,512,256);
 for(let y=0;y<256;y++){wc.strokeStyle=`rgba(45,24,8,${.08+.06*Math.sin(y*.39)})`;wc.beginPath();for(let x=0;x<=512;x+=8){const h=y+Math.sin(x*.018+y*.21)*2;x?wc.lineTo(x,h):wc.moveTo(x,h);}wc.stroke();}
 const map=new THREE.CanvasTexture(wood);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(2,2);
 function box(parent,size,position,material){const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),material);mesh.position.set(...position);parent.add(mesh);return mesh;}
 function cylinder(parent,radius,height,position,material){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,height,40),material);mesh.position.set(...position);parent.add(mesh);return mesh;}
 box(scene,[7.7,.25,4.8],[0,.14,0],new THREE.MeshStandardMaterial({map,roughness:.85}));
 for(const z of[-.28,.28])box(scene,[7,.04,.035],[0,.29,z],metal);
 for(const x of[-3.2,3.2])for(const z of[-1.9,1.9])box(scene,[.18,1.2,.18],[x,-.55,z],black);
 function mount(parent,x,z,height=1.1){box(parent,[.6,.1,.55],[x,.33,z],black);box(parent,[.51,.04,.46],[x,.4,z],metal);cylinder(parent,.045,height,[x,.44+height/2,z],metal);}
 const lenses=[];
 for(const from of L.sources){mount(scene,from[0],from[2]);const head=new THREE.Group();head.position.set(...from);head.quaternion.setFromUnitVectors(new THREE.Vector3(1,0,0),new THREE.Vector3(L.paperX,L.axis,0).sub(head.position).normalize());scene.add(head);
  const body=cylinder(head,.21,.76,[0,0,0],black);body.rotation.z=-Math.PI/2;
  for(const x of[-.32,.3]){const ring=new THREE.Mesh(new THREE.TorusGeometry(.215,.025,10,40),metal);ring.rotation.y=Math.PI/2;ring.position.x=x;head.add(ring);}
  const lens=new THREE.Mesh(new THREE.CircleGeometry(.18,40),new THREE.MeshBasicMaterial({color:'#28322e',toneMapped:false}));lens.rotation.y=Math.PI/2;lens.position.x=.39;head.add(lens);lenses.push(lens);
 }
 const filterFrame=new THREE.Group();scene.add(filterFrame);mount(filterFrame,0,0,.38);
 const pane=new THREE.Mesh(new THREE.PlaneGeometry(1.8,1.8),new THREE.MeshStandardMaterial({side:THREE.DoubleSide,transparent:true,opacity:.32,roughness:.2,depthWrite:false}));pane.rotation.y=-Math.PI/2;pane.position.set(0,L.axis,0);filterScene.add(pane);
 for(const z of[-.94,.94])box(filterFrame,[.055,1.92,.055],[0,L.axis,z],metal);
 for(const y of[L.axis-.94,L.axis+.94])box(filterFrame,[.055,.055,1.94],[0,y,0],metal);
 // Paper follows the selective diffuse model. Keep the bench's filmic RGB
 // cross-talk and specular highlights out of the observed paper response.
 const paper=new THREE.Mesh(new THREE.PlaneGeometry(1.8,1.8),new THREE.MeshLambertMaterial({side:THREE.DoubleSide,toneMapped:false}));paper.rotation.y=-Math.PI/2;paper.position.set(L.paperX,L.axis,0);paperScene.add(paper);mount(scene,L.paperX,0,.38);
 const gold=new THREE.MeshBasicMaterial({color:'#f4d487',toneMapped:false});
 for(const z of[-.94,.94])box(scene,[.055,1.94,.045],[L.paperX-.025,L.axis,z],gold);
 for(const y of[L.axis-.94,L.axis+.94])box(scene,[.055,.045,1.94],[L.paperX-.025,y,0],gold);
 // Bench visibility lights must never add missing colour components to the paper.
 const paperFill=new THREE.HemisphereLight('#ffffff','#ffffff',1.5),paperKey=new THREE.DirectionalLight('#ffffff',2);paperKey.position.set(-3,3,2);paperScene.add(paperFill,paperKey);
 filterScene.add(new THREE.HemisphereLight('#ffffff','#54634d',1.4));
 const rays=new THREE.Group();scene.add(rays);
 function clearRays(){for(const line of [...rays.children]){rays.remove(line);line.geometry.dispose();line.material.dispose();}}
 // Guide rays are annotations; they must not write depth over the paper's
 // subsequently rendered surface, especially at the shared endpoint.
 function line(a,b,rgb){const strength=Math.max(...rgb);if(strength<.045)return;const mesh=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...a),new THREE.Vector3(...b)]),new THREE.LineBasicMaterial({color:new THREE.Color().setRGB(...rgb),transparent:true,opacity:.85,depthWrite:false,toneMapped:false}));rays.add(mesh);}
 function draw(){frame=0;if(disposed)return;camera.position.set(target.x+Math.sin(orbit.yaw)*Math.sin(orbit.pitch)*orbit.radius,target.y+Math.cos(orbit.pitch)*orbit.radius,target.z+Math.cos(orbit.yaw)*Math.sin(orbit.pitch)*orbit.radius);camera.lookAt(target);
  renderer.autoClear=true;renderer.render(scene,camera);renderer.autoClear=false;renderer.render(paperScene,camera);renderer.render(filterScene,camera);renderer.autoClear=true;
  if(question&&onLabels){camera.updateMatrixWorld(true);const project=point=>{const p=new THREE.Vector3(...point).project(camera);return{x:(p.x+1)/2,y:(1-p.y)/2};};onLabels({a:project(L.sources[0]),b:project(L.sources[1]),filter:question.filter==='clear'?null:project([0,L.axis+.65,0]),paper:project([L.paperX,L.axis+.65,0])});}
 }
 function request(){if(!frame&&!disposed)frame=requestAnimationFrame(draw);}
 function resize(){const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();request();}
 const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(canvas);
 function update(next,nextSignal,on){question=next;signal=nextSignal;lit=on;paper.material.color.setRGB(...PAPER_TYPES[question.paper].rgb);pane.material.color.set(FILTERS[question.filter].css);pane.visible=filterFrame.visible=question.filter!=='clear';
  const illumination=lit?signal.transmitted:[1,1,1];paperFill.color.setRGB(...illumination);paperFill.groundColor.setRGB(...illumination);paperKey.color.setRGB(...illumination);
  clearRays();L.sources.forEach((from,i)=>{const rgb=LIGHTS[question.lights[i]].rgb;lenses[i].material.color.setRGB(...rgb.map(v=>v*(lit?1:.15)+.025));if(lit){const end=[L.paperX,L.axis,0],hit=filterIntersection(from,end);line(from,hit,rgb);line(hit,end,rgb.map((v,c)=>v*FILTERS[question.filter].rgb[c]));}});request();
 }
 canvas.addEventListener('pointerdown',e=>{if(!e.isPrimary){drag=null;return;}drag={id:e.pointerId,x:e.clientX,y:e.clientY,yaw:orbit.yaw,pitch:orbit.pitch,active:false};});
 canvas.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(!drag.active){if(Math.hypot(dx,dy)<6)return;if(e.pointerType==='touch'&&Math.abs(dy)>Math.abs(dx)){drag=null;return;}drag.active=true;canvas.setPointerCapture(e.pointerId);}e.preventDefault();orbit.yaw=THREE.MathUtils.clamp(drag.yaw-dx*.006,-1.25,.15);orbit.pitch=THREE.MathUtils.clamp(drag.pitch-dy*.004,.65,1.35);request();});
 for(const type of['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,()=>{drag=null;});
 canvas.addEventListener('keydown',e=>{const delta={ArrowLeft:[.08,0],ArrowRight:[-.08,0],ArrowUp:[0,.05],ArrowDown:[0,-.05]}[e.key];if(e.key==='Home'){e.preventDefault();Object.assign(orbit,{yaw:-.72,pitch:1.05,radius:10.6});request();}else if(delta){e.preventDefault();orbit.yaw=THREE.MathUtils.clamp(orbit.yaw+delta[0],-1.25,.15);orbit.pitch=THREE.MathUtils.clamp(orbit.pitch+delta[1],.65,1.35);request();}});
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();disposed=true;resizeObserver.disconnect();unavailable?.();});
 resize();return{update,dispose(){disposed=true;cancelAnimationFrame(frame);resizeObserver.disconnect();renderer.dispose();}};
}
