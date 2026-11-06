import {mountHeatBench} from './heat-bench-view.mjs?v=refined-1';
import {HEAT_TARGET,validHeatTarget,secondsForWaterHeat,heatStageObservationAt,heatSampleValues,STAGE_ANIMATION_SPEED} from './heat-stage-model.mjs?v=continuous-1';

const get=id=>document.getElementById(id),root=get('heat-lab'),bench=mountHeatBench(root);
const play=get('heat-stage-play'),heater=get('heat-stage-heater'),image=get('heat-stage-apparatus'),input=get('heat-stage-target');
const status=get('heat-stage-status'),svg=get('heat-stage-graph'),records=[];
const number=value=>value.toLocaleString('zh-TW',{maximumFractionDigits:2});
let target=HEAT_TARGET.initial,elapsed=0,playing=false,frame=0,last=0,ready=false,attempt=0,inputValid=true;
let samples=heatSampleValues(target),geometry=null,pointsKey='',rowsKey='';
const observation=()=>heatStageObservationAt(elapsed,target);
const sampleAt=heat=>heatStageObservationAt(secondsForWaterHeat(heat),target);
const exampleMode=()=>elapsed===0&&!playing;

function cancel(){playing=false;cancelAnimationFrame(frame);frame=0;}
function graph(){
  const state=observation(),example=exampleMode(),width=Math.max(220,Math.round(svg.getBoundingClientRect().width)||400);
  if(!geometry||geometry.width!==width||geometry.target!==target){
    const height=Math.max(270,Math.min(340,Math.round(width*.8))),raw=target/5,power=10**Math.floor(Math.log10(raw));
    const ratio=raw/power,step=power*(ratio<=1?1:ratio<=2?2:ratio<=5?5:10),maximum=Math.ceil(target/step)*step;
    geometry={width,height,target,maximum,left:42,right:width-18,top:35,bottom:height-46};
    const {left,right,top,bottom}=geometry,x=q=>left+q/maximum*(right-left),y=r=>bottom-r/(maximum/100)*(bottom-top);
    const ticks=width<340?[0,maximum/2,maximum]:Array.from({length:Math.round(maximum/step)+1},(_,i)=>i*step);
    svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.style.height=height+'px';
    svg.innerHTML=`<g class="heat-stage-grid">${ticks.map(q=>`<path d="M${left} ${y(q/100)}H${right}"/><text x="${left-8}" y="${y(q/100)+5}" text-anchor="end">${number(q/100)}</text><path d="M${x(q)} ${top}V${bottom}"/><text x="${x(q)}" y="${bottom+23}" text-anchor="${q===maximum?'end':q===0?'start':'middle'}">${number(q)}</text>`).join('')}</g><path class="heat-stage-axes" d="M${left} ${top-6}V${bottom}H${right+5}"/><text x="4" y="18" class="heat-stage-axis-title">溫升 ΔT（°C）</text><text x="${right}" y="${height-3}" text-anchor="end" class="heat-stage-axis-title">水吸收熱量 Q（cal）</text><path id="heat-stage-line"/><g id="heat-stage-points"></g><circle id="heat-stage-halo" r="13"/><circle id="heat-stage-live" r="6"/><g id="heat-stage-tooltip"><rect width="142" height="48" rx="8"/><text x="10" y="19" id="heat-stage-tip-heat"></text><text x="10" y="39" id="heat-stage-tip-rise"></text></g>`;
    pointsKey='';
  }
  const {left,right,top,bottom,maximum}=geometry,x=q=>left+q/maximum*(right-left),y=r=>bottom-r/(maximum/100)*(bottom-top);
  const heat=example?target:state.waterCalories,rise=example?target/100:state.rise;
  const line=get('heat-stage-line');line.setAttribute('d',`M${left} ${bottom}L${x(heat)} ${y(rise)}`);line.classList.toggle('is-example',example);
  const values=example?samples:records.map(r=>r.waterCalories),key=String(example)+'/'+values.join(',');
  if(key!==pointsKey){
    pointsKey=key;get('heat-stage-points').innerHTML=values.map(q=>`<circle cx="${x(q)}" cy="${y(q/100)}" r="3.5" data-heat="${q}" data-rise="${q/100}" class="${example?'is-example':''}"/>`).join('');
  }
  for(const id of ['heat-stage-live','heat-stage-halo']){
    const node=get(id);node.style.display=example?'none':'';node.setAttribute('cx',x(state.waterCalories));node.setAttribute('cy',y(state.rise));
    node.dataset.heat=String(state.waterCalories);node.dataset.rise=String(state.rise);
  }
  const tip=get('heat-stage-tooltip'),tipWidth=Math.min(180,right-left-8);tip.style.display=example?'none':'';
  tip.querySelector('rect').setAttribute('width',tipWidth);
  tip.setAttribute('transform',`translate(${Math.max(left+4,Math.min(right-tipWidth,x(state.waterCalories)-110))} ${Math.max(top+4,y(state.rise)-63)})`);
  get('heat-stage-tip-heat').textContent=`已吸收 ${number(state.waterCalories)} cal`;
  get('heat-stage-tip-rise').textContent=`溫升 ${state.rise.toFixed(1)}°C`;
  svg.dataset.mode=example?'example':'observation';svg.dataset.maximum=String(maximum);
  svg.setAttribute('aria-label',example?`推算示例，非本次觀察：100g水吸收${number(target)}cal，預期溫升${(target/100).toFixed(1)}°C。`:`本次觀察：水吸收${number(state.waterCalories)}cal，水溫${state.temperature.toFixed(1)}°C，從20°C升高${state.rise.toFixed(1)}°C；亮點只走到目前進度。`);
}

function render(){
  const state=observation(),example=exampleMode();
  root.dataset.playing=String(playing);root.dataset.records=String(records.length);root.dataset.target=String(target);
  root.dataset.waterCalories=String(state.waterCalories);root.dataset.temperature=String(state.temperature);root.dataset.rise=String(state.rise);
  input.disabled=!ready||playing;play.disabled=heater.disabled=!ready||playing||!inputValid;
  const label=state.complete?'重新觀察':elapsed>0?'繼續加熱':'開始加熱';
  play.textContent=playing?'加熱中…':label;heater.title=playing?'加熱中':label;heater.setAttribute('aria-label',label+'，連續觀察水吸收熱量與升溫');
  get('heat-stage-meter').textContent=get('heat-stage-temperature').textContent=state.temperature.toFixed(1);
  get('heat-stage-energy').textContent=number(state.waterCalories);get('heat-stage-rise').textContent=state.rise.toFixed(1);
  get('heat-stage-mode').textContent=example?'推算示例・非本次觀察':'本次觀察';
  get('heat-stage-mode').classList.toggle('is-example',example);
  get('heat-stage-graph-note').textContent=example?'未操作也可先看示例；開始後，改畫本次的加熱進度。':'橘色亮點跟著加熱前進，沿途留下觀察點。';
  const data=example?samples.map(sampleAt):records,key=String(example)+'/'+data.map(r=>r.waterCalories).join(',');
  if(key!==rowsKey){
    rowsKey=key;const body=get('heat-stage-records');body.replaceChildren();
    for(const r of data){const row=document.createElement('tr');[number(r.waterCalories)+' cal',r.temperature.toFixed(1)+'°C',r.rise.toFixed(1)+'°C'].forEach((value,i)=>{const cell=document.createElement(i?'td':'th');if(!i)cell.scope='row';cell.textContent=value;row.append(cell);});body.append(row);}
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
  playing=true;root.dataset.phase='running';last=performance.now();status.textContent='水溫、吸熱量與亮點同步更新；到目標熱量時停熱。';render();frame=requestAnimationFrame(tick);
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
