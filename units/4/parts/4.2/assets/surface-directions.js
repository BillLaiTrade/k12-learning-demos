import {surfaceDiagram} from './surface-directions.mjs?v=surfaces-experiment-20261105';

const root = document.querySelector('#surface-explanation');
const button = document.querySelector('#surface-play');
const status = document.querySelector('#surface-play-status');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
// Recompute every ray from its local facet; the static SVG remains readable
// when scripts are unavailable.
root.querySelectorAll('[data-surface]').forEach(panel => {
  const diagram = surfaceDiagram(panel.dataset.surface);
  const point = p => p.map(v => Number(v.toFixed(6))).join(' ');
  panel.querySelector('.surface-profile').setAttribute('d', `M${diagram.profile.map(point).join('L')}L520 174L40 174Z`);
  panel.querySelectorAll('[data-surface-ray]').forEach((group,index) => {
    const ray = diagram.rays[index], incoming = group.querySelector('.surface-incoming'), outgoing = group.querySelector('.surface-outgoing');
    incoming.setAttribute('d', `M${point(ray.start)}L${point(ray.hit)}`);
    outgoing.setAttribute('d', `M${point(ray.hit)}L${point(ray.end)}`);
    incoming.dataset.start = ray.start;
    incoming.dataset.hit = ray.hit;
    outgoing.dataset.end = ray.end;
    group.querySelector('.surface-contact').setAttribute('cx', ray.hit[0]);
    group.querySelector('.surface-contact').setAttribute('cy', ray.hit[1]);
  });
});
const svgNamespace = 'http://www.w3.org/2000/svg';
root.querySelectorAll('.surface-panel svg').forEach(svg => {
  const guides = document.createElementNS(svgNamespace, 'g');
  guides.setAttribute('aria-hidden', 'true');
  svg.querySelectorAll('.surface-incoming,.surface-outgoing').forEach(path => {
    const guide = document.createElementNS(svgNamespace, 'path');
    guide.setAttribute('d', path.getAttribute('d'));
    guide.setAttribute('class', 'surface-guide');
    guides.append(guide);
  });
  svg.querySelector('.surface-profile').after(guides);
});
const rays = [...root.querySelectorAll('[data-surface-ray]')].map(group => {
  const incoming = group.querySelector('.surface-incoming'), outgoing = group.querySelector('.surface-outgoing');
  const hit = incoming.dataset.hit.split(',').map(Number);
  const halo = document.createElementNS(svgNamespace, 'circle');
  halo.setAttribute('class', 'surface-contact-halo');
  halo.setAttribute('cx', hit[0]); halo.setAttribute('cy', hit[1]); halo.setAttribute('r', '11');
  group.querySelector('.surface-contact').before(halo);
  group.querySelector('.surface-contact').setAttribute('r', '4');
  group.querySelector('.surface-pulse').setAttribute('r', '7');
  return {
    start: incoming.dataset.start.split(',').map(Number), hit,
    end: outgoing.dataset.end.split(',').map(Number), incoming, outgoing,
    incomingLength: incoming.getTotalLength(), outgoingLength: outgoing.getTotalLength(),
    incomingMarker: incoming.getAttribute('marker-end'), outgoingMarker: outgoing.getAttribute('marker-end'),
    pulse: group.querySelector('.surface-pulse')
  };
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
let frame = 0;
const phase = value => {
  if (root.dataset.phase === value) return;
  root.dataset.phase = value;
  if (messages[value]) status.textContent = messages[value];
  const active = phases.indexOf(value);
  steps.forEach((step,index) => {
    if (step.dataset.step === value) step.setAttribute('aria-current','step');
    else step.removeAttribute('aria-current');
    step.dataset.done = String(value === 'complete' || (active >= 0 && index < active));
  });
};
const draw = (ray,kind,progress) => {
  const path = ray[kind], length = ray[kind+'Length'];
  path.style.strokeDasharray = String(length);
  path.style.strokeDashoffset = String(length * (1-progress));
  path.style.opacity = progress > 0 ? '1' : '0';
  path.setAttribute('marker-end', progress >= 1 ? ray[kind+'Marker'] : 'none');
};
const restore = () => {
  rays.forEach(ray => {
    for (const kind of ['incoming','outgoing']) {
      ray[kind].style.removeProperty('stroke-dasharray');
      ray[kind].style.removeProperty('stroke-dashoffset');
      ray[kind].style.removeProperty('opacity');
      ray[kind].setAttribute('marker-end',ray[kind+'Marker']);
    }
    ray.pulse.setAttribute('visibility','hidden');
  });
};
const finish = () => {
  cancelAnimationFrame(frame);
  restore();
  root.dataset.playing = 'false';
  diagrams.removeAttribute('aria-busy');
  phase('complete');
  button.querySelector('.surface-play-label').textContent = '重播光路';
};
const play = () => {
  cancelAnimationFrame(frame);
  root.dataset.playing = 'true';
  diagrams.setAttribute('aria-busy','true');
  button.querySelector('.surface-play-label').textContent = '重新播放';
  button.querySelector('.surface-play-icon').textContent = '↻';
  // Update immediately, even when reduced motion is enabled. That preference
  // uses three discrete visual stages, rather than silently skipping playback.
  root.dataset.phase = '';
  phase('incident');
  const reduced = reducedMotion.matches;
  rays.forEach(ray => {
    draw(ray,'incoming',reduced ? 1 : 0); draw(ray,'outgoing',0);
    ray.pulse.setAttribute('visibility','hidden');
  });
  const started = performance.now();
  let lastPhase = 'incident';
  const animate = now => {
    const elapsed = now-started;
    if (elapsed >= 2700) { finish(); return; }
    const current = elapsed < 1000 ? 'incident' : elapsed < 1500 ? 'contact' : 'reflected';
    phase(current);
    if (!reduced || current !== lastPhase) {
      const progress = current === 'incident' ? Math.min(1,elapsed/1000) : current === 'contact' ? 0 : Math.min(1,(elapsed-1500)/1200);
      rays.forEach(ray => {
        draw(ray,'incoming',current === 'incident' && !reduced ? progress : 1);
        draw(ray,'outgoing',current === 'reflected' ? (reduced ? 1 : progress) : 0);
        if (reduced) { ray.pulse.setAttribute('visibility','hidden'); return; }
        const from = current === 'incident' ? ray.start : ray.hit;
        const to = current === 'incident' || current === 'contact' ? ray.hit : ray.end;
        ray.pulse.setAttribute('cx',from[0]+(to[0]-from[0])*progress);
        ray.pulse.setAttribute('cy',from[1]+(to[1]-from[1])*progress);
        ray.pulse.setAttribute('fill',current === 'reflected' ? '#16826c' : '#b98218');
        ray.pulse.setAttribute('visibility','visible');
      });
    }
    lastPhase = current;
    frame = requestAnimationFrame(animate);
  };
  frame = requestAnimationFrame(animate);
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
window.addEventListener('pagehide',() => { cancelAnimationFrame(frame); },{once:true});
root.dataset.phase = 'idle';
button.disabled = false;
root.dataset.ready = 'true';
