import {bindWellQuiz} from './well-quiz.mjs?v=d5c30da4230a';
import {bindRoomWaveLab} from './room-wave-lab.mjs?v=0df53bfb7d7b';
import {renderSonar, bindSonar, beginSonar, sonarDuration, sonarTaps} from './sonar-lab.mjs?v=20261101-workspace';
import {arrivals} from './echo-model.mjs?v=20261101-room-contrast';
import {renderReflection, REFLECTION_DURATION, REFLECTION_RETURN_TIME} from './reflection-lab.mjs';
import {renderDistance, bindDistanceWall, bindDistanceSpeakers, distanceDuration, distanceTaps} from './distance-lab.mjs?v=20261031-short-labels';
import {renderCalculation, bindCalculationInput, calculationTime, calculationDuration, calculationTaps} from './calculation-lab.mjs?v=20261031-calculation-lab';
const $ = id => document.getElementById(id), fmt = (n, digits = 2) => Number(n.toFixed(digits)).toString();
const panels = new Map();
let active = null, context = null, phrasePromise = null, sources = [], audioEpoch = 0, outputGain = null;
function audioError(panel, message = '') {
  if (['reflection', 'distance', 'calculation', 'sonar'].includes(panel.id)) {
    const error = $(`${panel.id}-error`); error.textContent = message; error.hidden = !message;
  } else if (message) $(`${panel.id}-status`).textContent = message;
}
// Keep the verified output level; learners adjust loudness on their own device.
const outputLevel = panel => ['reflection', 'distance', 'calculation', 'sonar'].includes(panel.id) ? .32 : .0448;
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
    const startAt = context.currentTime + .04;
    for (const tap of taps) {
      const offset = Math.max(0, elapsed - tap.delay);
      if (offset >= buffer.duration) continue;
      const source = context.createBufferSource(), gain = context.createGain();
      source.buffer = buffer; gain.gain.value = tap.gain;
      source.connect(gain); gain.connect(master);
      source.start(startAt + Math.max(0, tap.delay - elapsed), offset);
      sources.push(source);
      source.onended = () => { sources = sources.filter(s => s !== source); if (!sources.length) document.body.dataset.audioPlaying = 'false'; };
    }
    document.body.dataset.audioPlaying = sources.length ? 'true' : 'false';
    return {context, startAt: startAt - elapsed};
  } catch {
    if (epoch !== audioEpoch) return;
    audioError(panel, '聲音未能啟用。請再次點擊播放；若仍無聲，請用瀏覽器開啟本頁，並確認裝置與分頁未靜音。');
  }
}
function player(id, render, duration, {room = false, mode = () => '', restartOnPlay = false, taps = null, onRestart = () => {}} = {}) {
  const root = $(id), play = document.querySelector(`[data-play="${id}"]`), reset = document.querySelector(`[data-reset="${id}"]`), soundBox = document.querySelector(`[data-sound="${id}"]`);
  const pauseButton = root.querySelector('[data-pause]');
  const p = {id, root, phase: 'ready', elapsed: 0, start: 0, raf: 0, clock: null, render, duration, room, mode, taps, sound: soundBox};
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
    const messages = id === 'reflection'
      ? {ready: '準備好，可點喇叭或按鈕發出一次短音。', playing: '播放中，可再次發聲，從頭觀察。', paused: '觀察已中斷，可再次發聲，從頭觀察。', complete: '本次觀察結束，可再次發聲。'}
      : {ready: '準備好，可播放或直接比較；重來保留目前條件。', playing: '播放中，可暫停觀察。', paused: '已暫停，位置保留；繼續時接著播放。', complete: '本次觀察結束，可重看或改變條件。'};
    $(`${id}-status`).textContent = messages[value];
  }
  const elapsedAt = now => Math.max(0, Math.min(p.duration(), p.clock ? p.clock.context.currentTime - p.clock.startAt : (now - p.start) / 1000));
  p.pause = () => { if (p.phase !== 'playing') return; if (!p.waitingForAudio) p.elapsed = elapsedAt(performance.now()); p.waitingForAudio = false; cancelAnimationFrame(p.raf); phase('paused'); if (active === p) { active = null; stopSound(); } p.draw(); };
  p.reset = () => { p.pause(); p.elapsed = 0; phase('ready'); p.draw(); };
  function tick(now) {
    p.elapsed = elapsedAt(now); p.draw();
    if (p.elapsed >= p.duration() && !(active === p && sources.length)) { phase('complete'); p.draw(); if (active === p) {active = null; stopSound();} }
    else p.raf = requestAnimationFrame(tick);
  }
  p.play = (restart = false, selection) => {
    const newEmission = restart || p.phase === 'complete' || p.phase === 'ready';
    stopActive();
    if (newEmission) { p.elapsed = 0; onRestart(selection); }
    if (['reflection', 'distance', 'calculation', 'sonar'].includes(id) && newEmission) root.dataset.emissions = String(Number(root.dataset.emissions) + 1);
    active = p; p.clock = null; p.start = performance.now() - p.elapsed * 1000;
    phase('playing'); p.draw();
    // Preparation preserves zero/the paused frame. The same audio clock then
    // drives the waves and the scheduled cues, including the output lead-in.
    p.waitingForAudio = true;
    const scheduled = sound(p, p.elapsed), epoch = audioEpoch;
    scheduled.then(clock => {
      if (epoch !== audioEpoch || active !== p || p.phase !== 'playing') return;
      p.waitingForAudio = false; p.clock = clock || null;
      // Keep the existing visual fallback when audio activation reports an error.
      p.start = performance.now() - p.elapsed * 1000;
      p.raf = requestAnimationFrame(tick);
    });
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
const sonarPlayer = player('sonar', renderSonar, sonarDuration, {restartOnPlay: true, onRestart: beginSonar, taps: sonarTaps});
bindSonar(sonarPlayer);
bindRoomWaveLab(controller => { stopActive(); active = controller; }, controller => { if (active === controller) active = null; });
$('wall-distance').addEventListener('input', () => distance.reset());
bindWellQuiz(controller => { stopActive(); active = controller; }, controller => { if (active === controller) active = null; });
document.querySelector('.route').addEventListener('click', event => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = event.target.closest('a[href^="#"]'), target = link && $(link.hash.slice(1));
  if (active && target && $(active.id)?.closest('.lesson-card,.quiz') !== target) stopActive();
});
document.addEventListener('visibilitychange', () => {if (document.hidden) stopActive();});
window.addEventListener('pagehide', stopActive);
const observer = new IntersectionObserver(entries => {
  const visible = entries.filter(e => e.isIntersecting).sort((a,b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
  if (visible) document.querySelectorAll('.route a').forEach(a => {if (a.hash === '#' + visible.target.id) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current');});
}, {rootMargin: '-10% 0px -65% 0px'});
document.querySelectorAll('.lesson-card,.quiz').forEach(el => observer.observe(el));
document.body.dataset.ready = 'true';
