export const GUITAR_LENGTH=65;
export const GUITAR_BASE=110;
export const GUITAR_SECONDS=2.4;
export const GUITAR_SLOWDOWN=100;
export const BRIDGE_X=310;
export const NUT_X=1816;
export const STRING_Y=586;
export const MAX_FRET=12;
export const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export const fretLength=fret=>GUITAR_LENGTH/2**(clamp(Math.round(fret),0,MAX_FRET)/12);
export const guitarFrequency=(fret,tension=1)=>GUITAR_BASE*GUITAR_LENGTH/fretLength(fret)*Math.sqrt(clamp(tension,.5,2));
export const fretX=fret=>BRIDGE_X+(NUT_X-BRIDGE_X)/2**(fret/12);
export function nearestFret(x){
 let nearest=0;
 for(let fret=1;fret<=MAX_FRET;fret++)if(Math.abs(fretX(fret)-x)<Math.abs(fretX(nearest)-x))nearest=fret;
 return nearest;
}
export function guitarEnvelope(seconds){
 if(seconds<=0||seconds>=GUITAR_SECONDS)return 0;
 return Math.min(1,seconds/.005,(GUITAR_SECONDS-seconds)/.08)*Math.exp(-seconds/1.3);
}
export function guitarDisplacement(seconds,frequency){
 return 45*guitarEnvelope(seconds)*Math.sin(2*Math.PI*frequency*seconds/GUITAR_SLOWDOWN);
}
export function stringPath(end,displacement){
 return Array.from({length:65},(_,i)=>{
  const x=BRIDGE_X+(end-BRIDGE_X)*i/64;
  const y=i===0||i===64?STRING_Y:STRING_Y+displacement*Math.sin(Math.PI*i/64);
  return `${i?'L':'M'}${x.toFixed(3)} ${y.toFixed(3)}`;
 }).join(' ');
}
export function guitarSamples(frequency,rate){
 const samples=new Float32Array(Math.ceil(rate*GUITAR_SECONDS));
 const partials=[1,.45,.22,.12,.06],normalization=partials.reduce((sum,v)=>sum+v,0);
 for(let i=0;i<samples.length;i++){
  const seconds=i/rate;
  const signal=partials.reduce((sum,value,index)=>sum+value*Math.sin(2*Math.PI*(index+1)*frequency*seconds),0)/normalization;
  samples[i]=.95*signal*guitarEnvelope(seconds);
 }
 return samples;
}
