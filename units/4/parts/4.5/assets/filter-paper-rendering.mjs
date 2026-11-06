import {MATERIALS,FILTERS,rgbCss,colorName} from './color-model.mjs?v=science-reviewed-20261106';

// Fixed exposure, no additive glow. The optical model is not changed by drawing.
export function drawFilterPaper(canvas,state,signal){
 const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
 c.fillStyle='#28312b';c.fillRect(0,0,w,h);
 const x=w*.10,y=h*.12,pw=w*.8,ph=h*.76;
 const level=.025*Math.max(...MATERIALS[state.material].rgb),base=rgbCss([level,level,level]);
 c.fillStyle='#718074';c.fillRect(x-3,y-3,pw+6,ph+6);
 c.fillStyle=base;c.fillRect(x,y,pw,ph);
 // Neutral dim paper and a subdued reflected-light patch, kept within the sheet.
 const glow=c.createRadialGradient(w*.5,h*.5,0,w*.5,h*.5,h*.33);
 const color=signal.outgoing.map(v=>v*.28);
 glow.addColorStop(0,rgbCss(color));glow.addColorStop(.48,rgbCss(color));glow.addColorStop(1,base);
 c.fillStyle=glow;c.fillRect(x,y,pw,ph);
 canvas.setAttribute('aria-label',`紙張反射的光呈${colorName(signal.outgoing)}，受光區為定性示意`);
}
export function filterPaperDiagram(state,id,signal){
 const input=rgbCss(signal.incoming),through=rgbCss(signal.transmitted),reflected=rgbCss(signal.outgoing);
 const peak=Math.max(...signal.outgoing),shade=rgbCss(signal.outgoing.map(v=>v*.28));
 const level=.025*Math.max(...MATERIALS[state.material].rgb),base=rgbCss([level,level,level]);
 const paths=[[[692,169],[596,117]],[[699,181],[571,177]],[[692,193],[592,253]],[[704,199],[645,293]]];
 return `<svg viewBox="0 0 850 400" aria-hidden="true"><defs>
 <linearGradient id="${id}-wood" x2="0" y2="1"><stop stop-color="#59452e"/><stop offset="1" stop-color="#2b241b"/></linearGradient>
 <linearGradient id="${id}-metal"><stop stop-color="#25332e"/><stop offset=".45" stop-color="#89948a"/><stop offset="1" stop-color="#273630"/></linearGradient>
 <radialGradient id="${id}-patch"><stop stop-color="${shade}"/><stop offset=".5" stop-color="${shade}"/><stop offset="1" stop-color="${base}"/></radialGradient>
 <clipPath id="${id}-paper"><path d="M656 93L752 119V279L656 252Z"/></clipPath></defs>
 <path d="M0 0H850V400H0Z" fill="#28312b"/><path d="M0 286L850 256V400H0Z" fill="url(#${id}-wood)"/>
 <path d="M100 344H766M100 352H766" stroke="#69776c" stroke-width="3"/>
 <g fill="#263b30" stroke="#7a897b" stroke-width="2"><path d="M94 331h61v15H94Z"/><path d="M399 331h61v15H399Z"/><path d="M675 324h61v15H675Z"/></g>
 <g stroke="url(#${id}-metal)" stroke-width="7"><path d="M125 331V225"/><path d="M430 331V264"/><path d="M705 324V272"/></g>
 <rect x="47" y="164" width="83" height="58" rx="11" fill="url(#${id}-metal)"/><ellipse cx="134" cy="193" rx="7" ry="24" fill="${input}"/>
 <path d="M414 110h33v166h-33Z" fill="${FILTERS[state.filter].css}" fill-opacity="${state.filter==='clear'?.16:.4}" stroke="#87988a" stroke-width="4"/>
 <path d="M656 93L752 119V279L656 252Z" fill="${base}" stroke="#667568" stroke-width="5"/>
 <g clip-path="url(#${id}-paper)"><ellipse cx="704" cy="185" rx="43" ry="62" fill="url(#${id}-patch)"/></g>
 ${state.rays?`<path d="M142 193H414" stroke="${input}" stroke-width="2" fill="none"/><path d="M447 193H690" stroke="${through}" stroke-width="2" fill="none"/>
 <path d="M284 190l6 3-6 3" stroke="${input}" fill="none"/><path d="M554 190l6 3-6 3" stroke="${through}" fill="none"/>
 ${paths.map(([a,b])=>`<path d="M${a.join(' ')}L${b.join(' ')}" stroke="${reflected}" stroke-opacity="${peak*.4}" stroke-width="1.2" fill="none"/>`).join('')}`:''}
 <g fill="#dbe5d7" text-anchor="middle" font-size="16"><text x="119" y="377">光源</text><text x="430" y="377">${FILTERS[state.filter].name}</text><text x="707" y="377">${MATERIALS[state.material].name.replace('色色卡','紙')}</text></g></svg>`;
}
