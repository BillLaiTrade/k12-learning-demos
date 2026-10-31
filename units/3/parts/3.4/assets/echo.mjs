import {echo, wavePosition, arrivals, judge} from './echo-model.mjs';
import {renderReflection, REFLECTION_DURATION, REFLECTION_RETURN_TIME} from './reflection-lab.mjs';
import {renderDistance, bindDistanceWall, bindDistanceSpeakers, distanceDuration, distanceTaps} from './distance-lab.mjs?v=20261031-short-labels';
import {renderCalculation, bindCalculationInput, calculationTime, calculationDuration, calculationTaps} from './calculation-lab.mjs?v=20261031-calculation-lab';
const $ = id => document.getElementById(id), fmt = (n, digits = 2) => Number(n.toFixed(digits)).toString();
const panels = new Map();
let active = null, context = null, phrasePromise = null, sources = [], audioEpoch = 0, outputGain = null;
function audioError(panel, message = '') {
  if (['reflection', 'distance', 'calculation'].includes(panel.id)) {
    const error = $(`${panel.id}-error`); error.textContent = message; error.hidden = !message;
  } else if (message) $(`${panel.id}-status`).textContent = message;
}
// Keep the verified output level; learners adjust loudness on their own device.
const outputLevel = panel => ['reflection', 'distance', 'calculation'].includes(panel.id) ? .32 : .0448;
async function resumeAudio() {
  // On supported iOS browsers, use the playback session rather than the silent-mode session.
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch {}
  const Audio = window.AudioContext || window.webkitAudioContext;
  context ||= new Audio();
  let timer;
  try {
    await Promise.race([context.resume(), new Promise((_, reject) => {
      timer = setTimeout(() => reject(Error('audio resume timed out')), 1800);
    })]);
    if (context.state !== 'running') throw Error('audio output is not running');
  } finally { clearTimeout(timer); }
}
function stopSound() {
  audioEpoch++;
  for (const source of sources) { try { source.stop(); } catch {} }
  sources = [];
  outputGain?.disconnect(); outputGain = null;
  document.body.dataset.audioPlaying = 'false';
}
function stopActive() { if (active) active.pause(); stopSound(); }
async function sound(panel, elapsed = 0) {
  stopSound();
  audioError(panel);
  if (panel.sound && !panel.sound.checked) return;
  const epoch = audioEpoch;
  try {
    await resumeAudio();
    let buffer;
    if (panel.id === 'treatment') {
      phrasePromise ||= fetch(new URL('./room-phrase.wav', import.meta.url)).then(r => { if (!r.ok) throw Error('audio unavailable'); return r.arrayBuffer(); }).then(b => context.decodeAudioData(b));
      buffer = await phrasePromise;
    } else {
      buffer = context.createBuffer(1, Math.round(context.sampleRate * .09), context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.sin(2 * Math.PI * 650 * i / context.sampleRate) * Math.sin(Math.PI * i / data.length) ** 2;
    }
    if (epoch !== audioEpoch || panel.phase !== 'playing') return;
    const master = context.createGain();
    master.gain.value = outputLevel(panel); outputGain = master;
    master.connect(context.destination);
    const taps = panel.taps ? panel.taps() : panel.room ? arrivals(panel.mode(), panel.id === 'treatment' && panel.mode() === 'after') : [{delay: 0, gain: 1}, {delay: panel.duration() - .1, gain: .45}];
    for (const tap of taps) {
      const offset = Math.max(0, elapsed - tap.delay);
      if (offset >= buffer.duration) continue;
      const source = context.createBufferSource(), gain = context.createGain();
      source.buffer = buffer; gain.gain.value = tap.gain;
      source.connect(gain); gain.connect(master);
      source.start(context.currentTime + (['reflection', 'distance', 'calculation'].includes(panel.id) ? .04 : 0) + Math.max(0, tap.delay - elapsed), offset);
      sources.push(source);
      source.onended = () => { sources = sources.filter(s => s !== source); if (!sources.length) document.body.dataset.audioPlaying = 'false'; };
    }
    document.body.dataset.audioPlaying = sources.length ? 'true' : 'false';
  } catch {
    if (epoch !== audioEpoch) return;
    audioError(panel, '聲音未能啟用。請再次點擊播放；若仍無聲，請用瀏覽器開啟本頁，並確認裝置與分頁未靜音。');
  }
}
function player(id, render, duration, {room = false, mode = () => '', restartOnPlay = false, taps = null, onRestart = () => {}} = {}) {
  const root = $(id), play = document.querySelector(`[data-play="${id}"]`), reset = document.querySelector(`[data-reset="${id}"]`), soundBox = document.querySelector(`[data-sound="${id}"]`);
  const pauseButton = root.querySelector('[data-pause]');
  const p = {id, root, phase: 'ready', elapsed: 0, start: 0, raf: 0, render, duration, room, mode, taps, sound: soundBox};
  p.draw = () => { root.dataset.progress = fmt(p.elapsed / p.duration(), 4); render(Math.min(1, p.elapsed / p.duration())); };
  function phase(value) {
    p.phase = value; root.dataset.phase = value;
    if (!restartOnPlay) {
      play.setAttribute('aria-pressed', String(value === 'playing'));
      play.textContent = value === 'playing' ? '暫停' : value === 'paused' ? '繼續' : value === 'complete' ? '再觀察一次' : '播放觀察';
    }
    if (pauseButton) {
      pauseButton.disabled = value === 'ready' || value === 'complete';
      pauseButton.textContent = value === 'paused' ? '繼續' : '暫停';
      pauseButton.setAttribute('aria-label', value === 'paused' ? '繼續聲波觀察' : '暫停聲波觀察');
    }
    $(`${id}-status`).textContent = {ready: '準備好，可播放或直接比較；重來保留目前條件。', playing: '播放中，可暫停觀察。', paused: '已暫停，位置保留；繼續時接著播放。', complete: '本次觀察結束，可重看或改變條件。'}[value];
  }
  p.pause = () => { if (p.phase !== 'playing') return; p.elapsed = Math.min(p.duration(), (performance.now() - p.start) / 1000); cancelAnimationFrame(p.raf); phase('paused'); if (active === p) { active = null; stopSound(); } p.draw(); };
  p.reset = () => { p.pause(); p.elapsed = 0; phase('ready'); p.draw(); };
  function tick(now) {
    p.elapsed = Math.min(p.duration(), (now - p.start) / 1000); p.draw();
    if (p.elapsed >= p.duration()) { phase('complete'); if (active === p) {active = null; stopSound();} }
    else p.raf = requestAnimationFrame(tick);
  }
  p.play = (restart = false, selection) => {
    const newEmission = restart || p.phase === 'complete' || p.elapsed === 0;
    stopActive();
    if (newEmission) { p.elapsed = 0; onRestart(selection); }
    if (['reflection', 'distance', 'calculation'].includes(id) && newEmission) root.dataset.emissions = String(Number(root.dataset.emissions) + 1);
    active = p; p.start = performance.now() - p.elapsed * 1000;
    phase('playing'); p.draw(); sound(p, p.elapsed); p.raf = requestAnimationFrame(tick);
  };
  play.addEventListener('click', () => {
    if (restartOnPlay) {p.play(true); return;}
    if (p.phase === 'playing') {p.pause(); return;}
    p.play();
  });
  pauseButton?.addEventListener('click', () => p.phase === 'playing' ? p.pause() : p.play());
  reset?.addEventListener('click', p.reset);
  soundBox?.addEventListener('change', () => {if (p.phase === 'playing') sound(p, p.elapsed);});
  panels.set(id, p); p.draw(); return p;
}
function line(x1, y1, x2, y2, color, dash = '') { return `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${color}" stroke-width="4" fill="none" ${dash ? 'stroke-dasharray="8 6"' : ''}/>`; }
function sonar(progress) {
  const depth = Number($('sea-depth').value), time = echo(depth, 1500).time, hidden = $('hide-depth').checked, w = wavePosition(progress), bottom = 100 + depth / 600 * 105;
  $('sea-depth-value').textContent = depth + 'm';
  $('sea-depth').closest('label').hidden = hidden;
  $('sonar-view').innerHTML = `<rect x="15" y="65" width="690" height="175" rx="10" fill="#dfeef0"/><path d="M270 42H430L410 72H290Z" fill="#48655b"/><rect x="330" y="20" width="50" height="22" rx="3" fill="#dbc7a4"/><rect x="345" y="70" width="20" height="13" fill="#bc612b"/><text x="445" y="54">船底探頭</text><path d="M20 ${bottom}H700" stroke="#958369" stroke-width="12"/>${line(345, 84, 345, bottom - 10, '#176b53')}${line(375, bottom - 10, 375, 84, '#bc612b', 'yes')}<circle cx="${w.stage === 'outbound' ? 345 : 375}" cy="${84 + (bottom - 94) * w.fraction}" r="8" fill="#ce8b25" stroke="white" stroke-width="2"/><text x="420" y="${bottom - 22}">${hidden ? '距離暫時收起' : '探頭至海底 ' + depth + 'm'}</text>`;
  $('sonar-time').textContent = fmt(time) + 's';
  $('sonar-answer').textContent = hidden && !$('reveal-depth').getAttribute('aria-expanded').includes('true') ? '由往返時間推算距離；需要時可查看完整計算。' : `1500 × ${fmt(time)} ÷ 2＝${depth}m（探頭至海底）。`;
}
function trace(target, mode = 'dense', treated = false, progress = 0) {
  const taps = arrivals(mode, treated), width = 650;
  $(target).innerHTML = `<svg viewBox="0 0 720 150" role="img" aria-label="${mode === 'single' ? '一次較晚回聲' : treated ? '直接聲相同、反射減弱' : '直接聲與密集反射'}的到達紀錄"><path d="M35 110H690" stroke="#a9b9ad"/>${taps.map((a, i) => `<path d="M${35 + a.delay / 1.4 * width} 110v-${a.gain * 70}" stroke="${i ? '#bc612b' : '#176b53'}" stroke-width="7"/>`).join('')}<text x="20" y="23">接收強弱（示意）</text><text x="20" y="140">0：直接聲</text><text x="580" y="140">1.4秒</text><path d="M${35 + Math.min(1, progress) * width} 35V115" stroke="#6eaeb3" stroke-width="2" stroke-dasharray="4 4"/></svg>`;
}
function roomView(id, treated = false) {
  $(id).innerHTML = `<rect x="55" y="30" width="610" height="180" rx="8" fill="#edf1e7" stroke="#9a886e" stroke-width="8"/>${treated ? '<path d="M250 34H470M250 206H470" stroke="#80aa97" stroke-width="18"/>' : ''}${line(120, 140, 600, 140, '#176b53') }<path d="M120 140L360 35L600 140M120 140L360 205L600 140" fill="none" stroke="#bc612b" stroke-width="4" stroke-dasharray="7 5" opacity="${treated ? '.25' : '.8'}"/><circle cx="120" cy="140" r="17" fill="#176b53"/><circle cx="600" cy="140" r="17" fill="#bc612b"/><text x="90" y="185">聲源</text><text x="575" y="185">聽者</text><text x="270" y="130">直接聲 →</text><text x="260" y="239">${treated ? '部分牆面吸音：反射減弱' : '反射走較長的路徑，較晚抵達'}</text>`;
}
const reflection = player('reflection', renderReflection, () => REFLECTION_DURATION, {
  restartOnPlay: true,
  taps: () => [{delay: 0, gain: 1}, {delay: REFLECTION_RETURN_TIME, gain: .45}]
});
$('reflection-speaker').addEventListener('click', () => reflection.play(true));
const distance = player('distance', renderDistance, () => distanceDuration(Number($('wall-distance').value), $('distance').dataset.selection), {
  restartOnPlay: true,
  onRestart: (selection = 'both') => { $('distance').dataset.selection = selection; },
  taps: () => distanceTaps(Number($('wall-distance').value), $('distance').dataset.selection)
});
bindDistanceSpeakers(selection => distance.play(true, selection));
bindDistanceWall(distance.reset);
const calculation = player('calculation', renderCalculation, () => calculationDuration(calculationTime()), {
  restartOnPlay: true,
  taps: () => calculationTaps(calculationTime())
});
$('calculation-speaker').addEventListener('click', () => calculation.play(true));
bindCalculationInput(calculation.reset);
player('sonar', sonar, () => echo(Number($('sea-depth').value), 1500).time * 8);
player('room', progress => {
  trace('room-single', 'single', false, progress * 2 / 1.4); trace('room-dense', 'dense', false, progress * 2 / 1.4); roomView('room-view');
}, () => 2, {room: true, mode: () => document.querySelector('[name=room-mode]:checked').value});
player('treatment', progress => {
  trace('treatment-before', 'dense', false, progress * 6.8 / 1.4); trace('treatment-after', 'dense', true, progress * 6.8 / 1.4);
  const treated = document.querySelector('[name=treatment-mode]:checked').value === 'after'; roomView('treatment-view', treated);
  $('treatment-reading').textContent = treated ? '目前比較：部分牆面吸音，直接聲保留，反射聲較弱。' : '目前比較：未處理牆面，反射聲較強。';
}, () => 6.8, {room: true, mode: () => document.querySelector('[name=treatment-mode]:checked').value});
for (const [id, panel] of [['wall-distance', 'distance'], ['sea-depth', 'sonar']]) $(id).addEventListener('input', () => {if (panel === 'sonar') $('reveal-depth').setAttribute('aria-expanded', 'false'); panels.get(panel).reset();});
for (const name of ['room-mode', 'treatment-mode']) document.querySelectorAll(`[name="${name}"]`).forEach(el => el.addEventListener('change', () => panels.get(name.split('-')[0]).reset()));
$('hide-depth').addEventListener('change', () => { $('reveal-depth').hidden = !$('hide-depth').checked; $('reveal-depth').setAttribute('aria-expanded', 'false'); panels.get('sonar').reset(); });
$('reveal-depth').addEventListener('click', () => { $('reveal-depth').setAttribute('aria-expanded', 'true'); panels.get('sonar').draw(); });
trace('quiz-before'); trace('quiz-after', 'dense', true);
const form = $('echo-quiz'), feedback = $('quiz-feedback');
form.addEventListener('submit', event => {
  event.preventDefault(); const data = new FormData(form), result = judge({depth: $('quiz-depth').value, reason: data.get('reason'), record: data.get('record'), echo: data.get('echo')});
  feedback.dataset.result = result.result; feedback.textContent = result.message;
});
form.addEventListener('input', () => {feedback.dataset.result = 'pending'; feedback.textContent = '答案已修改，請重新核對。';});
form.addEventListener('reset', () => {feedback.dataset.result = 'ready'; feedback.textContent = '已全部重填，請重新判讀紀錄。';});
document.addEventListener('visibilitychange', () => {if (document.hidden) stopActive();});
window.addEventListener('pagehide', stopActive);
const observer = new IntersectionObserver(entries => {
  const visible = entries.filter(e => e.isIntersecting).sort((a,b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
  if (visible) document.querySelectorAll('.route a').forEach(a => {if (a.hash === '#' + visible.target.id) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current');});
}, {rootMargin: '-10% 0px -65% 0px'});
document.querySelectorAll('.lesson-card,.quiz').forEach(el => observer.observe(el));
document.body.dataset.ready = 'true';
