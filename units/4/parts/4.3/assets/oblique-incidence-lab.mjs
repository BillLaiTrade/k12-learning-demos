import { layout, media, clampAngle, geometry, durationMs, snapshot } from './oblique-incidence-model.mjs?v=20261102-oblique1';

const root=document.querySelector('#oblique-lab');
const $=selector=>root.querySelector(selector);
const scene=$('#oblique-scene'), picture=$('#oblique-background');
const input=$('#oblique-angle'), output=$('#oblique-angle-value');
const start=$('#oblique-start'), pause=$('#oblique-pause'), retry=$('#oblique-retry');
const status=$('#oblique-status'), badge=$('#oblique-state');
let angle=45, elapsed=0, state='loading', frame=0, startTime=0, drag=null;
const tag=(x,y,text,width=100,size=32)=>`<g><rect x="${x}" y="${y-35}" width="${width}" height="50" rx="9" fill="#fffef4" fill-opacity=".96" stroke="#dadfc9"/><text x="${x+width/2}" y="${y}" text-anchor="middle" font-size="${size}">${text}</text></g>`;
scene.innerHTML=`<defs>
 <filter id="oblique-glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="5"/></filter>
 <filter id="oblique-shadow" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="2" dy="6" stdDeviation="4" flood-color="#332b20" flood-opacity=".4"/></filter>
 <linearGradient id="oblique-metal" x1="0" x2="1"><stop stop-color="#10191b"/><stop offset=".18" stop-color="#6d7777"/><stop offset=".4" stop-color="#263033"/><stop offset=".78" stop-color="#101719"/><stop offset="1" stop-color="#414b4c"/></linearGradient>
 <linearGradient id="oblique-rim" x1="0" x2="1"><stop stop-color="#555d5b"/><stop offset=".3" stop-color="#d5d9d1"/><stop offset=".55" stop-color="#545e5b"/><stop offset="1" stop-color="#111c1b"/></linearGradient>
 <radialGradient id="oblique-dark-lens"><stop stop-color="#668480"/><stop offset=".5" stop-color="#243c3c"/><stop offset="1" stop-color="#0c181a"/></radialGradient>
 <radialGradient id="oblique-lit-lens"><stop stop-color="#fffbe1"/><stop offset=".45" stop-color="#ffde78"/><stop offset="1" stop-color="#926b26"/></radialGradient>
 </defs>
 ${media.map((medium,i)=>{
  const x=layout.axes[i],left=i?866:188;
  return `<g class="oblique-lane" data-medium="${medium}">
   ${tag(x-150,214,`空氣 → ${medium==='water'?'水':'玻璃'}`,300,34)}
   <path class="oblique-normal" d="M${x} 285V665"/>
   ${tag(x+54,316,'法線',94,28)}${tag(left-12,425,'空氣',80,28)}${tag(left,480,'介面',100,30)}${tag(left,577,medium==='water'?'水':'玻璃',100,30)}
   <path class="oblique-angle-arc oblique-in-arc"/><path class="oblique-angle-arc oblique-out-arc"/>
   <g class="oblique-beam" visibility="hidden"><path class="oblique-halo"/><path class="oblique-ray"/><path class="oblique-core"/></g>
   <text class="oblique-angle-value oblique-in-value" text-anchor="middle">45°</text><text class="oblique-angle-value oblique-out-value">${medium==='water'?'32.0':'28.1'}°</text>
   <g class="oblique-source" tabindex="0" role="slider" aria-label="${medium==='water'?'水':'玻璃'}組光源，調整兩組共同入射角" aria-valuemin="0" aria-valuemax="60" aria-valuenow="45" aria-valuetext="45度" data-lit="false">
    <rect x="-48" y="-100" width="96" height="140" fill="transparent"/>
    <rect class="oblique-focus" x="-42" y="-86" width="84" height="105" rx="15"/>
    <g filter="url(#oblique-shadow)"><rect x="-35" y="-78" width="70" height="69" rx="13" fill="url(#oblique-metal)" stroke="#131e20" stroke-width="2"/><path d="M-23-69V-25M-18-69V-25" stroke="#9aa5a1" stroke-width="2" opacity=".45"/><rect x="-38" y="-23" width="76" height="16" rx="5" fill="url(#oblique-rim)"/><ellipse cx="0" cy="-5" rx="35" ry="15" fill="url(#oblique-rim)" stroke="#162423" stroke-width="2"/><ellipse class="oblique-lens" cx="0" cy="-3" rx="26" ry="10" fill="url(#oblique-dark-lens)" stroke="#111d1c" stroke-width="2"/></g>
   </g>
  </g>`;
 }).join('')}`;
const lanes=media.map(medium=>{
 const group=$(`.oblique-lane[data-medium=${medium}]`);
 return {group,source:group.querySelector('.oblique-source'),beam:group.querySelector('.oblique-beam'),paths:[...group.querySelectorAll('.oblique-beam path')],inArc:group.querySelector('.oblique-in-arc'),outArc:group.querySelector('.oblique-out-arc'),inValue:group.querySelector('.oblique-in-value'),outValue:group.querySelector('.oblique-out-value')};
});
function arc(x,degrees,up){
 if(!degrees)return '';
 const r=68,a=degrees*Math.PI/180,sign=up?-1:1;
 return `M${x} ${layout.boundary+sign*r} A${r} ${r} 0 0 0 ${x+sign*r*Math.sin(a)} ${layout.boundary+sign*r*Math.cos(a)}`;
}
function drawGeometry(){
 input.value=angle;output.value=`${angle}°`;root.dataset.angle=String(angle);
 lanes.forEach((lane,i)=>{
  const g=geometry(media[i],angle),x=g.hit[0],a=angle*Math.PI/180;
  lane.group.dataset.outgoing=String(g.outgoing);
  lane.group.dataset.hitX=String(x);lane.group.dataset.hitY=String(layout.boundary);
  lane.source.setAttribute('transform',`translate(${g.source.join(' ')}) rotate(${-angle})`);
  lane.source.setAttribute('aria-valuenow',String(angle));lane.source.setAttribute('aria-valuetext',`${angle}度，${media[i]==='water'?'水':'玻璃'}中折射角${g.outgoing.toFixed(1)}度`);
  lane.inArc.setAttribute('d',arc(x,angle,true));lane.outArc.setAttribute('d',arc(x,g.outgoing,false));
  lane.inValue.textContent=`${angle}°`;lane.inValue.setAttribute('x',String(x-(angle?107*Math.sin(a/2):46)));lane.inValue.setAttribute('y',String(layout.boundary-107*Math.cos(a/2)));
  lane.outValue.textContent=`${g.outgoing.toFixed(1)}°`;lane.outValue.setAttribute('x',String(x+Math.max(100,100*Math.tan(g.outgoing*Math.PI/180)+40)));lane.outValue.setAttribute('y',String(layout.boundary+118));
 });
 scene.setAttribute('aria-label',`兩組共同入射角${angle}度，左側空氣進入水，折射角${geometry('water',angle).outgoing.toFixed(1)}度；右側空氣進入玻璃，折射角${geometry('glass',angle).outgoing.toFixed(1)}度。角度都從通過入射點的法線量起。拖曳任一光源可同步調整，也可用方向鍵。`);
}
function render(){
 root.dataset.elapsedMs=String(elapsed);
 snapshot(angle,elapsed).forEach((g,i)=>{
  const lane=lanes[i];
  const path=`M${g.source.join(' ')} ${g.entered?`L${g.hit.join(' ')} `:''}L${g.front.join(' ')}`;
  lane.paths.forEach(el=>el.setAttribute('d',path));lane.beam.setAttribute('visibility',elapsed>0?'visible':'hidden');lane.source.dataset.lit=String(elapsed>0);
  lane.group.dataset.entered=String(g.entered);lane.group.dataset.arrived=String(g.arrived);lane.group.dataset.frontX=String(g.front[0]);lane.group.dataset.frontY=String(g.front[1]);
 });
}
function controls(){
 root.dataset.state=state;start.disabled=['loading','error','running','paused'].includes(state);pause.disabled=!['running','paused'].includes(state);
 input.disabled=['loading','error'].includes(state);lanes.forEach(lane=>{lane.source.setAttribute('aria-disabled',String(input.disabled));lane.source.setAttribute('tabindex',input.disabled?'-1':'0');});
 start.classList.toggle('primary',['idle','preview','complete'].includes(state));pause.classList.toggle('primary',['paused','running'].includes(state));
 pause.dataset.action=state==='paused'?'resume':'pause';pause.querySelector('span').textContent=state==='paused'?'繼續觀察':'暫停觀察';
 badge.textContent={loading:'準備實驗桌',error:'場景未就緒',idle:'準備發射',running:'光束穿越中',paused:'已暫停・比較角度',preview:'角度預覽',complete:'光路已展開'}[state];
 status.textContent={loading:'正在準備實驗桌……',error:'圖片暫時無法載入，請重新載入。',idle:'兩組角度相同，按同時發射觀察。',running:'光束到達介面後，沿折射方向前進。',paused:'已暫停，可比較兩組光路。',preview:'角度已更新，可重新發射觀察。',complete:'光路已展開，可調角度或再次發射。'}[state];
 const finding=document.querySelector('#oblique-finding-text');finding.textContent=angle===0?'光沿法線垂直進入，方向不偏折。':'光由空氣斜射入水或玻璃，會偏向法線。';
}
function stop(){cancelAnimationFrame(frame);frame=0;}
function tick(now){
 if(state!=='running')return;
 elapsed=Math.min(durationMs(angle),Math.max(0,now-startTime));render();
 if(elapsed>=durationMs(angle)){state='complete';frame=0;controls();}else frame=requestAnimationFrame(tick);
}
function play(restart=false){
 if(['loading','error'].includes(state))return;
 stop();if(restart)elapsed=0;state='running';startTime=performance.now()-elapsed;render();controls();frame=requestAnimationFrame(tick);
}
function freeze(){
 if(state!=='running')return;
 stop();elapsed=Math.min(durationMs(angle),Math.max(0,performance.now()-startTime));state=elapsed>=durationMs(angle)?'complete':'paused';render();controls();
}
function setAngle(value){
 if(input.disabled)return;
 const next=clampAngle(value);if(next===angle)return;
 stop();angle=next;
 if(state==='idle'){elapsed=0;}else{state='preview';elapsed=durationMs(angle);}
 drawGeometry();render();controls();
}
input.oninput=()=>setAngle(Number(input.value));start.onclick=()=>play(true);pause.onclick=()=>state==='paused'?play():freeze();
const point=e=>new DOMPoint(e.clientX,e.clientY).matrixTransform(scene.getScreenCTM().inverse());
scene.onpointerdown=e=>{
 const source=e.target.closest('.oblique-source');if(!source||input.disabled)return;
 e.preventDefault();const lane=source.closest('.oblique-lane'),medium=lane.dataset.medium,g=geometry(medium,angle),p=point(e);
 drag={medium,offsetX:p.x-g.source[0],offsetY:p.y-g.source[1],pointerId:e.pointerId};scene.setPointerCapture(e.pointerId);source.focus({preventScroll:true});
};
// Some mobile SVG engines otherwise turn the drag into a scroll gesture.
// Block that gesture only on the emitter; the rest of the apparatus still pans.
scene.addEventListener('touchstart',e=>{if(!input.disabled&&e.target.closest('.oblique-source'))e.preventDefault();},{passive:false});
scene.onpointermove=e=>{
 if(!drag||e.pointerId!==drag.pointerId)return;
 const p=point(e),g=geometry(drag.medium,angle);
 setAngle(Math.atan2(Math.max(0,g.hit[0]-p.x+drag.offsetX),Math.max(1,g.hit[1]-p.y+drag.offsetY))*180/Math.PI);
};
scene.onpointerup=scene.onpointercancel=()=>{drag=null;};
scene.onlostpointercapture=()=>{drag=null;};
scene.onkeydown=e=>{
 if(!e.target.closest('.oblique-source')||input.disabled)return;
 const step={ArrowLeft:-1,ArrowDown:-1,ArrowRight:1,ArrowUp:1}[e.key];
 if(step!==undefined||e.key==='Home'||e.key==='End'){e.preventDefault();setAngle(e.key==='Home'?0:e.key==='End'?60:angle+step);}
};
document.addEventListener('visibilitychange',()=>{if(document.hidden){freeze();drag=null;}});
if('IntersectionObserver' in window)new IntersectionObserver(entries=>{if(!entries[0].isIntersecting){freeze();drag=null;}},{threshold:0}).observe($('#oblique-viewport'));
async function prepare(){
 stop();elapsed=0;state='loading';drawGeometry();render();controls();retry.hidden=true;
 try{await picture.decode();state='idle';controls();}catch{state='error';controls();retry.hidden=false;}
}
retry.onclick=()=>{picture.src=new URL(`oblique-incidence-bench.png?retry=${Date.now()}`,import.meta.url).href;prepare();};
prepare();
