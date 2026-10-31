const {test}=require('node:test'),assert=require('node:assert/strict');
test('guitar physical and audio model',async t=>{
const {GUITAR_SECONDS,BRIDGE_X,NUT_X,STRING_Y,fretLength,fretX,nearestFret,guitarFrequency,guitarEnvelope,guitarDisplacement,stringPath,guitarSamples}=require('../units/3/parts/3.3/assets/guitar-model.mjs');

await t.test('65cm A string and equal-tempered frets produce the expected notes and one octave at fret 12',()=>{
 assert.equal(fretLength(0),65);assert.equal(fretLength(12),32.5);
 assert.equal(guitarFrequency(0),110);assert.equal(guitarFrequency(12),220);
 const notes=[110,116.54094,123.47083,130.81278,138.59132,146.83238,155.56349,164.81378,174.61412,184.99721,195.99772,207.65235,220];
 for(let n=0;n<=12;n++){assert.ok(Math.abs(guitarFrequency(n)-notes[n])<.0001);assert.equal(nearestFret(fretX(n)),n);}
 assert.equal(fretX(0),NUT_X);assert.equal(fretX(12)-BRIDGE_X,(NUT_X-BRIDGE_X)/2);
 assert.equal(nearestFret(99999),0);assert.equal(nearestFret(-99999),12);
 assert.ok(Math.abs(guitarFrequency(0,2)/guitarFrequency(0)-Math.SQRT2)<1e-12);
 assert.ok(Math.abs(guitarFrequency(0,.5)/guitarFrequency(0)-Math.SQRT1_2)<1e-12);
});
await t.test('vibrating segment has fixed endpoints and a single fundamental arch, with common slowing and decay',()=>{
 const end=fretX(12),path=stringPath(end,40),points=[...path.matchAll(/[ML]([\d.]+) ([\d.]+)/g)].map(m=>[Number(m[1]),Number(m[2])]);
 assert.deepEqual(points[0],[BRIDGE_X,STRING_Y]);assert.deepEqual(points.at(-1),[end,STRING_Y]);
 assert.deepEqual(points[32],[(BRIDGE_X+end)/2,STRING_Y+40]);
 for(let i=1;i<=32;i++)assert.ok(points[i][1]>points[i-1][1]);
 for(let i=33;i<points.length;i++)assert.ok(points[i][1]<points[i-1][1]);
 let previous=0,changes=0;
 for(let i=1;i<=2000;i++){const t=i/1000,v=guitarDisplacement(t,200);if(previous<=1e-6&&v>1e-6)changes++;previous=v;}
 assert.equal(changes,4,'200Hz is shown as 2Hz on the common 100x slower clock');
 assert.equal(guitarEnvelope(0),0);assert.equal(guitarEnvelope(GUITAR_SECONDS),0);assert.ok(guitarEnvelope(.2)>guitarEnvelope(1));
});
await t.test('plucked harmonic sound has audible signal, natural decay, exact periodic pitch and clipping headroom',()=>{
 for(const hz of [110,220,110*Math.SQRT1_2,110*Math.SQRT2]){
  const rate=48000,samples=guitarSamples(hz,rate);
  assert.equal(samples.length,rate*GUITAR_SECONDS);assert.equal(samples[0],0);
  assert.ok(samples.every(x=>Number.isFinite(x)&&Math.abs(x)<.95));
  const rms=(start,end)=>Math.sqrt(samples.slice(start*rate,end*rate).reduce((sum,x)=>sum+x*x,0)/((end-start)*rate));
  assert.ok(rms(.05,.35)>.2,'initial output is audible, not the old low-level string signal');
  assert.ok(rms(.05,.35)>rms(1.4,1.7)*2);assert.ok(Math.abs(samples.at(-1))<.001);
  // Remove the shared envelope, then compare waveform one known period apart.
  const period=rate/hz;
  let error=0,power=0;
  for(let i=4800;i<9600;i+=11){
   const j=i+period,lo=Math.floor(j),fraction=j-lo;
   const a=samples[i]/guitarEnvelope(i/rate),b=(samples[lo]*(1-fraction)+samples[lo+1]*fraction)/guitarEnvelope(j/rate);
   error+=(a-b)**2;power+=a*a;
  }
  assert.ok(error/power<.00001,'audio periodicity matches the displayed fundamental');
 }
});

});
