import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const base=new URL('../units/3/parts/3.4/assets/',import.meta.url);
function wav(name){const b=readFileSync(new URL(name,base));assert.equal(b.toString('ascii',0,4),'RIFF');let p=12,rate,data;while(p+8<=b.length){const id=b.toString('ascii',p,p+4),n=b.readUInt32LE(p+4);if(id==='fmt '){assert.equal(b.readUInt16LE(p+8),1);assert.equal(b.readUInt16LE(p+10),1);rate=b.readUInt32LE(p+12);assert.equal(b.readUInt16LE(p+22),16);}if(id==='data')data=b.subarray(p+8,p+8+n);p+=8+n+(n%2);}return {rate,samples:Array.from({length:data.length/2},(_,i)=>data.readInt16LE(i*2)/32768)};}
test('paired synthetic audio has identical direct onset and timeline, nonzero reflections and no clipping',()=>{
 for(const kind of ['clap','speech']){const a=wav(`room-${kind}-bare.wav`),b=wav(`room-${kind}-treated.wav`);assert.equal(a.rate,24000);assert.equal(b.rate,a.rate);assert.equal(a.samples.length,b.samples.length);assert.deepEqual(a.samples.slice(0,96),b.samples.slice(0,96));assert.ok(a.samples.some((x,i)=>x!==b.samples[i]));for(const audio of[a,b]){const peak=Math.max(...audio.samples.map(Math.abs));assert.ok(peak>.2&&peak<.81);}}
 const a=wav('room-clap-bare.wav'),b=wav('room-clap-treated.wav'),energy=x=>x.slice(2400).reduce((s,y)=>s+y*y,0);assert.ok(energy(b.samples)>0);assert.ok(energy(b.samples)<energy(a.samples)*.2);
});
test('audio model preserves direct tap and includes 3D untreated surfaces',()=>{const m=JSON.parse(readFileSync(new URL('room-audio-model.json',base)));assert.equal(m.room_m.length,3);assert.equal(m.rirs[0].direct_tap,m.rirs[1].direct_tap);assert.ok(m.rirs[1].C50_dB>m.rirs[0].C50_dB);assert.ok(m.rirs[1].late_100ms_fraction>0);for(const kind of['clap','speech'])assert.equal(m.files[`room-${kind}-bare.wav`].common_gain,m.files[`room-${kind}-treated.wav`].common_gain);});
