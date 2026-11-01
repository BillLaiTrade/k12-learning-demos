import { createEquipmentExplorer } from './oxygen-equipment.mjs?v=material-dialog-14';
import { OXYGEN_OPERATIONS, oxygenOperationFrame, assemblyFrame } from './oxygen-model.mjs?v=operations-12';
const section = document.querySelector('.oxygen-lesson');
const panel = section.querySelector('.oxygen-preparation');
const steps = [...panel.querySelectorAll('.oxygen-steps [data-stage]')];
const panels = [...panel.querySelectorAll('[data-step-panel]')];
const players = [];

const materialButtons=[...panels[0].querySelectorAll('[data-material]')];
const materialInfo=[...panels[0].querySelectorAll('[data-material-info]')];
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
  const f = oxygenOperationFrame(stage, elapsed);
  const scene=f.scene;
  const view = panels[stage];
  panel.dataset.collected = f.collected.toFixed(4);
  panel.dataset.tipX = (800+235*f.tube).toFixed(3);
  panel.dataset.cover = f.cover.toFixed(4);
  if (scene === 0) {
    const name=materialInfo.find(info=>info.dataset.materialInfo===selectedMaterial).querySelector('h4').textContent;
    return `正在認識${name}；可點選其他物品，或接著擺好集氣位置。`;
  }
  if (scene === 1) return renderAssembly(f.sceneTime, state, view, stage-1);
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
  opacity('cover',scene===4 ? 1 : 0);
  opacity('gas-label',f.collected>.3 ? 1 : 0);
  opacity('full-label',scene===2 ? 1 : 0);
  opacity('flow',reacting ? 1 : 0);
  const x=800+235*f.tube;
  const tube=`M315 275V200Q315 180 335 180H700Q720 180 720 200V710Q720 730 740 730H${x-20}Q${x} 730 ${x} 710V665`;
  for (const part of ['delivery-tube','tube-highlight','flow']) $(part).setAttribute('d',tube);
  $('reaction-bubbles').setAttribute('transform',`translate(0 ${-((f.time%900)/900)*30})`);
  $('flow').style.strokeDashoffset=String(-f.time/35);
  const note = scene===2 ? '導管口在瓶外的水中，開始的混合氣不收集' : scene===3 ? (f.tube<1 ? '先將導管移入瓶口下方' : f.collected<1 ? '氧氣進入，瓶內水位下降' : '瓶內水已排出，氧氣已收集') : f.covered ? '導管已移開，玻璃片在水下蓋好' : f.tube>0 ? '先移開導管，瓶口保持在水下' : '再滑入玻璃片，在水下蓋住瓶口';
  renderObservation(view,scene,f,waterY);
  view.querySelector('[data-scene-note]').textContent=note;
  view.querySelector('title').textContent=note;
  return note + (state==='complete' ? '。這一步已播完，可重播或繼續下一步。' : '。');
}

function renderObservation(view,stage,f,waterY) {
  const movingTube=stage===3&&f.tube<1;
  const withdrawing=stage===4&&f.tube>0;
  const label=stage===2?'瓶外排氣':stage===3?(movingTube?'移入瓶口':f.collected<1?'水位下降':'集氣完成'):withdrawing?'撤開導管':f.covered?'水下蓋片':'滑入玻璃片';
  const x=stage===2?800:stage===3?(movingTube?800+235*f.tube:940):withdrawing?800+235*f.tube:940;
  const y=stage===2?600:stage===3?(movingTube?665:waterY):withdrawing?665:690;
  view.querySelector('[data-observation-label]').textContent=label;
  view.querySelector('[data-observation-leader]').setAttribute('d',`M${stage===4?950:915} ${stage===2?507:stage===3?417:457}L${x} ${y}`);
  for(const selector of ['[data-observation-point]','[data-observation-halo]']){
    const dot=view.querySelector(selector);dot.setAttribute('cx',x);dot.setAttribute('cy',y);
  }
}

function renderAssembly(elapsed, state, view, phase) {
  const f=assemblyFrame(elapsed), $=part=>view.querySelector(`[data-part="${part}"]`);
  const opacity=(part,value)=>$(part).setAttribute('opacity',String(value));
  panel.dataset.assemblyPhase=String(phase);
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
  opacity('assembly-jar-focus',phase===0?1:0);
  const notes=['集氣瓶裝滿水、倒置水中；導管出口先放在瓶外的水中','把雙氧水倒入錐形瓶','用藥匙加入少量二氧化錳，讓雙氧水更快分解','塞緊已連接導管的塞子，氣體從瓶外水中的出口送出'];
  const finished=['集氣位置已備好；導管出口先留在瓶外水中','雙氧水已倒入，接著加入少量二氧化錳','加入二氧化錳後開始產氣，接著塞好連接導管的塞子','裝置已接好，接著先排空氣，暫不收集'];
  const note=state==='complete'?finished[phase]:notes[phase];
  view.querySelector('[data-scene-note]').textContent=note;view.querySelector('title').textContent=note;
  view.querySelector('.oxygen-mobile-zoom svg').setAttribute('viewBox',phase===0?'760 235 510 495':'100 30 550 805');
  view.querySelector('[data-assembly-zoom-label]').textContent=phase===0?'集氣位置近看':'加入材料與瓶口近看';
  return note+'。';
}

function createPreparationPlayer() {
  const play=panel.querySelector('[data-play]'),next=panel.querySelector('[data-next]');
  const sequence=panel.querySelector('[data-continuous]'),sequenceStatus=panel.querySelector('[data-continuous-status]');
  const status=panel.querySelector('[role=status]'),menu=panel.querySelector('[data-step-menu]');
  const navBody=panel.querySelector('#oxygen-step-list'),nav=panel.querySelector('.oxygen-step-nav');
  let stage=0,elapsed=0,state='ready',started=0,frame=0,message='',compact,explorer,continuous=false;
  const duration=()=>OXYGEN_OPERATIONS[stage].duration;
  const clockLimit=()=>duration()+(continuous&&stage<steps.length-1?700:0);
  function setMenu(open){navBody.hidden=!open;menu.setAttribute('aria-expanded',String(open));}
  function syncLayout(){
    const narrow=panel.clientWidth<=720;
    if(narrow===compact)return;
    compact=narrow;menu.hidden=!compact;setMenu(!compact);
    nav.dataset.compact=String(compact);
    if(navBody.hidden&&navBody.contains(document.activeElement))menu.focus();
  }
  function cancel(){cancelAnimationFrame(frame);frame=0;}
  function paint(){
    panel.dataset.stage=String(stage);panel.dataset.state=state;
    panel.dataset.playMode=continuous?'continuous':'single';panel.dataset.elapsed=elapsed.toFixed(3);
    const atEnd=stage>0&&elapsed>=duration();
    let text=(state==='paused'?'已暫停：':'')+renderPreparation(stage,elapsed,atEnd?'complete':state);
    if(continuous&&state==='playing'&&atEnd&&stage<steps.length-1)text=text.replace('這一步已播完，可重播或繼續下一步。','即將接續下一個操作。');
    explorer?.sync(stage);
    if(message!==text){status.textContent=text;message=text;}
    const playing=state==='playing',paused=state==='paused';
    play.querySelector('[data-play-icon]').textContent=playing?'Ⅱ':paused?'▶':'↻';
    play.querySelector('[data-play-label]').textContent=playing?'暫停':paused?'播放':'重播';
    play.setAttribute('aria-label',playing?(continuous?'暫停連續播放':'暫停此步動畫'):paused?(continuous?'繼續連續播放':'繼續此步動畫'):'重播此步動畫');
    const replayAll=stage===steps.length-1&&state==='complete';
    const sequencePlaying=continuous&&playing,sequencePaused=continuous&&paused;
    sequence.querySelector('[data-continuous-icon]').textContent=sequencePlaying?'Ⅱ':replayAll?'↻':'▶';
    const sequenceLabel=sequencePlaying?'暫停連播':sequencePaused?'繼續連播':replayAll?'重新連播':'連續播放';
    sequence.querySelector('[data-continuous-label]').textContent=sequenceLabel;sequence.setAttribute('aria-label',sequenceLabel);
    sequence.classList.toggle('is-playing',sequencePlaying);
    sequenceStatus.textContent=sequencePlaying?'自動接續下一步，可隨時暫停。':sequencePaused?'已暫停，按繼續可接著觀看。':replayAll?'已完成氧氣收集與封存。':stage===0?'從擺好集氣位置開始連播。':state==='complete'?'接著從下一個操作連播。':'從目前操作往下連播。';
    menu.textContent=`${String(stage+1).padStart(2,'0')} ${OXYGEN_OPERATIONS[stage].label} ▾`;
    const last=stage===steps.length-1;
    next.parentElement.hidden=last;next.disabled=last;
    if(!last)next.innerHTML=`接著：${OXYGEN_OPERATIONS[stage+1].label} <span aria-hidden="true">→</span>`;
  }
  function tick(now){
    if(state!=='playing')return;
    elapsed=Math.min(clockLimit(),now-started);
    if(continuous&&stage<steps.length-1&&elapsed>=clockLimit()){select(stage+1,false,true);return;}
    if(elapsed>=duration()&&(!continuous||stage===steps.length-1))state='complete';
    paint();if(state==='playing')frame=requestAnimationFrame(tick);
  }
  function pausePlayback(){
    if(state!=='playing')return;
    elapsed=Math.min(clockLimit(),performance.now()-started);cancel();state='paused';paint();
  }
  function start(){
    if(stage===0)return;
    const at=state==='paused'?elapsed:0;
    document.dispatchEvent(new CustomEvent('air-experiment-play',{detail:'oxygen'}));
    cancel();elapsed=at;state='playing';started=performance.now()-elapsed;paint();frame=requestAnimationFrame(tick);
  }
  function select(index,focusContent=false,keepContinuous=false){
    const focused=document.activeElement,focusInScene=panels[stage].contains(focused);
    explorer?.close();cancel();continuous=keepContinuous;stage=index;elapsed=0;state='ready';
    if(stage>0)panels[stage].querySelector('.oxygen-scene-viewport').append(play);
    play.hidden=stage===0;play.disabled=stage===0;
    panels.forEach((view,i)=>{view.hidden=i!==stage;});
    steps.forEach((tab,i)=>{
      const selected=i===stage;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;
      tab.classList.toggle('is-current',selected);
      if(selected)tab.setAttribute('aria-current','step');else tab.removeAttribute('aria-current');
    });
    paint();
    if(focusContent){
      if(compact)setMenu(false);
      const heading=panels[stage].querySelector('h3');heading.focus({preventScroll:true});heading.scrollIntoView({behavior:'instant',block:'start'});
    }
    if(!focusContent&&keepContinuous&&focusInScene)(focused===play?play:sequence).focus({preventScroll:true});
    if(stage>0)start();
  }
  function toggleContinuous(){
    if(compact)setMenu(false);
    if(continuous&&state==='playing'){pausePlayback();return;}
    explorer?.close();
    if(stage===0||(stage===steps.length-1&&state==='complete')){select(1,false,true);return;}
    if(state==='complete'){select(stage+1,false,true);return;}
    if(state==='playing')pausePlayback();
    continuous=true;start();
  }
  explorer=createEquipmentExplorer({panel,panels,getStage:()=>stage,onOpen:pausePlayback});
  panel.querySelector('.oxygen-steps').setAttribute('role','tablist');
  panel.querySelector('.oxygen-steps').setAttribute('aria-orientation','vertical');
  steps.forEach((tab,i)=>{
    tab.disabled=false;tab.setAttribute('role','tab');tab.setAttribute('aria-controls',panels[i].id);
    panels[i].setAttribute('role','tabpanel');panels[i].setAttribute('aria-labelledby',tab.id);panels[i].tabIndex=0;
    panels[i].querySelector('h3').tabIndex=-1;
    tab.addEventListener('click',()=>select(i,true));
    tab.addEventListener('keydown',event=>{
      let target;
      if(['ArrowDown','ArrowRight'].includes(event.key))target=(i+1)%steps.length;
      else if(['ArrowUp','ArrowLeft'].includes(event.key))target=(i+steps.length-1)%steps.length;
      else if(event.key==='Home')target=0;else if(event.key==='End')target=steps.length-1;
      if(target!==undefined){event.preventDefault();select(target);steps[target].focus();}
    });
  });
  materialButtons.forEach(button=>{
    button.disabled=false;button.addEventListener('click',()=>{
      showMaterial(button.dataset.material);paint();
      explorer.openMaterial(button.dataset.material,button);
    });
  });
  showMaterial(selectedMaterial);
  menu.addEventListener('click',()=>setMenu(navBody.hidden));
  play.addEventListener('click',()=>{if(state==='playing')pausePlayback();else {if(state==='complete')continuous=false;start();}});
  sequence.addEventListener('click',toggleContinuous);
  next.addEventListener('click',()=>{
    if(stage<steps.length-1)select(stage+1,true);
  });
  panel.addEventListener('keydown',event=>{if(event.key==='Escape')pausePlayback();});
  if('IntersectionObserver'in window)new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)pausePlayback();}).observe(panel.querySelector('.oxygen-stage-area'));
  const api={pausePlayback};players.push(api);next.disabled=false;sequence.disabled=false;
  syncLayout();new ResizeObserver(syncLayout).observe(panel);select(0);panel.dataset.ready='true';return api;
}
createPreparationPlayer();
document.addEventListener('visibilitychange',()=>{if(document.hidden)players.forEach(p=>p.pausePlayback());});
window.addEventListener('pagehide',()=>players.forEach(p=>p.pausePlayback()));
section.dataset.renderer='operation-material-svg';
document.addEventListener('air-experiment-play',event=>{if(event.detail!=='oxygen')players.forEach(p=>p.pausePlayback());});
