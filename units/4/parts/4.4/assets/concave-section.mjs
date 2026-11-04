// A finite-depth central section exposes the concave contour without the
// projected outer circumference of a complete circular lens hiding the waist.
export function createConcaveSection(THREE,{halfHeight,halfThickness,depth=.16,segments=96}){
 const shape=new THREE.Shape();shape.moveTo(-halfThickness(halfHeight),-halfHeight);
 for(let i=1;i<=segments;i++){const y=-halfHeight+2*halfHeight*i/segments;shape.lineTo(-halfThickness(Math.abs(y)),y);}
 for(let i=segments;i>=0;i--){const y=-halfHeight+2*halfHeight*i/segments;shape.lineTo(halfThickness(Math.abs(y)),y);}shape.closePath();
 const geometry=new THREE.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:false,curveSegments:segments});geometry.translate(0,0,-depth/2);geometry.userData={representation:'central-section',depth,halfHeight};return geometry;
}
