import {LIGHTS,FILTERS,MATERIALS,filterLight,colorName,channelsText} from './color-model.mjs';

// Two successive selections of the SAME incident light; no new colour is added.
export function filterPaperLight(light,filter,paper){
 const filtered=filterLight(light,filter),transmitted=[...filtered.outgoing];
 const outgoing=transmitted.map((value,i)=>value*MATERIALS[paper].rgb[i]);
 const paperAbsorbed=transmitted.map((value,i)=>value-outgoing[i]);
 return {incoming:filtered.incoming,transmitted,outgoing,filterAbsorbed:filtered.absorbed,paperAbsorbed,
  absorbed:filtered.incoming.map((value,i)=>value-outgoing[i])};
}
export const paperName=key=>MATERIALS[key].name.replace('色色卡','紙');
export function filterPaperObservation(light,filter,paper){
 const signal=filterPaperLight(light,filter,paper),name=paperName(paper),appearance=colorName(signal.outgoing);
 const prefix=`${LIGHTS[light].name}通過${FILTERS[filter].name}後，再照到${name}`;
 let result;
 if(Math.max(...signal.transmitted)<.045)result=`${prefix}；色片透過的光已很少，紙張反射進入眼睛的光更少，所以看起來很暗。`;
 else if(Math.max(...signal.outgoing)<.045)result=`${prefix}；${name}對透過的${channelsText(signal.transmitted)}光反射很少，進入眼睛的光也少，所以看起來很暗。`;
 else result=`${prefix}；${name}主要反射${channelsText(signal.outgoing)}光進入眼睛，所以看起來是${appearance}。`;
 return {signal,result,preview:Math.max(...signal.outgoing)<.045?`${name}看起來很暗`:`${name}看起來是${appearance}`};
}
