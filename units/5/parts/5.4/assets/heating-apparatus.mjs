// Reuse the repository's existing, locally hosted Three.js distribution.
import * as T from '../../../../4/parts/4.1/assets/vendor/three/build/three.module.js';

export function createHeatingApparatus(host){
 const renderer=new T.WebGLRenderer({antialias:true,alpha:false});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));
 renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;
 renderer.toneMappingExposure=1.25;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 const scene=new T.Scene();scene.background=new T.Color('#eeeae0');
 const camera=new T.PerspectiveCamera(31,1,.1,80);camera.position.set(5.1,4.8,10.5);camera.lookAt(.3,2,0);
 scene.add(new T.HemisphereLight(0xffffff,0xb7a78f,3));
 const key=new T.DirectionalLight(0xfff4df,4.2);key.position.set(-4,8,5);key.castShadow=true;
 key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-6;key.shadow.camera.right=6;key.shadow.camera.top=7;key.shadow.camera.bottom=-5;key.shadow.normalBias=.03;scene.add(key);
 const rim=new T.DirectionalLight(0xe8f5ff,2);rim.position.set(4,5,-4);scene.add(rim);
 const mat=(color,roughness=.45,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
 const steel=mat('#c2c9c6',.22,.72),green=mat('#284e40',.4,.15),cream=mat('#e4e3d6',.32,.08),black=mat('#242b29',.7);
 function mesh(geometry,material,parent=scene){const m=new T.Mesh(geometry,material);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 function box(w,h,d,material,x,y,z,parent=scene){const m=mesh(new T.BoxGeometry(w,h,d),material,parent);m.position.set(x,y,z);return m;}
 function rounded(w,h,depth,r,material,x,y,z,parent=scene){
  const shape=new T.Shape();shape.moveTo(-w/2+r,-h/2);shape.lineTo(w/2-r,-h/2);shape.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);shape.lineTo(w/2,h/2-r);shape.quadraticCurveTo(w/2,h/2,w/2-r,h/2);shape.lineTo(-w/2+r,h/2);shape.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);shape.lineTo(-w/2,-h/2+r);shape.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);
  const m=mesh(new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.035,bevelThickness:.035,curveSegments:12}),material,parent);m.position.set(x,y,z-depth/2);return m;
 }
 function rod(a,b,r,material,parent=scene){const va=new T.Vector3(...a),vb=new T.Vector3(...b);const m=mesh(new T.CylinderGeometry(r,r,va.distanceTo(vb),24),material,parent);m.position.copy(va).add(vb).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),vb.sub(va).normalize());return m;}
 // A softly lit wooden bench, made procedurally; no external texture downloads.
 const wood=document.createElement('canvas');wood.width=512;wood.height=512;const wc=wood.getContext('2d');wc.fillStyle='#d6c5a8';wc.fillRect(0,0,512,512);
 for(let i=0;i<180;i++){wc.strokeStyle=`rgba(126,97,58,${.02+(i%7)*.007})`;wc.beginPath();wc.moveTo(0,i*3);wc.bezierCurveTo(180,i*3-4,320,i*3+6,512,i*3);wc.stroke();}
 const texture=new T.CanvasTexture(wood);texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(2,2);
 const bench=mesh(new T.PlaneGeometry(30,30),new T.MeshStandardMaterial({map:texture,roughness:.83}));bench.rotation.x=-Math.PI/2;bench.position.y=-.03;bench.receiveShadow=true;bench.castShadow=false;
 // Hotplate: weighted green base, cream upper casing and brushed metal plate.
 rounded(2.8,.48,2,.16,green,-.75,.3,0);rounded(2.7,.18,1.94,.12,cream,-.75,.63,0);
 const plate=mesh(new T.CylinderGeometry(1.02,1.07,.14,80),steel);plate.position.set(-.75,.79,0);
 for(const x of [-1.82,.3])for(const z of [-.68,.68])box(.22,.12,.25,black,x,.06,z);
 const knob=mesh(new T.CylinderGeometry(.17,.17,.12,32),steel);knob.rotation.x=Math.PI/2;knob.position.set(.2,.32,1.04);
 const lamp=mesh(new T.SphereGeometry(.055,20,12),new T.MeshStandardMaterial({color:'#8b9480',emissive:'#000000'}));lamp.position.set(-1.7,.34,1.035);
 // Open beaker. Thin transparent walls with separately rendered rim and base.
 const glass=new T.MeshPhysicalMaterial({color:'#eef9fa',transparent:true,opacity:.14,roughness:.13,metalness:.02,side:T.DoubleSide,depthWrite:false});
 const beaker=mesh(new T.CylinderGeometry(.88,.84,2.48,80,1,true),glass);beaker.position.set(-.75,2.1,0);beaker.castShadow=false;beaker.renderOrder=4;
 const glassEdge=new T.MeshStandardMaterial({color:'#7396a0',metalness:.22,roughness:.28,transparent:true,opacity:.79});
 for(const y of [.88,3.34]){const ring=mesh(new T.TorusGeometry(y>3?.88:.84,.022,12,80),glassEdge);ring.rotation.x=Math.PI/2;ring.position.set(-.75,y,0);ring.castShadow=false;ring.renderOrder=5;}
 const bottom=mesh(new T.CylinderGeometry(.84,.84,.035,80),glass);bottom.position.set(-.75,.87,0);bottom.castShadow=false;bottom.renderOrder=4;
 // Continuous silhouettes join the rim to the base; they are reflections on
 // glass, not separate rods. Front reflections keep the clear wall legible.
 const glassLine=new T.MeshBasicMaterial({color:'#6f959f',transparent:true,opacity:.65,depthWrite:false});
 for(const angle of [-.51,2.63]){const wall=rod([-.75+Math.cos(angle)*.84,.89,Math.sin(angle)*.84],[-.75+Math.cos(angle)*.88,3.33,Math.sin(angle)*.88],.009,glassLine);wall.castShadow=false;wall.renderOrder=6;}
 const reflection=new T.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:.58,depthWrite:false});
 for(const angle of [.4,1.9]){const line=rod([-.75+Math.cos(angle)*.845,1,Math.sin(angle)*.845],[-.75+Math.cos(angle)*.875,3.23,Math.sin(angle)*.875],.012,reflection);line.castShadow=false;line.renderOrder=6;}
 const spout=mesh(new T.TorusGeometry(.13,.021,10,25,Math.PI),glassEdge);spout.position.set(-1.6,3.34,.04);spout.rotation.x=Math.PI/2;spout.rotation.z=Math.PI/2;
 // Fixed 100 g total initially: displaced liquid level is schematic, no graduations
 // falsely presented as measurements of changing ice geometry.
 const water=mesh(new T.CylinderGeometry(.824,.824,1,80),new T.MeshPhysicalMaterial({color:'#85b6c8',transparent:true,opacity:.5,roughness:.18,metalness:.08,side:T.DoubleSide,depthWrite:false}));water.castShadow=false;water.renderOrder=2;
 const waterEdge=new T.MeshStandardMaterial({color:'#417c91',transparent:true,opacity:.8,roughness:.4});
 const meniscus=mesh(new T.TorusGeometry(.818,.016,8,80),waterEdge);meniscus.rotation.x=Math.PI/2;meniscus.castShadow=false;meniscus.renderOrder=3;
 const ice=[];for(let i=0;i<4;i++){const m=rounded(.42,.36,.42,.07,new T.MeshPhysicalMaterial({color:'#effbff',roughness:.36,transparent:true,opacity:.97,metalness:.03}),0,0,0);const outline=new T.LineSegments(new T.EdgesGeometry(m.geometry,24),new T.LineBasicMaterial({color:'#59899c',transparent:true,opacity:.72}));outline.renderOrder=5;m.add(outline);m.castShadow=false;m.renderOrder=3;m.rotation.set(.1*(i-1),i*.7,.08*(i%2?1:-1));ice.push(m);}
 // Clamp and probe: tip is inside water even at the final 80 g observation.
 box(.75,.11,.6,steel,.88,.075,-.43);rod([.88,.13,-.43],[.88,4.23,-.43],.055,steel);
 rod([.88,3.92,-.43],[-.12,3.92,-.43],.045,steel);box(.19,.26,.2,steel,.88,3.92,-.43);
 const screw=mesh(new T.CylinderGeometry(.13,.13,.14,24),black);screw.rotation.x=Math.PI/2;screw.position.set(1.05,3.92,-.28);
 rod([-.12,3.92,-.43],[-.12,3.92,.15],.035,steel);
 rod([-.12,4.15,.15],[-.12,2.52,.15],.04,steel);box(.16,.26,.16,black,-.12,3.94,.15);
 const probeMaterial=new T.MeshStandardMaterial({color:'#3e5965',metalness:.45,roughness:.3,transparent:true,opacity:.98,depthWrite:false});
 const submergedProbe=rod([-.12,2.52,.15],[-.12,1.08,.15],.043,probeMaterial);submergedProbe.castShadow=false;submergedProbe.renderOrder=3;
 const probeTip=mesh(new T.SphereGeometry(.045,16,10),probeMaterial);probeTip.position.set(-.12,1.08,.15);probeTip.renderOrder=3;probeTip.castShadow=false;
 const cableCurve=new T.CatmullRomCurve3([new T.Vector3(-.12,4.14,.15),new T.Vector3(-.08,4.6,-.2),new T.Vector3(.8,4.62,-.65),new T.Vector3(1.78,3.5,-.55),new T.Vector3(2.02,2.2,.25)]);
 mesh(new T.TubeGeometry(cableCurve,60,.033,10,false),black);
 const meter=new T.Group();meter.position.set(1.94,1.22,.56);meter.rotation.y=.1;meter.scale.set(1.2,1.08,1.08);scene.add(meter);
 rounded(1.35,1.85,.4,.14,cream,0,0,0,meter);rounded(1.16,1.25,.02,.07,green,0,.12,.24,meter);
 const screen=document.createElement('canvas');screen.width=640;screen.height=300;const sc=screen.getContext('2d');const lcdTex=new T.CanvasTexture(screen);lcdTex.colorSpace=T.SRGBColorSpace;
 const lcd=mesh(new T.PlaneGeometry(1.08,.66),new T.MeshBasicMaterial({map:lcdTex}),meter);lcd.position.set(0,.35,.305);lcd.material.toneMapped=false;lcd.material.depthTest=false;lcd.material.depthWrite=false;lcd.material.side=T.DoubleSide;lcd.renderOrder=20;
 const labelCanvas=document.createElement('canvas');labelCanvas.width=512;labelCanvas.height=128;const lc=labelCanvas.getContext('2d');lc.fillStyle='#284e40';lc.fillRect(0,0,512,128);lc.fillStyle='#fffefa';lc.font='42px sans-serif';lc.textAlign='center';lc.fillText('樣品溫度',256,82);
 const labelTex=new T.CanvasTexture(labelCanvas);labelTex.colorSpace=T.SRGBColorSpace;const label=mesh(new T.PlaneGeometry(.9,.225),new T.MeshBasicMaterial({map:labelTex}),meter);label.position.set(0,-.18,.305);label.material.toneMapped=false;label.material.depthTest=false;label.material.depthWrite=false;label.material.side=T.DoubleSide;label.renderOrder=20;
 // Bubbles are shown only in the observed boiling stage, never in 60°C water.
 const bubbles=[];for(let i=0;i<16;i++){const b=mesh(new T.SphereGeometry(.025+(i%3)*.012,12,8),new T.MeshStandardMaterial({color:'#edfaff',transparent:true,opacity:.72,roughness:.12}));b.castShadow=false;b.renderOrder=3;bubbles.push(b);}
 // Reference marks the same water level throughout boiling; it is a visual aid,
 // not a scale suggesting greater measurement precision.
 const referencePoints=Array.from({length:97},(_,i)=>{const a=i/96*Math.PI*2;return new T.Vector3(-.75+Math.cos(a)*.866,2.36,Math.sin(a)*.866);});
 const reference=new T.Line(new T.BufferGeometry().setFromPoints(referencePoints),new T.LineDashedMaterial({color:'#885b2e',dashSize:.09,gapSize:.06,transparent:true,opacity:.95}));reference.computeLineDistances();reference.renderOrder=6;scene.add(reference);
 let lastDisplay='',lastState=null,contextLost=false;
 const draw=()=>{if(!contextLost)renderer.render(scene,camera);};
 function update(state,playing,energy){lastState=[state,playing,energy];if(contextLost)return;
  reference.visible=state.temperature===100;
  const height=1.46*(state.water+state.ice)/100;water.scale.y=height;water.position.set(-.75,.9+height/2,0);meniscus.position.set(-.75,.9+height,0);
  ice.forEach((m,i)=>{m.visible=state.ice>0;const scale=Math.cbrt(state.ice/50);m.scale.setScalar(scale);m.position.set(-.75+(i%2?-.29:.25),.9+height-.17*scale,(i<2?-.28:.26));});
  const boiling=state.vapor>0;bubbles.forEach((m,i)=>{m.visible=boiling;const phase=((energy/2500+i*.17)%1);m.position.set(-.75+Math.sin(i*4.3)*.59,.96+phase*(height-.08),Math.cos(i*3.1)*.56);});
  lamp.material.color.set(playing?'#ffae45':'#8b9480');lamp.material.emissive.set(playing?'#b55a0a':'#000000');
  const display=state.temperature.toFixed(1);if(display!==lastDisplay){lastDisplay=display;sc.fillStyle='#dfe7ca';sc.fillRect(0,0,640,300);sc.fillStyle='#0b1a10';sc.textAlign='center';sc.font='bold 140px monospace';sc.fillText(display,278,190);sc.font='67px sans-serif';sc.fillText('°C',537,183);lcdTex.needsUpdate=true;}
  draw();
 }
 function projectHeatFlow(width,height){
  const start=new T.Vector3(-.86,.79,.27).project(camera),end=new T.Vector3(-.86,1.5,.27).project(camera);
  const x1=(start.x+1)*width/2,y1=(1-start.y)*height/2,x2=(end.x+1)*width/2,y2=(1-end.y)*height/2;
  host.querySelector('#heat-transfer').innerHTML=`<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="熱由加熱盤經杯底傳入樣品"><defs><marker id="heating-flow-tip" markerUnits="userSpaceOnUse" markerWidth="15" markerHeight="15" refX="13" refY="7.5" orient="auto"><path d="M0 0L15 7.5L0 15Z" fill="#b7652c" stroke="#fff9ee" stroke-width="1"/></marker></defs><path d="M${x1} ${y1}L${x2} ${y2}" stroke="#fff9ee" stroke-width="8"/><path d="M${x1} ${y1}L${x2} ${y2}" stroke="#b7652c" stroke-width="5" marker-end="url(#heating-flow-tip)"/><text x="${Math.min(x1,x2)-14}" y="${(y1+y2)/2+4}" text-anchor="end" font-size="14" font-weight="700" fill="#9b4e1f" stroke="#fff9ee" stroke-width="4" paint-order="stroke">熱傳入</text></svg>`;
 }
 const resize=()=>{const r=host.getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.position.set(camera.aspect<.8?5.6:4.5,camera.aspect<.8?4.9:4.3,camera.aspect<.8?11:9.2);camera.lookAt(.3,2,0);camera.updateProjectionMatrix();camera.updateMatrixWorld();projectHeatFlow(r.width,r.height);draw();};
 renderer.domElement.setAttribute('aria-hidden','true');renderer.domElement.className='heat-canvas';
 host.append(renderer.domElement);host.classList.add('has-3d');const observer=new ResizeObserver(resize);observer.observe(host);resize();
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();contextLost=true;host.classList.remove('has-3d');});
 renderer.domElement.addEventListener('webglcontextrestored',()=>{contextLost=false;host.classList.add('has-3d');if(lastState)update(...lastState);});
 return {update};
}
