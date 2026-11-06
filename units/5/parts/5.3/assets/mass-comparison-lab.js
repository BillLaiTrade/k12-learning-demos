import {validWaterMass,MASS_TARGET_CALORIES,MASS_ANIMATION_SPEED,massObservationAt} from './mass-comparison-model.mjs?v=derive-1';
const root=document.getElementById('mass-lab'),get=id=>document.getElementById(id);
const play=get('mass-play'),image=get('mass-apparatus'),input=get('mass-input');
const records=new Map(),reduced=matchMedia('(prefers-reduced-motion: reduce)');
let mass=200,frame=0,ready=false,attempt=0,inputValid=true;
const cups=[{elapsed:0,active:false,last:0},{elapsed:0,active:false,last:0}];
const isPlaying=()=>cups.some(cup=>cup.active);
const observations=()=>[massObservationAt(100,cups[0].elapsed),massObservationAt(mass,cups[1].elapsed)];
const integer=value=>Math.floor(value+1e-8).toLocaleString('zh-TW');
const svg=get('mass-apparatus-motion');
svg.innerHTML=`<defs><linearGradient id="mass-water" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#cee5df" stop-opacity=".25"/><stop offset=".4" stop-color="#b6d9d2" stop-opacity=".07"/><stop offset="1" stop-color="#e5f4ec" stop-opacity=".23"/></linearGradient><linearGradient id="mass-stir" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fffef4"/><stop offset="1" stop-color="#c8d3c7"/></linearGradient></defs>`;
for(const [key,offset]of [['a',0],['b',778]]){
 svg.insertAdjacentHTML('beforeend',`<g data-mass-vessel="${key}" transform="translate(${offset} 0)"><path d="M418 539V565" stroke="#6d6f63" stroke-width="5" stroke-linecap="round"/><path d="M417 539V564" stroke="#e3e6d7" stroke-width="1.5"/>
 <path class="mass-water-body" fill="url(#mass-water)"/><ellipse class="mass-water-surface" cx="432" rx="113" ry="9" fill="#f1fff6" fill-opacity=".07" stroke="#fcfff3" stroke-opacity=".75" stroke-width="2"/>
 <ellipse class="mass-water-ripple" cx="432" fill="none" stroke="#fffdf1" stroke-width="1.8"/>
 <ellipse cx="432" cy="585" rx="35" ry="3" fill="#354838" opacity=".13"/><g transform="translate(432 578) scale(1 .32)"><g class="mass-stir-bar"><rect x="-34" y="-10" width="68" height="20" rx="10" fill="url(#mass-stir)" stroke="#b6bfb3" stroke-width="1.5"/><path d="M-24-5H24" stroke="#fff" stroke-width="2"/></g></g>
 <circle class="mass-led" cx="369" cy="693" r="7.2" fill="#173824"/><g class="mass-knob-pointer"><path d="M454 667V680" stroke="#5f5141" stroke-width="5" stroke-linecap="round"/><path d="M454 667V680" stroke="#fff9e4" stroke-width="2.5" stroke-linecap="round"/></g></g>`);
}
const vessels=[...svg.querySelectorAll('[data-mass-vessel]')];
function cancel(){cups.forEach(cup=>cup.active=false);cancelAnimationFrame(frame);frame=0;}
function render(){
 const states=observations(),playing=isPlaying();
 const complete=root.dataset.phase==='complete';
 root.dataset.playing=String(playing);root.dataset.mass=String(mass);root.dataset.records=String(records.size);
 input.disabled=!ready||playing;
 play.disabled=!ready||playing||!inputValid;play.textContent='兩杯一起開始';
 play.title='兩杯都回到20°C，一起開始比較';
 root.querySelectorAll('[data-mass-start]').forEach(button=>{const i=button.dataset.massStart==='a'?0:1,name=i?'B杯':'A杯',cup=cups[i];button.disabled=!ready||cup.active||!inputValid;button.title=cup.active?`${name}加熱中`:`${cup.elapsed>0?'重新':'開始'}加熱${name}`;button.setAttribute('aria-label',`${button.title}，只控制${name}，到1,000cal自動停熱`);});
 get('mass-current-b').textContent=mass;
 states.forEach((state,i)=>{
  const key=i?'b':'a',vessel=vessels[i],active=cups[i].active;
  root.dataset[key+'Heat']=String(state.waterCalories);root.dataset[key+'Temperature']=String(state.temperature);
  get('mass-meter-'+key).textContent=state.temperature.toFixed(1);
  get('mass-energy-'+key).textContent=integer(state.waterCalories);
  get('mass-state-'+key).textContent=active?'加熱並攪拌中':state.complete?'已到1,000 cal・停熱':cups[i].elapsed>0?'已停止加熱':'等待點旋鈕';
  const rise=(Number(state.temperature.toFixed(1))-20).toFixed(1);get('mass-rise-'+key).textContent=rise;
  const bar=get('mass-rise-bar-'+key);bar.style.width=state.rise/10*100+'%';bar.setAttribute('aria-label',`${key.toUpperCase()}杯從20°C升高${rise}°C，共同刻度0至10°C`);
  // 400mL同規格燒杯；水位按已量取質量改變，不隨加熱任意變高。
  const waterY=589-state.mass/400*240;
  vessel.querySelector('.mass-water-body').setAttribute('d',`M319 ${waterY}Q432 ${waterY+16}545 ${waterY}L544 579Q432 602 320 579Z`);
  vessel.querySelector('.mass-water-surface').setAttribute('cy',waterY);
  vessel.dataset.mass=String(state.mass);vessel.dataset.surfaceY=String(waterY);vessel.dataset.heating=String(active);
  const time=reduced.matches?0:state.elapsed/MASS_ANIMATION_SPEED;
  vessel.querySelector('.mass-stir-bar').setAttribute('transform',`rotate(${time*240%360})`);
  const ripple=vessel.querySelector('.mass-water-ripple'),phase=(time*.7)%1;
  ripple.setAttribute('cy',waterY);ripple.setAttribute('rx',30+phase*75);ripple.setAttribute('ry',3+phase*5);ripple.setAttribute('opacity',active&&!reduced.matches?(1-phase)*.38:0);
  vessel.querySelector('.mass-led').setAttribute('fill',active?'#aeff72':'#173824');
  vessel.querySelector('.mass-knob-pointer').setAttribute('transform',`rotate(${active?35:-35} 454 695)`);
 });
 svg.style.visibility=ready?'visible':'hidden';
 get('mass-record-panel').hidden=records.size===0;
 get('mass-conclusion').hidden=!complete;
 get('mass-derivation').hidden=!complete;
 if(complete){const factor=mass/100,reciprocal=Number.isInteger(factor)?`1/${factor}`:(100/mass).toFixed(2);get('mass-conclusion-text').textContent=mass===100?'兩杯水量相同，同樣吸熱，溫升也相同。':`B杯水量是A杯${Math.round((factor+Number.EPSILON)*100)/100}倍，溫升約為A杯的${reciprocal}（${states[1].rise.toFixed(1)}°C）。`;}
 get('mass-meter-a-screen').hidden=get('mass-meter-b-screen').hidden=!ready;
}
function reset(){cancel();cups.forEach(cup=>cup.elapsed=0);root.dataset.phase=ready?'ready':'loading';get('mass-status').textContent=ready?'點各杯旋鈕分別加熱，或讓兩杯一起從20°C開始。':'正在準備比較台…';render();}
function record(){
 const [a,b]=observations();records.delete(mass);records.set(mass,{a,b});if(records.size>3)records.delete(records.keys().next().value);
 const body=get('mass-records');body.replaceChildren();
 [...records.keys()].sort((a,b)=>a-b).forEach(value=>{const r=records.get(value),row=document.createElement('tr');[`${value} g`,`${r.a.rise.toFixed(1)}°C`,`${r.b.rise.toFixed(1)}°C`].forEach((text,i)=>{const cell=document.createElement(i?'td':'th');if(!i)cell.scope='row';cell.textContent=text;row.append(cell);});body.append(row);});
}
function status(){
 const states=observations(),active=cups.map(cup=>cup.active);
 if(states.every(s=>s.complete))return '兩杯都已完成，已自動記錄；可分別重做或一起重來。';
 if(active.every(Boolean))return '兩杯分別加熱，到水吸熱1,000 cal時各自停熱。';
 const index=active[0]?0:active[1]?1:-1;
 if(index>=0){const own=index?'B杯':'A杯',other=index?'A杯':'B杯';return `${own}加熱中；${states[1-index].complete?other+'已完成，讀值保留。':'可點'+other+'旋鈕，另外開始加熱。'}`;}
 const done=states.findIndex(s=>s.complete);
 return done>=0?`${done?'B杯':'A杯'}已完成；點${done?'A杯':'B杯'}旋鈕加熱，兩杯完成才記錄。`:'點各杯旋鈕分別加熱，或讓兩杯一起從20°C開始。';
}
function schedule(){if(!frame&&isPlaying())frame=requestAnimationFrame(tick);}
function tick(now){
 frame=0;
 cups.forEach((cup,i)=>{if(!cup.active)return;cup.elapsed+=Math.max(0,Math.min(100,now-cup.last))/1000*MASS_ANIMATION_SPEED;cup.last=now;const observation=massObservationAt(i?mass:100,cup.elapsed);if(observation.complete){cup.elapsed=observation.elapsed;cup.active=false;}});
 if(observations().every(state=>state.complete)){root.dataset.phase='complete';record();}
 else root.dataset.phase=isPlaying()?'running':'partial';
 get('mass-status').textContent=status();render();schedule();
}
function startCup(index){
 if(!ready||!inputValid||cups[index].active)return;
 const cup=cups[index];cup.elapsed=0;cup.active=true;cup.last=performance.now();root.dataset.phase='running';
 get('mass-status').textContent=status();render();schedule();
}
function startTogether(){
 if(!ready||!inputValid||isPlaying())return;
 const now=performance.now();cups.forEach(cup=>{cup.elapsed=0;cup.active=true;cup.last=now;});root.dataset.phase='running';
 get('mass-status').textContent=status();render();schedule();
}
function interrupt(){
 if(!isPlaying())return;cancel();root.dataset.phase='interrupted';
 get('mass-status').textContent='加熱已停止；點旋鈕從20°C重做該杯，完成杯讀值保留。';render();
}
async function loadScene(retry=false){
 const version=++attempt;ready=false;reset();get('mass-loading').hidden=false;get('mass-loading').textContent='正在準備比較台…';get('mass-retry').hidden=true;
 if(retry)image.src=new URL(`mass-comparison-bench.webp?retry=${version}`,import.meta.url).href;
 try{await image.decode();if(version!==attempt)return;ready=true;get('mass-loading').hidden=true;reset();}
 catch{if(version!==attempt)return;root.dataset.phase='error';get('mass-loading').textContent='比較台圖片未能載入，請重新載入。';get('mass-retry').hidden=false;get('mass-status').textContent='器材尚未就緒，請先重新載入。';render();}
}
input.addEventListener('input',()=>{
 if(isPlaying())return;
 const value=input.valueAsNumber;inputValid=validWaterMass(value);
 get('mass-input-error').hidden=inputValid;input.setAttribute('aria-invalid',String(!inputValid));
 if(inputValid)mass=value;
 reset();if(!inputValid)get('mass-status').textContent='請先輸入100～350 g的有效水量。';
});
play.addEventListener('click',startTogether);root.querySelectorAll('[data-mass-start]').forEach(button=>button.addEventListener('click',()=>startCup(button.dataset.massStart==='a'?0:1)));get('mass-retry').addEventListener('click',()=>loadScene(true));
window.addEventListener('blur',interrupt);document.addEventListener('visibilitychange',()=>{if(document.hidden)interrupt();});
document.querySelector('.route').addEventListener('click',event=>{const link=event.target.closest('a');if(link&&link.hash!=='#card-03'&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey)interrupt();});
loadScene();

// 導覽進入後將操作台置於視窗上緣，操作時不必上下移動。
const massLink=document.querySelector('.route a[href="#card-03"]');
massLink.addEventListener('click',event=>{if(innerWidth>=1100&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey){event.preventDefault();history.pushState(null,'','#card-03');root.scrollIntoView({block:'start',behavior:'instant'});}});
if(location.hash==='#card-03'&&innerWidth>=1100)window.addEventListener('load',()=>root.scrollIntoView({block:'start',behavior:'instant'}),{once:true});
