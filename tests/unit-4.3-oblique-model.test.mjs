import { test } from 'node:test';
import assert from 'node:assert/strict';
import { materials } from '../units/4/parts/4.3/assets/optics.mjs';
import { layout,media,clampAngle,geometry,boundaryMs,durationMs,snapshot,zoomViewBox } from '../units/4/parts/4.3/assets/oblique-incidence-model.mjs';

test('one optical plane obeys refraction from the actual normal for every selectable angle',()=>{
 for(let a=0;a<=60;a++)for(const m of media){const g=geometry(m,a),incoming=Math.atan2(g.hit[0]-g.source[0],g.hit[1]-g.source[1])*180/Math.PI,outgoing=Math.atan2(g.end[0]-g.hit[0],g.end[1]-g.hit[1])*180/Math.PI;assert.ok(Math.abs(incoming-a)<1e-10);assert.ok(Math.abs(outgoing-g.outgoing)<1e-10);assert.ok(Math.abs(Math.sin(incoming*Math.PI/180)-materials[m].n*Math.sin(outgoing*Math.PI/180))<1e-12);assert.deepEqual(g.hit,[650,570]);assert.equal(g.end[1],850);assert.ok(g.outgoing<=a&&g.end[0]<1045);}
});
test('the magnified crop centers exactly on the same entry point and omits the source',()=>{
 const [x,y,w,h]=zoomViewBox.split(' ').map(Number);assert.equal(x+w/2,layout.axis);assert.equal(y+h/2,layout.boundary);
 for(let a=0;a<=60;a++)for(const m of media){const g=geometry(m,a);assert.ok(g.source[0]<x||g.source[0]>x+w||g.source[1]<y||g.source[1]>y+h);assert.ok(g.end[1]>y+h);}
});
test('water and glass share the incident geometry, retain correct 45-degree readings and the zero exception',()=>{
 for(const a of [0,30,45,60]){const water=geometry('water',a),glass=geometry('glass',a);assert.deepEqual(water.source,glass.source);assert.deepEqual(water.hit,glass.hit);if(a)assert.ok(glass.outgoing<water.outgoing&&water.outgoing<a);else for(const g of [water,glass]){assert.equal(g.outgoing,0);assert.equal(g.source[0],g.hit[0]);assert.equal(g.end[0],g.hit[0]);}}
 assert.equal(geometry('water',45).outgoing.toFixed(1),'32.0');assert.equal(geometry('glass',45).outgoing.toFixed(1),'28.1');assert.equal(clampAngle(-5),0);assert.equal(clampAngle(80),60);assert.equal(clampAngle(NaN),45);
});
test('continuous fronts reach the interface, then follow the refracted segment and stop at the selected endpoint',()=>{
 for(const m of media)for(const a of [0,30,45,60]){assert.deepEqual(snapshot(m,a,geometry(m,a).entryMs).front,geometry(m,a).hit);let last=0;for(const time of [0,200,geometry(m,a).entryMs,geometry(m,a).entryMs+100,2500,durationMs(m,a),1e5]){const g=snapshot(m,a,time),p=g.entered?g.hit:g.source,q=g.entered?g.end:g.hit;assert.ok(Math.abs((g.front[0]-p[0])*(q[1]-p[1])-(g.front[1]-p[1])*(q[0]-p[0]))<1e-8);assert.ok(g.front[1]>=last&&g.front[1]<=layout.end);last=g.front[1];}const done=snapshot(m,a,durationMs(m,a));assert.equal(done.arrived,true);assert.deepEqual(done.front,done.end);}
});

test('the outward lamp stays inside the optical scene and the faster demonstration still uses medium speeds',()=>{for(const m of media)for(let a=0;a<=60;a++){const g=geometry(m,a);assert.ok(g.sourceRadius>=230&&g.sourceRadius<=300);assert.ok(g.source[1]>=340-1e-8);assert.ok(durationMs(m,a)<3600);assert.equal(snapshot(m,a,g.entryMs).entered,true);assert.equal(snapshot(m,a,g.entryMs-1).entered,false);}assert.ok(Math.hypot(...geometry('water',45).source.map((v,i)=>v-[650,570][i]))>290);});
