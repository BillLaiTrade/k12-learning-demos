import {BRIDGE_X,NUT_X,STRING_Y,fretX} from './guitar-model.mjs?v=1';

export function guitarScene(side){
 const id=`guitar-${side}`;
 const frets=Array.from({length:19},(_,i)=>{
  const x=fretX(i+1);
  return `<path d="M${x} 565V670" stroke="#aaa79d" stroke-width="4"/><path d="M${x+2} 565V670" stroke="#f0e7cf" stroke-width="1"/>`;
 }).join('');
 const strings=Array.from({length:6},(_,i)=>{
  if(i===1)return '';
  const y=566+i*20;
  return `<path d="M${BRIDGE_X} ${y}H${NUT_X}" stroke="${i<3?'#c6b692':'#d5d5c9'}" stroke-width="${5-i*.5}" opacity=".7"/>`;
 }).join('');
 return `<svg class="guitar-scene" viewBox="0 0 2167 1220" role="group" aria-label="木吉他第5弦：金色弦段從琴橋延伸到上弦枕或按弦品絲；琴身與其他琴弦固定，只有有效弦段振動。">
 <defs>
  <linearGradient id="${id}-skin" x2=".3" y2="1"><stop stop-color="#ffe3c9"/><stop offset=".5" stop-color="#f4bf97"/><stop offset="1" stop-color="#d58d64"/></linearGradient>
  <filter id="${id}-glow" x="-20%" y="-200%" width="140%" height="500%"><feGaussianBlur stdDeviation="7"/></filter>
 </defs>
 <g class="guitar-fixed">
  <image href="assets/guitar-body.png" x="0" y="260" width="2167" height="725"/>
  <g class="guitar-frets">${frets}</g>
  ${strings}
 </g>
 <path class="guitar-muted-wire" fill="none" stroke="#a6a99c" stroke-width="4"/>
 <path class="guitar-wire-glow" fill="none" stroke="#ffd285" stroke-width="18" opacity=".6" filter="url(#${id}-glow)"/>
 <path class="guitar-active-wire" fill="none" stroke="#ffcf78" stroke-width="7" stroke-linecap="round"/>
 <path class="guitar-wire-light" fill="none" stroke="#fff2b4" stroke-width="2"/>
 <g class="guitar-finger" pointer-events="none">
  <path d="M197-193C165-199 148-184 124-157L19-36C-5-7 2 11 19 13C34 17 47 3 60-10L189-131C216-157 224-182 197-193Z" fill="url(#${id}-skin)" stroke="#b97d5b" stroke-width="3"/>
  <path d="M29-44Q15-30 14-17Q21-5 35-13L60-39Q50-57 29-44Z" fill="#ffece0" stroke="#d9957a" stroke-width="2"/>
  <path d="M98-96L126-72M140-144L169-119" stroke="#d58f6b" stroke-width="3" opacity=".55"/>
 </g>
 <g class="guitar-tuner" pointer-events="none" transform="translate(1960 520)">
  <ellipse rx="46" ry="21" fill="#d4bc81" stroke="#7b693e" stroke-width="4"/><ellipse rx="35" ry="13" fill="#eee0b8"/>
  <path d="M-10 0H10" stroke="#9d8350" stroke-width="4"/>
 </g>
 <g class="guitar-measurement" fill="none" stroke="#176b53" stroke-width="8" stroke-linecap="round">
  <path class="guitar-length-line"/><path class="guitar-length-ends"/>
 </g>
 <g class="guitar-length-label" text-anchor="middle" pointer-events="none">
  <rect x="-480" y="-65" width="960" height="92" rx="28" fill="#fffdf1" opacity=".92"/>
  <text class="guitar-length-text" font-size="65" font-weight="750" fill="#175a45"/>
 </g>
 <g class="guitar-pluck-target" role="button" tabindex="0" aria-label="撥動${side==='left'?'原來':'調整後'}的琴弦">
  <rect x="${BRIDGE_X-45}" y="${STRING_Y-75}" width="720" height="190" rx="45" fill="transparent"/>
 </g>
 ${side==='right'?`<rect class="guitar-fret-zone" x="${fretX(12)-20}" y="546" width="${NUT_X-fretX(12)+40}" height="150" fill="transparent"/>`:''}
 </svg>`;
}
