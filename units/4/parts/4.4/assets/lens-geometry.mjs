// Rotate the actual radial thickness profile around the optical (x) axis.
// Keeping the whole disk makes its edge and curved faces correct in every view.
export function createLensGeometry(THREE,{radius,halfThickness,segments=80}){
 const profile=[];for(let i=0;i<=segments;i++){const r=radius*i/segments;profile.push(new THREE.Vector2(r,-halfThickness(r)));}for(let i=segments;i>=0;i--){const r=radius*i/segments;profile.push(new THREE.Vector2(r,halfThickness(r)));}
 const geometry=new THREE.LatheGeometry(profile,96);geometry.rotateZ(-Math.PI/2);geometry.userData={representation:'rotational-lens',radius,centerThickness:2*halfThickness(0),edgeThickness:2*halfThickness(radius)};return geometry;
}
