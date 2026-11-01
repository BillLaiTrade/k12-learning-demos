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
    $('well-reveal').hidden = true; $('well-reveal').innerHTML = '';
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
  function reveal() {
    const q = question, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    $('well-reveal').innerHTML = `<h3>一步一步，從回聲時間算出井深</h3>
      <ol class="well-steps" aria-label="井深計算的四個步驟">
        <li class="well-step">
          <h4><span class="well-step-number" aria-hidden="true">1</span><span>先看聲音往返花了多少時間</span></h4>
          <div class="well-overview"><div class="well-route"><svg viewBox="0 0 320 330" role="img" aria-label="聲音由井口到井底，再返回井口，往返共${time(q.time)}秒。"><path d="M65 45V285H235V45" fill="#e8e2d2" stroke="#8d927e" stroke-width="7"/><path d="M78 50V273H222V50" fill="#fffefa"/><path d="M105 65V270M195 270V65" stroke="#d9e4d5" stroke-width="3" stroke-dasharray="5 6"/><text x="93" y="28" font-size="16" fill="#344c3e">井口／發聲與接收</text><text x="40" y="160" text-anchor="middle" font-size="15" fill="#176b53">去程</text><text x="280" y="160" text-anchor="middle" font-size="15" fill="#ad6029">回程</text><text x="160" y="315" text-anchor="middle" font-size="17" fill="#344c3e">井底</text><circle cx="105" cy="65" r="10" fill="#388f62">${reduce?'':`<animateMotion dur="${q.time*5}s" path="M0 0 L0 205 L90 205 L90 0" fill="freeze"/>`}</circle><path d="M185 90q10-14 20 0m-20 12q10-14 20 0" fill="none" stroke="#c3752f" stroke-width="3"/></svg>
            <p class="well-slow">${reduce?'聲路示意':'5倍慢動作聲路示意'}；圖形不按實際比例繪製。</p>
          </div><div class="well-known-time"><span>去程和回程，總共花了</span><strong><span data-well-value="time">${time(q.time)}</span> 秒</strong><p>從喊聲開始，到井底回聲開始；這段時間包含去程與回程。</p></div></div>
        </li>
        <li class="well-step">
          <h4><span class="well-step-number" aria-hidden="true">2</span><span>先算聲音走過的總路程</span></h4>
          <p>每秒走 ${q.speed} 公尺，${time(q.time)} 秒共走多遠？</p>
          <strong class="well-equation">${q.speed} × ${time(q.time)} ＝ <span data-well-value="total">${q.depth*2}</span> 公尺</strong>
        </li>
        <li class="well-step">
          <h4><span class="well-step-number" aria-hidden="true">3</span><span>去程和回程一樣長，把總路程分成兩半</span></h4>
          <div class="well-lengths" role="img" aria-label="去程和回程各占一半，往返總路程${q.depth*2}公尺。"><div class="well-length-bar"><span class="well-leg well-leg--out">去程</span><span class="well-leg well-leg--back">回程</span></div><div class="well-bracket" aria-hidden="true"></div><p>往返總路程 <strong data-well-value="total">${q.depth*2}</strong> 公尺</p></div>
        </li>
        <li class="well-step">
          <h4><span class="well-step-number" aria-hidden="true">4</span><span>井深只取其中一段</span></h4>
          <p>從井口到井底，只有往返總路程的一半。</p>
          <strong class="well-equation">${q.depth*2} ÷ 2 ＝ <span data-well-value="depth">${q.depth}</span> 公尺</strong>
          <p class="well-final-answer">所以，這口井深 <strong>${q.depth} 公尺</strong>。</p>
        </li>
      </ol>`;
    $('well-reveal').hidden = false;
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
    if (['correct', 'wrong'].includes(result.result)) reveal();
  });
  input.addEventListener('input', () => {
    clearResult(); $('well-feedback').dataset.result = 'pending';
    $('well-feedback').textContent = '答案已修改，請重新核對。';
  });
  draw(); return api;
}
