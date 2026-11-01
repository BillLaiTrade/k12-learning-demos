import { layout, media, boundaryMs, durationMs, snapshot } from './normal-incidence-model.mjs';

const root=document.querySelector('#normal-lab');
const $=selector=>root.querySelector(selector);
const scene=$('#normal-scene'), picture=$('#normal-background');
const start=$('#normal-start'), pause=$('#normal-pause'), retry=$('#normal-retry');
const status=$('#normal-status'), badge=$('#normal-state');
let state='loading', elapsed=0, startTime=0, frame=0, previousStage=-1;
const tag=(x,y,text,width=112)=>`<g><rect x="${x}" y="${y-35}" width="${width}" height="54" rx="10" fill="#fffef4" fill-opacity=".94"/><text x="${x+width/2}" y="${y}" text-anchor="middle" font-size="31">${text}</text></g>`;
scene.innerHTML=`<defs><filter id="normal-glow" filterUnits="userSpaceOnUse" x="510" y="120" width="700" height="650"><feGaussianBlur stdDeviation="7"/></filter></defs>
<path class="normal-interface" d="M175 ${layout.boundary}H1510"/>
${tag(147,layout.boundary+8,'介面',95)}
${media.map((medium,i)=>{
 const x=layout.axes[i], left=i?971:376;
 return `<g class="normal-lane" data-medium="${medium}">
 <path class="normal-reference" d="M${x} 195V765"/>
 <text x="${x}" y="795" text-anchor="middle" font-size="28">法線</text>
 ${tag(left-45,338,'空氣')}${tag(left-45,650,i?'玻璃':'水')}
 <g class="normal-medium-note" visibility="hidden"><rect x="${x+60}" y="548" width="170" height="107" rx="12" fill="#fffef5" fill-opacity=".93"/><text x="${x+145}" y="590" font-size="30" text-anchor="middle">速度降低<tspan x="${x+145}" dy="43">方向不變</tspan></text></g>
 <g class="normal-beam" visibility="hidden">${['normal-halo','normal-ray','normal-core'].map(cls=>`<line class="${cls}" x1="${x}" y1="${layout.source}" x2="${x}" y2="${layout.source}"/>`).join('')}</g>
 <ellipse class="normal-source-light" cx="${x}" cy="${layout.source}" rx="15" ry="15" visibility="hidden"/>
 <path class="normal-direction" d="M0 0V28m-9-10 9 10 9-10" visibility="hidden"/>
 </g>`;
}).join('')}`;
const lanes=media.map(medium=>{
 const group=$(`[data-medium="${medium}"]`);
 return {group,beam:group.querySelector('.normal-beam'),lines:[...group.querySelectorAll('.normal-beam line')],note:group.querySelector('.normal-medium-note'),light:group.querySelector('.normal-source-light'),arrow:group.querySelector('.normal-direction')};
});
function stage(){return elapsed>=durationMs?3:elapsed>=boundaryMs?2:elapsed>0?1:0;}
function controls(){
 root.dataset.state=state;
 start.disabled=['loading','error','running','paused'].includes(state);
 pause.disabled=!['running','paused'].includes(state);
 pause.dataset.action=state==='paused'?'resume':'pause';
 pause.querySelector('span').textContent=state==='paused'?'繼續觀察':'暫停觀察';
 pause.setAttribute('aria-label',state==='paused'?'繼續兩束光的前進':'暫停兩束光，觀察同一瞬間的光路');
 start.classList.toggle('primary',state==='idle'||state==='complete');
 pause.classList.toggle('primary',state==='paused'||state==='running');
 badge.textContent={loading:'準備實驗桌',error:'場景未就緒',idle:'準備發射',running:'光束穿越中',paused:'已暫停觀察',complete:'直線通過'}[state];
}
function explainStage(){
 status.textContent=state==='paused'?'光路已定格。按「繼續觀察」接著看。':[
  '按「同時發射」，觀察兩束光如何垂直穿過介面。',
  '兩束光由上方空氣垂直向下前進。',
  '進入水與玻璃後，光束前緣變慢，仍沿法線直直前進。',
  '兩束光都直線通過，方向沒有偏折。再按「同時發射」可重新觀察。'
 ][stage()];
}
function render(){
 root.dataset.elapsedMs=String(elapsed);
 snapshot(elapsed).forEach((s,i)=>{
  const lane=lanes[i];lane.group.dataset.frontY=String(s.y);lane.group.dataset.entered=String(s.entered);lane.group.dataset.arrived=String(s.arrived);
  lane.lines.forEach(line=>line.setAttribute('y2',String(s.y)));
  lane.beam.setAttribute('visibility',elapsed>0?'visible':'hidden');
  lane.light.setAttribute('visibility',elapsed>0?'visible':'hidden');
  lane.note.setAttribute('visibility',s.entered?'visible':'hidden');
  lane.arrow.setAttribute('transform',`translate(${s.x+37} ${s.y-12})`);
  lane.arrow.setAttribute('visibility',elapsed>0&&!s.arrived?'visible':'hidden');
 });
 const current=stage();
 root.querySelectorAll('[data-normal-stage]').forEach(el=>current===Number(el.dataset.normalStage)?el.setAttribute('aria-current','step'):el.removeAttribute('aria-current'));
 scene.setAttribute('aria-label',`垂直入射光路剖面示意：空氣在上，左側為水，右側為玻璃；法線與光路重合。${current>=2?'光進入另一種介質後速度降低，方向沒有偏折。':'按同時發射觀察光路。'}`);
 if(previousStage!==current){previousStage=current;if(!['loading','error'].includes(state))explainStage();}
}
function stop(){cancelAnimationFrame(frame);frame=0;}
function tick(now){
 if(state!=='running')return;
 elapsed=Math.min(durationMs,Math.max(0,now-startTime));render();
 if(elapsed>=durationMs){state='complete';frame=0;controls();explainStage();}
 else frame=requestAnimationFrame(tick);
}
function play(fromBeginning=false){
 if(['loading','error'].includes(state))return;
 stop();if(fromBeginning)elapsed=0;
 state='running';startTime=performance.now()-elapsed;render();controls();explainStage();frame=requestAnimationFrame(tick);
}
function freeze(){
 if(state!=='running')return;
 stop();elapsed=Math.min(durationMs,Math.max(0,performance.now()-startTime));state=elapsed>=durationMs?'complete':'paused';render();controls();explainStage();
}
start.onclick=()=>play(true);pause.onclick=()=>state==='paused'?play():freeze();
document.addEventListener('visibilitychange',()=>{if(document.hidden)freeze();});
if('IntersectionObserver' in window)new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)freeze();},{threshold:0}).observe($('#normal-viewport'));
async function prepare(){
 stop();state='loading';elapsed=0;render();controls();retry.hidden=true;
 try{await picture.decode();state='idle';controls();explainStage();}
 catch{state='error';controls();retry.hidden=false;status.textContent='實驗桌圖片暫時無法載入，請重新載入後再發射。';}
}
retry.onclick=()=>{picture.src=new URL(`normal-incidence-bench.png?retry=${Date.now()}`,import.meta.url).href;prepare();};
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
