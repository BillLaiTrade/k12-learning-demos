import {HEAT,heating} from './thermal-model.mjs';
import {heatScene} from './thermal-art.mjs';

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
 // Keep a fixed physical scale so previous observations never jump or shrink.
 const max=120;
 const x=q=>64+q/1000/max*362,y=t=>272-t*2.08;
 const points=[[0,0]];
 if(e>0){points.push([Math.min(e,HEAT.melt),0]);if(e>HEAT.melt)points.push([Math.min(e,HEATING_STEPS[1].end),Math.min(s.temperature,100)]);if(e>HEATING_STEPS[1].end)points.push([e,100]);}
 const curve=points.map(([q,t],i)=>`${i?'L':'M'}${x(q).toFixed(2)} ${y(t).toFixed(2)}`).join(' ');
 return `<svg viewBox="0 0 460 376" role="img" aria-label="已觀察的溫度與累計吸熱量紀錄，目前${s.temperature.toFixed(1)}攝氏度" data-observed-kj="${e/1000}" data-axis-max="${max}">
 <text x="20" y="26">溫度（°C）</text>
 ${[0,20,40,60,80,100].map(t=>`<path d="M64 ${y(t)}H426" stroke="#e4e9e1"/><text x="51" y="${y(t)+5}" text-anchor="end">${t}</text>`).join('')}
 ${[0,max/3,max*2/3,max].map(q=>`<path d="M${x(q*1000)} 64V272" stroke="#edf0e9"/><text x="${x(q*1000)}" y="297" text-anchor="middle">${q}</text>`).join('')}
 <path d="M64 58V272H432" fill="none" stroke="#728679" stroke-width="1.4"/>
 <path d="${curve}" fill="none" stroke="#fffef9" stroke-width="8" stroke-linecap="round"/>
 <path class="observed-curve" d="${curve}" fill="none" stroke="#35784b" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
 ${e>0?`<path d="M64 ${y(s.temperature)}H${x(e)}V272" fill="none" stroke="#9b9e8c" stroke-dasharray="4 5"/>`:''}
 ${e>0?`<text class="heat-phase-label" x="${x(Math.min(e,HEAT.melt)/2)}" y="251" text-anchor="middle">冰融化</text>`:''}
 ${s.temperature>=20&&e>HEAT.melt?`<text class="heat-phase-label" x="${x((HEAT.melt+Math.min(e,HEATING_STEPS[1].end))/2)+10}" y="${y(Math.min(s.temperature,100)/2)}">水升溫</text>`:''}
 ${e>HEATING_STEPS[1].end?`<text class="heat-phase-label" x="${x((HEATING_STEPS[1].end+e)/2)}" y="88" text-anchor="middle">水沸騰</text>`:''}
 <circle cx="${x(e)}" cy="${y(s.temperature)}" r="5" fill="#bb6a30"/>
 ${s.temperature>0?`<text x="${Math.min(410,x(e)+5)}" y="${y(s.temperature)-13}" class="chart-now">現在</text>`:''}
 <text x="247" y="330" text-anchor="middle">累計吸熱量（kJ）</text>
 <text x="247" y="362" text-anchor="middle" class="chart-caption">只記錄已觀察的過程</text></svg>`;
}

// SVG fallback keeps the same reference water level and a clear ice outline.
export function observedHeatScene(energy,playing){
 let scene=heatScene(energy,playing).replaceAll('fill="#e6f8f5" stroke="#9ccdd1"','fill="#f3fcff" stroke="#4c8a9f" stroke-width="2"');
 if(!playing&&energy<HEAT.melt)scene=scene.replaceAll('融冰中','冰與水共存');
 if(energy>=HEATING_STEPS[1].end)scene=scene.replace('</svg>','<path class="water-level-reference" d="M195 144H333" fill="none" stroke="#956b3e" stroke-width="2.5" stroke-dasharray="7 5"/></svg>');
 return scene;
}

export function heatObservation(energy,playing){
 const resume='按「繼續加熱」接續觀察，或重新觀察。';
 const melted='融冰時，吸收的熱量用於改變狀態，溫度不一定上升。';
 const warmed='冰融完後，繼續吸熱會使水溫升高；熱量可以造成不同的變化。';
 if(energy===0)return {caption:playing?'冰與水共存，開始供熱':'冰與水共存，準備觀察',note:playing?'可以隨時暫停，比較冰的大小與曲線上的位置。':'按「開始加熱」，一起觀察冰與曲線。',discovery:''};
 if(energy<HEAT.melt)return {caption:playing?'冰逐漸變小':'暫停觀察，冰與水仍共存',note:playing?'可以隨時暫停，比較冰的大小與曲線上的位置。':resume,discovery:''};
 if(energy===HEAT.melt)return {caption:'冰剛融完',note:'本段已完成。按「繼續加熱」開始下一段。',discovery:melted};
 if(energy<HEATING_STEPS[1].end)return {caption:playing?'冰已融完，水正在升溫':'冰已融完，升溫觀察已暫停',note:playing?'可以隨時暫停，對照溫度讀值與曲線。':resume,discovery:melted};
 if(energy===HEATING_STEPS[1].end)return {caption:'水溫已達約100°C',note:'本段已完成。按「繼續加熱」觀察沸騰。',discovery:warmed};
 const complete=energy>=HEATING_STEPS[2].end;
 return {caption:playing?'水正在沸騰，水位逐漸下降':complete?'已觀察水沸騰與水位下降':'沸騰觀察已暫停',note:complete?'三段觀察已完成，可按「重新觀察」再比較。':playing?'比較現在的水位與虛線，並留意溫度讀值。':resume,discovery:complete?'持續吸熱，可能使水升溫，也可能讓冰融化或讓水汽化；吸熱不代表溫度一定上升。':warmed};
}
