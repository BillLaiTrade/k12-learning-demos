(() => {
  'use strict';
  const root=document.getElementById('direction-lab');
  if(!root)return;
  const $=id=>document.getElementById(id);
  const scenes={
    5:{name:'冷藏室',image:'assets/direction-fridge-glass.webp',observation:'在 5°C 冷藏室，連 10°C 的冷水也繼續降溫！原來兩杯水都比周圍暖，都在放熱。'},
    25:{name:'房間',image:'assets/direction-room-glass.webp',observation:'在 25°C 房間，A 杯降溫、B 杯升溫，卻都是熱從溫度較高的地方傳向較低的地方！'},
    70:{name:'高溫箱',image:'assets/direction-hot-glass.webp',observation:'在 70°C 高溫箱，連 60°C 的熱水也升溫了！原來兩杯水都比周圍冷，都在吸熱。'}
  };
  const state={environment:25,time:0,flowPhase:0,playing:false,observed:false,finished:false};
  let frame=0,last=null,shownEnvironment=null;
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  const routes=Object.fromEntries(['hot','cold'].map(key=>{
    const path=$(`direction-energy-path-${key}`);
    return [key,{path,length:path.getTotalLength(),group:$(`direction-flow-${key}`),trail:$(`direction-trail-${key}`),layer:$(`direction-pulses-${key}`),pulses:[...$(`direction-pulses-${key}`).children]}];
  }));
  function text(id,value){const node=$(id);if(node.textContent!==value)node.textContent=value;}
  function renderFlow(key,travel,difference){
    const route=routes[key];
    route.group.dataset.travelDirection=travel>0?'right':'left';
    const strength=String(.6+.4*Math.min(1,Math.abs(difference)/8));
    route.layer.style.opacity=strength;route.trail.style.opacity=strength;
    route.trail.setAttribute('stroke-dashoffset',String(-travel*state.flowPhase*route.length));
    route.pulses.forEach((pulse,index)=>{
      // Use the water model's clock so pause, resume and reset keep both in sync.
      const phase=(state.flowPhase+(index+.5)/3)%1;
      const position=(travel>0?phase:1-phase)*route.length;
      const point=route.path.getPointAtLength(position);
      const before=route.path.getPointAtLength(Math.max(0,position-1));
      const after=route.path.getPointAtLength(Math.min(route.length,position+1));
      const angle=Math.atan2(after.y-before.y,after.x-before.x)*180/Math.PI+(travel<0?180:0);
      pulse.setAttribute('transform',`translate(${point.x},${point.y}) rotate(${angle})`);
    });
  }
  function valueFor(initial){
    const value=state.environment+(initial-state.environment)*Math.exp(-.16*state.time);
    // Integer readouts settle together with the arrows, avoiding a visible
    // "same temperature" reading while a heat-flow arrow still points inward.
    return Math.abs(value-state.environment)<.5?state.environment:value;
  }
  function updateCup(key,initial,side){
    const value=valueFor(initial),difference=value-state.environment,hasFlow=difference!==0,visible=state.observed&&hasFlow;
    const outward=difference>0,travel=side==='left'?(outward?-1:1):(outward?1:-1);
    text(`direction-${key}`,`${Math.round(value)}°C`);
    // Etched 0–80°C scales are calibrated to the two photographed capillaries.
    const level=291-Math.max(0,Math.min(80,value))*3.0625;
    const surface=`M-2.2 ${level}Q0 ${level+1}2.2 ${level}`;
    $(`direction-liquid-${key}`).setAttribute('d',`${surface}V310H-2.2Z`);
    $(`direction-meniscus-${key}`).setAttribute('d',surface);
    $(`direction-live-reading-${key}`).setAttribute('transform',`translate(0,${level})`);
    text(`direction-${key}-flow`,!state.observed?'等待觀察':!hasFlow?'同溫・沒有淨熱傳遞':outward?'放熱・降溫':'吸熱・升溫');
    text(`direction-caption-${key}`,outward?'水 → 環境':'環境 → 水');
    text(`direction-title-${key}`,outward?'放熱':'吸熱');
    $(`direction-flow-${key}`).toggleAttribute('hidden',!visible);
    renderFlow(key,travel,difference);
    root.dataset[key==='hot'?'temperatureA':'temperatureB']=String(value);
    root.dataset[key==='hot'?'flowA':'flowB']=!state.observed?'pending':!hasFlow?'none':outward?'out':'in';
    return value;
  }
  function render(){
    const scene=scenes[state.environment];
    if(shownEnvironment!==state.environment){
      shownEnvironment=state.environment;
      root.dataset.environment=String(state.environment);
      text('direction-scene-name',scene.name);text('direction-environment',`${state.environment}°C`);
      root.querySelectorAll('.direction-scene-image').forEach((img,index)=>{
        img.src=scene.image;img.alt=`${scene.name}中自然放置的水杯 ${index===0?'A':'B'}`;
      });
      root.querySelectorAll('.direction-reflection-image').forEach(img=>img.setAttribute('href',scene.image));
      root.querySelectorAll('[data-environment]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.environment)===state.environment)));
    }
    const a=updateCup('hot',60,'left'),b=updateCup('cold',10,'right');
    state.finished=state.observed&&a===state.environment&&b===state.environment;
    if(state.finished)state.playing=false;
    const phase=!state.observed?'ready':state.finished?'complete':state.playing?'running':'paused';
    root.dataset.phase=phase;root.dataset.playing=String(state.playing);
    const label=state.finished?'重新觀察':state.playing?'暫停觀察':state.observed?'繼續觀察':'開始觀察';
    text('direction-play',label);$('direction-play').setAttribute('aria-pressed',String(state.playing));
    const message=phase==='ready'?'準備好，按開始觀察。':phase==='complete'?'兩杯水已和環境同溫，沒有淨熱傳遞。':phase==='running'?'觀察中。':'已暫停觀察。';
    text('direction-run-state',message);
    text('direction-observation-dialogue',!state.observed?'「原來不能只看水有多冷、多熱，還得比較它和周圍環境的溫度！」':state.finished?'「兩杯水最後都和周圍同溫了！溫度差消失，就沒有淨熱傳遞了。」':`「${scene.observation}」`);
  }
  function stop(){cancelAnimationFrame(frame);frame=0;last=null;}
  function tick(now){
    const dt=last===null?0:Math.max(0,Math.min(.1,(now-last)/1000));last=now;
    if(state.playing){
      state.time+=dt;
      // Heat transfer is essential motion. Use slower, steady movement for
      // reduced motion, with no flashing, zooming or abrupt phase changes.
      state.flowPhase+=dt*(reducedMotion.matches ? .24 : .48);
    }
    render();
    if(state.playing)frame=requestAnimationFrame(tick);else{frame=0;last=null;}
  }
  function start(){if(!frame){last=null;frame=requestAnimationFrame(tick);}}
  function reset(){stop();state.time=0;state.flowPhase=0;state.playing=false;state.observed=false;state.finished=false;render();}
  $('direction-play').addEventListener('click',()=>{
    if(state.finished){state.time=0;state.flowPhase=0;state.finished=false;}
    state.observed=true;state.playing=!state.playing;
    if(!state.playing)stop();render();if(state.playing)start();
  });
  $('direction-reset').addEventListener('click',reset);
  root.querySelectorAll('[data-environment]').forEach(button=>button.addEventListener('click',()=>{
    state.environment=Number(button.dataset.environment);reset();
  }));
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden&&state.playing){state.playing=false;stop();render();}
  });
  // Preload scene artwork; readings, paths and moving pulses remain live UI.
  Object.values(scenes).forEach(scene=>{const img=new Image();img.src=scene.image;});
  render();
})();
