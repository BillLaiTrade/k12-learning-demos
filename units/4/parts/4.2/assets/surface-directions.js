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
// Static paths are the accessible, no-script diagram. Prepare native animation
// tracks once: no path, dash, marker or particle writes during animation frames.
root.querySelectorAll('[data-surface]').forEach(panel => {
  const diagram = surfaceDiagram(panel.dataset.surface);
  const point = p => p.map(v => Number(v.toFixed(6))).join(' ');
  panel.querySelectorAll('[data-surface-ray]').forEach((group,index) => {
    const ray = diagram.rays[index];
    for (const [kind,start,end] of [['incoming',ray.start,ray.hit],['outgoing',ray.hit,ray.end]]) {
      const path = group.querySelector('.surface-'+kind);
      path.setAttribute('d',`M${point(start)}L${point(end)}`);
      const dx=end[0]-start[0],dy=end[1]-start[1],length=Math.hypot(dx,dy);
      const track = create('g',{class:'surface-native-track surface-native-'+kind,'aria-hidden':'true',transform:`translate(${start}) rotate(${Math.atan2(dy,dx)*180/Math.PI})`});
      const line = create('path',{class:'surface-native-line',d:`M0 0H${length}`});
      const tip = create('path',{class:'surface-native-tip',d:'M0 0L-21 -10.5L-16.1 0L-21 10.5Z'});
      track.append(line,tip);group.querySelector('.surface-contact').before(track);
      tracks.push({kind,line,tip,length});
    }
    const halo=create('circle',{class:'surface-contact-halo',cx:ray.hit[0],cy:ray.hit[1],r:12});
    group.querySelector('.surface-contact').before(halo);
  });
});
const diagrams = root.querySelector('.surface-diagrams');
const steps = [...root.querySelectorAll('[data-step]')];
const phases = ['incident','contact','reflected'];
const messages = {
  incident: '光線入射：兩側使用相同方向的入射光。',
  contact: '接觸表面：觀察各接觸點的表面朝向。',
  reflected: '光線反射：比較兩側反射方向的分布。',
  complete: '播放完成，可重播比較兩側反射方向。'
};
const phase = value => {
  root.dataset.phase=value;
  status.textContent=messages[value];
  const active=phases.indexOf(value);
  steps.forEach((step,index) => {
    if (step.dataset.step===value) step.setAttribute('aria-current','step');
    else step.removeAttribute('aria-current');
    step.dataset.done=String(value==='complete' || (active>=0 && index<active));
  });
};
let animations=[],timers=[],generation=0;
const clear = () => {
  generation++;
  timers.forEach(clearTimeout);timers=[];
  animations.forEach(animation=>animation.cancel());animations=[];
};
const finish = () => {
  clear();
  root.dataset.playing='false';
  diagrams.removeAttribute('aria-busy');
  phase('complete');
  button.querySelector('.surface-play-label').textContent='重播光路';
};
const play = () => {
  clear();
  const token=generation;
  root.dataset.playing='true';
  root.dataset.motion=reducedMotion.matches?'reduced':'full';
  diagrams.setAttribute('aria-busy','true');
  button.querySelector('.surface-play-label').textContent='重新播放';
  button.querySelector('.surface-play-icon').textContent='↻';
  phase('incident');
  timers.push(setTimeout(()=>phase('contact'),1000),setTimeout(()=>phase('reflected'),1500));
  if (reducedMotion.matches) {
    // Discrete, visible stages; no moving/scaling geometry in this preference.
    timers.push(setTimeout(finish,2700));
    return;
  }
  const started=document.timeline.currentTime;
  for (const {kind,line,tip,length} of tracks) {
    const incoming=kind==='incoming',from=incoming?0:1500/2700,to=incoming?1000/2700:1;
    const frames=(first,last)=>[
      {transform:first,offset:0},
      ...(!incoming?[{transform:first,offset:from}]:[]),
      {transform:last,offset:to},
      ...(incoming?[{transform:last,offset:1}]:[])
    ];
    const options={duration:2700,fill:'both',easing:'linear'};
    const grow=line.animate(frames('scaleX(0)','scaleX(1)'),options);
    const travel=tip.animate(frames('translateX(0px)',`translateX(${length}px)`),options);
    grow.startTime=started;travel.startTime=started;
    animations.push(grow,travel);
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
reducedMotion.addEventListener('change',() => { if(root.dataset.playing==='true') finish(); });
window.addEventListener('pagehide',() => { if(root.dataset.playing==='true') finish(); else clear(); });
root.dataset.phase = 'idle';
button.disabled = false;
root.dataset.ready = 'true';
