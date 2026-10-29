import { balanceState, moveBlock, EQUILIBRIUM_SECONDS, MIN_OFFSET, MAX_OFFSET } from './balance-model.mjs?v=direct-drag-2';

const root = document.getElementById('balance-lab');
if (root) {
  const $ = id => document.getElementById(id);
  const pause = $('balance-pause');
  const svg = $('balance-apparatus');
  const state = { mode: 'different', elapsed: 0, started: false, playing: false, paused: false, positions: { a: -28, b: 28 } };
  const blocks = { a: $('balance-block-a'), b: $('balance-block-b') };
  const modes = [...root.querySelectorAll('[data-balance]')];
  const pulses = [...root.querySelectorAll('.balance-pulse')];
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  let previous = null;
  let drag = null;

  const outlines = {
    a: 'M3 0H14L16 2L14 4H3L1 2Z', b: 'M15 3L17 5V13L15 15L13 13V5Z',
    c: 'M15 16L17 18V26L15 28L13 26V18Z', d: 'M3 27H14L16 29L14 31H3L1 29Z',
    e: 'M2 16L4 18V26L2 28L0 26V18Z', f: 'M2 3L4 5V13L2 15L0 13V5Z',
    g: 'M3 13.5H14L16 15.5L14 17.5H3L1 15.5Z',
  };
  const lit = { 0: 'abcdef', 1: 'bc', 2: 'abdeg', 3: 'abcdg', 4: 'bcfg', 5: 'acdfg', 6: 'acdefg', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };

  function digits(id, value) {
    const element = $(id);
    const reading = value.toFixed(1);
    if (element.dataset.value === reading) return;
    element.dataset.value = reading;
    let advance = 0;
    const shapes = [];
    for (const character of reading) {
      if (character === '.') {
        shapes.push(`<circle cx="${advance + 1}" cy="29" r="1.65" fill="#2c3e30"/>`);
        advance += 6;
      } else {
        const segments = Object.entries(outlines).map(([name, path]) => `<path d="${path}" opacity="${lit[character].includes(name) ? 0.9 : 0.055}"/>`).join('');
        shapes.push(`<g transform="translate(${advance},0)" fill="#2b3e2e">${segments}</g>`);
        advance += 21;
      }
    }
    element.innerHTML = shapes.join('');
  }

  function render() {
    const sample = balanceState(state.mode, state.elapsed);
    const gap = state.positions.b - state.positions.a;
    const touching = gap === 0;
    if (sample.complete || !touching) state.playing = false;
    const phase = !state.started ? 'ready' : !touching ? 'separated' : sample.complete ? 'complete' : state.paused ? 'paused' : 'running';
    root.dataset.phase = phase;
    root.dataset.playing = String(state.playing);
    root.dataset.mode = state.mode;
    root.dataset.elapsed = String(state.elapsed);
    root.dataset.temperatureA = String(sample.a);
    root.dataset.temperatureB = String(sample.b);
    root.dataset.touching = String(touching);
    root.dataset.gap = String(gap);
    root.dataset.offsetA = String(state.positions.a);
    root.dataset.offsetB = String(state.positions.b);
    root.dataset.dragging = drag?.side || '';

    for (const side of ['a', 'b']) {
      const block = blocks[side];
      block.setAttribute('transform', `translate(${state.positions[side]},0)`);
      block.setAttribute('aria-valuemin', String(side === 'a' ? MIN_OFFSET : state.positions.a));
      block.setAttribute('aria-valuemax', String(side === 'a' ? state.positions.b : MAX_OFFSET));
      block.setAttribute('aria-valuenow', String(state.positions[side]));
      block.setAttribute('aria-valuetext', `${sample[side].toFixed(1)}°C，${touching ? '與另一塊貼合' : '與另一塊分開'}`);
    }
    $('balance-probe-leader').setAttribute('d', `M${352 + state.positions.a} 221L${345 + state.positions.a} 205H216`);
    $('balance-probe-dot').setAttribute('cx', String(352 + state.positions.a));
    digits('balance-digits-a', sample.a);
    digits('balance-digits-b', sample.b);
    $('balance-temp-a').textContent = `${sample.a.toFixed(1)}°C`;
    $('balance-temp-b').textContent = `${sample.b.toFixed(1)}°C`;
    svg.setAttribute('aria-label', `隔熱盒剖面。左右拖曳兩塊鋁塊，讓它們接觸或分開。鋁塊 A ${sample.a.toFixed(1)} 攝氏度，鋁塊 B ${sample.b.toFixed(1)} 攝氏度。${touching ? '兩塊直接接觸。' : '兩塊已分開。'}`);
    for (const glaze of root.querySelectorAll('.balance-glaze')) glaze.style.opacity = sample.complete || state.mode === 'same' ? '0' : '';
    for (const tint of root.querySelectorAll('[data-temperature-tint]')) {
      tint.setAttribute('fill', sample.complete || state.mode === 'same' ? '#d1d9d7' : tint.dataset.temperatureTint === 'a' ? '#e2cfb9' : '#b7d3d9');
    }

    const flow = $('balance-flow');
    flow.toggleAttribute('hidden', !touching || sample.complete);
    flow.setAttribute('transform', `translate(${state.positions.a},0)`);
    flow.style.opacity = String(sample.flowStrength);
    // Animate only short traces: no drawn rail, bridge or connecting rod.
    // Both preferences retain slow, essential direction movement; no flashing.
    const speed = motion.matches ? 13 : 26;
    for (const pulse of pulses) {
      const distance = (state.elapsed * speed + Number(pulse.dataset.offset)) % 112;
      pulse.setAttribute('transform', `translate(${402 + distance},${pulse.dataset.y})`);
      pulse.style.opacity = String(Math.min(1, distance / 10, (112 - distance) / 10));
    }

    let badge, note;
    if (phase === 'ready') {
      badge = '尚未接觸';
      note = '兩塊金屬尚未接觸，讀數維持初始溫度。';
    } else if (phase === 'separated') {
      badge = '兩塊已分開';
      note = '金屬已分開，保留目前溫度；再次貼合就接續觀察。';
    } else if (phase === 'paused') {
      badge = '觀察已暫停';
      note = '觀察已暫停；可繼續觀察，或直接拖曳金屬。';
    } else if (phase === 'complete') {
      badge = state.mode === 'same' ? '原本就同溫' : '同溫・熱平衡';
      note = state.mode === 'same' ? '原本就同溫，接觸後沒有淨熱傳遞。' : '同溫・熱平衡，兩者之間沒有淨熱傳遞。';
    } else {
      badge = '傳熱中';
      note = '兩塊金屬直接接觸，熱由 A 傳向 B，溫差逐漸縮小。';
    }
    if ($('balance-status-label').textContent !== badge) $('balance-status-label').textContent = badge;
    if ($('balance-note').textContent !== note) $('balance-note').textContent = note;
    $('balance-status-dot').setAttribute('fill', phase === 'complete' ? '#648858' : '#c38d42');
    for (const [key, trend] of [['a', '降溫中'], ['b', '升溫中']]) {
      const text = phase === 'ready' ? '初始溫度' : phase === 'paused' || phase === 'separated' ? '讀數維持' : phase === 'complete' ? state.mode === 'same' ? '溫度維持' : '溫度穩定' : trend;
      $('balance-trend-' + key).textContent = text;
    }
    pause.hidden = !state.started || !touching || sample.complete;
    pause.textContent = state.paused ? '繼續觀察' : '暫停觀察';
    pause.setAttribute('aria-pressed', String(state.paused));
    for (const button of modes) button.setAttribute('aria-pressed', String(button.dataset.balance === state.mode));
    $('balance-initial-note').textContent = state.mode === 'same' ? '初溫 A、B 都是 40°C。僅比較接觸傳熱，流光與時間為教學示意。' : '初溫 A 60°C、B 20°C。僅比較接觸傳熱，流光與時間為教學示意。';
    $('balance-observation-dialogue').textContent = state.mode === 'same' ? '兩塊原本就一樣暖，接觸後讀數也沒有改變！' : '熱的那塊降溫，冷的那塊升溫，最後兩邊的讀數一樣了！';
  }

  function tick(now) {
    const dt = previous === null ? 0 : Math.max(0, Math.min(0.05, (now - previous) / 1000));
    previous = now;
    state.elapsed = Math.min(EQUILIBRIUM_SECONDS, state.elapsed + dt);
    render();
    if (state.playing) frame = requestAnimationFrame(tick);
    else { frame = 0; previous = null; }
  }

  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    previous = null;
    state.playing = false;
  }

  function reset() {
    releaseDrag();
    stop();
    state.elapsed = 0;
    state.started = false;
    state.paused = false;
    state.positions = { a: -28, b: 28 };
    render();
  }

  function syncPlayback() {
    const canPlay = state.positions.a === state.positions.b && !state.paused && !balanceState(state.mode, state.elapsed).complete;
    if (!canPlay) stop();
    else if (!state.playing) {
      state.playing = true;
      previous = null;
      frame = requestAnimationFrame(tick);
    }
    render();
  }

  function move(side, offset) {
    state.positions = moveBlock(state.positions, side, offset);
    state.started = true;
    state.paused = false;
    syncPlayback();
  }

  function pointerX(event) {
    const matrix = svg.getScreenCTM();
    if (!matrix) return null;
    return new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse()).x;
  }

  function releaseDrag() {
    if (!drag) return;
    const active = drag;
    drag = null;
    if (blocks[active.side].hasPointerCapture(active.id)) blocks[active.side].releasePointerCapture(active.id);
  }

  for (const side of ['a', 'b']) {
    const block = blocks[side];
    block.addEventListener('pointerdown', event => {
      if (event.button !== 0 || !event.isPrimary || drag) return;
      const x = pointerX(event);
      if (x === null) return;
      event.preventDefault();
      block.focus({ preventScroll: true });
      drag = { side, id: event.pointerId, startX: x, startOffset: state.positions[side] };
      block.setPointerCapture(event.pointerId);
      render();
    });
    block.addEventListener('pointermove', event => {
      if (!drag || drag.side !== side || drag.id !== event.pointerId) return;
      const x = pointerX(event);
      if (x === null) return;
      event.preventDefault();
      const requested = drag.startOffset + x - drag.startX;
      move(side, requested);
      // Re-anchor at a hard boundary so reversing a held drag responds immediately.
      const collision = side === 'a' ? requested > state.positions.b : requested < state.positions.a;
      if (collision || requested < MIN_OFFSET || requested > MAX_OFFSET) {
        drag.startOffset = state.positions[side];
        drag.startX = x;
      }
    });
    const finish = event => {
      if (!drag || drag.side !== side || drag.id !== event.pointerId) return;
      releaseDrag();
      render();
    };
    block.addEventListener('pointerup', finish);
    block.addEventListener('pointercancel', finish);
    block.addEventListener('lostpointercapture', finish);
    block.addEventListener('keydown', event => {
      let offset;
      if (event.key === 'ArrowLeft') offset = state.positions[side] - (event.shiftKey ? 20 : 8);
      else if (event.key === 'ArrowRight') offset = state.positions[side] + (event.shiftKey ? 20 : 8);
      else if (event.key === 'Home') offset = side === 'a' ? MIN_OFFSET : MAX_OFFSET;
      else if (event.key === 'End') offset = state.positions[side === 'a' ? 'b' : 'a'];
      else return;
      event.preventDefault();
      move(side, offset);
    });
  }

  pause.addEventListener('click', () => {
    state.paused = !state.paused;
    syncPlayback();
  });
  $('balance-reset').addEventListener('click', reset);
  for (const button of modes) button.addEventListener('click', () => {
    state.mode = button.dataset.balance;
    reset();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      releaseDrag();
      if (state.playing) { state.paused = true; stop(); }
      render();
    }
  });
  render();
}
