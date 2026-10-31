import {CO2_DURATIONS,co2Frame} from './co2-model.mjs?v=steps-1';
const root=document.querySelector('.co2-preparation');
const tabs=[...root.querySelectorAll('[data-co2-step]')];
const panels=[...root.querySelectorAll('[data-co2-panel]')];
const play=root.querySelector('[data-play]'),previous=root.querySelector('[data-previous]'),next=root.querySelector('[data-next]');
const status=root.querySelector('[role=status]');
const materials=[...root.querySelectorAll('[data-co2-material]')],infos=[...root.querySelectorAll('[data-co2-info]')];
let stage=0,elapsed=0,state='ready',started=0,frame=0,selected='marble',message='';
const cancel=()=>{cancelAnimationFrame(frame);frame=0;};
function showMaterial(key){
  selected=key;root.dataset.material=key;
  materials.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.co2Material===key)));
  infos.forEach(p=>{p.hidden=p.dataset.co2Info!==key;});
}
function render(){
  const f=co2Frame(stage,elapsed);
  for(const [key,value]of Object.entries(f))root.dataset[key]=typeof value==='number'?value.toFixed(4):String(value);
  if(stage===0){
    if(state==='playing')showMaterial(materials[Math.min(5,Math.floor(elapsed/800))].dataset.co2Material);
    return `正在認識${infos.find(p=>p.dataset.co2Info===selected).querySelector('h4').textContent}；點選物品或名稱可換介紹。`;
  }
  const panel=panels[stage],$=name=>panel.querySelector(`[data-co2-part="${name}"]`);
  const opacity=(name,value)=>$(name).setAttribute('opacity',String(value));
  const tube=`M300 245V145Q300 120 325 120H${f.tipX-25}Q${f.tipX} 120 ${f.tipX} 145V${f.tipY}`;
  for(const name of ['tube','tube-shine','flow'])$(name).setAttribute('d',tube);
  // Assembly: the connected stopper and outlet are initially beside the open flask.
  for(const name of ['stopper','tube','tube-shine','flow'])$(name).setAttribute('transform',`translate(${-120*(1-f.seal)} ${-55*(1-f.seal)})`);
  const liquidY=572-75*f.acid;
  $('liquid').setAttribute('y',liquidY);$('liquid').setAttribute('height',590-liquidY);opacity('liquid',f.acid>0?.35:0);
  $('meniscus').setAttribute('cy',liquidY);opacity('meniscus',f.acid>0?.6:0);
  $('marble').setAttribute('opacity',String(f.marble));
  $('marble').setAttribute('transform',`translate(300 575) scale(1 ${.5+.5*f.marble}) translate(-300 -575)`);
  opacity('bubbles',f.reacting?1:0);
  $('bubbles').querySelectorAll('circle').forEach((b,i)=>{const p=(f.time/1100+i*.17)%1;b.setAttribute('cy',String(558-p*Math.max(0,558-liquidY-9)));});
  opacity('flow',f.flow?1:0);$('flow').style.strokeDashoffset=String(-f.time/35);
  opacity('air-out',f.collecting?1:0);
  $('air-out').setAttribute('transform',`translate(0 ${-12*((f.time%1200)/1200)})`);
  opacity('plate',stage===4?1:0);$('plate').setAttribute('transform',`translate(${(1-f.cover)*230} ${-30*(1-f.cover)})`);
  opacity('sample-label',f.labeled?1:0);
  if(stage===1){
    const pouringMarble=f.phase===1&&f.marble<1,pouringAcid=f.phase===2&&f.acid<1;
    opacity('marble-dish',pouringMarble?1:0);opacity('falling-marble',pouringMarble?1:0);
    $('falling-marble').querySelectorAll('path').forEach((p,i)=>p.setAttribute('transform',`translate(${300+Math.sin(i*3)*12} ${200+((f.time/1000+i*.27)%1)*355}) rotate(${i*33})`));
    opacity('acid-bottle',pouringAcid?1:0);opacity('acid-stream',pouringAcid?1:0);
    $('acid-stream').setAttribute('d',`M300 190Q296 235 300 265V${liquidY}`);
    panel.querySelectorAll('[data-co2-phase]').forEach((item,i)=>{item.classList.toggle('is-current',i===f.phase);if(i===f.phase)item.setAttribute('aria-current','true');else item.removeAttribute('aria-current');});
  }
  const notes=stage===1?['先擺好錐形瓶與直立集氣瓶；導管出口暫留瓶外','將大理石放入錐形瓶','加入稀鹽酸，接觸大理石後開始產氣','塞好連接導管的塞子，氣體由瓶外出口送出'][f.phase]
    :stage===2?'導管口在集氣瓶外，先排出裝置原有空氣與起始混合氣'
    :stage===3?(f.insert<1?'將導管移至直立集氣瓶底部附近':'氣體由瓶底附近進入，原有空氣由瓶口向上離開')
    :f.labeled?'已撤管並蓋上玻璃片，標示二氧化碳樣本，瓶口朝上':f.insert>0?'先將導管向上移出集氣瓶':f.cover<1?'導管已移出，再用玻璃片蓋住瓶口':'蓋好後標示二氧化碳樣本';
  panel.querySelector('[data-co2-note]').textContent=notes;
  panel.querySelector('title').textContent=notes;
  if(stage===1){panel.querySelector('.co2-closeup svg').setAttribute('viewBox',f.phase===0?'540 130 520 480':'120 80 410 530');}
  return notes+'。';
}
function paint(){
  root.dataset.stage=String(stage);root.dataset.state=state;
  const text=(state==='paused'?'已暫停：':'')+render()+(state==='complete'?'這一步已播完。':'');
  if(text!==message){status.textContent=text;message=text;}
  play.textContent=state==='playing'?'暫停動畫':state==='paused'?'繼續播放':stage===0?'導覽材料':'重播這一步';
  previous.disabled=stage===0;root.querySelector('[data-co2-count]').textContent=`${stage+1} / ${tabs.length}`;
  next.textContent=stage===4?'接著比較氣體性質 →':'下一步 →';
}
function tick(now){
  if(state!=='playing')return;
  elapsed=Math.min(CO2_DURATIONS[stage],now-started);
  if(elapsed===CO2_DURATIONS[stage])state='complete';
  paint();if(state==='playing')frame=requestAnimationFrame(tick);
}
function pause(){
  if(state!=='playing')return;
  elapsed=Math.min(CO2_DURATIONS[stage],performance.now()-started);cancel();state='paused';paint();
}
function start(){
  document.dispatchEvent(new CustomEvent('air-experiment-play',{detail:'co2'}));cancel();
  if(state!=='paused')elapsed=0;
  state='playing';started=performance.now()-elapsed;paint();frame=requestAnimationFrame(tick);
}
function select(index,focusHeading=false){
  cancel();stage=index;elapsed=0;state='ready';
  const oldFocus=document.activeElement;
  panels.forEach((p,i)=>{p.hidden=i!==stage;});
  tabs.forEach((tab,i)=>{tab.setAttribute('aria-selected',String(i===stage));tab.tabIndex=i===stage?0:-1;});
  paint();
  if(focusHeading){const h=panels[stage].querySelector('h3');h.focus({preventScroll:true});h.scrollIntoView({behavior:'instant',block:'start'});}
  else if(oldFocus?.closest('[hidden]'))tabs[stage].focus();
  if(stage>0)start();
}
root.querySelector('.co2-steps').setAttribute('role','tablist');
tabs.forEach((tab,i)=>{
  tab.disabled=false;tab.setAttribute('role','tab');tab.setAttribute('aria-controls',panels[i].id);
  panels[i].setAttribute('role','tabpanel');panels[i].setAttribute('aria-labelledby',tab.id);panels[i].querySelector('h3').tabIndex=-1;
  tab.addEventListener('click',()=>select(i));
  tab.addEventListener('keydown',e=>{let j;if(e.key==='ArrowRight')j=(i+1)%5;else if(e.key==='ArrowLeft')j=(i+4)%5;else if(e.key==='Home')j=0;else if(e.key==='End')j=4;if(j!==undefined){e.preventDefault();select(j);tabs[j].focus();}});
});
materials.forEach(b=>{b.disabled=false;b.addEventListener('click',()=>{
  cancel();elapsed=0;state='ready';showMaterial(b.dataset.co2Material);paint();
  const info=root.querySelector('.co2-material-details'),bounds=info.getBoundingClientRect();
  if(bounds.bottom>innerHeight||bounds.top<0)info.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'nearest'});
});});
root.querySelector('.co2-material-details').setAttribute('aria-live','polite');
root.querySelector('.co2-material-details').setAttribute('aria-atomic','true');
play.disabled=false;next.disabled=false;
play.addEventListener('click',()=>state==='playing'?pause():start());
previous.addEventListener('click',()=>{if(stage>0)select(stage-1,true);});
next.addEventListener('click',()=>{if(stage<4)select(stage+1,true);else{pause();const h=document.querySelector('#title-5');h.tabIndex=-1;h.focus({preventScroll:true});h.scrollIntoView({behavior:'instant',block:'start'});}});
root.addEventListener('keydown',e=>{if(e.key==='Escape')pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
window.addEventListener('pagehide',pause);
document.addEventListener('air-experiment-play',e=>{if(e.detail!=='co2')pause();});
new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)pause();}).observe(root);
showMaterial(selected);select(0);root.dataset.ready='true';
