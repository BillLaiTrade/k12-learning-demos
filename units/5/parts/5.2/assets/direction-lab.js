(() => {
  'use strict';
  const root=document.getElementById('direction-lab');
  if(!root)return;
  const $=id=>document.getElementById(id);
  const scenes={
    5:{name:'冷藏室',image:'assets/direction-fridge.webp',observation:'在 5°C 冷藏室，兩杯水都比環境暖，所以都放熱、降溫。'},
    25:{name:'房間',image:'assets/direction-room.webp',observation:'在 25°C 房間，A 放熱降溫，B 吸熱升溫；原來要先比較溫度高低！'},
    70:{name:'高溫箱',image:'assets/direction-hot.webp',observation:'在 70°C 高溫箱，連原本 60°C 的水也比環境冷，所以兩杯都吸熱、升溫。'}
  };
  const state={environment:25,time:0,playing:false,observed:false,finished:false};
  let frame=0,last=null,shownEnvironment=null;
  function text(id,value){const node=$(id);if(node.textContent!==value)node.textContent=value;}
  function valueFor(initial){
    const value=state.environment+(initial-state.environment)*Math.exp(-.16*state.time);
    // Integer readouts settle together with the arrows, avoiding a visible
    // "same temperature" reading while a heat-flow arrow still points inward.
    return Math.abs(value-state.environment)<.5?state.environment:value;
  }
  function updateCup(key,initial,side){
    const value=valueFor(initial),difference=value-state.environment,hasFlow=difference!==0,visible=state.observed&&hasFlow;
    const outward=difference>0,scale=side==='left'?(outward?-1:1):(outward?1:-1);
    text(`direction-${key}`,`${Math.round(value)}°C`);
    text(`direction-${key}-flow`,!state.observed?'等待觀察':!hasFlow?'同溫・沒有淨熱傳遞':outward?'放熱・降溫':'吸熱・升溫');
    text(`direction-caption-${key}`,outward?'水 → 環境':'環境 → 水');
    $(`direction-flow-${key}`).toggleAttribute('hidden',!visible);
    $(`direction-arrow-${key}`).setAttribute('transform',`translate(${side==='left'?200:400},295) scale(${scale},1)`);
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
    text('direction-observation-dialogue',!state.observed?'「先選一個環境，觀察這兩杯水的變化。」':state.finished?'「兩杯水最後都和環境同溫了。溫度差消失時，就沒有淨熱傳遞。」':`「${scene.observation}」`);
  }
  function stop(){cancelAnimationFrame(frame);frame=0;last=null;}
  function tick(now){
    const dt=last===null?0:Math.max(0,Math.min(.1,(now-last)/1000));last=now;
    if(state.playing)state.time+=dt;
    render();
    if(state.playing)frame=requestAnimationFrame(tick);else{frame=0;last=null;}
  }
  function start(){if(!frame){last=null;frame=requestAnimationFrame(tick);}}
  function reset(){stop();state.time=0;state.playing=false;state.observed=false;state.finished=false;render();}
  $('direction-play').addEventListener('click',()=>{
    if(state.finished){state.time=0;state.finished=false;}
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
  // Preload only clean scene artwork; all readings and arrows remain live UI.
  Object.values(scenes).forEach(scene=>{const img=new Image();img.src=scene.image;});
  render();
})();
