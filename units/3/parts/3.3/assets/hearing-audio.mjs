export const HEARING_MIN=20,HEARING_MAX=20000,HEARING_START=1000,HEARING_GAIN=.06;
export const frequencyAt=fraction=>Math.round(HEARING_MIN*Math.pow(HEARING_MAX/HEARING_MIN,Math.max(0,Math.min(1,fraction))));
export const frequencyPosition=frequency=>Math.log(Math.max(HEARING_MIN,Math.min(HEARING_MAX,frequency))/HEARING_MIN)/Math.log(HEARING_MAX/HEARING_MIN);

function hold(parameter,at){
 const value=parameter.value;parameter.cancelScheduledValues(at);parameter.setValueAtTime(value,at);
}
export function createHearingVoice(context,frequency){
 const valid=hz=>{if(!Number.isFinite(hz)||hz<HEARING_MIN||hz>HEARING_MAX||hz>=context.sampleRate/2)throw Error('Unsupported frequency');};
 valid(frequency);
 const oscillator=context.createOscillator(),gain=context.createGain();let stopped=false,startedAt=0;
 oscillator.type='sine';oscillator.frequency.setValueAtTime(frequency,context.currentTime);
 gain.gain.setValueAtTime(0,context.currentTime);oscillator.connect(gain);gain.connect(context.destination);
 oscillator.addEventListener('ended',()=>{oscillator.disconnect();gain.disconnect();},{once:true});
 return {oscillator,start(){
  const at=context.currentTime;startedAt=at;gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(HEARING_GAIN,at+.04);oscillator.start(at);
 },setFrequency(hz,at=context.currentTime){
  valid(hz);if(stopped)return;
  hold(oscillator.frequency,at);oscillator.frequency.linearRampToValueAtTime(hz,at+.035);
 },stop(at=context.currentTime){
  if(stopped)return;stopped=true;
  const level=HEARING_GAIN*Math.max(0,Math.min(1,(at-startedAt)/.04));
  gain.gain.cancelScheduledValues(at);gain.gain.linearRampToValueAtTime(level,at);gain.gain.linearRampToValueAtTime(0,at+.025);oscillator.stop(at+.03);
 }};
}
