const root=document.getElementById('ppm-lab');
const canvas=document.getElementById('pool-canvas'),ctx=canvas.getContext('2d');
const reagent=document.getElementById('pool-reagent'),reset=document.getElementById('pool-reset');
const status=document.getElementById('ppm-status'),reading=document.getElementById('pool-reading');
const choices=[...root.querySelectorAll('[data-pool-sample]')];
// Prepared teaching samples; free-chlorine readings are expressed as Cl2 equivalents.
// The color scale and reaction time are illustrative, not an instrument calibration.
const samples={A:{value:1,filter:[255,197,226]},B:{value:2,filter:[255,146,196]},C:{value:3,filter:[242,98,163]}};
const reduced=matchMedia('(prefers-reduced-motion:reduce)');
let selected='A',phase='fresh',progress=0,elapsed=0,lastTime=0,frame=0,image=null,ready=false;
const format=n=>n.toLocaleString('en-US',{maximumFractionDigits:4});

function cancel(){if(frame)cancelAnimationFrame(frame);frame=0;}
function example(value){
  root.dataset.ppm=String(value);root.dataset.totalMg='1000000';
  for(const [key,text] of Object.entries({percent:`${format(value/10000)}%`,ppm:`${format(value)} ppm`,numerator:`${format(value)} 毫克`})){
    for(const node of root.querySelectorAll(`[data-ppm="${key}"]`))node.textContent=text;
  }
  root.querySelector('[data-pool-example-mass]').textContent=`${format(value)} 毫克`;
  root.querySelector('.ppm-worked').setAttribute('aria-label',`${value}毫克除以一百萬毫克再乘以一百萬，等於${value}ppm`);
  root.querySelector('.ppm-worked-result').textContent=`× 1,000,000 ＝ ${format(value)} ppm`;
  root.querySelector('.ppm-equivalence').setAttribute('aria-label',`${format(value/10000)}%等於${value}ppm`);
}
function update(){
  root.dataset.sample=selected;root.dataset.phase=phase;root.dataset.reacting=String(phase==='reacting');
  root.dataset.measured=phase==='read'?String(samples[selected].value):'';
  for(const choice of choices){choice.disabled=!ready;choice.setAttribute('aria-pressed',String(choice.dataset.poolSample===selected));}
  reagent.disabled=!ready||phase!=='fresh';reset.disabled=!ready;
  reagent.querySelector('span').textContent=phase==='fresh'?'＋ 加入 DPD 試劑':phase==='reacting'?'混合顯色中…':'已加入試劑';
  document.getElementById('pool-sample-label').textContent=`池水樣本 ${selected}`;
  for(const row of root.querySelectorAll('[data-pool-level]')){
    const active=phase==='read'&&Number(row.dataset.poolLevel)===samples[selected].value;
    row.classList.toggle('is-match',active);
    if(active)row.setAttribute('aria-current','true');else row.removeAttribute('aria-current');
  }
  reading.textContent=phase==='read'?`${format(samples[selected].value)} mg/L ≈ ${format(samples[selected].value)} ppm`:phase==='reacting'?'等待顯色，再與色卡比較':'加入試劑後，讀取餘氯含量';
  canvas.setAttribute('aria-label',`泳池水樣${selected}：${phase==='fresh'?'清澈、尚未加入試劑':phase==='reacting'?'與DPD試劑反應顯色中':`顯色後對照色卡，讀值${samples[selected].value}毫克每公升`}`);
}
function draw(){
  if(!image)return;
  const width=canvas.parentElement.clientWidth,dpr=Math.min(devicePixelRatio||1,2);
  if(!width)return;
  if(canvas.width!==Math.round(width*dpr)){canvas.width=Math.round(width*dpr);canvas.height=Math.round(width*2/3*dpr);}
  ctx.setTransform(canvas.width/1536,0,0,canvas.height/1024,0,0);
  ctx.clearRect(0,0,1536,1024);ctx.drawImage(image,0,0,1536,1024);
  if(progress<=0)return;
  ctx.save();ctx.beginPath();
  // Interior liquid boundary follows the meniscus and curved base in the photograph.
  ctx.moveTo(522,359);ctx.bezierCurveTo(551,378,686,380,713,359);
  ctx.lineTo(711,774);ctx.bezierCurveTo(694,804,541,804,523,774);ctx.closePath();ctx.clip();
  const opacity=progress,color=samples[selected].filter.join(',');
  const tint=ctx.createLinearGradient(0,359,0,798);
  tint.addColorStop(0,`rgba(${color},${opacity*Math.min(1,progress*1.7)})`);
  tint.addColorStop(1,`rgba(${color},${opacity})`);
  ctx.globalCompositeOperation='multiply';ctx.fillStyle=tint;ctx.fillRect(515,350,210,460);ctx.restore();
}
function fresh(next=selected){
  cancel();selected=next;phase='fresh';progress=elapsed=0;
  example(1);update();draw();
  status.textContent=`已取池水樣本 ${selected}，點試劑包加入 DPD 試劑。`;
}
function tick(now){
  frame=0;if(phase!=='reacting'||document.hidden)return;
  elapsed+=Math.min(100,Math.max(0,now-lastTime));lastTime=now;
  progress=Math.min(1,elapsed/1600);draw();
  if(progress>=1){
    phase='read';example(samples[selected].value);update();
    status.textContent=`水樣 ${selected} 已顯色。與色卡比對，餘氯約為 ${samples[selected].value} mg/L；稀水溶液中，數值近似 ${samples[selected].value} ppm。`;
  }else frame=requestAnimationFrame(tick);
}
reagent.addEventListener('click',()=>{
  if(!ready||phase!=='fresh')return;
  phase='reacting';elapsed=0;progress=0;update();status.textContent='已加入 DPD 試劑，正在混合顯色。';
  lastTime=performance.now();
  if(reduced.matches){elapsed=1600;tick(lastTime);}else frame=requestAnimationFrame(tick);
});
choices.forEach(button=>button.addEventListener('click',()=>fresh(button.dataset.poolSample)));
reset.addEventListener('click',()=>fresh());
document.addEventListener('visibilitychange',()=>{
  if(phase!=='reacting')return;
  if(document.hidden)cancel();else{lastTime=performance.now();frame=requestAnimationFrame(tick);}
});
window.addEventListener('pagehide',cancel);
window.addEventListener('pageshow',()=>{if(phase==='reacting'&&!frame){lastTime=performance.now();frame=requestAnimationFrame(tick);}});
const observer=new ResizeObserver(draw);observer.observe(canvas.parentElement);
function load(){
  root.dataset.ready='loading';ready=false;status.classList.remove('error');update();
  const photo=new Image();
  photo.onload=()=>{image=photo;ready=true;root.dataset.ready='true';document.getElementById('pool-retry').hidden=true;fresh();};
  photo.onerror=()=>{root.dataset.ready='error';status.classList.add('error');status.textContent='水樣場景無法載入，請點「重新載入」；下方濃度公式仍可閱讀。';document.getElementById('pool-retry').hidden=false;};
  photo.src=new URL('./ppm-pool-water.webp',import.meta.url).href;
}
document.getElementById('pool-retry').addEventListener('click',load);
example(1);load();
