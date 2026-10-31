import {DECIBEL_SCENES} from './decibel-model.mjs?v=1';
const caches=new WeakMap();
export async function loadDecibelRecording(key,context){
 if(!DECIBEL_SCENES.some(scene=>scene.key===key))throw Error('Unknown scene');
 if(!caches.has(context))caches.set(context,new Map());
 const cache=caches.get(context);
 if(!cache.has(key))cache.set(key,(async()=>{
  const response=await fetch(new URL(`./decibel-audio/${key}.wav?v=1`,import.meta.url));
  if(!response.ok)throw Error('Scene recording unavailable');
  return context.decodeAudioData(await response.arrayBuffer());
 })().catch(error=>{cache.delete(key);throw error;}));
 return cache.get(key);
}
// 成品已作響度安排；播放不再依 dBA 加大增益。
export function createDecibelVoice(context,buffer){
 const source=context.createBufferSource(),gain=context.createGain();
 source.buffer=buffer;source.connect(gain);gain.connect(context.destination);
 const now=context.currentTime;gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(1,now+.025);
 source.addEventListener('ended',()=>{source.disconnect();gain.disconnect();},{once:true});
 return {source,start:()=>source.start(),stop(){
  const now=context.currentTime;
  gain.gain.cancelAndHoldAtTime(now);gain.gain.linearRampToValueAtTime(0,now+.03);
  try{source.stop(now+.035);}catch{}
 }};
}
