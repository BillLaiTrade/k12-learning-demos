import { balanceState, EQUILIBRIUM_SECONDS } from './balance-model.mjs?v=contact-face-1';

const root = document.getElementById('balance-lab');
if (root) {
  const $ = id => document.getElementById(id);
  const play = $('balance-play');
  const state = { mode: 'different', elapsed: 0, started: false, playing: false };
  const modes = [...root.querySelectorAll('[data-balance]')];
  const pulses = [...root.querySelectorAll('.balance-pulse')];
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  let previous = null;

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
    if (sample.complete) state.playing = false;
    const phase = !state.started ? 'ready' : sample.complete ? 'complete' : !state.playing ? 'paused' : sample.touching ? 'running' : 'contacting';
    root.dataset.phase = phase;
    root.dataset.playing = String(state.playing);
    root.dataset.mode = state.mode;
    root.dataset.elapsed = String(state.elapsed);
    root.dataset.temperatureA = String(sample.a);
    root.dataset.temperatureB = String(sample.b);
    root.dataset.touching = String(sample.touching);
    root.dataset.gap = String(sample.gap);

    $('balance-block-a').setAttribute('transform', `translate(${-sample.gap},0)`);
    $('balance-block-b').setAttribute('transform', `translate(${sample.gap},0)`);
    $('balance-probe-leader').setAttribute('d', `M${352 - sample.gap} 221L${345 - sample.gap} 205H216`);
    $('balance-probe-dot').setAttribute('cx', String(352 - sample.gap));
    digits('balance-digits-a', sample.a);
    digits('balance-digits-b', sample.b);
    $('balance-temp-a').textContent = `${sample.a.toFixed(1)}°C`;
    $('balance-temp-b').textContent = `${sample.b.toFixed(1)}°C`;
    $('balance-apparatus').setAttribute('aria-label', `隔熱盒剖面。相同材質、相同質量的鋁塊 A ${sample.a.toFixed(1)} 攝氏度，鋁塊 B ${sample.b.toFixed(1)} 攝氏度。${sample.touching ? '兩塊直接接觸。' : '兩塊尚未接觸。'}`);
    for (const glaze of root.querySelectorAll('.balance-glaze')) glaze.style.opacity = sample.complete || state.mode === 'same' ? '0' : '';
    for (const tint of root.querySelectorAll('[data-temperature-tint]')) {
      tint.setAttribute('fill', sample.complete || state.mode === 'same' ? '#d1d9d7' : tint.dataset.temperatureTint === 'a' ? '#e2cfb9' : '#b7d3d9');
    }

    const flow = $('balance-flow');
    flow.toggleAttribute('hidden', !sample.flow);
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
      badge = '準備接觸';
      note = '兩塊金屬尚未接觸，準備開始觀察。';
    } else if (phase === 'contacting') {
      badge = '正在接觸';
      note = '兩塊金屬正在靠攏，接觸後開始觀察熱傳遞。';
    } else if (phase === 'paused') {
      badge = '觀察已暫停';
      note = sample.touching ? '觀察已暫停，兩塊金屬仍保持接觸。' : '觀察已暫停，兩塊金屬尚未接觸。';
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
      const text = phase === 'ready' || phase === 'contacting' ? '初始溫度' : phase === 'paused' ? '目前讀數' : phase === 'complete' ? state.mode === 'same' ? '溫度維持' : '溫度穩定' : trend;
      $('balance-trend-' + key).textContent = text;
    }
    play.textContent = !state.started ? '讓它們接觸' : sample.complete ? '重新觀察' : state.playing ? 'Ⅱ　暫停觀察' : '繼續觀察';
    play.setAttribute('aria-pressed', String(state.playing));
    for (const button of modes) button.setAttribute('aria-pressed', String(button.dataset.balance === state.mode));
    $('balance-initial-note').textContent = state.mode === 'same' ? '初溫 A、B 都是 40°C。流光與時間為教學示意。' : '初溫 A 60°C、B 20°C。流光與時間為教學示意。';
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
    stop();
    state.elapsed = 0;
    state.started = false;
    render();
  }

  play.addEventListener('click', () => {
    if (state.playing) { stop(); render(); return; }
    if (balanceState(state.mode, state.elapsed).complete) reset();
    state.started = true;
    state.playing = true;
    render();
    previous = null;
    frame = requestAnimationFrame(tick);
  });
  $('balance-reset').addEventListener('click', reset);
  for (const button of modes) button.addEventListener('click', () => {
    state.mode = button.dataset.balance;
    reset();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.playing) { stop(); render(); }
  });
  render();
}
