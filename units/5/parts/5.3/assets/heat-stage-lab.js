import {mountHeatBench} from './heat-bench-view.mjs?v=refined-1';
import {HEAT_STAGES,STAGE_SECONDS,STAGE_ANIMATION_SPEED,heatStageObservationAt} from './heat-stage-model.mjs';

const root=document.getElementById('heat-lab');
const bench=mountHeatBench(root);
const get=id=>document.getElementById(id);
const play=get('heat-stage-play'),heater=get('heat-stage-heater'),image=get('heat-stage-apparatus');
const status=get('heat-stage-status'),svg=get('heat-stage-graph');
const steps=[...root.querySelectorAll('[data-heat-stage]')];
const records=[];
let elapsed=0,playing=false,frame=0,last=0,assetReady=false,attempt=0,renderedRecords=-1;
const x=heat=>52+heat/2000*300,y=rise=>214-rise/20*174;
const number=value=>value.toLocaleString('zh-TW',{maximumFractionDigits:0});
svg.innerHTML=`<g class="heat-stage-grid">${[0,5,10,15,20].map(t=>`<path d="M52 ${y(t)}H352"/><text x="41" y="${y(t)+5}" text-anchor="end">${t}</text>`).join('')}${[0,500,1000,1500,2000].map(q=>`<path d="M${x(q)} 214v6"/><text x="${x(q)}" y="240" text-anchor="middle">${q}</text>`).join('')}</g><path class="heat-stage-axes" d="M52 28V214H359"/><text class="heat-stage-axis-title" x="8" y="18">溫升（°C）</text><text class="heat-stage-axis-title" x="352" y="265" text-anchor="end">水吸收熱量（cal）</text><path id="heat-stage-line" class="heat-stage-line"/><g id="heat-stage-points"></g><circle id="heat-stage-live" r="4"/>`;

function cancel(){playing=false;cancelAnimationFrame(frame);}
function render(){
  const state=heatStageObservationAt(elapsed),temperature=state.temperature.toFixed(1);
  root.dataset.playing=String(playing);root.dataset.records=String(records.length);
  root.dataset.waterCalories=String(state.waterCalories);root.dataset.temperature=String(state.temperature);
  get('heat-stage-meter').textContent=temperature;
  get('heat-stage-energy').textContent=number(state.waterCalories);
  const complete=records.length===HEAT_STAGES.length;
  play.disabled=heater.disabled=!assetReady||playing;
  const label=complete?'重新觀察':records.length||elapsed>0?'繼續加熱':'開始加熱';
  play.textContent=playing?'觀察中…':label;
  heater.setAttribute('aria-label',`${label}，分段觀察水吸收的熱量`);
  heater.title=playing?'加熱中':label;
  get('heat-stage-heater-status').textContent=playing?'加熱並攪拌中':elapsed>0?'已停熱・保留觀察時刻':'等待開始觀察';
  steps.forEach((step,i)=>{
    step.dataset.state=i<records.length?'recorded':playing&&i===records.length?'running':'pending';
    step.querySelector('b').textContent=i<records.length?'✓':'○';
    step.setAttribute('aria-label',`${number(HEAT_STAGES[i])} cal，${i<records.length?'已保留紀錄':playing&&i===records.length?'觀察中':'待觀察'}`);
  });
  get('heat-stage-line').setAttribute('d',`M52 214L${x(state.waterCalories)} ${y(state.rise)}`);
  const live=get('heat-stage-live');live.setAttribute('cx',x(state.waterCalories));live.setAttribute('cy',y(state.rise));
  live.hidden=state.waterCalories===0||records.some(r=>Math.abs(r.waterCalories-state.waterCalories)<1e-6);
  live.style.display=live.hidden?'none':'';
  svg.setAttribute('aria-label',`固定100g水；累計吸收${number(state.waterCalories)}cal，水溫${temperature}°C，從20°C升高${(Number(temperature)-20).toFixed(1)}°C。已保留${records.length}筆紀錄。`);
  if(renderedRecords!==records.length){
    renderedRecords=records.length;
    const body=get('heat-stage-records');body.replaceChildren();
    records.forEach(r=>{
      const row=document.createElement('tr');
      [number(r.waterCalories)+' cal',r.temperature.toFixed(0)+'°C',r.rise.toFixed(0)+'°C'].forEach((value,i)=>{
        const cell=document.createElement(i===0?'th':'td');if(i===0)cell.scope='row';cell.textContent=value;row.append(cell);
      });body.append(row);
    });
    get('heat-stage-points').innerHTML=records.map(r=>`<circle cx="${x(r.waterCalories)}" cy="${y(r.rise)}" r="4.5" data-heat="${r.waterCalories}" data-rise="${r.rise}"/>`).join('');
  }
  get('heat-stage-record-panel').hidden=records.length===0;
  get('heat-stage-conclusion').hidden=!complete;
  bench.draw({elapsed,playing,ready:assetReady,speed:STAGE_ANIMATION_SPEED});
}
function reset(){
  cancel();elapsed=0;records.length=0;renderedRecords=-1;root.dataset.phase=assetReady?'ready':'loading';
  status.textContent=assetReady?'點加熱器旋鈕或按「開始加熱」，先觀察到累計500 cal。':'正在準備器材畫面…';render();
}
function start(){
  if(!assetReady||playing)return;
  if(records.length===HEAT_STAGES.length)reset();
  const index=records.length,target=STAGE_SECONDS[index];
  playing=true;root.dataset.phase='running';last=performance.now();
  status.textContent=`觀察到累計${number(HEAT_STAGES[index])} cal時，會停下並自動保留紀錄。`;render();
  const tick=now=>{
    if(!playing)return;
    elapsed=Math.min(target,elapsed+Math.max(0,Math.min(100,now-last))/1000*STAGE_ANIMATION_SPEED);last=now;
    if(elapsed>=target){
      cancel();records.push(heatStageObservationAt(target));
      root.dataset.phase=records.length===HEAT_STAGES.length?'complete':'recorded';
      status.textContent=records.length===HEAT_STAGES.length?'三筆紀錄已完成，對照吸熱量與溫升的變化。':`已保留第${records.length}筆；按「繼續加熱」觀察下一段。`;
    }
    render();if(playing)frame=requestAnimationFrame(tick);
  };frame=requestAnimationFrame(tick);
}
function interrupt(){
  if(!playing)return;
  cancel();root.dataset.phase='interrupted';
  status.textContent='觀察已停止，已完成紀錄保留；按「繼續加熱」接著觀察。';render();
}
async function loadScene(retry=false){
  const version=++attempt;assetReady=false;reset();
  get('heat-stage-loading').hidden=false;get('heat-stage-loading').textContent='正在準備器材畫面…';
  get('heat-stage-retry').hidden=true;get('heat-stage-meter-screen').hidden=true;
  if(retry)image.src=new URL(`heat-bench-refined.webp?stageRetry=${version}`,import.meta.url).href;
  try{
    await image.decode();if(version!==attempt)return;
    assetReady=true;get('heat-stage-loading').hidden=true;get('heat-stage-meter-screen').hidden=false;reset();
  }catch{
    if(version!==attempt)return;
    root.dataset.phase='error';get('heat-stage-loading').textContent='器材圖片未能載入，請重新載入。';get('heat-stage-retry').hidden=false;
    status.textContent='器材畫面尚未就緒，請先重新載入。';render();
  }
}
play.addEventListener('click',start);heater.addEventListener('click',start);
get('heat-stage-retry').addEventListener('click',()=>loadScene(true));
window.addEventListener('blur',interrupt);
document.addEventListener('visibilitychange',()=>{if(document.hidden)interrupt();});
document.querySelector('.route').addEventListener('click',event=>{
  const link=event.target.closest('a');if(link&&link.hash!=='#card-02'&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey)interrupt();
});
loadScene();
