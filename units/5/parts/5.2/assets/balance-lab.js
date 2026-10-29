import { balanceState, advanceBalance, initialTemperatures, moveBlock, ROOM_C, MIN_OFFSET, MAX_OFFSET } from './balance-model.mjs?v=ambient-exchange-3';

const root = document.getElementById('balance-lab');
if (root) {
  const $ = id => document.getElementById(id);
  const pause = $('balance-pause');
  const svg = $('balance-apparatus');
  const state = { mode: 'different', temperatures: initialTemperatures(), elapsed: 0, started: false, playing: false, paused: false, positions: { a: -28, b: 28 } };
  const blocks = { a: $('balance-block-a'), b: $('balance-block-b') };
  const modes = [...root.querySelectorAll('[data-balance]')];
  const pulses = [...root.querySelectorAll('.balance-pulse')];
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  let previous = null;
  let drag = null;
  let hasViewed = false;
  let lastPaint = null;

  function text(id, value) {
    if ($(id).textContent !== value) $(id).textContent = value;
  }

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
    const gap = state.positions.b - state.positions.a;
    const sample = balanceState(state.temperatures, gap);
    const touching = gap === 0;
    if (sample.complete) state.playing = false;
    const phase = !state.started ? 'ready' : sample.complete ? 'complete' : state.paused ? 'paused' : !touching ? 'separated' : sample.pairClose ? 'ambient' : 'running';
    root.dataset.phase = phase;
    root.dataset.playing = String(state.playing);
    root.dataset.mode = state.mode;
    root.dataset.elapsed = String(state.elapsed);
    root.dataset.started = String(state.started);
    root.dataset.environment = String(ROOM_C);
    root.dataset.pairClose = String(sample.pairClose);
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
    text('balance-temp-a', `${sample.a.toFixed(1)}°C`);
    text('balance-temp-b', `${sample.b.toFixed(1)}°C`);
    svg.setAttribute('aria-label', `室溫 ${ROOM_C} 攝氏度的隔熱盒剖面。左右拖曳兩塊鋁塊，讓它們接觸或分開。鋁塊 A ${sample.a.toFixed(1)} 攝氏度，鋁塊 B ${sample.b.toFixed(1)} 攝氏度。${touching ? '兩塊直接接觸。' : '兩塊已分開，仍與環境交換熱。'}`);
    for (const side of ['a', 'b']) {
      for (const glaze of blocks[side].querySelectorAll('.balance-glaze')) {
        glaze.setAttribute('fill', `url(#eq-${sample[side] >= ROOM_C ? 'warm' : 'cool'}-glaze)`);
        glaze.style.opacity = String(Math.min(1, Math.abs(sample[side] - ROOM_C) / 35));
      }
    }
    for (const tint of root.querySelectorAll('[data-temperature-tint]')) {
      const value = sample[tint.dataset.temperatureTint];
      const neutral = [209, 217, 215], target = value >= ROOM_C ? [226, 207, 185] : [183, 211, 217];
      const strength = Math.min(1, Math.abs(value - ROOM_C) / 35);
      tint.setAttribute('fill', `rgb(${neutral.map((v, i) => Math.round(v + (target[i] - v) * strength)).join(',')})`);
    }

    const flow = $('balance-flow');
    flow.toggleAttribute('hidden', !touching || sample.pairClose);
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
      note = '室溫 25°C；兩塊金屬分開時，也會和周圍交換熱。';
    } else if (phase === 'separated') {
      badge = '與環境交換熱';
      note = '兩塊已分開，溫度仍緩慢變化，逐漸接近 25°C 室溫。';
    } else if (phase === 'paused') {
      badge = '觀察已暫停';
      note = '觀察已暫停；可繼續觀察，或直接拖曳金屬。';
    } else if (phase === 'complete') {
      badge = '整體熱平衡';
      note = '兩塊皆為 25.0°C，與室溫相同，達到整體熱平衡。';
    } else if (phase === 'ambient') {
      badge = '持續接近室溫';
      note = '兩塊溫度已接近，仍會和 25°C 的室內環境交換熱。';
    } else {
      badge = '接觸傳熱中';
      note = '直接接觸使彼此傳熱較快，同時也持續和室內環境交換熱。';
    }
    if ($('balance-status-label').textContent !== badge) $('balance-status-label').textContent = badge;
    if ($('balance-note').textContent !== note) $('balance-note').textContent = note;
    $('balance-status-dot').setAttribute('fill', phase === 'complete' ? '#648858' : '#c38d42');
    for (const [key, rate] of [['a', sample.rateA], ['b', sample.rateB]]) {
      const trend = phase === 'ready' ? '初始溫度' : phase === 'paused' ? '讀數暫停' : phase === 'complete' ? '溫度穩定' : Math.abs(rate) < 0.003 ? '變化緩慢' : rate > 0 ? '升溫中' : '降溫中';
      text('balance-trend-' + key, trend);
    }
    pause.hidden = !state.started || sample.complete;
    pause.textContent = state.paused ? '繼續觀察' : '暫停觀察';
    pause.setAttribute('aria-pressed', String(state.paused));
    for (const button of modes) button.setAttribute('aria-pressed', String(button.dataset.balance === state.mode));
    text('balance-initial-note', state.mode === 'same' ? '初溫 A、B 都是 40°C，室溫 25°C。時間與傳熱速度為教學示意。' : '初溫 A 60°C、B 20°C，室溫 25°C。時間與傳熱速度為教學示意。');
    text('balance-observation-dialogue', state.mode === 'same' ? '它們原本都是 40°C，雖然一樣暖，還是一起慢慢變涼了！' : '原來拉開後溫度還會慢慢變；貼合時，兩塊就更快變得一樣暖！');
  }

  function tick(now) {
    const dt = previous === null ? 0 : Math.max(0, Math.min(0.05, (now - previous) / 1000));
    previous = now;
    state.elapsed += dt;
    state.temperatures = advanceBalance(state.temperatures, state.positions.b - state.positions.a, dt);
    // Continuous environmental drift needs only 30 visual updates per second.
    if (lastPaint === null || now - lastPaint >= 32 || balanceState(state.temperatures, state.positions.b - state.positions.a).complete) {
      render();
      lastPaint = now;
    }
    if (state.playing) frame = requestAnimationFrame(tick);
    else { frame = 0; previous = null; }
  }

  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    previous = null;
    lastPaint = null;
    state.playing = false;
  }

  function reset() {
    releaseDrag();
    stop();
    state.elapsed = 0;
    state.temperatures = initialTemperatures(state.mode);
    state.started = hasViewed;
    state.paused = false;
    state.positions = { a: -28, b: 28 };
    syncPlayback();
  }

  function syncPlayback() {
    const canPlay = state.started && !state.paused && !balanceState(state.temperatures, state.positions.b - state.positions.a).complete;
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
    hasViewed = true;
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
  const observer = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= 0.2)) return;
    hasViewed = true;
    state.started = true;
    syncPlayback();
    observer.disconnect();
  }, { threshold: 0.2 });
  observer.observe(root);
}
