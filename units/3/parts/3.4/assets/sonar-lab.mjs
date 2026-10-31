import {surveyProfile} from './sonar-profile.mjs?v=20261031-survey-line';
import {oceanEnvironment, surveyShip} from './sonar-scene.mjs?v=20261031-landforms-labels';
import {depthAt, bottomY, returnTime, PROBE_Y as probeY} from './sonar-terrain.mjs?v=20261031-landforms';
export {depthAt, returnTime, WATER_SPEED} from './sonar-terrain.mjs?v=20261031-landforms';
export function pointName(index) { let name = ''; for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + (n - 1) % 26) + name; return name; }
const $ = id => document.getElementById(id);
const number = value => value.toLocaleString('en-US', {maximumFractionDigits: 1});
let shipX = 500, records = [], current = null, controller, drag = null, previousRows = '';
export const sonarDuration = () => (current?.time ?? returnTime(shipX)) + .16;
export const sonarTaps = () => [{delay: 0, gain: 1}, {delay: current.time, gain: .45}];
export function beginSonar() {
  // Resuming at exactly zero must not create a second point.
  if (current && !current.done) return;
  current = {name: pointName(records.length), x: shipX, time: returnTime(shipX), depth: depthAt(shipX), done: false};
  records.push(current);
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
   $('sonar-view').innerHTML = background + '<g id="sonar-profile-layer"></g><g id="sonar-signal-layer"></g><g id="sonar-points-layer"></g><g id="sonar-vessel-layer"></g>';
 }
 const profile = surveyProfile(records), linePoints = profile.map(p=>`${p.x},${p.y}`).join(' ');
 $('sonar-profile-layer').innerHTML = profile.length < 2 ? '' : `<polyline points="${linePoints}" fill="none" stroke="#294d43" stroke-width="6" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/><polyline id="sonar-profile-line" points="${linePoints}" fill="none" stroke="#f2aa62" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"><title>已測海底輪廓：依左右位置連接 ${profile.map(p=>p.name).join('、')}，測點之間為直線估計。</title></polyline>`;
 $('sonar-signal-layer').innerHTML = signal;
 $('sonar-points-layer').innerHTML = marks;
 $('sonar-vessel-layer').innerHTML = surveyShip(shipX) + `<text class="sonar-probe-label" x="${shipX+(shipX>700?-24:24)}" y="168" text-anchor="${shipX>700?'end':'start'}" fill="#f4f8e2" stroke="#35685e" stroke-width="3" paint-order="stroke" font-size="20">船底探頭</text>`;
 const rows=records.map(r=>`<tr data-point="${r.name}"><th scope="row">${r.name}</th><td>${r.done?r.time.toFixed(2)+' 秒':'探測中'}</td><td>${r.done?number(r.depth)+' 公尺':'—'}</td></tr>`).join('');
 if(rows!==previousRows){$('sonar-records').innerHTML=rows;previousRows=rows;}
 $('sonar-empty').hidden = records.length>0;
 $('sonar-answer').textContent = !current ? '選好船的位置，發出聲波，等回波帶回這裡的深度。' : !received ? `探測點 ${current.name}：探測中，尚未收到回波。` : `探測點 ${current.name}：1,500 × ${current.time.toFixed(2)} ÷ 2＝ ${number(current.depth)} 公尺。`;
}
export function bindSonar(player) {
 controller=player;
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
 $('sonar-clear').addEventListener('click',()=>{controller.pause();current=null;records=[];controller.reset();$('sonar-error').hidden=true;});
 const handle=$('sonar-ship');
 handle.addEventListener('keydown',e=>{const moves={ArrowLeft:shipX-20,ArrowRight:shipX+20,Home:100,End:900};if(e.key in moves){e.preventDefault();move(moves[e.key]);}});
 handle.addEventListener('pointerdown',e=>{if(handle.disabled||!e.isPrimary||e.button!==0)return;drag={id:e.pointerId,start:e.clientX,x:shipX};handle.setPointerCapture(e.pointerId);});
 handle.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;const box=$('sonar-view').getBoundingClientRect();move(drag.x+(e.clientX-drag.start)/box.width*1000);});
 const release=()=>{drag=null;};handle.addEventListener('pointerup',release);handle.addEventListener('pointercancel',release);handle.addEventListener('lostpointercapture',release);
}
