import {LIGHTS,MATERIALS,materialLight,colorName,channelsText} from './color-model.mjs?v=merged-surface-20261103';

// Both independent controls feed one optical result, used by every observation.
export function surfaceObservation(light,material){
 const signal=materialLight(light,material),appearance=colorName(signal.outgoing);
 const lightName=LIGHTS[light].name,materialName=MATERIALS[material].name;
 const white=material==='white',black=material==='black',dark=Math.max(...signal.outgoing)<.045;
 let reflected,absorbed;
 if(light==='white'){
  const dominant=['紅','綠','藍'][signal.outgoing.indexOf(Math.max(...signal.outgoing))];
  const others=['紅','綠','藍'].filter(c=>c!==dominant).join('、');
  reflected=white?'各色光都較多':black?'各色光都較少':`以${dominant}光為主`;
  absorbed=white?'各色光都較少':black?'各色光都較多':`${others}較多，${dominant}較少`;
 }else{
  const i=signal.incoming.findIndex(v=>v>0),ratio=signal.outgoing[i]/signal.incoming[i];
  reflected=`${ratio>=.5?'大部分':ratio>=.045?'少量':'極少量'}${lightName}被反射`;
  absorbed=`${1-ratio>=.5?'大部分':1-ratio>=.045?'少量':'極少量'}${lightName}被吸收`;
 }
 let result;
 if(dark)result=`${materialName}在${lightName}下看起來很暗；它對這次照來的光反射很少，大部分被吸收，進入眼睛的光也很少。`;
 else if(light!=='white')result=`${materialName}在${lightName}下看起來是${appearance}，因為照過來的${lightName}大部分被反射，部分反射光進入眼睛。`;
 else if(white)result='白色色卡反射較多種類的可見光進入眼睛，因此在白光下看起來接近白色。';
 else result=`白光照到${materialName}，主要反射${channelsText(signal.outgoing)}光進入眼睛；其他色光較多被吸收。`;
 return {signal,appearance,incoming:light==='white'?'紅、綠、藍':lightName,reflected,absorbed,result,
  name:`${materialName}在${lightName}下`,preview:dark?'看起來很暗':`看起來是${appearance}`};
}
