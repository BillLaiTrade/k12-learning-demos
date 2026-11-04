import { layout, media, distanceKm, airDistanceKm, mediumDistanceKm, arrivalMs, boundaryMs, comparisonMs, durationMs, snapshot } from './normal-incidence-model.mjs?v=20261102-1500000-v1';

const root=document.querySelector('#normal-lab');
const $=selector=>root.querySelector(selector);
const scene=$('#normal-scene'), picture=$('#normal-background');
const start=$('#normal-start'), pause=$('#normal-pause'), retry=$('#normal-retry');
const status=$('#normal-status'), badge=$('#normal-state'), timer=$('#normal-time');
$('#normal-distance').textContent=`${distanceKm/10000} 萬公里`;
$('#normal-route-split').textContent=`水／玻璃組：空氣 ${airDistanceKm/10000} 萬公里 ＋ 介質 ${mediumDistanceKm/10000} 萬公里`;
let state='loading', elapsed=0, startTime=0, frame=0, previousStage=-1;
let comparisonPending=true, pauseReason='',inView=true;
const tag=(x,y,text,width=104)=>`<g><rect x="${x}" y="${y-35}" width="${width}" height="54" rx="10" fill="#fffef4" fill-opacity=".94"/><text x="${x+width/2}" y="${y}" text-anchor="middle" font-size="30">${text}</text></g>`;
scene.innerHTML=`<defs><filter id="normal-glow" filterUnits="userSpaceOnUse" x="310" y="200" width="920" height="560"><feGaussianBlur stdDeviation="6"/></filter></defs>
<g class="normal-distance-guide" aria-hidden="true"><path d="M110 ${layout.source}V${layout.end} M98 ${layout.source}H122 M98 ${layout.end}H122" fill="none" stroke="#3f735c" stroke-width="2.5"/><rect x="24" y="${layout.boundary-26}" width="132" height="52" rx="9" fill="#fffef4" stroke="#b7cbb1"/><text x="90" y="${layout.boundary+9}" text-anchor="middle" font-size="24">${distanceKm/10000}萬公里</text></g>
${media.map((medium,i)=>{
 const x=layout.axes[i], inAir=medium==='air';
 return `<g class="normal-lane" data-medium="${medium}">
 ${inAir?'':`<path class="normal-interface" d="M${x-151} ${layout.boundary}H${x+151}"/>${tag(x-226,layout.boundary+10,'介面',90)}<path class="normal-reference" d="M${x} 266V925"/><path class="normal-right-angle" d="M${x+24} ${layout.boundary}v24h-24" fill="none" stroke="#476d59" stroke-width="3"/><g class="normal-reference-label"><rect x="${x-130}" y="934" width="260" height="54" rx="12" fill="#fffef7" stroke="#aac2a9" stroke-width="2"/><text x="${x}" y="971" text-anchor="middle" font-size="28">法線：垂直介面</text></g>`}
 ${tag(x-137,inAir?424:380,'空氣',100)}
 ${inAir?'':tag(x-137,590,medium==='water'?'水':'玻璃',medium==='water'?80:100)}
 <g class="normal-beam" visibility="hidden">${['normal-halo','normal-ray','normal-core'].map(cls=>`<line class="${cls}" x1="${x}" y1="${layout.source}" x2="${x}" y2="${layout.source}"/>`).join('')}</g>
 <ellipse class="normal-source-light" cx="${x}" cy="${layout.source}" rx="14" ry="14" visibility="hidden"/>
 <path class="normal-direction" d="M0 0V28m-9-10 9 10 9-10" visibility="hidden"/>
 <g class="normal-arrival" visibility="hidden" data-arrived="false"><rect x="${x-78}" y="755" width="156" height="84" rx="15"/><text class="normal-arrival-status" x="${x}" y="785" text-anchor="middle" font-size="27">尚未到達</text><text class="normal-arrival-time" x="${x}" y="821" text-anchor="middle" font-size="26">—</text></g>
 </g>`;
}).join('')}`;
const lanes=media.map(medium=>{
 const group=$(`[data-medium="${medium}"]`);
 return {group,beam:group.querySelector('.normal-beam'),lines:[...group.querySelectorAll('.normal-beam line')],light:group.querySelector('.normal-source-light'),arrow:group.querySelector('.normal-direction'),arrival:group.querySelector('.normal-arrival')};
});
function stage(){return !comparisonPending?3:elapsed>=boundaryMs?2:elapsed>0?1:0;}
function controls(){
 root.dataset.state=state;root.dataset.pauseReason=pauseReason;
 start.disabled=['loading','error','running','paused'].includes(state);
 pause.disabled=!['running','paused'].includes(state);
 pause.dataset.action=state==='paused'?'resume':'pause';
 pause.querySelector('span').textContent=state==='paused'?'繼續觀察':'暫停觀察';
 pause.setAttribute('aria-label',state==='paused'?'繼續三束光的共同前進':'暫停三束光，觀察同一瞬間的光路');
 start.classList.toggle('primary',state==='idle'||state==='complete');
 pause.classList.toggle('primary',state==='paused'||state==='running');
 badge.textContent=state==='paused'&&pauseReason==='comparison'?'同一瞬間・已暫停':{loading:'準備實驗桌',error:'場景未就緒',idle:'準備發射',running:'光束穿越中',paused:'已暫停觀察',complete:'三束光皆已到達'}[state];
}
function explainStage(){
 if(state==='paused'){
  status.textContent=pauseReason==='comparison'?'空氣先到，另外兩組尚未到達。':'已暫停，三束光停在同一瞬間。';return;
 }
 if(state==='complete'){status.textContent='三組皆已到達，可重新發射。';return;}
 status.textContent=[
  '準備好，一起比較三束光。',
  '三束光在空氣中同步前進。',
  '水與玻璃中的光開始變慢。',
  '空氣先到，另外兩組繼續前進。'
 ][stage()];
}
function render(){
 root.dataset.elapsedMs=String(elapsed);root.dataset.comparisonPassed=String(!comparisonPending);
 timer.textContent=(Math.floor(elapsed/10+1e-8)/100).toFixed(2);
 snapshot(elapsed).forEach((s,i)=>{
  const lane=lanes[i];lane.group.dataset.frontY=String(s.y);lane.group.dataset.entered=String(s.entered);lane.group.dataset.arrived=String(s.arrived);
  lane.lines.forEach(line=>line.setAttribute('y2',String(s.y)));
  lane.beam.setAttribute('visibility',elapsed>0?'visible':'hidden');
  lane.light.setAttribute('visibility',elapsed>0?'visible':'hidden');
  lane.arrow.setAttribute('transform',`translate(${s.x+32} ${s.y-12})`);
  lane.arrow.setAttribute('visibility',state==='running'&&elapsed>0&&!s.arrived?'visible':'hidden');
  lane.arrival.setAttribute('visibility',elapsed>0?'visible':'hidden');lane.arrival.dataset.arrived=String(s.arrived);
  lane.arrival.querySelector('.normal-arrival-status').textContent=s.arrived?(s.medium==='air'?'先到達':'已到達'):'尚未到達';
  lane.arrival.querySelector('.normal-arrival-time').textContent=s.arrived?`約 ${(arrivalMs(s.medium)/1000).toFixed(2)} 秒`:'—';
 });
 const current=stage();
 root.querySelectorAll('[data-normal-stage]').forEach(el=>current===Number(el.dataset.normalStage)?el.setAttribute('aria-current','step'):el.removeAttribute('aria-current'));
 scene.setAttribute('aria-label',`總路程${distanceKm/10000}萬公里，共同計時${timer.textContent}秒的光路剖面示意：左側全程空氣，中間由空氣進入水，右側由空氣進入玻璃。${current>=2?'水與玻璃中的前緣較慢，光路仍沿法線筆直前進。':'按同時發射觀察。'}${!comparisonPending?'空氣組已先到達；可比較同一段時間走過的距離。':''}`);
 if(previousStage!==current){previousStage=current;if(!['loading','error'].includes(state))explainStage();}
}
function stop(){cancelAnimationFrame(frame);frame=0;}
// Clamp exactly to the comparison instant even if the next rendered frame is late.
// Resuming consumes this one-time stop; it cannot stop again at the same instant.
function advance(now){
 const requested=Math.min(durationMs,Math.max(0,now-startTime));
 if(comparisonPending&&requested>=comparisonMs){elapsed=comparisonMs;comparisonPending=false;return true;}
 elapsed=requested;return false;
}
function tick(now){
 if(state!=='running')return;
 const compare=advance(now);
 if(compare){state='paused';pauseReason='comparison';frame=0;}
 else if(elapsed>=durationMs){state='complete';pauseReason='';frame=0;}
 render();
 if(state!=='running'){controls();explainStage();}
 else frame=requestAnimationFrame(tick);
}
function play(fromBeginning=false){
 if(['loading','error'].includes(state))return;
 stop();if(fromBeginning){elapsed=0;comparisonPending=true;}
 state='running';pauseReason='';startTime=performance.now()-elapsed;render();controls();explainStage();frame=requestAnimationFrame(tick);
}
function freeze(reason='manual'){
 if(state!=='running')return;
 stop();const compare=advance(performance.now());state=elapsed>=durationMs?'complete':'paused';pauseReason=compare?'comparison':state==='paused'?reason:'';render();controls();explainStage();
}
start.onclick=()=>play(true);pause.onclick=()=>state==='paused'?play():freeze();
const resumeAutomatic=()=>{if(state==='paused'&&pauseReason==='automatic'&&inView&&!document.hidden)play();};
document.addEventListener('visibilitychange',()=>{if(document.hidden)freeze('automatic');else resumeAutomatic();});
if('IntersectionObserver' in window)new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;if(inView)resumeAutomatic();else freeze('automatic');},{threshold:0}).observe($('#normal-viewport'));
async function prepare(){
 stop();state='loading';elapsed=0;comparisonPending=true;pauseReason='';render();controls();retry.hidden=true;
 try{await picture.decode();state='idle';controls();explainStage();}
 catch{state='error';controls();retry.hidden=false;status.textContent='實驗桌圖片暫時無法載入，請重新載入後再發射。';}
}
retry.onclick=()=>{picture.src=new URL(`normal-incidence-half-air-bench.png?retry=${Date.now()}`,import.meta.url).href;prepare();};
prepare();

// A single rigid axle moves straight across a horizontal boundary. Both wheels
// reach it together. This analogy is explicitly separate from light's mechanism.
const details=document.querySelector('#normal-explanation'), cart=document.querySelector('#normal-cart');
const cartStatus=document.querySelector('#normal-cart-status'), cartPlay=document.querySelector('#normal-cart-play');
let cartFrame=0, cartStart=0, cartElapsed=0, cartState='idle';
function drawCart(){
 const time=Math.max(0,cartElapsed), y=time<=1000?82+time*.078:160+Math.min(1800,time-1000)*.052;
 cart.setAttribute('transform',`translate(0 ${y})`);cart.dataset.y=String(y);
 const crossed=time>=1000;
 const message=cartState==='complete'?'兩輪一起變慢，仍直直前進。':crossed?'兩輪同時進入較慢的區域，方向不變。':'兩輪並排，朝交界直直前進。';
 if(cartStatus.textContent!==message)cartStatus.textContent=message;
}
function stopCart(){cancelAnimationFrame(cartFrame);cartFrame=0;if(cartState==='running'){cartElapsed=Math.min(2800,performance.now()-cartStart);cartState='paused';drawCart();}cartPlay.textContent=cartState==='paused'?'繼續小車示範':'播放小車示範';}
function cartTick(now){
 if(cartState!=='running')return;
 cartElapsed=Math.min(2800,Math.max(0,now-cartStart));drawCart();
 if(cartElapsed>=2800){cartState='complete';cartFrame=0;cartPlay.disabled=false;cartPlay.textContent='再看一次小車示範';drawCart();}
 else cartFrame=requestAnimationFrame(cartTick);
}
function playCart(){
 if(cartState==='running')return;
 if(cartState==='complete'||cartState==='idle')cartElapsed=0;
 cartState='running';cartStart=performance.now()-cartElapsed;cartPlay.disabled=true;drawCart();cartFrame=requestAnimationFrame(cartTick);
}
cartPlay.onclick=playCart;
details.addEventListener('toggle',()=>{
 if(details.open){freeze();if(matchMedia('(prefers-reduced-motion: reduce)').matches){cartPlay.disabled=false;drawCart();}else playCart();}
 else{stopCart();cartPlay.disabled=false;}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden){stopCart();cartPlay.disabled=false;}});
if('IntersectionObserver' in window)new IntersectionObserver(entries=>{if(!entries[0].isIntersecting){stopCart();cartPlay.disabled=false;}},{threshold:0}).observe(details);
drawCart();
