// Static material and lighting layers; the measured silhouette always comes from bottomAt.
const material = new URL('./sonar-seabed.webp', import.meta.url).href;
const random = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
export function oceanEnvironment(bottomAt) {
 const points = Array.from({length:1001},(_,x)=>`${x},${bottomAt(x).toFixed(2)}`).join(' ');
 const body = `0,560 ${points} 1000,560`;
 const strata = Array.from({length:9},(_,i)=>{
   const d=9+i*17;
   const line=Array.from({length:251},(_,j)=>{const x=j*4;return `${x},${bottomAt(x)+d+Math.sin(x*.013+i*2)*5+Math.sin(x*.057+i)*2}`;}).join(' ');
   return `<polyline points="${line}" fill="none" stroke="${i%3?'#d4c6a3':'#323f39'}" opacity="${i%3?.16:.3}" stroke-width="${i%3?1:3}"/>`;
 }).join('');
 const gravel=Array.from({length:160},(_,i)=>{
   const x=random(i+5)*1000,y=bottomAt(x)+2+random(i+300)*55,r=1+random(i+80)*5;
   return `<path d="M${x-r} ${y}l${r*.6} ${-r*.65} ${r*1.1} ${r*.2} ${r*.7} ${r*.8} ${-r*.8} ${r*.45}Z" fill="${i%3?'#bfb69c':'#596159'}" opacity=".65"/><path d="M${x-r} ${y}l${r*.6} ${-r*.65} ${r*1.1} ${r*.2}" fill="none" stroke="#eee1b8" opacity=".4" stroke-width=".6"/>`;
 }).join('');
 const slopes=Array.from({length:200},(_,i)=>{
   const x=i*5,y=bottomAt(x),slope=(bottomAt(x+3)-bottomAt(x-3))/6;
   return `<path d="M${x} ${y}V560H${x+5}V${bottomAt(x+5)}Z" fill="${slope>0?'#102e32':'#f7dfb4'}" opacity="${Math.min(.22,Math.abs(slope)*.17)}"/>`;
 }).join('');
 return `<defs>
 <linearGradient id="sonar-sky" x2="0" y2="1"><stop stop-color="#c9d9d4"/><stop offset="1" stop-color="#f3f0db"/></linearGradient>
 <linearGradient id="sonar-water" x2=".15" y2="1"><stop stop-color="#90c7bf"/><stop offset=".28" stop-color="#529c9a"/><stop offset=".7" stop-color="#285f68"/><stop offset="1" stop-color="#173d4b"/></linearGradient>
 <linearGradient id="sonar-earth" x2=".15" y2="1"><stop stop-color="#c7b88e"/><stop offset=".5" stop-color="#887f65"/><stop offset="1" stop-color="#343f3c"/></linearGradient>
 <linearGradient id="sonar-depth-fog" x2="0" y2="1"><stop stop-color="#8fc8b9" stop-opacity=".08"/><stop offset="1" stop-color="#153e47" stop-opacity=".6"/></linearGradient>
 <linearGradient id="sonar-light" gradientUnits="userSpaceOnUse" x1="0" y1="137" x2="0" y2="190"><stop stop-color="#eaf5d8" stop-opacity=".27"/><stop offset="1" stop-color="#d1f1dc" stop-opacity="0"/></linearGradient>
 <linearGradient id="sonar-hull" x2=".2" y2="1"><stop stop-color="#5c8b79"/><stop offset=".45" stop-color="#285449"/><stop offset="1" stop-color="#102f30"/></linearGradient>
 <linearGradient id="sonar-cabin" x2="1" y2=".6"><stop stop-color="#fffdf1"/><stop offset=".55" stop-color="#dbe3d8"/><stop offset="1" stop-color="#92aea6"/></linearGradient>
 <linearGradient id="sonar-glass" x2=".5" y2="1"><stop stop-color="#254b56"/><stop offset=".5" stop-color="#75a7aa"/><stop offset="1" stop-color="#436f73"/></linearGradient>
 <filter id="sonar-soft-light"><feGaussianBlur stdDeviation="6"/></filter>
 <clipPath id="sonar-water-clip"><polygon points="0,137 1000,137 ${points.split(' ').reverse().join(' ')}"/></clipPath>
 <clipPath id="sonar-bed-clip"><polygon points="${body}"/></clipPath>
 <clipPath id="sonar-sea-clip"><rect y="137" width="1000" height="423"/></clipPath>
 </defs>
 <g id="sonar-atmosphere"><rect width="1000" height="560" fill="url(#sonar-sky)"/>
 <g fill="#f9f7e8" opacity=".55" filter="url(#sonar-soft-light)"><ellipse cx="180" cy="45" rx="130" ry="12"/><ellipse cx="440" cy="70" rx="160" ry="10"/><ellipse cx="860" cy="42" rx="72" ry="22"/></g>
 <path d="M0 125Q45 103 80 112T157 106T220 117T300 111T390 130H0Z" fill="#708e88" opacity=".24"/>
 <path d="M0 132Q69 118 106 128T202 123T298 134H0Z" fill="#5e817a" opacity=".2"/>
 <path d="M0 136H1000" stroke="#fcf6de" stroke-width="3" opacity=".7"/>
 </g>
 <g id="sonar-ocean-material"><rect y="137" width="1000" height="423" fill="url(#sonar-water)"/>
 <g clip-path="url(#sonar-sea-clip)" fill="url(#sonar-light)" filter="url(#sonar-soft-light)">${[70,220,380,570,740,900].map((x,i)=>`<path d="M${x} 133L${x+24} 133L${x-60+i*4} 548L${x-155} 548Z"/>`).join('')}</g>
 <g stroke="#e5f4da" fill="none">${Array.from({length:24},(_,i)=>{const x=i*45;return `<path d="M${x} ${139+random(i)*5}q12 -2 30 0" opacity="${.1+random(i+1)*.25}" stroke-width="${.6+random(i+5)}"/>`;}).join('')}</g>
 <g fill="#d9eee0" opacity=".15">${Array.from({length:50},(_,i)=>`<circle cx="${random(i)*1000}" cy="${155+random(i+44)*350}" r="${.4+random(i+55)*.6}"/>`).join('')}</g>
 </g>
 <g id="sonar-geology" clip-path="url(#sonar-bed-clip)">
 <rect width="1000" height="560" fill="url(#sonar-earth)"/>
 <image id="sonar-rock-material" href="${material}" x="0" y="145" width="1000" height="520" preserveAspectRatio="xMidYMid slice" opacity=".8"/>
 ${slopes}${strata}<polyline points="${points}" fill="none" stroke="#c8c4ac" stroke-width="9" opacity=".4"/>${gravel}
 <rect y="200" width="1000" height="360" fill="url(#sonar-depth-fog)"/>
 </g>
 <polyline id="sonar-seabed-edge" points="${points}" fill="none" stroke="#132f35" stroke-opacity=".5" stroke-width="5"/>
 <polyline points="${points}" fill="none" stroke="#d6c79f" stroke-opacity=".85" stroke-width="1.6"/>
 `;
}
export const surveyShip = x => `<g transform="translate(${x} 119)">
 <ellipse cy="17" rx="86" ry="5" fill="#163f42" opacity=".2"/>
 <path d="M-92 17q30 -4 49 0M52 17q20 -5 45 -2M-75 21H-46M53 22H78" fill="none" stroke="#e1eee0" opacity=".65" stroke-width="1.5"/>
 <path d="M-76 -15L-57 14Q0 28 61 10L78 -15Z" fill="url(#sonar-hull)" stroke="#274d49" stroke-width="1.5"/>
 <path d="M-65 -1Q0 8 69 -3L61 10Q0 28 -57 14Z" fill="#163e38" opacity=".4"/>
 <path d="M-70 -11H72L65 -5H-66Z" fill="#ece7d6"/><path d="M-54 13Q3 27 60 10" fill="none" stroke="#b87949" stroke-width="3"/>
 <path d="M-42 -17V-43H26L39 -17Z" fill="url(#sonar-cabin)" stroke="#9db2a8" stroke-width="1"/>
 <path d="M26 -43L39 -17H31L19 -43Z" fill="#91aba1"/><path d="M-28 -44V-65H13L25 -44Z" fill="url(#sonar-cabin)" stroke="#99b0a5" stroke-width="1"/>
 <path d="M-23 -60H-9V-48H-23ZM-3 -60H10L17 -48H-3Z" fill="url(#sonar-glass)"/>
 <path d="M-21 -58H-11M0 -58H8" stroke="#dbece2" stroke-width="1" opacity=".7"/>
 <path d="M-34 -36H-20V-24H-34ZM-12 -36H2V-24H-12ZM10 -36H24L29 -24H10Z" fill="url(#sonar-glass)"/>
 <path d="M-43 -44H29M-30 -66H15M-42 -20H38" stroke="#edf0e1" stroke-width="2"/>
 <path d="M-6 -65V-88M-21 -79H13M44 -17V-58L62 -40V-15M44 -56L59 -17" fill="none" stroke="#5d7c72" stroke-width="2"/>
 <path d="M-4 -87L17 -82L-4 -76" fill="#bc8a4f"/><path d="M-60 -18H65M-56 -18V-27M-44 -18V-27M34 -18V-27M55 -18V-27M-56 -27H-44M34 -27H55" stroke="#69887b" fill="none" stroke-width="1.2"/>
 <g fill="#b4c9bd">${[-40,-21,-2,17,36].map(x=>`<ellipse cx="${x}" cy="3" rx="2.2" ry="2.8"/>`).join('')}</g>
 <circle cx="33" cy="-31" r="4" fill="#e1b372" stroke="#f6e8c2" stroke-width="1.5"/>
 <path d="M-8 18H8V25H-8Z" fill="#bb8750" stroke="#694f33"/><path d="M-5 25H5" stroke="#f4dca6" stroke-width="2"/><circle cy="27" r="3" fill="#e7f4ce"/>
 </g>`;
