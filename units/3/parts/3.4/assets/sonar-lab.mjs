// A fixed, continuous seabed. Vertical coordinates use metres from the probe.
export const WATER_SPEED = 1500;
export const depthAt = x => Math.round((3000 + 1500 * Math.sin(2 * Math.PI * (x - 500) / 800)) / 7.5) * 7.5;
export const returnTime = x => 2 * depthAt(x) / WATER_SPEED;
export function pointName(index) { let name = ''; for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + (n - 1) % 26) + name; return name; }
const $ = id => document.getElementById(id), probeY = 145;
const bottomY = x => probeY + depthAt(x) / 4500 * 335;
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
const ship = x => `<g transform="translate(${x} 119)">
 <ellipse cy="13" rx="79" ry="7" fill="#183e40" opacity=".15"/>
 <path d="M-76 -15L-57 14Q0 28 61 10L78 -15Z" fill="url(#sonar-hull)" stroke="#274d49" stroke-width="2"/>
 <path d="M-70 -11H72L63 -2H-64Z" fill="#f3eee0"/><path d="M-54 13Q3 27 60 10" fill="none" stroke="#bc7944" stroke-width="4"/>
 <path d="M-42 -17V-43H26L39 -17Z" fill="#faf6e8" stroke="#b7c7bd" stroke-width="2"/>
 <path d="M-28 -44V-65H13L25 -44Z" fill="#e7eee7" stroke="#b7c7bd" stroke-width="2"/>
 <path d="M-23 -60H-9V-48H-23ZM-3 -60H10L17 -48H-3Z" fill="#427b80"/>
 <path d="M-34 -36H-20V-24H-34ZM-12 -36H2V-24H-12ZM10 -36H24L29 -24H10Z" fill="#6f9c9b"/>
 <path d="M-6 -65V-88M-21 -79H13M44 -17V-58L62 -40V-15" fill="none" stroke="#647e70" stroke-width="3"/>
 <path d="M-4 -87L17 -82L-4 -76" fill="#b47c46"/>
 <path d="M-60 -18H63M-56 -18V-27M55 -18V-27" stroke="#627f72" fill="none" stroke-width="2"/>
 <rect x="-8" y="18" width="16" height="8" rx="3" fill="#d39b5d" stroke="#7b5a32"/><circle cy="27" r="4" fill="#edf7db"/>
 </g>`;
function environment() {
 const bed = Array.from({length: 201}, (_, i) => {const x=i*5;return `${x},${bottomY(x)}`;}).join(' ');
 return `<defs><linearGradient id="sonar-sky" x2="0" y2="1"><stop stop-color="#e8eee4"/><stop offset="1" stop-color="#fff9e8"/></linearGradient><linearGradient id="sonar-water" x2="0" y2="1"><stop stop-color="#a5d5c9"/><stop offset=".48" stop-color="#4c9b94"/><stop offset="1" stop-color="#245d60"/></linearGradient><linearGradient id="sonar-earth" x2="0" y2="1"><stop stop-color="#c3b58c"/><stop offset="1" stop-color="#657263"/></linearGradient><linearGradient id="sonar-hull" x2="0" y2="1"><stop stop-color="#396f62"/><stop offset="1" stop-color="#173e3b"/></linearGradient><clipPath id="sonar-sea-clip"><rect y="137" width="1000" height="423"/></clipPath></defs>
 <rect width="1000" height="560" fill="url(#sonar-sky)"/><circle cx="835" cy="50" r="30" fill="#fff9df" opacity=".8"/>
 <path d="M0 119Q120 77 230 117T470 115L470 140H0Z" fill="#9cad9b" opacity=".3"/>
 <rect y="137" width="1000" height="423" fill="url(#sonar-water)"/>
 <g clip-path="url(#sonar-sea-clip)" fill="#f1ffe7" opacity=".08"><path d="M160 137L30 490H170L210 137Z"/><path d="M660 137L430 510H560L710 137Z"/><path d="M900 137L730 510H810L940 137Z"/></g>
 <path d="M0 137Q25 131 50 137T100 137T150 137T200 137T250 137T300 137T350 137T400 137T450 137T500 137T550 137T600 137T650 137T700 137T750 137T800 137T850 137T900 137T950 137T1000 137" fill="none" stroke="#edf8df" stroke-width="3"/>
 <polygon points="0,560 ${bed} 1000,560" fill="url(#sonar-earth)"/><polyline points="${bed}" fill="none" stroke="#e0d7ae" stroke-width="5"/>
 <g fill="none" stroke="#ede3bc" opacity=".22" stroke-width="2">${[24,48,72].map(d=>`<polyline points="${Array.from({length:101},(_,i)=>`${i*10},${bottomY(i*10)+d}`).join(' ')}"/>`).join('')}</g>
 <g fill="#e7ead0" opacity=".5"><ellipse cx="120" cy="${bottomY(120)+9}" rx="14" ry="4"/><ellipse cx="825" cy="${bottomY(825)+10}" rx="18" ry="5"/></g>`;
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
 if(!received) signal+=`<g stroke="${back?'#ffd19a':'#dbf4a9'}" fill="none" stroke-width="3">${[0,9,18].map((d,i)=>`<path d="M${x-20-i*5} ${y+(back?d:-d)}Q${x} ${y+(back?d+8:-d-8)} ${x+20+i*5} ${y+(back?d:-d)}" opacity="${1-i*.22}"/>`).join('')}</g>`;
 else signal+=`<circle cx="${x}" cy="${probeY}" r="13" fill="#dff7bc" opacity=".75"/><circle cx="${x}" cy="${probeY}" r="6" fill="#fbffdc"/>`;
 }
 const marks = records.map(r=>`<g class="sonar-point" data-point="${r.name}" data-x="${r.x}" data-done="${r.done}"><title>探測點 ${r.name}：${r.done?number(r.depth)+' 公尺':'探測中'}</title><circle cx="${r.x}" cy="${r.done?bottomY(r.x):probeY+35}" r="8" fill="${r.done?'#fff3c8':'#e9f4d5'}" stroke="#294e43" stroke-width="2"/><text x="${r.x}" y="${(r.done?bottomY(r.x):probeY+35)+30}" text-anchor="middle" fill="#fffbe9" stroke="#294e43" stroke-width="4" paint-order="stroke" font-weight="700" font-size="23">${r.name}</text></g>`).join('');
 if (!background) {
   background = environment();
   $('sonar-view').innerHTML = background + '<g id="sonar-signal-layer"></g><g id="sonar-points-layer"></g><g id="sonar-vessel-layer"></g>';
 }
 $('sonar-signal-layer').innerHTML = signal;
 $('sonar-points-layer').innerHTML = marks;
 $('sonar-vessel-layer').innerHTML = ship(shipX) + `<text class="sonar-probe-label" x="${shipX+(shipX>700?-24:24)}" y="168" text-anchor="${shipX>700?'end':'start'}" fill="#f4f8e2" stroke="#35685e" stroke-width="3" paint-order="stroke" font-size="20">船底探頭</text>`;
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
