const {test}=require('node:test'),assert=require('node:assert/strict');
const {PAN_LENGTHS,PAN_SECONDS,panFrequency,panGeometry,panDisplacement,panSamples}=require('../units/3/parts/3.3/assets/pan-model.mjs');
test('closed-end pipes have quarter-wave fundamentals and matched physical length scale',()=>{
 assert.equal(panFrequency(40),214.375);assert.equal(panFrequency(20),428.75);
 for(const [i,length]of PAN_LENGTHS.entries()){
  const g=panGeometry(i);assert.equal(g.bottom-g.open,length*8.5);
  assert.ok(Math.abs(panFrequency(length)*length-8575)<1e-9);
 }
 assert.equal(panGeometry(0).bottom-panGeometry(0).open,2*(panGeometry(5).bottom-panGeometry(5).open));
});
test('closed bottom is a displacement node; air oscillates locally on a common slow clock',()=>{
 for(let i=0;i<300;i++){
  const t=i/100;assert.equal(Math.abs(panDisplacement(0,t,214.375)),0);
  assert.ok(Math.abs(panDisplacement(1,t,428.75))<=8);
 }
 let previous=0,crossings=0;
 for(let i=1;i<=1000;i++){const v=panDisplacement(1,i/1000,400);if(previous<=1e-6&&v>1e-6)crossings++;previous=v;}
 assert.equal(crossings,4);assert.equal(panDisplacement(1,PAN_SECONDS,400),0);
});
test('all pipe sounds are audible, bounded and periodic at their displayed fundamental',()=>{
 for(const length of PAN_LENGTHS){
  const hz=panFrequency(length),rate=48000,a=panSamples(hz,rate);assert.equal(a.length,PAN_SECONDS*rate);assert.equal(a[0],0);assert.ok(Math.abs(a.at(-1))<.001);
  let sum=0,peak=0;for(let i=rate*.2;i<rate*.7;i++){sum+=a[i]**2;peak=Math.max(peak,Math.abs(a[i]));}
  assert.ok(Math.sqrt(sum/(rate*.5))>.45);assert.ok(peak<.92);
  let error=0,power=0;for(let i=10000;i<20000;i+=17){const j=i+rate/hz,n=Math.floor(j),f=j-n,b=a[n]*(1-f)+a[n+1]*f;error+=(a[i]-b)**2;power+=a[i]**2;}assert.ok(error/power<.0001);
 }
});
