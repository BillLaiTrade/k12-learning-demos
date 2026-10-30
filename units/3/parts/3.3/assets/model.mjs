export const PARTIALS = Object.freeze({ pure: [1], string: [1,.48,.24,.13,.07], pipe: [1,0,.34,0,.16,0,.08] });
export const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
export function signal(time, frequency, tone = 'pure') {
  const partials = PARTIALS[tone] || PARTIALS.pure;
  const norm = partials.reduce((a,b) => a+b,0);
  return partials.reduce((value, amplitude, i) => value + amplitude * Math.sin(2*Math.PI*frequency*(i+1)*time),0)/norm;
}
export const stringFrequency = (lengthCm, tension) => 220 * 60/lengthCm * Math.sqrt(tension);
export const tubeFrequency = lengthCm => 343 / (2*lengthCm/100);
export const hearingBand = frequency => frequency < 20 ? 'low' : frequency > 20000 ? 'ultrasound' : 'audible';
export function soundSamples({frequency, amplitude, tone='pure'}, rate, seconds=1.6) {
  const samples = new Float32Array(Math.ceil(rate*seconds));
  const partials=PARTIALS[tone]||PARTIALS.pure;
  const rmsMatch=partials.reduce((a,b)=>a+b,0)/Math.sqrt(partials.reduce((a,b)=>a+b*b,0));
  for (let i=0;i<samples.length;i++) {
    const t=i/rate, envelope=Math.min(1,t/.02,Math.max(0,(seconds-t)/.12));
    samples[i]=signal(t,frequency,tone)*clamp(amplitude,0,1)*.13*rmsMatch*envelope;
  }
  return samples;
}
export function challenge(index=0) {
  const items=[{base:440,target:660,tone:'string'},{base:220,target:440,tone:'pipe'},{base:440,target:330,tone:'string'}];
  return {...items[index%items.length],amplitude:.35};
}
export function checkSettings(answer, target) {
  if (!answer.frequency || !answer.amplitude || !answer.tone) return 'incomplete';
  return Number(answer.frequency)===target.target && Number(answer.amplitude)===target.amplitude && answer.tone===target.tone ? 'correct' : 'incorrect';
}
