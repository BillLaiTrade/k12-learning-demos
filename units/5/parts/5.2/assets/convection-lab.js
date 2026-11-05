/* Qualitative natural-convection illustration, not a CFD or temperature model.
   One clock drives tracers, their relative warmth and the observation stages. */
(() => {
  'use strict';
  const root = document.getElementById('convection-lab');
  if (!root) return;
  const $ = id => document.getElementById(id);
  const play = $('convection-play');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const paths = ['left', 'right'].map(side => {
    const node = $(`convection-${side}`);
    return {node, length: node.getTotalLength()};
  });
  const tracers = [...root.querySelectorAll('[data-flow-particle]')].map(node => ({
    node, path: paths[node.dataset.flowParticle === 'left' ? 0 : 1],
    phase: Number(node.dataset.phase), arrow: node.querySelector('path'), dot: node.querySelector('circle')
  }));
  let medium = 'water', time = 0, playing = false, frame = 0, previous = null;
  const warm = [206, 100, 49], cool = [46, 130, 157];
  const copy = {
    water: {name:'水', scene:'水槽剖面', heater:'水槽底部局部受熱', hint:'沿著流動標記，觀察受熱處的水與周圍的水各往哪裡移動。'},
    air: {name:'空氣', scene:'房間剖面', heater:'暖氣機加熱附近的空氣', hint:'空氣本身看不見；沿著流動標記，觀察暖氣機附近與房間周圍的空氣。'}
  };
  // Avoid repeating live announcements on every animation frame.
  function setText(id, text) { const node = $(id); if (node.textContent !== text) node.textContent = text; }
  function render() {
    const text = copy[medium], started = time > 0 || playing;
    root.dataset.medium = medium;
    root.dataset.playing = String(playing);
    root.dataset.elapsed = time.toFixed(3);
    root.dataset.started = String(started);
    root.dataset.stage = !started ? 'ready' : time < 3 ? 'rising' : time < 12 ? 'circulating' : 'observed';
    $('convection-water-scene').toggleAttribute('hidden', medium !== 'water');
    $('convection-air-scene').toggleAttribute('hidden', medium !== 'air');
    setText('convection-scene-label', text.scene);
    setText('convection-heater-label', text.heater);
    setText('convection-hint', text.hint);
    $('convection-motion').setAttribute('opacity', started ? Math.min(1, .3 + time / 2) : '0');
    root.querySelectorAll('[data-medium]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.medium === medium)));
    tracers.forEach(({node, path, phase, dot, arrow}) => {
      const progress = (time / 12 + phase) % 1;
      const p = path.node.getPointAtLength(progress * path.length);
      const next = path.node.getPointAtLength((progress * path.length + 2) % path.length);
      const angle = Math.atan2(next.y - p.y, next.x - p.x) * 180 / Math.PI;
      // Relative warmth decreases along the upper/outside route and rises near the heater.
      // The color is a teaching key, never a measured temperature.
      const warmth = .5 + .5 * Math.cos(2 * Math.PI * (progress - .12));
      const color = `rgb(${cool.map((v, i) => Math.round(v + (warm[i] - v) * warmth)).join(',')})`;
      node.setAttribute('transform', `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)})`);
      dot.setAttribute('fill', color);
      arrow.setAttribute('stroke', color);
      arrow.setAttribute('transform', `rotate(${angle.toFixed(1)})`);
    });
    const stage = root.dataset.stage;
    setText('convection-step-1', !started ? '受熱處的流體會往哪裡動？' : `受熱的${text.name}膨脹，密度變小，逐漸上升。`);
    setText('convection-step-2', time < 3 ? '流到上方後，會往哪裡去？' : `較暖的${text.name}流向周圍，並向較冷的周圍散熱。`);
    setText('convection-step-3', time < 6 ? '周圍的流體會怎麼補入？' : `較冷、密度較大的${text.name}下沉，補入下方受熱處，形成循環。`);
    const note = !started ? `${text.heater}。開始觀察後，留意中央與兩側的流動方向。`
      : stage === 'rising' ? `先看受熱處：附近的${text.name}往上移動。`
      : `中央上升、向兩側流動、周圍下沉，再補入下方；流動的${text.name}也把能量帶到別處。`;
    setText('convection-note', note);
    setText('convection-status', !started ? '尚未開始' : playing ? '觀察進行中' : '觀察已暫停');
    setText('convection-play', playing ? '暫停觀察' : time > 0 ? '繼續觀察' : '開始觀察');
    play.setAttribute('aria-pressed', String(playing));
    $('convection-discovery').hidden = time < 12;
    $('convection-apparatus').setAttribute('aria-label', `${text.scene}：${text.heater}，${started ? '流動標記顯示中央上升、兩側下沉的自然對流示意。' : '尚未開始觀察。'}`);
  }
  function tick(now) {
    if (!playing) return;
    const dt = previous === null ? 0 : Math.max(0, Math.min(.05, (now - previous) / 1000));
    previous = now;
    time += dt * (reduced.matches ? .55 : 1);
    render();
    frame = requestAnimationFrame(tick);
  }
  function stop() {
    playing = false;
    cancelAnimationFrame(frame); frame = 0; previous = null;
    render();
  }
  function reset() { stop(); time = 0; render(); }
  play.addEventListener('click', () => {
    if (playing) { stop(); return; }
    playing = true; previous = null; render(); frame = requestAnimationFrame(tick);
  });
  $('convection-reset').addEventListener('click', reset);
  root.querySelectorAll('[data-medium]').forEach(button => button.addEventListener('click', () => {
    if (medium === button.dataset.medium) return;
    medium = button.dataset.medium; reset();
  }));
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  addEventListener('pagehide', stop);
  render();
})();
