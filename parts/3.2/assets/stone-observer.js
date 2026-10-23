import * as THREE from '../../3.1/assets/vendor/three/build/three.module.js';

const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));

function noise3(x,y,z){
  const fade=t=>t*t*(3-2*t),hash=(a,b,c)=>{const n=Math.sin(a*127.1+b*311.7+c*74.7)*43758.5453;return n-Math.floor(n)};
  const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z),fx=fade(x-ix),fy=fade(y-iy),fz=fade(z-iz);
  const mix=(a,b,t)=>a+(b-a)*t;
  const z0=mix(mix(hash(ix,iy,iz),hash(ix+1,iy,iz),fx),mix(hash(ix,iy+1,iz),hash(ix+1,iy+1,iz),fx),fy);
  const z1=mix(mix(hash(ix,iy,iz+1),hash(ix+1,iy,iz+1),fx),mix(hash(ix,iy+1,iz+1),hash(ix+1,iy+1,iz+1),fx),fy);
  return mix(z0,z1,fz);
}

export function makeStone(){
  const geometry=new THREE.SphereGeometry(1,128,96);
  const position=geometry.attributes.position,colors=[];
  for(let i=0;i<position.count;i++){
    const v=new THREE.Vector3().fromBufferAttribute(position,i).normalize();
    const broad=Math.sin(v.x*4.3+v.y*2.6+v.z*3.1)*.05;
    const ripple=Math.sin(v.x*8.1-v.y*6.2+v.z*7.4)*.014;
    const granule=(noise3(v.x*72,v.y*72,v.z*72)-.5)*.012;
    const pitA=Math.exp(-((v.x-.4)**2+(v.y+.2)**2+(v.z-.87)**2)*34)*.035;
    const pitB=Math.exp(-((v.x+.65)**2+(v.y-.1)**2+(v.z+.7)**2)*42)*.026;
    const r=1+broad+ripple+granule-pitA-pitB;
    position.setXYZ(i,v.x*r*1.28,v.y*r*.79,v.z*r*.82);
    const cloud=noise3(v.x*5,v.y*5,v.z*5),mottle=noise3(v.x*17,v.y*17,v.z*17);
    const flecks=noise3(v.x*43,v.y*43,v.z*43),grain=noise3(v.x*91,v.y*91,v.z*91);
    const shade=clamp(.29+(cloud-.5)*.32+(mottle-.5)*.25+(flecks-.5)*.18+(grain-.5)*.1,.12,.55);
    colors.push(shade*1.015,shade,shade*.96);
  }
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.computeVertexNormals();
  const material=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.94,metalness:0});
  return new THREE.Mesh(geometry,material);
}

const CM_PER_WORLD=1.6;
const RULER_CM=6;
const WORLD_PER_CM=1/CM_PER_WORLD;
const MEASURE_COLORS={length:0x00796b,width:0x5269a6,height:0xbf6338};

function makeRuler({position=[0,0,0],rotationY=0,rotationZ=0,accent=MEASURE_COLORS.length,showGuides=true}={}){
  const width=RULER_CM*WORLD_PER_CM,depth=.56,top=0;
  const group=new THREE.Group();
  group.position.set(...position);group.rotation.set(0,rotationY,rotationZ);
  const board=new THREE.Mesh(new THREE.BoxGeometry(width+.2,.07,depth),new THREE.MeshStandardMaterial({color:0xd8bd78,roughness:.82}));
  board.position.y=top-.035;group.add(board);
  const face=document.createElement('canvas');face.width=1280;face.height=180;
  const ctx=face.getContext('2d');ctx.fillStyle='#e5ce91';ctx.fillRect(0,0,face.width,face.height);
  ctx.strokeStyle='#354b42';ctx.lineWidth=2;ctx.strokeRect(1,1,face.width-2,face.height-2);
  for(let tenth=0;tenth<=RULER_CM*10;tenth++){
    const x=8+(face.width-16)*tenth/(RULER_CM*10),major=tenth%10===0,half=tenth%5===0;
    ctx.lineWidth=major?4:2.5;ctx.beginPath();ctx.moveTo(x,6);ctx.lineTo(x,major?105:half?78:54);ctx.stroke();
    if(major){ctx.fillStyle='#263b34';ctx.font='bold 34px sans-serif';ctx.textAlign='center';ctx.fillText(String(tenth/10),x,145)}
  }
  ctx.fillStyle='#263b34';ctx.font='20px sans-serif';ctx.textAlign='right';ctx.fillText('cm',face.width-12,169);
  const texture=new THREE.CanvasTexture(face);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
  const topFace=new THREE.Mesh(new THREE.PlaneGeometry(width+.2,depth),new THREE.MeshBasicMaterial({map:texture}));
  topFace.rotation.x=-Math.PI/2;topFace.position.y=top+.001;group.add(topFace);
  const guideMaterial=showGuides?new THREE.LineDashedMaterial({color:accent,dashSize:.055,gapSize:.04,depthTest:false}):null;
  const guides=showGuides?[0,1].map(()=>{const line=new THREE.Line(new THREE.BufferGeometry(),guideMaterial);line.renderOrder=5;group.add(line);return line}):[];
  const markerMaterial=showGuides?new THREE.MeshBasicMaterial({color:accent,depthTest:false}):null;
  const markers=showGuides?[0,1].map(()=>{const marker=new THREE.Mesh(new THREE.SphereGeometry(.035,12,8),markerMaterial);marker.renderOrder=6;group.add(marker);return marker}):[];
  return {group,guides,markers,top,width,depth,faceWidth:width+.2,faceWidthPixels:face.width,faceHeightPixels:face.height};
}

function makeRulerFrame(parent,edge,floor){
  const points=[],steps=12,step=edge*2/steps,wallTop=floor+edge*2;
  for(let i=0;i<=steps;i++){
    const v=-edge+i*step;
    // 三個開放式格線面：底面、後面與右側面，讓尺框形成可辨識的長方體角。
    points.push(new THREE.Vector3(-edge,floor+.015,v),new THREE.Vector3(edge,floor+.015,v));
    points.push(new THREE.Vector3(v,floor+.015,-edge),new THREE.Vector3(v,floor+.015,edge));
    const y=floor+i*step;
    points.push(new THREE.Vector3(edge,floor,v),new THREE.Vector3(edge,wallTop,v));
    points.push(new THREE.Vector3(edge,y,-edge),new THREE.Vector3(edge,y,edge));
    points.push(new THREE.Vector3(v,floor,-edge+.015),new THREE.Vector3(v,wallTop,-edge+.015));
    points.push(new THREE.Vector3(-edge,y,-edge+.015),new THREE.Vector3(edge,y,-edge+.015));
  }
  const geometry=new THREE.BufferGeometry().setFromPoints(points);
  const material=new THREE.LineBasicMaterial({color:0x8da89a,transparent:true,opacity:.34,depthWrite:false});
  const grid=new THREE.LineSegments(geometry,material);grid.renderOrder=2;parent.add(grid);
}

export function mountStoneObserver(){
  const host=document.querySelector('#stone-observer'),canvas=document.querySelector('#stone-canvas');
  if(!host||!canvas)return;
  const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.16;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(36,1,.1,60);
  camera.position.set(0,2.1,8.8);camera.lookAt(0,.55,0);
  scene.add(new THREE.HemisphereLight(0xf5f7f1,0x5e6259,2.1));
  const key=new THREE.DirectionalLight(0xfff4df,3.1);key.position.set(-3,4,4);scene.add(key);
  const fill=new THREE.DirectionalLight(0xd9e6ef,1.45);fill.position.set(3,1,-3);scene.add(fill);
  const rim=new THREE.DirectionalLight(0xffffff,1.1);rim.position.set(1,4,-4);scene.add(rim);
  // 三把尺與三面格線組成同一個可旋轉的開口量測框。
  const rulerFloor=-1.05,rulerEdge=RULER_CM*WORLD_PER_CM/2,rulerHeight=RULER_CM*WORLD_PER_CM;
  const frameCenterY=-.14; // 將固定尺框與隕石的旋轉中心對齊。
  const framePivot=new THREE.Group();framePivot.position.y=frameCenterY;scene.add(framePivot);
  const frameAssembly=new THREE.Group();frameAssembly.position.y=-frameCenterY;framePivot.add(frameAssembly);
  const lengthRuler=makeRuler({position:[0,rulerFloor,-rulerEdge],accent:MEASURE_COLORS.length});frameAssembly.add(lengthRuler.group);
  const widthRuler=makeRuler({position:[rulerEdge,rulerFloor,0],rotationY:Math.PI/2,accent:MEASURE_COLORS.width});frameAssembly.add(widthRuler.group);
  const heightRuler=makeRuler({position:[rulerEdge,rulerFloor+rulerHeight/2,-rulerEdge],rotationZ:Math.PI/2,accent:MEASURE_COLORS.height,showGuides:false});frameAssembly.add(heightRuler.group);
  makeRulerFrame(frameAssembly,rulerEdge,rulerFloor);
  const pivot=new THREE.Group();pivot.position.y=frameCenterY;scene.add(pivot);
  const stone=makeStone();pivot.add(stone);
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=128;shadowCanvas.height=128;
  const shadowCtx=shadowCanvas.getContext('2d'),gradient=shadowCtx.createRadialGradient(64,64,5,64,64,62);
  gradient.addColorStop(0,'rgba(32,38,33,.3)');gradient.addColorStop(1,'rgba(32,38,33,0)');shadowCtx.fillStyle=gradient;shadowCtx.fillRect(0,0,128,128);
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(2.6,1.55),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}));
  shadow.rotation.x=-Math.PI/2;shadow.position.set(0,rulerFloor+.003,0);scene.add(shadow);

  let width=0,height=0,dragId=null,lastX=0,lastY=0,dragTarget=null,velocityYaw=0,velocityPitch=0,distance=8.8,raf=0,measureDirty=true,pinchDistance=0;
  const activePointers=new Map(),lengthReadout=document.querySelector('#stone-length'),widthReadout=document.querySelector('#stone-width'),heightReadout=document.querySelector('#stone-height');
  const svgNS='http://www.w3.org/2000/svg',heightOverlay=document.createElementNS(svgNS,'svg'),heightGuides=[0,1].map(()=>{
    const line=document.createElementNS(svgNS,'line');
    line.setAttribute('stroke','#bf6338');line.setAttribute('stroke-width','1');line.setAttribute('stroke-dasharray','4 3');
    heightOverlay.append(line);return line;
  });
  const heightMarkers=[0,1].map(()=>{
    const marker=document.createElementNS(svgNS,'circle');
    marker.setAttribute('r','2');marker.setAttribute('fill','#bf6338');
    heightOverlay.append(marker);return marker;
  });
  heightOverlay.setAttribute('aria-hidden','true');heightOverlay.setAttribute('focusable','false');
  Object.assign(heightOverlay.style,{position:'absolute',inset:'0',width:'100%',height:'100%',overflow:'hidden',pointerEvents:'none',zIndex:'2'});
  host.append(heightOverlay);
  const loading=document.querySelector('#observer-loading');
  const raycaster=new THREE.Raycaster(),pointerNdc=new THREE.Vector2();raycaster.params.Line.threshold=.09;
  function resize(){width=host.clientWidth;height=host.clientHeight;if(!width||!height)return;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();measureDirty=true}
  const observer=new ResizeObserver(resize);observer.observe(host);resize();
  const zoom=delta=>{distance=clamp(distance+delta,7.2,11.5);camera.position.z=distance;camera.updateProjectionMatrix();measureDirty=true};
  function pickStone(event){
    const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return null;
    pointerNdc.set(((event.clientX-rect.left)/rect.width)*2-1,-((event.clientY-rect.top)/rect.height)*2+1);
    raycaster.setFromCamera(pointerNdc,camera);
    return raycaster.intersectObject(stone,true).length>0;
  }
  function rotateStone(yaw,pitch){
    if(!yaw&&!pitch)return;
    const yawRotation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),yaw);
    const pitchRotation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),pitch);
    pivot.quaternion.premultiply(yawRotation).premultiply(pitchRotation).normalize();
    measureDirty=true;
  }
  function refreshMeasurement(){
    pivot.updateMatrixWorld(true);framePivot.updateMatrixWorld(true);camera.updateMatrixWorld(true);
    const worldToFrame=framePivot.matrixWorld.clone().invert();
    const position=stone.geometry.attributes.position;
    let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity,minZ=Infinity,maxZ=-Infinity;
    let projectedMinX=Infinity,projectedMaxX=-Infinity;
    for(let i=0;i<position.count;i++){
      const worldPoint=new THREE.Vector3().fromBufferAttribute(position,i).applyMatrix4(stone.matrixWorld);
      const point=worldPoint.clone().applyMatrix4(worldToFrame);
      minX=Math.min(minX,point.x);maxX=Math.max(maxX,point.x);
      minY=Math.min(minY,point.y);maxY=Math.max(maxY,point.y);
      minZ=Math.min(minZ,point.z);maxZ=Math.max(maxZ,point.z);
      const screenPoint=worldPoint.project(camera);
      projectedMinX=Math.min(projectedMinX,screenPoint.x);
      projectedMaxX=Math.max(projectedMaxX,screenPoint.x);
    }
    if(lengthReadout)lengthReadout.textContent=`約 ${((maxX-minX)*CM_PER_WORLD).toFixed(1)} cm`;
    if(widthReadout)widthReadout.textContent=`約 ${((maxZ-minZ)*CM_PER_WORLD).toFixed(1)} cm`;
    if(heightReadout)heightReadout.textContent=`約 ${((maxY-minY)*CM_PER_WORLD).toFixed(1)} cm`;
    const lengthGuidePoints=[minX,maxX].map(x=>framePivot.localToWorld(new THREE.Vector3(x,rulerFloor+.012-frameCenterY,-rulerEdge)));
    // The length ruler sits behind the stone, so perspective projects its true end
    // marks inside the visible silhouette. Move the marks horizontally in screen
    // space to just outside the stone while preserving their screen height and depth.
    lengthGuidePoints.forEach((point,index)=>{
      const edgeNdc=index===0?Math.max(-.9,projectedMinX-.012):Math.min(.9,projectedMaxX+.012);
      const screenPoint=point.project(camera);
      screenPoint.x=edgeNdc;
      point.copy(screenPoint.unproject(camera));
    });
    updateRulerGuides(lengthRuler,lengthGuidePoints,new THREE.Vector3(0,1,0));
    updateRulerGuides(widthRuler,[minZ,maxZ].map(z=>framePivot.localToWorld(new THREE.Vector3(rulerEdge,rulerFloor+.012-frameCenterY,z))),new THREE.Vector3(0,1,0));
    updateHeightOverlay([minY,maxY]);
    measureDirty=false;
  }
  function updateHeightOverlay(yValues){
    heightOverlay.setAttribute('viewBox',`0 0 ${width} ${height}`);
    // 標記落在垂直尺面上對應的實際刻線端點；數值取到 0.1 cm，與讀值一致。
    yValues.forEach((y,index)=>{
      const worldY=y+frameCenterY;
      const centimeters=clamp(Math.round((worldY-rulerFloor)/WORLD_PER_CM*10)/10,0,RULER_CM);
      const tickIndex=Math.round(centimeters*10);
      const tickLength=tickIndex%10===0?105:tickIndex%5===0?78:54;
      const tickX=8+(heightRuler.faceWidthPixels-16)*centimeters/RULER_CM;
      const rulerLocalX=(tickX/heightRuler.faceWidthPixels-.5)*heightRuler.faceWidth;
      // CanvasTexture 的上緣對應尺面的 -Z 側；把端點放在這個刻線的內側末端。
      const rulerLocalZ=-heightRuler.depth/2+tickLength/heightRuler.faceHeightPixels*heightRuler.depth;
      const projected=heightRuler.group.localToWorld(new THREE.Vector3(rulerLocalX,.004,rulerLocalZ)).project(camera);
      const anchorX=(projected.x*.5+.5)*width;
      const screenY=(-projected.y*.5+.5)*height;
      const line=heightGuides[index];
      line.setAttribute('x1',String(anchorX-22));line.setAttribute('x2',String(anchorX));
      line.setAttribute('y1',String(screenY));line.setAttribute('y2',String(screenY));
      heightMarkers[index].setAttribute('cx',String(anchorX));heightMarkers[index].setAttribute('cy',String(screenY));
    });
  }
  function updateRulerGuides(ruler,worldPoints,guideDirection){
    ruler.group.updateMatrixWorld(true);
    worldPoints.forEach((worldPoint,index)=>{
      const localPoint=ruler.group.worldToLocal(worldPoint.clone());
      const directionLocal=ruler.group.worldToLocal(worldPoint.clone().add(guideDirection)).sub(localPoint);
      const lineStart=localPoint.clone().add(new THREE.Vector3(0,.012,0));
      const line=ruler.guides[index];line.geometry.dispose();line.geometry=new THREE.BufferGeometry().setFromPoints([
        lineStart,
        lineStart.clone().addScaledVector(directionLocal,.42)
      ]);line.computeLineDistances();
      ruler.markers[index].position.copy(lineStart);
    });
  }
  host.addEventListener('wheel',event=>{event.preventDefault();zoom(event.deltaY>0?.22:-.22)},{passive:false});
  host.addEventListener('pointerdown',event=>{
    if(event.button!==undefined&&event.button!==0)return;
    activePointers.set(event.pointerId,{x:event.clientX,y:event.clientY});host.setPointerCapture(event.pointerId);
    if(activePointers.size===1){dragId=event.pointerId;dragTarget=pickStone(event)?'stone':null;lastX=event.clientX;lastY=event.clientY;velocityYaw=0;velocityPitch=0}
    else if(activePointers.size===2){dragId=null;dragTarget=null;const points=[...activePointers.values()];pinchDistance=Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y)}
  });
  host.addEventListener('pointermove',event=>{
    if(!activePointers.has(event.pointerId))return;
    const previous=activePointers.get(event.pointerId);activePointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(activePointers.size>=2){const points=[...activePointers.values()],next=Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y);if(pinchDistance)zoom((pinchDistance-next)*.006);pinchDistance=next;return}
    if(dragId!==event.pointerId||!dragTarget)return;
    const dx=event.clientX-lastX,dy=event.clientY-lastY;lastX=event.clientX;lastY=event.clientY;
    velocityYaw=dx*.0054;velocityPitch=dy*.0054;rotateStone(velocityYaw,velocityPitch);
  });
  const endPointer=event=>{activePointers.delete(event.pointerId);if(dragId===event.pointerId)dragId=null;if(activePointers.size===1){const [id,point]=activePointers.entries().next().value;dragId=id;dragTarget=null;lastX=point.x;lastY=point.y}if(activePointers.size<2)pinchDistance=0};
  host.addEventListener('pointerup',endPointer);host.addEventListener('pointercancel',endPointer);host.addEventListener('lostpointercapture',endPointer);
  host.addEventListener('keydown',event=>{const step=.07;let used=true;switch(event.key){case'ArrowLeft':rotateStone(-step,0);break;case'ArrowRight':rotateStone(step,0);break;case'ArrowUp':rotateStone(0,-step);break;case'ArrowDown':rotateStone(0,step);break;case'Home':pivot.quaternion.identity();dragTarget=null;velocityYaw=0;velocityPitch=0;distance=8.8;camera.position.z=distance;camera.updateProjectionMatrix();measureDirty=true;break;default:used=false}if(used)event.preventDefault()});
  if(loading)loading.hidden=true;
  function render(){raf=requestAnimationFrame(render);if(!dragId&&(Math.abs(velocityYaw)>.00025||Math.abs(velocityPitch)>.00025)){rotateStone(velocityYaw,velocityPitch);velocityYaw*=.91;velocityPitch*=.91}else if(Math.abs(velocityYaw)<=.00025&&Math.abs(velocityPitch)<=.00025){velocityYaw=0;velocityPitch=0}if(measureDirty)refreshMeasurement();renderer.render(scene,camera)}
  render();
  return()=>{cancelAnimationFrame(raf);observer.disconnect();renderer.dispose();scene.traverse(node=>{if(node.isMesh||node.isLine){node.geometry?.dispose();if(Array.isArray(node.material))node.material.forEach(material=>material.dispose());else node.material?.dispose()}})};
}
