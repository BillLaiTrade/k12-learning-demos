import {distanceKm, media, arrivalMs, durationMs, snapshot} from './light-speed-model.mjs';

const root = document.querySelector('#speed-lab');
const $ = selector => root.querySelector(selector);
const start = $('#race-start'), pause = $('#race-pause'), replay = $('#race-reset');
const stateLabel = $('#race-state'), status = $('#race-status'), timer = $('#race-time');
const image = $('#race-background'), retry = $('#race-retry');
const scene = $('#race-scene');
const position = {start:448, end:1590, rows:[177,337,506]};
let state = 'loading', elapsed = 0, startTime = 0, frame = 0;

// SVG is a transparent live overlay on the approved-quality table rendering.
// Every row uses the same start/end coordinates and the same physical clock.
scene.innerHTML = `<defs>
 <filter id="speed-glow" filterUnits="userSpaceOnUse" x="390" y="100" width="1330" height="510"><feGaussianBlur stdDeviation="7"/></filter>
 <linearGradient id="speed-trail" gradientUnits="userSpaceOnUse" x1="448" y1="0" x2="1590" y2="0"><stop stop-color="#ffbd32" stop-opacity=".8"/><stop offset="1" stop-color="#ffc329"/></linearGradient>
</defs>
<g class="race-boundaries" aria-hidden="true"><path d="M448 122V592 M1590 122V592"/><path d="M448 100H1590 M448 91V109 M1590 91V109"/></g>
${media.map((key,i)=>`<g class="race-lane" data-material="${key}">
 <text class="race-material" x="${[209,198,184][i]}" y="${[198,357,526][i]}" text-anchor="middle">${['空氣','水','玻璃'][i]}</text>
 <g class="race-beam" visibility="hidden">
  <line class="race-halo" x1="448" y1="${position.rows[i]}" x2="448" y2="${position.rows[i]}"/>
  <line class="race-trail" x1="448" y1="${position.rows[i]}" x2="448" y2="${position.rows[i]}"/>
  <line class="race-core" x1="448" y1="${position.rows[i]}" x2="448" y2="${position.rows[i]}"/>
  <circle class="race-pulse-halo" cx="448" cy="${position.rows[i]}" r="20"/>
  <circle class="race-pulse" cx="448" cy="${position.rows[i]}" r="9"/>
 </g>
 <g class="race-receiver" visibility="hidden"><ellipse class="receiver-glow" cx="${[1615,1630,1644][i]}" cy="${position.rows[i]}" rx="30" ry="34"/><ellipse cx="${[1615,1630,1644][i]}" cy="${position.rows[i]}" rx="10" ry="18" fill="#fff0ad"/></g>
</g>`).join('')}`;
const lanes = media.map(key => ({
  group:$(`[data-material="${key}"]`),
  beam:$(`[data-material="${key}"] .race-beam`),
  lines:[...root.querySelectorAll(`[data-material="${key}"] .race-beam line`)],
  pulses:[...root.querySelectorAll(`[data-material="${key}"] .race-beam circle`)],
  receiver:$(`[data-material="${key}"] .race-receiver`),
  result:$(`[data-arrival="${key}"]`)
}));
function controls() {
  root.dataset.state = state;
  const unavailable = state === 'loading' || state === 'error';
  start.disabled = unavailable || state === 'running' || state === 'paused';
  pause.disabled = unavailable || state === 'idle' || state === 'complete';
  replay.disabled = unavailable;
  start.classList.toggle('primary',state === 'idle' || state === 'complete');
  pause.classList.toggle('primary',state === 'running' || state === 'paused');
  pause.querySelector('span').textContent = state === 'paused' ? '繼續觀察' : '暫停觀察';
  pause.dataset.action = state === 'paused' ? 'resume' : 'pause';
  pause.setAttribute('aria-label',state === 'paused' ? '繼續三道光的共同計時' : '暫停三道光，定格在同一瞬間');
  stateLabel.textContent = {loading:'準備實驗桌',error:'場景未就緒',idle:'準備就緒',running:'同步前進中',paused:'同一瞬間・已暫停',complete:'三道光皆已到達'}[state];
}
function render() {
  const results = snapshot(elapsed);
  root.dataset.elapsedMs = String(elapsed);
  // Truncate the running clock so it never shows an arrival time prematurely.
  timer.textContent = (Math.floor(elapsed / 10 + 1e-8) / 100).toFixed(2);
  results.forEach((result,i)=>{
    const lane = lanes[i], x = position.start + (position.end-position.start)*result.progress;
    lane.group.dataset.progress = String(result.progress);
    lane.group.dataset.arrived = String(result.arrived);
    lane.beam.setAttribute('visibility',elapsed > 0 ? 'visible':'hidden');
    lane.lines.forEach(line=>line.setAttribute('x2',String(x)));
    lane.pulses.forEach(pulse=>{pulse.setAttribute('cx',String(x));pulse.setAttribute('visibility',result.arrived?'hidden':'visible');});
    lane.receiver.setAttribute('visibility',result.arrived?'visible':'hidden');
    lane.result.dataset.arrived = String(result.arrived);
    lane.result.querySelector('strong').textContent = result.arrived ? `約 ${(arrivalMs(result.key)/1000).toFixed(2)} 秒` : '尚未到達';
  });
  scene.setAttribute('aria-label',`共同路程${distanceKm.toLocaleString('en-US')}公里；共同計時${timer.textContent}秒。${results.map((r,i)=>`${['空氣','水','玻璃'][i]}：${r.arrived?'已到達':`已走約${Math.round(r.traveledKm).toLocaleString('en-US')}公里`}`).join('；')}。`);
}
function stopFrame() { cancelAnimationFrame(frame); frame = 0; }
function tick(now) {
  if (state !== 'running') return;
  elapsed = Math.min(durationMs,Math.max(0,now-startTime));
  render();
  if (elapsed >= durationMs) {
    state='complete';frame=0;controls();
    status.textContent='相同路程下，空氣中的光先到，接著是水，最後是這種玻璃。';
  } else frame=requestAnimationFrame(tick);
}
function play(fromBeginning = false) {
  if (state==='loading' || state==='error') return;
  stopFrame();
  if(fromBeginning || state==='complete' || state==='idle')elapsed=0;
  state='running';startTime=performance.now()-elapsed;render();controls();
  status.textContent='三道光同時前進；按「暫停觀察」，比較同一瞬間走過的距離。';
  frame=requestAnimationFrame(tick);
}
function freeze() {
  if(state!=='running')return;
  stopFrame();elapsed=Math.min(durationMs,Math.max(0,performance.now()-startTime));
  state=elapsed>=durationMs?'complete':'paused';render();controls();
  status.textContent=state==='complete'?'三道光皆已到達，可重新播放比較。':'三道光定格在同一瞬間。按「繼續觀察」接著看，不計入暫停的時間。';
}
start.onclick=()=>play(true);
pause.onclick=()=>state==='paused'?play():freeze();
replay.onclick=()=>play(true);
document.addEventListener('visibilitychange',()=>{if(document.hidden)freeze();});
if('IntersectionObserver' in window)new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)freeze();},{threshold:0}).observe(root);
async function prepare() {
  state='loading';elapsed=0;stopFrame();render();controls();retry.hidden=true;
  try {
    await image.decode();
    state='idle';controls();status.textContent='三段路程皆為 100 萬公里。按「同時發光」開始比較。';
  } catch {
    state='error';controls();retry.hidden=false;status.textContent='實驗桌圖片暫時無法載入，請重新載入實驗桌。';
  }
}
retry.onclick=()=>{image.src=new URL(`light-speed-bench.png?retry=${Date.now()}`,import.meta.url).href;prepare();};
prepare();
