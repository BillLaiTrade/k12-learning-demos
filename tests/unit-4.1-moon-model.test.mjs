import {test} from 'node:test';
import assert from 'node:assert/strict';
import {RADII,ORBIT,EARTH,SUN,LIGHT,MAIN_VIEW,orbitBasis,orbitAngle,lunarVector,positionsAt,reflectionState,rayPaths,observerAt,sphereBlocks,dot,sub,length,unit,cross} from '../units/4/parts/4.1/assets/moon-reflection-model.mjs';
test('月球始終繞地球中心、軌道角可反解，正方向與軌道北面一致',()=>{
 const basis=orbitBasis();for(let a=0;a<360;a+=3){const v=lunarVector(a),p=positionsAt(a);assert.ok(Math.abs(length(sub(p.moon,EARTH))-ORBIT.radius)<1e-10);assert.ok(Math.abs(dot(v,basis.normal))<1e-10);assert.ok(Math.abs(orbitAngle(v)-a)<1e-8);assert.ok(dot(cross(v,lunarVector(a+.1)),basis.normal)>0);}
});
test('整圈都有多個受光且可見的反射位置，光線不穿入月球或地球',()=>{
 for(let a=0;a<360;a+=3){const s=reflectionState(a),paths=rayPaths(s);assert.equal(s.patches.length,3,'角度'+a);
  s.patches.forEach((p,i)=>{assert.ok(dot(p.normal,LIGHT)>0);assert.ok(dot(p.normal,unit(sub(s.observer.eye,p.point)))>0);assert.ok(dot(p.normal,unit(MAIN_VIEW))>0);const ray=paths.incident[i];assert.ok(ray.start[0]<ray.end[0]);assert.ok(Math.abs(length(sub(ray.start,SUN))-RADII.sun)<.02);assert.ok(Math.abs(ray.start[1]-ray.end[1])<1e-10);assert.ok(Math.abs(ray.start[2]-ray.end[2])<1e-10);assert.equal(sphereBlocks(ray.start,ray.end,EARTH,RADII.earth),false);});
  for(const ray of [paths.reflected,...paths.scattered]){const n=unit(sub(ray.start,s.positions.moon));assert.ok(dot(n,sub(ray.end,ray.start))>0);assert.equal(sphereBlocks(ray.start,ray.end,s.positions.moon,RADII.moon),false);assert.equal(sphereBlocks(ray.start,ray.end,EARTH,RADII.earth),false);}
  assert.ok(length(sub(paths.reflected.end,s.observer.eye))<1e-10);
 }
});
test('代表人物始終站在地球表面，月球高於其地平線，光路終點在眼睛',()=>{
 for(let a=0;a<360;a+=5){const o=observerAt(a),moon=positionsAt(a).moon;assert.ok(Math.abs(length(sub(o.base,EARTH))-RADII.earth)<1e-10);assert.ok(dot(o.up,sub(moon,o.eye))>0);assert.ok(dot(o.up,MAIN_VIEW)>0);assert.ok(Math.abs(dot(o.right,o.up))<1e-10);assert.ok(Math.abs(dot(o.forward,o.up))<1e-10);assert.ok(length(sub(o.eye,o.base))>.49);}
});
