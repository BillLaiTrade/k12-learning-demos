import {test} from 'node:test';
import assert from 'node:assert/strict';
import {microscopeGeometry} from '../units/4/parts/4.4/assets/microscope-optics.mjs';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('物鏡形成倒立放大的實像，中間像位於目鏡焦距內',()=>{const g=microscopeGeometry();assert.ok(g.objective.u>g.objective.f&&g.objective.u<2*g.objective.f);assert.ok(g.first.v>0&&g.first.m< -1);assert.ok(g.intermediate>g.ocularFocus&&g.intermediate<g.separation);assert.ok(g.second.v<0&&g.second.m>1&&g.total<g.first.m);});
test('兩組透鏡的同一條光線連續，延長線交於同一最終虛像',()=>{const g=microscopeGeometry();for(const r of g.rays){close(r.lensHeight+g.intermediate*r.slope,g.first.m*r.objectHeight);close(r.lensHeight+g.separation*r.slope,r.ocularHeight);close(r.ocularHeight+g.second.v*r.exitSlope,g.total*r.objectHeight);close(Math.abs(r.eyeHeight),5);assert.ok(Math.abs(r.lensHeight)<40&&Math.abs(r.ocularHeight)<30);}for(const point of ['top','bottom']){const pair=g.rays.filter(r=>r.point===point);assert.equal(pair.length,2);assert.notEqual(pair[0].lensHeight,pair[1].lensHeight);}});
