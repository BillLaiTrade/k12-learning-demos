import {distanceKm, media, arrivalMs, durationMs, snapshot} from './light-speed-model.mjs';
import {revealExperiment,experimentVisible} from './experiment-viewport.mjs?v=20261105-eleven1';
import {createLaneTimers} from './independent-lane-timers.mjs?v=20261106-individual1';

const root = document.querySelector('#speed-lab');
const $ = selector => root.querySelector(selector);
const start = $('#race-start'), pause = $('#race-pause');
const stateLabel = $('#race-state'), status = $('#race-status'), timer = $('#race-time');
const image = $('#race-background'), retry = $('#race-retry');
const scene = $('#race-scene');
const viewport = $('.race-viewport');
const position = {start:448, end:1590, rows:[177,337,506]};
let state = 'loading', elapsed = 0, startTime = 0, frame = 0, pauseReason='',inView=true;
let mode='together';
const individual=createLaneTimers(media,arrivalMs);
const sourceButtons=[...root.querySelectorAll('[data-race-source]')];
const names=['空氣','水','玻璃'];
const clockText=ms=>(Math.floor(ms/10+1e-8)/100).toFixed(2);

// SVG is a transparent live overlay on the approved-quality table rendering.
// Every row uses the same route geometry, in synchronous or independent runs.
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
  root.dataset.state = state;root.dataset.pauseReason=pauseReason;root.dataset.mode=mode;
  status.hidden = state === 'idle';
  const unavailable = state === 'loading' || state === 'error';
  start.disabled = unavailable || mode==='together'&&(state === 'running' || state === 'paused');
  sourceButtons.forEach((button,i)=>{
    button.disabled=unavailable;
    const active=mode==='individual'?individual.lanes[i].state!=='idle':elapsed>0||state==='running';
    button.setAttribute('aria-label',`${active?'重新發射':'發射'}${names[i]}組光束，獨立計時`);
    button.title=`${active?'重新發射':'發射'}${names[i]}組光束`;
  });
  pause.disabled = unavailable || state === 'idle' || state === 'complete';
  start.classList.toggle('primary',state === 'idle' || state === 'complete');
  pause.classList.toggle('primary',state === 'running' || state === 'paused');
  pause.querySelector('span').textContent = state === 'paused' ? '繼續觀察' : '暫停觀察';
  pause.dataset.action = state === 'paused' ? 'resume' : 'pause';
  pause.setAttribute('aria-label',mode==='individual'?(state==='paused'?'繼續各組獨立計時':'暫停正在前進的各組光束'):state === 'paused' ? '繼續三道光的共同計時' : '暫停三道光，定格在同一瞬間');
  stateLabel.textContent = mode==='individual'?{running:'各組獨立計時',paused:'獨立計時・已暫停',complete:'本次發射皆已到達'}[state]:{loading:'準備實驗桌',error:'場景未就緒',idle:'準備就緒',running:'同步前進中',paused:'同一瞬間・已暫停',complete:'三道光皆已到達'}[state];
}
function render() {
  if(mode==='individual'){state=individual.state;pauseReason=individual.pauseReason;elapsed=Math.max(...individual.lanes.map(lane=>lane.elapsed));}
  const results = mode==='individual'?individual.lanes.map((lane,i)=>snapshot(lane.elapsed)[i]):snapshot(elapsed);
  root.dataset.elapsedMs = String(elapsed);
  // Truncate the running clock so it never shows an arrival time prematurely.
  timer.textContent = (Math.floor(elapsed / 10 + 1e-8) / 100).toFixed(2);
  results.forEach((result,i)=>{
    const lane = lanes[i], x = position.start + (position.end-position.start)*result.progress;
    const laneTime=mode==='individual'?individual.lanes[i]:{elapsed:Math.min(elapsed,arrivalMs(result.key)),state:result.arrived?'complete':state};
    lane.group.dataset.elapsedMs=String(laneTime.elapsed);lane.group.dataset.state=laneTime.state;
    lane.group.dataset.progress = String(result.progress);
    lane.group.dataset.arrived = String(result.arrived);
    lane.beam.setAttribute('visibility',laneTime.elapsed > 0 ? 'visible':'hidden');
    lane.lines.forEach(line=>line.setAttribute('x2',String(x)));
    lane.pulses.forEach(pulse=>{pulse.setAttribute('cx',String(x));pulse.setAttribute('visibility',result.arrived?'hidden':'visible');});
    lane.receiver.setAttribute('visibility',result.arrived?'visible':'hidden');
    lane.result.dataset.arrived = String(result.arrived);
    lane.result.querySelector('strong').textContent = result.arrived ? `約 ${(arrivalMs(result.key)/1000).toFixed(2)} 秒` : mode==='individual'&&laneTime.state!=='idle'?`${clockText(laneTime.elapsed)} 秒`:'尚未到達';
    lane.result.setAttribute('aria-label',`${names[i]}：${result.arrived?'已到達':laneTime.state==='paused'?'已暫停':laneTime.state==='running'?'計時中':'尚未發射'}，${clockText(laneTime.elapsed)}秒`);
  });
  scene.setAttribute('aria-label',`共同路程${distanceKm.toLocaleString('en-US')}公里；${mode==='individual'?'各組獨立計時':`共同計時${timer.textContent}秒`}。${results.map((r,i)=>`${names[i]}：${r.arrived?'已到達':`已走約${Math.round(r.traveledKm).toLocaleString('en-US')}公里`}`).join('；')}。`);
}
function stopFrame() { cancelAnimationFrame(frame); frame = 0; }
function tick(now) {
  if (state !== 'running') return;
  if(document.hidden||!experimentVisible(viewport)){freeze('automatic');return;}
  if(mode==='individual'){
    individual.advance(now);render();
    if(state!=='running'){frame=0;controls();individualStatus();}
    else frame=requestAnimationFrame(tick);
    return;
  }
  elapsed = Math.min(durationMs,Math.max(0,now-startTime));
  render();
  if (elapsed >= durationMs) {
    state='complete';frame=0;controls();
    status.textContent='三道光皆已到達，可重新比較。';
  } else frame=requestAnimationFrame(tick);
}
function play(fromBeginning = false, manual = false) {
  if (state==='loading' || state==='error') return;
  stopFrame();
  if(manual)revealExperiment(viewport,$('.race-console'));
  if(mode==='individual'&&!fromBeginning){individual.resume(manual?'manual':'automatic',performance.now());beginIndividual();return;}
  mode='together';
  if(fromBeginning || state==='complete' || state==='idle')elapsed=0;
  if(document.hidden||!experimentVisible(viewport)){
    state='paused';pauseReason='automatic';render();controls();
    status.textContent='回到實驗畫面後會繼續觀察。';return;
  }
  state='running';pauseReason='';startTime=performance.now()-elapsed;render();controls();
  status.textContent='三道光同時前進；按「暫停觀察」，比較同一瞬間走過的距離。';
  frame=requestAnimationFrame(tick);
}
function freeze(reason='manual') {
  if(state!=='running')return;
  if(mode==='individual'){stopFrame();individual.pause(reason,performance.now());render();controls();individualStatus();return;}
  stopFrame();elapsed=Math.min(durationMs,Math.max(0,performance.now()-startTime));
  state=elapsed>=durationMs?'complete':'paused';pauseReason=state==='paused'?reason:'';render();controls();
  status.textContent=state==='complete'?'三道光皆已到達，可重新比較。':'三道光定格在同一瞬間。按「繼續觀察」接著看，不計入暫停的時間。';
}
function individualStatus(){status.textContent=state==='paused'?'各組計時已暫停；繼續後不計入暫停時間。':'各組獨立計時；按「同時發光」可重新同步比較。';}
function beginIndividual(){
  stopFrame();
  if(document.hidden||!experimentVisible(viewport))individual.pause('automatic',performance.now());
  render();controls();individualStatus();
  if(state==='running')frame=requestAnimationFrame(tick);
}
function launchLane(key){
  if(state==='loading'||state==='error')return;
  revealExperiment(viewport,$('.race-console'));
  const now=performance.now();
  if(mode==='together'){
    if(state==='running')elapsed=Math.min(durationMs,Math.max(0,now-startTime));
    individual.seed(elapsed,state,pauseReason,now);mode='individual';
  }
  individual.start(key,now);beginIndividual();
}
sourceButtons.forEach(button=>button.onclick=()=>launchLane(button.dataset.raceSource));
start.onclick=()=>play(true,true);
pause.onclick=()=>state==='paused'?play(false,true):freeze();
const resumeAutomatic=()=>{if(!inView||document.hidden)return;if(mode==='individual'){individual.resume('automatic',performance.now());beginIndividual();}else if(state==='paused'&&pauseReason==='automatic')play();};
document.addEventListener('visibilitychange',()=>{if(document.hidden)freeze('automatic');else resumeAutomatic();});
if('IntersectionObserver' in window)new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;if(inView)resumeAutomatic();else freeze('automatic');},{threshold:0}).observe(viewport);
async function prepare() {
  mode='together';state='loading';pauseReason='';elapsed=0;stopFrame();render();controls();retry.hidden=true;
  try {
    await image.decode();
    state='idle';controls();status.textContent='';
  } catch {
    state='error';controls();retry.hidden=false;status.textContent='實驗桌圖片暫時無法載入，請重新載入實驗桌。';
  }
}
retry.onclick=()=>{image.src=new URL(`light-speed-bench.png?retry=${Date.now()}`,import.meta.url).href;prepare();};
prepare();
