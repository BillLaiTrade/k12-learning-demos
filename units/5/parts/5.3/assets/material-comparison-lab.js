import {MATERIALS,reading} from './heat-model.mjs';
const root=document.getElementById('material-lab'),get=id=>document.getElementById(id),image=get('material-apparatus'),select=get('material-setting'),play=get('material-play');
let material='aluminum',ready=false,frame=0,attempt=0;
const cups=[{elapsed:0,active:false,last:0},{elapsed:0,active:false,last:0}];
const playing=()=>cups.some(c=>c.active);
const observe=i=>reading({mass:100,material:i?material:'water'},Math.min(500,cups[i].elapsed/6*500));
const svg=get('material-motion');
svg.innerHTML=`<defs><linearGradient id="material-metal"><stop stop-color="#7d8587"/><stop offset=".25" stop-color="#d9dfe0"/><stop offset=".65" stop-color="#9ca6a7"/><stop offset="1" stop-color="#d5d9d4"/></linearGradient><pattern id="material-brush" width="8" height="3" patternUnits="userSpaceOnUse"><path d="M0 1H8" stroke="#fff" opacity=".18"/></pattern></defs><g id="material-solid"></g><g id="material-water-stir"><rect x="407" y="601" width="50" height="11" rx="5" fill="#f8f9ef" stroke="#bac6b7"/></g>${[0,1].map((i)=>`<circle data-led="${i}" cx="${i?1132:375}" cy="713" r="7" fill="#183a25"/><g data-pointer="${i}"><path d="M${i?1221:463} 688v14" stroke="#fffbed" stroke-width="3" stroke-linecap="round"/></g>`).join('')}`;
function drawBlock(){
 const scale=material==='aluminum'?1:material==='iron'?.7:.67,w=86*scale,h=72*scale,x=1192-w/2,y=615-h,depth=18*scale,color=material==='copper'?'#b66d42':material==='iron'?'#636e72':'#bfc7c9';
 get('material-solid').innerHTML=`<path d="M${x} ${y}l${depth} -${depth}h${w}l-${depth} ${depth}Z" fill="${material==='copper'?'#e6b08a':'#e1e4dd'}" stroke="#7d8580"/><path d="M${x} ${y}h${w}v${h}h-${w}Z" fill="url(#material-metal)"/><path d="M${x} ${y}h${w}v${h}h-${w}Z" fill="${color}" opacity=".5"/><path d="M${x+w} ${y}l${depth} -${depth}v${h}l-${depth} ${depth}Z" fill="${color}" stroke="#747b76"/><path d="M${x} ${y}h${w}v${h}h-${w}Z" fill="url(#material-brush)"/><path d="M1180 552L${1192} ${y-depth/2}" stroke="#636a61" stroke-width="3"/><ellipse cx="1192" cy="${y-depth/2}" rx="10" ry="4" fill="#e2e4da" stroke="#87948b"/>`;
}
function cancel(){cups.forEach(c=>c.active=false);cancelAnimationFrame(frame);frame=0;}
function render(){
 const states=[observe(0),observe(1)],complete=cups.every(c=>c.elapsed>=6),max=500/(100*MATERIALS[material].c);
 root.dataset.phase=ready?(complete?'complete':playing()?'running':cups.some(c=>c.elapsed>0)?'partial':'ready'):root.dataset.phase;
 root.dataset.playing=String(playing());select.disabled=!ready||playing();play.disabled=!ready||playing();
 play.textContent='兩份一起開始';get('material-name').textContent=get('material-bar-name').textContent=MATERIALS[material].name;
 states.forEach((s,i)=>{const key=i?'b':'a';get('material-meter-'+key).textContent=s.temperature.toFixed(1);get('material-heat-'+key).textContent=Math.floor(s.heat+1e-8).toLocaleString('zh-TW');get('material-rise-'+key).textContent=s.rise.toFixed(1);get('material-bar-'+key).style.width=s.rise/max*100+'%';const button=root.querySelector(`[data-material-start="${i}"]`);button.disabled=!ready||cups[i].active;button.title=`${cups[i].elapsed?'重新':'開始'}加熱${i?MATERIALS[material].name:'水'}`;button.setAttribute('aria-label',button.title+'，只控制這份樣品');svg.querySelector(`[data-led="${i}"]`).setAttribute('fill',cups[i].active?'#aeff72':'#183a25');svg.querySelector(`[data-pointer="${i}"]`).setAttribute('transform',`rotate(${cups[i].active?35:-35} ${i?1221:463} 715)`);});
 get('material-scale').textContent=`共同刻度：0～${max.toFixed(1)}°C`;
 get('material-discovery').hidden=!complete;
 if(complete){get('material-observation').textContent=`同樣100 g、吸收500 cal，水升高5.0°C，${MATERIALS[material].name}升高${states[1].rise.toFixed(1)}°C；水的算法不能直接套用。`;get('material-specific-values').textContent=`水：約1.00；${MATERIALS[material].name}：約${MATERIALS[material].c} cal／(g·°C)。`;}
 get('material-meter-a-screen').hidden=get('material-meter-b-screen').hidden=!ready;svg.style.visibility=ready?'visible':'hidden';
 const time=matchMedia('(prefers-reduced-motion: reduce)').matches?0:cups[0].elapsed;
 get('material-water-stir').setAttribute('transform',`translate(432 606) scale(${.5+.5*Math.abs(Math.cos(time*4))} 1) translate(-432 -606)`);
}
function reset(){cancel();cups.forEach(c=>c.elapsed=0);get('material-status').textContent=ready?'點各旋鈕分別加熱，或讓兩份一起開始。':'正在準備物質比較台…';drawBlock();render();}
function schedule(){if(!frame&&playing())frame=requestAnimationFrame(tick);}
function tick(now){frame=0;cups.forEach(c=>{if(!c.active)return;c.elapsed=Math.min(6,c.elapsed+Math.max(0,Math.min(100,now-c.last))/1000);c.last=now;if(c.elapsed>=6)c.active=false;});render();get('material-status').textContent=cups.every(c=>c.elapsed>=6)?'兩份觀察完成，現在檢驗水的算法並整理比熱。':playing()?'樣品正在吸熱，到500 cal各自停下。':'這份已完成，請啟動另一份樣品。';schedule();}
function start(index){if(!ready)return;if(index===undefined){if(playing())return;cups.forEach(c=>{c.elapsed=0;c.active=true;c.last=performance.now();});}else{if(cups[index].active)return;cups[index].elapsed=0;cups[index].active=true;cups[index].last=performance.now();}render();get('material-status').textContent='樣品正在吸熱，到500 cal各自停下。';schedule();}
function interrupt(){if(!playing())return;cancel();render();get('material-status').textContent='加熱已停止；點旋鈕可從20°C重做該份樣品。';}
async function load(retry=false){const version=++attempt;ready=false;root.dataset.phase='loading';reset();get('material-loading').hidden=false;get('material-retry').hidden=true;if(retry)image.src=new URL(`material-comparison-bench.webp?retry=${version}`,import.meta.url).href;try{await image.decode();if(version!==attempt)return;ready=true;get('material-loading').hidden=true;reset();}catch{if(version!==attempt)return;root.dataset.phase='error';get('material-loading').textContent='器材圖片未能載入，請重新載入。';get('material-retry').hidden=false;render();}}
select.addEventListener('change',()=>{if(playing())return;material=select.value;reset();});play.addEventListener('click',()=>start());root.querySelectorAll('[data-material-start]').forEach(b=>b.addEventListener('click',()=>start(Number(b.dataset.materialStart))));get('material-retry').addEventListener('click',()=>load(true));window.addEventListener('blur',interrupt);document.addEventListener('visibilitychange',()=>{if(document.hidden)interrupt();});document.querySelector('.route').addEventListener('click',e=>{const a=e.target.closest('a');if(a&&a.hash!=='#card-04'&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey)interrupt();});load();
