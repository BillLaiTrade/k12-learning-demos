import {experimentVisible,revealExperiment} from './experiment-viewport.mjs?v=20261105-eleven1';

// Both kinds of wheel analogy share the same interruption policy. Closing the
// explanation is deliberate; leaving the viewport or tab is automatic.
export function mountCartPlayback({details,button,scene,cart,duration,draw,onOpen}){
  const compact=details.hasAttribute('data-compact-cart');
  if(compact){
    const svg=scene.querySelector('svg');
    const fitLabels=()=>{
      const scale=svg.getBoundingClientRect().width/svg.viewBox.baseVal.width;
      if(scale>0)svg.querySelectorAll('text').forEach(label=>label.style.fontSize=Math.max(18,12/scale)+'px');
    };
    new ResizeObserver(fitLabels).observe(scene);fitLabels();
  }
  let elapsed=0,state='idle',pauseReason='',started=0,frame=0,opened=false;
  const visible=()=>details.open&&experimentVisible(scene);
  function publish(){
    cart.dataset.state=state;cart.dataset.elapsedMs=elapsed;cart.dataset.pauseReason=pauseReason;
    button.disabled=state==='running';
    button.textContent=compact?{idle:'播放示範',running:'示範中…',paused:'繼續示範',complete:'再看一次'}[state]:state==='paused'?'繼續小車示範':state==='complete'?'再看一次小車示範':'播放小車示範';
    draw({elapsed,state});
  }
  function stop(reason='automatic'){
    cancelAnimationFrame(frame);frame=0;
    if(state==='running'){
      elapsed=Math.min(duration,Math.max(0,performance.now()-started));
      state=elapsed>=duration?'complete':'paused';pauseReason=state==='paused'?reason:'';
    }else if(reason==='closed'&&state==='paused')pauseReason='closed';
    publish();
  }
  function tick(now){
    if(document.hidden||!visible()){stop('automatic');return;}
    elapsed=Math.min(duration,Math.max(0,now-started));
    if(elapsed>=duration){state='complete';pauseReason='';frame=0;publish();}
    else {publish();frame=requestAnimationFrame(tick);}
  }
  function play(manual=false){
    if(state==='running'||!details.open||document.hidden)return;
    if(manual)revealExperiment(scene,button);
    if(state!=='paused')elapsed=0;
    state='running';pauseReason='';started=performance.now()-elapsed;publish();
    if(visible())frame=requestAnimationFrame(tick);else stop('automatic');
  }
  function resumeAutomatic(){if(state==='paused'&&pauseReason==='automatic'&&visible()&&!document.hidden)play();}
  button.addEventListener('click',()=>play(true));
  details.addEventListener('toggle',()=>{
    if(!details.open){stop('closed');return;}
    onOpen?.();
    const first=!opened;opened=true;
    if(first&&!matchMedia('(prefers-reduced-motion: reduce)').matches)play();
    else resumeAutomatic();
  });
  document.addEventListener('visibilitychange',()=>document.hidden?stop('automatic'):resumeAutomatic());
  new IntersectionObserver(()=>{if(visible())resumeAutomatic();else stop('automatic');},{threshold:0}).observe(scene);
  publish();
}
