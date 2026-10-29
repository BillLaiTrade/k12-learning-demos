import { initialConduction, advanceConduction, conductionSample } from './conduction-model.mjs?v=pan-handles-1';

const root = document.getElementById('conduction-lab');
if (root) {
  const $ = id => document.getElementById(id);
  const handles = [...root.querySelectorAll('[data-handle]')];
  const pulses = [...root.querySelectorAll('.conduction-pulse')];
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const state = { material: 'metal', temperatures: initialConduction(), elapsed: 0, playing: false, started: false, flow: 0 };
  let frame = 0, previous = null, lastPaint = null, drag = null, suppressClickUntil = 0;
  let hasViewed = false;

  function setText(id, value) { if ($(id).textContent !== value) $(id).textContent = value; }
  function render() {
    const sample = conductionSample(state.temperatures, state.material);
    const phase = !state.started ? 'ready' : !state.playing ? 'paused' : sample.steady ? 'steady' : 'heating';
    Object.assign(root.dataset, { material: state.material, playing: String(state.playing), started: String(state.started), phase, elapsed: String(state.elapsed), temperatureBody: String(sample.body), temperatureJoint: String(sample.joint), temperatureTip: String(sample.tip), dragging: String(Boolean(drag?.moved)) });
    for (const key of ['body', 'joint', 'tip']) setText(`conduction-temp-${key}`, `${sample[key].toFixed(1)}°C`);
    setText('conduction-readings', `鍋身 ${sample.body.toFixed(1)}°C、把手的金屬接頭 ${sample.joint.toFixed(1)}°C、握柄遠端 ${sample.tip.toFixed(1)}°C。`);
    setText('conduction-status', phase === 'ready' ? '準備觀察：三處初溫皆為 25°C。' : phase === 'paused' ? '觀察已暫停；繼續後讀數與光跡一同恢復。' : sample.steady ? '持續加熱下，溫度變化趨緩；熱仍沿把手傳遞，也持續散到環境。' : state.material === 'wood' ? '木柄遠端升溫較慢；靠近熱鍋的金屬接頭仍會變熱。' : '鍋底持續受熱，觀察三個位置升溫的先後。');
    setText('conduction-play', state.playing ? '暫停觀察' : state.started ? '繼續觀察' : '開始觀察');
    $('conduction-play').setAttribute('aria-pressed', String(state.playing));
    $('conduction-flow').toggleAttribute('hidden', sample.jointFlux < .015);
    for (const pulse of pulses) {
      const offset = (state.flow + Number(pulse.dataset.offset)) % 70;
      pulse.setAttribute('transform', `translate(${548 + offset},${449 - offset * .32}) rotate(-18)`);
      pulse.style.opacity = String(Math.min(1, offset / 8, (70 - offset) / 8));
    }
  }
  function stop() { cancelAnimationFrame(frame); frame = 0; previous = null; lastPaint = null; }
  function tick(now) {
    const dt = previous === null ? 0 : Math.max(0, Math.min(.05, (now - previous) / 1000));
    previous = now;
    state.elapsed += dt;
    state.temperatures = advanceConduction(state.temperatures, state.material, dt * 3);
    state.flow += dt * (motion.matches ? 22 : 40);
    if (lastPaint === null || now - lastPaint >= 32) { render(); lastPaint = now; }
    if (state.playing) frame = requestAnimationFrame(tick); else stop();
  }
  function start() { state.started = true; state.playing = true; if (!frame) frame = requestAnimationFrame(tick); render(); }
  function clearDrag() {
    if (drag) {
      const { button, pointerId, ghost } = drag;
      drag = null;
      ghost?.remove();
      if (button.hasPointerCapture(pointerId)) button.releasePointerCapture(pointerId);
    }
    root.dataset.dropValid = 'false';
    root.dataset.dragging = 'false';
  }
  function reset() {
    clearDrag(); stop(); state.temperatures = initialConduction(); state.elapsed = 0; state.flow = 0;
    state.started = false; state.playing = false;
    if (hasViewed && !document.hidden) start(); else render();
  }
  function selectMaterial(material) {
    if (material === state.material) { if (!state.playing && !document.hidden) start(); return; }
    state.material = material;
    const path = `assets/conduction-${material}.webp`;
    $('conduction-scene').src = path;
    $('conduction-scene').alt = `鍋底在電熱板上受熱，${material === 'wood' ? '木製' : '金屬'}握柄伸在加熱區外；三個接觸式探頭連到讀數器。`;
    root.querySelector('.conduction-detail-image').setAttribute('href', path);
    setText('conduction-material-label', material === 'wood' ? '木柄・金屬接頭' : '金屬柄');
    setText('conduction-tip-note', material === 'wood' ? '木材也傳熱，遠端變化比金屬柄慢。' : '熱再沿把手向外傳遞。');
    handles.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.handle === material)));
    reset();
  }
  function validDrop(x, y) {
    const box = $('conduction-apparatus').getBoundingClientRect();
    // A generous target around the actual collar and proximal grip, not the whole picture.
    const nx = (x - box.left) / box.width, ny = (y - box.top) / box.height;
    return nx >= .40 && nx <= .70 && ny >= .34 && ny <= .59;
  }
  handles.forEach(button => {
    button.addEventListener('click', event => {
      if (event.detail > 0 && performance.now() < suppressClickUntil) { event.preventDefault(); return; }
      selectMaterial(button.dataset.handle);
    });
    button.addEventListener('pointerdown', event => {
      if (!event.isPrimary || event.button !== 0 || drag) return;
      drag = { button, pointerId: event.pointerId, x: event.clientX, y: event.clientY, moved: false, ghost: null };
      button.setPointerCapture(event.pointerId);
    });
    button.addEventListener('pointermove', event => {
      if (!drag || drag.pointerId !== event.pointerId) return;
      if (!drag.moved && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 6) {
        drag.moved = true;
        const ghost = document.createElement('div'); ghost.className = 'conduction-drag-ghost'; ghost.setAttribute('aria-hidden', 'true');
        ghost.append(button.querySelector('svg').cloneNode(true)); document.body.append(ghost); drag.ghost = ghost;
      }
      if (!drag.moved) return;
      event.preventDefault();
      drag.ghost.style.left = `${event.clientX}px`; drag.ghost.style.top = `${event.clientY}px`;
      root.dataset.dragging = 'true'; root.dataset.dropValid = String(validDrop(event.clientX, event.clientY));
    });
    button.addEventListener('pointerup', event => {
      if (!drag || drag.pointerId !== event.pointerId) return;
      const moved = drag.moved, valid = validDrop(event.clientX, event.clientY), material = button.dataset.handle;
      if (moved) suppressClickUntil = performance.now() + 450;
      clearDrag(); if (moved && valid) selectMaterial(material);
    });
    for (const type of ['pointercancel', 'lostpointercapture']) button.addEventListener(type, () => { if (drag?.button === button) { suppressClickUntil = performance.now() + 450; clearDrag(); } });
  });
  $('conduction-play').addEventListener('click', () => { if (state.playing) { state.playing = false; stop(); render(); } else start(); });
  $('conduction-reset').addEventListener('click', reset);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { if (drag?.moved) suppressClickUntil = performance.now() + 450; clearDrag(); state.playing = false; stop(); render(); } });
  const observer = new IntersectionObserver(entries => {
    if (!hasViewed && entries.some(entry => entry.isIntersecting) && !document.hidden) { hasViewed = true; start(); observer.disconnect(); }
  }, { threshold: .22 });
  observer.observe(root);
  // Warm the alternative texture before the first material change.
  const preload = new Image(); preload.src = 'assets/conduction-wood.webp';
  render();
}
