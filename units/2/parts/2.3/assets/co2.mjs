import { createExperimentPlayerFooter } from './experiment-player.mjs?v=b-decisions-20261104';
import {createSceneCaptions} from './oxygen-captions.mjs?v=b-decisions-20261104';
import {createCO2Explorer} from './co2-equipment.mjs?v=standby-desk-20261104';
import {CO2_OPERATIONS,co2OperationFrame} from './co2-model.mjs?v=standby-desk-20261104';
import {createCO2Bench} from './co2-setup.mjs?v=standby-desk-20261104';
const section=document.querySelector('#s4'),root=section.querySelector('.co2-preparation'),panel=root;
const steps=[...root.querySelectorAll('[data-co2-step]')],panels=[...root.querySelectorAll('[data-co2-panel]')],players=[];
const materialButtons=[...panels[0].querySelectorAll('[data-co2-material]')],materialInfo=[...panels[0].querySelectorAll('[data-co2-info]')];
const bench=createCO2Bench(panel,panels);panel.sharedBench=bench;
let selectedMaterial='marble';
function showMaterial(key){
 selectedMaterial=key;root.dataset.material=key;
 materialButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.co2Material===key)));
 materialInfo.forEach(info=>{info.hidden=info.dataset.co2Info!==key;});
}
function renderPreparation(stage,elapsed,state){
  const f=co2OperationFrame(stage,elapsed);
  for(const [key,value]of Object.entries(f))root.dataset[key]=typeof value==='number'?value.toFixed(4):String(value);
  const note=bench.render(stage,elapsed,f);
  if(stage===0)return `正在認識${materialInfo.find(p=>p.dataset.co2Info===selectedMaterial).querySelector('h4').textContent}；點選物品或名稱可開啟介紹。`;
  const view=panels[stage];view.dataset.captionMessage=note;view.dataset.loopCaption=note;
  view.querySelector('title').textContent=note;
  return note+'。';
}
function createPreparationPlayer() {
  const play=panel.querySelector('[data-play]'),footer=createExperimentPlayerFooter(panel),captions=createSceneCaptions(panel,{host:footer.element});
  const sequenceStatus=panel.querySelector('[data-continuous-status]');
  const status=panel.querySelector('[role=status]'),menu=panel.querySelector('[data-step-menu]');
  const navBody=panel.querySelector('#co2-step-list'),nav=panel.querySelector('.co2-step-nav');
  let stage=0,elapsed=0,state='ready',started=0,frame=0,message='',compact,explorer;
  const duration=()=>CO2_OPERATIONS[stage].duration;
  const clockLimit=()=>duration()+(stage<steps.length-1?700:0);
  function syncControlOffset(){panel.style.setProperty('--co2-controls-height',`${nav.getBoundingClientRect().height}px`);}
  function setMenu(open){navBody.hidden=!open;menu.setAttribute('aria-expanded',String(open));syncControlOffset();}
  let headingWidth=0;
  function syncSceneHeading(){
    const body=panel.querySelector('.co2-panels'),width=body.getBoundingClientRect().width;
    if(!width||Math.abs(width-headingWidth)<.5)return;
    headingWidth=width;
    const probes=panels.map(view=>{
      const heading=view.querySelector('.co2-step-head').cloneNode(true);
      heading.setAttribute('aria-hidden','true');
      heading.style.cssText=`position:absolute;display:flow-root;visibility:hidden;pointer-events:none;width:${width}px;min-height:0;height:auto`;
      body.append(heading);return heading;
    });
    panel.style.setProperty('--co2-heading-height',`${Math.ceil(Math.max(...probes.map(h=>h.getBoundingClientRect().height)))}px`);
    probes.forEach(h=>h.remove());
  }
  function syncLayout(){
    syncSceneHeading();
    const narrow=panel.clientWidth<=720;
    if(narrow===compact)return;
    compact=narrow;menu.hidden=!compact;setMenu(!compact);
    panel.querySelectorAll('.co2-main-scene').forEach(svg=>svg.setAttribute('preserveAspectRatio',compact?'xMidYMid meet':'none'));
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
    if(stage===steps.length-1&&state==='complete')text=text.replace('這一步已播完，可重播或繼續下一步。','二氧化碳收集與封存已完成，可重新播放。');
    footer.show(panels[stage]);
    captions.show(panels[stage],stage===0?'桌上是這次實驗的材料與器材，點選可查看介紹。':atEnd&&stage<steps.length-1?panels[stage].dataset.loopCaption:panels[stage].dataset.captionMessage,{staticText:stage===0});
    explorer?.sync(stage);
    if(message!==text){status.textContent=text;message=text;}
    const playing=state==='playing',paused=state==='paused',complete=state==='complete';
    const label=playing?'暫停':paused?'繼續':complete?'重新播放':'播放';
    play.querySelector('[data-play-icon]').textContent=playing?'Ⅱ':complete?'↻':'▶';
    play.querySelector('[data-play-label]').textContent=label;play.setAttribute('aria-label',label);
    play.classList.toggle('is-playing',playing);
    sequenceStatus.textContent='點畫面空白處，也可暫停／繼續。';
    menu.textContent=`${String(stage+1).padStart(2,'0')} ${CO2_OPERATIONS[stage].label} ▾`;
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
    document.dispatchEvent(new CustomEvent('air-experiment-play',{detail:'co2'}));
    cancel();elapsed=at;state='playing';started=performance.now()-elapsed;paint();frame=requestAnimationFrame(tick);
    if(compact){const bounds=panel.querySelector('.co2-stage-area').getBoundingClientRect();if(bounds.top>=innerHeight||bounds.bottom<=0)panels[stage].querySelector('h3').scrollIntoView({behavior:'instant',block:'start'});}
  }
  function select(index,focusContent=false,autoplay=false){
    const focusInScene=panels[stage].contains(document.activeElement);
    explorer?.close();cancel();
    captions.reset();if(!autoplay)captions.pause();
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
      const heading=panels[stage].querySelector('h3');heading.focus({preventScroll:true});
      const bounds=heading.getBoundingClientRect(),top=compact?nav.getBoundingClientRect().bottom+8:0;
      if(bounds.top<top||bounds.bottom>innerHeight)heading.scrollIntoView({behavior:'instant',block:'start'});
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
  explorer=createCO2Explorer({panel,panels,getStage:()=>stage,onOpen:pausePlayback,onBackgroundClick:handleStageClick});
  panel.querySelector('.co2-steps').setAttribute('role','tablist');
  panel.querySelector('.co2-steps').setAttribute('aria-orientation','vertical');
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
      showMaterial(button.dataset.co2Material);paint();explorer.openMaterial(button.dataset.co2Material,button);
    });
  });
  showMaterial(selectedMaterial);
  menu.addEventListener('click',()=>setMenu(navBody.hidden));
  play.addEventListener('click',togglePlayback);
  const stageArea=panel.querySelector('.co2-stage-area');
  const interactive='button,a,input,select,textarea,label,summary,[role="button"],[role="tab"],[contenteditable],[data-co2-material],[data-equipment]';
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
  function handleStageClick(event){
    const tap=gesture;gesture=null;
    if(event.button!==0||event.defaultPrevented||event.target.closest?.(interactive)||selecting())return;
    if(event.detail>0&&tap&&(tap.dragged||tap.cancelled||tap.selecting||tap.interactive||Math.abs(window.scrollX-tap.scrollX)>2||Math.abs(window.scrollY-tap.scrollY)>2))return;
    if(section.querySelector('#co2-equipment-dialog').open)return;
    if(state==='playing'||state==='paused')togglePlayback();
  }
  stageArea.addEventListener('click',handleStageClick);
  panel.addEventListener('keydown',event=>{if(event.key==='Escape')pausePlayback();});
  if('IntersectionObserver'in window)new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)pausePlayback();}).observe(panel.querySelector('.co2-stage-area'));
  const api={pausePlayback};players.push(api);play.disabled=false;
  syncLayout();new ResizeObserver(()=>{syncLayout();paint();}).observe(panel);new ResizeObserver(syncControlOffset).observe(nav);select(0);panel.dataset.ready='true';document.fonts.ready.then(()=>{headingWidth=0;syncSceneHeading();});return api;
}
createPreparationPlayer();
document.addEventListener('visibilitychange',()=>{if(document.hidden)players.forEach(p=>p.pausePlayback());});
window.addEventListener('pagehide',()=>players.forEach(p=>p.pausePlayback()));
section.dataset.renderer='operation-material-svg';
document.addEventListener('air-experiment-play',event=>{if(event.detail!=='co2')players.forEach(p=>p.pausePlayback());});
