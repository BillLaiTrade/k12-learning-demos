import * as T from '../../../../4/parts/4.1/assets/vendor/three/build/three.module.js';

export function createPhaseApparatus(host,key){
 const warm=key==='warm',renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 const scene=new T.Scene();scene.background=new T.Color('#eeeae1');
 const camera=new T.PerspectiveCamera(31,1,.1,60);camera.position.set(5.4,4.5,10.5);camera.lookAt(.1,1.6,0);
 scene.add(new T.HemisphereLight(0xffffff,0xb0a48b,3));const light=new T.DirectionalLight(0xfff5e4,3.5);light.position.set(-4,7,5);light.castShadow=true;light.shadow.mapSize.set(1024,1024);light.shadow.camera.left=-6;light.shadow.camera.right=6;light.shadow.camera.top=6;light.shadow.camera.bottom=-4;light.shadow.normalBias=.03;scene.add(light);
 const fill=new T.DirectionalLight(0xe4f3ff,1.7);fill.position.set(4,4,-3);scene.add(fill);
 const material=(color,roughness=.4,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
 const steel=material('#c1cbc8',.23,.7),green=material('#284e40'),cream=material('#e7e5d8'),black=material('#303633');
 function mesh(geo,mat,parent=scene){const m=new T.Mesh(geo,mat);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 function box(w,h,d,mat,x,y,z,parent=scene){const m=mesh(new T.BoxGeometry(w,h,d),mat,parent);m.position.set(x,y,z);return m;}
 function rod(a,b,r,mat,parent=scene){const p=new T.Vector3(...a),q=new T.Vector3(...b),m=mesh(new T.CylinderGeometry(r,r,p.distanceTo(q),20),mat,parent);m.position.copy(p).add(q).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),q.sub(p).normalize());return m;}
 function rounded(w,h,depth,r,mat,x,y,z,parent=scene){const shape=new T.Shape();shape.moveTo(-w/2+r,-h/2);shape.lineTo(w/2-r,-h/2);shape.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);shape.lineTo(w/2,h/2-r);shape.quadraticCurveTo(w/2,h/2,w/2-r,h/2);shape.lineTo(-w/2+r,h/2);shape.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);shape.lineTo(-w/2,-h/2+r);shape.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);const m=mesh(new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:3,curveSegments:12}),mat,parent);m.position.set(x,y,z-depth/2);return m;}
 const floor=mesh(new T.PlaneGeometry(30,30),material('#d7c9af',.85));floor.rotation.x=-Math.PI/2;floor.position.y=-.015;floor.castShadow=false;
 const glass=new T.MeshPhysicalMaterial({color:'#d7edf0',transparent:true,opacity:.15,side:T.DoubleSide,roughness:.15,depthWrite:false});
 const edge=new T.MeshStandardMaterial({color:'#7b9da4',transparent:true,opacity:.63,roughness:.25,metalness:.25});
 function cylinder(r,h,y,mat,x=-.65){const m=mesh(new T.CylinderGeometry(r,r,h,80,1,true),mat);m.position.set(x,y,0);m.castShadow=false;m.renderOrder=4;return m;}
 function ring(r,y,mat=edge,x=-.65){const m=mesh(new T.TorusGeometry(r,.018,10,80),mat);m.position.set(x,y,0);m.rotation.x=Math.PI/2;m.castShadow=false;m.renderOrder=5;return m;}
 // The two liquids are separated by the glass sample cup. Neither bath has ice,
 // a heater or a refrigeration unit continuing to exchange energy during the run.
 cylinder(1.56,1.5,.81,glass);ring(1.56,1.56);ring(1.56,.06);
 const bathHeight=warm?1.23:1.23/1.16;
 const bath=mesh(new T.CylinderGeometry(1.53,1.53,bathHeight,80),new T.MeshPhysicalMaterial({color:warm?'#dcc28c':'#8db6cc',transparent:true,opacity:.4,roughness:.2,side:T.DoubleSide,depthWrite:false}));bath.position.set(-.65,.1+bathHeight/2,0);bath.castShadow=false;bath.renderOrder=1;ring(1.53,.1+bathHeight);
 const bottom=mesh(new T.CylinderGeometry(1.55,1.55,.04,80),glass);bottom.position.set(-.65,.06,0);bottom.castShadow=false;
 cylinder(.75,2.4,1.55,glass);ring(.75,2.75);ring(.75,.35);
 const base=mesh(new T.CylinderGeometry(.75,.75,.035,80),glass);base.position.set(-.65,.35,0);base.castShadow=false;
 for(let i=0;i<3;i++){const a=i*Math.PI*2/3;rod([-.65+Math.cos(a)*.48,.09,Math.sin(a)*.48],[-.65+Math.cos(a)*.48,.34,Math.sin(a)*.48],.04,black);}
 const water=mesh(new T.CylinderGeometry(.725,.725,1.4,80),new T.MeshPhysicalMaterial({color:'#8bbdcd',transparent:true,opacity:.64,side:T.DoubleSide,roughness:.2,depthWrite:false}));water.position.set(-.65,1.09,0);water.castShadow=false;water.renderOrder=2;
 ring(.72,1.79,new T.MeshStandardMaterial({color:'#447f92',roughness:.35,transparent:true,opacity:.8}));
 const ice=[];for(let i=0;i<4;i++){const m=rounded(.43,.4,.43,.07,new T.MeshPhysicalMaterial({color:'#effbff',roughness:.35,transparent:true,opacity:.97}),0,0,0);const outline=new T.LineSegments(new T.EdgesGeometry(m.geometry,24),new T.LineBasicMaterial({color:'#568a9c',transparent:true,opacity:.7}));outline.renderOrder=5;m.add(outline);m.castShadow=false;m.renderOrder=3;m.rotation.set(.03*(i-1),i*.61,0);ice.push(m);}
 // One support carries two distinct probes: inside sample and outside bath.
 box(.6,.1,.5,steel,.55,.06,-.73);rod([.55,.1,-.73],[.55,3.8,-.73],.045,steel);
 rod([.55,3.45,-.73],[-1.85,3.45,-.73],.035,steel);box(.16,.2,.18,steel,.55,3.45,-.73);
 rod([-.38,3.62,-.16],[-.38,.63,-.16],.032,steel);rod([-1.83,3.62,.09],[-1.83,.44,.09],.032,steel);
 for(const x of [-.38,-1.83]){const z=x===-.38?-.16:.09;rod([x,3.45,-.73],[x,3.45,z],.03,steel);box(.12,.2,.13,black,x,3.45,z);const curve=new T.CatmullRomCurve3([new T.Vector3(x,3.62,z),new T.Vector3(x+.1,4.05,-.2),new T.Vector3(1.2,3.7,-.6),new T.Vector3(2.05,2,.28)]);mesh(new T.TubeGeometry(curve,50,.025,8,false),black);}
 const meter=new T.Group();meter.position.set(2.05,1.05,.55);meter.rotation.y=.05;scene.add(meter);
 rounded(1.45,1.9,.38,.12,cream,0,0,0,meter);rounded(1.27,1.54,.02,.07,green,0,.08,.23,meter);
 const screen=document.createElement('canvas');screen.width=640;screen.height=660;const ctx=screen.getContext('2d'),texture=new T.CanvasTexture(screen);texture.colorSpace=T.SRGBColorSpace;
 const lcd=mesh(new T.PlaneGeometry(1.12,1.15),new T.MeshBasicMaterial({map:texture,depthTest:false,depthWrite:false,toneMapped:false}),meter);lcd.position.set(0,.14,.31);lcd.renderOrder=20;
 let previous='',last=null,lost=false;
 const draw=()=>{if(!lost)renderer.render(scene,camera);};
 function update(state){last=state;if(lost)return;const scale=Math.cbrt(state.ice/50);ice.forEach((m,i)=>{m.scale.setScalar(scale);m.position.set(-.65+(i%2?-.27:.25),1.79-.18*scale,(i<2?-.25:.25));});const value=state.bathTemperature.toFixed(1);if(value!==previous){previous=value;ctx.fillStyle='#e0e8d0';ctx.fillRect(0,0,640,660);ctx.fillStyle='#153124';ctx.textAlign='center';ctx.font='58px sans-serif';ctx.fillText('杯內',320,87);ctx.font='bold 126px monospace';ctx.fillText('0.0°C',320,238);ctx.fillStyle='#a1b497';ctx.fillRect(28,300,584,3);ctx.fillStyle='#153124';ctx.font='58px sans-serif';ctx.fillText('外浴',320,390);ctx.font='bold 112px monospace';ctx.fillText(value+'°C',320,545);texture.needsUpdate=true;}draw();}
 // Anchor the explanation to actual points in the liquids, not to an assumed
 // screen position that could point at the meter after a resize.
 function positionArrow(width,height){
  const start=new T.Vector3(warm?-1.9:-.45,1.05,.1).project(camera),end=new T.Vector3(warm?-.85:.62,1.05,.1).project(camera);
  const x1=(start.x+1)*width/2,y1=(1-start.y)*height/2,x2=(end.x+1)*width/2,y2=(1-end.y)*height/2,id='phase-flow-'+key;
  host.querySelector('.comparison-arrow').innerHTML=`<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${warm?'熱由外浴傳入杯內樣品':'熱由杯內樣品傳出至外浴'}"><defs><marker id="${id}" markerUnits="userSpaceOnUse" markerWidth="15" markerHeight="17" refX="13" refY="8.5" orient="auto"><path d="M0 0L15 8.5L0 17Z" fill="#b7652c" stroke="#fff8e9" stroke-width="1"/></marker></defs><path d="M${x1} ${y1}L${x2} ${y2}" fill="none" stroke="#fff8e9" stroke-width="8"/><path d="M${x1} ${y1}L${x2} ${y2}" stroke="#b7652c" stroke-width="5" marker-end="url(#${id})"/><text x="${(x1+x2)/2}" y="${(y1+y2)/2-14}" text-anchor="middle" font-size="13" font-weight="700" fill="#99501f" stroke="#fff9ee" stroke-width="4" paint-order="stroke">${warm?'熱傳入':'熱傳出'}</text></svg>`;
 }
 const resize=()=>{const b=host.getBoundingClientRect();if(!b.width||!b.height)return;renderer.setSize(b.width,b.height,false);camera.aspect=b.width/b.height;camera.updateProjectionMatrix();camera.updateMatrixWorld();positionArrow(b.width,b.height);draw();};
 renderer.domElement.className='phase-canvas';renderer.domElement.setAttribute('aria-hidden','true');host.append(renderer.domElement);host.classList.add('has-phase-3d');new ResizeObserver(resize).observe(host);resize();
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;host.classList.remove('has-phase-3d');});renderer.domElement.addEventListener('webglcontextrestored',()=>{lost=false;host.classList.add('has-phase-3d');if(last)update(last);});
 return {update};
}
