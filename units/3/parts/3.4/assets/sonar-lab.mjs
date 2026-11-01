import {surveyProfile} from './sonar-profile.mjs?v=20261031-shallow';
import {oceanEnvironment, surveyShip} from './sonar-scene.mjs?v=20261031-no-landform-labels';
import {depthAt, bottomY, returnTime, PROBE_Y as probeY, DEPTH_HEIGHT} from './sonar-terrain.mjs?v=20261031-shallow';
export {depthAt, returnTime, WATER_SPEED} from './sonar-terrain.mjs?v=20261031-shallow';
export function pointName(index) { let name = ''; for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + (n - 1) % 26) + name; return name; }
const $ = id => document.getElementById(id);
const number = value => value.toLocaleString('en-US', {maximumFractionDigits: 1});
const PAGE_SIZE = 4;
let shipX = 500, records = [], current = null, controller, drag = null, previousRows = '', recordPage = 0;
let chartData = [], chartKey = '';
function drawChart(profile = chartData) {
 chartData = profile;
 const svg = $('sonar-chart'), box = svg.getBoundingClientRect(), width = Math.max(1, box.width), height = Math.max(1, box.height);
 const key = [width, height, current?.name, ...profile.flatMap(p => [p.name,p.x,p.y])].join('|');
 if (key === chartKey) return; chartKey = key;
 const top = 23, range = height - 47;
 const points = profile.map(p => ({...p, cx:p.x/1000*width, cy:top+(p.y-probeY)/DEPTH_HEIGHT*range}));
 svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
 svg.querySelector('.sonar-chart-grid').innerHTML = [0,1,2,3].map(i => `<path d="M0 ${top+range*i/3}H${width}"/>`).join('');
 svg.querySelector('.sonar-chart-axis').innerHTML = [0,750,1500,2250].map((d,i) => `<text x="6" y="${top+range*i/3+4}">${number(d)}</text>`).join('')+`<text x="${width/2}" y="${height-3}" text-anchor="middle">探測位置（左 → 右）</text>`;
 const line = points.length < 2 ? '' : `<polyline points="${points.map(p=>`${p.cx},${p.cy}`).join(' ')}" fill="none" stroke="#294d43" stroke-width="4" stroke-linejoin="round"/><polyline id="sonar-profile-line" points="${points.map(p=>`${p.cx},${p.cy}`).join(' ')}" fill="none" stroke="#e39147" stroke-width="2.5" stroke-linejoin="round"><title>僅連接已收到回波的測點，點間為直線估計。</title></polyline>`;
 $('sonar-profile-layer').innerHTML = line+points.map(p=>`<g class="sonar-chart-point" data-point="${p.name}" data-x="${p.x}"><circle cx="${p.cx}" cy="${p.cy}" r="4.5" fill="${p.name===current?.name?'#276447':'#fff3ca'}" stroke="#285540" stroke-width="1.7"/><text x="${p.cx}" y="${p.cy<top+18?p.cy+20:p.cy-11}" text-anchor="middle">${p.name}</text></g>`).join('');
}
function updateText(id, value) {const node=$(id);if(node.textContent!==value)node.textContent=value;}
export const sonarDuration = () => (current?.time ?? returnTime(shipX)) + .16;
export const sonarTaps = () => [{delay: 0, gain: 1}, {delay: current.time, gain: .45}];
export function beginSonar() {
  // Resuming at exactly zero must not create a second point.
  if (current && !current.done) return;
  current = {name: pointName(records.length), x: shipX, time: returnTime(shipX), depth: depthAt(shipX), done: false};
  records.push(current);
  recordPage = Math.floor((records.length - 1) / PAGE_SIZE);
}
let background;
export function renderSonar(progress = 0) {
 const root = $('sonar'), elapsed = progress * sonarDuration();
 const received = current && elapsed >= current.time;
 if (received) current.done = true;
 const busy = current && !current.done;
 const locked = busy || root.dataset.phase === 'playing';
 const stage = !current ? 'ready' : received ? 'received' : elapsed < current.time / 2 ? 'outbound' : 'returning';
 root.dataset.stage = stage; root.dataset.shipX = shipX;
 root.dataset.elapsed = String(current ? Math.min(elapsed, current.time) : 0);
 $('sonar-time').textContent = (current ? Math.min(elapsed, current.time) : 0).toFixed(2);
 $('sonar-state').textContent = root.dataset.phase === 'paused' && busy ? '已暫停探測' : {ready:'等待發聲',outbound:'向海底傳播',returning:'回波返回中',received:'已收到回波'}[stage];
 for (const id of ['sonar-ship','sonar-left','sonar-right']) $(id).disabled = !!locked || (id==='sonar-left' && shipX<=100) || (id==='sonar-right' && shipX>=900);
 root.querySelector('[data-play]').disabled = !!locked;
 const ocean = root.querySelector('.sonar-ocean'); ocean.style.setProperty('--ship-position', `${shipX/10}%`); ocean.classList.toggle('sonar-ocean--edge', shipX < 180 || shipX > 820);
 const handle = $('sonar-ship');handle.style.left = `${shipX/10}%`;handle.setAttribute('aria-valuenow',String(shipX));handle.setAttribute('aria-valuetext',`航線位置 ${Math.round((shipX-100)/8)}%`);
 let signal = '';
 if(current){
 const x=current.x, bottom=bottomY(x), fraction=Math.min(1,elapsed/current.time), back=fraction>=.5;
 const y=probeY+(bottom-probeY)*(back?2-2*fraction:2*fraction);
 signal=`<path d="M${x} ${probeY}V${bottom}" stroke="#ecf6d8" stroke-width="2" stroke-dasharray="5 7" opacity=".45"/>`;
 if(!received) signal+=`<g clip-path="url(#sonar-water-clip)" stroke="${back?'#ffd19a':'#dbf4a9'}" fill="none" stroke-width="3">${[0,9,18].map((d,i)=>`<path d="M${x-20-i*5} ${y+(back?d:-d)}Q${x} ${y+(back?d+8:-d-8)} ${x+20+i*5} ${y+(back?d:-d)}" opacity="${1-i*.22}"/>`).join('')}</g>`;
 else signal+=`<circle cx="${x}" cy="${probeY}" r="13" fill="#dff7bc" opacity=".75"/><circle cx="${x}" cy="${probeY}" r="6" fill="#fbffdc"/>`;
 }
 const marks = records.map(r=>`<g class="sonar-point" data-point="${r.name}" data-x="${r.x}" data-done="${r.done}"><title>探測點 ${r.name}：${r.done?number(r.depth)+' 公尺':'探測中'}</title><circle cx="${r.x}" cy="${r.done?bottomY(r.x):probeY+35}" r="8" fill="${r.done?'#fff3c8':'#e9f4d5'}" stroke="#294e43" stroke-width="2"/><text x="${r.x}" y="${r.done ? bottomY(r.x)+(r.depth>=500?-16:30) : probeY+65}" text-anchor="middle" fill="#fffbe9" stroke="#294e43" stroke-width="4" paint-order="stroke" font-weight="700" font-size="23">${r.name}</text></g>`).join('');
 if (!background) {
   background = oceanEnvironment(bottomY);
   $('sonar-view').innerHTML = background + '<g id="sonar-signal-layer"></g><g id="sonar-points-layer"></g><g id="sonar-vessel-layer"></g>';
 }
 const profile = surveyProfile(records);
 drawChart(profile);
 $('sonar-chart-empty').hidden = profile.length>0;
 $('sonar-signal-layer').innerHTML = signal;
 $('sonar-points-layer').innerHTML = marks;
 $('sonar-vessel-layer').innerHTML = surveyShip(shipX) + `<text class="sonar-probe-label" x="${shipX+(shipX>700?-24:24)}" y="168" text-anchor="${shipX>700?'end':'start'}" fill="#f4f8e2" stroke="#35685e" stroke-width="3" paint-order="stroke" font-size="20">船底探頭</text>`;
 const pageCount = Math.max(1, Math.ceil(records.length / PAGE_SIZE));
 recordPage = Math.max(0, Math.min(recordPage, pageCount - 1));
 const rows=records.slice(recordPage*PAGE_SIZE,(recordPage+1)*PAGE_SIZE).map(r=>`<tr data-point="${r.name}"${r===current?' aria-current="true"':''}><th scope="row">${r.name}</th><td>${r.done?r.time.toFixed(2)+' 秒':'探測中'}</td><td>${r.done?number(r.depth)+' 公尺':'—'}</td></tr>`).join('');
 if(rows!==previousRows){$('sonar-records').innerHTML=rows;previousRows=rows;}
 root.dataset.recordCount=String(records.length);root.dataset.recordPage=String(recordPage+1);
 $('sonar-prev').disabled=recordPage===0;$('sonar-next').disabled=recordPage>=pageCount-1;
 updateText('sonar-page',`${recordPage+1}／${pageCount}`);
 $('sonar-empty').hidden = records.length>0;
 $('sonar-current-point').hidden = !current;
 updateText('sonar-current-point',current ? `探測點 ${current.name}` : '');
 updateText('sonar-depth',received ? number(current.depth) : '—');
 $('sonar-depth-unit').hidden = !received;
 updateText('sonar-answer',!current ? '選好船位，發聲後查看測深結果。' : !received ? `探測點 ${current.name}：探測中，尚未收到回波。` : `1,500 × ${current.time.toFixed(2)} ÷ 2＝ ${number(current.depth)} 公尺。`);

}
export function bindSonar(player) {
 controller=player;
 const resize = new ResizeObserver(() => drawChart());
 resize.observe($('sonar-chart'));
 $('sonar-prev').addEventListener('click',()=>{recordPage--;renderSonar(controller.elapsed/sonarDuration());});
 $('sonar-next').addEventListener('click',()=>{recordPage++;renderSonar(controller.elapsed/sonarDuration());});
 // Some mobile browsers suppress the compatibility click after dragging.
 // Handle a deliberate touch release once, while retaining native keyboard clicks.
 for (const button of $('sonar').querySelectorAll('button:not(#sonar-ship)')) {
   let lastTouch = -Infinity;
   button.addEventListener('pointerup', event => {
     if (event.pointerType !== 'touch' || !event.isPrimary || button.disabled) return;
     lastTouch = performance.now(); button.click();
   });
   button.addEventListener('click', event => {
     const compatibilityClick = event.pointerType === 'touch' || (!event.pointerType && event.detail > 0);
     if (compatibilityClick && performance.now() - lastTouch < 700) event.stopImmediatePropagation();
   }, true);
 }

 const move = x => {if($('sonar-ship').disabled)return;shipX=Math.max(100,Math.min(900,x));renderSonar(controller.elapsed/sonarDuration());};
 $('sonar-left').addEventListener('click',()=>move(shipX-40));$('sonar-right').addEventListener('click',()=>move(shipX+40));
 $('sonar-clear').addEventListener('click',()=>{controller.pause();current=null;records=[];recordPage=0;controller.reset();$('sonar-error').hidden=true;});
 const handle=$('sonar-ship');
 handle.addEventListener('keydown',e=>{const moves={ArrowLeft:shipX-20,ArrowRight:shipX+20,Home:100,End:900};if(e.key in moves){e.preventDefault();move(moves[e.key]);}});
 let suppressClickUntil = 0;
 const emitFromShip = () => { if (!handle.disabled) controller.play(true); };
 handle.addEventListener('pointerdown', event => {
   if (handle.disabled || !event.isPrimary || event.button !== 0) return;
   drag = {id:event.pointerId,start:event.clientX,startY:event.clientY,x:shipX,moved:false};
   handle.setPointerCapture(event.pointerId);
 });
 handle.addEventListener('pointermove', event => {
   if (!drag || event.pointerId !== drag.id) return;
   if (Math.hypot(event.clientX-drag.start,event.clientY-drag.startY)>7) drag.moved=true;
   if (!drag.moved) return;
   const box=$('sonar-view').getBoundingClientRect();
   move(drag.x+(event.clientX-drag.start)/box.width*1000);
 });
 handle.addEventListener('pointerup', event => {
   if (!drag || event.pointerId !== drag.id) return;
   const gesture=drag; drag=null; suppressClickUntil=performance.now()+700;
   const box=handle.getBoundingClientRect();
   const inside=event.clientX>=box.left && event.clientX<=box.right && event.clientY>=box.top && event.clientY<=box.bottom;
   if (!gesture.moved && inside) emitFromShip();
 });
 const cancelGesture = () => { if (drag) suppressClickUntil=performance.now()+700; drag=null; };
 handle.addEventListener('pointercancel',cancelGesture);
 handle.addEventListener('lostpointercapture',cancelGesture);
 handle.addEventListener('click', event => {
   // Pointer release already handles taps; keep native keyboard/assistive clicks.
   if ((event.detail>0 || event.pointerType) && performance.now()<suppressClickUntil) return;
   emitFromShip();
 });
}
