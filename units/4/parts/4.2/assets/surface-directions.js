import {surfaceDiagram} from './surface-directions.mjs?v=surface-native-20261105';

const root = document.querySelector('#surface-explanation');
const button = document.querySelector('#surface-play');
const status = document.querySelector('#surface-play-status');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const ns = 'http://www.w3.org/2000/svg';
const create = (name, attributes) => {
  const element = document.createElementNS(ns, name);
  for (const [key,value] of Object.entries(attributes)) element.setAttribute(key,value);
  return element;
};
const tracks = [];
const TAIL = 32;
// One connected polyline per ray. A short light packet travels across the
// reflection point at constant speed; neither leg is switched on separately.
root.querySelectorAll('[data-surface]').forEach(panel => {
  const diagram = surfaceDiagram(panel.dataset.surface);
  const point = p => p.map(v => Number(v.toFixed(6))).join(' ');
  panel.querySelectorAll('[data-surface-ray]').forEach((group,index) => {
    const ray = diagram.rays[index];
    const route = `M${point(ray.start)}L${point(ray.hit)}L${point(ray.end)}`;
    const length = Math.hypot(...ray.hit.map((v,i)=>v-ray.start[i])) + Math.hypot(...ray.end.map((v,i)=>v-ray.hit[i]));
    const packet = create('g',{class:'surface-flow-packet','aria-hidden':'true'});
    for (const [layer,tail] of [['halo',TAIL],['body',22],['core',8]]) {
      const path=create('path',{class:'surface-flow-'+layer,d:route,'stroke-dasharray':`${tail} 1000`,'stroke-dashoffset':tail});
      packet.append(path);tracks.push({path,tail,length});
    }
    group.append(packet);
  });
});
const diagrams = root.querySelector('.surface-diagrams');
let animations=[],generation=0;
const clear = () => {
  generation++;
  animations.forEach(animation=>animation.cancel());animations=[];
};
const finish = () => {
  clear();
  root.dataset.playing='false';
  root.dataset.phase='complete';
  diagrams.removeAttribute('aria-busy');
  status.textContent='播放完成，可重播追蹤亮光的完整路徑。';
  button.querySelector('.surface-play-label').textContent='重播光路';
};
const play = () => {
  clear();
  const token=generation;
  root.dataset.playing='true';
  root.dataset.phase='running';
  root.dataset.motion=reducedMotion.matches?'reduced':'full';
  diagrams.setAttribute('aria-busy','true');
  status.textContent='亮光正沿光路前進，碰到表面後接著反射。';
  button.querySelector('.surface-play-label').textContent='重新播放';
  button.querySelector('.surface-play-icon').textContent='↻';
  // Playback is manual in both preferences. Reduced motion uses a slower,
  // gentler single pass, rather than replacing the requested motion with slides.
  const duration=reducedMotion.matches?4200:3400;
  const options={duration,fill:'both',easing:'linear'};
  const started=document.timeline.currentTime;
  for (const {path,tail,length} of tracks) {
    const animation=path.animate([
      {strokeDashoffset:String(tail)},
      {strokeDashoffset:String(tail-length-TAIL)}
    ],options);
    animation.startTime=started;animations.push(animation);
  }
  Promise.all(animations.map(animation=>animation.finished)).then(()=>{
    if (generation===token) finish();
  }).catch(error=>{if(error.name!=='AbortError') throw error;});
};
// A stationary touch release also handles browsers that omit the compatibility
// click after dragging the 3D canvas. Ignore scrolling and duplicate clicks.
let touch = null, handledTouch = false;
button.addEventListener('pointerdown',event => {
  handledTouch = false;
  touch = event.pointerType === 'touch' && event.isPrimary ? {id:event.pointerId,x:event.clientX,y:event.clientY,moved:false} : null;
});
button.addEventListener('pointermove',event => {
  if (touch?.id === event.pointerId && Math.hypot(event.clientX-touch.x,event.clientY-touch.y)>8) touch.moved = true;
});
button.addEventListener('pointercancel',() => { touch=null; handledTouch=false; });
button.addEventListener('pointerup',event => {
  const contact=touch; touch=null;
  if (!contact || contact.id!==event.pointerId || contact.moved) return;
  const r=button.getBoundingClientRect();
  if (event.clientX<r.left || event.clientX>r.right || event.clientY<r.top || event.clientY>r.bottom) return;
  handledTouch=true; play();
});
button.addEventListener('click',event => {
  if (handledTouch && (event.pointerType==='touch' || event.detail>0)) { handledTouch=false; return; }
  play();
});
root.addEventListener('keydown',event => {
  if(event.key==='Escape' && root.dataset.playing==='true') { event.preventDefault();finish(); }
});
reducedMotion.addEventListener('change',() => {
  const motion=reducedMotion.matches?'reduced':'full';
  // A queued preference event must not cancel a new playback which already
  // started using that preference. Only stop a genuinely mismatched playback.
  if(root.dataset.playing==='true' && root.dataset.motion!==motion) finish();
});
window.addEventListener('pagehide',() => { if(root.dataset.playing==='true') finish(); else clear(); });
root.dataset.phase = 'idle';
button.disabled = false;
root.dataset.ready = 'true';
