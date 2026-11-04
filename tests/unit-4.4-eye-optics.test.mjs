import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EYE,initialEye,changeEye,eyeState,accommodationFor} from '../units/4/parts/4.4/assets/eye-optics.mjs';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
test('角膜固定、晶狀體獨立調節，同一物點兩條光在視網膜各自成像',()=>{
 for(const distance of ['far','near']){const s={...initialEye(),distance,accommodation:accommodationFor(distance)},g=eyeState(s);close(g.focus,EYE.retina);assert.equal(g.clear,true);for(const name of ['top','bottom']){const rays=g.rays.filter(r=>r.name===name);close(rays[0].retinaY,rays[1].retinaY);assert.ok(rays[0].objectY*rays[0].retinaY<0);}assert.ok(g.rays[0].retinaY!==g.rays[2].retinaY);}
});
test('兩段折射與傳播分別遵循等效薄透鏡關係，光不穿到視網膜後',()=>{
 for(const distance of ['far','near'])for(let a=0;a<=100;a+=5){const g=eyeState({...initialEye(),distance,accommodation:a});for(const r of g.rays){close(r.afterCornea,r.incoming-EYE.cornealPower*r.corneaY);close(r.lensY,r.corneaY+EYE.lens*r.afterCornea);close(r.outgoing,r.afterCornea-g.power*r.lensY);close(r.retinaY,r.lensY+(EYE.retina-EYE.lens)*r.outgoing);assert.ok(Math.abs(r.lensY)<.3);}assert.ok(Number.isFinite(g.focus)&&g.focus>EYE.lens);}
});
test('切近時保留調節而暫時失焦；調厚恢復清楚，切遠後需恢復較扁',()=>{
 let s=initialEye();assert.equal(eyeState(s).clear,true);s=changeEye(s,'distance','near');assert.equal(s.accommodation,initialEye().accommodation);assert.equal(eyeState(s).position,'behind');s=changeEye(s,'accommodation',accommodationFor('near'));assert.equal(eyeState(s).clear,true);s=changeEye(s,'distance','far');assert.equal(eyeState(s).position,'before');s=changeEye(s,'accommodation',accommodationFor('far'));assert.equal(eyeState(s).clear,true);
});
test('調節的厚度、會聚作用連續增強，光斑與模糊程度隨失焦連續改變',()=>{
 let last;for(let a=0;a<=100;a++){const g=eyeState({...initialEye(),distance:'near',accommodation:a});if(last){assert.ok(g.power>last.power&&g.thickness>last.thickness&&g.focus<last.focus);assert.ok(Math.abs(g.spread-last.spread)<.002);}last=g;}
 const s={...initialEye(),distance:'near'},target=accommodationFor('near');for(const delta of [2,8,15]){const near=eyeState({...s,accommodation:target+delta}),far=eyeState({...s,accommodation:target+delta+3});assert.ok(far.spread>near.spread);assert.ok(far.blur>=near.blur);}
});
test('輸入範圍受限，遠近切換保留光路與物點偏好',()=>{
 const s={...initialEye(),rays:false,point:'bottom'};for(const distance of ['far','near']){const n=changeEye(s,'distance',distance);assert.equal(n.rays,false);assert.equal(n.point,'bottom');assert.equal(n.accommodation,s.accommodation);}assert.equal(changeEye(s,'accommodation',-9).accommodation,0);assert.equal(changeEye(s,'accommodation',200).accommodation,100);assert.equal(changeEye(s,'accommodation',NaN),s);assert.equal(changeEye(s,'distance','unknown'),s);
});
