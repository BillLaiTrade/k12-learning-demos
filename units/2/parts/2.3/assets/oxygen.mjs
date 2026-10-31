import { STEP_DURATIONS, preparationStepFrame, assemblyFrame } from './oxygen-model.mjs?v=assembly-6';
const section = document.querySelector('.oxygen-lesson');
const panel = section.querySelector('.oxygen-preparation');
const steps = [...panel.querySelectorAll('.oxygen-steps [data-stage]')];
const panels = [...panel.querySelectorAll('[data-step-panel]')];
const players = [];

const materialButtons=[...panels[0].querySelectorAll('[data-material]')];
const materialInfo=[...panels[0].querySelectorAll('[data-material-info]')];
const materialDetails=panels[0].querySelector('[data-material-details]');
let selectedMaterial='source', materialInitialized=false;
function showMaterial(key) {
  if(!materialButtons.some(button=>button.dataset.material===key))return;
  if(materialInitialized&&selectedMaterial===key)return;
  selectedMaterial=key;materialInitialized=true;
  panels[0].dataset.materialCurrent=key;
  materialButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.material===key)));
  materialInfo.forEach(info=>{info.hidden=info.dataset.materialInfo!==key;});
}

function renderPreparation(stage, elapsed, state) {
  const f = preparationStepFrame(stage, elapsed);
  const view = panels[stage];
  panel.dataset.collected = f.collected.toFixed(4);
  panel.dataset.tipX = (800+235*f.tube).toFixed(3);
  panel.dataset.cover = f.cover.toFixed(4);
  if (stage === 0) {
    if(state==='playing')showMaterial(['source','catalyst','jar'][f.material]);
    const name=materialInfo.find(info=>info.dataset.materialInfo===selectedMaterial).querySelector('h4').textContent;
    return state==='ready' ? `正在認識${name}；可點選其他物品，或按下一步。` : f.material===0 ? '雙氧水是製備氧氣的來源。' : f.material===1 ? '二氧化錳加快雙氧水分解，不是氧氣來源。' : '集氣瓶先裝滿水，倒置在水中；準備好後按下一步。';
  }
  if (stage === 1) return renderAssembly(elapsed, state, view);
  const $ = part => view.querySelector(`[data-part="${part}"]`);
  const opacity = (part, value) => $(part).setAttribute('opacity', String(value));
  const waterY = 280+f.collected*400;
  $('jar-water').setAttribute('y', waterY);
  $('jar-water').setAttribute('height', 680-waterY);
  $('water-line').setAttribute('cy', waterY);
  opacity('water-line', f.collected<1 ? 1 : 0);
  const reacting = f.purging || f.collecting;
  opacity('reaction-bubbles',reacting ? 1 : 0);
  opacity('purge-bubbles',f.purging ? 1 : 0);
  // Bubbles stay below the internal water surface and above the submerged tip.
  // None are drawn in the colorless gas space after the water has left.
  const liquidRoom = 665-waterY-10;
  opacity('collection-bubbles',f.collecting && liquidRoom>12 ? 1 : 0);
  $('collection-bubbles').querySelectorAll('circle').forEach((bubble,i)=>{
    const phase=(f.time/1000+i*.27)%1, r=Number(bubble.getAttribute('r'));
    bubble.setAttribute('cx',1035+Math.sin(i*2+phase*4)*13);
    bubble.setAttribute('cy',Math.max(waterY+r+3,665-phase*Math.max(0,liquidRoom-r)));
  });
  $('purge-bubbles').querySelectorAll('circle').forEach((bubble,i)=>{
    const phase=(f.time/1150+i*.33)%1;
    bubble.setAttribute('cx',800+Math.sin(phase*5+i)*8);
    bubble.setAttribute('cy',657-phase*90);
  });
  opacity('water-out',f.collecting ? 1 : 0);
  opacity('water-label',f.collecting ? 1 : 0);
  $('cover').setAttribute('transform',`translate(${(1-f.cover)*290} 0)`);
  opacity('cover',stage===4 ? 1 : 0);
  opacity('gas-label',f.collected>.3 ? 1 : 0);
  opacity('full-label',stage===2 ? 1 : 0);
  opacity('flow',reacting ? 1 : 0);
  const x=800+235*f.tube;
  const tube=`M315 275V200Q315 180 335 180H700Q720 180 720 200V710Q720 730 740 730H${x-20}Q${x} 730 ${x} 710V665`;
  for (const part of ['delivery-tube','tube-highlight','flow']) $(part).setAttribute('d',tube);
  $('reaction-bubbles').setAttribute('transform',`translate(0 ${-((f.time%900)/900)*30})`);
  $('flow').style.strokeDashoffset=String(-f.time/35);
  const note = stage===2 ? '導管口在瓶外的水中，開始的混合氣不收集' : stage===3 ? (f.tube<1 ? '先將導管移入瓶口下方' : f.collected<1 ? '氧氣進入，瓶內水位下降' : '瓶內水已排出，氧氣已收集') : f.covered ? '導管已移開，玻璃片在水下蓋好' : f.tube>0 ? '先移開導管，瓶口保持在水下' : '再滑入玻璃片，在水下蓋住瓶口';
  view.querySelector('[data-scene-note]').textContent=note;
  view.querySelector('title').textContent=note;
  return note + (state==='complete' ? '。這一步已播完，可重播或繼續下一步。' : '。');
}

function renderAssembly(elapsed, state, view) {
  const f=assemblyFrame(elapsed), $=part=>view.querySelector(`[data-part="${part}"]`);
  const opacity=(part,value)=>$(part).setAttribute('opacity',String(value));
  panel.dataset.assemblyPhase=String(f.phase);
  panel.dataset.peroxide=f.peroxide.toFixed(4);panel.dataset.catalyst=f.catalyst.toFixed(4);panel.dataset.sealed=f.sealed.toFixed(4);
  $('assembly-flask-label').textContent=f.peroxide===0?'錐形瓶（空）':f.catalyst===0?'雙氧水（無色溶液）':'雙氧水＋二氧化錳';
  const liquidY=790-165*f.peroxide;
  $('peroxide-liquid').setAttribute('y',liquidY);$('peroxide-liquid').setAttribute('height',805-liquidY);
  $('peroxide-meniscus').setAttribute('cy',liquidY);opacity('peroxide-meniscus',f.peroxide>0?1:0);
  opacity('peroxide-liquid',f.peroxide>0?1:0);
  $('settled-catalyst').setAttribute('transform',`translate(310 790) scale(${.3+.7*f.catalyst} ${f.catalyst}) translate(-310 -790)`);
  opacity('settled-catalyst',f.catalyst);opacity('mixed-flask',f.mixed);
  opacity('reagent-bottle',f.bottle);
  $('reagent-bottle').setAttribute('transform',`translate(${530-215*f.bottleTilt} ${150+75*f.bottleTilt}) rotate(${-125*f.bottleTilt})`);
  const stream=`M315 225Q310 245 315 265V${liquidY}`;
  for(const part of ['peroxide-stream','peroxide-highlight']){$(part).setAttribute('d',stream);opacity(part,f.liquidFlow);}
  opacity('catalyst-spoon',f.spoon);$('catalyst-spoon').setAttribute('transform',`translate(315 225) rotate(${-18*f.catalyst})`);
  opacity('falling-catalyst',f.powderFlow);
  $('falling-catalyst').querySelectorAll('[data-grain]').forEach((grain,i)=>{
    const phase=(f.time/1100+i*.11)%1;
    grain.setAttribute('transform',`translate(${315+Math.sin(i*2+phase*3)*9} ${230+phase*390}) rotate(${i*37+phase*90})`);
  });
  const capX=130+185*f.sealed;
  $('stopper').setAttribute('transform',`translate(${capX-315} ${-25*(1-f.sealed)})`);
  const tube=`M${capX} ${275-25*(1-f.sealed)}V200Q${capX} 180 ${capX+20} 180H700Q720 180 720 200V710Q720 730 740 730H780Q800 730 800 710V665`;
  for(const part of ['delivery-tube','tube-highlight','flow'])$(part).setAttribute('d',tube);
  opacity('reaction-bubbles',f.reaction);
  $('reaction-bubbles').setAttribute('transform',`translate(0 ${-((f.time%900)/900)*30})`);
  opacity('purge-bubbles',f.gasThroughTube?1:0);opacity('flow',f.gasThroughTube?1:0);
  $('purge-bubbles').querySelectorAll('circle').forEach((b,i)=>{const phase=(f.time/1150+i*.33)%1;b.setAttribute('cx',800+Math.sin(phase*5+i)*8);b.setAttribute('cy',657-phase*90);});
  $('flow').style.strokeDashoffset=String(-f.time/35);
  opacity('assembly-jar-focus',f.phase===0?1:0);
  view.querySelectorAll('[data-assembly-phase]').forEach((item,i)=>{item.classList.toggle('is-current',i===f.phase);if(i===f.phase)item.setAttribute('aria-current','true');else item.removeAttribute('aria-current');});
  const notes=['集氣瓶裝滿水、倒置水中；導管出口先放在瓶外的水中','把雙氧水倒入錐形瓶','用藥匙加入少量二氧化錳，讓雙氧水更快分解','塞緊已連接導管的塞子，氣體從瓶外水中的出口送出'];
  const note=state==='complete'?'材料已加入、塞子與導管接好；下一步先排空氣':notes[f.phase];
  view.querySelector('[data-scene-note]').textContent=note;view.querySelector('title').textContent=note;
  view.querySelector('.oxygen-mobile-zoom svg').setAttribute('viewBox',f.phase===0?'760 235 510 495':'100 30 550 805');
  view.querySelector('[data-assembly-zoom-label]').textContent=f.phase===0?'集氣位置近看':'加入材料與瓶口近看';
  return note+'。';
}

function createPreparationPlayer() {
  const play=panel.querySelector('[data-play]');
  const previous=panel.querySelector('[data-previous]');
  const next=panel.querySelector('[data-next]');
  const status=panel.querySelector('[role=status]');
  const count=panel.querySelector('.oxygen-step-count');
  let stage=0, elapsed=0, state='ready', started=0, frame=0, message='';
  function cancel(){cancelAnimationFrame(frame);frame=0;}
  function paint(){
    panel.dataset.stage=String(stage);panel.dataset.state=state;
    const text=(state==='paused'?'已暫停：':'')+renderPreparation(stage,elapsed,state);
    if(message!==text){status.textContent=text;message=text;}
    play.textContent=state==='playing'?'暫停動畫':state==='paused'?'繼續播放':stage===0?'看看準備':'重播這一步';
    previous.disabled=stage===0;
    count.textContent=`${stage+1} / ${steps.length}`;
    next.innerHTML=stage===steps.length-1?'接著製備二氧化碳 <span aria-hidden="true">›</span>':'下一步 <span aria-hidden="true">›</span>';
  }
  function tick(now){
    if(state!=='playing')return;
    elapsed=Math.min(STEP_DURATIONS[stage],now-started);
    if(elapsed>=STEP_DURATIONS[stage])state='complete';
    paint();if(state==='playing')frame=requestAnimationFrame(tick);
  }
  function pausePlayback(){
    if(state!=='playing')return;
    elapsed=Math.min(STEP_DURATIONS[stage],performance.now()-started);
    cancel();state='paused';paint();
  }
  function start(){
    const at=state==='paused'?elapsed:0;
    document.dispatchEvent(new CustomEvent('air-experiment-play',{detail:'oxygen'}));
    players.forEach(p=>p.pausePlayback());cancel();
    elapsed=at;state='playing';started=performance.now()-elapsed;paint();
    frame=requestAnimationFrame(tick);
  }
  function select(index,focusContent=false){
    players.forEach(p=>p.pausePlayback());cancel();
    stage=index;elapsed=0;state='ready';
    panels.forEach((view,i)=>{view.hidden=i!==stage;});
    steps.forEach((tab,i)=>{
      const selected=i===stage;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;
      tab.classList.toggle('is-current',selected);
      if(selected)tab.setAttribute('aria-current','step');else tab.removeAttribute('aria-current');
    });
    paint();
    if(focusContent){const heading=panels[stage].querySelector('h3');heading.focus({preventScroll:true});heading.scrollIntoView({behavior:'instant',block:'start'});}
    if(stage>0)start();
  }
  panel.querySelector('.oxygen-steps').setAttribute('role','tablist');
  steps.forEach((tab,i)=>{
    tab.disabled=false;tab.setAttribute('role','tab');tab.setAttribute('aria-controls',panels[i].id);
    panels[i].setAttribute('role','tabpanel');panels[i].setAttribute('aria-labelledby',tab.id);panels[i].tabIndex=0;
    panels[i].querySelector('h3').tabIndex=-1;
    tab.addEventListener('click',()=>select(i));
    tab.addEventListener('keydown',event=>{
      let target;
      if(event.key==='ArrowRight')target=(i+1)%steps.length;else if(event.key==='ArrowLeft')target=(i+steps.length-1)%steps.length;
      else if(event.key==='Home')target=0;else if(event.key==='End')target=steps.length-1;
      if(target!==undefined){event.preventDefault();select(target);steps[target].focus();}
    });
  });
  materialButtons.forEach(button=>{
    button.disabled=false;
    button.addEventListener('click',()=>{
      cancel();elapsed=0;state='ready';
      showMaterial(button.dataset.material);paint();
      const bounds=materialDetails.getBoundingClientRect();
      if(bounds.bottom>innerHeight||bounds.top<0)materialDetails.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'nearest'});
    });
  });
  showMaterial(selectedMaterial);
  materialDetails.setAttribute('aria-live','polite');materialDetails.setAttribute('aria-atomic','true');
  play.addEventListener('click',()=>state==='playing'?pausePlayback():start());
  previous.addEventListener('click',()=>{if(stage>0)select(stage-1,true);});
  next.addEventListener('click',()=>{
    if(stage<steps.length-1)select(stage+1,true);
    else {pausePlayback();const heading=document.querySelector('#title-4');heading.tabIndex=-1;heading.focus({preventScroll:true});heading.scrollIntoView({behavior:'instant',block:'start'});}
  });
  panel.addEventListener('keydown',event=>{if(event.key==='Escape')pausePlayback();});
  if('IntersectionObserver' in window)new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)pausePlayback();}).observe(panel);
  const api={pausePlayback};players.push(api);
  play.disabled=false;next.disabled=false;select(0);panel.dataset.ready='true';return api;
}
createPreparationPlayer();
document.addEventListener('visibilitychange',()=>{if(document.hidden)players.forEach(p=>p.pausePlayback());});
window.addEventListener('pagehide',()=>players.forEach(p=>p.pausePlayback()));
section.dataset.renderer='step-material-svg';

document.addEventListener('air-experiment-play',event=>{if(event.detail!=='oxygen')players.forEach(p=>p.pausePlayback());});
