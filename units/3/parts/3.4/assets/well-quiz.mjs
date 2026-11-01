import {wellQuestion, nextWell, gradeWell} from './well-model.mjs?v=20261101-well';

export function bindWellQuiz(claim, release) {
  const $ = id => document.getElementById(id), root = $('well'), form = $('well-form');
  const call = $('well-call'), person = $('well-person'), change = $('well-new'), input = $('well-depth');
  let question = wellQuestion(), phase = 'ready', observed = false, elapsed = 0, epoch = 0, raf = 0;
  let context, pendingBuffer, buffer, startAt = 0, sources = [], master;
  const api = {id: 'well', pause: interrupt};
  const time = n => n.toFixed(2);

  function silence() {
    const owned = sources.length > 0 || ['preparing', 'playing'].includes(phase);
    epoch++; cancelAnimationFrame(raf);
    for (const node of sources) { try { node.stop(); } catch {} node.disconnect(); }
    sources = []; master?.disconnect(); master = null;
    if (owned) document.body.dataset.audioPlaying = 'false';
  }
  function clearResult() {
    $('well-feedback').textContent = ''; $('well-feedback').dataset.result = 'ready';
  }
  function draw() {
    root.dataset.phase = phase; root.dataset.observed = String(observed);
    root.dataset.elapsed = elapsed.toFixed(3); root.dataset.returnTime = String(question.time);
    const received = phase === 'complete' || (phase === 'playing' && elapsed >= question.time);
    $('well-start').textContent = observed || phase === 'playing' ? '0.00 秒' : '—';
    $('well-end').textContent = received || observed ? `${time(question.time)} 秒` : '—';
    $('well-time').textContent = received || observed ? time(question.time) : '—';
    const busy = phase === 'preparing' || phase === 'playing';
    call.disabled = busy; person.disabled = busy;
    call.textContent = phase === 'preparing' ? '正在準備喊聲…' : phase === 'playing' ? '聆聽回聲中…' : observed ? '再喊一次' : '朝井底喊一聲';
    $('well-check').disabled = busy;
    $('well-bubble').hidden = !(phase === 'playing' && elapsed >= 0 && elapsed < buffer.duration);
    $('well-status').textContent = phase === 'preparing' ? '正在準備小葵的喊聲…' : phase === 'playing' ? elapsed < question.time ? '聽聽看，聲音何時從井底回來？' : '井底回聲已返回。' : observed ? '已取得回聲紀錄，試著估算井深。' : phase === 'interrupted' ? '本次喊聲已停止；請再喊一次，取得完整紀錄。' : '點小葵或按鈕，朝井底喊一聲。';
    let wave = '';
    if (phase === 'playing' && elapsed >= 0) {
      const returning = elapsed >= question.time;
      const age = returning ? elapsed - question.time : elapsed;
      if (age < (returning ? buffer.duration : Math.min(buffer.duration, question.time))) {
        const x = returning ? 590 : 450, y = returning ? 430 : 225;
        const shift = age / Math.max(.1, buffer.duration) * 35;
        wave = [0, 1, 2].map(i => {
          const r = 18 + i * 19 + shift;
          return `<path d="M${x-r*.5} ${y+r*.25} Q${x+r*.2} ${y+r} ${x+r*.7} ${y+r*.45}" fill="none" stroke="${returning?'#f1a34e':'#69bd7c'}" stroke-width="5" stroke-linecap="round" opacity="${.9-i*.18}"/>`;
        }).join('');
      }
    }
    $('well-waves').innerHTML = wave;
  }
  function interrupt() {
    if (!['preparing', 'playing'].includes(phase)) return;
    silence(); phase = 'interrupted'; elapsed = 0; observed = false;
    release(api); draw();
  }
  function tick() {
    elapsed = context.currentTime - startAt;
    if (elapsed >= question.time + buffer.duration + .12) {
      phase = 'complete'; observed = true; silence(); release(api); draw(); return;
    }
    draw(); raf = requestAnimationFrame(tick);
  }
  async function getBuffer() {
    if (buffer) return buffer;
    pendingBuffer ||= (async () => {
      const abort = new AbortController(), timer = setTimeout(() => abort.abort(), 8000);
      try {
        const response = await fetch(new URL('./well-call.wav?v=20261101-well', import.meta.url), {signal: abort.signal});
        if (!response.ok) throw Error('voice unavailable');
        return await context.decodeAudioData(await response.arrayBuffer());
      } finally { clearTimeout(timer); }
    })();
    try { buffer = await pendingBuffer; return buffer; } catch (error) { pendingBuffer = null; throw error; }
  }
  async function play() {
    if (['preparing', 'playing'].includes(phase)) return;
    claim(api); silence(); clearResult(); observed = false; elapsed = 0;
    phase = 'preparing'; $('well-error').hidden = true; draw(); const token = epoch;
    try {
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch {}
      const Audio = window.AudioContext || window.webkitAudioContext; context ||= new Audio();
      let timer;
      try { await Promise.race([context.resume(), new Promise((_, reject) => { timer = setTimeout(() => reject(Error('audio timeout')), 1800); })]); }
      finally { clearTimeout(timer); }
      if (context.state !== 'running') throw Error('audio inactive');
      if (token !== epoch) return;
      await getBuffer(); if (token !== epoch) return;
      master = context.createGain(); master.gain.value = .65; master.connect(context.destination);
      startAt = context.currentTime + .05;
      for (const [delay, level] of [[0, 1], [question.time, .45]]) {
        const node = context.createBufferSource(), gain = context.createGain();
        node.buffer = buffer; gain.gain.value = level; node.connect(gain); gain.connect(master);
        node.start(startAt + delay); sources.push(node);
      }
      phase = 'playing'; document.body.dataset.audioPlaying = 'true';
      root.dataset.emissions = String(Number(root.dataset.emissions || 0) + 1);
      draw(); raf = requestAnimationFrame(tick);
    } catch {
      if (token !== epoch) return;
      silence(); phase = 'ready'; release(api);
      $('well-error').textContent = '喊聲未能播放。請再試一次，並確認裝置與分頁未靜音。';
      $('well-error').hidden = false; draw();
    }
  }
  call.addEventListener('click', play); person.addEventListener('click', play);
  change.addEventListener('click', () => {
    if (['preparing', 'playing'].includes(phase)) interrupt();
    question = nextWell(question); silence(); release(api);
    phase = 'ready'; observed = false; elapsed = 0; input.value = ''; clearResult();
    $('well-error').hidden = true; draw();
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    const result = gradeWell(input.value, question, observed);
    $('well-feedback').dataset.result = result.result; $('well-feedback').textContent = result.message;
  });
  input.addEventListener('input', () => {
    clearResult(); $('well-feedback').dataset.result = 'pending';
    $('well-feedback').textContent = '填好後核對井深。';
  });
  draw(); return api;
}
