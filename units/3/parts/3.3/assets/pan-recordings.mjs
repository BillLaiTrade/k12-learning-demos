const caches=new WeakMap();
export async function loadPanRecording(index,context){
 if(!Number.isInteger(index)||index<0||index>5)throw Error('Invalid pipe');
 if(!caches.has(context))caches.set(context,new Map());
 const cache=caches.get(context);
 if(!cache.has(index)){
  const pending=(async()=>{
   const response=await fetch(new URL(`./pan-audio/pipe-${index}.wav?v=1`,import.meta.url));
   if(!response.ok)throw Error('Pan recording unavailable');
   return context.decodeAudioData(await response.arrayBuffer());
  })().catch(error=>{cache.delete(index);throw error;});
  cache.set(index,pending);
 }
 return cache.get(index);
}
export function recordingLevel(buffer,seconds){
 if(seconds<=0||seconds>=buffer.duration)return 0;
 const a=buffer.getChannelData(0),center=Math.floor(seconds*buffer.sampleRate),radius=Math.ceil(buffer.sampleRate*.01),start=Math.max(0,center-radius),end=Math.min(a.length,center+radius);
 let sum=0;for(let i=start;i<end;i++)sum+=a[i]*a[i];
 return Math.min(1,Math.sqrt(sum/Math.max(1,end-start))/.42);
}
