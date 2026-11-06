import {bottleReading,BOTTLE_COMPARISON} from './application-model.mjs?v=applications-1';

const root=document.getElementById('application-lab');
const get=id=>document.getElementById(id);
const views={bottle:get('application-bottle'),coast:get('application-coast'),pan:get('application-pan')};
const images={bottle:get('bottle-photo'),coast:get('coast-photo'),pan:get('pan-photo')};
const sources={bottle:'application-bottle.webp',day:'application-coast-day.webp',night:'application-coast-night.webp',pan:'application-pan.webp'};
const questions={bottle:'同樣降溫，為什麼水適合拿來保暖？',coast:'海水和陸地，溫度變化一樣嗎？',pan:'鍋身升溫，就等於食物熟得快嗎？'};
const assets={bottle:{phase:'loading',attempt:0},coast:{phase:'loading',attempt:0},pan:{phase:'loading',attempt:0}};
const play=get('bottle-play'),seen=new Set(),reduced=matchMedia('(prefers-reduced-motion: reduce)');
let current='bottle',mode='day',progress=0,active=false,frame=0,last=0;

function renderBottle(){
  const state=bottleReading(progress),complete=progress>=1,ready=assets.bottle.phase==='ready';
  views.bottle.dataset.phase=ready?(complete?'complete':active?'running':progress?'interrupted':'ready'):assets.bottle.phase;
  views.bottle.dataset.playing=String(active);
  get('bottle-temperature').textContent=state.temperature.toFixed(1);
  get('bottle-drop').textContent=state.drop.toFixed(1);
  get('bottle-energy').textContent=Math.floor(state.heat+1e-8).toLocaleString('zh-TW');
  play.disabled=!ready||active;
  play.textContent=active?'觀察中…':progress?'重新觀察':'觀察放熱';
  get('bottle-discovery').hidden=get('bottle-conclusion').hidden=!complete;
  const arrows=root.querySelector('.bottle-arrows');
  arrows.toggleAttribute('hidden',!ready||!progress);
  arrows.style.opacity=active&&!reduced.matches?String(.65+.25*Math.sin(progress*30)):'.9';
  root.querySelector('.bottle-heat-label').hidden=!ready||!progress;
  get('bottle-water-bar').style.width='100%';
  get('bottle-aluminum-bar').style.width=`${BOTTLE_COMPARISON.aluminum/BOTTLE_COMPARISON.water*100}%`;
}

function cancel(){active=false;cancelAnimationFrame(frame);frame=0;}
function interrupt(){
  if(!active)return;
  cancel();renderBottle();
  get('bottle-status').textContent='觀察已停止，讀值保留；點「重新觀察」會從50°C開始。';
}
function tick(now){
  frame=0;
  if(!active)return;
  progress=Math.min(1,progress+Math.max(0,Math.min(100,now-last))/6000);last=now;
  if(progress>=1)active=false;
  renderBottle();
  if(active)frame=requestAnimationFrame(tick);
  else get('bottle-status').textContent='觀察完成，保留本次讀值。用下方公式解釋。';
}
function start(){
  if(assets.bottle.phase!=='ready'||active||current!=='bottle')return;
  progress=0;active=true;last=performance.now();renderBottle();
  get('bottle-status').textContent='水溫下降，同步累計放出熱量；動畫不是實際冷卻時間。';
  frame=requestAnimationFrame(tick);
}

function renderAsset(key){
  const asset=assets[key],view=views[key],message=view.querySelector('[data-life-loading]');
  message.hidden=asset.phase==='ready';
  message.textContent=asset.phase==='error'?'場景未能載入，請點「重新載入場景」。':'正在準備生活場景…';
  view.querySelector('[data-life-retry]').hidden=asset.phase!=='error';
  view.setAttribute('aria-busy',String(asset.phase==='loading'));
  if(key==='bottle')renderBottle();
  else{
    view.dataset.phase=asset.phase;
    if(key==='pan')view.querySelectorAll('[data-pan-part]').forEach(b=>b.disabled=asset.phase!=='ready');
    if(key==='coast')view.querySelector('.coast-arrows').style.visibility=asset.phase==='ready'?'visible':'hidden';
  }
}
async function loadAsset(key,retry=false){
  const asset=assets[key],attempt=++asset.attempt;
  asset.phase='loading';renderAsset(key);
  if(retry){const source=key==='coast'?sources[mode]:sources[key];images[key].src=new URL(`${source}?retry=${attempt}`,import.meta.url).href;}
  try{
    await images[key].decode();
    if(attempt!==asset.attempt)return;
    asset.phase='ready';renderAsset(key);
    if(key==='bottle'&&!active)get('bottle-status').textContent=progress>=1?'觀察完成，保留本次讀值。':progress?'讀值保留；點「重新觀察」會從50°C開始。':'點「觀察放熱」，看水溫與放出熱量的變化。';
  }catch{
    if(attempt!==asset.attempt)return;
    asset.phase='error';renderAsset(key);
    if(key==='bottle')get('bottle-status').textContent='水袋場景尚未就緒，重新載入後可開始。';
  }
}

function selectApplication(key){
  if(!(key in views))return;
  if(current!==key)interrupt();
  current=key;root.dataset.scene=key;get('application-question').textContent=questions[key];
  Object.entries(views).forEach(([name,view])=>view.hidden=name!==key);
  root.querySelectorAll('.life-tabs [data-application]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.application===key)));
  if(assets[key].phase!=='ready')loadAsset(key);
}

function selectCoast(next){
  if(!['day','night'].includes(next)||next===mode)return;
  mode=next;
  const day=mode==='day';
  views.coast.dataset.mode=mode;
  root.querySelectorAll('[data-coast-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.coastMode===mode)));
  images.coast.src=new URL(sources[mode],import.meta.url).href;
  images.coast.alt=`AI生成的海岸${day?'白天':'夜晚'}情境，海水在左、砂土在右。`;
  get('coast-condition').textContent=`相同質量、${day?'吸收':'放出'}相同熱量`;
  root.querySelector('.coast-scene-label').textContent=day?'白天吸熱':'夜晚放熱';
  get('coast-water-caption').textContent=day?'溫升較小':'降溫較小';
  get('coast-sand-caption').textContent=day?'溫升較大':'降溫較大';
  const water=day?105:145,sand=day?60:190;
  for(const [name,y]of [['water',water],['sand',sand]]){
    get('coast-'+name+'-level').setAttribute('y',y);
    get('coast-'+name+'-level').setAttribute('height',230-y);
  }
  const paths=day?['M230 260V400','M850 300V440']:['M230 400V260','M850 440V300'];
  root.querySelectorAll('[data-coast-arrow]').forEach((path,i)=>path.setAttribute('d',paths[i%2]));
  get('coast-conclusion').textContent=day?'水的比熱較大，吸收相同熱量時，溫升較小。':'水的比熱較大，放出相同熱量時，降溫較小。';
  get('coast-model').setAttribute('aria-label',`兩者初溫相同，${day?'吸收':'放出'}相同熱量後，水${day?'溫升':'降溫'}較小、砂土${day?'溫升':'降溫'}較大。`);
  loadAsset('coast');
}

function selectPan(part){
  if(!['body','base'].includes(part)||assets.pan.phase!=='ready')return;
  seen.add(part);
  views.pan.dataset.part=part;
  root.querySelectorAll('[data-pan-part]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.panPart===part)));
  root.querySelectorAll('[data-pan-card]').forEach(card=>card.dataset.selected=String(card.dataset.panCard===part));
  get('pan-body-highlight').setAttribute('opacity',part==='body'?'.3':'0');
  get('pan-base-highlight').setAttribute('opacity',part==='base'?'1':'0');
  get('pan-focus-text').textContent=part==='body'?'看鍋身：同質量、吸收相同熱量，比熱較小的物質升溫較多。':'看鍋底：熱穿過金屬是導熱；導熱能力與比熱是不同性質。';
  get('pan-discovery').hidden=seen.size<2;
}

play.addEventListener('click',start);
root.querySelectorAll('.life-tabs [data-application]').forEach(b=>b.addEventListener('click',()=>selectApplication(b.dataset.application)));
root.querySelectorAll('[data-coast-mode]').forEach(b=>b.addEventListener('click',()=>selectCoast(b.dataset.coastMode)));
root.querySelectorAll('[data-pan-part]').forEach(b=>b.addEventListener('click',()=>selectPan(b.dataset.panPart)));
Object.entries(views).forEach(([key,view])=>view.querySelector('[data-life-retry]').addEventListener('click',()=>loadAsset(key,true)));
window.addEventListener('blur',interrupt);
document.addEventListener('visibilitychange',()=>{if(document.hidden)interrupt();});
document.querySelector('.route').addEventListener('click',e=>{const link=e.target.closest('a');if(link&&link.hash!=='#card-05'&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey)interrupt();});
loadAsset('bottle');
