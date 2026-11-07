import{validWaterMass,massObservationAt,massHeatingSeconds}from './mass-comparison-model.mjs?v=derive-1';
const get=id=>document.getElementById(id),root=get('mass-lab'),input=get('mass-input'),play=get('mass-play'),knob=get('mass-knob'),image=get('mass-apparatus'),svg=get('mass-curve-graph'),motion=get('mass-curve-motion');
const speed=30,number=v=>v.toLocaleString('zh-TW',{maximumFractionDigits:2}),reduced=matchMedia('(prefers-reduced-motion: reduce)');
let mass=250,elapsed=0,playing=false,ready=false,valid=true,frame=0,last=0,lastReading=-Infinity,attempt=0,geometry='',analysisKey='';
const caseMasses=[100,200,300],verifiedCases=new Set();
const observe=()=>massObservationAt(mass,elapsed),predict=m=>massObservationAt(m,massHeatingSeconds(m));
motion.innerHTML='<defs><linearGradient id="mass-curve-water"><stop stop-color="#c5e1d8" stop-opacity=".25"/><stop offset=".5" stop-color="#d8ece5" stop-opacity=".08"/><stop offset="1" stop-color="#bfdbd1" stop-opacity=".23"/></linearGradient></defs><path d="M418 539V563" stroke="#b8bbae" stroke-width="4"/><path id="mass-water-body" fill="url(#mass-curve-water)"/><ellipse id="mass-water-surface" cx="432" rx="113" ry="9" fill="#effbf6" fill-opacity=".15" stroke="#fffef1" stroke-opacity=".7"/><ellipse id="mass-water-ripple" cx="432" fill="none" stroke="#fffdf1" stroke-width="2"/><g transform="translate(432 578) scale(1 .32)"><g id="mass-stir"><rect x="-34" y="-10" width="68" height="20" rx="10" fill="#f6faf0" stroke="#bac4b5"/></g></g><circle id="mass-led" cx="369" cy="693" r="7" fill="#173824"/>';
function cancel(){playing=false;cancelAnimationFrame(frame);frame=0;}
function graph(){
 const width=Math.max(220,Math.round(svg.getBoundingClientRect().width)||400),height=width<300?300:330,key=width+'/'+height;
 const left=42,right=width-16,top=35,bottom=height-47,x=m=>left+(m-100)/250*(right-left),y=r=>bottom-r/10*(bottom-top);
 if(key!==geometry){geometry=key;svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.style.height=height+'px';
  const ticks=width<340?[100,200,350]:[100,150,200,250,300,350];
  svg.innerHTML=`<g class="mass-curve-grid">${[0,2,4,6,8,10].map(r=>`<path d="M${left} ${y(r)}H${right}"/><text x="${left-8}" y="${y(r)+5}" text-anchor="end" stroke="none">${r}</text>`).join('')}${ticks.map(m=>`<path d="M${x(m)} ${top}V${bottom}"/><text x="${x(m)}" y="${bottom+23}" text-anchor="${m===100?'start':m===350?'end':'middle'}" stroke="none">${m}</text>`).join('')}</g><path class="mass-curve-axis" d="M${left} ${top-5}V${bottom}H${right+3}"/><text x="3" y="18">升高的度數（°C）</text><text x="${right}" y="${height-3}" text-anchor="end">水量（g）</text><path id="mass-curve-line" d="${Array.from({length:101},(_,i)=>{const m=100+i*2.5;return(i?'L':'M')+x(m)+' '+y(predict(m).rise);}).join('')}"/><path id="mass-curve-guides"/><circle id="mass-prediction" r="8"/><circle id="mass-result" r="6"/>`;
 }
 const state=observe(),prediction=predict(mass),px=x(mass),py=y(prediction.rise);
 get('mass-curve-guides').setAttribute('d',`M${left} ${py}H${px}V${bottom}`);
 for(const [id,rise]of[['mass-prediction',prediction.rise],['mass-result',state.rise]]){const n=get(id);n.setAttribute('cx',px);n.setAttribute('cy',y(rise));n.dataset.mass=String(mass);n.dataset.rise=String(rise);}
 get('mass-result').style.display=playing||elapsed>0?'':'none';
 get('mass-result').dataset.heat=String(state.waterCalories);
 svg.setAttribute('aria-label',`推算曲線：100至350g水各吸收1000cal。${number(mass)}g水預測升高${prediction.rise.toFixed(1)}°C；${state.complete?'驗證結果與預測位置重合。':`空心點標示最終預測；橘色實心點目前吸收${number(state.waterCalories)}cal、升高${state.rise.toFixed(1)}°C。`}`);
}
function analysis(state){
 const key=[mass,playing,elapsed>0,state.complete,ready,...verifiedCases].join('/');if(key===analysisKey)return;analysisKey=key;
 document.querySelectorAll('[data-mass-case]').forEach(button=>{
  const value=Number(button.dataset.massCase),active=value===mass;
  const label=active&&playing?'驗證中…':active&&elapsed>0&&!state.complete?'驗證未完成':verifiedCases.has(value)?'✓ 已驗證':'待驗證';
  button.disabled=!ready;button.setAttribute('aria-pressed',String(active));button.querySelector('small').textContent=label;button.dataset.verified=String(verifiedCases.has(value));button.setAttribute('aria-label',`驗證${value}g水，預期升高${predict(value).rise.toFixed(1)}°C，${label}`);
 });
}
function render(force=false){
 const state=observe();analysis(state);root.dataset.playing=String(playing);root.dataset.mass=String(mass);root.dataset.waterCalories=String(state.waterCalories);root.dataset.temperature=String(state.temperature);root.dataset.rise=String(state.rise);
 input.disabled=!ready||playing;play.disabled=knob.disabled=!ready||playing||!valid;
 const label=playing?'驗證中…':state.complete?'重新驗證':elapsed>0?'繼續驗證':'開始驗證';play.textContent=label;knob.title=label;knob.setAttribute('aria-label',label);
 if(force||!playing||performance.now()-lastReading>=400){lastReading=performance.now();get('mass-meter').textContent=state.temperature.toFixed(1);get('mass-energy').textContent=state.waterCalories.toLocaleString('zh-TW',{maximumFractionDigits:0});get('mass-rise').textContent=state.rise.toFixed(1);}
 const waterY=589-mass/400*240;get('mass-water-body').setAttribute('d',`M319 ${waterY}Q432 ${waterY+16}545 ${waterY}L544 579Q432 602 320 579Z`);get('mass-water-surface').setAttribute('cy',waterY);motion.dataset.mass=String(mass);motion.dataset.surfaceY=String(waterY);motion.style.visibility=ready?'visible':'hidden';
 const t=reduced.matches?0:elapsed/speed,ripple=get('mass-water-ripple'),phase=(t*.7)%1;get('mass-stir').setAttribute('transform',`rotate(${t*240%360})`);ripple.setAttribute('cy',waterY);ripple.setAttribute('rx',30+phase*75);ripple.setAttribute('ry',3+phase*5);ripple.setAttribute('opacity',playing&&!reduced.matches?(1-phase)*.38:0);get('mass-led').setAttribute('fill',playing?'#aeff72':'#173824');get('mass-meter-screen').hidden=!ready;graph();
}
function reset(){cancel();elapsed=0;root.dataset.phase=ready?'ready':'loading';get('mass-status').textContent=ready?`預測：${number(mass)}g水吸收1,000 cal，升高${predict(mass).rise.toFixed(1)}°C。按下開始驗證，核對曲線上的位置。`:'正在準備器材…';render(true);}
function tick(now){frame=0;if(!playing)return;elapsed=Math.min(massHeatingSeconds(mass),elapsed+Math.min(100,Math.max(0,now-last))/1000*speed);last=now;
 if(observe().complete){if(caseMasses.includes(mass))verifiedCases.add(mass);cancel();root.dataset.phase='complete';get('mass-status').textContent=`✓ 驗證符合預測：${number(mass)}g水吸收1,000 cal，升高${observe().rise.toFixed(1)}°C。`;}
 render();if(playing)frame=requestAnimationFrame(tick);
}
function start(){if(!ready||playing||!valid)return;if(observe().complete)reset();if(elapsed===0)verifiedCases.delete(mass);playing=true;root.dataset.phase='running';last=performance.now();get('mass-status').textContent='正在加熱驗證；水量固定，吸收滿1,000 cal後核對預測位置。';render(true);frame=requestAnimationFrame(tick);}
function interrupt(){if(!playing)return;cancel();root.dataset.phase='interrupted';get('mass-status').textContent='驗證已中斷，讀值保留；按繼續驗證接著觀察。';render(true);}
async function load(retry=false){const version=++attempt;ready=false;reset();get('mass-loading').hidden=false;get('mass-loading').textContent='正在準備器材…';get('mass-retry').hidden=true;if(retry)image.src=new URL('mass-comparison-bench.webp?curveRetry='+version,import.meta.url).href;
 try{await image.decode();if(version!==attempt)return;ready=true;get('mass-loading').hidden=true;reset();}catch{if(version!==attempt)return;root.dataset.phase='error';get('mass-loading').textContent='器材圖片未能載入，請重新載入。';get('mass-retry').hidden=false;get('mass-status').textContent='器材尚未就緒；仍可閱讀推算曲線與白話規律。';render(true);}}
input.addEventListener('input',()=>{valid=input.value.trim()!==''&&validWaterMass(Number(input.value));input.setAttribute('aria-invalid',String(!valid));get('mass-input-error').hidden=valid;if(valid&&Number(input.value)!==mass){mass=Number(input.value);reset();}else render();});
document.getElementById('mass-analysis').addEventListener('click',event=>{
 const target=event.target.closest('[data-mass-case],[data-mass-case-target]');if(!target||!ready)return;
 mass=Number(target.dataset.massCase||target.dataset.massCaseTarget);valid=true;input.value=String(mass);input.setAttribute('aria-invalid','false');get('mass-input-error').hidden=true;reset();root.scrollIntoView({block:'start',behavior:'instant'});start();
});
play.addEventListener('click',start);knob.addEventListener('click',start);get('mass-retry').addEventListener('click',()=>load(true));window.addEventListener('blur',interrupt);document.addEventListener('visibilitychange',()=>{if(document.hidden)interrupt();});
document.querySelector('.route').addEventListener('click',e=>{const a=e.target.closest('a');if(a&&a.hash!=='#card-03'&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey)interrupt();});
document.querySelector('.route a[href="#card-03"]').addEventListener('click',e=>{if(innerWidth>=1100&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey){e.preventDefault();history.pushState(null,'','#card-03');root.scrollIntoView({block:'start',behavior:'instant'});}});if(location.hash==='#card-03'&&innerWidth>=1100)window.addEventListener('load',()=>root.scrollIntoView({block:'start',behavior:'instant'}),{once:true});
new ResizeObserver(graph).observe(svg);load();
