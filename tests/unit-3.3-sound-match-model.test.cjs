const {test,before}=require('node:test'),assert=require('node:assert/strict'),{readFile}=require('node:fs/promises'),path=require('node:path');
let MATCH_TONES,MATCH_QUESTIONS,matchClip,matchWavePath,compareMatch;
const clips=new Map();
before(async()=>{
 const {decodePCM}=await import('../units/3/parts/3.3/assets/timbre-model.mjs');
 ({MATCH_TONES,MATCH_QUESTIONS,matchClip,matchWavePath,compareMatch}=await import('../units/3/parts/3.3/assets/sound-match-model.mjs'));
 for(const tone of MATCH_TONES){const bytes=await readFile(path.resolve(__dirname,`../units/3/parts/3.3/assets/timbre-audio/${tone}.wav`));clips.set(tone,decodePCM(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)));}
});
const rms=a=>Math.sqrt(a.reduce((s,v)=>s+v*v,0)/a.length);
test('four tasks cover each source, start differently, and have reachable correct settings',()=>{
 assert.equal(MATCH_QUESTIONS.length,4);assert.equal(new Set(MATCH_QUESTIONS.map(q=>q.tone)).size,3);
 for(const q of MATCH_QUESTIONS){assert.notEqual(q.tone,q.start.tone);assert.equal(compareMatch(q.start,q).correct,false);assert.equal(compareMatch(q,q).correct,true);assert.equal((q.frequency-220)%5,0);assert.ok(Math.abs((q.amplitude-.25)/.05-Math.round((q.amplitude-.25)/.05))<1e-8);}
 const q=MATCH_QUESTIONS[0];assert.equal(compareMatch({...q,frequency:q.frequency*1.02,amplitude:q.amplitude+.05},q).correct,true);assert.equal(compareMatch({...q,frequency:q.frequency*1.04},q).frequency,false);assert.equal(compareMatch({...q,amplitude:q.amplitude+.1},q).amplitude,false);
});
test('actual resampled PCM stays bounded; frequency changes duration; amplitude scales the same signal',()=>{
 for(const tone of MATCH_TONES){
  const original=clips.get(tone),a=matchClip(original,{tone,frequency:440,amplitude:.4}),b=matchClip(original,{tone,frequency:440,amplitude:.8});
  assert.ok(Math.abs(rms(b.samples)/rms(a.samples)-2)<1e-6);
  for(const frequency of [220,330,440,550,660]){
   const out=matchClip(original,{tone,frequency,amplitude:1});assert.equal(out.rate,48000);assert.ok(out.samples.every(v=>Number.isFinite(v)&&Math.abs(v)<=.600001));assert.equal(out.samples[0],0);assert.ok(Math.abs(out.samples.at(-1))<.002);
   assert.ok(Math.abs(out.samples.length/out.rate-original.samples.length/original.rate*440/frequency)<1/48000);
   const path=matchWavePath(out),points=[...path.matchAll(/[ML]([\d.]+) ([-\d.]+)/g)];assert.ok(points.length>=479);
   const first=Math.ceil(out.start*out.rate);
   for(let i=0;i<points.length;i++){assert.ok(Math.abs(Number(points[i][1])-(8+((first+i)/out.rate-out.start)/.01*884))<.00006);assert.ok(Math.abs(Number(points[i][2])-(70-100*out.samples[first+i]))<.00006);}
  }
 }
});
test('pure tone buffer has the selected pitch and input validation rejects invalid recipes',()=>{
 for(const frequency of [220,330,440,550,660]){const out=matchClip(clips.get('pure'),{tone:'pure',frequency,amplitude:.7});let crossings=0;for(let i=4801;i<28800;i++)if(out.samples[i-1]<0&&out.samples[i]>=0)crossings++;assert.ok(Math.abs(crossings/.5-frequency)<3);}
 for(const settings of [{tone:'other',frequency:440,amplitude:.5},{tone:'pure',frequency:0,amplitude:.5},{tone:'pure',frequency:440,amplitude:2}])assert.throws(()=>matchClip(clips.get('pure'),settings));
});
