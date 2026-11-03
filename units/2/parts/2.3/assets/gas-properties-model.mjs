import {COMPARISON_DURATION,comparisonFrame} from './oxygen-model.mjs?v=reaudit-20261103-2';
export const PROPERTY_DURATIONS=Object.freeze({splints:COMPARISON_DURATION,limewater:7600});
const unit=x=>Math.max(0,Math.min(1,x));
const ease=x=>{const t=unit(x);return t*t*(3-2*t);};
export function splintPropertyFrame(elapsed){
 const time=Math.max(0,Math.min(PROPERTY_DURATIONS.splints,Number(elapsed)||0)),f=comparisonFrame(time);
 const phase=time===0?'ready':time<1500?'insert':time<=2000?'observe':time<4800?'change':'result';
 const message={ready:'準備同時放入木條，觀察餘燼的變化。',insert:'兩支帶餘燼木條同時放入，深度與觀察時間相同。',observe:'木條已放入，觀察尖端的餘燼。',change:'氧氣中的木條開始復燃；二氧化碳中的餘燼漸暗。',result:'氧氣中的木條復燃；二氧化碳中的餘燼變暗，未復燃。'}[phase];
 return{...f,time,phase,message};
}
export function limewaterPropertyFrame(elapsed){
 const time=Math.max(0,Math.min(PROPERTY_DURATIONS.limewater,Number(elapsed)||0));
 const source=time>=600,flow=unit((time-600)/600),bubbling=time>=1200,cloud=ease((time-2000)/4000);
 const phase=time===0?'ready':time<1200?'source':time<2000?'bubbles':time<6000?'cloud':'result';
 const message={ready:'播放後通入二氧化碳，觀察石灰水的變化。',source:'另一份二氧化碳由製氣裝置沿導管送入。',bubbles:'氣泡從液面下的導管口冒出，向水面上升。',cloud:'二氧化碳持續通入，澄清石灰水逐漸變混濁。',result:'石灰水已變混濁；與木條觀察分開取樣。'}[phase];
 return{time,source,flow,bubbling,cloud,phase,message};
}
