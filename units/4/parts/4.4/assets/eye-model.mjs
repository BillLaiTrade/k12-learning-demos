import * as THREE from '../../4.1/assets/vendor/three/build/three.module.js';

// A fixed, open teaching model. The camera looks into the cut face, so the
// retinal lining and optical overlay stay visible through every adjustment.
export function createEyeModel(canvas,options={}){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.94;renderer.shadowMap.enabled=false;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(0,760,0,-420,1,2000);camera.position.set(0,0,1000);camera.lookAt(0,0,0);
 scene.add(new THREE.HemisphereLight('#fffdf2','#6e856d',1.3));
 const key=new THREE.DirectionalLight('#fff5df',2.3);key.position.set(180,240,650);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-500,right:500,top:450,bottom:-450,near:1,far:1600});key.target.position.set(470,-220,0);scene.add(key,key.target);key.shadow.bias=-.0003;key.shadow.normalBias=.5;key.shadow.radius=4;
 const fill=new THREE.DirectionalLight('#d7eef1',.9);fill.position.set(730,-100,350);scene.add(fill);
 const envCanvas=document.createElement('canvas');envCanvas.width=512;envCanvas.height=256;const ctx=envCanvas.getContext('2d'),gradient=ctx.createLinearGradient(0,0,0,256);gradient.addColorStop(0,'#e4ebeb');gradient.addColorStop(.5,'#a6b6b2');gradient.addColorStop(1,'#4c6560');ctx.fillStyle=gradient;ctx.fillRect(0,0,512,256);ctx.fillStyle='#ffffff';ctx.fillRect(60,36,20,110);ctx.fillRect(84,36,36,110);ctx.fillStyle='#fdf2d9';ctx.fillRect(300,50,65,40);const env=new THREE.CanvasTexture(envCanvas);env.mapping=THREE.EquirectangularReflectionMapping;env.colorSpace=THREE.SRGBColorSpace;const pmrem=new THREE.PMREMGenerator(renderer),environment=pmrem.fromEquirectangular(env);scene.environment=environment.texture;env.dispose();pmrem.dispose();
 const material=(color,extra={})=>new THREE.MeshPhysicalMaterial({color,roughness:.4,metalness:0,clearcoat:.4,clearcoatRoughness:.3,...extra});
 const shellMat=material('#b4c7a3',{roughness:.38}),bowlMat=material('#fff4dd',{roughness:.6,side:THREE.BackSide});
 const bgCanvas=document.createElement('canvas');bgCanvas.width=760;bgCanvas.height=420;const bg=bgCanvas.getContext('2d'),pool=bg.createRadialGradient(420,120,10,420,120,490);pool.addColorStop(0,'#f5f7ee');pool.addColorStop(.6,'#eaf0e0');pool.addColorStop(1,'#dce7cf');bg.fillStyle=pool;bg.fillRect(0,0,760,420);const bgTex=new THREE.CanvasTexture(bgCanvas);bgTex.colorSpace=THREE.SRGBColorSpace;const backdrop=new THREE.Mesh(new THREE.PlaneGeometry(760,420),new THREE.MeshBasicMaterial({map:bgTex,toneMapped:false}));backdrop.position.set(380,-210,-240);scene.add(backdrop);
 const shadowCanvas=document.createElement('canvas');shadowCanvas.width=256;shadowCanvas.height=128;const shadowCtx=shadowCanvas.getContext('2d'),fade=shadowCtx.createRadialGradient(128,64,0,128,64,110);fade.addColorStop(0,'rgba(65,86,51,.22)');fade.addColorStop(.55,'rgba(65,86,51,.10)');fade.addColorStop(1,'rgba(65,86,51,0)');shadowCtx.fillStyle=fade;shadowCtx.fillRect(0,0,256,128);const shadowTex=new THREE.CanvasTexture(shadowCanvas),shadow=new THREE.Mesh(new THREE.PlaneGeometry(370,36),new THREE.MeshBasicMaterial({map:shadowTex,transparent:true,depthWrite:false}));shadow.position.set(476,-401,-150);scene.add(shadow);
 const center=new THREE.Vector3(470,-220,0);
 function hemisphere(radius,mat,scale){const g=new THREE.SphereGeometry(radius,96,48,0,Math.PI*2,0,Math.PI/2);g.rotateX(-Math.PI/2);const m=new THREE.Mesh(g,mat);m.position.copy(center);m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;scene.add(m);return m;}
 const shell=hemisphere(1,shellMat,[200,182,118]),bowl=hemisphere(1,bowlMat,[192,174,110]);
 const rimShape=new THREE.Shape();rimShape.absellipse(470,-220,200,182,0,Math.PI*2,false);const opening=new THREE.Path();opening.absellipse(470,-220,192,174,0,Math.PI*2,true);rimShape.holes.push(opening);const cut=new THREE.Mesh(new THREE.ExtrudeGeometry(rimShape,{depth:5,bevelEnabled:true,bevelThickness:1.4,bevelSize:1.2,bevelSegments:4,curveSegments:128}),material('#c6d6b0',{roughness:.3}));cut.position.z=.5;scene.add(cut);
 // A narrow lining follows the same posterior curve as the optical landing
 // points, without a second broad surface resembling a screen inside the eye.
 const bandShape=new THREE.Shape(),wall=y=>655-.0025*(y-220)**2;
 bandShape.moveTo(wall(100),-100);for(let y=104;y<=340;y+=4)bandShape.lineTo(wall(y),-y);for(let y=340;y>=100;y-=4)bandShape.lineTo(wall(y)+6,-y);bandShape.closePath();
 const band=new THREE.Mesh(new THREE.ExtrudeGeometry(bandShape,{depth:4,bevelEnabled:true,bevelThickness:1.2,bevelSize:1,bevelSegments:3,steps:1}),material('#e9bc87',{roughness:.32}));band.position.z=3;band.castShadow=true;scene.add(band);
 const corneaShape=new THREE.Shape();corneaShape.moveTo(325,-127);corneaShape.bezierCurveTo(269,-167,267,-272,325,-313);corneaShape.bezierCurveTo(302,-274,298,-170,325,-127);
 const cornea=new THREE.Mesh(new THREE.ExtrudeGeometry(corneaShape,{depth:18,bevelEnabled:true,bevelThickness:2,bevelSize:1.8,bevelSegments:6,curveSegments:64}),material('#a2d6e0',{roughness:.14,transmission:.35,thickness:15,ior:1.35,clearcoat:1,clearcoatRoughness:.08}));cornea.position.z=9;cornea.castShadow=true;scene.add(cornea);
 const lens=new THREE.Mesh(new THREE.SphereGeometry(70,96,64),material('#b0e0df',{roughness:.12,transmission:.48,thickness:24,ior:1.46,clearcoat:1,clearcoatRoughness:.1,envMapIntensity:.55}));lens.position.set(365.54,-220,8);lens.scale.set(.4,1,.65);lens.castShadow=true;scene.add(lens);
 const cardShape=new THREE.Shape(),w=25,h=101,r=6;cardShape.moveTo(-w+r,-h);cardShape.lineTo(w-r,-h);cardShape.quadraticCurveTo(w,-h,w,-h+r);cardShape.lineTo(w,h-r);cardShape.quadraticCurveTo(w,h,w-r,h);cardShape.lineTo(-w+r,h);cardShape.quadraticCurveTo(-w,h,-w,h-r);cardShape.lineTo(-w,-h+r);cardShape.quadraticCurveTo(-w,-h,-w+r,-h);
 const card=new THREE.Mesh(new THREE.ExtrudeGeometry(cardShape,{depth:5,bevelEnabled:true,bevelThickness:1.4,bevelSize:1.3,bevelSegments:4}),material('#fffbed',{roughness:.53}));card.position.set(64,-220,35);card.rotation.y=-.16;card.castShadow=true;card.visible=!options.correction;scene.add(card);
 // Section 8 reuses the same cutaway, with a separate spectacle and axial model.
 const axialParts=[shell,bowl,cut,band,shadow].map(mesh=>({mesh,x:mesh.position.x,sx:mesh.scale.x}));
 const spectacles={};
 if(options.correction){
  for(const type of ['concave','convex']){
   const shape=new THREE.Shape();
   if(type==='concave'){shape.moveTo(-17,-96);shape.bezierCurveTo(-11,-60,-3,-25,-3,0);shape.bezierCurveTo(-3,25,-11,60,-17,96);shape.lineTo(17,96);shape.bezierCurveTo(11,60,3,25,3,0);shape.bezierCurveTo(3,-25,11,-60,17,-96);}
   else{shape.moveTo(0,-96);shape.bezierCurveTo(-29,-55,-29,55,0,96);shape.bezierCurveTo(29,55,29,-55,0,-96);}
   shape.closePath();const mesh=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:12,bevelEnabled:true,bevelThickness:1,bevelSize:1,bevelSegments:4,curveSegments:64}),material('#b4e2dc',{roughness:.15,transmission:.4,thickness:12,ior:1.45,clearcoat:1}));
   mesh.position.set(178.45,-220,16);mesh.visible=false;scene.add(mesh);spectacles[type]=mesh;
  }
 }
 let pending=0;
 function render(){pending=0;const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(r.width,r.height,false);renderer.render(scene,camera);}
 function request(){if(!pending)pending=requestAnimationFrame(render);}
 const observer=new ResizeObserver(request);observer.observe(canvas);
 function update(state){if(options.correction){const ratio=state.retina;for(const {mesh,x,sx}of axialParts){mesh.position.x=302+(x-302)*ratio;mesh.scale.x=sx*ratio;}lens.scale.x=20.7/70;card.position.x=54;for(const [type,mesh]of Object.entries(spectacles))mesh.visible=state.lens===type;request();return;}lens.scale.x=(17+22*state.accommodation/100)/70;card.position.x=state.distance==='far'?64:155;request();}
 request();
 return{update,scene,camera,renderer,lens,card,shell,band,cornea,spectacles,dispose(){observer.disconnect();if(pending)cancelAnimationFrame(pending);scene.traverse(m=>{m.geometry?.dispose();if(m.material)m.material.dispose();});environment.dispose();shadowTex.dispose();bgTex.dispose();renderer.dispose();}};
}
