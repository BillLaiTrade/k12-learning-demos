import {ROOM,GOAL,SPEED,createBath,advanceBath,geometry,positionBottle,useCup} from './water-bath-model.mjs?v=cozy-6';

const root=document.getElementById('water-bath');
if(root){
  const $=id=>document.getElementById(id),stage=$('bath-stage'),bottle=$('bath-bottle');
  const play=$('bath-play'),check=$('bath-check'),tools=[...root.querySelectorAll('[data-bath-tool]')];
  const names={bench:'桌面',bowl:'水盆',bottle:'飲料瓶',wrap:'保溫套',mat:'隔熱墊',sleeve:'瓶套',jug:'量杯','bottle-sleeved':'已穿上瓶套的飲料瓶'};
  const assets=Object.fromEntries(Object.keys(names).map(key=>[key,{src:`assets/bath-${key}.webp?v=${key==='wrap'?'cozy-6':'bath-2'}`,status:'idle',request:0}]));
  let state=createBath(),playing=false,frame=0,previous=null,history=[[0,50,20]],lastSample=0,sampleEvery=3,events=[],drag=null,ghost=null,suppressClick={node:null,until:0};
  let anchors={bath:{x:275,y:177},drink:{x:825,y:177}};
  const text=(id,value)=>{const node=$(id);if(node.textContent!==value)node.textContent=value;};
  const attr=(id,key,value)=>{const node=$(id),v=String(value);if(node.getAttribute(key)!==v)node.setAttribute(key,v);};
  const assetState=()=>Object.values(assets).some(a=>a.status==='error')?'error':Object.values(assets).every(a=>a.status==='ready')?'ready':'loading';
  const blockedClick=(node,event)=>event?.detail!==0&&suppressClick.node===node&&performance.now()<suppressClick.until;
  const ready=()=>assetState()==='ready';
  const inWater=()=>geometry(state).immersion>0;
  function hint(message){text('bath-hint',message);}
  function clearResult(){$('bath-result').hidden=true;}
  function record(message){events.push(message);if(events.length>30)events.shift();drawLog();}
  function drawLog(){
    $('bath-log').replaceChildren(...events.map(message=>{const li=document.createElement('li');li.textContent=message;return li;}));
  }
  function sample(force=false){
    if(force||state.time-lastSample>=sampleEvery){history.push([state.time,state.bath,state.drink]);lastSample=state.time;}
    if(history.length>1000){history=history.filter((_,i)=>i%2===0);sampleEvery*=2;}
  }
  function plot(){
    if(!$('bath-record').open)return;
    const points=[...history,[state.time,state.bath,state.drink]],maxTime=Math.max(1,state.time);
    // All plotted values come from the same current reservoir state/history.
    const y=t=>240-(t-20)/35*220;
    for(const [id,column]of [['bath-curve-source',1],['bath-curve-drink',2]]){
      $(id).setAttribute('d',points.map((p,i)=>`${i?'L':'M'}${(55+795*p[0]/maxTime).toFixed(2)} ${y(p[column]).toFixed(2)}`).join(''));
    }
    $('bath-chart-room').setAttribute('d',`M55 ${y(ROOM)}H850`);
  }
  function render(){
    const status=assetState(),g=geometry(state);
    Object.assign(root.dataset,{assets:status,playing:String(playing),started:String(playing||state.time>0),stage:state.goalAt!==null?'achieved':state.time>0||playing?'observing':'ready',elapsed:state.time.toFixed(3),bath:state.bath.toFixed(5),drink:state.drink.toFixed(5),cup:state.cup.toFixed(5),water:String(state.water),cupWater:String(state.cupWater),immersion:g.immersion.toFixed(5),bottleX:String(state.x),bottleBottom:String(state.bottom),wrap:String(state.wrap),mat:String(state.mat),sleeve:String(state.sleeve),goalAt:state.goalAt===null?'':state.goalAt.toFixed(3)});
    root.setAttribute('aria-busy',String(status==='loading'));play.disabled=check.disabled=status!=='ready';tools.forEach(n=>n.disabled=status!=='ready');bottle.setAttribute('aria-disabled',String(status!=='ready'));
    play.setAttribute('aria-pressed',String(playing));text('bath-play',playing?'暫停觀察':state.time>0?'繼續觀察':'開始觀察');
    for(const [key,temp]of [['bath',state.bath],['drink',state.drink]]){
      const output=$(`bath-reading-${key}`),value=temp.toFixed(1);const digits=output.querySelector('span');if(digits.textContent!==value)digits.textContent=value;output.dataset.value=value;
      output.setAttribute('aria-label',`${key==='bath'?'熱水':'飲料'}攝氏${value}度`);
    }
    bottle.setAttribute('transform',`translate(${state.x} ${state.bottom})`);
    $('bath-bottle-photo').toggleAttribute('hidden',state.sleeve);
    const a=anchors.drink;
    $('bath-probe-drink-wire').setAttribute('d',`M${a.x} ${a.y}C${a.x} ${a.y+50} ${state.x} ${state.bottom-460} ${state.x} ${state.bottom-368}`);
    const w=anchors.bath;$('bath-probe-water-wire').setAttribute('d',`M${w.x} ${w.y}C${w.x} ${w.y+50} 355 275 362 330`);
    // Follow the inner bowl taper, keeping the waterline inside the glass.
    const rx=310-Math.max(0,g.surface-425)*.25,y=g.surface;
    const volume=`M${550-rx} ${y}A${rx} 43 0 0 1 ${550+rx} ${y}L808 558Q550 614 292 558Z`;
    for(const id of ['bath-water-body','bath-water-front'])attr(id,'d',volume);
    attr('bath-water-surface','cy',y.toFixed(2));attr('bath-water-surface','rx',rx.toFixed(2));
    const bowlImage=assets[state.wrap?'wrap':'bowl'];
    if(bowlImage.status==='ready')for(const id of ['bath-bowl-back-photo','bath-bowl-front-photo'])attr(id,'href',bowlImage.url);
    $('bath-water-front').toggleAttribute('hidden',state.wrap);
    const wet=g.immersion>0&&!state.wrap;$('bath-water-meniscus').toggleAttribute('hidden',!wet);
    const radius=state.sleeve?70:62;attr('bath-water-meniscus','d',`M${state.x-radius} ${y}Q${state.x} ${y+12} ${state.x+radius} ${y}`);
    $('bath-wrap-object').toggleAttribute('hidden',!state.wrap);$('bath-mat-photo').toggleAttribute('hidden',!state.mat);$('bath-sleeve-photo').toggleAttribute('hidden',!state.sleeve);
    for(const button of tools)if(button.dataset.bathTool!=='jug')button.setAttribute('aria-pressed',String(state[button.dataset.bathTool]));
    const cup=$('bath-cup-object');cup.toggleAttribute('hidden',!root.dataset.cupUsed);cup.setAttribute('transform',`translate(${state.cupX} ${state.cupY})`);
    const cupLevel=-12-state.cupWater*.9;
    $('bath-cup-liquid').setAttribute('d',`M-46 ${cupLevel}Q-9 ${cupLevel-7} 28 ${cupLevel}L24-9Q-10 2-44-9Z`);$('bath-cup-liquid').toggleAttribute('hidden',state.cupWater===0);
    attr('bath-cup-surface','cy',cupLevel);$('bath-cup-surface').toggleAttribute('hidden',state.cupWater===0);
    const cupAction=$('bath-cup-action');cupAction.hidden=!root.dataset.cupUsed;cupAction.disabled=status!=='ready';text('bath-cup-action',state.cupWater?`${state.cupWater}mL・倒回`:'空量杯・取50mL');
    cup.setAttribute('aria-label',`量杯，裝有${state.cupWater}毫升；${state.cupWater?'移回水盆或按倒回':'移到水面或按取水'}`);
    $('bath-retry').hidden=status!=='error';text('bath-loading-text',status==='error'?'器材未能載入，請再試一次。':'器材載入中…');
    plot();
  }
  function tick(now){
    if(!playing)return;
    const dt=previous===null?0:Math.min(.05,Math.max(0,(now-previous)/1000));previous=now;
    advanceBath(state,dt*SPEED);sample();render();frame=requestAnimationFrame(tick);
  }
  function start(){if(playing||!ready())return;playing=true;previous=null;clearResult();hint('觀察中：可以繼續移動瓶子或調整配件。');render();frame=requestAnimationFrame(tick);}
  function stop(){playing=false;cancelAnimationFrame(frame);frame=0;previous=null;render();}
  function reset(){
    cancelDrag();stop();state=createBath();history=[[0,50,20]];events=[];lastSample=0;sampleEvery=3;delete root.dataset.cupUsed;
    $('bath-record').open=false;clearResult();drawLog();hint('拖動瓶子，試試桌上的器材。');render();
  }
  function toggleTool(key,on){
    if(!ready())return;clearResult();
    if(key==='jug'){
      presentCup();return;
    }else{
      state[key]=on===undefined?!state[key]:on;
      const descriptions={wrap:['包覆水盆外側','取下水盆保溫套'],mat:['放置隔熱墊','收回隔熱墊'],sleeve:['飲料瓶套上瓶套','取下瓶套']};const message=descriptions[key][state[key]?0:1];record(message);hint(key==='wrap'&&state.wrap?'布套已包住盆壁；抓住瓶蓋可移動，取下布套可看水位。':`${message}，看看讀值怎麼變。`);
    }render();
  }
  function presentCup(forceShow=false){
    if(!ready())return;
    if(root.dataset.cupUsed&&!state.cupWater&&!forceShow){delete root.dataset.cupUsed;hint('空量杯已收回。');render();return;}
    const first=!root.dataset.cupUsed;root.dataset.cupUsed='true';
    if(first){state.cupX=100;state.cupY=575;record('拿出空量杯');}
    hint(state.cupWater?`量杯裡有${state.cupWater}mL；移回水盆或按「倒回」。`:'空量杯已拿出；移到盆內水面或按「取50mL」。');render();
  }
  function transferCup(){
    if(!ready())return;clearResult();root.dataset.cupUsed='true';const action=useCup(state);
    state.cupX=100;state.cupY=575;
    hint(action==='scoop'?'已取出50mL盆水，水盆裡的水量減少。':'量杯的水已倒回，水盆水位回升。');
    record(action==='scoop'?'量杯取出50mL盆水':'把量杯的水倒回水盆');sample(true);render();
  }
  function cupDrop(p){
    const g=geometry(state),clearOfBottle=!g.inBowl||Math.abs(p.x-state.x)>105;
    return p.x>235&&p.x<865&&p.y>g.surface-55&&p.y<590&&clearOfBottle;
  }
  function checkResult(){
    if(!ready())return;stop();const result=$('bath-result');result.hidden=false;
    const success=state.goalAt!==null;result.dataset.success=String(success);
    result.textContent=success?`這次觀察已達到35.0°C！飲料目前是${state.drink.toFixed(1)}°C。你可以繼續觀察或重來。`:state.time===0?'先開始觀察，看看飲料能不能達到35°C。':`飲料目前是${state.drink.toFixed(1)}°C，還沒達到35°C。調整位置或配件後可以繼續。`;
    hint(success?'挑戰完成；熱水與飲料仍會繼續交換熱量。':'已暫停，可以調整配置後繼續觀察。');
  }
  function stagePoint(event){const p=stage.createSVGPoint();p.x=event.clientX;p.y=event.clientY;return p.matrixTransform(stage.getScreenCTM().inverse());}
  function removeGhost(){ghost?.remove();ghost=null;}
  function cancelDrag(){if(drag){if(drag.kind==='bottle'){state.x=drag.originalX;state.bottom=drag.originalBottom;}else if(drag.kind==='cup'){state.cupX=drag.cupX;state.cupY=drag.cupY;}try{drag.node.releasePointerCapture(drag.pointer);}catch{}bottle.removeAttribute('data-dragging');}drag=null;removeGhost();render();}
  // Some touch browsers omit the compatibility click after a canvas drag.
  // Handle touch release once; retain native clicks for mouse and keyboard.
  function activate(node,action){
    let touchUntil=0;
    node.addEventListener('pointerup',event=>{
      if(event.pointerType!=='touch'||node.disabled||blockedClick(node,{detail:1}))return;
      event.preventDefault();touchUntil=performance.now()+700;action(event);
    });
    node.addEventListener('click',event=>{
      if(event.detail>0&&performance.now()<touchUntil){event.preventDefault();return;}
      action(event);
    });
  }
  function bindDrag(node,kind){
    node.addEventListener('pointerdown',event=>{
      if(!ready()||event.button!==0||drag)return;
      const p=stagePoint(event);drag={node,kind,pointer:event.pointerId,sx:event.clientX,sy:event.clientY,px:p.x,py:p.y,originalX:state.x,originalBottom:state.bottom,cupX:state.cupX,cupY:state.cupY,moved:false};
      node.setPointerCapture(event.pointerId);
    });
    node.addEventListener('pointermove',event=>{
      if(!drag||drag.pointer!==event.pointerId)return;
      const p=stagePoint(event),distance=Math.hypot(event.clientX-drag.sx,event.clientY-drag.sy);
      if(!drag.moved&&distance<5)return;drag.moved=true;clearResult();
      if(kind==='bottle'){
        positionBottle(state,drag.originalX+p.x-drag.px,drag.originalBottom+p.y-drag.py);bottle.dataset.dragging='true';render();
      }else if(kind==='cup'){
        state.cupX=Math.max(75,Math.min(1020,drag.cupX+p.x-drag.px));state.cupY=Math.max(290,Math.min(595,drag.cupY+p.y-drag.py));render();
      }else{
        if(!ghost){ghost=document.createElement('img');ghost.className='bath-drag-ghost';ghost.alt='';ghost.src=assets[kind].url;document.body.append(ghost);}
        ghost.style.left=event.clientX+'px';ghost.style.top=event.clientY+'px';
      }
      event.preventDefault();
    });
    node.addEventListener('pointerup',event=>{
      if(!drag||drag.pointer!==event.pointerId)return;const moved=drag.moved,p=stagePoint(event);drag=null;removeGhost();bottle.removeAttribute('data-dragging');
      if(moved){suppressClick={node,until:performance.now()+350};
        if(kind==='bottle'){record(inWater()?'調整瓶子浸入程度':'把飲料瓶移出熱水');hint(inWater()?'已放入熱水，可以上下移動瓶子。':'瓶子已離水；可拖回水盆中央。');}
        else if(kind==='cup'||kind==='jug'){if(cupDrop(p))transferCup();else{root.dataset.cupUsed='true';if(kind==='jug'){state.cupX=Math.max(75,Math.min(1020,p.x));state.cupY=Math.max(290,Math.min(595,p.y));}hint(state.cupWater?'把量杯移回水盆即可倒回。':'把量杯移到水面或按取水。');}}
        else if(kind==='sleeve'){toggleTool(kind,Math.abs(p.x-state.x)<145&&p.y>state.bottom-390&&p.y<state.bottom+40);}
        else toggleTool(kind,p.x>150&&p.x<900&&p.y>280&&p.y<650);
        render();
      }
    });
    node.addEventListener('pointercancel',cancelDrag);
    node.addEventListener('lostpointercapture',()=>{if(drag?.node===node)cancelDrag();});
  }
  bindDrag(bottle,'bottle');bindDrag($('bath-wrap-object'),'wrap');bindDrag($('bath-cup-object'),'cup');
  bottle.addEventListener('click',event=>{if(blockedClick(bottle,event)||!ready())return;hint('拖到水盆中央，再上下移動瓶子。');});
  bottle.addEventListener('keydown',event=>{
    if(!ready())return;const key=event.key;if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter',' '].includes(key))return;
    event.preventDefault();clearResult();
    if(key==='Enter'||key===' ')positionBottle(state,inWater()?1010:550,600);
    else if(key==='ArrowUp'||key==='ArrowDown')positionBottle(state,state.x,state.bottom+(key==='ArrowUp'?-35:35));
    else positionBottle(state,state.x+(key==='ArrowLeft'?-220:220),state.bottom);
    record(inWater()?'調整瓶子浸入程度':'把飲料瓶移出熱水');hint(inWater()?'已放入熱水，可以上下調整浸入程度。':'瓶子已離水。');render();
  });
  tools.forEach(node=>{const key=node.dataset.bathTool;bindDrag(node,key);activate(node,event=>{if(!blockedClick(node,event))toggleTool(key);});});
  activate($('bath-wrap-object'),event=>{if(!blockedClick($('bath-wrap-object'),event))toggleTool('wrap',false);});
  $('bath-wrap-object').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggleTool('wrap',false);}});
  activate($('bath-cup-object'),event=>{if(!blockedClick($('bath-cup-object'),event))presentCup(true);});
  $('bath-cup-object').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();presentCup(true);$('bath-cup-action').focus({preventScroll:true});}});
  activate($('bath-cup-action'),transferCup);
  activate(play,()=>playing?stop():start());activate(check,checkResult);activate($('bath-reset'),reset);
  activate($('bath-record').querySelector('summary'),event=>{event.preventDefault();$('bath-record').open=!$('bath-record').open;plot();drawLog();});
  $('bath-record').addEventListener('toggle',()=>{plot();drawLog();});
  const help=$('bath-help');activate($('bath-help-open'),()=>{cancelDrag();stop();help.showModal();});activate($('bath-help-close'),()=>help.close());
  help.addEventListener('close',()=>$('bath-help-open').focus({preventScroll:true}));
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelDrag();stop();}});addEventListener('pagehide',()=>{cancelDrag();stop();});
  function assignImages(){
    const mapping={bench:['bath-bench-photo'],bowl:[],bottle:['bath-bottle-photo'],wrap:[],mat:['bath-mat-photo'],sleeve:[],'bottle-sleeved':['bath-sleeve-photo'],jug:['bath-jug-photo']};
    for(const [key,ids]of Object.entries(mapping))if(assets[key].status==='ready'){
      for(const id of ids){const node=$(id),prop=node instanceof SVGElement?'href':'src';if(node.getAttribute(prop)!==assets[key].url)node.setAttribute(prop,assets[key].url);}
      root.querySelectorAll(`[data-bath-thumbnail="${key}"]`).forEach(node=>{if(node.getAttribute('src')!==assets[key].url)node.src=assets[key].url;});
    }
  }
  function load(retry=false){
    for(const [key,a]of Object.entries(assets)){
      if(a.status==='ready'||a.status==='loading')continue;a.status='loading';const request=++a.request,url=a.src+(retry?`&retry=${request}`:'');
      const img=new Image();img.onload=()=>{if(a.request!==request)return;a.status=img.naturalWidth?'ready':'error';if(a.status==='ready')a.url=url;assignImages();render();};img.onerror=()=>{if(a.request===request){a.status='error';render();}};img.src=url;
    }render();
  }
  function updateAnchors(){
    const matrix=stage.getScreenCTM();if(!matrix)return;
    for(const key of ['bath','drink']){const box=$(`bath-reading-${key}`).parentElement.querySelector('img').getBoundingClientRect();const p=stage.createSVGPoint();p.x=box.x+box.width*.5;p.y=box.y+box.height*.78;anchors[key]=p.matrixTransform(matrix.inverse());}
    render();
  }
  addEventListener('resize',updateAnchors);new ResizeObserver(updateAnchors).observe(root.querySelector('.bath-scene'));
  activate($('bath-retry'),()=>load(true));render();load();updateAnchors();
}
