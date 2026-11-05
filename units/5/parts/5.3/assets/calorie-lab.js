import {CALORIE_SETUP,calorieObservationAt} from './calorie-model.mjs';
const root=document.getElementById('calorie-lab');
const get=id=>document.getElementById(id);
const startButton=get('calorie-transfer'),resetButton=get('calorie-reset');
const image=get('calorie-apparatus'),message=get('calorie-observation'),result=get('calorie-conclusion');
let elapsed=0,playing=false,frame=0,last=0,assetReady=false,loadAttempt=0;
function render(){
  const state=calorieObservationAt(elapsed),temperature=state.temperature.toFixed(1);
  get('calorie-meter').textContent=temperature;
  get('calorie-end').textContent=temperature;
  get('calorie-rise').textContent=state.rise.toFixed(1);
  get('calorie-heat').textContent=state.waterCalories.toFixed(0);
  root.style.setProperty('--calorie-rise',String(state.rise));
  root.dataset.temperature=String(state.temperature);
  root.dataset.waterCalories=String(state.waterCalories);
  get('calorie-heater-status').textContent=playing?'加熱並攪拌中':state.complete?'已停熱・保留完成讀值':'等待開始觀察';
  root.dataset.playing=String(playing);
  startButton.disabled=!assetReady||playing;
  startButton.textContent=state.complete?'重看一次':root.dataset.phase==='interrupted'?'重新觀察':'開始加熱';
  resetButton.disabled=elapsed===0;
  result.hidden=!state.complete;
}
function cancel(){playing=false;cancelAnimationFrame(frame);}
function reset(){
  cancel();elapsed=0;root.dataset.phase=assetReady?'ready':'loading';
  message.textContent=assetReady?'按「開始加熱」，比較水溫前後的變化。':'正在準備器材畫面…';
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
  message.textContent='觀察數位溫度計；到 21.0°C 時會自動停熱。動畫已加速。';
  last=performance.now();render();
  const tick=now=>{
    if(!playing)return;
    elapsed+=Math.max(0,Math.min(100,now-last))/1000*CALORIE_SETUP.animationSpeed;last=now;
    if(calorieObservationAt(elapsed).complete){
      cancel();root.dataset.phase='complete';
      message.textContent='100 g 水從 20.0°C 升到 21.0°C，升高了 1.0°C。再看下方如何用「卡」記錄熱量。';
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
  if(retry)image.src=new URL(`calorie-water-apparatus.webp?retry=${attempt}`,import.meta.url).href;
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
startButton.addEventListener('click',start);resetButton.addEventListener('click',reset);
get('calorie-retry').addEventListener('click',()=>loadScene(true));
window.addEventListener('blur',interrupt);
document.addEventListener('visibilitychange',()=>{if(document.hidden)interrupt();});
document.querySelector('.route').addEventListener('click',event=>{
  const link=event.target.closest('a');
  if(link&&link.hash!=='#card-01'&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey)interrupt();
});
loadScene();
