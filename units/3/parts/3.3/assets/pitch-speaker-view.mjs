// 位移是共同的放大示意尺度；A量測同一膜緣點到平衡位置的距離。
export const SIDE_AMPLITUDE=44;

export function sideSpeaker(side){
 const id=`pitch-side-${side}`;
 const cone='M335 105Q300 148 237 174L237 195Q300 221 335 264Z';
 const grain=Array.from({length:18},(_,i)=>{
  const x=65+i*1.8;
  return `<path d="M${x} 68q${i%3-1} 78 0 123t0 122"/>`;
 }).join('');
 return `<svg class="pitch-diaphragm" viewBox="0 0 520 420" role="img" aria-label="喇叭側面剖面：木箱、支架與磁鐵固定；振膜前後移動。虛線輪廓標出向內負A與向外正A，兩段距離相同，振幅是平衡位置到單側極限的距離。">
 <defs>
  <linearGradient id="${id}-wood"><stop stop-color="#80502d"/><stop offset=".18" stop-color="#bd8651"/><stop offset=".48" stop-color="#a56c3d"/><stop offset=".78" stop-color="#82512f"/><stop offset="1" stop-color="#b47d47"/></linearGradient>
  <linearGradient id="${id}-edge" x2="0" y2="1"><stop stop-color="#edc393"/><stop offset=".12" stop-color="#af7743"/><stop offset=".58" stop-color="#784a2a"/><stop offset="1" stop-color="#bf8b54"/></linearGradient>
  <linearGradient id="${id}-inside" x2=".8" y2="1"><stop stop-color="#69533e"/><stop offset=".6" stop-color="#ac8c65"/><stop offset="1" stop-color="#5d4936"/></linearGradient>
  <linearGradient id="${id}-steel" x2="1" y2=".5"><stop stop-color="#45515b"/><stop offset=".22" stop-color="#e2e7e7"/><stop offset=".46" stop-color="#9ba6ab"/><stop offset=".6" stop-color="#f2f2e8"/><stop offset=".82" stop-color="#7e8b90"/><stop offset="1" stop-color="#37454d"/></linearGradient>
  <linearGradient id="${id}-magnet" x2="0" y2="1"><stop stop-color="#8d999e"/><stop offset=".12" stop-color="#3d464b"/><stop offset=".5" stop-color="#59646a"/><stop offset=".8" stop-color="#293339"/><stop offset="1" stop-color="#899496"/></linearGradient>
  <linearGradient id="${id}-paper" x2="0" y2="1"><stop stop-color="#202a30"/><stop offset=".3" stop-color="#4c585d"/><stop offset=".48" stop-color="#717c7d"/><stop offset=".55" stop-color="#4c585d"/><stop offset=".85" stop-color="#303a40"/><stop offset="1" stop-color="#172128"/></linearGradient>
  <radialGradient id="${id}-cap" cx=".7" cy=".28"><stop stop-color="#a3ada9"/><stop offset=".25" stop-color="#65716f"/><stop offset=".65" stop-color="#303d40"/><stop offset="1" stop-color="#162228"/></radialGradient>
  <pattern id="${id}-grain" width="19" height="110" patternUnits="userSpaceOnUse"><path d="M2-4q7 28 1 56T5 114M11-4q-6 28 0 56t0 62M16-4q4 48-2 65t3 53" fill="none" stroke="#442a19" stroke-width=".7" opacity=".25"/><path d="M7 0q5 30 0 68t2 48" fill="none" stroke="#f1d2a0" stroke-width=".8" opacity=".3"/></pattern>
  <path id="${id}-outline" d="${cone}M243 171C281 172 281 197 243 198"/>
 </defs>
 <ellipse cx="243" cy="326" rx="185" ry="10" fill="#60492c" opacity=".12"/>
 <g class="pitch-fixed">
  <path d="M59 69L78 53H192L205 68V312L190 326H59Z" fill="url(#${id}-wood)" stroke="#77502e"/>
  <path d="M83 76H182V302H83Z" fill="url(#${id}-inside)" stroke="#62462f" stroke-width="2"/>
  <path d="M59 69H192V84H79V310H192V326H59Z" fill="url(#${id}-edge)"/>
  <path d="M59 69H192V84H79V310H192V326H59Z" fill="url(#${id}-grain)"/>
  <g fill="none" stroke="#e6c393" stroke-width=".6" opacity=".5">${grain}</g>
  <path d="M62 72H189M62 323H190M79 87V305" fill="none" stroke="#f5d9aa" stroke-width="1.2" opacity=".75"/>
  <path d="M182 84V309" stroke="#3f3329" stroke-width="6" opacity=".55"/>
  <path d="M214 159L407 83M214 210L407 286" fill="none" stroke="#4d585b" stroke-width="10" stroke-linecap="round"/>
  <path d="M214 157L407 81M214 208L407 284" fill="none" stroke="url(#${id}-steel)" stroke-width="6" stroke-linecap="round"/>
  <rect x="130" y="140" width="84" height="90" rx="12" fill="url(#${id}-magnet)" stroke="#3a464b" stroke-width="2"/>
  <path d="M136 146H206M136 222H206" stroke="#c0c9c9" stroke-width="1.5" opacity=".75"/>
  <rect x="200" y="135" width="15" height="100" rx="4" fill="url(#${id}-steel)" stroke="#4c595f"/>
  <rect x="214" y="171" width="30" height="28" rx="3" fill="#4e5a60"/>
  <rect x="400" y="77" width="14" height="215" rx="7" fill="url(#${id}-steel)" stroke="#58676b"/>
  <path d="M405 91V278" stroke="#f1f1e7" stroke-width="1.4" opacity=".8"/>
  <g fill="#333e42" stroke="#a7b4b5"><circle cx="407" cy="86" r="4"/><circle cx="407" cy="283" r="4"/></g>
  <path d="M405 86H409M405 283H409" stroke="#dbe1db"/>
 </g>
 <g class="pitch-extremes" stroke-width="1.7" stroke-dasharray="5 4" stroke-linejoin="round">
  <use href="#${id}-outline" transform="translate(-44 0)" class="pitch-extreme-in" stroke="#398d92" fill="#65a3a9" fill-opacity=".07"/>
  <use href="#${id}-outline" transform="translate(44 0)" class="pitch-extreme-out" stroke="#df9845" fill="#efba6c" fill-opacity=".1"/>
 </g>
 <g class="pitch-cone" transform="translate(0 0)">
  <rect x="219" y="174" width="26" height="21" rx="2" fill="#ab7c48" stroke="#785536"/>
  <path d="M223 175V194M227 175V194M231 175V194M235 175V194M239 175V194" stroke="#f0c787" stroke-width="1.3"/>
  <path d="${cone}" fill="url(#${id}-paper)" stroke="#303c42" stroke-width="1.7"/>
  <path d="M330 112Q296 151 242 177M330 258Q296 220 242 192" fill="none" stroke="#b2bcb8" opacity=".5" stroke-width="1.5"/>
  <path d="M324 122Q293 155 245 179M324 249Q293 214 245 190" fill="none" stroke="#1c272e" opacity=".5"/>
  <path d="M243 171C281 172 281 197 243 198Z" fill="url(#${id}-cap)" stroke="#28363b" stroke-width="1.4"/>
  <path d="M247 175Q266 176 270 184" fill="none" stroke="#d1d7c9" opacity=".6" stroke-width="1.3"/>
  <path d="M335 105Q300 148 237 174M237 195Q300 221 335 264" fill="none" stroke="#e9ac59" stroke-width="2"/>
  <path class="pitch-membrane-edge" d="M335 105V264" stroke="#e3a04a" stroke-width="3" stroke-linecap="round"/>
  <path d="M337 108V261" stroke="#ffe3a7" stroke-width=".8"/>
 </g>
 <path class="pitch-surround-top" d="M407 86C414 100 370 110 335 105" fill="none" stroke="#26373c" stroke-width="7" stroke-linecap="round"/>
 <path class="pitch-surround-bottom" d="M407 283C414 269 370 259 335 264" fill="none" stroke="#26373c" stroke-width="7" stroke-linecap="round"/>
 <g class="pitch-measurement" fill="none" stroke-width="1.5">
  <path class="pitch-equilibrium" d="M335 43V358" stroke="#507f9a" stroke-dasharray="5 5"/>
  <path class="pitch-in-guide" d="M291 264V358" stroke="#398d92" stroke-dasharray="4 4"/>
  <path class="pitch-out-guide" d="M379 264V358" stroke="#cf8939" stroke-dasharray="4 4"/>
  <path class="pitch-amplitude-in" d="M291 341H335M291 341l5-4m-5 4 5 4M335 341l-5-4m5 4-5 4" stroke="#287e85"/>
  <path class="pitch-amplitude-out" d="M335 341H379M335 341l5-4m-5 4 5 4M379 341l-5-4m5 4-5 4" stroke="#c77e2c"/>
 </g>
 <g class="pitch-side-labels" text-anchor="middle">
  <rect x="66" y="350" width="189" height="32" rx="9" fill="#fff9ed" stroke="#d4d8bd" stroke-width="1"/>
  <text x="160" y="371" fill="#466350" font-size="16">向內、向外一樣遠</text>
  <text x="335" y="32" class="pitch-zero-label">平衡位置</text>
  <text x="313" y="332" class="pitch-in-label">A</text><text x="357" y="332" class="pitch-out-label">A</text>
  <text x="291" y="380" class="pitch-in-label">向內<tspan x="291" dy="20">−A</tspan></text>
  <text x="335" y="380" class="pitch-zero-label">平衡<tspan x="335" dy="20">0</tspan></text>
  <text x="379" y="380" class="pitch-out-label">向外<tspan x="379" dy="20">+A</tspan></text>
 </g>
 </svg>`;
}
