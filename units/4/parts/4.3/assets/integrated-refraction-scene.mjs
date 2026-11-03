import {drawDirections} from './light-beam.mjs?v=20261103-integrated1';
const path=points=>`M${points.map(p=>p.join(' ')).join('L')}`;
export function mountScene(svg,prefix){
 svg.innerHTML=`<defs>
 <filter id="oblique-glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="5"/></filter>
 <filter id="oblique-shadow" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="2" dy="6" stdDeviation="4" flood-color="#332b20" flood-opacity=".4"/></filter>
 <linearGradient id="oblique-metal" x1="0" x2="1"><stop stop-color="#10191b"/><stop offset=".18" stop-color="#6d7777"/><stop offset=".4" stop-color="#263033"/><stop offset=".78" stop-color="#101719"/><stop offset="1" stop-color="#414b4c"/></linearGradient>
 <linearGradient id="oblique-rim" x1="0" x2="1"><stop stop-color="#555d5b"/><stop offset=".3" stop-color="#d5d9d1"/><stop offset=".55" stop-color="#545e5b"/><stop offset="1" stop-color="#111c1b"/></linearGradient>
 <radialGradient id="oblique-dark-lens"><stop stop-color="#668480"/><stop offset=".5" stop-color="#243c3c"/><stop offset="1" stop-color="#0c181a"/></radialGradient>
 <radialGradient id="oblique-lit-lens"><stop stop-color="#fffbe1"/><stop offset=".45" stop-color="#ffde78"/><stop offset="1" stop-color="#926b26"/></radialGradient>
 </defs>
 <svg class="integrated-upper-texture" x="0" y="0" preserveAspectRatio="none"><image class="integrated-photo" width="1254" height="1254"/></svg>
 <svg class="integrated-lower-texture" x="0" preserveAspectRatio="none"><image class="integrated-photo" width="1254" height="1254"/></svg>
 <path class="integrated-interface"/><path class="integrated-normal-base"/><path class="oblique-normal"/>
 <g class="integrated-annotations" visibility="hidden" aria-hidden="true">
  <path class="integrated-in-sector"/><path class="integrated-out-sector"/><path class="integrated-reference"/>
  <path class="integrated-in-arc"/><path class="integrated-out-arc"/>
  <path class="integrated-bend" marker-end="url(#oblique-bend-arrow)"/>
  <g class="integrated-in-label"><path/><text/></g><g class="integrated-out-label"><path/><text/></g>
 </g>
 <g class="oblique-beam" visibility="hidden"><path class="lesson-beam-halo"/><path class="lesson-beam-ray"/><path class="oblique-core lesson-beam-core"/><path class="lesson-beam-direction"/><path class="lesson-beam-direction"/></g>
 <text class="integrated-normal-name">法線</text>
 <g class="integrated-medium integrated-upper-medium"><rect/><text class="medium-name"/><text class="medium-speed"/></g>
 <g class="integrated-medium integrated-lower-medium"><rect/><text class="medium-name"/><text class="medium-speed"/></g>
 <g class="oblique-source" tabindex="0" role="slider" aria-label="光源，點擊或按Enter發射，拖曳或方向鍵調角度" aria-keyshortcuts="Enter Space" aria-valuemin="0" aria-valuemax="40" aria-valuenow="30" aria-valuetext="30度" data-lit="false">
    <title>點燈發射；拖曳調角度</title>
    <rect class="oblique-source-hit" x="-48" y="-82" width="96" height="96" fill="transparent"/>
    <rect class="oblique-focus" x="-42" y="-86" width="84" height="105" rx="15"/>
    <g class="oblique-source-lamp" filter="url(#oblique-shadow)"><rect x="-35" y="-78" width="70" height="69" rx="13" fill="url(#oblique-metal)" stroke="#131e20" stroke-width="2"/><path d="M-23-69V-25M-18-69V-25" stroke="#9aa5a1" stroke-width="2" opacity=".45"/><rect x="-38" y="-23" width="76" height="16" rx="5" fill="url(#oblique-rim)"/><ellipse cx="0" cy="-5" rx="35" ry="15" fill="url(#oblique-rim)" stroke="#162423" stroke-width="2"/><ellipse class="oblique-lens" cx="0" cy="-3" rx="26" ry="10" fill="url(#oblique-dark-lens)" stroke="#111d1c" stroke-width="2"/></g>
   </g>`;
 svg.querySelector('defs').insertAdjacentHTML('beforeend','<marker id="oblique-bend-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="12" markerHeight="12" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#24783a" stroke="#fffde8" stroke-width=".7"/></marker>');
 svg.innerHTML=svg.innerHTML.replaceAll('id="oblique-',`id="${prefix}-`).replaceAll('url(#oblique-',`url(#${prefix}-`);
 const q=s=>svg.querySelector(s),source=q('.oblique-source'),beam=q('.oblique-beam');let project,ratio=1,scale=1,g,H;
 function polar(angle,r,upper=false,left=false){const a=angle*Math.PI/180;return[H[0]+(left?-1:1)*r*Math.sin(a),H[1]+(upper?-1:1)*r*Math.cos(a)];}
 function angleMark(angle,r,upper,left){if(!angle)return{arc:'',sector:''};const a=polar(0,r,upper,left),b=polar(angle,r,upper,left),arc=`M${a.join(' ')}A${r} ${r} 0 0 0 ${b.join(' ')}`;return{arc,sector:`M${H.join(' ')}L${arc.slice(1)}Z`};}
 function label(selector,title,value,x,y,anchor,font){const group=q(selector),text=group.querySelector('text');text.style.fontSize=`${font}px`;text.setAttribute('text-anchor',anchor);text.innerHTML=`<tspan x="${x}" y="${y}">${title}</tspan><tspan x="${x}" dy="${font*1.48}">${value}°</tspan>`;}
 return{source,project:p=>project(p),configure(next,photo){
  g=next;const phone=getComputedStyle(svg.parentElement).aspectRatio.startsWith('900'),width=phone?900:1200,height=phone?1400:820;H=phone?[400,650]:[500,390];scale=phone?1.3:1.25;
  svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.dataset.phone=String(phone);svg.dataset.hitX=H[0];svg.dataset.hitY=H[1];svg.dataset.projectScale=scale;
  project=p=>[H[0]+(p[0]-650)*scale,H[1]+(p[1]-570)*scale];const m=svg.getScreenCTM();ratio=Math.max(.05,Math.hypot(m.a,m.b));
  const texture=slow=>slow?'250 610 750 220':'250 310 750 220';for(const [selector,slow,y,h]of [['.integrated-upper-texture',g.reverse,0,H[1]],['.integrated-lower-texture',!g.reverse,H[1],height-H[1]]]){const e=q(selector);for(const[k,v]of Object.entries({x:0,y,width,height:h,viewBox:texture(slow)}))e.setAttribute(k,String(v));e.querySelector('image').setAttribute('href',photo);}
  q('.integrated-interface').setAttribute('d',`M0 ${H[1]}H${width}`);const normal=`M${H[0]} ${phone?260:125}V${phone?1045:775}`;q('.oblique-normal').setAttribute('d',normal);q('.integrated-normal-base').setAttribute('d',normal);
  const name=q('.integrated-normal-name');name.setAttribute('x',H[0]+24);name.setAttribute('y',phone?300:155);name.style.fontSize=`${Math.max(26,15/ratio)}px`;
  const lampScale=Math.max(1,28/(70*ratio)),p=project(g.source);source.setAttribute('transform',`translate(${p.join(' ')}) rotate(${-g.degrees}) scale(${lampScale})`);source.setAttribute('aria-valuenow',g.degrees);source.setAttribute('aria-valuetext',`${g.degrees}度，折射角${g.outgoing.toFixed(1)}度`);
  const hitSize=Math.max(96,44/(ratio*lampScale));for(const[k,v]of Object.entries({x:-hitSize/2,y:-34-hitSize/2,width:hitSize,height:hitSize}))source.querySelector('.oblique-source-hit').setAttribute(k,v);
  for(const[selector,slow,y]of [['.integrated-upper-medium',g.reverse,phone?445:235],['.integrated-lower-medium',!g.reverse,phone?930:655]]){const badge=q(selector),name=badge.querySelector('.medium-name'),speed=badge.querySelector('.medium-speed'),font=Math.max(26,14/ratio);name.textContent=slow?(g.medium==='water'?'水':'玻璃'):'空氣';speed.textContent=slow?'光速較慢':'光速較快';name.style.fontSize=`${font*1.1}px`;speed.style.fontSize=`${Math.max(22,12/ratio)}px`;for(const e of [name,speed])e.setAttribute('x',40);name.setAttribute('y',y);speed.setAttribute('y',y+font*1.3);const b1=name.getBBox(),b2=speed.getBBox(),rect=badge.querySelector('rect');for(const[k,v]of Object.entries({x:24,y:b1.y-10,width:Math.max(b1.width,b2.width)+32,height:b2.y+b2.height-b1.y+20,rx:12}))rect.setAttribute(k,v);}
  const r=phone?130:110;for(const[which,a,upper,left]of [['in',g.degrees,true,true],['out',g.outgoing,false,false]]){const mark=angleMark(a,r,upper,left);q(`.integrated-${which}-sector`).setAttribute('d',mark.sector);q(`.integrated-${which}-arc`).setAttribute('d',mark.arc);}
  const font=Math.max(28,16/ratio),inX=H[0]+60,inY=H[1]-(phone?220:165),outX=H[0]-(phone?35:70),outY=H[1]+(phone?210:200);
  label('.integrated-in-label','入射角',g.degrees,inX,inY,'start',font);label('.integrated-out-label','折射角',g.outgoing.toFixed(1),outX,outY,'end',font);
  q('.integrated-in-label path').setAttribute('d',path([polar(g.degrees/2,r,true,true),[inX-15,inY-8]]));q('.integrated-out-label path').setAttribute('d',path([polar(g.outgoing/2,r),[outX+15,outY-12]]));
  q('.integrated-reference').setAttribute('d',g.degrees?path([H,project(g.referenceEnd)]):'');const bendRadius=phone?215:215,a=polar(g.degrees,bendRadius),b=polar(g.outgoing,bendRadius),enough=Math.hypot(a[0]-b[0],a[1]-b[1])*ratio>=7;
  q('.integrated-bend').setAttribute('d',g.degrees&&enough?`M${a.join(' ')}A${bendRadius} ${bendRadius} 0 0 ${g.reverse?0:1} ${b.join(' ')}`:'');q('marker').setAttribute('markerWidth',Math.max(12,9/ratio));q('marker').setAttribute('markerHeight',Math.max(12,9/ratio));
  svg.dataset.incident=g.degrees;svg.dataset.outgoing=g.outgoing;
 },draw(snapshot,explained){
  const lit=snapshot.elapsed>0,points=[project(g.source),project(g.hit),project(g.end)],front=project(snapshot.front),d=path(snapshot.entered?[points[0],points[1],front]:[points[0],front]);beam.querySelectorAll('.lesson-beam-halo,.lesson-beam-ray,.lesson-beam-core').forEach(p=>p.setAttribute('d',d));beam.setAttribute('visibility',lit?'visible':'hidden');source.dataset.lit=String(lit);
  const drawn=snapshot.entered?g.sourceRadius+Math.hypot(snapshot.front[0]-g.hit[0],snapshot.front[1]-g.hit[1]):Math.hypot(snapshot.front[0]-g.source[0],snapshot.front[1]-g.source[1]);drawDirections(beam,points,drawn*scale,ratio,lit);
  q('.integrated-annotations').setAttribute('visibility',explained?'visible':'hidden');q('.integrated-annotations').setAttribute('aria-hidden',String(!explained));svg.dataset.frontX=snapshot.front[0];svg.dataset.frontY=snapshot.front[1];
 }};
}
