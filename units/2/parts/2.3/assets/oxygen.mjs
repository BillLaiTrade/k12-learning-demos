import { createSceneCaptions } from './oxygen-captions.mjs?v=reading-fade-1';
import { createEquipmentExplorer } from './oxygen-equipment.mjs?v=apparatus-layout-5';
import { OXYGEN_OPERATIONS, oxygenOperationFrame, assemblyFrame } from './oxygen-model.mjs?v=apparatus-layout-5';
import { createSetupScene, SETUP_DURATION } from './oxygen-setup.mjs?v=apparatus-layout-5';
const section = document.querySelector('.oxygen-lesson');
const panel = section.querySelector('.oxygen-preparation');
const steps = [...panel.querySelectorAll('.oxygen-steps [data-stage]')];
const panels = [...panel.querySelectorAll('[data-step-panel]')];
const players = [];
const setupScene=createSetupScene(panels[1],panels);
panels.slice(1).forEach(view=>view.setupScene=setupScene);

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
    setupScene.render(0);
    const name=materialInfo.find(info=>info.dataset.materialInfo===selectedMaterial).querySelector('h4').textContent;
    return `正在認識${name}；可點選其他物品，或接著擺好集氣位置。`;
  }
  if (scene === 1) {
    if(stage!==1){
      setupScene.render(SETUP_DURATION);
      const note=renderAssembly(f.sceneTime,state,view,stage-1);
      setupScene.operation(stage,f,assemblyFrame(f.sceneTime),view);
      return note;
    }
    // Preparation and chemistry share one background and the same glass assets.
    renderAssembly(2800,state,view,0);
    const setupNote=setupScene.render(f.localTime);
    view.dataset.captionMessage=setupNote;view.dataset.loopCaption=setupNote;
    view.querySelector('title').textContent=setupNote;
    view.querySelector('[data-assembly-zoom-label]').textContent='材料到集氣位置：同步看完整動作';
    return setupNote+'。';
  }
  const $ = part => view.querySelector(`[data-part="${part}"]`);
  const opacity = (part, value) => $(part).setAttribute('opacity', String(value));
  setupScene.render(SETUP_DURATION);
  const waterY = 290+f.collected*360;
  $('jar-water').setAttribute('y', waterY);
  $('jar-water').setAttribute('height', 650-waterY);
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
  setupScene.operation(stage,f,null,view);
  renderObservation(view,scene,f,waterY);
  view.dataset.captionMessage=note;
  view.dataset.loopCaption=scene===3&&f.collected===1?'氧氣進入，瓶內水位下降':note;
  view.querySelector('title').textContent=note;
  return note + (state==='complete' ? '。這一步已播完，可重播或繼續下一步。' : '。');
}

function renderObservation(view,stage,f,waterY) {
  const movingTube=stage===3&&f.tube<1;
  const withdrawing=stage===4&&f.tube>0;
  const label=stage===2?'瓶外排氣':stage===3?(movingTube?'移入瓶口':f.collected<1?'水位下降':'集氣完成'):withdrawing?'撤開導管':f.covered?'水下蓋片':'滑入玻璃片';
  let x=stage===2?800:stage===3?(movingTube?800+235*f.tube:940):withdrawing?800+235*f.tube:1034;
  let y=stage===2?600:stage===3?(movingTube?665:waterY):withdrawing?665:667;
  if(stage===4&&!withdrawing){const plate=panel.querySelector('[data-setup-body=plate]'),m=plate.transform.baseVal.consolidate().matrix;x=m.a*112.5+m.c*13+m.e;y=m.b*112.5+m.d*13+m.f;}
  view.querySelector('.oxygen-observation-guide').style.opacity=stage===4&&!withdrawing&&f.cover<.7?'0':'1';
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
  const tipY=phase===0?450+215*f.outletPlacement:665;
  const tube=`M${capX} ${275-25*(1-f.sealed)}V200Q${capX} 180 ${capX+20} 180H700Q720 180 720 200V${tipY+45}Q720 ${tipY+65} 740 ${tipY+65}H780Q800 ${tipY+65} 800 ${tipY+45}V${tipY}`;
  for(const part of ['delivery-tube','tube-highlight','flow'])$(part).setAttribute('d',tube);
  if(phase===0){
    const position=`translate(${155*(1-f.placement)} ${-70*(1-f.placement)})`;
    for(const part of ['placement-jar','full-label','assembly-jar-focus'])$(part).setAttribute('transform',position);
  }
  opacity('reaction-bubbles',f.reaction);
  $('reaction-bubbles').setAttribute('transform',`translate(0 ${-((f.time%900)/900)*30})`);
  opacity('purge-bubbles',f.gasThroughTube?1:0);opacity('flow',f.gasThroughTube?1:0);
  $('purge-bubbles').querySelectorAll('circle').forEach((b,i)=>{const phase=(f.time/1150+i*.33)%1;b.setAttribute('cx',800+Math.sin(phase*5+i)*8);b.setAttribute('cy',657-phase*90);});
  $('flow').style.strokeDashoffset=String(-f.time/35);
  opacity('assembly-jar-focus',phase===0?1:0);
  const notes=['把裝滿水的倒置集氣瓶移到定位，再將導管出口放在瓶外水中','把雙氧水倒入錐形瓶','用藥匙加入少量二氧化錳，讓雙氧水更快分解','塞緊已連接導管的塞子，氣體從瓶外水中的出口送出'];
  const finished=['集氣位置已備好；導管出口先留在瓶外水中','雙氧水已倒入，接著加入少量二氧化錳','加入二氧化錳後開始產氣，接著塞好連接導管的塞子','裝置已接好，接著先排空氣，暫不收集'];
  const note=state==='complete'?finished[phase]:notes[phase];
  view.dataset.captionMessage=note;view.dataset.loopCaption=notes[phase];view.querySelector('title').textContent=note;
  view.querySelector('.oxygen-mobile-zoom svg').setAttribute('viewBox',phase===0?'740 120 690 635':'100 30 550 805');
  view.querySelector('[data-assembly-zoom-label]').textContent=phase===0?'集氣位置近看':'加入材料與瓶口近看';
  return note+'。';
}

function createPreparationPlayer() {
  const play=panel.querySelector('[data-play]'),captions=createSceneCaptions(panel);
  const sequenceStatus=panel.querySelector('[data-continuous-status]');
  const status=panel.querySelector('[role=status]'),menu=panel.querySelector('[data-step-menu]');
  const navBody=panel.querySelector('#oxygen-step-list'),nav=panel.querySelector('.oxygen-step-nav');
  let stage=0,elapsed=0,state='ready',started=0,frame=0,message='',compact,explorer;
  const duration=()=>OXYGEN_OPERATIONS[stage].duration;
  const clockLimit=()=>duration()+(stage<steps.length-1?700:0);
  function syncControlOffset(){panel.style.setProperty('--oxygen-controls-height',`${nav.getBoundingClientRect().height}px`);}
  function setMenu(open){navBody.hidden=!open;menu.setAttribute('aria-expanded',String(open));syncControlOffset();}
  function syncLayout(){
    const narrow=panel.clientWidth<=720;
    if(narrow===compact)return;
    compact=narrow;menu.hidden=!compact;setMenu(!compact);
    panel.querySelectorAll('.oxygen-main-scene').forEach(svg=>svg.setAttribute('preserveAspectRatio',compact?'xMidYMid meet':'none'));
    nav.dataset.compact=String(compact);
    if(navBody.hidden&&navBody.contains(document.activeElement))menu.focus();
  }
  function cancel(){cancelAnimationFrame(frame);frame=0;}
  function paint(){
    panel.dataset.stage=String(stage);panel.dataset.state=state;
    panel.dataset.playMode='continuous';panel.dataset.elapsed=elapsed.toFixed(3);
    const atEnd=stage>0&&elapsed>=duration();
    let text=(state==='paused'?'已暫停：':'')+renderPreparation(stage,elapsed,atEnd?'complete':state);
    if(state==='playing'&&atEnd&&stage<steps.length-1)text=text.replace('這一步已播完，可重播或繼續下一步。','即將接續下一個操作。');
    if(stage===steps.length-1&&state==='complete')text=text.replace('這一步已播完，可重播或繼續下一步。','氧氣收集與封存已完成，可重新播放。');
    if(stage>0)captions.show(panels[stage],atEnd&&stage<steps.length-1?panels[stage].dataset.loopCaption:panels[stage].dataset.captionMessage);
    explorer?.sync(stage);
    if(message!==text){status.textContent=text;message=text;}
    const playing=state==='playing',paused=state==='paused',complete=state==='complete';
    const label=playing?'暫停':paused?'繼續':complete?'重新播放':'播放';
    play.querySelector('[data-play-icon]').textContent=playing?'Ⅱ':complete?'↻':'▶';
    play.querySelector('[data-play-label]').textContent=label;play.setAttribute('aria-label',label);
    play.classList.toggle('is-playing',playing);
    sequenceStatus.textContent=playing?'點畫面空白處可暫停。':paused?'點空白處或按繼續接著看。':complete?'已完成氧氣收集與封存。':stage===0?'從擺好集氣位置開始播放。':'按播放，從這一步接著看。';
    menu.textContent=`${String(stage+1).padStart(2,'0')} ${OXYGEN_OPERATIONS[stage].label} ▾`;
  }
  function tick(now){
    if(state!=='playing')return;
    elapsed=Math.min(clockLimit(),now-started);
    if(stage<steps.length-1&&elapsed>=clockLimit()){select(stage+1,false,true);return;}
    if(stage===steps.length-1&&elapsed>=duration())state='complete';
    paint();if(state==='playing')frame=requestAnimationFrame(tick);
  }
  function pausePlayback(){
    captions.pause();
    if(state!=='playing')return;
    elapsed=Math.min(clockLimit(),performance.now()-started);cancel();state='paused';paint();
  }
  function start(){
    if(stage===0)return;
    captions.resume();
    const at=state==='paused'?elapsed:0;
    document.dispatchEvent(new CustomEvent('air-experiment-play',{detail:'oxygen'}));
    cancel();elapsed=at;state='playing';started=performance.now()-elapsed;paint();frame=requestAnimationFrame(tick);
    if(compact){const bounds=panel.querySelector('.oxygen-stage-area').getBoundingClientRect();if(bounds.top>=innerHeight||bounds.bottom<=0)panels[stage].querySelector('h3').scrollIntoView({behavior:'instant',block:'start'});}
  }
  function select(index,focusContent=false,autoplay=false){
    const focusInScene=panels[stage].contains(document.activeElement);
    explorer?.close();cancel();
    if(!autoplay){captions.reset();captions.pause();}
    stage=index;elapsed=0;state='ready';
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
    if(autoplay&&focusInScene)play.focus({preventScroll:true});
    if(autoplay)start();
  }
  function choose(index,focusContent=false){
    select(index,focusContent);
    if(index>0)start();
  }
  function togglePlayback(){
    if(compact)setMenu(false);
    if(state==='playing'){pausePlayback();return;}
    explorer?.close();
    if(stage===0||state==='complete'){captions.reset();select(1,false,true);return;}
    start();
  }
  explorer=createEquipmentExplorer({panel,panels,getStage:()=>stage,onOpen:pausePlayback});
  panel.querySelector('.oxygen-steps').setAttribute('role','tablist');
  panel.querySelector('.oxygen-steps').setAttribute('aria-orientation','vertical');
  steps.forEach((tab,i)=>{
    tab.disabled=false;tab.setAttribute('role','tab');tab.setAttribute('aria-controls',panels[i].id);
    panels[i].setAttribute('role','tabpanel');panels[i].setAttribute('aria-labelledby',tab.id);panels[i].tabIndex=0;
    panels[i].querySelector('h3').tabIndex=-1;
    tab.addEventListener('click',()=>choose(i,true));
    tab.addEventListener('keydown',event=>{
      let target;
      if(['ArrowDown','ArrowRight'].includes(event.key))target=(i+1)%steps.length;
      else if(['ArrowUp','ArrowLeft'].includes(event.key))target=(i+steps.length-1)%steps.length;
      else if(event.key==='Home')target=0;else if(event.key==='End')target=steps.length-1;
      if(target!==undefined){event.preventDefault();choose(target);steps[target].focus();}
    });
  });
  materialButtons.forEach(button=>{
    button.disabled=false;button.addEventListener('click',()=>{
      showMaterial(button.dataset.material);paint();explorer.openMaterial(button.dataset.material,button);
    });
  });
  showMaterial(selectedMaterial);
  menu.addEventListener('click',()=>setMenu(navBody.hidden));
  play.addEventListener('click',togglePlayback);
  const stageArea=panel.querySelector('.oxygen-stage-area');
  const interactive='button,a,input,select,textarea,label,summary,[role="button"],[role="tab"],[contenteditable],[data-material],[data-equipment]';
  const selecting=()=>window.getSelection()?.isCollapsed===false;
  let gesture=null;
  stageArea.addEventListener('pointerdown',event=>{
    if(!event.isPrimary){if(gesture)gesture.cancelled=true;return;}
    if(event.button!==0){gesture=null;return;}
    gesture={id:event.pointerId,x:event.clientX,y:event.clientY,scrollX:window.scrollX,scrollY:window.scrollY,down:true,dragged:false,cancelled:false,selecting:selecting(),interactive:!!event.target.closest?.(interactive)};
  },{passive:true});
  stageArea.addEventListener('pointermove',event=>{
    if(gesture?.down&&gesture.id===event.pointerId&&Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)>10)gesture.dragged=true;
  },{passive:true});
  stageArea.addEventListener('pointerup',event=>{if(gesture?.id===event.pointerId)gesture.down=false;},{passive:true});
  stageArea.addEventListener('pointercancel',()=>{if(gesture){gesture.cancelled=true;gesture.down=false;}},{passive:true});
  stageArea.addEventListener('click',event=>{
    const tap=gesture;gesture=null;
    if(event.button!==0||event.defaultPrevented||event.target.closest?.(interactive)||selecting())return;
    if(event.detail>0&&tap&&(tap.dragged||tap.cancelled||tap.selecting||tap.interactive||Math.abs(window.scrollX-tap.scrollX)>2||Math.abs(window.scrollY-tap.scrollY)>2))return;
    if(section.querySelector('#oxygen-equipment-dialog').open)return;
    if(state==='playing'||state==='paused')togglePlayback();
  });
  panel.addEventListener('keydown',event=>{if(event.key==='Escape')pausePlayback();});
  if('IntersectionObserver'in window)new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)pausePlayback();}).observe(panel.querySelector('.oxygen-stage-area'));
  const api={pausePlayback};players.push(api);play.disabled=false;
  syncLayout();new ResizeObserver(syncLayout).observe(panel);new ResizeObserver(syncControlOffset).observe(nav);select(0);panel.dataset.ready='true';return api;
}
createPreparationPlayer();
document.addEventListener('visibilitychange',()=>{if(document.hidden)players.forEach(p=>p.pausePlayback());});
window.addEventListener('pagehide',()=>players.forEach(p=>p.pausePlayback()));
section.dataset.renderer='operation-material-svg';
document.addEventListener('air-experiment-play',event=>{if(event.detail!=='oxygen')players.forEach(p=>p.pausePlayback());});
