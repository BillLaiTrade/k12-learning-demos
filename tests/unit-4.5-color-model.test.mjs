import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PRISM,SCREEN_RANGE,prismTrace,prismRays,glassIndex,refract,linearToSrgb,addLight,mixAt,mixPreset,materialLight,filterLight,eyeLight,LIGHTS,MATERIALS,FILTERS,colorName} from '../units/4/parts/4.5/assets/color-model.mjs';
const near=(a,b,e=1e-9)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
const vector=(a,b)=>b.map((v,i)=>v-a[i]);
const norm=v=>{const n=Math.hypot(...v);return v.map(x=>x/n)};
const cross=(a,b)=>a[0]*b[1]-a[1]*b[0];
function edgeAt(p){return PRISM.map((a,i)=>({a,b:PRISM[(i+1)%3]})).find(({a,b})=>Math.abs(cross(vector(a,b),vector(a,p)))<1e-7)}
test('連續可見光實際通過三角玻璃兩個介面，符合司乃耳關係與固定白幕範圍',()=>{
 let last=-Infinity;for(let wavelength=380;wavelength<=740;wavelength++){
  const r=prismTrace(wavelength);assert.equal(r.points.length,4);const [a,b,c,d]=r.points;
  for(const [p,incoming,outgoing,n1,n2]of [[b,norm(vector(a,b)),norm(vector(b,c)),1,glassIndex(wavelength)],[c,norm(vector(b,c)),norm(vector(c,d)),glassIndex(wavelength),1]]){
   const edge=edgeAt(p);assert.ok(edge);const tangent=norm(vector(edge.a,edge.b));const sine=v=>Math.abs(v[0]*tangent[0]+v[1]*tangent[1]);near(n1*sine(incoming),n2*sine(outgoing));
  }
  assert.ok(r.landing>last);last=r.landing;assert.ok(r.landing>SCREEN_RANGE[0]&&r.landing<SCREEN_RANGE[1]);assert.ok(r.out[0]>0);
 }
 assert.ok(prismTrace(400).deviation>prismTrace(700).deviation);
});
test('移開玻璃不分色；單色輸入只偏折，不產生彩色帶',()=>{
 assert.equal(prismRays('white').length,73);assert.equal(new Set(prismRays('white').map(r=>r.landing)).size,73);
 for(const light of Object.keys(LIGHTS)){
  const removed=prismRays(light,false);assert.ok(removed.every(r=>r.landing===0&&r.deviation===0&&r.points.length===2));
  if(light!=='white'){const r=prismRays(light,true);assert.equal(r.length,1);assert.equal(r[0].points.length,4);}
 }
 near(refract([1,0],[-1,0],1,1.5)[1],0);
});
test('色光以線性強度相加後轉為顯示值，三原色與兩色交集正確',()=>{
 near(linearToSrgb(.5),.7353569830524495);near(linearToSrgb(0),0);near(linearToSrgb(1),1);
 assert.deepEqual(addLight([.2,.3,0],[.3,.2,1]),[.5,.5,1]);
 const together=mixPreset('together');assert.equal(colorName(mixAt(.5,.5,together)),'白色');
 for(const [off,name]of [[0,'青色'],[1,'洋紅色'],[2,'黃色']]){const spots=mixPreset('together');spots[off].on=false;assert.equal(colorName(mixAt(.5,.5,spots)),name);}
 assert.deepEqual(mixAt(.5,.5,together.map(s=>({...s,on:false}))),[0,0,0]);
 const apart=mixPreset('apart');for(let i=0;i<3;i++)assert.deepEqual(mixAt(apart[i].x,apart[i].y,apart),[0,1,2].map(c=>c===i?1:0));
});
test('所有照明與材料組合逐色守恆，缺少入射色光時材料不自行發光',()=>{
 for(const light of Object.keys(LIGHTS))for(const [materials,compute]of [[MATERIALS,materialLight],[FILTERS,filterLight]])for(const material of Object.keys(materials)){
  const s=compute(light,material);for(let c=0;c<3;c++){near(s.outgoing[c]+s.absorbed[c],s.incoming[c]);assert.ok(s.outgoing[c]>=0&&s.outgoing[c]<=s.incoming[c]);if(s.incoming[c]===0)near(s.outgoing[c],0);}
 }
 assert.equal(colorName(materialLight('green','red').outgoing),'很暗，接近黑色');assert.equal(colorName(materialLight('blue','white').outgoing),'藍色');
 assert.equal(colorName(filterLight('white','green').outgoing),'綠色');assert.equal(colorName(filterLight('red','green').outgoing),'很暗，接近黑色');
});
test('遮光板只阻斷到眼睛的光，不改變光源或材料已離開的光',()=>{
 for(const mode of ['reflection','transmission']){const open=eyeLight(mode,false),blocked=eyeLight(mode,true);assert.deepEqual(blocked.incoming,open.incoming);assert.deepEqual(blocked.outgoing,open.outgoing);assert.deepEqual(blocked.received,[0,0,0]);assert.deepEqual(open.received,open.outgoing);assert.equal(colorName(open.received),'綠色');}
});
