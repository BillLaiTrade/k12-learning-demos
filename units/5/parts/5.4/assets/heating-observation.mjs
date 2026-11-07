import {HEAT,heating} from './thermal-model.mjs';

// Same energy model, three deliberately paced observations. The last observation
// stops after 20 g has vaporized so the probe stays immersed; no dry heating.
export const HEATING_STEPS=[
 {end:HEAT.melt,duration:14000,label:'觀察冰水'},
 {end:HEAT.melt+HEAT.warm,duration:18000,label:'接著加熱'},
 {end:HEAT.melt+HEAT.warm+HEAT.vapor*.2,duration:16000,label:'觀察沸騰'}
];
export function heatingStep(energy){const index=HEATING_STEPS.findIndex(s=>energy<s.end);return index<0?2:index;}
export function observedHeatChart(energy){
 const e=Math.max(0,Math.min(energy,HEATING_STEPS[2].end)),s=heating(e);
 // Extend once at the second checkpoint. Never rescale the two physical stages
 // separately or show the unobserved future curve.
 const max=e>HEATING_STEPS[1].end?120:60;
 const x=q=>64+q/1000/max*362,y=t=>272-t*2.08;
 const points=[[0,0]];
 if(e>0){points.push([Math.min(e,HEAT.melt),0]);if(e>HEAT.melt)points.push([Math.min(e,HEATING_STEPS[1].end),Math.min(s.temperature,100)]);if(e>HEATING_STEPS[1].end)points.push([e,100]);}
 const curve=points.map(([q,t],i)=>`${i?'L':'M'}${x(q).toFixed(2)} ${y(t).toFixed(2)}`).join(' ');
 return `<svg viewBox="0 0 460 376" role="img" aria-label="已觀察的溫度與累計吸熱量紀錄，目前${s.temperature.toFixed(1)}攝氏度" data-observed-kj="${e/1000}" data-axis-max="${max}">
 <text x="20" y="26">溫度（°C）</text>
 ${[0,20,40,60,80,100].map(t=>`<path d="M64 ${y(t)}H426" stroke="#e4e9e1"/><text x="51" y="${y(t)+5}" text-anchor="end">${t}</text>`).join('')}
 ${[0,max/3,max*2/3,max].map(q=>`<path d="M${x(q*1000)} 64V272" stroke="#edf0e9"/><text x="${x(q*1000)}" y="297" text-anchor="middle">${q}</text>`).join('')}
 <path d="M64 58V272H432" fill="none" stroke="#728679" stroke-width="1.4"/>
 <path class="observed-curve" d="${curve}" fill="none" stroke="#35784b" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
 ${e>0?`<path d="M64 ${y(s.temperature)}H${x(e)}V272" fill="none" stroke="#9b9e8c" stroke-dasharray="4 5"/>`:''}
 <circle cx="${x(e)}" cy="${y(s.temperature)}" r="5" fill="#bb6a30"/>
 ${e>0?`<text x="${Math.min(410,x(e)+5)}" y="${y(s.temperature)-13}" class="chart-now">現在</text>`:''}
 <text x="247" y="330" text-anchor="middle">累計吸熱量（kJ）</text>
 <text x="247" y="362" text-anchor="middle" class="chart-caption">只記錄已觀察的過程</text></svg>`;
}

export function heatObservation(energy,playing){
 if(energy===0)return {caption:playing?'冰與水共存，開始供熱':'冰與水共存，準備觀察',note:playing?'已開始加熱，觀察冰與溫度的變化。':'尚未開始加熱。按下「開始加熱」，觀察冰與溫度的變化。',discovery:''};
 if(energy<HEAT.melt)return {caption:playing?'冰逐漸變小':'暫停觀察，冰與水仍共存',note:playing?'冰正在融化，溫度約維持0°C。':'已暫停加熱，目前的狀態與紀錄會保留。',discovery:''};
 if(energy===HEAT.melt)return {caption:'冰剛融完，溫度約0°C',note:'已自動暫停：冰剛融完。繼續加熱，看看溫度會怎麼變。',discovery:'冰融化時持續吸熱，溫度約維持0°C。'};
 if(energy<HEATING_STEPS[1].end)return {caption:playing?'冰已融完，水正在升溫':'冰已融完，升溫觀察已暫停',note:playing?'冰融完後，繼續加熱，水溫逐漸升高。':'已暫停加熱，目前的狀態與紀錄會保留。',discovery:'冰融化時，溫度約維持0°C；冰融完後，水溫開始升高。'};
 if(energy===HEATING_STEPS[1].end)return {caption:'水溫已達約100°C',note:'已自動暫停：水溫約100°C。繼續觀察沸騰時，水量與溫度怎麼變。',discovery:'冰融化時約維持0°C；冰融完後繼續吸熱，水溫升高至約100°C。'};
 return {caption:playing?'水正在沸騰，液態水逐漸減少':energy>=HEATING_STEPS[2].end?'已觀察水沸騰與水量減少':'沸騰觀察已暫停',note:energy>=HEATING_STEPS[2].end?'本段觀察完成：水量減少，溫度仍約100°C。':playing?'水持續吸熱並汽化，液態水減少，溫度約維持100°C。':'已暫停加熱，目前的狀態與紀錄會保留。',discovery:'冰融化與水沸騰時，持續吸熱但溫度約維持不變；液態水升溫時，溫度才逐漸升高。'};
}
