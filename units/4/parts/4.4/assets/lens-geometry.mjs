// Rotate the actual radial thickness profile around the optical (x) axis.
// Keeping the whole disk makes its edge and curved faces correct in every view.
export function createLensGeometry(THREE,{radius,halfThickness,segments=80}){
 const profile=[];for(let i=0;i<=segments;i++){const r=radius*i/segments;profile.push(new THREE.Vector2(r,-halfThickness(r)));}for(let i=segments;i>=0;i--){const r=radius*i/segments;profile.push(new THREE.Vector2(r,halfThickness(r)));}
 const geometry=new THREE.LatheGeometry(profile,96);geometry.rotateZ(-Math.PI/2);geometry.userData={representation:'rotational-lens',radius,centerThickness:2*halfThickness(0),edgeThickness:2*halfThickness(radius)};return geometry;
}

// Transparent glass keeps both curved faces readable instead of hiding the
// waist behind a dark, cylindrical outer edge. All contours lie on the lens.
export function createLensVisual(THREE,{radius,halfThickness,index=1.5}){
 const geometry=createLensGeometry(THREE,{radius,halfThickness});
 const glass=new THREE.MeshPhysicalMaterial({color:'#d5ede7',metalness:0,roughness:.24,transparent:true,opacity:.19,transmission:0,ior:index,clearcoat:.25,depthWrite:false,side:THREE.DoubleSide});
 const lens=new THREE.Mesh(geometry,glass);lens.userData.presentation='clear-curved-glass';
 function line(points,color,opacity,name){const m=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color,transparent:true,opacity,depthWrite:false,toneMapped:false}));m.name=name;m.raycast=()=>{};m.renderOrder=3;lens.add(m);}
 for(const side of [-1,1]){
  const meridian=[],rim=[];
  for(let i=0;i<=128;i++){const y=-radius+2*radius*i/128;meridian.push(new THREE.Vector3(side*halfThickness(Math.abs(y)),y,0));const angle=2*Math.PI*i/128;rim.push(new THREE.Vector3(side*halfThickness(radius),radius*Math.cos(angle),radius*Math.sin(angle)));}
  line(meridian,'#365e56',.85,'curved-face-profile');
  line(rim,'#d5ece5',.38,'glass-edge');
 }
 return lens;
}
