import {ARGON_DURATION,argonFrame} from './argon-model.mjs?v=argon-2';
const panel=document.querySelector('.argon-comparison');
const button=panel.querySelector('.argon-replay'),label=button.querySelector('span'),status=panel.querySelector('[role=status]');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const paths=[...panel.querySelectorAll('.argon-air-path,.argon-shield-path')].map(path=>{
 const shield=path.classList.contains('argon-shield-path'),head=document.createElementNS('http://www.w3.org/2000/svg','path');
 head.setAttribute('d','M0 0L-58 -24L-46 0L-58 24Z');head.setAttribute('fill',shield?'#c4edaa':'#eceae4');head.classList.add('argon-moving-head');path.parentElement.append(head);path.style.markerEnd='none';
 return {path,head,length:path.getTotalLength(),shield};
});
const oxidationLayer=panel.querySelector('.argon-oxidation-layer');
const glows=[...panel.querySelectorAll('.argon-arc-glow')];
let elapsed=ARGON_DURATION,state='complete',started=0,frame=0,lastMessage='';
function render(){
 const f=argonFrame(elapsed);panel.dataset.state=state;panel.dataset.phase=f.phase;panel.dataset.progress=f.progress.toFixed(4);panel.dataset.shield=f.shield.toFixed(4);panel.dataset.oxidation=f.oxidation.toFixed(4);oxidationLayer.style.opacity=String(f.oxidation);
 for(const item of paths){const amount=item.shield?f.shield:f.air;item.path.style.strokeDasharray=`${item.length} ${item.length}`;item.path.style.strokeDashoffset=String(item.length*(1-amount));item.path.style.opacity=String((item.shield ? 0.95 : 0.86)*Math.min(1,amount*4));
  const point=item.path.getPointAtLength(item.length*amount),before=item.path.getPointAtLength(Math.max(0,item.length*amount-2)),after=item.path.getPointAtLength(Math.min(item.length,item.length*amount+2));
  item.head.setAttribute('transform',`translate(${point.x} ${point.y}) rotate(${Math.atan2(after.y-before.y,after.x-before.x)*180/Math.PI})`);item.head.style.opacity=item.path.style.opacity;}
 const glow=state==='playing' && !reduced.matches ? 0.75 + 0.1*Math.sin(elapsed/700) : 0.8;glows.forEach(el=>el.style.opacity=String(glow));
 label.textContent=state==='paused'?'繼續觀看':state==='playing'?'重新播放':'重播保護過程';button.setAttribute('aria-label',state==='paused'?'繼續觀看氬氣保護過程':'重播兩種情況的保護過程');
 const messages={air:'兩邊都在焊接，觀察周圍空氣如何接近高溫金屬。',shielding:'右邊的氬氣由噴嘴送出，流向焊接區周圍。',protected:'右邊持續送入氬氣，減少焊接區與周圍空氣接觸。',result:'左邊表面氧化變色；右邊的氬氣減少空氣接觸，減少氧化。差異為教學示意。'};
 const message=(state==='paused'?'已暫停：':'')+messages[f.phase];if(message!==lastMessage){status.textContent=message;lastMessage=message;}
}
function cancel(){cancelAnimationFrame(frame);frame=0;}
function tick(now){if(state!=='playing')return;elapsed=Math.min(ARGON_DURATION,now-started);if(elapsed>=ARGON_DURATION)state='complete';render();if(state==='playing')frame=requestAnimationFrame(tick);}
function pause(){if(state!=='playing')return;elapsed=Math.min(ARGON_DURATION,performance.now()-started);cancel();state='paused';render();}
button.addEventListener('click',()=>{cancel();if(state!=='paused')elapsed=0;state='playing';started=performance.now()-elapsed;render();frame=requestAnimationFrame(tick);});
panel.addEventListener('keydown',event=>{if(event.key==='Escape')pause();});
if('IntersectionObserver' in window)new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)pause();}).observe(panel);
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
window.addEventListener('pagehide',pause);
// The photo loads independently. Image decoding failures must not lock the replay control.
button.disabled=false;render();
