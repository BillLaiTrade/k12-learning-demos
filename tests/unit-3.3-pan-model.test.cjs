const {test}=require('node:test'),assert=require('node:assert/strict');
const {PAN_LENGTHS,PAN_SECONDS,panFrequency,panGeometry,panDisplacement}=require('../units/3/parts/3.3/assets/pan-model.mjs');
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
test('all recorded pipe files carry attribution, have audible bounded PCM and correct duration',()=>{
 const fs=require('node:fs'),path=require('node:path'),folder=path.resolve(__dirname,'../units/3/parts/3.3/assets/pan-audio');
 const manifest=JSON.parse(fs.readFileSync(path.join(folder,'recordings.json'),'utf8'));assert.equal(manifest.author,'mrshoes');assert.equal(manifest.license,'CC BY 4.0');assert.match(manifest.source_url,/278175/);
 for(const [i,record]of manifest.recordings.entries()){
  const b=fs.readFileSync(path.join(folder,record.file));assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.readUInt16LE(22),1);assert.equal(b.readUInt16LE(34),16);const rate=b.readUInt32LE(24),n=b.readUInt32LE(40)/2;
  assert.equal(n/rate,PAN_SECONDS);let sum=0,peak=0;for(let j=0;j<n;j++){const value=b.readInt16LE(44+2*j)/32768;peak=Math.max(peak,Math.abs(value));if(j>=rate*.2&&j<rate*.7)sum+=value*value;}assert.ok(Math.sqrt(sum/(rate*.5))>.25);assert.ok(peak<.9);assert.equal(b.readInt16LE(44),0);assert.equal(b.readInt16LE(44+(n-1)*2),0);
  assert.ok(Math.abs(record.measured_hz-panFrequency(PAN_LENGTHS[i]))<.1);assert.equal(require('node:crypto').createHash('sha256').update(b).digest('hex'),record.sha256);
 }
});
