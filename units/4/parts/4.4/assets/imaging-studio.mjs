import * as THREE from '../../4.1/assets/vendor/three/build/three.module.js';
import {IMAGING as G,moveImaging,imagingState,imagingRays,imagingKeypointState} from './imaging-optics.mjs?v=20261103-imaging-guide1';
const root=document.querySelector('[data-imaging-lab]');
if(root) initialise(root);
function initialise(root){
 const $=s=>root.querySelector(s),$$=s=>[...root.querySelectorAll(s)],canvas=$('#imaging-canvas');
 let state={object:320,screen:240,stage:'focus'},showRays=true,point='both',front=false,selected='screen',studio=null;
 state=moveImaging(state,'screen',imagingState(state).v);
 const art=document.createElement('canvas');art.width=350;art.height=600;const a=art.getContext('2d');
 a.fillStyle='#dd684f';a.beginPath();a.moveTo(175,80);a.lineTo(133,170);a.lineTo(217,170);a.closePath();a.fill();
 a.strokeStyle='#688d65';a.lineWidth=13;a.lineCap='round';a.beginPath();a.moveTo(175,190);a.lineTo(175,442);a.stroke();a.fillStyle='#438dbb';a.beginPath();a.arc(175,500,35,0,Math.PI*2);a.fill();
 const paper=$('[data-imaging-paper]'),pc=paper.getContext('2d');
 function paintProjection(){
  const g=imagingState(state),W=paper.width,H=paper.height;pc.fillStyle='#f1f1e5';pc.fillRect(0,0,W,H);
  // Uniform pupil samples spread an extended object on the actual receiving plane.
  // Their envelope is exactly the same thin-lens rayAt geometry as the helper rays.
  const samples=g.spread<.003?1:61;pc.save();pc.globalAlpha=1/samples;
  for(let i=0;i<samples;i++){
   const radius=samples===1?0:Math.sqrt((i+.5)/samples)*g.spread,angle=i*2.399963229728653;
   pc.save();pc.translate(W/2+Math.cos(angle)*radius*W/G.screenWidth,H/2+Math.sin(angle)*radius*H/G.screenHeight);
   pc.scale(g.projectionScale*G.cardWidth/G.screenWidth*W/art.width,g.projectionScale*G.cardHeight/G.screenHeight*H/art.height);pc.drawImage(art,-art.width/2,-art.height/2);pc.restore();
  }
  pc.restore();return g;
 }
 function clearGestureNotice(){const note=$('[data-imaging-gesture-note]');note.hidden=true;root.dataset.gestureHelp='false';}
 function showGestureNotice(key){const note=$('[data-imaging-gesture-note]');note.textContent=key==='lens'?'凸透鏡是固定的。':key==='object'&&state.stage==='focus'?'發光圖卡目前固定。請切換到「調整圖卡與屏幕」模式，再使用下方圖卡尺調整遠近。':`請使用下方${key==='object'?'圖卡尺':'屏幕尺'}的刻度按鈕或綠色把手調整距離。`;note.hidden=false;root.dataset.gestureHelp='true';}
 function update(){
  const g=paintProjection(),focus=state.stage==='focus';
  $$('[data-imaging-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.imagingMode===state.stage)));
  $('[data-imaging-object-controls]').hidden=focus;
  $('[data-imaging-prompt]').textContent=focus?'固定圖卡與透鏡；點選下方刻度按鈕，觀察屏幕清楚與模糊的變化。':'使用下方圖卡尺改變物距，再調整屏幕尺重新對焦。';
  $$('[data-imaging-device]').forEach(b=>{const key=b.dataset.imagingDevice;b.disabled=key==='object'&&focus;b.textContent=key==='object'?'圖卡 ↔':'屏幕 ↔';b.setAttribute('aria-pressed',String(key===selected));b.setAttribute('aria-label',`${key==='object'?'發光圖卡':'屏幕'}，${state[key]}公分，可用方向鍵移動`);});
  for(const handle of $$('[data-imaging-ruler-handle]')){const key=handle.dataset.imagingRulerHandle,max=G[key+'Max'];handle.style.left=`${(key==='object'?1-state[key]/max:state[key]/max)*100}%`;handle.setAttribute('aria-valuenow',String(state[key]));handle.setAttribute('aria-valuetext',`${key==='object'?'圖卡':'屏幕'}距離透鏡${state[key]}公分`);}
  const target=$('[data-imaging-target]');target.hidden=!g.finite||g.unreachable;target.dataset.distance=g.finite?String(g.v):'';target.style.setProperty('--target-position',`${g.finite?g.v/G.screenMax*100:0}%`);$('[data-imaging-target-label]').setAttribute('aria-label',g.finite?`屏幕移至清楚像位置，${Math.round(g.v*10)/10}公分`:'沒有有限距離的清楚像位置');
  $('[data-imaging-target-status]').hidden=g.finite&&!g.unreachable;
  $('[data-imaging-target-status]').textContent=!g.finite?'圖卡位於焦點，沒有有限距離的清楚像。':g.unreachable?`清楚像在 ${Math.round(g.v*10)/10} 公分，已超出軌道。`:`清楚像位置：${Math.round(g.v*10)/10} 公分`;
  for(const key of ['object','screen']){const output=$(`[data-imaging-distance=${key}]`);output.textContent=`${state[key]} 公分`;output.setAttribute('aria-label',`${key==='object'?'物距':'屏幕距離'} ${state[key]} 公分`);}
  $('[data-imaging-rays]').textContent=showRays?'隱藏輔助光路':'顯示輔助光路';$('[data-imaging-rays]').setAttribute('aria-pressed',String(showRays));$('[data-imaging-trace]').hidden=!showRays;
  $$('[data-imaging-point]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.imagingPoint===point)));
  $('[data-imaging-view]').textContent=front?'返回實驗台':'屏幕視角';$('[data-imaging-view]').setAttribute('aria-label',front?'返回實驗台視角':'切換到屏幕視角');$('[data-imaging-view]').setAttribute('aria-pressed',String(front));

  let message=g.clear?`屏幕已對焦：倒立${g.sizeLabel}的實像。`:'屏幕尚未對焦。移動屏幕，找清楚的倒立像。';
  if(!g.finite)message='物體在焦點上，無法在有限距離的屏幕上找到清楚像。將圖卡移遠一些再試。';
  else if(g.unreachable)message='清楚像的位置已超出軌道，屏幕移到最遠仍無法對焦。請把圖卡移遠透鏡一些，再重新找像。';
  if(g.clipped)message+=' 部分投影超出屏幕；保留實際比例，不縮小圖案填入。';
  if(showRays)message+=point==='top'?' 紅線追蹤圖卡上端，在清楚像的下方會聚。':point==='bottom'?' 藍線追蹤圖卡下端，在清楚像的上方會聚。':' 紅、藍線來自不同物點，分別形成對應的像點。';
  $('[data-result]').textContent=message;$('[data-imaging-badge]').textContent=!g.finite?'物體位於焦點':g.unreachable?'清楚像超出軌道':g.clear?`已對焦・倒立${g.sizeLabel}${g.clipped?'・部分超出屏幕':''}`:'屏幕尚未對焦';
  const keypoint=!g.finite?'focus':!g.clear?'':Math.abs(state.object-G.f*2)<.05?'double':state.object>G.f*2?'beyond':'between';
  $$('[data-imaging-keypoint]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.imagingKeypoint===keypoint)));
  root.dataset.mode=state.stage;root.dataset.object=state.object;root.dataset.screen=state.screen;root.dataset.clear=String(g.clear);root.dataset.magnification=g.finite?String(g.m):'';root.dataset.projectionScale=g.projectionScale;root.dataset.spread=g.spread;root.dataset.rays=showRays;root.dataset.view=front?'screen':'orbit';root.dataset.point=point;
  canvas.setAttribute('aria-label',`旋轉與縮放觀察的立體凸透鏡成像台，使用下方位置尺調整距離，物距${state.object}公分，屏幕距離${state.screen}公分，${$('[data-imaging-badge]').textContent}`);
  studio?.update();
 }
 function move(key,value){clearGestureNotice();state=moveImaging(state,key,value);selected=key;update();}
 $$('[data-imaging-mode]').forEach(b=>b.addEventListener('click',()=>{clearGestureNotice();state={...state,stage:b.dataset.imagingMode};if(state.stage==='focus')selected='screen';update();}));
 for(const handle of $$('[data-imaging-ruler-handle]')){
  const key=handle.dataset.imagingRulerHandle,track=$(`[data-imaging-ruler-track=${key}]`);let drag=null;
  track.addEventListener('click',e=>{if(e.target.closest('[data-imaging-ruler-handle]')||key==='object'&&state.stage==='focus')return;const mark=e.target.closest('[data-imaging-ruler-mark]');if(e.target.closest('[data-imaging-target]')){const g=imagingState(state);if(g.finite&&!g.unreachable)move('screen',g.v);return;}if(mark){move(key,Number(mark.dataset.imagingRulerMark));return;}const r=track.getBoundingClientRect();if(!r.width)return;const fraction=(e.clientX-r.left)/r.width;move(key,(key==='object'?1-fraction:fraction)*G[key+'Max']);});
  handle.addEventListener('pointerdown',e=>{if(e.button!==0||drag||handle.disabled)return;clearGestureNotice();e.preventDefault();handle.focus({preventScroll:true});handle.setPointerCapture(e.pointerId);drag={id:e.pointerId,x:e.clientX,value:state[key],width:track.getBoundingClientRect().width};});
  handle.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id||!drag.width)return;move(key,drag.value+(e.clientX-drag.x)/drag.width*G[key+'Max']*(key==='object'?-1:1));});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])handle.addEventListener(event,e=>{if(e.pointerId===drag?.id)drag=null;});
 }
 $('[data-imaging-rays]').addEventListener('click',()=>{showRays=!showRays;update();});$('[data-imaging-view]').addEventListener('click',()=>{clearGestureNotice();front=!front;update();});
 $$('[data-imaging-point]').forEach(b=>b.addEventListener('click',()=>{point=b.dataset.imagingPoint;update();}));
 $$('[data-imaging-device]').forEach(b=>{const key=b.dataset.imagingDevice;b.addEventListener('click',()=>{selected=key;update();});b.addEventListener('keydown',e=>{let value=state[key];if(e.key==='Home')value=G[key+'Min'];else if(e.key==='End')value=G[key+'Max'];else if(['ArrowLeft','ArrowRight','ArrowDown','ArrowUp'].includes(e.key)){const direction=['ArrowLeft','ArrowDown'].includes(e.key)?-1:1;value+=(key==='object'?-direction:direction)*(e.shiftKey?.2:1);}else return;e.preventDefault();move(key,value);});});
 $$('[data-imaging-keypoint]').forEach(b=>b.addEventListener('click',()=>{
  const next=imagingKeypointState(b.dataset.imagingKeypoint);if(!next)return;clearGestureNotice();state=next;selected='screen';front=false;update();
  requestAnimationFrame(()=>{const r=$('.imaging-stage').getBoundingClientRect(),nav=document.querySelector('.route'),top=innerWidth<=760?(nav?.getBoundingClientRect().height||0)+8:12;window.scrollBy({top:r.top-top,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});if(!canvas.hidden)canvas.focus({preventScroll:true});});
 }));
 try{studio=createStudio();root.dataset.webgl='ready';}catch(error){canvas.hidden=true;$('[data-imaging-fallback]').hidden=false;$('[data-imaging-view]').hidden=true;root.dataset.webgl='unavailable';console.warn('Imaging 3D:',error.message);}
 update();root.dataset.ready='true';
 function createStudio(){
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const scene=new THREE.Scene();scene.background=new THREE.Color('#566b5b');scene.fog=new THREE.Fog('#566b5b',35,80);
  const camera=new THREE.PerspectiveCamera(39,1,.03,120),target=new THREE.Vector3(1.05,1.5,0);let orbit={azimuth:-.90,polar:1.38,zoom:1},fitRadius=9,pending=0;
  scene.add(new THREE.HemisphereLight('#f2f3df','#3a503e',2.1));const light=new THREE.DirectionalLight('#fff0cf',3.1);light.position.set(-3,8,6);light.castShadow=true;light.shadow.mapSize.set(1024,1024);Object.assign(light.shadow.camera,{left:-8,right:10,top:7,bottom:-5});light.shadow.bias=-.0004;scene.add(light);const rim=new THREE.DirectionalLight('#d3e9e0',1.6);rim.position.set(5,4,-4);scene.add(rim);
  const mat=(color,options={})=>new THREE.MeshStandardMaterial({color,roughness:.5,metalness:.15,...options}),dark=mat('#283e30',{metalness:.5,roughness:.36}),steel=mat('#a2b4a4',{metalness:.7,roughness:.27}),brass=mat('#bba267',{metalness:.7,roughness:.3});
  function box(parent,size,pos,material){const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),material);mesh.position.set(...pos);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
  function cylinder(parent,radius,height,pos,material){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,height,24),material);mesh.position.set(...pos);mesh.castShadow=true;parent.add(mesh);return mesh;}
  const wc=document.createElement('canvas');wc.width=1024;wc.height=128;const w=wc.getContext('2d');w.fillStyle='#aa8050';w.fillRect(0,0,1024,128);let seed=72;for(let i=0;i<130;i++){seed=(1664525*seed+1013904223)>>>0;const y=seed/2**32*128;w.beginPath();w.moveTo(0,y);w.bezierCurveTo(250,y-4,650,y+4,1024,y);w.strokeStyle=i%3?'#51331135':'#ffe1a145';w.lineWidth=.7;w.stroke();}
  const texture=new THREE.CanvasTexture(wc);texture.colorSpace=THREE.SRGBColorSpace;box(scene,[12.7,.23,2],[1,.0,0],mat('#ddc192',{map:texture,roughness:.65}));box(scene,[12.7,.09,2],[1,-.15,0],mat('#725331'));
  for(const z of [-.70,.70]){box(scene,[12.3,.08,.11],[1,.17,z],steel);box(scene,[12.3,.025,.035],[1,.225,z],dark);}
  for(let i=-25;i<=35;i++){box(scene,[.015,.012,i%5===0?.14:.07],[i*.2,.242,.76],dark);}
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(120,120),mat('#526653',{roughness:.99}));floor.rotation.x=-Math.PI/2;floor.position.y=-.28;floor.receiveShadow=true;scene.add(floor);
  function mount(group,top){box(group,[.57,.15,1.7],[0,.34,0],dark);box(group,[.43,.06,1.45],[0,.445,0],steel);cylinder(group,.06,Math.max(.05,top-.49),[0,(top+.49)/2,0],steel);for(const z of [-.74,.74])cylinder(group,.055,.035,[0,.48,z],brass);}
  function frame(group,width,height){box(group,[.12,height+.14,width+.14],[.045,G.axis,0],dark);for(const z of [-width/2-.02,width/2+.02])box(group,[.045,height+.08,.035],[-.03,G.axis,z],steel);for(const y of [G.axis-height/2-.02,G.axis+height/2+.02])box(group,[.045,.035,width+.08],[-.03,y,0],steel);}
  const source=new THREE.Group();scene.add(source);mount(source,G.axis-G.cardHeight/2);frame(source,G.cardWidth,G.cardHeight);
  const artTex=new THREE.CanvasTexture(art);artTex.colorSpace=THREE.SRGBColorSpace;
  function plane(parent,width,height,x,material,rotation){const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,height),material);mesh.rotation.y=rotation;mesh.position.set(x,G.axis,0);parent.add(mesh);return mesh;}
  plane(source,G.cardWidth,G.cardHeight,-.026,new THREE.MeshBasicMaterial({color:'#fff5d5',toneMapped:false}),-Math.PI/2);plane(source,G.cardWidth,G.cardHeight,.112,new THREE.MeshBasicMaterial({color:'#fff5d5',toneMapped:false}),Math.PI/2);
  for(const [x,rot]of [[-.03,-Math.PI/2],[.116,Math.PI/2]])plane(source,G.cardWidth,G.cardHeight,x,new THREE.MeshBasicMaterial({map:artTex,transparent:true,toneMapped:false}),rot);
  const lensGroup=new THREE.Group();scene.add(lensGroup);mount(lensGroup,G.axis-.91);const profile=[];for(let i=0;i<=64;i++){const r=.88*i/64;profile.push(new THREE.Vector2(r,-(.018+.095*(1-(r/.88)**2))));}for(let i=64;i>=0;i--){const r=.88*i/64;profile.push(new THREE.Vector2(r,.018+.095*(1-(r/.88)**2)));}
  const lens=new THREE.Mesh(new THREE.LatheGeometry(profile,80),new THREE.MeshPhysicalMaterial({color:'#d4ede6',transparent:true,opacity:.5,transmission:.09,roughness:.05,metalness:0,depthWrite:false,side:THREE.DoubleSide}));lens.rotation.z=-Math.PI/2;lens.position.y=G.axis;lensGroup.add(lens);
  for(const x of [-.02,.02]){const ring=new THREE.Mesh(new THREE.TorusGeometry(.92,.037,12,80),steel);ring.rotation.y=Math.PI/2;ring.position.set(x,G.axis,0);ring.castShadow=true;lensGroup.add(ring);}box(lensGroup,[.45,.12,.24],[0,G.axis-.94,0],steel);cylinder(lensGroup,.10,.12,[0,G.axis+.99,0],brass);
  const screen=new THREE.Group();scene.add(screen);mount(screen,.50);frame(screen,G.screenWidth,G.screenHeight);
  const projectedTexture=new THREE.CanvasTexture(paper);projectedTexture.colorSpace=THREE.SRGBColorSpace;const screenPlane=plane(screen,G.screenWidth,G.screenHeight,-.025,new THREE.MeshBasicMaterial({map:projectedTexture,toneMapped:false}),-Math.PI/2);
  for(const group of [source,screen]){box(group,[.34,.18,.36],[0,.54,.84],brass);for(let i=0;i<4;i++)box(group,[.35,.014,.27],[0,.49+i*.033,.84],dark);}
  for(const n of [-200,-100,100,200])box(scene,[.025,.10,.12],[n*G.scale,.3,.87],brass);
  const rays=new THREE.Group();scene.add(rays);
  const annotations=new THREE.Group();annotations.name='imaging-annotations';scene.add(annotations);
  function caption(text,key,x,y,height,dark=false){
   const c=document.createElement('canvas'),ctx=c.getContext('2d'),font='600 52px system-ui, sans-serif';ctx.font=font;c.width=Math.ceil(ctx.measureText(text).width)+32;c.height=76;ctx.font=font;ctx.textAlign='center';ctx.textBaseline='middle';
   ctx.fillStyle=dark?'#36503f':'#f8f6e9';ctx.strokeStyle=dark?'#36503f':'#9aa98c';ctx.lineWidth=2;ctx.beginPath();if(ctx.roundRect)ctx.roundRect(1,1,c.width-2,c.height-2,10);else ctx.rect(1,1,c.width-2,c.height-2);ctx.fill();ctx.stroke();ctx.fillStyle=dark?'#fff9df':'#254b35';ctx.fillText(text,c.width/2,c.height/2);
   const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;const mesh=new THREE.Mesh(new THREE.PlaneGeometry(height*c.width/c.height,height),new THREE.MeshBasicMaterial({map:texture,transparent:true,toneMapped:false,depthWrite:false}));mesh.position.set(x,y,1.06);mesh.userData={annotation:key,text};annotations.add(mesh);return mesh;
  }
  const sourceName=caption('發光圖卡','object',source.position.x,-.045,.30);caption('凸透鏡・固定','lens',0,-.045,.30);
  for(const n of [-200,-100,100,200])caption(Math.abs(n)===200?'2F':'F',`focus${n}`,n*G.scale,.30,.25,true);
  function updateRays(){for(const m of [...rays.children]){m.geometry.dispose();m.material.dispose();rays.remove(m);}rays.visible=showRays&&!front;if(!showRays)return;for(const r of imagingRays(state,point)){const color=r.name==='top'?'#f4a17e':'#88c7ee';for(const [from,to]of [[r.from,r.lens],[r.lens,r.end]]){const A=new THREE.Vector3(...from),B=new THREE.Vector3(...to),tube=new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(A,B),1,.009,6,false),new THREE.MeshBasicMaterial({color,toneMapped:false}));tube.userData={name:r.name,from,to};rays.add(tube);const arrow=new THREE.Mesh(new THREE.ConeGeometry(.036,.13,10),new THREE.MeshBasicMaterial({color,toneMapped:false}));arrow.position.copy(A).lerp(B,.64);arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),B.clone().sub(A).normalize());rays.add(arrow);}}}
  function directionFor(azimuth,polar){return new THREE.Vector3(Math.sin(polar)*Math.sin(azimuth),Math.cos(polar),Math.sin(polar)*Math.cos(azimuth));}
  function fitToViewport(){
   camera.fov=39;camera.updateProjectionMatrix();let radius=9;
   const bounds=[];for(const [xs,ys,zs]of [[[-4.9,-1.4],[.3,G.axis+G.cardHeight/2+.1],[-.9,.9]],[[G.screenMin*G.scale-.3,7.4],[.3,3.6],[-1,1]],[[-5.4,7.4],[-.25,.25],[-1.15,1.15]]])for(const x of xs)for(const y of ys)for(const z of zs)bounds.push(new THREE.Vector3(x,y,z));
   const directions=[directionFor(-.9,1.38)];
   for(let i=0;i<40;i++){const fits=directions.every(direction=>{camera.position.copy(target).addScaledVector(direction,radius);camera.lookAt(target);camera.updateMatrixWorld();return bounds.every(p=>{const q=p.clone().project(camera);return Math.abs(q.x)<.9&&Math.abs(q.y)<.8;});});if(fits)break;radius*=1.06;}
   fitRadius=radius;
  }
  function updateCamera(){
   if(front){const d=Math.min(1.1,state.screen*G.scale-.2);camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(Math.max(G.screenHeight+.65,(G.screenWidth+.6)/camera.aspect)/(2*d)));camera.position.set(state.screen*G.scale-d,G.axis,0);camera.lookAt(state.screen*G.scale,G.axis,0);}
   else{camera.fov=39;camera.position.copy(target).addScaledVector(directionFor(orbit.azimuth,orbit.polar),fitRadius*orbit.zoom);camera.lookAt(target);}
   camera.updateProjectionMatrix();camera.updateMatrixWorld();
  }
  function draw(){pending=0;renderer.render(scene,camera);}
  function requestDraw(){if(!pending)pending=requestAnimationFrame(draw);}
  function syncScene(){source.position.x=-state.object*G.scale;sourceName.position.x=source.position.x;annotations.visible=!front;screen.position.x=state.screen*G.scale;projectedTexture.needsUpdate=true;updateRays();updateCamera();scene.updateMatrixWorld(true);requestDraw();}
  const devices={object:source,screen,lens:lensGroup},pointers=new Map(),raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let gesture=null;
  function ray(e){const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);raycaster.setFromCamera(pointer,camera);}
  function hit(e){if(front)return null;ray(e);const h=raycaster.intersectObjects(Object.values(devices),true)[0];if(!h)return null;let group=h.object;while(group.parent!==scene&&group.parent)group=group.parent;return {...h,key:Object.keys(devices).find(key=>devices[key]===group)};}
  const pinch=()=>{const p=[...pointers.values()];return p.length<2?0:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);};
  canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);if(pointers.size>1){clearGestureNotice();gesture={kind:'pinch',distance:pinch(),zoom:orbit.zoom};return;}const h=hit(e);if(!h)clearGestureNotice();gesture={kind:h?'apparatus':'orbit',key:h?.key,startX:e.clientX,startY:e.clientY,azimuth:orbit.azimuth,polar:orbit.polar};});
  canvas.addEventListener('pointermove',e=>{
   if(!pointers.has(e.pointerId)){canvas.style.cursor=hit(e)?'help':'grab';return;}pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(!gesture)return;
   if(pointers.size>1){if(gesture.kind!=='pinch')return;front=false;orbit.zoom=THREE.MathUtils.clamp(gesture.zoom*gesture.distance/Math.max(pinch(),1),.65,1);update();return;}
   if(gesture.kind==='pinch')return;
   if(gesture.kind==='apparatus'){if(Math.hypot(e.clientX-gesture.startX,e.clientY-gesture.startY)>=4)showGestureNotice(gesture.key);return;}
   front=false;orbit.azimuth=THREE.MathUtils.clamp(gesture.azimuth-(e.clientX-gesture.startX)*.005,-1.2,-.15);orbit.polar=THREE.MathUtils.clamp(gesture.polar+(e.clientY-gesture.startY)*.004,.9,1.48);update();
  });
  function stop(e){pointers.delete(e.pointerId);gesture=null;canvas.style.cursor='grab';}
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,stop);
  canvas.addEventListener('wheel',e=>{e.preventDefault();clearGestureNotice();if(front)return;orbit.zoom=THREE.MathUtils.clamp(orbit.zoom+e.deltaY*.001,.65,1);update();},{passive:false});
  canvas.addEventListener('keydown',e=>{const steps={ArrowLeft:[.06,0],ArrowRight:[-.06,0],ArrowUp:[0,-.05],ArrowDown:[0,.05]};if(!steps[e.key])return;e.preventDefault();clearGestureNotice();front=false;orbit.azimuth=THREE.MathUtils.clamp(orbit.azimuth+steps[e.key][0],-1.2,-.15);orbit.polar=THREE.MathUtils.clamp(orbit.polar+steps[e.key][1],.9,1.48);update();});
  function resize(){const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;fitToViewport();updateCamera();requestDraw();}new ResizeObserver(resize).observe(canvas);resize();
  return {update:syncScene,scene,camera,renderer,source,lens,screen,screenPlane,rays,devices};
 }
}
