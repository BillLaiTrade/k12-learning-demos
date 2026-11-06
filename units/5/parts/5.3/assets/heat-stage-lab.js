import {mountHeatBench} from './heat-bench-view.mjs?v=refined-1';
import {HEAT_TARGET,validHeatTarget,secondsForWaterHeat,heatStageObservationAt,heatSampleValues,STAGE_ANIMATION_SPEED} from './heat-stage-model.mjs?v=readable-1';

const get=id=>document.getElementById(id),root=get('heat-lab'),bench=mountHeatBench(root);
const play=get('heat-stage-play'),heater=get('heat-stage-heater'),image=get('heat-stage-apparatus'),input=get('heat-stage-target');
const status=get('heat-stage-status'),svg=get('heat-stage-graph'),records=[];
const number=value=>value.toLocaleString('zh-TW',{maximumFractionDigits:2});
const axisNumber=value=>value.toLocaleString('zh-TW',{maximumFractionDigits:4});
const READING_INTERVAL_MS=400;
let target=HEAT_TARGET.initial,elapsed=0,playing=false,frame=0,last=0,ready=false,attempt=0,inputValid=true;
let lastReadingTime=-Infinity;
let samples=heatSampleValues(target),geometry=null,pointsKey='',rowsKey='';
const observation=()=>heatStageObservationAt(elapsed,target);
const sampleAt=heat=>heatStageObservationAt(secondsForWaterHeat(heat),target);
const exampleMode=()=>elapsed===0&&!playing;

function cancel(){playing=false;cancelAnimationFrame(frame);frame=0;}
function analysis(data,example){
  get('heat-stage-analysis-mode').textContent=example?'推算示例・非本次觀察':'本次觀察・沿途前三筆';
  const body=get('heat-stage-analysis-data');body.replaceChildren();
  for(let i=0;i<3;i++){
    const r=data[i],row=document.createElement('tr'),heat=document.createElement('th'),rise=document.createElement('td');
    heat.scope='row';heat.textContent=r?number(r.waterCalories)+' cal':'待記錄';rise.textContent=r?r.rise.toFixed(1)+'°C':'—';
    row.append(heat,rise);body.append(row);
  }
}
function graph(){
  const state=observation(),example=exampleMode(),width=Math.max(220,Math.round(svg.getBoundingClientRect().width)||400);
  const photoBox=root.querySelector('.calorie-photo').getBoundingClientRect(),plotBox=svg.parentElement.getBoundingClientRect();
  const headingHeight=root.querySelector('.heat-stage-plot-heading').getBoundingClientRect().height;
  // 並排時讓整個圖表與器材照片等高；堆疊時維持獨立、可讀的圖表高度。
  const height=plotBox.left>=photoBox.right-1?Math.max(240,Math.round(photoBox.height-headingHeight)):
    Math.max(270,Math.min(340,Math.round(width*.8)));
  if(!geometry||geometry.width!==width||geometry.height!==height||geometry.target!==target){
    // 兩軸隨目標縮放，繪圖區維持正方形；完整關係線因此固定呈45度。
    const side=Math.min(width-76,height-81),offsetX=60+(width-76-side)/2,offsetY=35+(height-81-side)/2;
    geometry={width,height,target,maximum:target,left:offsetX,right:offsetX+side,top:offsetY,bottom:offsetY+side};
    const {left,right,top,bottom,maximum}=geometry,x=q=>left+q/maximum*(right-left),y=r=>bottom-r/(maximum/100)*(bottom-top);
    const ticks=Array.from({length:5},(_,i)=>maximum*i/4);
    svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.style.height=height+'px';
    svg.innerHTML=`<g class="heat-stage-grid">${ticks.map((q,i)=>`<path d="M${left} ${y(q/100)}H${right}"/><path d="M${x(q)} ${top}V${bottom}"/>${side>=260||i%2===0?`<text x="${left-8}" y="${y(q/100)+5}" text-anchor="end">${axisNumber(q/100)}</text><text x="${x(q)}" y="${bottom+23}" text-anchor="${q===maximum?'end':q===0?'start':'middle'}">${axisNumber(q)}</text>`:''}`).join('')}</g><path class="heat-stage-axes" d="M${left} ${top-6}V${bottom}H${right+5}"/><text x="4" y="18" class="heat-stage-axis-title">溫升 ΔT（°C）</text><text x="${right}" y="${height-3}" text-anchor="end" class="heat-stage-axis-title">水吸收熱量 Q（cal）</text><path id="heat-stage-line" d="M${left} ${bottom}L${right} ${top}"/><g id="heat-stage-points"></g><circle id="heat-stage-halo" r="13"/><circle id="heat-stage-live" r="6"/>`;
    pointsKey='';
  }
  const {left,right,top,bottom,maximum}=geometry,x=q=>left+q/maximum*(right-left),y=r=>bottom-r/(maximum/100)*(bottom-top);
  const values=records.map(r=>r.waterCalories),key=values.join(',');
  if(key!==pointsKey){
    pointsKey=key;get('heat-stage-points').innerHTML=values.map(q=>`<circle cx="${x(q)}" cy="${y(q/100)}" r="3.5" data-heat="${q}" data-rise="${q/100}"/>`).join('');
  }
  for(const id of ['heat-stage-live','heat-stage-halo']){
    const node=get(id);node.setAttribute('cx',x(state.waterCalories));node.setAttribute('cy',y(state.rise));
    node.dataset.heat=String(state.waterCalories);node.dataset.rise=String(state.rise);
  }
  svg.dataset.mode=example?'example':'observation';svg.dataset.maximum=String(maximum);
  svg.setAttribute('aria-label',`100g水的關係直線已完整顯示，從0到吸熱${axisNumber(target)}cal、溫升${axisNumber(target/100)}°C。橘點目前在吸熱${number(state.waterCalories)}cal、溫升${state.rise.toFixed(1)}°C；加熱時沿直線向右上方移動。`);
}

function render(forceReadings=false){
  const state=observation(),example=exampleMode();
  root.dataset.playing=String(playing);root.dataset.records=String(records.length);root.dataset.target=String(target);
  root.dataset.waterCalories=String(state.waterCalories);root.dataset.temperature=String(state.temperature);root.dataset.rise=String(state.rise);
  input.disabled=!ready||playing;play.disabled=heater.disabled=!ready||playing||!inputValid;
  const label=state.complete?'重新觀察':elapsed>0?'繼續加熱':'開始加熱';
  play.textContent=playing?'加熱中…':label;heater.title=playing?'加熱中':label;heater.setAttribute('aria-label',label+'，連續觀察水吸收熱量與升溫');
  const now=performance.now();
  if(forceReadings||!playing||now-lastReadingTime>=READING_INTERVAL_MS){
    lastReadingTime=now;
    get('heat-stage-meter').textContent=get('heat-stage-temperature').textContent=state.temperature.toFixed(1);
    get('heat-stage-energy').textContent=playing?state.waterCalories.toLocaleString('zh-TW',{maximumFractionDigits:0}):number(state.waterCalories);
    get('heat-stage-rise').textContent=state.rise.toFixed(1);
  }
  const data=example?samples.map(sampleAt):records,key=String(example)+'/'+data.map(r=>r.waterCalories).join(',');
  if(key!==rowsKey){
    rowsKey=key;const body=get('heat-stage-records');body.replaceChildren();
    for(const r of data){const row=document.createElement('tr');[number(r.waterCalories)+' cal',r.temperature.toFixed(1)+'°C',r.rise.toFixed(1)+'°C'].forEach((value,i)=>{const cell=document.createElement(i?'td':'th');if(!i)cell.scope='row';cell.textContent=value;row.append(cell);});body.append(row);}
    analysis(data,example);
  }
  get('heat-stage-record-label').textContent=example?'查看推算示例的逐點數據':`查看沿途觀察紀錄（${records.length}筆）`;
  graph();bench.draw({elapsed,playing,ready,speed:STAGE_ANIMATION_SPEED});
}
function reset(){
  cancel();elapsed=0;records.length=0;samples=heatSampleValues(target);root.dataset.phase=ready?'ready':'loading';
  status.textContent=ready?'設定目標後開始加熱；每次都從20°C比較。':'正在準備器材畫面…';render();
}
function tick(now){
  frame=0;if(!playing)return;
  elapsed=Math.min(secondsForWaterHeat(target),elapsed+Math.max(0,Math.min(100,now-last))/1000*STAGE_ANIMATION_SPEED);last=now;
  const state=observation();
  while(records.length<samples.length&&samples[records.length]<=state.waterCalories+1e-8)records.push(sampleAt(samples[records.length]));
  if(state.complete){cancel();root.dataset.phase='complete';status.textContent='本次加熱完成，讀值與沿途紀錄已保留；可更換熱量重新比較。';}
  render();if(playing)frame=requestAnimationFrame(tick);
}
function start(){
  if(!ready||playing||!inputValid)return;
  if(observation().complete)reset();
  playing=true;root.dataset.phase='running';last=performance.now();status.textContent='亮點連續前進，讀值稍作停留方便觀察；到目標熱量時停熱。';render(true);frame=requestAnimationFrame(tick);
}
function interrupt(){
  if(!playing)return;cancel();root.dataset.phase='interrupted';status.textContent='觀察已停止，讀值與紀錄保留；按「繼續加熱」接著觀察。';render();
}
async function loadScene(retry=false){
  const version=++attempt;ready=false;reset();get('heat-stage-loading').hidden=false;get('heat-stage-loading').textContent='正在準備器材畫面…';get('heat-stage-retry').hidden=true;get('heat-stage-meter-screen').hidden=true;
  if(retry)image.src=new URL(`heat-bench-refined.webp?continuousRetry=${version}`,import.meta.url).href;
  try{await image.decode();if(version!==attempt)return;ready=true;get('heat-stage-loading').hidden=true;get('heat-stage-meter-screen').hidden=false;reset();}
  catch{if(version!==attempt)return;root.dataset.phase='error';get('heat-stage-loading').textContent='器材圖片未能載入，請重新載入。';get('heat-stage-retry').hidden=false;status.textContent='器材尚未就緒；下方示例與公式仍可閱讀。';render();}
}
input.addEventListener('input',()=>{
  const value=input.value.trim()===''?NaN:Number(input.value);inputValid=validHeatTarget(value);
  input.setAttribute('aria-invalid',String(!inputValid));get('heat-stage-input-error').hidden=inputValid;
  if(inputValid&&value!==target){target=value;reset();}else render();
});
play.addEventListener('click',start);heater.addEventListener('click',start);get('heat-stage-retry').addEventListener('click',()=>loadScene(true));
window.addEventListener('blur',interrupt);document.addEventListener('visibilitychange',()=>{if(document.hidden)interrupt();});
document.querySelector('.route').addEventListener('click',event=>{const link=event.target.closest('a');if(link&&link.hash!=='#card-02'&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey)interrupt();});
new ResizeObserver(graph).observe(svg);loadScene();
