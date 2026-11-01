const {test,before}=require('node:test'),assert=require('node:assert/strict'),{readFile}=require('node:fs/promises'),path=require('node:path');
let MATCH_TONES,MATCH_LEVELS,MATCH_QUESTIONS,createMatchDeck,matchClip,matchWavePath,compareMatch;
const clips=new Map();
before(async()=>{
 const {decodePCM}=await import('../units/3/parts/3.3/assets/timbre-model.mjs');
 ({MATCH_TONES,MATCH_LEVELS,MATCH_QUESTIONS,createMatchDeck,matchClip,matchWavePath,compareMatch}=await import('../units/3/parts/3.3/assets/sound-match-model.mjs'));
 for(const tone of MATCH_TONES){const bytes=await readFile(path.resolve(__dirname,`../units/3/parts/3.3/assets/timbre-audio/${tone}.wav`));clips.set(tone,decodePCM(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)));}
});
const rms=a=>Math.sqrt(a.reduce((s,v)=>s+v*v,0)/a.length);
test('45 independent targets cover all combinations and have reachable differing starts',()=>{
 assert.equal(MATCH_QUESTIONS.length,45);assert.equal(new Set(MATCH_QUESTIONS.map(q=>`${q.tone}/${q.frequency}/${q.amplitude}`)).size,45);assert.equal(new Set(MATCH_QUESTIONS.map(q=>q.tone)).size,3);
 for(const q of MATCH_QUESTIONS){assert.notEqual(q.tone,q.start.tone);assert.notEqual(q.frequency,q.start.frequency);assert.notEqual(q.amplitude,q.start.amplitude);assert.equal(compareMatch(q.start,q).correct,false);assert.equal(compareMatch(q,q).correct,true);for(const state of [q,q.start]){assert.ok(MATCH_LEVELS.frequency.includes(state.frequency));assert.ok(MATCH_LEVELS.amplitude.includes(state.amplitude));}}
 const q=MATCH_QUESTIONS[0];assert.equal(compareMatch({...q,frequency:440},q).correct,false);assert.equal(compareMatch({...q,frequency:q.frequency*1.04},q).frequency,false);assert.equal(compareMatch({...q,amplitude:q.amplitude+.1},q).amplitude,false);
});
test('question deck remains usable beyond a round, exhausts every target and never immediately repeats',()=>{
 for(const random of [()=>0,()=>.999,Math.random]){
  const deck=createMatchDeck(random),picked=Array.from({length:135},()=>deck.next());
  assert.equal(picked[0],MATCH_QUESTIONS[0]);
  for(let i=1;i<picked.length;i++)assert.notEqual(picked[i],picked[i-1]);
  for(let i=0;i<3;i++)assert.equal(new Set(picked.slice(i*45,(i+1)*45)).size,45);
 }
});
test('actual resampled PCM stays bounded; frequency changes duration; amplitude scales the same signal',()=>{
 for(const tone of MATCH_TONES){
  const original=clips.get(tone),a=matchClip(original,{tone,frequency:440,amplitude:.3}),b=matchClip(original,{tone,frequency:440,amplitude:.6});
  assert.ok(Math.abs(rms(b.samples)/rms(a.samples)-2)<1e-6);
  for(const frequency of [220,330,440,550,660]){
   const out=matchClip(original,{tone,frequency,amplitude:.9});assert.equal(out.rate,48000);assert.ok(out.samples.every(v=>Number.isFinite(v)&&Math.abs(v)<=.600001));assert.equal(out.samples[0],0);assert.ok(Math.abs(out.samples.at(-1))<.002);
   assert.ok(Math.abs(out.samples.length/out.rate-original.samples.length/original.rate*440/frequency)<1/48000);
   const path=matchWavePath(out),points=[...path.matchAll(/[ML]([\d.]+) ([-\d.]+)/g)];assert.ok(points.length>=479);
   const first=Math.ceil(out.start*out.rate);
   for(let i=0;i<points.length;i++){assert.ok(Math.abs(Number(points[i][1])-(8+((first+i)/out.rate-out.start)/.01*884))<.00006);assert.ok(Math.abs(Number(points[i][2])-(70-100*out.samples[first+i]))<.00006);}
  }
 }
});
test('pure tone buffer has the selected pitch and input validation rejects invalid recipes',()=>{
 for(const frequency of [220,330,440,550,660]){const out=matchClip(clips.get('pure'),{tone:'pure',frequency,amplitude:.6});let crossings=0;for(let i=4801;i<28800;i++)if(out.samples[i-1]<0&&out.samples[i]>=0)crossings++;assert.ok(Math.abs(crossings/.5-frequency)<3);}
 for(const settings of [{tone:'pure',frequency:445,amplitude:.6},{tone:'pure',frequency:440,amplitude:.5},{tone:'other',frequency:440,amplitude:.5},{tone:'pure',frequency:0,amplitude:.5},{tone:'pure',frequency:440,amplitude:2}])assert.throws(()=>matchClip(clips.get('pure'),settings));
});
