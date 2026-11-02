import { layout, media, clampAngle, geometry, durationMs, snapshot, zoomViewBox } from './oblique-incidence-model.mjs?v=20261102-entry1';

const root=document.querySelector('#oblique-lab'),$=selector=>root.querySelector(selector);
const scene=$('#oblique-scene'),zoom=$('#oblique-zoom'),picture=$('#oblique-background');
const input=$('#oblique-angle'),output=$('#oblique-angle-value'),start=$('#oblique-start'),pause=$('#oblique-pause'),retry=$('#oblique-retry');
const status=$('#oblique-status'),badge=$('#oblique-state'),buttons=[...root.querySelectorAll('[data-oblique-medium]')];
let medium='water',requestedMedium='water',angle=45,elapsed=0,state='loading',frame=0,startTime=0,drag=null,loadId=0,restoreLight=false;
const name=()=>medium==='water'?'水':'玻璃',clickSlop=5;
const label=(id,x,y,text,width=110)=>`<g id="${id}" transform="translate(${x} ${y})"><rect x="0" y="-35" width="${width}" height="52" rx="9" fill="#fffef4" fill-opacity=".96"/><text x="${width/2}" y="0" text-anchor="middle" font-size="36">${text}</text></g>`;
const beam=()=>'<g class="oblique-beam" visibility="hidden"><path class="oblique-halo"/><path class="oblique-ray"/><path class="oblique-core"/></g>';
scene.setAttribute('viewBox',`0 0 ${layout.width} ${layout.height}`);
scene.innerHTML=`<defs>
 <filter id="oblique-glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="5"/></filter>
 <filter id="oblique-shadow" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="2" dy="6" stdDeviation="4" flood-color="#332b20" flood-opacity=".4"/></filter>
 <linearGradient id="oblique-metal" x1="0" x2="1"><stop stop-color="#10191b"/><stop offset=".18" stop-color="#6d7777"/><stop offset=".4" stop-color="#263033"/><stop offset=".78" stop-color="#101719"/><stop offset="1" stop-color="#414b4c"/></linearGradient>
 <linearGradient id="oblique-rim" x1="0" x2="1"><stop stop-color="#555d5b"/><stop offset=".3" stop-color="#d5d9d1"/><stop offset=".55" stop-color="#545e5b"/><stop offset="1" stop-color="#111c1b"/></linearGradient>
 <radialGradient id="oblique-dark-lens"><stop stop-color="#668480"/><stop offset=".5" stop-color="#243c3c"/><stop offset="1" stop-color="#0c181a"/></radialGradient>
 <radialGradient id="oblique-lit-lens"><stop stop-color="#fffbe1"/><stop offset=".45" stop-color="#ffde78"/><stop offset="1" stop-color="#926b26"/></radialGradient>
 </defs>

 <g class="oblique-overview-geometry">
  <g id="oblique-case-label"><rect x="-180" y="-44" width="360" height="64" rx="10" fill="#fffdf2" stroke="#c9c9af" stroke-width="2"/><text id="oblique-case-name" x="0" y="0" text-anchor="middle" font-size="42">空氣 → 水</text></g>
  <path class="oblique-normal" d="M${layout.axis} 270V885"/>
  ${label('oblique-air-label',920,450,'空氣')}${label('oblique-material-label',230,740,'水')}
  ${beam()}
  <path class="oblique-connector" d="M${layout.axis+38} ${layout.boundary}L1254 450"/>
  <rect class="oblique-target-underlay" x="${layout.axis-38}" y="${layout.boundary-38}" width="76" height="76" rx="5"/>
  <rect class="oblique-target" x="${layout.axis-38}" y="${layout.boundary-38}" width="76" height="76" rx="5"/>
   <g class="oblique-source" tabindex="0" role="slider" aria-label="${medium==='water'?'水':'玻璃'}組光源，點擊或按Enter發射，拖曳或方向鍵調角度" aria-keyshortcuts="Enter Space" aria-valuemin="0" aria-valuemax="60" aria-valuenow="45" aria-valuetext="45度" data-lit="false">
    <title>點燈發射；拖曳調角度</title>
    <rect x="-48" y="-100" width="96" height="140" fill="transparent"/>
    <rect class="oblique-focus" x="-42" y="-86" width="84" height="105" rx="15"/>
    <g filter="url(#oblique-shadow)"><rect x="-35" y="-78" width="70" height="69" rx="13" fill="url(#oblique-metal)" stroke="#131e20" stroke-width="2"/><path d="M-23-69V-25M-18-69V-25" stroke="#9aa5a1" stroke-width="2" opacity=".45"/><rect x="-38" y="-23" width="76" height="16" rx="5" fill="url(#oblique-rim)"/><ellipse cx="0" cy="-5" rx="35" ry="15" fill="url(#oblique-rim)" stroke="#162423" stroke-width="2"/><ellipse class="oblique-lens" cx="0" cy="-3" rx="26" ry="10" fill="url(#oblique-dark-lens)" stroke="#111d1c" stroke-width="2"/></g>
   </g>
 </g>`;
zoom.setAttribute('viewBox',zoomViewBox);
zoom.innerHTML=`<defs><linearGradient id="oblique-zoom-water" x2="0" y2="1"><stop stop-color="#dcf4ef"/><stop offset="1" stop-color="#c4e9e6"/></linearGradient><linearGradient id="oblique-zoom-glass" x2="1" y2="1"><stop stop-color="#edf3f6"/><stop offset=".5" stop-color="#dbe7ef"/><stop offset=".54" stop-color="#eef5f7"/><stop offset="1" stop-color="#d8e6ec"/></linearGradient></defs>
 <rect x="490" y="450" width="320" height="240" fill="#fffdf6"/>
 <rect id="oblique-zoom-medium-fill" x="490" y="570" width="320" height="120" fill="url(#oblique-zoom-water)"/>
 <path class="oblique-zoom-interface" d="M490 570H810"/>
 <path class="oblique-angle-sector oblique-in-sector"/><path class="oblique-angle-sector oblique-out-sector"/>
 <path class="oblique-normal" d="M650 450V690"/>
 <path class="oblique-angle-arc oblique-in-arc"/><path class="oblique-angle-arc oblique-out-arc"/>
 ${beam()}
 <g class="oblique-zoom-labels">
  <text class="oblique-normal-name" x="662" y="476">法線</text><text x="755" y="476" text-anchor="middle">空氣</text><text id="oblique-zoom-medium" x="507" y="665">水</text>
  <g><rect x="498" y="552" width="52" height="26" rx="5" fill="#fffdf6" stroke="#b8cfc5"/><text x="524" y="570" text-anchor="middle">介面</text></g>
 </g>`;
const source=scene.querySelector('.oblique-source'),views=[scene,zoom].map(svg=>({svg,beam:svg.querySelector('.oblique-beam'),paths:[...svg.querySelectorAll('.oblique-beam path')]}));
const photos=new Map();
function photo(key,reload=false){
 if(!photos.has(key)||reload){const img=new Image();img.src=new URL(`oblique-entry-${key}.png${reload?`?retry=${Date.now()}`:''}`,import.meta.url).href;photos.set(key,img);}
 return photos.get(key);
}
function arc(degrees,up){
 if(!degrees)return '';
 const r=76,a=degrees*Math.PI/180,sign=up?-1:1;
 return `M${layout.axis} ${layout.boundary+sign*r} A${r} ${r} 0 0 0 ${layout.axis+sign*r*Math.sin(a)} ${layout.boundary+sign*r*Math.cos(a)}`;
}
function sector(degrees,up){
 const edge=arc(degrees,up);return edge?`M${layout.axis} ${layout.boundary}L${edge.slice(1)}Z`:'';
}
function drawGeometry(){
 const g=geometry(medium,angle),ratio=Math.max(.1,scene.getBoundingClientRect().width/layout.width),sourceScale=Math.max(1.6,30/(70*ratio)),fontScale=Math.max(1,.3/ratio);
 input.value=angle;output.value=`${angle}°`;root.dataset.angle=String(angle);root.dataset.medium=medium;root.dataset.outgoing=String(g.outgoing);
 source.setAttribute('transform',`translate(${g.source.join(' ')}) rotate(${-angle}) scale(${sourceScale})`);
 source.setAttribute('aria-label',`${name()}組光源，點擊或按Enter發射，拖曳或方向鍵調角度`);source.setAttribute('aria-valuenow',String(angle));source.setAttribute('aria-valuetext',`${angle}度，折射角${g.outgoing.toFixed(1)}度`);
 const hit=source.querySelector('rect');const hitWidth=Math.max(96,44/(ratio*sourceScale));hit.setAttribute('x',String(-hitWidth/2));hit.setAttribute('width',String(hitWidth));
 scene.querySelector('#oblique-case-label').setAttribute('transform',`translate(650 155) scale(${fontScale})`);scene.querySelector('#oblique-case-name').textContent=`空氣 → ${name()}`;
 scene.querySelector('#oblique-air-label').setAttribute('transform',`translate(${1030-110*fontScale} 440) scale(${fontScale})`);scene.querySelector('#oblique-material-label').setAttribute('transform',`translate(230 740) scale(${fontScale})`);scene.querySelector('#oblique-material-label text').textContent=name();
 zoom.querySelector('.oblique-in-sector').setAttribute('d',sector(angle,true));zoom.querySelector('.oblique-out-sector').setAttribute('d',sector(g.outgoing,false));zoom.querySelector('.oblique-in-arc').setAttribute('d',arc(angle,true));zoom.querySelector('.oblique-out-arc').setAttribute('d',arc(g.outgoing,false));$('#oblique-in-value').value=`${angle}°`;$('#oblique-out-value').value=`${g.outgoing.toFixed(1)}°`;zoom.querySelector('#oblique-zoom-medium').textContent=name();zoom.querySelector('#oblique-zoom-medium-fill').setAttribute('fill',`url(#oblique-zoom-${medium})`);
 zoom.style.setProperty('--zoom-font-scale',String(Math.max(1,320/Math.max(200,zoom.getBoundingClientRect().width))));
 const description=`空氣射入${name()}，入射角${angle}度，折射角${g.outgoing.toFixed(1)}度。法線通過入射點；角度皆從法線量起。`;
 scene.setAttribute('aria-label',`${description}點燈發射，拖曳可調角度。`);zoom.setAttribute('aria-label',`同一入射點的放大畫面。${description}`);
 $('#oblique-finding-text').textContent=angle===0?'垂直入射 → 方向不偏折':`斜射入${name()} → 折射光偏向法線`;
 $('#oblique-angle-comparison').textContent=angle===0?' = ':' < ';
 $('#oblique-zoom-note').textContent=angle===0?'光路與法線重合，兩個角度都是0°。':'有色扇形表示光線與法線之間的角度。';
 const hero=$('.oblique-experiment').getBoundingClientRect(),from=new DOMPoint(layout.axis+38,layout.boundary).matrixTransform(scene.getScreenCTM()),to=new DOMPoint(layout.axis-layout.zoomX,layout.boundary).matrixTransform(zoom.getScreenCTM());
 $('#oblique-link').setAttribute('viewBox',`0 0 ${hero.width} ${hero.height}`);$('#oblique-link path').setAttribute('d',`M${from.x-hero.x} ${from.y-hero.y}L${to.x-hero.x} ${to.y-hero.y}`);
}
function render(){
 const g=snapshot(medium,angle,elapsed),lit=elapsed>0,path=`M${g.source.join(' ')} ${g.entered?`L${g.hit.join(' ')} `:''}L${g.front.join(' ')}`;
 root.dataset.elapsedMs=String(elapsed);root.dataset.entered=String(g.entered);root.dataset.arrived=String(g.arrived);source.dataset.lit=String(lit);
 views.forEach(view=>{view.paths.forEach(p=>p.setAttribute('d',path));view.beam.setAttribute('visibility',lit?'visible':'hidden');view.svg.dataset.frontX=String(g.front[0]);view.svg.dataset.frontY=String(g.front[1]);view.svg.dataset.hitX=String(g.hit[0]);view.svg.dataset.hitY=String(g.hit[1]);});
}
function controls(){
 root.dataset.state=state;start.disabled=['loading','error'].includes(state);pause.disabled=!['running','paused'].includes(state);input.disabled=start.disabled;
 buttons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.obliqueMedium===requestedMedium)));
 source.setAttribute('aria-disabled',String(start.disabled));source.setAttribute('tabindex',start.disabled?'-1':'0');start.classList.toggle('primary',!start.disabled&&state!=='running');pause.classList.toggle('primary',['running','paused'].includes(state));pause.dataset.action=state==='paused'?'resume':'pause';pause.querySelector('span').textContent=state==='paused'?'繼續觀察':'暫停觀察';
 badge.textContent={loading:'準備場景',error:'場景未就緒',idle:'準備發射',running:'光束穿越中',paused:'已暫停觀察',preview:'光路預覽',complete:'光路已展開'}[state];
 status.textContent={loading:'正在準備實驗場景……',error:`${requestedMedium==='water'?'水':'玻璃'}場景未能載入，請重試或切換介質。`,idle:'點燈或按發射光束，觀察入射點。',running:'全景與放大畫面同步前進。',paused:'已暫停，可仔細觀察入射點。',preview:'光路已更新，可重新發射觀察。',complete:'光路已展開，可調角度或切換介質。'}[state];
}
function stop(){cancelAnimationFrame(frame);frame=0;}
function tick(now){
 if(state!=='running')return;
 elapsed=Math.min(durationMs(medium,angle),Math.max(0,now-startTime));render();
 if(elapsed>=durationMs(medium,angle)){state='complete';frame=0;controls();}else frame=requestAnimationFrame(tick);
}
function play(restart=false){
 if(['loading','error'].includes(state))return;
 stop();if(restart)elapsed=0;state='running';startTime=performance.now()-elapsed;render();controls();frame=requestAnimationFrame(tick);
}
function freeze(){
 if(state!=='running')return;
 stop();elapsed=Math.min(durationMs(medium,angle),Math.max(0,performance.now()-startTime));state=elapsed>=durationMs(medium,angle)?'complete':'paused';render();controls();
}
function setAngle(value){
 if(input.disabled)return;
 const next=clampAngle(value);if(next===angle)return;
 stop();angle=next;if(state==='idle')elapsed=0;else{state='preview';elapsed=durationMs(medium,angle);}drawGeometry();render();controls();
}
input.oninput=()=>setAngle(Number(input.value));start.onclick=()=>play(true);pause.onclick=()=>state==='paused'?play():freeze();
const point=e=>new DOMPoint(e.clientX,e.clientY).matrixTransform(scene.getScreenCTM().inverse());
scene.onpointerdown=e=>{
 if(!e.target.closest('.oblique-source')||input.disabled||e.button!==0)return;
 e.preventDefault();const g=geometry(medium,angle),p=point(e);drag={offsetX:p.x-g.source[0],offsetY:p.y-g.source[1],pointerId:e.pointerId,downX:e.clientX,downY:e.clientY,moved:false};scene.setPointerCapture(e.pointerId);source.focus({preventScroll:true});
};
scene.addEventListener('touchstart',e=>{if(!input.disabled&&e.target.closest('.oblique-source'))e.preventDefault();},{passive:false});
scene.onpointermove=e=>{
 if(!drag||e.pointerId!==drag.pointerId)return;
 if(!drag.moved&&Math.hypot(e.clientX-drag.downX,e.clientY-drag.downY)<=clickSlop)return;
 drag.moved=true;const p=point(e);setAngle(Math.atan2(Math.max(0,layout.axis-p.x+drag.offsetX),Math.max(1,layout.boundary-p.y+drag.offsetY))*180/Math.PI);
};
scene.onpointerup=e=>{const released=drag;drag=null;if(released&&e.pointerId===released.pointerId&&!released.moved&&Math.hypot(e.clientX-released.downX,e.clientY-released.downY)<=clickSlop)play(true);};
scene.onpointercancel=scene.onlostpointercapture=()=>{drag=null;};
scene.onclick=e=>{if(e.target.closest('.oblique-source')&&e.detail===0&&!input.disabled)play(true);};
scene.onkeydown=e=>{
 if(!e.target.closest('.oblique-source')||input.disabled)return;
 if(e.key==='Enter'||e.key===' '){e.preventDefault();if(!e.repeat)play(true);return;}
 const step={ArrowLeft:-1,ArrowDown:-1,ArrowRight:1,ArrowUp:1}[e.key];if(step!==undefined||e.key==='Home'||e.key==='End'){e.preventDefault();setAngle(e.key==='Home'?0:e.key==='End'?60:angle+step);}
};
document.addEventListener('visibilitychange',()=>{if(document.hidden){freeze();drag=null;}});
if('IntersectionObserver' in window)new IntersectionObserver(entries=>{if(!entries[0].isIntersecting){freeze();drag=null;}},{threshold:0}).observe($('.oblique-experiment'));
async function prepare(target,reload=false){
 const id=++loadId;restoreLight=state==='loading'?restoreLight:elapsed>0;requestedMedium=target;stop();drag=null;elapsed=0;state='loading';render();controls();retry.hidden=true;
 try{const img=photo(target,reload);await img.decode();if(id!==loadId)return;medium=target;picture.src=img.src;picture.alt=`寫實木桌上的單槽光路剖面：上方空氣，下方為${name()}。`;elapsed=restoreLight?durationMs(medium,angle):0;state=restoreLight?'preview':'idle';drawGeometry();render();controls();}
 catch{if(id!==loadId)return;state='error';controls();retry.hidden=false;}
}
buttons.forEach(button=>button.onclick=()=>{if(button.dataset.obliqueMedium!==requestedMedium||state==='error')prepare(button.dataset.obliqueMedium);});
retry.onclick=()=>prepare(requestedMedium,true);
new ResizeObserver(()=>{drawGeometry();render();}).observe($('.oblique-experiment'));
drawGeometry();render();controls();prepare('water');
