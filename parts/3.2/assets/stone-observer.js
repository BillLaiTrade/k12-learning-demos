import * as THREE from '../../3.1/assets/vendor/three/build/three.module.js';

const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));

function makeSurface(){
  const width=1024,height=512,canvas=document.createElement('canvas');
  canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d'),image=ctx.createImageData(width,height),data=image.data;
  let seed=7319;
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
  const grids=[[10,5],[28,14],[92,46],[330,165]].map(([cols,rows])=>({cols,rows,data:Array.from({length:cols*rows},random)}));
  const noise=(grid,u,v)=>{const x=u*grid.cols,y=v*grid.rows,x0=Math.floor(x)%grid.cols,y0=Math.floor(y)%grid.rows,fx=x-Math.floor(x),fy=y-Math.floor(y),fade=t=>t*t*(3-2*t),at=(a,b)=>grid.data[(b%grid.rows)*grid.cols+(a%grid.cols)],a=at(x0,y0)*(1-fade(fx))+at(x0+1,y0)*fade(fx),b=at(x0,y0+1)*(1-fade(fx))+at(x0+1,y0+1)*fade(fx);return a*(1-fade(fy))+b*fade(fy)-.5};
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const u=x/width,v=y/height;
    const cloud=noise(grids[0],u,v),mottle=noise(grids[1],u,v),speckle=noise(grids[2],u,v),grain=noise(grids[3],u,v)+(random()-.5)*.1;
    const shade=clamp(.69+cloud*.38+mottle*.22+speckle*.1+grain*.15,.35,.96);
    const i=(y*width+x)*4;
    data[i]=Math.round(158*shade+cloud*5);
    data[i+1]=Math.round(157*shade+mottle*4);
    data[i+2]=Math.round(150*shade-cloud*4);
    data[i+3]=255;
  }
  ctx.putImageData(image,0,0);
  for(let i=0;i<2100;i++){
    const x=random()*width,y=random()*height,r=.25+random()*1.4;
    ctx.fillStyle=random()>.5?'rgba(230,224,205,.28)':'rgba(44,49,45,.22)';
    ctx.beginPath();ctx.ellipse(x,y,r,r*(.4+random()),random()*Math.PI,0,Math.PI*2);ctx.fill();
  }
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=THREE.RepeatWrapping;texture.anisotropy=4;
  return texture;
}

function makeStone(){
  const geometry=new THREE.SphereGeometry(1,128,96);
  const position=geometry.attributes.position;
  for(let i=0;i<position.count;i++){
    const v=new THREE.Vector3().fromBufferAttribute(position,i).normalize();
    const broad=Math.sin(v.x*4.3+v.y*2.6+v.z*3.1)*.05;
    const ripple=Math.sin(v.x*8.1-v.y*6.2+v.z*7.4)*.014;
    const pitA=Math.exp(-((v.x-.4)**2+(v.y+.2)**2+(v.z-.87)**2)*34)*.035;
    const pitB=Math.exp(-((v.x+.65)**2+(v.y-.1)**2+(v.z+.7)**2)*42)*.026;
    const r=1+broad+ripple-pitA-pitB;
    position.setXYZ(i,v.x*r*1.28,v.y*r*.79,v.z*r*.82);
  }
  geometry.computeVertexNormals();
  const surface=makeSurface();
  const material=new THREE.MeshStandardMaterial({map:surface,roughness:.96,metalness:0,bumpMap:surface,bumpScale:.055});
  return new THREE.Mesh(geometry,material);
}

const CM_PER_WORLD=1.6;
const RULER_CM=6;
const WORLD_PER_CM=1/CM_PER_WORLD;

function makeRuler({position=[0,0,0],rotationY=0,rotationZ=0}={}){
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
  const guideMaterial=new THREE.LineDashedMaterial({color:0xb85e3b,dashSize:.055,gapSize:.04,depthTest:false});
  const guides=[0,1].map(()=>{const line=new THREE.Line(new THREE.BufferGeometry(),guideMaterial);line.renderOrder=5;group.add(line);return line});
  const markerMaterial=new THREE.MeshBasicMaterial({color:0xb85e3b,depthTest:false});
  const markers=[0,1].map(()=>{const marker=new THREE.Mesh(new THREE.SphereGeometry(.035,12,8),markerMaterial);marker.renderOrder=6;group.add(marker);return marker});
  return {group,guides,markers,top,width};
}

function makeRulerFrame(scene,edge,floor){
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
  const grid=new THREE.LineSegments(geometry,material);grid.renderOrder=2;scene.add(grid);
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
  // 三把尺固定在開口長方體角框的三個互相垂直方向。
  const rulerFloor=-1.05,rulerEdge=RULER_CM*WORLD_PER_CM/2,rulerHeight=RULER_CM*WORLD_PER_CM;
  const lengthRuler=makeRuler({position:[0,rulerFloor,-rulerEdge]});scene.add(lengthRuler.group);
  const widthRuler=makeRuler({position:[rulerEdge,rulerFloor,0],rotationY:Math.PI/2});scene.add(widthRuler.group);
  const heightRuler=makeRuler({position:[rulerEdge,rulerFloor+rulerHeight/2,-rulerEdge],rotationZ:Math.PI/2});scene.add(heightRuler.group);
  makeRulerFrame(scene,rulerEdge,rulerFloor);
  const pivot=new THREE.Group();pivot.position.y=-.14;scene.add(pivot);
  const stone=makeStone();pivot.add(stone);
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=128;shadowCanvas.height=128;
  const shadowCtx=shadowCanvas.getContext('2d'),gradient=shadowCtx.createRadialGradient(64,64,5,64,64,62);
  gradient.addColorStop(0,'rgba(32,38,33,.3)');gradient.addColorStop(1,'rgba(32,38,33,0)');shadowCtx.fillStyle=gradient;shadowCtx.fillRect(0,0,128,128);
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(2.6,1.55),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}));
  shadow.rotation.x=-Math.PI/2;shadow.position.set(0,rulerFloor+.003,0);scene.add(shadow);

  let width=0,height=0,dragId=null,lastX=0,lastY=0,velocityYaw=0,velocityPitch=0,distance=8.8,raf=0,measureDirty=true,pinchDistance=0;
  const activePointers=new Map(),lengthReadout=document.querySelector('#stone-length'),widthReadout=document.querySelector('#stone-width'),heightReadout=document.querySelector('#stone-height');
  const loading=document.querySelector('#observer-loading');
  function resize(){width=host.clientWidth;height=host.clientHeight;if(!width||!height)return;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix()}
  const observer=new ResizeObserver(resize);observer.observe(host);resize();
  const zoom=delta=>{distance=clamp(distance+delta,7.2,11.5);camera.position.z=distance;camera.updateProjectionMatrix()};
  const tilt=delta=>{pivot.rotation.z=clamp(pivot.rotation.z+delta,-.72,.72);if((pivot.rotation.z===.72&&velocityPitch>0)||(pivot.rotation.z===-.72&&velocityPitch<0))velocityPitch=0;measureDirty=true};
  function refreshMeasurement(){
    pivot.updateMatrixWorld(true);
    const position=stone.geometry.attributes.position;
    let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity,minZ=Infinity,maxZ=-Infinity;
    for(let i=0;i<position.count;i++){
      const point=new THREE.Vector3().fromBufferAttribute(position,i).applyMatrix4(pivot.matrixWorld);
      minX=Math.min(minX,point.x);maxX=Math.max(maxX,point.x);
      minY=Math.min(minY,point.y);maxY=Math.max(maxY,point.y);
      minZ=Math.min(minZ,point.z);maxZ=Math.max(maxZ,point.z);
    }
    if(lengthReadout)lengthReadout.textContent=`約 ${((maxX-minX)*CM_PER_WORLD).toFixed(1)} cm`;
    if(widthReadout)widthReadout.textContent=`約 ${((maxZ-minZ)*CM_PER_WORLD).toFixed(1)} cm`;
    if(heightReadout)heightReadout.textContent=`約 ${((maxY-minY)*CM_PER_WORLD).toFixed(1)} cm`;
    updateRulerGuides(lengthRuler,[minX,maxX].map(x=>new THREE.Vector3(x,rulerFloor+.012,-rulerEdge)));
    updateRulerGuides(widthRuler,[minZ,maxZ].map(z=>new THREE.Vector3(rulerEdge,rulerFloor+.012,z)));
    updateRulerGuides(heightRuler,[minY,maxY].map(y=>new THREE.Vector3(rulerEdge,y,-rulerEdge)));
    measureDirty=false;
  }
  function updateRulerGuides(ruler,points){
    ruler.group.updateMatrixWorld(true);
    points.forEach((worldPoint,index)=>{
      const localPoint=ruler.group.worldToLocal(worldPoint.clone());
      const line=ruler.guides[index];line.geometry.dispose();line.geometry=new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(localPoint.x,localPoint.y,localPoint.z),
        new THREE.Vector3(localPoint.x,localPoint.y+.21,localPoint.z)
      ]);line.computeLineDistances();
      ruler.markers[index].position.set(localPoint.x,localPoint.y+.012,localPoint.z);
    });
  }
  host.addEventListener('wheel',event=>{event.preventDefault();zoom(event.deltaY>0?.22:-.22)},{passive:false});
  host.addEventListener('pointerdown',event=>{
    if(event.button!==undefined&&event.button!==0)return;
    activePointers.set(event.pointerId,{x:event.clientX,y:event.clientY});host.setPointerCapture(event.pointerId);
    if(activePointers.size===1){dragId=event.pointerId;lastX=event.clientX;lastY=event.clientY;velocityYaw=0;velocityPitch=0}
    else if(activePointers.size===2){dragId=null;const points=[...activePointers.values()];pinchDistance=Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y)}
  });
  host.addEventListener('pointermove',event=>{
    if(!activePointers.has(event.pointerId))return;
    const previous=activePointers.get(event.pointerId);activePointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(activePointers.size>=2){const points=[...activePointers.values()],next=Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y);if(pinchDistance)zoom((pinchDistance-next)*.006);pinchDistance=next;return}
    if(dragId!==event.pointerId)return;
    const dx=event.clientX-lastX,dy=event.clientY-lastY;lastX=event.clientX;lastY=event.clientY;
    velocityYaw=dx*.0054;velocityPitch=dy*.0054;pivot.rotation.y+=velocityYaw;tilt(velocityPitch);
  });
  const endPointer=event=>{activePointers.delete(event.pointerId);if(dragId===event.pointerId)dragId=null;if(activePointers.size===1){const [id,point]=activePointers.entries().next().value;dragId=id;lastX=point.x;lastY=point.y}if(activePointers.size<2)pinchDistance=0};
  host.addEventListener('pointerup',endPointer);host.addEventListener('pointercancel',endPointer);host.addEventListener('lostpointercapture',endPointer);
  host.addEventListener('keydown',event=>{const step=event.shiftKey?.16:.07;let used=true;switch(event.key){case'ArrowLeft':pivot.rotation.y-=step;measureDirty=true;break;case'ArrowRight':pivot.rotation.y+=step;measureDirty=true;break;case'ArrowUp':tilt(-step);break;case'ArrowDown':tilt(step);break;case'Home':pivot.rotation.set(0,0,0);velocityYaw=0;velocityPitch=0;distance=8.8;camera.position.z=distance;camera.updateProjectionMatrix();measureDirty=true;break;default:used=false}if(used)event.preventDefault()});
  if(loading)loading.hidden=true;
  function render(){raf=requestAnimationFrame(render);if(!dragId&&(Math.abs(velocityYaw)>.00025||Math.abs(velocityPitch)>.00025)){pivot.rotation.y+=velocityYaw;tilt(velocityPitch);velocityYaw*=.91;velocityPitch*=.91}else if(Math.abs(velocityYaw)<=.00025&&Math.abs(velocityPitch)<=.00025){velocityYaw=0;velocityPitch=0}if(measureDirty)refreshMeasurement();renderer.render(scene,camera)}
  render();
  return()=>{cancelAnimationFrame(raf);observer.disconnect();renderer.dispose();scene.traverse(node=>{if(node.isMesh||node.isLine){node.geometry?.dispose();if(Array.isArray(node.material))node.material.forEach(material=>material.dispose());else node.material?.dispose()}})};
}
