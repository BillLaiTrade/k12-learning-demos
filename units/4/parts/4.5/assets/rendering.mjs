import {LIGHTS,MATERIALS,FILTERS,PRISM,SCREEN_RANGE,prismRays,rgbCss,wavelengthRgb,linearToSrgb,mixAt,colorName} from './color-model.mjs';
export function rounded(ctx,x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}}
export function drawScreen(canvas,state,close=true){
 const rays=prismRays(state.light,state.inserted),ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
 const low=Math.min(...rays.map(r=>r.landing)),high=Math.max(...rays.map(r=>r.landing));
 const margin=state.inserted&&state.light==='white'?.07:.14;
 const domain=close?[low-margin,high+margin]:SCREEN_RANGE;
 ctx.fillStyle='#e9e8dc';ctx.fillRect(0,0,w,h);
 const pixels=ctx.getImageData(0,0,w,h),profile=[];
 for(let x=0;x<w;x++){
  const z=domain[0]+(x+.5)/w*(domain[1]-domain[0]);let rgb=[0,0,0];
  if(!state.inserted){const f=Math.exp(-((z/ .027)**4));rgb=(state.light==='white'?[1,1,1]:LIGHTS[state.light].rgb).map(v=>v*f);}
  else{
   const sigma=state.light==='white'?.009:.025;
   for(const ray of rays){const f=Math.exp(-.5*((z-ray.landing)/sigma)**2);const c=state.light==='white'?ray.rgb:LIGHTS[state.light].rgb;for(let i=0;i<3;i++)rgb[i]+=c[i]*f;}
   const peak=Math.max(...rgb,1);rgb=rgb.map(v=>v/peak);
  }
  profile.push(rgb);
 }
 for(let y=0;y<h;y++){
  const vertical=Math.exp(-(((y/h-.51)/.23)**8));
  for(let x=0;x<w;x++){
   const index=(y*w+x)*4,rgb=profile[x];
   for(let c=0;c<3;c++)pixels.data[index+c]=Math.round(255*linearToSrgb(.012+rgb[c]*vertical*.95));
   pixels.data[index+3]=255;
  }
 }
 ctx.putImageData(pixels,0,0);ctx.strokeStyle='#c7c9bc';ctx.lineWidth=4;ctx.strokeRect(2,2,w-4,h-4);
 canvas.setAttribute('aria-label',state.inserted?(state.light==='white'?'同一白幕上的連續色帶局部近看':`白幕接收到${LIGHTS[state.light].name}`):`白幕接收到未經三稜鏡的${LIGHTS[state.light].name}`);
 return{rays,domain};
}
function defs(id){return `<defs><linearGradient id="${id}-wood" x2="0" y2="1"><stop stop-color="#bf9865"/><stop offset=".45" stop-color="#9b7247"/><stop offset="1" stop-color="#684b31"/></linearGradient><linearGradient id="${id}-metal"><stop stop-color="#475d5c"/><stop offset=".35" stop-color="#dce6df"/><stop offset=".55" stop-color="#788d86"/><stop offset="1" stop-color="#344e49"/></linearGradient><linearGradient id="${id}-glass"><stop stop-color="#bce6dd" stop-opacity=".6"/><stop offset=".45" stop-color="#effffc" stop-opacity=".18"/><stop offset="1" stop-color="#80b9b2" stop-opacity=".65"/></linearGradient></defs>`;}
function foot(x,id){return `<path d="M${x-26} 346h57l13 10h-81Z" fill="url(#${id}-metal)"/><path d="M${x} 343V280" stroke="url(#${id}-metal)" stroke-width="8"/>`;}
export function prismDiagram(state,id){
 const rays=prismRays(state.light,state.inserted),map=([x,z])=>[84+(x+3.3)/6.7*658,75+(z+3.8)/4.7*224],poly=PRISM.map(p=>map([p[0],p[1]+(state.inserted?0:1.5)]));
 const points=poly.map(p=>p.join(',')).join(' '),source=map([-3.3,0]);
 const lines=state.rays?rays.filter((_,i)=>i%3===0).map(r=>`<path d="${(state.inserted?r.points.slice(1):r.points).map((p,i)=>`${i?'L':'M'}${map(p).join(' ')}`).join('')}" fill="none" stroke="${state.light==='white'?(state.inserted?rgbCss(r.rgb):'#fffbe1'):rgbCss(LIGHTS[state.light].rgb)}" stroke-width="${state.inserted?1.3:3}" opacity=".75"/>`).join(''):'';
 const marks=state.inserted?rays.map(r=>{const p=map(r.points.at(-1));return `<path d="M742 ${p[1]}h13" stroke="${state.light==='white'?rgbCss(r.rgb):rgbCss(LIGHTS[state.light].rgb)}" stroke-width="2.4"/>`;}).join(''):`<path d="M742 ${source[1]}h13" stroke="${rgbCss(LIGHTS[state.light].rgb)}" stroke-width="9"/>`;
 return `<svg viewBox="0 0 850 400" aria-label="三稜鏡與白幕的光路示意">${defs(id)}<path d="M0 0H850V400H0Z" fill="#9eaf9e"/><path d="M0 325L850 312V400H0Z" fill="url(#${id}-wood)"/><path d="M0 347H850M0 379H850" stroke="#dbb789" opacity=".2"/>${foot(112,id)}${foot(748,id)}<path d="M737 60h24v268h-24Z" fill="#f8f7eb" stroke="#56716b" stroke-width="3"/>${marks}<rect x="31" y="${source[1]-27}" width="83" height="54" rx="11" fill="url(#${id}-metal)"/><ellipse cx="113" cy="${source[1]}" rx="8" ry="25" fill="#263f37"/><ellipse cx="116" cy="${source[1]}" rx="5" ry="18" fill="${rgbCss(LIGHTS[state.light].rgb)}"/>${state.rays&&state.inserted?`<path d="M${map(rays[0].points[0]).join(' ')}L${map(rays[0].points[1]).join(' ')}" fill="none" stroke="${rgbCss(LIGHTS[state.light].rgb)}" stroke-width="3"/>`:''}${lines}<g data-prism-hit role="button" tabindex="0" aria-label="${state.inserted?'移開':'放入'}三稜鏡" style="cursor:grab"><polygon points="${poly.map(p=>`${p[0]},${p[1]-32}`).join(' ')}" fill="url(#${id}-glass)" stroke="#e4fff5" stroke-width="2"/><polygon points="${points}" fill="url(#${id}-glass)" stroke="#e4fff5" stroke-width="2"/>${poly.map(p=>`<path d="M${p[0]} ${p[1]}v-32" stroke="#b5e0d5" stroke-width="2"/>`).join('')}</g><text x="108" y="378" text-anchor="middle" fill="#fff9eb" font-size="17">光源</text><text x="748" y="378" text-anchor="middle" fill="#fff9eb" font-size="17">白幕</text></svg>`;
}
function surfaceDiagram(state,id,signal){
 const input=rgbCss(signal.incoming),output=rgbCss(signal.outgoing),peak=Math.max(...signal.outgoing);
 const shade=f=>rgbCss(signal.outgoing.map(v=>v*f));
 const paths=[[[512,176],[331,112]],[[521,183],[294,172]],[[510,193],[309,246]],[[522,199],[373,318]],[[529,178],[407,120]],[[514,187],[330,297]],[[525,191],[278,212]]];
 return `<svg viewBox="0 0 850 400" aria-hidden="true">${defs(id)}
 <defs>
  <linearGradient id="${id}-paper" x2=".8" y2="1"><stop stop-color="${shade(.77)}"/><stop offset=".5" stop-color="${shade(.9)}"/><stop offset="1" stop-color="${shade(.65)}"/></linearGradient>
  <radialGradient id="${id}-lit"><stop stop-color="${shade(1.25)}" stop-opacity=".6"/><stop offset="1" stop-color="${output}" stop-opacity="0"/></radialGradient>
  <linearGradient id="${id}-beam"><stop stop-color="${input}" stop-opacity=".14"/><stop offset="1" stop-color="${input}" stop-opacity=".06"/></linearGradient>
  <clipPath id="${id}-card"><path d="M455 89L579 120V269L455 238Z"/></clipPath>
  <pattern id="${id}-grain" width="9" height="11" patternUnits="userSpaceOnUse"><path d="M2 1l1 3M6 7l1 2" stroke="#fff" stroke-opacity=".055" stroke-width=".6"/></pattern>
  ${paths.map(([from,to],i)=>`<linearGradient id="${id}-diffuse-${i}" gradientUnits="userSpaceOnUse" x1="${from[0]}" y1="${from[1]}" x2="${to[0]}" y2="${to[1]}"><stop stop-color="${output}" stop-opacity="${peak*.6}"/><stop offset="1" stop-color="${output}" stop-opacity="0"/></linearGradient>`).join('')}
 </defs>
 <path d="M0 0H850V400H0Z" fill="#9eaf9e"/>
 <path d="M0 210L590 128L850 253V400H0Z" fill="url(#${id}-wood)"/>
 <path d="M100 351L640 289M107 361L647 299" stroke="#9ca99c" stroke-width="5"/>
 <path d="M121 337h73l12 12h-99Z" fill="#293d36"/><path d="M156 339V265" stroke="url(#${id}-metal)" stroke-width="8"/>
 <rect x="88" y="233" width="104" height="54" rx="13" fill="url(#${id}-metal)"/>
 <ellipse cx="194" cy="260" rx="8" ry="23" fill="${input}"/>
 <path d="M489 298h62l10 12h-82Z" fill="#293d36"/><path d="M521 300V252" stroke="url(#${id}-metal)" stroke-width="7"/>
 <path d="M455 89L579 120V269L455 238Z" fill="url(#${id}-paper)" stroke="#344c3f" stroke-width="6"/>
 <g clip-path="url(#${id}-card)"><ellipse cx="517" cy="185" rx="36" ry="43" fill="url(#${id}-lit)"/><path d="M452 87H582V272H452Z" fill="url(#${id}-grain)"/></g>
 ${state.rays?`<path d="M202 247L518 156L537 208L202 269Z" fill="url(#${id}-beam)"/>
 ${paths.map(([from,to],i)=>`<path d="M${from.join(' ')}L${to.join(' ')}" stroke="url(#${id}-diffuse-${i})" stroke-width="1.4" fill="none"/>`).join('')}
 <path d="M389 174l-6-4 6-2M419 269l-2 6 6-3" stroke="${output}" stroke-opacity="${peak*.3}" stroke-width="1.4" fill="none"/>`:''}
 </svg>`;
}
export function materialDiagram(state,id,signal){
 if(state.kind==='surface')return surfaceDiagram(state,id,signal);
 const kind=state.kind,filter=kind==='filter'||kind==='eye'&&state.mode==='transmission';
 const input=rgbCss(signal.incoming),output=rgbCss(signal.outgoing),blocked=kind==='eye'&&state.blocked;
 const fill=filter?(FILTERS[state.filter||'green']?.css||'#43a672'):rgbCss(signal.outgoing);
 return `<svg viewBox="0 0 850 400" aria-hidden="true">${defs(id)}<path d="M0 0H850V400H0Z" fill="#9eaf9e"/><path d="M0 325L850 312V400H0Z" fill="url(#${id}-wood)"/>${foot(123,id)}${kind==='filter'&&state.filter==='clear'?'':foot(425,id)}${foot(730,id)}<rect x="43" y="159" width="90" height="66" rx="12" fill="url(#${id}-metal)"/><ellipse cx="135" cy="192" rx="9" ry="29" fill="#263f37"/><ellipse cx="138" cy="192" rx="5" ry="20" fill="${input}"/><g opacity="${kind==='filter'&&state.filter==='clear'?0:1}"><rect x="407" y="113" width="45" height="168" rx="5" fill="#e0e5d6" stroke="#47685c" stroke-width="4"/><rect x="414" y="120" width="31" height="152" fill="${fill}" opacity="${filter?.55:1}"/></g>${state.rays?`<path d="M143 192H407" stroke="${input}" stroke-width="5" opacity=".8"/>${filter?`<path d="M451 192H${blocked?580:721}" stroke="${output}" stroke-width="6" opacity=".85"/>`:`<path d="M406 192L${blocked?535:720} 252M406 192L344 80M406 192L260 264" stroke="${output}" stroke-width="4" opacity=".8" fill="none"/>`}`:''}<rect x="715" y="125" width="28" height="160" rx="3" fill="#f5f3e9" stroke="#56716b" stroke-width="3"/>${!blocked?`<path d="M718 ${filter?163:226}h22v52h-22Z" fill="${output}"/>`:''}${blocked?'<rect x="547" y="113" width="25" height="174" rx="4" fill="#2e3d37" stroke="#8b9e90" stroke-width="3"/>':''}<text x="118" y="378" text-anchor="middle" fill="#fff9eb" font-size="17">光源</text><text x="429" y="378" text-anchor="middle" fill="#fff9eb" font-size="17">${filter?'透明色片':'不透明色卡'}</text><text x="730" y="378" text-anchor="middle" fill="#fff9eb" font-size="17">${kind==='eye'?'觀察位置':filter?'白幕':'反射光'}</text></svg>`;
}
export function drawObservation(canvas,state,signal){
 const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height; c.clearRect(0,0,w,h);
 const bg=c.createLinearGradient(0,0,w,h);bg.addColorStop(0,'#fbfbf2');bg.addColorStop(1,'#e2e9db');c.fillStyle=bg;c.fillRect(0,0,w,h);
 function card(x,y,size,rgb,label){c.save();c.shadowBlur=13;c.shadowColor='#20362933';c.shadowOffsetY=6;rounded(c,x,y,size,size,9,rgbCss(rgb),'#c5d0bf');c.restore();if(label){c.fillStyle='#4d6454';c.font='23px sans-serif';c.textAlign='center';c.fillText(label,x+size/2,y+size+39);}}
 if(state.kind==='lighting'){
  card(30,68,155,MATERIALS[state.material].rgb,'白光下');card(235,68,155,signal.outgoing,'目前照明');
 }else if(state.kind==='filter'||state.kind==='eye'&&state.mode==='transmission'){
  rounded(c,26,28,w-52,h-56,10,'#13261f','#a6b6a1');const rgb=state.blocked?[0,0,0]:signal.outgoing;
  if(Math.max(...rgb)>.01){const g=c.createRadialGradient(w/2,h/2,20,w/2,h/2,120);g.addColorStop(0,rgbCss(rgb));g.addColorStop(.68,rgbCss(rgb));g.addColorStop(1,'#14251f');c.fillStyle=g;c.fillRect(30,32,w-60,h-64);}
  if(state.blocked){c.fillStyle='#63796a';c.fillRect(70,50,w-140,h-100);}
 }else{
  const rgb=state.blocked?[.005,.005,.005]:signal.outgoing;card(105,45,210,rgb,'');
  if(state.blocked){c.fillStyle='#788b7c';c.fillRect(99,39,222,222);c.fillStyle='#e6ece0';c.font='26px sans-serif';c.textAlign='center';c.fillText('視線被擋住',w/2,h/2+8);}
 }
 canvas.setAttribute('aria-label',state.blocked?'遮光板擋住物體到眼睛的光路':`目前接收到的色光呈${colorName(signal.outgoing)}`);
}
export function drawMix(canvas,spots){
 const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
 const bg=ctx.createLinearGradient(0,0,0,h);bg.addColorStop(0,'#28433c');bg.addColorStop(.78,'#657e6b');bg.addColorStop(1,'#aa8357');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
 const screen={x:330,y:35,w:610,h:360};rounded(ctx,screen.x-12,screen.y-12,screen.w+24,screen.h+24,12,'#c8d3c1','#edf3e9');
 ctx.fillStyle='#314c40';ctx.fillRect(620,screen.y+screen.h+12,16,42);rounded(ctx,565,439,130,12,6,'#364f46');
 const small=document.createElement('canvas');small.width=360;small.height=220;const sc=small.getContext('2d'),data=sc.createImageData(360,220);
 for(let y=0;y<220;y++)for(let x=0;x<360;x++){
  const color=mixAt((x+.5)/360,(y+.5)/220,spots);const p=(y*360+x)*4;
  for(let i=0;i<3;i++)data.data[p+i]=Math.round(255*linearToSrgb(.005+color[i]));data.data[p+3]=255;
 }
 sc.putImageData(data,0,0);ctx.drawImage(small,screen.x,screen.y,screen.w,screen.h);
 const colors=['#ef6b59','#65c38a','#6a9bef'];
 spots.forEach((s,i)=>{
  const y=107+i*115,target=[screen.x+s.x*screen.w,screen.y+s.y*screen.h];
  if(s.on){ctx.save();ctx.beginPath();ctx.rect(0,0,screen.x,canvas.height);ctx.clip();const glow=ctx.createLinearGradient(130,y,target[0],target[1]);glow.addColorStop(0,colors[i]+'55');glow.addColorStop(1,colors[i]+'03');ctx.fillStyle=glow;ctx.beginPath();ctx.moveTo(135,y-10);ctx.lineTo(target[0]-60,target[1]-70);ctx.lineTo(target[0]+60,target[1]+70);ctx.lineTo(135,y+10);ctx.closePath();ctx.fill();ctx.restore();}
  ctx.fillStyle='#586e63';ctx.fillRect(85,y+22,9,50);rounded(ctx,55,y+64,80,9,4,'#344b42');
  const metal=ctx.createLinearGradient(45,y-22,120,y+22);metal.addColorStop(0,'#293d37');metal.addColorStop(.4,'#9eafa1');metal.addColorStop(.7,'#435b4e');metal.addColorStop(1,'#22382e');rounded(ctx,42,y-24,88,48,11,metal,'#9fb5a6');
  ctx.beginPath();ctx.ellipse(130,y,9,22,0,0,Math.PI*2);ctx.fillStyle=s.on?colors[i]:'#31473b';ctx.fill();ctx.strokeStyle='#c0cebd';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#f3f7eb';ctx.font='20px sans-serif';ctx.textAlign='center';ctx.fillText(['紅光','綠光','藍光'][i],87,y+98);
 });
 ctx.fillStyle='#e6eddf';ctx.font='19px sans-serif';ctx.textAlign='right';ctx.fillText('白幕',screen.x+screen.w-12,screen.y+screen.h+40);
 return screen;
}
