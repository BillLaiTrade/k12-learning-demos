import {mountHeatBench} from './heat-bench-view.mjs?v=refined-1';
import {CALORIE_SETUP,calorieObservationAt} from './calorie-model.mjs';
const root=document.getElementById('calorie-lab');
const bench=mountHeatBench(root);
const get=id=>document.getElementById(id);
const startButton=get('calorie-transfer'),heaterButton=get('calorie-heater');
const image=get('calorie-apparatus'),message=get('calorie-observation'),result=get('calorie-conclusion');
let elapsed=0,playing=false,frame=0,last=0,assetReady=false,loadAttempt=0;
function render(){
  const state=calorieObservationAt(elapsed),temperature=state.temperature.toFixed(1);
  get('calorie-meter').textContent=temperature;
  get('calorie-end').textContent=temperature;
  // 算式以畫面讀值相減，避免兩個數各自四捨五入產生顯示差異。
  get('calorie-rise').textContent=(Number(temperature)-CALORIE_SETUP.initial).toFixed(1);
  get('calorie-heat').textContent=state.waterCalories.toFixed(0);
  root.dataset.temperature=String(state.temperature);
  root.dataset.waterCalories=String(state.waterCalories);
  get('calorie-heater-status').textContent=playing?'加熱並攪拌中':state.complete?'已停熱・保留完成讀值':'等待開始觀察';
  root.dataset.playing=String(playing);
  startButton.disabled=!assetReady||playing;
  heaterButton.disabled=!assetReady||playing;
  const label=state.complete||root.dataset.phase==='interrupted'?'重新觀察':'開始加熱';
  startButton.textContent=playing?'觀察中…':label;
  heaterButton.setAttribute('aria-label',`${label}：從 20°C 觀察至 21°C`);
  heaterButton.title=playing?'加熱中，到 21°C 自動停止':label;
  result.hidden=!state.complete;
  bench.draw({elapsed,playing,ready:assetReady,speed:CALORIE_SETUP.animationSpeed});
}
function cancel(){playing=false;cancelAnimationFrame(frame);}
function reset(){
  cancel();elapsed=0;root.dataset.phase=assetReady?'ready':'loading';
  message.textContent=assetReady?'點加熱器旋鈕或按「開始加熱」。':'正在準備器材畫面…';
  render();
}
function interrupt(){
  if(!playing)return;
  cancel();root.dataset.phase='interrupted';
  message.textContent='觀察已停止；按「重新觀察」會從 20.0°C 開始。';
  render();get('calorie-heater-status').textContent='已停止加熱';
}
function start(){
  if(!assetReady||playing)return;
  elapsed=0;playing=true;root.dataset.phase='running';
  message.textContent='加熱中，到 21°C 自動停熱。';
  last=performance.now();render();
  const tick=now=>{
    if(!playing)return;
    elapsed+=Math.max(0,Math.min(100,now-last))/1000*CALORIE_SETUP.animationSpeed;last=now;
    if(calorieObservationAt(elapsed).complete){
      cancel();root.dataset.phase='complete';
      message.textContent='觀察完成，水溫升高 1°C。';
    }
    render();if(playing)frame=requestAnimationFrame(tick);
  };
  frame=requestAnimationFrame(tick);
}
async function loadScene(retry=false){
  const attempt=++loadAttempt;assetReady=false;cancel();elapsed=0;root.dataset.phase='loading';
  get('calorie-scene-loading').hidden=false;
  get('calorie-scene-loading').textContent='正在準備器材畫面…';
  get('calorie-retry').hidden=true;get('calorie-meter-screen').hidden=true;
  if(retry)image.src=new URL(`heat-bench-refined.webp?retry=${attempt}`,import.meta.url).href;
  render();
  try{
    await image.decode();if(attempt!==loadAttempt)return;
    assetReady=true;get('calorie-scene-loading').hidden=true;get('calorie-meter-screen').hidden=false;reset();
  }catch{
    if(attempt!==loadAttempt)return;
    root.dataset.phase='error';get('calorie-scene-loading').textContent='器材圖片未能載入，請重新載入。';
    get('calorie-retry').hidden=false;message.textContent='器材畫面尚未就緒，先重新載入，再開始觀察。';render();
  }
}
startButton.addEventListener('click',start);heaterButton.addEventListener('click',start);
get('calorie-retry').addEventListener('click',()=>loadScene(true));
window.addEventListener('blur',interrupt);
document.addEventListener('visibilitychange',()=>{if(document.hidden)interrupt();});
document.querySelector('.route').addEventListener('click',event=>{
  const link=event.target.closest('a');
  if(link&&link.hash!=='#card-01'&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey)interrupt();
});
loadScene();
