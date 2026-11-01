import {ROOM,wavefronts} from './room-wave-model.mjs?v=20261101-room';
const avatar='../../../../shared-assets/characters/dialogue-character-avatars.png?v=clean-shaven-grandpa';
export function roomScene(){
 const x=50+ROOM.sourceX*150,y=50+ROOM.sourceY*150;
 return `<defs>
 <linearGradient id="room-wall" x2="0" y2="1"><stop stop-color="#e8deca"/><stop offset="1" stop-color="#a39984"/></linearGradient>
 <linearGradient id="room-daylight"><stop stop-color="#fffbde" stop-opacity="0"/><stop offset="1" stop-color="#fffde9" stop-opacity=".2"/></linearGradient>
 <pattern id="room-fabric" width="5" height="5" patternUnits="userSpaceOnUse"><rect width="5" height="5" fill="#668e85"/><path d="M0 1H5M1 0V5" stroke="#96b2a1" stroke-width=".5" opacity=".35"/></pattern>
 <clipPath id="room-interior"><rect x="50" y="50" width="900" height="540"/></clipPath>
 <clipPath id="room-girl-clip"><circle cx="${x}" cy="${y}" r="35"/></clipPath></defs>
 <rect x="5" y="5" width="990" height="630" rx="12" fill="#8f897a"/>
 <rect x="12" y="12" width="976" height="616" rx="5" fill="url(#room-wall)"/>
 <path d="M12 12L50 50H950L988 12M12 628L50 590H950L988 628M12 12L50 50V590L12 628M988 12L950 50V590L988 628" stroke="#9a907d" stroke-width="2" fill="none"/>
 <image href="assets/room-floor.webp" x="50" y="50" width="900" height="540" preserveAspectRatio="xMidYMid slice"/>
 <rect x="50" y="50" width="900" height="540" fill="#fff9e9" opacity=".38"/><rect x="50" y="50" width="900" height="540" fill="url(#room-daylight)"/>
 <path d="M950 102V290M950 340V516" stroke="#f8f8df" stroke-width="9"/>
 <path d="M954 102V290M954 340V516" stroke="#b3d0c5" stroke-width="3"/>
 <g id="room-panels" visibility="hidden">${Array.from({length:8},(_,i)=>`<rect x="${52+i*112}" y="19" width="108" height="29" rx="3" fill="url(#room-fabric)" stroke="#4e776e"/>`).join('')}${Array.from({length:5},(_,i)=>`<rect x="19" y="${52+i*108}" width="29" height="104" rx="3" fill="url(#room-fabric)" stroke="#4e776e"/>`).join('')}</g>
 <g id="room-waves" clip-path="url(#room-interior)"></g>
 <circle cx="${x}" cy="${y}" r="38" fill="#fff9e8" stroke="#f9f6de" stroke-width="3"/>
 <image href="${avatar}" x="${x-35}" y="${y-35}" width="140" height="70" clip-path="url(#room-girl-clip)"/>
 <rect x="${x-35}" y="${y+43}" width="70" height="30" rx="10" fill="#fffdf1" opacity=".96"/>
 <text x="${x}" y="${y+65}" text-anchor="middle" fill="#284f3d" font-size="23" font-weight="700">小葵</text>`;
}
export function drawWaves(elapsed,treated,kind){
 const fronts=wavefronts(elapsed,treated,kind);
 document.getElementById('room-waves').innerHTML=fronts.map(f=>[0,.16].map((gap,i)=>{
  const r=(f.radius-gap)*150;if(r<=0)return '';
  return `<circle class="room-wave ${f.order?'room-wave--reflected':'room-wave--outgoing'}" data-order="${f.order}" data-wall-hits="${f.left},${f.right},${f.top},${f.bottom}" data-gain="${f.gain}" cx="${50+f.x*150}" cy="${50+f.y*150}" r="${r}" fill="none" stroke="${f.order?'#dd791c':'#279e61'}" stroke-width="${i?2.5:5}" opacity="${f.opacity*(1-i*.22)}"/>`;
 }).join('')).join('');
 return fronts;
}
