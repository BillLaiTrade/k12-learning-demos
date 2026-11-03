import {createImagingWorkspace} from './imaging-workspace.mjs?v=20261103-imaging-virtual1';
import * as THREE from '../../4.1/assets/vendor/three/build/three.module.js';
import {IMAGING as G,moveImaging,imagingState,imagingRays,imagingKeypointState} from './imaging-optics.mjs?v=20261103-imaging-virtual1';
const root=document.querySelector('[data-imaging-lab]');
if(root) initialise(root);
function initialise(root){
 const $=s=>root.querySelector(s),$$=s=>[...root.querySelectorAll(s)],canvas=$('#imaging-canvas');
 let state={object:320,screen:240},showRays=true,point='both',front=false,selected='screen',studio=null;
 state=moveImaging(state,'screen',imagingState(state).v);
 const distanceLabel=value=>{const n=Number((value/G.f).toFixed(3));return n===1?'F':`${n}F`;};
 const workspace=createImagingWorkspace(root);

 const art=document.createElement('canvas');art.width=350;art.height=600;const a=art.getContext('2d');
 a.fillStyle='#dd684f';a.beginPath();a.moveTo(175,80);a.lineTo(133,170);a.lineTo(217,170);a.closePath();a.fill();
 a.strokeStyle='#688d65';a.lineWidth=13;a.lineCap='round';a.beginPath();a.moveTo(175,190);a.lineTo(175,442);a.stroke();a.fillStyle='#438dbb';a.beginPath();a.arc(175,500,35,0,Math.PI*2);a.fill();
 const paper=$('[data-imaging-paper]'),pc=paper.getContext('2d');
 function paintProjection(){
  const g=imagingState(state),W=paper.width,H=paper.height;pc.fillStyle='#f1f1e5';pc.fillRect(0,0,W,H);
  if(state.atInfinity){const rx=Math.max(5,g.spread*W/G.screenWidth),ry=Math.max(5,g.spread*H/G.screenHeight);pc.fillStyle='#d17c36';pc.beginPath();pc.ellipse(W/2,H/2,rx,ry,0,0,Math.PI*2);pc.fill();return g;}
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
 function clearGestureNotice(){const note=$('[data-imaging-gesture-note]');note.hidden=true;root.dataset.gestureHelp='false';$$('[data-imaging-ruler]').forEach(r=>r.removeAttribute('data-guided'));}
 function showGestureNotice(key){clearGestureNotice();$$('[data-imaging-ruler]').forEach(r=>r.toggleAttribute('data-guided',r.dataset.imagingRuler===key));const note=$('[data-imaging-gesture-note]');note.textContent=key==='lens'?'凸透鏡是固定的。':`請使用下方金框標示的${key==='object'?'圖卡尺':'屏幕尺'}的刻度按鈕或綠色把手調整距離。`;note.hidden=false;root.dataset.gestureHelp='true';}
 function update(){
  const g=paintProjection();
  $$('[data-imaging-device]').forEach(b=>{const key=b.dataset.imagingDevice;b.textContent=key==='object'?'圖卡 ↔':'屏幕 ↔';b.setAttribute('aria-pressed',String(key===selected));b.setAttribute('aria-label',`${key==='object'?'發光圖卡':'屏幕'}，${key==='object'&&state.atInfinity?'無窮遠':distanceLabel(state[key])}，可用方向鍵移動`);});
  for(const handle of $$('[data-imaging-ruler-handle]')){const key=handle.dataset.imagingRulerHandle,max=G[key+'Max'];handle.hidden=key==='object'&&!!state.atInfinity;handle.style.left=`${(key==='object'?1-state[key]/max:state[key]/max)*100}%`;handle.setAttribute('aria-valuemin',String(G[key+'Min']/G.f));handle.setAttribute('aria-valuemax',String(max/G.f));handle.setAttribute('aria-valuenow',String(Number((state[key]/G.f).toFixed(3))));handle.setAttribute('aria-valuetext',`${key==='object'?'圖卡':'屏幕'}距離透鏡${key==='object'&&state.atInfinity?'無窮遠':distanceLabel(state[key])}`);}
  const target=$('[data-imaging-target]');target.hidden=!g.finite||g.type!=='real'||g.unreachable;target.dataset.distance=g.finite&&g.type==='real'?String(g.v):'';target.style.setProperty('--target-position',`${g.finite?g.v/G.screenMax*100:0}%`);$('[data-imaging-target-label]').setAttribute('aria-label',g.finite&&g.type==='real'?`屏幕移至清楚像位置，${distanceLabel(g.v)}`:'沒有有限距離的清楚像位置');
  $('[data-imaging-target-status]').hidden=g.type==='real'&&g.finite&&!g.unreachable;
  $('[data-imaging-target-status]').textContent=g.type==='virtual'?`虛像在圖卡側${distanceLabel(Math.abs(g.v))}，放大${Number(g.m.toFixed(2))}倍。`:!g.finite?'圖卡位於焦點，沒有有限距離的清楚像。':g.unreachable?`清楚像在 ${distanceLabel(g.v)}，已超出軌道。`:`清楚像位置：${distanceLabel(g.v)}`;
  for(const key of ['object','screen']){const output=$(`[data-imaging-distance=${key}]`);output.textContent=key==='object'&&state.atInfinity?'∞':distanceLabel(state[key]);output.setAttribute('aria-label',`${key==='object'?'物距':'屏幕距離'} ${key==='object'&&state.atInfinity?'無窮遠':distanceLabel(state[key])}`);}
  $('[data-imaging-rays]').textContent=showRays?'隱藏輔助光路':'顯示輔助光路';$('[data-imaging-rays]').setAttribute('aria-pressed',String(showRays));$('[data-imaging-trace]').hidden=!showRays||!!state.atInfinity;
  $('[id=imaging-object-ruler-help]').textContent=state.atInfinity?'無窮遠：點刻度返回有限距離':'點選刻度按鈕或移動圖卡';
  $$('[data-imaging-point]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.imagingPoint===point)));
  $('[data-imaging-view]').textContent=front?'返回實驗台':'屏幕視角';$('[data-imaging-view]').setAttribute('aria-label',front?'返回實驗台視角':'切換到屏幕視角');$('[data-imaging-view]').setAttribute('aria-pressed',String(front));

  let message=g.clear?`屏幕已對焦：倒立${g.sizeLabel}的實像。`:'屏幕尚未對焦。移動屏幕，找清楚的倒立像。';
  if(state.atInfinity)message=g.clear?'無窮遠的軸上物點以平行光入射，在透鏡另一側F會聚成點像。':'無窮遠物點的像在另一側F；移動屏幕至F可接到點像。';
  else if(g.type==='virtual')message=`圖卡在F內，虛像位於透鏡前、圖卡同側${distanceLabel(Math.abs(g.v))}，比圖卡離透鏡更遠，正立且放大${Number(g.m.toFixed(2))}倍；屏幕接不到清楚像。虛線是光線的反向延長線。`;
  else if(!g.finite)message='圖卡位於F，沒有有限距離的清楚像；屏幕接不到清楚像。';
  else if(g.unreachable)message='清楚像的位置已超出軌道，屏幕移到最遠仍無法對焦。請把圖卡移遠透鏡一些，再重新找像。';
  if(g.clipped&&g.type==='real'&&!state.atInfinity)message+=' 部分投影超出屏幕；保留實際比例，不縮小圖案填入。';
  if(showRays&&g.finite&&g.type==='real'&&!state.atInfinity)message+=point==='top'?' 紅線追蹤圖卡上端，在清楚像的下方會聚。':point==='bottom'?' 藍線追蹤圖卡下端，在清楚像的上方會聚。':' 紅、藍線來自不同物點，分別形成對應的像點。';
  $('[data-result]').textContent=message;$('[data-imaging-badge]').textContent=state.atInfinity?(g.clear?'點像':'屏幕尚未對焦'):g.type==='virtual'?'屏幕接不到清楚像':!g.finite?'屏幕接不到清楚像':g.unreachable?'清楚像超出軌道':g.clear?`倒立、${g.sizeLabel}的實像`:'屏幕尚未對焦';
  const keypoint=state.atInfinity?'infinity':g.type==='virtual'?'inside':!g.finite?'focus':!g.clear?'':Math.abs(state.object-G.f*2)<.05?'double':state.object>G.f*2?'beyond':'between';
  $$('[data-imaging-keypoint]').forEach(row=>{const active=row.dataset.imagingKeypoint===keypoint;row.dataset.active=String(active);row.querySelector('button').setAttribute('aria-pressed',String(active));});
  root.dataset.atInfinity=String(!!state.atInfinity);root.dataset.imageType=g.type;root.dataset.imagePosition=g.finite?g.v:'';root.dataset.object=state.object;root.dataset.screen=state.screen;root.dataset.clear=String(g.clear);root.dataset.magnification=g.finite?String(g.m):'';root.dataset.projectionScale=g.projectionScale;root.dataset.spread=g.spread;root.dataset.rays=showRays;root.dataset.view=front?'screen':'orbit';root.dataset.point=point;
  canvas.setAttribute('aria-label',`旋轉與縮放觀察的立體凸透鏡成像台，使用下方位置尺調整距離，物距${state.atInfinity?'無窮遠':distanceLabel(state.object)}，屏幕距離${distanceLabel(state.screen)}，${$('[data-imaging-badge]').textContent}`);
  studio?.update();
 }
 function move(key,value){clearGestureNotice();state=moveImaging(state,key,value);selected=key;update();}
 for(const handle of $$('[data-imaging-ruler-handle]')){
  const key=handle.dataset.imagingRulerHandle,track=$(`[data-imaging-ruler-track=${key}]`),max=G[key+'Max'],marks=[...track.querySelectorAll('[data-imaging-ruler-mark]')].map(button=>{
   const value=Number(button.dataset.imagingRulerMark),position=(key==='object'?1-value/max:value/max)*100;button.style.left=position+'%';
   const line=document.createElement('span');line.className='imaging-ruler-major-line';line.dataset.imagingRulerMajorLine=String(value);line.style.left=position+'%';line.setAttribute('aria-hidden','true');track.append(line);return value;
  }).filter(value=>value>=G[key+'Min']&&value<=max);let drag=null;
  track.addEventListener('click',e=>{if(e.target.closest('[data-imaging-ruler-handle]'))return;const mark=e.target.closest('[data-imaging-ruler-mark]');if(e.target.closest('[data-imaging-target]')){const g=imagingState(state);if(g.finite&&g.type==='real'&&!g.unreachable)move('screen',g.v);return;}if(mark){move(key,Number(mark.dataset.imagingRulerMark));return;}const r=track.getBoundingClientRect();if(!r.width)return;const fraction=(e.clientX-r.left)/r.width;move(key,(key==='object'?1-fraction:fraction)*G[key+'Max']);});
  handle.addEventListener('pointerdown',e=>{if(e.button!==0||drag||handle.disabled)return;clearGestureNotice();e.preventDefault();handle.focus({preventScroll:true});handle.setPointerCapture(e.pointerId);drag={id:e.pointerId,x:e.clientX,value:state[key],width:track.getBoundingClientRect().width};});
  handle.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id||!drag.width)return;const value=drag.value+(e.clientX-drag.x)/drag.width*max*(key==='object'?-1:1),nearest=marks.reduce((a,b)=>Math.abs(b-value)<Math.abs(a-value)?b:a);move(key,Math.abs(nearest-value)/max*drag.width<=3?nearest:value);});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])handle.addEventListener(event,e=>{if(e.pointerId===drag?.id)drag=null;});
 }
 $('[data-imaging-rays]').addEventListener('click',()=>{showRays=!showRays;update();});$('[data-imaging-view]').addEventListener('click',()=>{clearGestureNotice();front=!front;update();});
 $$('[data-imaging-point]').forEach(b=>b.addEventListener('click',()=>{point=b.dataset.imagingPoint;update();}));
 $$('[data-imaging-device]').forEach(b=>{const key=b.dataset.imagingDevice;b.addEventListener('click',()=>{selected=key;update();});b.addEventListener('keydown',e=>{let value=state[key];if(e.key==='Home')value=G[key+'Min'];else if(e.key==='End')value=G[key+'Max'];else if(['ArrowLeft','ArrowRight','ArrowDown','ArrowUp'].includes(e.key)){const direction=['ArrowLeft','ArrowDown'].includes(e.key)?-1:1;value+=(key==='object'?-direction:direction)*(e.shiftKey?.2:1);}else return;e.preventDefault();move(key,value);});});
 $$('[data-imaging-keypoint]').forEach(b=>b.addEventListener('click',()=>{
  const next=imagingKeypointState(b.dataset.imagingKeypoint);if(!next)return;clearGestureNotice();state=next;selected='screen';front=false;update();studio?.frameCase();
 }));
 try{studio=createStudio();root.dataset.webgl='ready';}catch(error){canvas.hidden=true;$('[data-imaging-fallback]').hidden=false;$('[data-imaging-view]').hidden=true;root.dataset.webgl='unavailable';console.warn('Imaging 3D:',error.message);}
 update();root.dataset.ready='true';
 workspace.start();
 function createStudio(){
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const scene=new THREE.Scene();scene.background=new THREE.Color('#566b5b');scene.fog=new THREE.Fog('#566b5b',35,80);
  const camera=new THREE.PerspectiveCamera(39,1,.03,120),target=new THREE.Vector3(-G.f*.75*G.scale,1.75,0);let orbit={azimuth:-.62,polar:1.33,zoom:1},fitRadius=9,pending=0,viewport=null,frameMode='bench';
  const clampZoom=value=>THREE.MathUtils.clamp(value,.2,2.2);
  scene.add(new THREE.HemisphereLight('#f2f3df','#3a503e',2.1));const light=new THREE.DirectionalLight('#fff0cf',3.1);light.position.set(-3,8,6);light.castShadow=true;light.shadow.mapSize.set(1024,1024);Object.assign(light.shadow.camera,{left:-8,right:10,top:7,bottom:-5});light.shadow.bias=-.0004;scene.add(light);const rim=new THREE.DirectionalLight('#d3e9e0',1.6);rim.position.set(5,4,-4);scene.add(rim);
  const mat=(color,options={})=>new THREE.MeshStandardMaterial({color,roughness:.5,metalness:.15,...options}),dark=mat('#283e30',{metalness:.5,roughness:.36}),steel=mat('#a2b4a4',{metalness:.7,roughness:.27}),brass=mat('#bba267',{metalness:.7,roughness:.3});
  function box(parent,size,pos,material){const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),material);mesh.position.set(...pos);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
  function cylinder(parent,radius,height,pos,material){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,height,24),material);mesh.position.set(...pos);mesh.castShadow=true;parent.add(mesh);return mesh;}
  const wc=document.createElement('canvas');wc.width=1024;wc.height=128;const w=wc.getContext('2d');w.fillStyle='#aa8050';w.fillRect(0,0,1024,128);let seed=72;for(let i=0;i<130;i++){seed=(1664525*seed+1013904223)>>>0;const y=seed/2**32*128;w.beginPath();w.moveTo(0,y);w.bezierCurveTo(250,y-4,650,y+4,1024,y);w.strokeStyle=i%3?'#51331135':'#ffe1a145';w.lineWidth=.7;w.stroke();}
  const railMin=-G.objectMax*G.scale-.6,railMax=G.screenMax*G.scale+.6,railLength=railMax-railMin,railCenter=(railMin+railMax)/2;
  const texture=new THREE.CanvasTexture(wc);texture.colorSpace=THREE.SRGBColorSpace;box(scene,[railLength,.23,2],[railCenter,.0,0],mat('#ddc192',{map:texture,roughness:.65}));box(scene,[railLength,.09,2],[railCenter,-.15,0],mat('#725331'));
  for(const z of [-.70,.70]){box(scene,[railLength-.4,.08,.11],[railCenter,.17,z],steel);box(scene,[railLength-.4,.025,.035],[railCenter,.225,z],dark);}
  for(let i=-25;i<=35;i++){box(scene,[.015,.012,i%5===0?.14:.07],[i*.3,.242,.76],dark);}
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
  const virtualImage=new THREE.Group();virtualImage.name='imaging-virtual-image';virtualImage.visible=false;scene.add(virtualImage);
  const virtualArt=new THREE.Mesh(new THREE.PlaneGeometry(G.cardWidth,G.cardHeight),new THREE.MeshBasicMaterial({map:artTex,transparent:true,opacity:.72,depthWrite:false,depthTest:false,side:THREE.DoubleSide,toneMapped:false}));virtualArt.renderOrder=8;virtualImage.add(virtualArt);
  const virtualOutline=new THREE.Line(new THREE.BufferGeometry().setFromPoints([[-.27,-1.02,0],[-.27,.96,0],[.27,.96,0],[.27,-1.02,0],[-.27,-1.02,0]].map(p=>new THREE.Vector3(...p))),new THREE.LineDashedMaterial({color:'#eaf2d8',dashSize:.055,gapSize:.035,transparent:true,opacity:.85,depthWrite:false,depthTest:false,toneMapped:false}));virtualOutline.computeLineDistances();virtualOutline.renderOrder=9;virtualImage.add(virtualOutline);
  const rays=new THREE.Group();scene.add(rays);
  const annotations=new THREE.Group();annotations.name='imaging-annotations';scene.add(annotations);
  function caption(text,key,x,y,height,dark=false){
   const c=document.createElement('canvas'),ctx=c.getContext('2d'),font='600 52px system-ui, sans-serif',resolution=4;ctx.font=font;const logicalWidth=Math.ceil(ctx.measureText(text).width)+32,logicalHeight=76;c.width=logicalWidth*resolution;c.height=logicalHeight*resolution;ctx.scale(resolution,resolution);ctx.font=font;ctx.textAlign='center';ctx.textBaseline='middle';
   ctx.fillStyle=dark?'#36503f':'#f8f6e9';ctx.strokeStyle=dark?'#36503f':'#9aa98c';ctx.lineWidth=2;ctx.beginPath();if(ctx.roundRect)ctx.roundRect(1,1,logicalWidth-2,logicalHeight-2,10);else ctx.rect(1,1,logicalWidth-2,logicalHeight-2);ctx.fill();ctx.stroke();ctx.fillStyle=dark?'#fff9df':'#254b35';ctx.fillText(text,logicalWidth/2,logicalHeight/2);
   const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(16,renderer.capabilities.getMaxAnisotropy());const mesh=new THREE.Mesh(new THREE.PlaneGeometry(height*logicalWidth/logicalHeight,height),new THREE.MeshBasicMaterial({map:texture,transparent:true,toneMapped:false,depthWrite:false}));mesh.position.set(x,y,1.06);mesh.userData={annotation:key,text};annotations.add(mesh);return mesh;
  }
  const sourceName=caption('發光圖卡','object',source.position.x,-.045,.30);caption('凸透鏡・固定','lens',0,-.045,.30);
  for(const n of [-200,-100,100,200])caption(Math.abs(n)===200?'2F':'F',`focus${n}`,n*G.scale,.30,.25,true);
  function updateRays(){for(const m of [...rays.children]){m.geometry.dispose();m.material.dispose();rays.remove(m);}rays.visible=showRays&&!front;if(!showRays)return;for(const r of imagingRays(state,point)){const color=r.name==='top'?'#f4a17e':'#88c7ee';for(const [from,to]of [[r.from,r.lens],[r.lens,r.end]]){const A=new THREE.Vector3(...from),B=new THREE.Vector3(...to),tube=new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(A,B),1,.009,6,false),new THREE.MeshBasicMaterial({color,toneMapped:false}));tube.userData={name:r.name,from,to};rays.add(tube);const arrow=new THREE.Mesh(new THREE.ConeGeometry(.036,.13,10),new THREE.MeshBasicMaterial({color,toneMapped:false}));arrow.position.copy(A).lerp(B,.64);arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),B.clone().sub(A).normalize());rays.add(arrow);}if(r.virtual){const A=new THREE.Vector3(...r.lens),B=new THREE.Vector3(...r.virtual),line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([A,B]),new THREE.LineDashedMaterial({color,dashSize:.07,gapSize:.05,transparent:true,opacity:.85,depthTest:false,depthWrite:false}));line.computeLineDistances();line.renderOrder=10;line.userData={name:r.name,from:r.lens,to:r.virtual,virtual:true};rays.add(line);}}}
  function directionFor(azimuth,polar){return new THREE.Vector3(Math.sin(polar)*Math.sin(azimuth),Math.cos(polar),Math.sin(polar)*Math.cos(azimuth));}
  function fitToViewport(){
   camera.fov=39;camera.updateProjectionMatrix();let radius=9;
   const g=imagingState(state),virtual=frameMode==='virtual'&&g.type==='virtual',left=virtual?g.v*G.scale-.35*g.m:frameMode==='case'?Math.min(-2*G.f*G.scale,-state.object*G.scale)-.45:-G.objectMax*G.scale-.45,right=virtual?state.screen*G.scale+.45:frameMode==='case'?Math.max(2*G.f*G.scale,state.screen*G.scale)+.45:2*G.f*G.scale+.45,top=virtual?G.axis+g.m*.96+.25:4.1,bottom=virtual?Math.min(-.25,G.axis-g.m*1.02-.2):-.25;
   target.set((left+right)/2,(bottom+top)/2,0);radius=Math.max(radius,(right-left)/2,(top-bottom)/2);
   const bounds=[];for(const x of [left,right])for(const y of [bottom,top])for(const z of [-1.55,1.55])bounds.push(new THREE.Vector3(x,y,z));
   const directions=[directionFor(-.62,1.33)];
   for(let i=0;i<40;i++){const fits=directions.every(direction=>{camera.position.copy(target).addScaledVector(direction,radius);camera.lookAt(target);camera.updateMatrixWorld();return bounds.every(p=>{const q=p.clone().project(camera);return Math.abs(q.x)<.9&&Math.abs(q.y)<.8;});});if(fits)break;radius*=1.06;}
   fitRadius=radius;
  }
  function updateCamera(){
   if(front){const d=Math.min(1.1,state.screen*G.scale-.2);camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(Math.max(G.screenHeight+.65,(G.screenWidth+.6)/camera.aspect)/(2*d)));camera.position.set(state.screen*G.scale-d,G.axis,0);camera.lookAt(state.screen*G.scale,G.axis,0);}
   else{camera.fov=39;camera.position.copy(target).addScaledVector(directionFor(orbit.azimuth,orbit.polar),fitRadius*orbit.zoom);camera.lookAt(target);}
   camera.far=Math.max(120,fitRadius*6);camera.updateProjectionMatrix();
   if(viewport){const r=canvas.getBoundingClientRect(),p=camera.projectionMatrix.elements;p[0]*=viewport.width/r.width;p[5]*=viewport.height/r.height;p[8]=1-2*(viewport.left+viewport.width/2)/r.width;p[9]=2*(viewport.top+viewport.height/2)/r.height-1;camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();}
   camera.updateMatrixWorld();virtualImage.rotation.y=Math.atan2(camera.position.x-virtualImage.position.x,camera.position.z-virtualImage.position.z);virtualImage.updateMatrixWorld(true);
  }
  function updateImageLabels(){
   const labels=[$('[data-imaging-virtual-name]'),$('[data-imaging-virtual-position]'),$('[data-imaging-object-position]')],g=imagingState(state);for(const e of labels)e.hidden=g.type!=='virtual'||front;if(g.type!=='virtual'||front)return;
   const r=canvas.getBoundingClientRect(),v=viewport||{left:0,top:0,width:r.width,height:r.height};
   const project=(x,y,z=0)=>{const p=new THREE.Vector3(x,y,z).project(camera);return {x:(p.x+1)*r.width/2,y:(1-p.y)*r.height/2,z:p.z};};
   const place=(e,p,align='center')=>{const w=e.offsetWidth,h=e.offsetHeight;e.style.left=Math.max(v.left+2,Math.min(v.left+v.width-w-2,p.x-(align==='center'?w/2:-10)))+'px';e.style.top=Math.max(v.top,Math.min(r.height-h-6,p.y-h-5))+'px';};
   const top=project(g.v*G.scale,G.axis+g.m*.88+.15),position=project(g.v*G.scale,.22,1.05);labels[0].hidden=top.z< -1||top.z>1||top.x<v.left||top.x>v.left+v.width||top.y<v.top||top.y>r.height;place(labels[0],top);
   const outside=position.z< -1||position.z>1||position.x<v.left||position.x>v.left+v.width;labels[1].textContent=outside?`${position.x<v.left?'←':'→'} 虛像：圖卡側${distanceLabel(Math.abs(g.v))}`:`虛像位置：${distanceLabel(Math.abs(g.v))}`;place(labels[1],{...position,y:position.y+30});
   labels[2].textContent=`圖卡・${distanceLabel(state.object)}`;place(labels[2],project(source.position.x,.6,.9),'right');const a=labels[1].getBoundingClientRect(),b=labels[2].getBoundingClientRect();if(a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top)labels[2].style.top=Math.max(v.top,a.top-r.top-b.height-5)+'px';
  }
  function draw(){pending=0;renderer.render(scene,camera);updateImageLabels();}
  function requestDraw(){if(!pending)pending=requestAnimationFrame(draw);}
  function syncScene(){const g=imagingState(state);virtualImage.visible=g.type==='virtual'&&!front;if(g.type==='virtual'){virtualImage.position.set(g.v*G.scale,G.axis,0);virtualImage.scale.set(g.m,g.m,1);}source.visible=!state.atInfinity;sourceName.visible=!state.atInfinity&&g.type!=='virtual';source.position.x=-state.object*G.scale;sourceName.position.x=source.position.x;annotations.visible=!front;screen.position.x=state.screen*G.scale;projectedTexture.needsUpdate=true;updateRays();updateCamera();scene.updateMatrixWorld(true);requestDraw();}
  const devices={object:source,screen,lens:lensGroup},pointers=new Map(),raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let gesture=null;
  function ray(e){const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);raycaster.setFromCamera(pointer,camera);}
  function hit(e){if(front)return null;ray(e);const h=raycaster.intersectObjects(Object.values(devices).filter(group=>group.visible),true)[0];if(!h)return null;let group=h.object;while(group.parent!==scene&&group.parent)group=group.parent;return {...h,key:Object.keys(devices).find(key=>devices[key]===group)};}
  const pinch=()=>{const p=[...pointers.values()];return p.length<2?0:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);};
  canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);if(pointers.size>1){clearGestureNotice();gesture={kind:'pinch',distance:pinch(),zoom:orbit.zoom};return;}const h=hit(e);if(!h)clearGestureNotice();gesture={kind:h?'apparatus':'orbit',key:h?.key,startX:e.clientX,startY:e.clientY,azimuth:orbit.azimuth,polar:orbit.polar};});
  canvas.addEventListener('pointermove',e=>{
   if(!pointers.has(e.pointerId)){canvas.style.cursor=hit(e)?'help':'grab';return;}pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(!gesture)return;
   if(pointers.size>1){if(gesture.kind!=='pinch')return;front=false;orbit.zoom=clampZoom(gesture.zoom*gesture.distance/Math.max(pinch(),1));update();return;}
   if(gesture.kind==='pinch')return;
   if(gesture.kind==='apparatus'){if(Math.hypot(e.clientX-gesture.startX,e.clientY-gesture.startY)>=4)showGestureNotice(gesture.key);return;}
   front=false;orbit.azimuth=gesture.azimuth-(e.clientX-gesture.startX)*.005;orbit.polar=THREE.MathUtils.clamp(gesture.polar+(e.clientY-gesture.startY)*.004,.25,1.55);update();
  });
  function stop(e){pointers.delete(e.pointerId);gesture=null;canvas.style.cursor='grab';}
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,stop);
  canvas.addEventListener('wheel',e=>{e.preventDefault();clearGestureNotice();if(front)return;orbit.zoom=clampZoom(orbit.zoom+e.deltaY*.001);update();},{passive:false});
  canvas.addEventListener('keydown',e=>{const steps={ArrowLeft:[.06,0],ArrowRight:[-.06,0],ArrowUp:[0,-.05],ArrowDown:[0,.05]};if(!steps[e.key])return;e.preventDefault();clearGestureNotice();front=false;orbit.azimuth=orbit.azimuth+steps[e.key][0];orbit.polar=THREE.MathUtils.clamp(orbit.polar+steps[e.key][1],.25,1.55);update();});
  function resize(){const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(r.width,r.height,false);viewport=workspace.safeRect();camera.aspect=viewport.width/viewport.height;fitToViewport();updateCamera();requestDraw();}new ResizeObserver(resize).observe(canvas);resize();
  function frameCase(){frameMode=imagingState(state).type==='virtual'?'virtual':'case';fitToViewport();updateCamera();requestDraw();}
  return {update:syncScene,target,frameCase,scene,camera,renderer,source,lens,screen,screenPlane,rays,devices,virtualImage,virtualArt,virtualOutline};
 }
}
