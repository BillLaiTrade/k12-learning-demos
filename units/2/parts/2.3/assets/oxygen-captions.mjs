// One caption follows the active scene. Native animation delays pause together
// with its fade, so reading time never expires while the experiment is paused.
export function createSceneCaptions(panel) {
  const sources=[...panel.querySelectorAll('[data-scene-note]')];
  const bubble=sources[0];
  sources.forEach(node=>node.remove());
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
    show(view,text) {
      const drawing=view.querySelector('.oxygen-drawing');
      if(bubble.parentElement!==drawing)drawing.append(bubble);
      wanted=text;
      if(typeof bubble.animate!=='function'){
        shown=text;bubble.textContent=text;bubble.style.opacity='1';phase('idle');return;
      }
      if(!shown){shown=text;bubble.textContent=text;bubble.style.opacity='1';hold();}
      else if(!animation&&wanted!==shown)fadeOut();
    },
    reset() {
      generation++;animation?.cancel();animation=null;
      shown='';wanted='';paused=false;bubble.style.opacity='1';phase('idle');bubble.remove();
    },
    pause() {paused=true;animation?.pause();},
    resume() {paused=false;if(animation?.playState==='paused')animation.play();},
  };
}
