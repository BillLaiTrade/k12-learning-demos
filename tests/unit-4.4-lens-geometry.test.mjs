import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../units/4/parts/4.1/assets/vendor/three/build/three.module.js';
import {createLensGeometry} from '../units/4/parts/4.4/assets/lens-geometry.mjs';
import {parallelModel} from '../units/4/parts/4.4/assets/parallel-optics.mjs';
const scale=.55;
function lens(kind){const g=parallelModel(kind),geometry=createLensGeometry(THREE,{radius:g.halfHeight*scale,halfThickness:r=>(g.thickness/2-g.left(r/scale))*scale}),mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));mesh.position.x=g.thickness*scale/2;mesh.updateMatrixWorld(true);return{g,geometry,mesh};}
test('凸凹鏡片都是完整圓形旋轉體，中央與邊緣厚度相反',()=>{
 for(const kind of ['convex','concave']){const{g,geometry}=lens(kind);geometry.computeBoundingBox();const b=geometry.boundingBox;assert.ok(Math.abs(b.max.y-b.min.y-2*g.halfHeight*scale)<1e-6);assert.ok(Math.abs(b.max.z-b.min.z-2*g.halfHeight*scale)<1e-6);const p=geometry.userData;assert.ok(kind==='convex'?p.centerThickness>p.edgeThickness:p.centerThickness<p.edgeThickness);}
});
test('轉到不同方向，等半徑處仍落在同一個玻璃曲面，不是拉伸的棱柱',()=>{
 for(const kind of ['convex','concave']){const{g,mesh}=lens(kind),r=1.2*scale;for(let i=0;i<12;i++){const theta=.019+i*Math.PI/6,cast=new THREE.Raycaster(new THREE.Vector3(-5,r*Math.cos(theta),r*Math.sin(theta)),new THREE.Vector3(1,0,0)),hit=cast.intersectObject(mesh)[0];assert.ok(hit,`${kind}, angle ${theta}`);assert.ok(Math.abs(hit.point.x-g.left(1.2)*scale)<.002);}}
});
test('兩次折射的進出點仍在實際旋轉鏡片表面上',()=>{
 for(const kind of ['convex','concave']){const{g,mesh}=lens(kind);for(const r of g.rays){const point=p=>new THREE.Vector3(p[0]*scale,-p[1]*scale,0),enter=point(r.enter),exit=point(r.exit),direction=exit.clone().sub(enter).normalize(),cast=new THREE.Raycaster(point(r.from),new THREE.Vector3(1,0,0));assert.ok(cast.intersectObject(mesh)[0].point.distanceTo(enter)<.002);cast.set(enter.clone().addScaledVector(direction,.002),direction);assert.ok(cast.intersectObject(mesh)[0].point.distanceTo(exit)<.002);}}
});
