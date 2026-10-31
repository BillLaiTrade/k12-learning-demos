import { PREPARATION_DURATION, COMPARISON_DURATION, preparationFrame, comparisonFrame } from './oxygen-model.mjs?v=oxygen-1';
const section = document.querySelector('#s4');
const panel = section.querySelector('.oxygen-preparation');
const comparison = section.querySelector('.oxygen-comparison');
const $ = id => section.querySelector(id);
const steps = [...panel.querySelectorAll('[data-stage]')];
const names = ['準備材料：雙氧水與二氧化錳。', '先排空氣：開始的混合氣不收集。', '排水集氣：氧氣進入，瓶內的水逐漸排出。', '收集完成：在水下蓋上玻璃片。'];
const setVisible = (selector, shown) => $(selector).style.opacity = shown ? '1' : '0';
function renderPreparation(time, state) {
  const f = preparationFrame(time), overview = state === 'overview';
  panel.dataset.stage = overview ? '-1' : f.stage;
  panel.dataset.collected = f.collected.toFixed(4);
  steps.forEach((step, i) => {
    const current = !overview && f.stage === i;
    step.classList.toggle('is-current', current);
    if (current) step.setAttribute('aria-current', 'step'); else step.removeAttribute('aria-current');
  });
  const waterY = 115 + f.collected * 170;
  $('#oxygen-jar-water').setAttribute('y', waterY);
  $('#oxygen-jar-water').setAttribute('height', 285 - waterY);
  $('#oxygen-water-line').setAttribute('d', `M544 ${waterY}H634`);
  setVisible('#oxygen-water-line', f.collected < 1);
  setVisible('#oxygen-stopper', f.stage > 0);
  setVisible('#oxygen-reaction-bubbles', (f.purging || f.collecting));
  setVisible('#oxygen-collection-bubbles', f.collecting);
  setVisible('#oxygen-water-out', f.collecting);
  setVisible('#oxygen-water-label', f.collecting);
  setVisible('#oxygen-cover', f.covered);
  setVisible('#oxygen-gas-label', f.collected > .22);
  setVisible('#oxygen-flow', f.purging || f.collecting);
  const tube = f.collecting ? 'M428 92V276H580V259' : 'M428 92V183';
  $('#oxygen-delivery-tube').setAttribute('d', tube);
  $('#oxygen-tube-highlight').setAttribute('d', tube);
  $('#oxygen-flow').setAttribute('d', `M184 120V88Q184 80 194 80H416Q428 80 428 92${f.collecting ? 'V276H580V259' : 'V183m-7-10 7 10 7-10'}`);
  // Small bubbles follow the same paused clock as the water level.
  $('#oxygen-reaction-bubbles').setAttribute('transform', `translate(0 ${-((time % 800) / 800) * 18})`);
  $('#oxygen-collection-bubbles').setAttribute('transform', `translate(0 ${-((time % 1100) / 1100) * 35})`);
  $('#oxygen-flow').style.strokeDashoffset = String(-time / 50);
  $('#oxygen-scene-note').textContent = ['集氣瓶先裝滿水並倒置', '先排出裝置原有的空氣', '氧氣進入，水逐漸排出', '在水下蓋上玻璃片'][f.stage];
  return overview ? '已收集氧氣，集氣瓶在水下蓋好。' : names[f.stage];
}
function renderComparison(time) {
  const f = comparisonFrame(time);
  comparison.dataset.inserted = f.inserted.toFixed(4);
  comparison.dataset.ignition = f.ignition.toFixed(4);
  comparison.querySelectorAll('.oxygen-splint').forEach(stick => stick.setAttribute('transform', `translate(0 ${-110 * (1-f.inserted)})`));
  const air = comparison.querySelector('[data-sample=air]'), oxygen = comparison.querySelector('[data-sample=oxygen]');
  air.querySelector('.oxygen-ember').setAttribute('fill', `rgb(${Math.round(222-115*f.fading)},${Math.round(114-16*f.fading)},${Math.round(55+28*f.fading)})`);
  oxygen.querySelector('.oxygen-flame').setAttribute('opacity', f.ignition);
  oxygen.querySelector('.oxygen-flame').setAttribute('transform', `translate(180 192) scale(${.6+.4*f.ignition}) translate(-180 -192)`);
  return time < 1200 ? '兩支木條同時放入，起始都帶餘燼。' : time < 2400 ? '比較兩支木條的餘燼與火焰。' : '一般空氣中的木條未同樣復燃；氧氣中的木條復燃。';
}
const players = [];
function player(root, duration, render, selectors) {
  const [play, pause, reset] = selectors.map(s => root.querySelector(s));
  const status = root.querySelector('[role=status]');
  let state = 'overview', elapsed = duration, started = 0, frame = 0, message = '';
  function paint() {
    root.dataset.state = state;
    const next = (state === 'paused' ? '已暫停：' : '') + render(elapsed, state);
    // Announce stage changes, not every animation frame.
    if (message !== next) { status.textContent = next; message = next; }
    play.textContent = state === 'paused' ? '繼續播放' : root === panel ? '重播製氣' : '同時放入木條';
    pause.disabled = state !== 'playing'; reset.disabled = state === 'overview';
  }
  function cancel() { cancelAnimationFrame(frame); frame = 0; }
  function tick(now) {
    if (state !== 'playing') return;
    elapsed = Math.min(duration, now-started);
    if (elapsed >= duration) state = 'complete';
    paint();
    if (state === 'playing') frame = requestAnimationFrame(tick);
  }
  function pausePlayback() {
    if (state !== 'playing') return;
    elapsed = Math.min(duration, performance.now()-started);
    cancel(); state = 'paused'; paint();
  }
  function start(at) {
    const nextElapsed = at ?? (state === 'paused' ? elapsed : 0);
    players.forEach(p => p.pausePlayback());
    cancel();
    elapsed = nextElapsed;
    state = 'playing'; started = performance.now()-elapsed; paint();
    frame = requestAnimationFrame(tick);
  }
  play.addEventListener('click', () => start());
  pause.addEventListener('click', pausePlayback);
  reset.addEventListener('click', () => { cancel(); elapsed = duration; state = 'overview'; paint(); });
  root.addEventListener('keydown', e => { if (e.key === 'Escape') pausePlayback(); });
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting) pausePlayback();
  }).observe(root);
  play.disabled = false; paint();
  const api = { pausePlayback, start }; players.push(api); return api;
}
const preparation = player(panel, PREPARATION_DURATION, renderPreparation, ['[data-play]', '[data-pause]', '[data-reset]']);
player(comparison, COMPARISON_DURATION, renderComparison, ['[data-compare-play]', '[data-compare-pause]', '[data-compare-reset]']);
steps.forEach((step, i) => { step.disabled = false; step.addEventListener('click', () => preparation.start([0,1400,3400,7000][i])); });
document.addEventListener('visibilitychange', () => { if (document.hidden) players.forEach(p => p.pausePlayback()); });
window.addEventListener('pagehide', () => players.forEach(p => p.pausePlayback()));
// Explicitly requested animation keeps its essential water/wood comparison under
// reduced motion. No looping decoration or automatic initial playback is used.
