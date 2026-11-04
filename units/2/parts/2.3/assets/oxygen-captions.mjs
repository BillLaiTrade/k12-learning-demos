// Playing captions retain their reading hold and fade. Pausing replaces any
// delayed sentence with the current scene before freezing the caption.
export function createSceneCaptions(panel,{host=null}={}) {
  const sources=[...panel.querySelectorAll('[data-scene-note]')];
  const bubble=sources[0];
  sources.forEach(node=>node.remove());
  const strip=document.createElement('div');strip.className='oxygen-caption';strip.setAttribute('role','group');strip.setAttribute('aria-label','畫面說明');
  const label=document.createElement('span');label.className='oxygen-caption-label';label.textContent='畫面說明';
  strip.append(label,bubble);
  if(host)host.append(strip);
  let shown='',wanted='',paused=false,generation=0,animation=null;
  const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  const phase=value=>{bubble.dataset.captionPhase=value;};
  function run(name,from,to,duration,done) {
    phase(name);
    const token=generation;
    const motion=bubble.animate([{opacity:from},{opacity:to}],{duration,easing:'ease-in-out',fill:'forwards'});
    animation=motion;
    if(paused)motion.pause();
    motion.finished.then(()=>{
      if(token!==generation||animation!==motion)return;
      bubble.style.opacity=String(to);animation=null;motion.cancel();done();
    }).catch(()=>{});
  }
  function hold() {
    const readingTime=Math.max(2600,Math.min(3600,shown.length*90));
    run('hold',1,1,readingTime,()=>{phase('idle');if(wanted!==shown)fadeOut();});
  }
  function fadeOut() {
    run('out',1,0,reduced()?0:260,()=>{
      shown=wanted;bubble.textContent=shown;
      run('in',0,1,reduced()?0:340,hold);
    });
  }
  return {
    show(view,text,{staticText=false}={}) {
      const figure=host||view.querySelector('.oxygen-apparatus,.co2-apparatus');
      if(strip.parentElement!==figure)figure.append(strip);
      wanted=text;
      if(staticText||paused){
        generation++;animation?.cancel();animation=null;shown=text;
        bubble.textContent=text;bubble.style.opacity='1';phase('idle');return;
      }
      if(typeof bubble.animate!=='function'){
        shown=text;bubble.textContent=text;bubble.style.opacity='1';phase('idle');return;
      }
      if(!shown){shown=text;bubble.textContent=text;bubble.style.opacity='1';hold();}
      else if(!animation&&wanted!==shown)fadeOut();
    },
    reset() {
      generation++;animation?.cancel();animation=null;
      shown='';wanted='';paused=false;bubble.style.opacity='1';phase('idle');if(!host)strip.remove();
    },
    pause() {paused=true;animation?.pause();},
    resume() {paused=false;if(animation?.playState==='paused')animation.play();else if(shown&&!animation)hold();},
  };
}
