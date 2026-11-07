import {phaseScene} from './thermal-art.mjs';
// Finite, isolated baths exchanging heat with a 0°C ice-water sample.
// Newton cooling is parameterized by each case's independently accelerated
// observation, not a shared physical clock. Neither sample exhausts either phase.
export const COMPARISON={duration:20000,mass:100,initialIce:50,latent:334,bathMass:250};
export const BATHS={
 warm:{label:'暖水浴',initial:40,end:32,capacity:4.18},
 cold:{label:'預冷鹽水',initial:-10,end:-2,capacity:3.4}
};
export function phaseComparison(progress){
 const p=Math.max(0,Math.min(1,progress));
 return Object.fromEntries(Object.entries(BATHS).map(([key,bath])=>{
  const temperature=bath.initial*Math.pow(bath.end/bath.initial,p);
  const heatToSample=COMPARISON.bathMass*bath.capacity*(bath.initial-temperature);
  const ice=COMPARISON.initialIce-heatToSample/COMPARISON.latent;
  return [key,{bathTemperature:temperature,sampleTemperature:0,ice,water:COMPARISON.mass-ice,heatToSample,bathEnergyChange:-heatToSample,progress:p}];
 }));
}

// Same-state non-WebGL view, with heat arrows only in the explanation layer.
export function comparisonScene(key,state,revealed=false){
 const warm=key==='warm',id='compare-'+key,scale=Math.cbrt(state.ice/50);
 const ice=Array.from({length:4},(_,i)=>{const size=27*scale,x=180+i%2*39,y=174+Math.floor(i/2)*13;return `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="6" fill="#effaff" stroke="#588c9d" stroke-width="1.7"/>`;}).join('');
 return `<svg viewBox="0 0 460 345" role="img" aria-label="${warm?'左':'右'}杯內冰水共存，外浴${state.bathTemperature.toFixed(1)}攝氏度"><defs><linearGradient id="${id}-glass"><stop stop-color="#bfdbdc" stop-opacity=".3"/><stop offset=".5" stop-color="#fff" stop-opacity=".25"/><stop offset="1" stop-color="#8cb4bd" stop-opacity=".4"/></linearGradient><marker id="${id}-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8" fill="#b9662e"/></marker></defs>
 <rect width="460" height="345" fill="#eeece3"/><rect y="278" width="460" height="67" fill="#dbceb6"/>
 <path d="M75 190V274Q75 289 94 289H298Q315 289 315 274V190" fill="url(#${id}-glass)" stroke="#90a8a5" stroke-width="2"/>
 <path d="M80 215H310V275Q310 284 296 284H95Q80 284 80 275Z" fill="${warm?'#e4c187':'#85bacb'}" opacity=".5"/>
 <path d="M160 113V267Q160 275 171 275H250Q262 275 262 267V113" fill="url(#${id}-glass)" stroke="#7b9aa4" stroke-width="2"/>
 <path d="M164 182H258V266H164Z" fill="#a0c7d4" opacity=".65"/><ellipse cx="211" cy="182" rx="47" ry="5" fill="#cde4e6" stroke="#719faa"/>${ice}
 <path d="M230 67V253M120 69V258" fill="none" stroke="#778888" stroke-width="4"/>
 <path d="M230 67Q280 20 360 88M120 69Q185 4 359 88" fill="none" stroke="#303b36" stroke-width="2.5"/>
 <rect x="318" y="88" width="123" height="120" rx="10" fill="#e9e7dc" stroke="#b4b8ac"/>
 <rect x="326" y="98" width="107" height="100" rx="6" fill="#dce8c8"/>
 <text x="379" y="120" text-anchor="middle" font-size="13">杯內 0.0°C</text><text x="379" y="151" text-anchor="middle" font-size="13">外浴</text><text x="379" y="180" text-anchor="middle" font-size="22" font-weight="700">${state.bathTemperature.toFixed(1)}°C</text>
 ${revealed?`<g class="comparison-heat-arrow"><path d="${warm?'M102 240H185':'M234 240H303'}" stroke="#b9662e" stroke-width="5" marker-end="url(#${id}-arrow)"/><text x="${warm?130:271}" y="221" text-anchor="middle" fill="#9c4a1d" font-size="17">${warm?'熱傳入':'熱傳出'}</text></g>`:''}
 <text x="198" y="322" text-anchor="middle" font-size="17" fill="#32573d">${warm?'暖水浴':'預冷鹽水'}・固定量</text></svg>`;
}

export function extensionScene(mode,progress){
 const scene=phaseScene(mode,progress);
 // For condensation the sample is the surrounding vapor: its heat goes toward
 // the colder cup wall, rather than away from the cup into empty space.
 return mode==='condense'?scene.replace('d="M385 210H479"','d="M480 210H388"'):scene;
}
