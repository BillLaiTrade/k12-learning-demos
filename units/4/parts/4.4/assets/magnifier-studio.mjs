import {createMagnifierWorkspace} from './magnifier-workspace.mjs?v=20261103-mag-cross-f1';
import * as THREE from '../../4.1/assets/vendor/three/build/three.module.js';
import {MAGNIFIER as G,magnifierState,moveMagnifier,magnifierRays} from './magnifier-optics.mjs?v=20261103-mag-cross-f1';
const root=document.querySelector('[data-magnifier-lab]');
if(root) initialise(root);
function initialise(root){
 const $=s=>root.querySelector(s),$$=s=>[...root.querySelectorAll(s)],canvas=$('#magnifier-canvas');
 let state={object:30,screen:95,screenIn:false},showRays=true,extensions=false,point='both',front=false,selected='object',studio=null;
 const distanceLabel=value=>`${Number((value/G.f).toFixed(3))}F`;
 const workspace=createMagnifierWorkspace(root,{f:G.f,move,observe(preset){state={object:preset.object,screen:95,screenIn:preset.screenIn};if(preset.rays)showRays=true;extensions=preset.extensions;point='both';front=false;selected='object';update();studio?.frameObservation();}});
 const art=document.createElement('canvas');art.width=350;art.height=600;const a=art.getContext('2d');
 a.fillStyle='#dd684f';a.beginPath();a.moveTo(175,80);a.lineTo(133,170);a.lineTo(217,170);a.closePath();a.fill();a.strokeStyle='#688d65';a.lineWidth=13;a.lineCap='round';a.beginPath();a.moveTo(175,190);a.lineTo(175,442);a.stroke();a.fillStyle='#438dbb';a.beginPath();a.arc(175,500,35,0,Math.PI*2);a.fill();
 const eyeCanvas=$('[data-mag-eye]'),reference=$('[data-mag-reference]'),paper=$('[data-mag-paper]');
 eyeCanvas.getContext('2d',{willReadFrequently:true});reference.getContext('2d',{willReadFrequently:true});
 let observerKey='',paperKey='';
 const luminous=[],sourcePixels=a.getImageData(0,0,art.width,art.height).data;for(let y=5;y<art.height;y+=10)for(let x=5;x<art.width;x+=10){const i=(y*art.width+x)*4;if(sourcePixels[i+3]>200)luminous.push({y:(.5-y/art.height)*G.cardHeight,z:(x/art.width-.5)*G.cardWidth,color:sourcePixels.slice(i,i+3)});}
 function drawArt(ctx,width,height,factor){ctx.save();ctx.translate(width/2,height/2);ctx.scale(factor*G.cardWidth/art.width,factor*G.cardHeight/art.height);ctx.drawImage(art,-art.width/2,-art.height/2);ctx.restore();}
 function paintObserver(){
  const g=magnifierState(state),key=state.object+'|'+state.screenIn;if(key===observerKey)return g;observerKey=key;const W=eyeCanvas.width,H=eyeCanvas.height,c=eyeCanvas.getContext('2d'),pixels=W/(2*Math.tan(G.fov*Math.PI/360)),r=pixels*.88/(G.eye*G.scale);
  c.clearRect(0,0,W,H);c.save();c.beginPath();c.arc(W/2,H/2,r,0,Math.PI*2);c.clip();const bg=c.createRadialGradient(W*.45,H*.4,0,W/2,H/2,r);bg.addColorStop(0,'#fffef0');bg.addColorStop(1,'#e1e8d2');c.fillStyle=bg;c.fillRect(0,0,W,H);
  if(g.blocked){c.fillStyle='#657260';c.fillRect(0,0,W,H);c.strokeStyle='#aebaa4';c.lineWidth=10;c.strokeRect(W*.15,H*.12,W*.7,H*.76);c.fillStyle='#f5f5e5';c.font='24px system-ui';c.textAlign='center';c.fillText('屏幕背面',W/2,H*.48);c.font='20px system-ui';c.fillText('視線被擋住',W/2,H*.56);}
  else if(g.eyeMode==='converging'){
   // Deliberately unresolved light, not a fabricated upright virtual image.
   for(const [y,color]of [[H*.4,'221,104,79'],[H*.6,'67,141,187']]){const glow=c.createRadialGradient(W/2,y,0,W/2,y,W*.28);glow.addColorStop(0,`rgba(${color},.42)`);glow.addColorStop(1,`rgba(${color},0)`);c.fillStyle=glow;c.fillRect(0,0,W,H);}
  }else drawArt(c,W,H,pixels*g.imageScale);
  c.restore();c.beginPath();c.arc(W/2,H/2,r+4,0,Math.PI*2);c.lineWidth=13;c.strokeStyle='#2b3c30';c.stroke();c.beginPath();c.arc(W/2,H/2,r+1,0,Math.PI*2);c.lineWidth=3;c.strokeStyle='#adad7e';c.stroke();
  const rc=reference.getContext('2d');rc.clearRect(0,0,reference.width,reference.height);drawArt(rc,reference.width,reference.height,pixels*g.referenceScale);
  eyeCanvas.setAttribute('aria-label',g.blocked?'不透明屏幕擋住固定眼睛的視線':g.eyeMode==='converging'?'F外形成倒立實像；會聚光進入固定眼睛，此位置無法清楚對焦':g.eyeMode==='parallel'?'圖卡剛好在焦點，各物點出射平行光；眼睛放鬆可看見像在無窮遠的圖案':'固定眼睛位置透過凸透鏡看見正立放大的虛像，圖案隨物距同步變化');return g;
 }
 function paintPaper(){
  const key=state.object+'|'+state.screen;if(key===paperKey)return;paperKey=key;const g=magnifierState(state),c=paper.getContext('2d'),W=paper.width,H=paper.height;c.fillStyle='#f1f1e5';c.fillRect(0,0,W,H);
  // Each luminous source sample spreads into the disk bounded by the same pupil rays.
  // Soft disk edges and exposure aid observation; this is not a photometry simulation.
  const radius=g.spread*W/G.screenWidth;c.save();c.globalAlpha=.045;
  for(const p of luminous){const x=W/2+g.projectionScale*p.z*W/G.screenWidth,y=H/2-g.projectionScale*p.y*H/G.screenHeight,gradient=c.createRadialGradient(x,y,0,x,y,radius),rgb=p.color.join(',');gradient.addColorStop(0,`rgba(${rgb},1)`);gradient.addColorStop(.82,`rgba(${rgb},.85)`);gradient.addColorStop(1,`rgba(${rgb},0)`);c.fillStyle=gradient;c.beginPath();c.arc(x,y,radius,0,Math.PI*2);c.fill();}c.restore();
 }
 function update(){
  const g=paintObserver();if(state.screenIn)paintPaper();$('[data-mag-extensions]').disabled=g.type!=='virtual';
  $('[data-mag-paper-description]').textContent=g.type==='virtual'?'有光到達，但無法直接接到這個正立放大的虛像。':g.type==='infinity'?'各物點出射平行光，有限距離的屏幕接不到清楚像。':`實像在屏幕側${distanceLabel(g.v)}，目前屏幕${distanceLabel(state.screen)}未在清楚像位置。`;
  $('[data-mag-rays]').textContent=showRays?'隱藏輔助光路':'顯示輔助光路';$('[data-mag-rays]').setAttribute('aria-pressed',String(showRays));$('[data-mag-extensions]').textContent=extensions?'隱藏反向延長線':'顯示反向延長線';$('[data-mag-extensions]').setAttribute('aria-pressed',String(extensions));$('[data-mag-trace]').hidden=!showRays;
  $$('[data-mag-point]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.magPoint===point)));
  $('[data-mag-screen]').textContent=state.screenIn?'取下屏幕':'放入屏幕';$('[data-mag-screen]').setAttribute('aria-pressed',String(state.screenIn));$('[data-mag-front]').hidden=!state.screenIn||root.dataset.webgl==='unavailable';$('[data-mag-front]').textContent=front?'返回整體觀察':'正面看屏幕';$('[data-mag-front]').setAttribute('aria-pressed',String(front));
  $('[data-mag-screen-controls]').hidden=!state.screenIn;$('[data-mag-paper-detail]').hidden=!state.screenIn;$('[data-mag-legend]').hidden=!showRays;
  $$('[data-mag-distance]').forEach(e=>e.textContent=`${e.dataset.magDistance==='object'?'':'屏幕距離 '}${distanceLabel(state[e.dataset.magDistance])}`);
  $$('[data-mag-device]').forEach(b=>{if(b.type!=='range')b.setAttribute('aria-pressed',String(selected===b.dataset.magDevice));b.setAttribute('aria-label',`${b.dataset.magDevice==='object'?'圖卡':'屏幕'}，${distanceLabel(state[b.dataset.magDevice])}，方向鍵可沿軌道移動`);});
  $$('[data-mag-nudge]').forEach(b=>{const key=b.dataset.magNudge;b.disabled=Number(b.dataset.direction)<0?state[key]<=G[key+'Min']:state[key]>=G[key+'Max'];});
  $('[data-mag-eye-badge]').textContent=state.screenIn?'屏幕擋住視線':g.eyeMode==='converging'?'F外・此處看不清':g.eyeMode==='parallel'?'平行光・無窮遠':'正立・放大';
  const condition=g.type==='virtual'?'F內：正立、放大的虛像，可當放大鏡。':g.type==='infinity'?'剛好F：出射平行光，像在無窮遠，眼睛放鬆可觀察。':'F外：形成倒立實像；目前眼睛位於會聚點前，無法清楚對焦。';$('[data-mag-condition]').textContent=condition;$('[data-mag-eye-note]').textContent=state.screenIn?'取下屏幕後，恢復透鏡中的觀察。':'旋轉主圖不改變眼睛位置。';
  let message=state.screenIn?g.type==='virtual'?'屏幕上有光，但無法直接接到這個正立放大的虛像。不透明屏幕擋住眼睛的視線，取下後再比較。':'不透明屏幕擋住眼睛視線；目前屏幕未在清楚像位置。':g.type==='virtual'?'圖卡位於焦距內，透過凸透鏡看見正立、放大的虛像。':g.type==='infinity'?'圖卡剛好在焦點，各物點出射平行光；像在無窮遠，眼睛放鬆可觀察。':`圖卡在焦距外，形成倒立實像，像在屏幕側${distanceLabel(g.v)}。此固定眼睛位於會聚點之前，無法清楚對焦；可回到第三區用屏幕找實像。`;
  if(extensions&&g.type==='virtual')message+=` 虛線往回交於圖卡同側${distanceLabel(Math.abs(g.v))}，正立放大的透明圖案標示虛像；光沒有真的在那裡會聚。`;
  if(showRays&&point!=='both')message+=point==='top'?' 紅線來自圖卡上端。':' 藍線來自圖卡下端。';$('[data-result]').textContent=message;
  $('[data-mag-label=virtual]').textContent=g.type==='virtual'?`虛像・圖卡側${distanceLabel(Math.abs(g.v))}`:'';$('[data-mag-label=real]').textContent=g.type==='real'?`實像・屏幕側${distanceLabel(g.v)}`:'';
  root.dataset.object=state.object;root.dataset.screen=state.screen;root.dataset.screenIn=state.screenIn;root.dataset.rays=showRays;root.dataset.extensions=extensions;root.dataset.point=point;root.dataset.view=front?'screen':'orbit';root.dataset.imageType=g.type;root.dataset.eyeMode=g.eyeMode;root.dataset.imageScale=g.imageScale??'';root.dataset.referenceScale=g.referenceScale;root.dataset.angularGain=g.angularGain??'';root.dataset.virtualX=g.type==='virtual'?g.v*G.scale:'';
  canvas.setAttribute('aria-label',`立體放大鏡觀察台，物距${distanceLabel(state.object)}，固定透鏡及眼睛，${state.screenIn?'屏幕已插入光路':condition}，右側同步顯示眼睛視角`);workspace.update(state,showRays,extensions);studio?.update();
 }
 function move(key,value){state=moveMagnifier(state,key,value);if(state.object>=G.f)extensions=false;selected=key;update();}
 $('[data-mag-rays]').addEventListener('click',()=>{showRays=!showRays;if(!showRays)extensions=false;update();});$('[data-mag-extensions]').addEventListener('click',()=>{extensions=!extensions;if(extensions)showRays=true;update();studio?.frameObservation();});
 $('[data-mag-screen]').addEventListener('click',()=>{state={...state,screenIn:!state.screenIn};front=false;if(!state.screenIn)selected='object';update();});$('[data-mag-front]').addEventListener('click',()=>{front=!front;update();});
 $$('[data-mag-point]').forEach(b=>b.addEventListener('click',()=>{point=b.dataset.magPoint;update();}));
 $$('[data-mag-device]').forEach(b=>{const key=b.dataset.magDevice;b.addEventListener('click',()=>{selected=key;update();});b.addEventListener('keydown',e=>{let v=state[key];if(e.key==='Home')v=G[key+'Min'];else if(e.key==='End')v=G[key+'Max'];else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))v+=(['ArrowLeft','ArrowDown'].includes(e.key)?-1:1)*(e.shiftKey?.2:1);else return;e.preventDefault();move(key,v);});});
 $$('[data-mag-nudge]').forEach(b=>b.addEventListener('click',()=>move(b.dataset.magNudge,state[b.dataset.magNudge]+Number(b.dataset.direction))));
 try{studio=createStudio();root.dataset.webgl='ready';}catch(error){canvas.hidden=true;$('[data-mag-fallback]').hidden=false;$$('.magnifier-anchor,.magnifier-focus').forEach(e=>e.hidden=true);root.dataset.webgl='unavailable';console.warn('Magnifier 3D:',error.message);}
 update();root.dataset.ready='true';
 function createStudio(){
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const scene=new THREE.Scene();scene.background=new THREE.Color('#566b5b');scene.fog=new THREE.Fog('#566b5b',35,80);
  const camera=new THREE.PerspectiveCamera(39,1,.03,120),target=new THREE.Vector3( .7,1.6,0);let orbit={azimuth:-.62,polar:1.33,zoom:1},fitRadius=6,pending=0,viewport=null;
  scene.add(new THREE.HemisphereLight('#f2f3df','#3a503e',2.1));const light=new THREE.DirectionalLight('#fff0cf',3.1);light.position.set(-3,8,6);light.castShadow=true;light.shadow.mapSize.set(1024,1024);Object.assign(light.shadow.camera,{left:-8,right:10,top:7,bottom:-5});light.shadow.bias=-.0004;scene.add(light);const rim=new THREE.DirectionalLight('#d3e9e0',1.6);rim.position.set(5,4,-4);scene.add(rim);
  const mat=(color,options={})=>new THREE.MeshStandardMaterial({color,roughness:.5,metalness:.15,...options}),dark=mat('#283e30',{metalness:.5,roughness:.36}),steel=mat('#a2b4a4',{metalness:.7,roughness:.27}),brass=mat('#bba267',{metalness:.7,roughness:.3});
  function box(parent,size,pos,material){const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),material);mesh.position.set(...pos);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
  function cylinder(parent,radius,height,pos,material){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,height,24),material);mesh.position.set(...pos);mesh.castShadow=true;parent.add(mesh);return mesh;}
  const wc=document.createElement('canvas');wc.width=1024;wc.height=128;const w=wc.getContext('2d');w.fillStyle='#aa8050';w.fillRect(0,0,1024,128);let seed=72;for(let i=0;i<130;i++){seed=(1664525*seed+1013904223)>>>0;const y=seed/2**32*128;w.beginPath();w.moveTo(0,y);w.bezierCurveTo(250,y-4,650,y+4,1024,y);w.strokeStyle=i%3?'#51331135':'#ffe1a145';w.lineWidth=.7;w.stroke();}
  const texture=new THREE.CanvasTexture(wc);texture.colorSpace=THREE.SRGBColorSpace;box(scene,[8.7,.23,2],[-.15,.0,0],mat('#ddc192',{map:texture,roughness:.65}));box(scene,[8.7,.09,2],[-.15,-.15,0],mat('#725331'));
  for(const z of [-.70,.70]){box(scene,[8.4,.08,.11],[-.15,.17,z],steel);box(scene,[8.4,.025,.035],[-.15,.225,z],dark);}
  for(let i=-21;i<=20;i++){box(scene,[.015,.012,i%5===0?.14:.07],[i*.2,.242,.76],dark);}
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
  for(const n of [-100,100])box(scene,[.025,.10,.12],[n*G.scale,.3,.87],brass);
  const eye=new THREE.Group();eye.position.x=G.eye*G.scale;scene.add(eye);mount(eye,G.axis-.18);
  const eyeArt=document.createElement('canvas');eyeArt.width=256;eyeArt.height=128;const ec=eyeArt.getContext('2d');ec.fillStyle='#fbf5e4';ec.strokeStyle='#586f59';ec.lineWidth=5;ec.beginPath();ec.moveTo(16,64);ec.quadraticCurveTo(128,-18,240,64);ec.quadraticCurveTo(128,146,16,64);ec.fill();ec.stroke();ec.fillStyle='#78977d';ec.beginPath();ec.ellipse(85,64,25,37,0,0,Math.PI*2);ec.fill();ec.fillStyle='#213a2c';ec.beginPath();ec.ellipse(78,64,12,25,0,0,Math.PI*2);ec.fill();ec.fillStyle='#fff';ec.beginPath();ec.arc(71,52,6,0,Math.PI*2);ec.fill();
  const eyeTexture=new THREE.CanvasTexture(eyeArt);eyeTexture.colorSpace=THREE.SRGBColorSpace;const eyeMarker=new THREE.Mesh(new THREE.PlaneGeometry(.72,.36),new THREE.MeshBasicMaterial({map:eyeTexture,transparent:true,side:THREE.DoubleSide,toneMapped:false}));eyeMarker.position.set(0,G.axis,0);eye.add(eyeMarker);
  const virtualImage=new THREE.Group();virtualImage.name='magnifier-virtual-image';virtualImage.visible=false;scene.add(virtualImage);
  const virtualArt=new THREE.Mesh(new THREE.PlaneGeometry(G.cardWidth,G.cardHeight),new THREE.MeshBasicMaterial({map:artTex,transparent:true,opacity:.72,depthWrite:false,depthTest:false,side:THREE.DoubleSide,toneMapped:false}));virtualArt.renderOrder=8;virtualImage.add(virtualArt);
  const virtualOutline=new THREE.Line(new THREE.BufferGeometry().setFromPoints([[-G.cardWidth/2,-G.cardHeight/2,0],[-G.cardWidth/2,G.cardHeight/2,0],[G.cardWidth/2,G.cardHeight/2,0],[G.cardWidth/2,-G.cardHeight/2,0],[-G.cardWidth/2,-G.cardHeight/2,0]].map(p=>new THREE.Vector3(...p))),new THREE.LineDashedMaterial({color:'#eaf2d8',dashSize:.055,gapSize:.035,transparent:true,opacity:.85,depthWrite:false,depthTest:false,toneMapped:false}));virtualOutline.computeLineDistances();virtualOutline.renderOrder=9;virtualImage.add(virtualOutline);
  const rays=new THREE.Group(),extensionGroup=new THREE.Group();scene.add(rays,extensionGroup);const highlight=new THREE.BoxHelper(source,'#d8eaa0');highlight.visible=false;scene.add(highlight);
  function clear(group){for(const m of [...group.children]){m.geometry?.dispose();m.material?.dispose();group.remove(m);}}
  function updateRays(){clear(rays);clear(extensionGroup);rays.visible=showRays&&!front;extensionGroup.visible=extensions&&!front;
   if(!showRays)return;
   for(const r of magnifierRays(state,point)){const color=r.name==='top'?'#f4a17e':'#88c7ee';for(const [from,to]of [[r.from,r.lens],[r.lens,r.end]]){const A=new THREE.Vector3(...from),B=new THREE.Vector3(...to),tube=new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(A,B),1,.008,6,false),new THREE.MeshBasicMaterial({color,toneMapped:false}));tube.userData={name:r.name,from,to};rays.add(tube);const arrow=new THREE.Mesh(new THREE.ConeGeometry(.024,.09,10),new THREE.MeshBasicMaterial({color,toneMapped:false}));arrow.position.copy(A).lerp(B,.62);arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),B.clone().sub(A).normalize());rays.add(arrow);}
    if(extensions&&r.virtual){const A=new THREE.Vector3(...r.lens),B=new THREE.Vector3(...r.virtual);const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([A,B]),new THREE.LineDashedMaterial({color,dashSize:.055,gapSize:.04,transparent:true,opacity:.8}));line.computeLineDistances();line.userData={name:r.name,from:A.toArray(),to:B.toArray()};extensionGroup.add(line);}
   }
  }
  function fitToViewport(){
   // Fit on resize or an explicit observation/view change, never during a drag or orbit.
   camera.fov=39;let radius=6;const home=new THREE.Vector3(Math.sin(1.33)*Math.sin(-.62),Math.cos(1.33),Math.sin(1.33)*Math.cos(-.62));
   const g=magnifierState(state),virtual=extensions&&g.type==='virtual'&&Math.abs(g.v)<=8*G.f,left=virtual?Math.min(-4.5,g.v*G.scale-G.cardWidth*g.m/2-.2):-4.5,right=4.2,bottom=virtual?Math.min(-.25,G.axis-G.cardHeight*g.m/2-.2):-.25,top=virtual?Math.max(3.6,G.axis+G.cardHeight*g.m/2+.2):3.6;
   if(virtual)target.set((left+right)/2,(bottom+top)/2,0);else target.set(-.15,1.6,0);
   const boxes=[[[-4,-.6],[.3,2.7],[-.9,.9]],[[.9,2.8],[.3,state.screenIn?3.6:.4],[-1,1]],[[3.3,3.7],[.3,2.3],[-1,1]],[[-4.5,4.2],[-.25,.25],[-1,1]]];
   if(virtual)boxes.push([[g.v*G.scale-G.cardWidth*g.m/2,g.v*G.scale+G.cardWidth*g.m/2],[G.axis-G.cardHeight*g.m/2,G.axis+G.cardHeight*g.m/2],[-G.cardWidth*g.m/2,G.cardWidth*g.m/2]]);
   const bounds=[];for(const [xs,ys,zs]of boxes)for(const x of xs)for(const y of ys)for(const z of zs)bounds.push(new THREE.Vector3(x,y,z));
   for(let i=0;i<80;i++){camera.position.copy(target).addScaledVector(home,radius);camera.lookAt(target);camera.updateProjectionMatrix();camera.updateMatrixWorld();if(bounds.every(p=>{const q=p.clone().project(camera);return Math.abs(q.x)<.9&&Math.abs(q.y)<.86;}))break;radius*=1.06;}
   fitRadius=radius;
  }
  function updateCamera(){
   if(front){const d=1.1;camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(Math.max(G.screenHeight+.65,(G.screenWidth+.6)/camera.aspect)/(2*d)));camera.position.set(state.screen*G.scale-d,G.axis,0);camera.lookAt(state.screen*G.scale,G.axis,0);}
   else{camera.fov=39;const direction=new THREE.Vector3(Math.sin(orbit.polar)*Math.sin(orbit.azimuth),Math.cos(orbit.polar),Math.sin(orbit.polar)*Math.cos(orbit.azimuth));camera.position.copy(target).addScaledVector(direction,fitRadius*orbit.zoom);camera.lookAt(target);}
   camera.far=Math.max(120,fitRadius*6);camera.updateProjectionMatrix();
   if(viewport){const r=canvas.getBoundingClientRect(),p=camera.projectionMatrix.elements;p[0]*=viewport.width/r.width;p[5]*=viewport.height/r.height;p[8]=1-2*(viewport.left+viewport.width/2)/r.width;p[9]=2*(viewport.top+viewport.height/2)/r.height-1;camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();}
   camera.updateMatrixWorld();virtualImage.rotation.y=Math.atan2(camera.position.x-virtualImage.position.x,camera.position.z-virtualImage.position.z);virtualImage.updateMatrixWorld(true);
  }
  function imageBounds(rect,content=false){
   if(!virtualImage.visible)return null;
   const points=[];for(const x of content?[-.12*G.cardWidth,.12*G.cardWidth]:[-G.cardWidth/2,G.cardWidth/2])for(const y of content?[-.392*G.cardHeight,.367*G.cardHeight]:[-G.cardHeight/2,G.cardHeight/2])points.push(new THREE.Vector3(x,y,0).applyMatrix4(virtualImage.matrixWorld).project(camera));
   if(points.some(p=>p.z< -1||p.z>1))return null;
   return {left:Math.min(...points.map(p=>(p.x+1)*rect.width/2)),right:Math.max(...points.map(p=>(p.x+1)*rect.width/2)),top:Math.min(...points.map(p=>(1-p.y)*rect.height/2)),bottom:Math.max(...points.map(p=>(1-p.y)*rect.height/2))};
  }
  function labels(){const rect=canvas.getBoundingClientRect(),g=magnifierState(state),outline=imageBounds(rect),content=imageBounds(rect,true),positions={virtual:[(g.v??0)*G.scale,G.axis+(g.m??0)*G.cardHeight/2+.08,0],real:[(g.v??0)*G.scale,G.axis+Math.abs(g.m??0)*.44+.08,0]};
   for(const e of $$('.magnifier-anchor,.magnifier-focus')){
    const name=e.dataset.magLabel,imageTag=name==='virtual'||name==='real',p=e.hasAttribute('data-mag-focus')?[Number(e.dataset.magFocus)*G.scale,.38,.95]:positions[name],v=new THREE.Vector3(...p).project(camera),x=(v.x+1)*rect.width/2,y=(1-v.y)*rect.height/2;
    const outside=x<viewport.left||x>viewport.left+viewport.width||y<viewport.top||y>rect.height-10||v.z< -1||v.z>1;
    e.hidden=front||(name==='virtual'?(!extensions||g.type!=='virtual'):name==='real'?(!showRays||g.type!=='real'):outside);
    if(e.hidden)continue;
    if(imageTag){e.textContent=`${name==='virtual'?'虛像':'實像'}${outside?'在視野外':''}・${name==='virtual'?'圖卡':'屏幕'}側${distanceLabel(Math.abs(g.v))}`;e.style.maxWidth=(viewport.width-4)+'px';e.style.whiteSpace='normal';}
    e.style.left=Math.max(viewport.left+e.offsetWidth/2,Math.min(viewport.left+viewport.width-e.offsetWidth/2,x))+'px';e.style.top=Math.max(viewport.top,Math.min(rect.height-12,name==='virtual'&&outline&&!outside?outline.top-e.offsetHeight/2-8:y+15))+'px';
   }
   const placed=[],minTop=$('.magnifier-tools').offsetTop+$('.magnifier-tools').offsetHeight+8,maxBottom=rect.height-8;
   const overlaps=(a,b,gap=5)=>b&&a.left<b.right+gap&&a.right>b.left-gap&&a.top<b.bottom+gap&&a.bottom>b.top-gap;
   for(const e of $$('.magnifier-anchor,.magnifier-focus')){
    if(e.hidden)continue;
    const left=parseFloat(e.style.left),initial=parseFloat(e.style.top),h=e.offsetHeight,w=e.offsetWidth,virtual=e.dataset.magLabel==='virtual'&&outline,candidates=[{x:left,y:initial}];
    if(virtual)candidates.push({x:left,y:outline.top-h/2-8},{x:outline.right+w/2+8,y:outline.top+h/2},{x:outline.left-w/2-8,y:outline.top+h/2},{x:left,y:outline.bottom+h/2+8});
    for(let i=1;i<=12;i++)candidates.push({x:left,y:initial-i*(h+6)},{x:left,y:initial+i*(h+6)});
    for(let y=minTop+h/2;y<=maxBottom-h/2;y+=2)candidates.push({x:left,y});
    let chosen=null;
    // Prefer the outside of the complete frame; in tight views protect the actual arrow and dot.
    for(const obstacle of virtual?[outline,content]:[null]){
     chosen=candidates.map(p=>({left:p.x-w/2,right:p.x+w/2,top:p.y-h/2,bottom:p.y+h/2})).find(c=>c.left>=viewport.left&&c.right<=viewport.left+viewport.width&&c.top>=minTop&&c.bottom<=maxBottom&&!placed.some(p=>overlaps(c,p))&&!overlaps(c,obstacle,7));
     if(chosen)break;
    }
    if(chosen){e.style.left=(chosen.left+w/2)+'px';e.style.top=(chosen.top+h/2)+'px';placed.push(chosen);}
   }
  }
  function draw(){pending=0;renderer.render(scene,camera);labels();}
  function requestDraw(){labels();if(!pending)pending=requestAnimationFrame(draw);}
  function syncScene(){const g=magnifierState(state);virtualImage.visible=extensions&&g.type==='virtual'&&!front;if(g.type==='virtual'){virtualImage.position.set(g.v*G.scale,G.axis,0);virtualImage.scale.set(g.m,g.m,1);}source.position.x=-state.object*G.scale;screen.position.x=state.screen*G.scale;screen.visible=state.screenIn;projectedTexture.needsUpdate=true;updateRays();updateCamera();scene.updateMatrixWorld(true);highlight.update();requestDraw();}
  const devices={object:source,screen},pointers=new Map(),raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),planeDrag=new THREE.Plane(new THREE.Vector3(0,1,0),-G.axis),intersection=new THREE.Vector3();let gesture=null;
  function ray(e){const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);raycaster.setFromCamera(pointer,camera);}
  function hit(e){if(front)return null;ray(e);const available=state.screenIn?[source,screen]:[source],h=raycaster.intersectObjects(available,true)[0];if(!h)return null;let group=h.object;while(group.parent!==scene&&group.parent)group=group.parent;return {...h,key:group===source?'object':'screen'};}
  function ground(e){ray(e);return raycaster.ray.intersectPlane(planeDrag,intersection)?intersection.x:null;}
  const pinch=()=>{const p=[...pointers.values()];return p.length<2?0:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);};
  canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);if(pointers.size>1){gesture={kind:'pinch',distance:pinch(),zoom:orbit.zoom};return;}const h=hit(e);if(h){selected=h.key;planeDrag.constant=-h.point.y;highlight.setFromObject(devices[h.key]);highlight.visible=true;}gesture={kind:h?'device':'orbit',key:h?.key,startX:e.clientX,startY:e.clientY,value:h?state[h.key]:0,ground:h?ground(e):null,azimuth:orbit.azimuth,polar:orbit.polar};requestDraw();});
  canvas.addEventListener('pointermove',e=>{
   if(!pointers.has(e.pointerId)){canvas.style.cursor=hit(e)?'ew-resize':'grab';return;}pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(!gesture)return;
   if(pointers.size>1){if(gesture.kind!=='pinch')return;front=false;orbit.zoom=THREE.MathUtils.clamp(gesture.zoom*gesture.distance/Math.max(pinch(),1),.2,2.2);update();return;}
   if(gesture.kind==='pinch')return;
   if(gesture.kind==='device'){const x=ground(e);if(x!==null&&gesture.ground!==null)move(gesture.key,gesture.value+(x-gesture.ground)/G.scale*(gesture.key==='object'?-1:1));}
   else{front=false;orbit.azimuth=gesture.azimuth-(e.clientX-gesture.startX)*.005;orbit.polar=THREE.MathUtils.clamp(gesture.polar+(e.clientY-gesture.startY)*.004,.45,1.48);update();}
  });
  function stop(e){pointers.delete(e.pointerId);gesture=null;highlight.visible=false;canvas.style.cursor='grab';requestDraw();}
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,stop);
  canvas.addEventListener('wheel',e=>{e.preventDefault();if(front)return;orbit.zoom=THREE.MathUtils.clamp(orbit.zoom+e.deltaY*.001,.2,2.2);update();},{passive:false});
  canvas.addEventListener('keydown',e=>{const steps={ArrowLeft:[.06,0],ArrowRight:[-.06,0],ArrowUp:[0,-.05],ArrowDown:[0,.05]};if(!steps[e.key])return;e.preventDefault();front=false;orbit.azimuth=orbit.azimuth+steps[e.key][0];orbit.polar=THREE.MathUtils.clamp(orbit.polar+steps[e.key][1],.45,1.48);update();});
  function resize(){const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(r.width,r.height,false);const tools=$('.magnifier-tools'),observer=$('.magnifier-observer'),top=tools.offsetTop+tools.offsetHeight+8;viewport={left:12,top,width:Math.max(60,r.width-observer.offsetWidth-36),height:Math.max(60,r.height-top-10)};camera.aspect=viewport.width/viewport.height;fitToViewport();updateCamera();requestDraw();}new ResizeObserver(resize).observe(canvas);resize();
  function frameObservation(){orbit.zoom=1;resize();}
  return {update:syncScene,frameObservation,target,virtualImage,virtualArt,virtualOutline,scene,camera,renderer,source,lens,screen,screenPlane,rays,extensionGroup,devices,eye};
 }
}
