export const FORK_FREQUENCY = 440;
export const FORK_SECONDS = 2.4;
export const STRIKE_DELAY = .16;
export const FORK_LEVELS = Object.freeze({soft:.3,strong:.7});
export function forkEnvelope(time) {
  if(time<0 || time>=FORK_SECONDS)return 0;
  return Math.min(1,time/.012,(FORK_SECONDS-time)/.12)*Math.exp(-.65*time);
}
export function forkFrame(time,amplitude) {
  const envelope=forkEnvelope(time),phase=Math.sin(2*Math.PI*5*time);
  return {envelope,displacement:amplitude*envelope*phase,extent:amplitude*envelope};
}
export function forkSamples(amplitude,rate) {
  const samples=new Float32Array(Math.ceil(rate*FORK_SECONDS));
  for(let i=0;i<samples.length;i++){
    const time=i/rate;
    samples[i]=.13*amplitude*forkEnvelope(time)*Math.sin(2*Math.PI*FORK_FREQUENCY*time);
  }
  return samples;
}
