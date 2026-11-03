import * as THREE from '../../4.1/assets/vendor/three/build/three.module.js';

// Appearance only: the existing RGB model still determines reflection/absorption.
// The sparse paths visualize diffuse reflection, not a measured angular profile.
const AXIS=1.65;
function paperTexture(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
 const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(256,256);let seed=3417;
 for(let i=0;i<pixels.data.length;i+=4){
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  const value=226+(seed>>>27);pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=value;pixels.data[i+3]=255;
 }
 ctx.putImageData(pixels,0,0);
 ctx.strokeStyle='rgba(255,255,255,.12)';ctx.lineWidth=.5;
 for(let i=0;i<90;i++){const x=(i*47)%256,y=(i*83)%256;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+2,y+6);ctx.stroke();}
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
function beamTexture(){
 const canvas=document.createElement('canvas');canvas.width=64;canvas.height=128;
 const ctx=canvas.getContext('2d'),image=ctx.createImageData(64,128);
 for(let y=0;y<128;y++)for(let x=0;x<64;x++){
  const across=Math.max(0,1-((x/63-.5)*2)**2)**2,along=Math.sin(Math.PI*y/127)**.65,i=(y*64+x)*4;
  image.data[i]=image.data[i+1]=image.data[i+2]=255;image.data[i+3]=Math.round(255*across*along);
 }ctx.putImageData(image,0,0);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
function incomingBeam(texture,color){
 const group=new THREE.Group();group.name='surface-incident-light-path';
 const from=new THREE.Vector3(-3.19,AXIS,0),to=new THREE.Vector3(-.035,AXIS,0);
 const material=new THREE.MeshBasicMaterial({color,map:texture,transparent:true,opacity:.26,side:THREE.DoubleSide,depthWrite:false,toneMapped:false,forceSinglePass:true});
 // Crossed soft ribbons preserve the illumination volume while orbiting.
 for(let i=0;i<3;i++){
  const angle=i*Math.PI/3,across=new THREE.Vector3(0,Math.cos(angle),Math.sin(angle));
  const points=[from.clone().addScaledVector(across,-.16),to.clone().addScaledVector(across,-.56),to.clone().addScaledVector(across,.56),from.clone().addScaledVector(across,.16)];
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(points.flatMap(p=>p.toArray()),3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,0,1,1,1,1,0],2));geometry.setIndex([0,1,2,0,2,3]);
  group.add(new THREE.Mesh(geometry,material));
 }return group;
}
function reflectedPath(from,to,color,opacity){
 const points=[],progress=[];
 for(let i=0;i<=20;i++){const t=i/20;points.push(...from.clone().lerp(to,t).toArray());progress.push(t);}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));geometry.setAttribute('progress',new THREE.Float32BufferAttribute(progress,1));
 const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{color:{value:color},opacity:{value:opacity}},
  vertexShader:`attribute float progress;varying float vProgress;
   void main(){vProgress=progress;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`uniform vec3 color;uniform float opacity;varying float vProgress;
   void main(){float fade=pow(1.-vProgress,1.25)*smoothstep(0.,.035,vProgress);
    gl_FragColor=vec4(color,opacity*fade);
    #include <colorspace_fragment>
   }`});
 const line=new THREE.Line(geometry,material);line.name='surface-diffuse-light-path';return line;
}
export function createSurfaceAppearance(scene,card){
 const grain=paperTexture(),beamMap=beamTexture();
 card.material.dispose();card.material=new THREE.MeshStandardMaterial({color:new THREE.Color(),map:grain,bumpMap:grain,bumpScale:.006,metalness:0,roughness:1,side:THREE.DoubleSide,shadowSide:THREE.DoubleSide});
 card.castShadow=true;card.receiveShadow=true;
 const light=new THREE.SpotLight('#ffffff',8,5,.18,1,2);light.position.set(-3.19,AXIS,0);
 light.target.position.set(0,AXIS,0);light.castShadow=true;light.shadow.mapSize.set(512,512);light.shadow.bias=-.0002;light.shadow.normalBias=.001;
 scene.add(light,light.target);
 return {illuminate(signal){light.color.setRGB(...signal.incoming);},update(signal,group){
  group.add(incomingBeam(beamMap,new THREE.Color().setRGB(...signal.incoming)));
  const peak=Math.max(...signal.outgoing),color=new THREE.Color().setRGB(...signal.outgoing);
  // Different starts within the illuminated area, all leaving the same front side.
  const paths=[
   [[-.10,-.16],[-2.5,AXIS+.65,-1.15]],
   [[.12,.09],[-2.15,AXIS+.30,1.55]],
   [[.02,-.22],[-1.65,AXIS-.45,-1.85]],
   [[-.18,.07],[-2.65,AXIS-.60,.85]],
   [[.20,-.02],[-1.50,AXIS+.75,.45]],
   [[-.04,.20],[-1.65,AXIS-.15,2.05]],
   [[.07,.00],[-2.85,AXIS+.05,-.45]]
  ];
  paths.forEach(([offset,end],i)=>{
   const from=new THREE.Vector3(-.025,AXIS+offset[0],offset[1]),to=new THREE.Vector3(...end);
   group.add(reflectedPath(from,to,color,peak*.85));
   if(i===1||i===5){
    const arrow=new THREE.Mesh(new THREE.ConeGeometry(.021,.085,8),new THREE.MeshBasicMaterial({color,transparent:true,opacity:peak*.45,depthWrite:false,toneMapped:false}));
    arrow.name='surface-diffuse-direction';arrow.position.copy(from).lerp(to,.57);
    arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),to.clone().sub(from).normalize());group.add(arrow);
   }
  });
 }};
}
