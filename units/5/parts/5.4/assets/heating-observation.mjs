import {HEAT,heating} from './thermal-model.mjs';
import {heatScene} from './thermal-art.mjs';

// Same energy model, three deliberately paced observations. The last observation
// stops after 20 g has vaporized so the probe stays immersed; no dry heating.
export const HEATING_STEPS=[
 {end:HEAT.melt,duration:14000,label:'觀察融冰'},
 {end:HEAT.melt+HEAT.warm,duration:18000,label:'觀察升溫'},
 {end:HEAT.melt+HEAT.warm+HEAT.vapor*.2,duration:16000,label:'觀察沸騰'}
];
export function heatingStep(energy){const index=HEATING_STEPS.findIndex(s=>energy<s.end);return index<0?2:index;}
export function observedHeatChart(energy){
 const e=Math.max(0,Math.min(energy,HEATING_STEPS[2].end)),s=heating(e),max=30000;
 // Both axes keep the same physical scale. A small negative margin separates
 // the observed 0°C plateau from the horizontal axis, without shifting data.
 const x=q=>56+q/4.18/max*344,y=t=>254-t*1.86;
 const points=[[0,0]];
 if(e>0){points.push([Math.min(e,HEAT.melt),0]);if(e>HEAT.melt)points.push([Math.min(e,HEATING_STEPS[1].end),s.temperature]);if(e>HEATING_STEPS[1].end)points.push([e,100]);}
 const curve=points.map(([q,t],i)=>`${i?'L':'M'}${x(q).toFixed(2)} ${y(t).toFixed(2)}`).join(' ');
 const recent=e<=HEAT.melt?`M${x(0)} ${y(0)}H${x(e)}`:e<=HEATING_STEPS[1].end?`M${x(HEAT.melt)} ${y(0)}L${x(e)} ${y(s.temperature)}`:`M${x(HEATING_STEPS[1].end)} ${y(100)}H${x(e)}`;
 return `<svg viewBox="0 0 420 338" role="img" aria-label="已觀察的溫度與累計吸熱量紀錄，目前${s.temperature.toFixed(1)}攝氏度、吸熱${Math.round(e/4.18)}卡" data-observed-cal="${e/4.18}" data-axis-max="${max}" data-temperature-min="-10">
 <text x="12" y="27" class="chart-axis-title">溫度（°C）</text>
 ${[-10,0,20,40,60,80,100].map(t=>`<path d="M56 ${y(t)}H400" stroke="${t===0?'#c3d4bf':'#e6ece2'}" stroke-dasharray="${t===0?'4 4':'none'}"/><text x="45" y="${y(t)+5}" text-anchor="end">${t}</text>`).join('')}
 ${[0,10000,20000,30000].map(q=>`<path d="M${x(q*4.18)} 49V${y(-10)}" stroke="#edf0e9"/><text x="${x(q*4.18)}" y="298" text-anchor="${q===max?'end':'middle'}">${q.toLocaleString('en-US')}</text>`).join('')}
 <path d="M56 49V${y(-10)}H405" fill="none" stroke="#728679" stroke-width="1.4"/>
 <path d="${curve}" fill="none" stroke="#fffef9" stroke-width="9" stroke-linecap="round"/>
 <path class="observed-curve" d="${curve}" fill="none" stroke="#35784b" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
 ${e>0?`<path class="recent-curve" d="${recent}" fill="none" stroke="#b7652c" stroke-width="5" stroke-linecap="round"/><path d="M${x(e)} ${y(s.temperature)}V${y(-10)}" fill="none" stroke="#a8af9f" stroke-dasharray="3 5"/>`:''}
 ${e>0?`<path d="M102 231L${x(Math.min(e,HEAT.melt)/2)} 250" stroke="#6d8a6b"/><text class="heat-phase-label" x="102" y="224" text-anchor="middle">冰融化</text>`:''}
 ${s.temperature>=20&&e>HEAT.melt?`<text class="heat-phase-label" x="${x((HEAT.melt+Math.min(e,HEATING_STEPS[1].end))/2)+24}" y="${y(Math.min(s.temperature,100)/2)}">水升溫</text>`:''}
 ${e>HEATING_STEPS[1].end?`<text class="heat-phase-label" x="${x((HEATING_STEPS[1].end+e)/2)}" y="94" text-anchor="middle">水沸騰</text>`:''}
 <circle cx="${x(e)}" cy="${y(s.temperature)}" r="5" fill="#b7652c"/>
 ${s.temperature>0?`<text x="${Math.min(385,x(e)+6)}" y="${y(s.temperature)-13}" class="chart-now">現在</text>`:''}
 <text x="228" y="331" text-anchor="middle" class="chart-axis-title">累計吸熱量（cal）</text></svg>`;
}

// SVG fallback keeps the same reference water level and a clear ice outline.
export function observedHeatScene(energy,playing){
 let scene=heatScene(energy,playing).replaceAll('fill="#e6f8f5" stroke="#9ccdd1"','fill="#f3fcff" stroke="#4c8a9f" stroke-width="2"');
 if(!playing&&energy<HEAT.melt)scene=scene.replaceAll('融冰中','冰與水共存');
 if(playing)scene=scene.replace('</svg>','<text x="263" y="351" text-anchor="middle" font-size="18" fill="#9c501f">熱傳入</text></svg>');
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
