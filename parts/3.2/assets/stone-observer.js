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
    position.setXYZ(i,v.x*r*1.15,v.y*r*.79,v.z*r*.98);
  }
  geometry.computeVertexNormals();
  const surface=makeSurface();
  const material=new THREE.MeshStandardMaterial({map:surface,roughness:.96,metalness:0,bumpMap:surface,bumpScale:.055});
  const stone=new THREE.Mesh(geometry,material);stone.rotation.set(.05,-.25,.03);return stone;
}

export function mountStoneObserver(){
  const host=document.querySelector('#stone-observer'),canvas=document.querySelector('#stone-canvas');
  if(!host||!canvas)return;
  const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.16;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(34,1,.1,40);
  camera.position.set(0,.1,4.1);
  scene.add(new THREE.HemisphereLight(0xf5f7f1,0x5e6259,2.1));
  const key=new THREE.DirectionalLight(0xfff4df,3.1);key.position.set(-3,4,4);scene.add(key);
  const fill=new THREE.DirectionalLight(0xd9e6ef,1.45);fill.position.set(3,1,-3);scene.add(fill);
  const rim=new THREE.DirectionalLight(0xffffff,1.1);rim.position.set(1,4,-4);scene.add(rim);
  const pivot=new THREE.Group();scene.add(pivot);pivot.add(makeStone());
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=128;shadowCanvas.height=128;
  const shadowCtx=shadowCanvas.getContext('2d'),gradient=shadowCtx.createRadialGradient(64,64,5,64,64,62);
  gradient.addColorStop(0,'rgba(32,38,33,.32)');gradient.addColorStop(1,'rgba(32,38,33,0)');shadowCtx.fillStyle=gradient;shadowCtx.fillRect(0,0,128,128);
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(2.6,1.55),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}));
  shadow.rotation.x=-Math.PI/2;shadow.position.set(0,-.88,0);scene.add(shadow);

  let width=0,height=0,dragId=null,lastX=0,lastY=0,vx=0,vy=0,distance=4.1,target=null,raf=0;
  const status=document.querySelector('#rock-angle'),loading=document.querySelector('#observer-loading');
  const updateStatus=value=>{if(status)status.textContent=value};
  function resize(){const rect=host.getBoundingClientRect();if(!rect.width||!rect.height)return;width=rect.width;height=rect.height;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix()}
  const observer=new ResizeObserver(resize);observer.observe(host);resize();
  const zoom=delta=>{distance=clamp(distance+delta,2.65,6.1);camera.position.z=distance;camera.updateProjectionMatrix();updateStatus(`自由視角・${Math.round(4.1/distance*100)}%`)};
  const smoothView=(x,y,label)=>{target={x,y,label};vx=vy=0;updateStatus(label)};
  document.querySelector('#rock-zoom-in')?.addEventListener('click',()=>zoom(-.38));
  document.querySelector('#rock-zoom-out')?.addEventListener('click',()=>zoom(.38));
  document.querySelector('#rock-view-front')?.addEventListener('click',()=>smoothView(.05,-.25,'正面'));
  document.querySelector('#rock-view-back')?.addEventListener('click',()=>smoothView(.05,Math.PI-.25,'背面'));
  document.querySelector('#rock-view-top')?.addEventListener('click',()=>smoothView(-1.25,-.25,'俯視'));
  document.querySelector('#rotate-rock')?.addEventListener('click',()=>{distance=4.1;camera.position.set(0,.1,distance);smoothView(.05,-.25,'自由視角')});
  host.addEventListener('wheel',event=>{event.preventDefault();zoom(event.deltaY>0?.25:-.25)},{passive:false});
  host.addEventListener('pointerdown',event=>{if(event.button!==undefined&&event.button!==0)return;dragId=event.pointerId;lastX=event.clientX;lastY=event.clientY;vx=vy=0;target=null;host.setPointerCapture(event.pointerId);updateStatus('自由視角')});
  host.addEventListener('pointermove',event=>{if(dragId!==event.pointerId)return;const dx=event.clientX-lastX,dy=event.clientY-lastY;lastX=event.clientX;lastY=event.clientY;vx=dx*.0054;vy=dy*.0054;pivot.rotation.y+=vx;pivot.rotation.x=clamp(pivot.rotation.x+vy,-1.43,1.43)});
  const endDrag=event=>{if(dragId===event.pointerId)dragId=null};
  host.addEventListener('pointerup',endDrag);host.addEventListener('pointercancel',endDrag);host.addEventListener('lostpointercapture',endDrag);
  host.addEventListener('keydown',event=>{const step=event.shiftKey?.16:.07;let used=true;target=null;switch(event.key){case'ArrowLeft':pivot.rotation.y-=step;break;case'ArrowRight':pivot.rotation.y+=step;break;case'ArrowUp':pivot.rotation.x=clamp(pivot.rotation.x-step,-1.43,1.43);break;case'ArrowDown':pivot.rotation.x=clamp(pivot.rotation.x+step,-1.43,1.43);break;default:used=false}if(used){event.preventDefault();updateStatus('自由視角')}});
  host.addEventListener('dblclick',()=>{distance=4.1;camera.position.z=distance;smoothView(.05,-.25,'自由視角')});
  if(loading)loading.hidden=true;
  function render(){raf=requestAnimationFrame(render);if(target){const dx=Math.atan2(Math.sin(target.y-pivot.rotation.y),Math.cos(target.y-pivot.rotation.y));pivot.rotation.y+=dx*.085;pivot.rotation.x+=(target.x-pivot.rotation.x)*.085;if(Math.abs(dx)<.002&&Math.abs(target.x-pivot.rotation.x)<.002){pivot.rotation.set(target.x,target.y,0);updateStatus(target.label);target=null}}else if(!dragId){pivot.rotation.y+=vx;pivot.rotation.x=clamp(pivot.rotation.x+vy,-1.43,1.43);vx*=.91;vy*=.91;if(Math.abs(vx)<.00025)vx=0;if(Math.abs(vy)<.00025)vy=0}renderer.render(scene,camera)}
  render();
  return()=>{cancelAnimationFrame(raf);observer.disconnect();renderer.dispose();pivot.traverse(node=>{if(node.isMesh){node.geometry.dispose();if(Array.isArray(node.material))node.material.forEach(material=>material.dispose());else node.material.dispose()}})};
}
