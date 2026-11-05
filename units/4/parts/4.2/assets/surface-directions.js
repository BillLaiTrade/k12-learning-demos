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
const rays = [...root.querySelectorAll('[data-surface-ray]')].map(group => ({
  start: group.querySelector('.surface-incoming').dataset.start.split(',').map(Number),
  hit: group.querySelector('.surface-incoming').dataset.hit.split(',').map(Number),
  end: group.querySelector('.surface-outgoing').dataset.end.split(',').map(Number),
  pulse: group.querySelector('.surface-pulse')
}));
let frame = 0;
const stop = () => {
  cancelAnimationFrame(frame);
  rays.forEach(ray => ray.pulse.setAttribute('visibility', 'hidden'));
  root.dataset.playing = 'false';
  root.removeAttribute('aria-busy');
};
const play = () => {
  stop();
  button.querySelector('.surface-play-label').textContent = '重播光路';
  if (reducedMotion.matches) {
    status.textContent = '完整光路已顯示：光滑表面的反射方向較集中，粗糙表面的反射方向較分散。';
    return;
  }
  root.dataset.playing = 'true';
  root.setAttribute('aria-busy', 'true');
  status.textContent = '兩側的光同時射向表面。';
  const started = performance.now();
  let reflected = false;
  const animate = now => {
    const progress = Math.min(1, (now - started) / 1600);
    if (progress >= .5 && !reflected) {
      reflected = true;
      status.textContent = '光接觸表面，沿各處的反射方向離開。';
    }
    const t = progress < .5 ? progress * 2 : (progress - .5) * 2;
    rays.forEach(ray => {
      const from = progress < .5 ? ray.start : ray.hit;
      const to = progress < .5 ? ray.hit : ray.end;
      ray.pulse.setAttribute('cx', from[0] + (to[0] - from[0]) * t);
      ray.pulse.setAttribute('cy', from[1] + (to[1] - from[1]) * t);
      ray.pulse.setAttribute('fill', progress < .5 ? '#b98218' : '#16826c');
      ray.pulse.setAttribute('visibility', 'visible');
    });
    if (progress < 1) frame = requestAnimationFrame(animate);
    else {
      stop();
      status.textContent = '播放完成。光滑表面的反射方向較集中，粗糙表面的反射方向較分散。';
    }
  };
  frame = requestAnimationFrame(animate);
};
button.addEventListener('click', play);
reducedMotion.addEventListener('change', stop);
window.addEventListener('pagehide', stop, {once:true});
button.disabled = false;
root.dataset.ready = 'true';
