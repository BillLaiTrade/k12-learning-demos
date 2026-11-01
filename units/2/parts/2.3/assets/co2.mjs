import {createSceneCaptions} from './oxygen-captions.mjs?v=reading-fade-1';
import {createCO2Explorer} from './co2-equipment.mjs?v=desk-4';
import {CO2_OPERATIONS,co2OperationFrame} from './co2-model.mjs?v=desk-4';
import {createCO2Bench} from './co2-setup.mjs?v=desk-4';
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
  const f=co2OperationFrame(stage,elapsed),scene=f.scene;
  for(const [key,value]of Object.entries(f))root.dataset[key]=typeof value==='number'?value.toFixed(4):String(value);
  if(stage===0){
    bench.render(stage,elapsed,f);
    return `正在認識${materialInfo.find(p=>p.dataset.co2Info===selectedMaterial).querySelector('h4').textContent}；點選物品或名稱可開啟介紹。`;
  }
  const view=panels[stage],$=name=>view.querySelector(`[data-co2-part="${name}"]`);
  const opacity=(name,value)=>$(name).setAttribute('opacity',String(value));
  $('flask-label').textContent=f.marble===0?'錐形瓶（空）':f.acid===0?'錐形瓶：已加入大理石':'錐形瓶：大理石＋稀鹽酸';
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
  opacity('plate',scene===4?1:0);$('plate').setAttribute('transform',`translate(${(1-f.cover)*230} ${-30*(1-f.cover)})`);
  opacity('sample-label',f.labeled?1:0);
  if(scene===1){
    const pouringMarble=stage===2&&f.localTime>=700&&f.phase===1&&f.marble<1,pouringAcid=stage===3&&f.localTime>=700&&f.phase===2&&f.acid<1;
    opacity('marble-dish',pouringMarble?1:0);opacity('falling-marble',pouringMarble?1:0);
    $('falling-marble').querySelectorAll('path').forEach((p,i)=>p.setAttribute('transform',`translate(${300+Math.sin(i*3)*12} ${200+((f.time/1000+i*.27)%1)*355}) rotate(${i*33})`));
    opacity('acid-bottle',pouringAcid?1:0);opacity('acid-stream',pouringAcid?1:0);
    $('acid-stream').setAttribute('d',`M300 190Q296 235 300 265V${liquidY}`);
    view.querySelectorAll('[data-co2-phase]').forEach((item,i)=>{item.classList.toggle('is-current',i===f.phase);if(i===f.phase)item.setAttribute('aria-current','true');else item.removeAttribute('aria-current');});
  }
  let notes=scene===1?['','先擺好錐形瓶與直立集氣瓶；導管出口暫留瓶外','將大理石放入錐形瓶','加入稀鹽酸，接觸大理石後開始產氣','塞好連接導管的塞子，氣體由瓶外出口送出'][stage]
    :scene===2?'導管口在集氣瓶外，先排出裝置原有空氣與起始混合氣'
    :scene===3?(f.insert<1?'將導管移至直立集氣瓶底部附近':'氣體由瓶底附近進入，原有空氣由瓶口向上離開')
    :f.labeled?'已撤管並蓋上玻璃片，標示二氧化碳樣本，瓶口朝上':f.insert>0?'先將導管向上移出集氣瓶':f.cover<1?'導管已移出，再用玻璃片蓋住瓶口':'蓋好後標示二氧化碳樣本';
  view.dataset.captionMessage=notes;view.dataset.loopCaption=notes;
  view.querySelector('title').textContent=notes;
  if(scene===1){view.querySelector('.co2-closeup svg').setAttribute('viewBox',f.phase===0?'540 130 520 480':'120 80 410 530');}
  if(scene===1){
    $('placement-jar').setAttribute('transform',`translate(${120*(1-f.placement)} ${-40*(1-f.placement)})`);
  }
  const observation=stage===1?'直立擺放':stage===2?'放入大理石':stage===3?'加入稀鹽酸':stage===4?'塞好導管':stage===5?'瓶外排氣':stage===6?(f.insert<1?'移入瓶底':'空氣向上離開'):f.insert>0?'撤出導管':'撤管後蓋片';
  const x=stage===1?870+120*(1-f.placement):stage<=4?300:stage===5?f.tipX:stage===6?(f.insert<1?f.tipX:962):f.insert>0?f.tipX:870;
  const y=stage===1?400-40*(1-f.placement):stage<=4?stage===4?195:530:stage===5?f.tipY:stage===6?(f.insert<1?f.tipY:230):f.insert>0?f.tipY:220;
  view.querySelector('[data-observation-label]').textContent=observation;
  view.querySelector('[data-observation-leader]').setAttribute('d',`M658 298L${x} ${y}`);
  for(const key of ['point','halo']){const n=view.querySelector(`[data-observation-${key}]`);n.setAttribute('cx',x);n.setAttribute('cy',y);}
  const setupNote=bench.render(stage,elapsed,f);
  if(setupNote){notes=setupNote;view.dataset.captionMessage=notes;view.dataset.loopCaption=notes;view.querySelector('title').textContent=notes;}
  return notes+'。';
}
function createPreparationPlayer() {
  const play=panel.querySelector('[data-play]'),captions=createSceneCaptions(panel);
  const sequenceStatus=panel.querySelector('[data-continuous-status]');
  const status=panel.querySelector('[role=status]'),menu=panel.querySelector('[data-step-menu]');
  const navBody=panel.querySelector('#co2-step-list'),nav=panel.querySelector('.co2-step-nav');
  let stage=0,elapsed=0,state='ready',started=0,frame=0,message='',compact,explorer;
  const duration=()=>CO2_OPERATIONS[stage].duration;
  const clockLimit=()=>duration()+(stage<steps.length-1?700:0);
  function syncControlOffset(){panel.style.setProperty('--co2-controls-height',`${nav.getBoundingClientRect().height}px`);}
  function setMenu(open){navBody.hidden=!open;menu.setAttribute('aria-expanded',String(open));syncControlOffset();}
  function syncLayout(){
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
    if(stage>0)captions.show(panels[stage],atEnd&&stage<steps.length-1?panels[stage].dataset.loopCaption:panels[stage].dataset.captionMessage);
    explorer?.sync(stage);
    if(message!==text){status.textContent=text;message=text;}
    const playing=state==='playing',paused=state==='paused',complete=state==='complete';
    const label=playing?'暫停':paused?'繼續':complete?'重新播放':'播放';
    play.querySelector('[data-play-icon]').textContent=playing?'Ⅱ':complete?'↻':'▶';
    play.querySelector('[data-play-label]').textContent=label;play.setAttribute('aria-label',label);
    play.classList.toggle('is-playing',playing);
    sequenceStatus.textContent=playing?'點畫面空白處可暫停。':paused?'點空白處或按繼續接著看。':complete?'已完成二氧化碳收集與封存。':stage===0?'從擺好集氣位置開始播放。':'按播放，從這一步接著看。';
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
  explorer=createCO2Explorer({panel,panels,getStage:()=>stage,onOpen:pausePlayback});
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
  stageArea.addEventListener('click',event=>{
    const tap=gesture;gesture=null;
    if(event.button!==0||event.defaultPrevented||event.target.closest?.(interactive)||selecting())return;
    if(event.detail>0&&tap&&(tap.dragged||tap.cancelled||tap.selecting||tap.interactive||Math.abs(window.scrollX-tap.scrollX)>2||Math.abs(window.scrollY-tap.scrollY)>2))return;
    if(section.querySelector('#co2-equipment-dialog').open)return;
    if(state==='playing'||state==='paused')togglePlayback();
  });
  panel.addEventListener('keydown',event=>{if(event.key==='Escape')pausePlayback();});
  if('IntersectionObserver'in window)new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)pausePlayback();}).observe(panel.querySelector('.co2-stage-area'));
  const api={pausePlayback};players.push(api);play.disabled=false;
  syncLayout();new ResizeObserver(()=>{syncLayout();paint();}).observe(panel);new ResizeObserver(syncControlOffset).observe(nav);select(0);panel.dataset.ready='true';return api;
}
createPreparationPlayer();
document.addEventListener('visibilitychange',()=>{if(document.hidden)players.forEach(p=>p.pausePlayback());});
window.addEventListener('pagehide',()=>players.forEach(p=>p.pausePlayback()));
section.dataset.renderer='operation-material-svg';
document.addEventListener('air-experiment-play',event=>{if(event.detail!=='co2')players.forEach(p=>p.pausePlayback());});
