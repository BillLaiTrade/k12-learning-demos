export const MATCH_TONES=Object.freeze(['pure','string','pipe']);
export const MATCH_RATE=48000;
export const MATCH_WINDOW=.01;
export const MATCH_PLOT=Object.freeze({left:8,right:892,zero:70,scale:100});
export const MATCH_QUESTIONS=Object.freeze([
 {tone:'string',frequency:330,amplitude:.7,start:{tone:'pipe',frequency:440,amplitude:.5}},
 {tone:'pipe',frequency:550,amplitude:.45,start:{tone:'pure',frequency:330,amplitude:.7}},
 {tone:'pure',frequency:440,amplitude:.8,start:{tone:'string',frequency:660,amplitude:.4}},
 {tone:'string',frequency:660,amplitude:.4,start:{tone:'pipe',frequency:330,amplitude:.8}}
]);
export const MATCH_NAMES=Object.freeze({pure:'音叉',string:'吉他',pipe:'排笛'});

// 由既有440Hz錄音重取樣；同一份結果用於播放及繪圖，保留原音起落。
export function matchClip(clip,{frequency,amplitude,tone}){
 if(!MATCH_TONES.includes(tone)||!Number.isFinite(frequency)||frequency<220||frequency>660||!Number.isFinite(amplitude)||amplitude<.25||amplitude>1)throw Error('Invalid sound settings');
 const ratio=frequency/440,step=clip.rate/MATCH_RATE*ratio;
 // 每份素材用全段峰值設定固定基準，避免純音／管音的波形過小。
 // 此基準同時作用於音訊與圖形，不隨頻率、滑桿或繪圖視窗自動放大。
 const peak=clip.samples.reduce((value,sample)=>Math.max(value,Math.abs(sample)),0);
 if(!peak)throw Error('Silent sound source');
 const gain=.6/peak*amplitude;
 const samples=new Float32Array(Math.ceil(clip.samples.length/step));
 for(let i=0;i<samples.length;i++){
  const at=i*step,low=Math.floor(at),mix=at-low;
  samples[i]=((clip.samples[low]||0)*(1-mix)+(clip.samples[low+1]||0)*mix)*gain;
 }
 return {samples,rate:MATCH_RATE,start:.2/ratio,frequency,amplitude,tone};
}

export function matchWavePath(clip){
 const {left,right,zero,scale}=MATCH_PLOT,first=Math.ceil(clip.start*clip.rate),last=Math.floor((clip.start+MATCH_WINDOW)*clip.rate);
 const points=[];
 for(let i=first;i<=last;i++)points.push(`${points.length?'L':'M'}${(left+(i/clip.rate-clip.start)/MATCH_WINDOW*(right-left)).toFixed(4)} ${(zero-scale*clip.samples[i]).toFixed(4)}`);
 return points.join(' ');
}

export function compareMatch(answer,target){
 const tone=answer.tone===target.tone;
 const frequency=Math.abs(answer.frequency-target.frequency)/target.frequency<=.03;
 const amplitude=Math.abs(answer.amplitude-target.amplitude)<=.051;
 return {tone,frequency,amplitude,correct:tone&&frequency&&amplitude};
}
