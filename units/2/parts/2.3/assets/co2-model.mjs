// Independent instructional clocks; neither volume nor real reaction rate is modeled.
export const CO2_DURATIONS = [4800, 11200, 4200, 6200, 4600];
const clamp = x => Math.min(1, Math.max(0, x));
const ease = x => { const t=clamp(x); return t*t*(3-2*t); };
export function co2Frame(stage, elapsed) {
  const time=Math.max(0,Math.min(CO2_DURATIONS[stage],elapsed));
  let marble=1, acid=1, seal=1, insert=0, cover=0, phase=0;
  if(stage===1){
    marble=clamp((time-1800)/2200); acid=clamp((time-4500)/2600); seal=ease((time-8200)/2200);
    phase=time<1800?0:time<4500?1:time<8000?2:3;
  }
  if(stage===3)insert=ease(time/2200);
  if(stage===4){insert=1-ease(time/2000);cover=ease((time-2400)/1500);}
  // Lift above the mouth before moving sideways: never pass through the glass wall.
  let tipX=600,tipY=310;
  if(insert<.3){tipY=310-(310-155)*(insert/.3);}
  else if(insert<.6){tipX=600+270*(insert-.3)/.3;tipY=155;}
  else {tipX=870;tipY=155+(540-155)*(insert-.6)/.4;}
  const reacting=stage>0&&acid>0;
  return {time,marble,acid,seal,phase,insert,tipX,tipY,cover,
    reacting,flow:reacting&&seal===1,collecting:stage===3&&insert===1,
    labeled:stage===4&&cover===1};
}

// Match the oxygen lesson's single-level operation list, with CO2 prerequisites.
export const CO2_OPERATIONS = [
  {label:'認識材料',scene:0,offset:0,duration:0},
  {label:'擺好集氣位置',scene:1,offset:0,duration:1800},
  {label:'加入大理石',scene:1,offset:1800,duration:2700},
  {label:'倒入稀鹽酸',scene:1,offset:4500,duration:3500},
  {label:'塞緊塞子與導管',scene:1,offset:8000,duration:3200},
  {label:'先排出空氣',scene:2,offset:0,duration:2800},
  {label:'向上排空氣集氣',scene:3,offset:0,duration:6200},
  {label:'封存二氧化碳',scene:4,offset:0,duration:4600},
];
export function co2OperationFrame(index,elapsed){
  const op=CO2_OPERATIONS[index],localTime=Math.max(0,Math.min(op.duration,elapsed));
  return {...co2Frame(op.scene,op.offset+localTime),operation:index,scene:op.scene,localTime,
    duration:op.duration,placement:index===1?ease(localTime/1800):1};
}
