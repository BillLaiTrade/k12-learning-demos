import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CO2_OPERATIONS as ops,co2OperationFrame as frame,co2BenchFrame as bench,CO2_GLASS_ROD_LENGTH as rodLength,rubberGeometry,transformPoint,liquidGeometry,CO2_LIQUID_PROFILE} from '../units/2/parts/2.3/assets/co2-model.mjs';
const close=(a,b,tol=.001)=>assert.ok(Math.abs(a-b)<tol,`${a} ≈ ${b}`);
test('seven operations merge real apparatus positioning into adding marble',()=>{
 assert.equal(ops.length,7);assert.equal(ops[1].label,'加入大理石');assert.ok(!ops.some(op=>op.label==='擺好集氣位置'));
 assert.deepEqual(bench(0,0),bench(1,0));
 assert.equal(frame(1,3600).placement,1);assert.equal(frame(1,3600).dishCount,5);
 assert.equal(frame(1,18000).flaskCount,5);assert.equal(frame(1,18000).acid,0);
});
test('five individual textured stones transfer once, through the neck, and never duplicate',()=>{
 for(let t=0;t<=18000;t+=10){
  const f=frame(1,t),p=bench(1,t);assert.equal(f.dishCount+f.fallingCount+f.flaskCount,5);
  assert.equal(p.stones.filter(s=>s.location==='dish').length,f.dishCount);
  assert.equal(p.stones.filter(s=>s.location==='flask').length,f.flaskCount);
  assert.equal(new Set(p.stones.map(s=>s.id)).size,5);
  for(const s of p.stones)if(s.location==='falling'&&s.inside){
   const body=p.bodies.flask,local=transformPoint({x:s.x-body.cx,y:s.y-body.cy},{x:body.cx,y:body.cy,angle:-body.angle});
   if(local.y<=300)close(local.x,300);
   if(local.y>350&&local.y<500)assert.ok(local.x>340,'stone follows lower side wall rather than free-falling down the center');
  }
 }
 assert.deepEqual(bench(1,18000).stones.map(s=>s.location),Array(5).fill('flask'));
 assert.ok(bench(1,18000).bowl.x+110<0);assert.equal(bench(2,5000).bodies.acid.visible,false);
});
test('every operation meets the next without a position, angle, liquid or quantity jump',()=>{
 for(let i=1;i<6;i++){
  const end=bench(i,ops[i].duration),start=bench(i+1,0);
  for(const key of ['bodies','bowl','plate','glass','stones'])assert.deepEqual(end[key],start[key],`${i}/${key}`);
  for(const key of ['acid','seal','cover','dishCount','flaskCount'])assert.equal(frame(i,ops[i].duration)[key],frame(i+1,0)[key]);
 }
});
test('rigid glass moves by translation and rotation; rubber keeps its own fixed arc length',()=>{
 for(let i=0;i<ops.length;i++)for(let t=0;t<=ops[i].duration;t+=80){
  const g=bench(i,t).glass,top=transformPoint({x:0,y:-rodLength},g.rod);
  close(Math.hypot(top.x-g.rod.x,top.y-g.rod.y),260);
  const hose=rubberGeometry(g.firstConnector,g.rodConnector,g.bendAngle);close(hose.length,500,.002);
  assert.ok(Math.hypot(g.rodConnector.x-g.firstConnector.x,g.rodConnector.y-g.firstConnector.y)<=500);
 }
});
test('the full collecting rod clears the jar rim before crossing; purge remains outside',()=>{
 for(let t=0;t<=2800;t+=20){const f=frame(4,t);assert.equal(f.tipX,600);assert.equal(f.collecting,false);assert.equal(f.flow,true);}
 for(const i of [5,6])for(let t=0;t<=ops[i].duration;t+=20){
  const f=frame(i,t);if(f.tipX>600&&f.tipX<870)close(f.tipY,270);
  if(f.cover>0){close(f.tipX,600);close(f.tipY,520);}
  if(f.collecting){close(f.tipX,870);close(f.tipY,520);}
 }
 const done=frame(6,6500);assert.equal(done.cover,1);assert.equal(done.labeled,true);
 assert.deepEqual(bench(6,6500).plate,{x:870,y:315,angle:0});
});
test('acid uses the photographed inner curved bottom, with sloping walls and a level surface',()=>{
 const liquid=liquidGeometry(500);assert.ok(liquid.points.length>12);
 assert.equal(liquid.points.filter(p=>p.y===500).length,2);assert.ok(liquid.right>liquid.left);
 const bottom=liquid.points.filter(p=>p.y>560);assert.ok(new Set(bottom.map(p=>p.y)).size>3);
 for(const p of liquid.points)assert.ok(p.y>=500&&p.y<=Math.max(...CO2_LIQUID_PROFILE.map(v=>v.y)));
});

test('marble is placed with forceps in a tilted flask while the dish remains level on the bench',()=>{
 const p=bench(1,6300);assert.equal(p.bowl.angle,0);assert.equal(p.bowl.x,520);assert.equal(p.bowl.y,500);assert.equal(p.bodies.flask.angle,-28);assert.equal(p.tool.gripping,true);assert.equal(p.tool.visible,true);
 const moving=p.stones.find(s=>s.location==='falling');close(p.tool.x,moving.x);close(p.tool.y,moving.y);assert.equal(bench(1,18000).bodies.flask.angle,0);
});
test('acid stream starts at the real transformed open-bottle lip and the neck stays outside the flask',()=>{
 for(let t=700;t<3200;t+=25){const p=bench(2,t),b=p.bodies.acid;close(p.acidMouth.x,304);close(p.acidMouth.y,174);assert.equal(b.angle,-65);assert.ok(p.acidMouth.y<200);assert.ok(b.cx>330);}
});

test('forceps enter and leave through the top without popping in over the bench',()=>{
 assert.equal(bench(1,4700).tool.y,-60);assert.equal(bench(1,16600).tool.y,-60);let prior=bench(1,4700).tool;
 for(let t=4716;t<16600;t+=16){const current=bench(1,t).tool;assert.ok(Math.hypot(current.x-prior.x,current.y-prior.y)<60,`tool jump at ${t}`);prior=current;}
});
