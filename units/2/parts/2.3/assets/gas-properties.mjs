import { COMPARISON_DURATION, comparisonFrame } from './oxygen-model.mjs?v=assembly-6';
const section=document.querySelector('.gas-properties-lesson');
const comparison=section.querySelector('.oxygen-comparison');
const players=[];
function renderComparison(time) {
  const f=comparisonFrame(time);
  comparison.dataset.inserted=f.inserted.toFixed(4);comparison.dataset.ignition=f.ignition.toFixed(4);
  comparison.querySelectorAll('.oxygen-splint').forEach(stick=>stick.setAttribute('transform',`translate(0 ${-150*(1-f.inserted)})`));
  const oxygen=comparison.querySelector('[data-sample=oxygen]'),co2=comparison.querySelector('[data-sample=co2]');
  co2.querySelector('.oxygen-ember').setAttribute('opacity',(1-f.fading).toFixed(4));
  oxygen.querySelector('.oxygen-ember').setAttribute('opacity','1');
  const flame=oxygen.querySelector('.oxygen-flame');flame.setAttribute('opacity',String(f.ignition));
  // Flame texture stays anchored to the wood tip. Motion uses the player's
  // elapsed clock, so pause freezes the flame as well as the inserted wood.
  const flicker=1+Math.sin(time/90)*.035*f.ignition;
  flame.setAttribute('transform',`translate(300 263) scale(${.7+.3*f.ignition} ${(.65+.35*f.ignition)*flicker}) translate(-300 -263)`);
  const captions = time < 1500 ? ['帶餘燼木條，正在放入','帶餘燼木條，正在放入'] : time <= 2000 ? ['木條已放入，觀察餘燼','木條已放入，觀察餘燼'] : time < 4800 ? ['木條開始復燃，出現火焰','餘燼逐漸變暗'] : ['木條復燃，出現火焰','餘燼漸暗，未復燃'];
  [oxygen,co2].forEach((sample,i)=>{sample.querySelector('figcaption').textContent=captions[i];sample.querySelector('svg').setAttribute('aria-label',`${i?'收集的二氧化碳':'收集的氧氣'}中的木條：${captions[i]}`)});
  return time < 1500 ? '兩支木條同時放入，起始都帶餘燼。' : time <= 2000 ? '兩支木條已放入，觀察尖端的餘燼。' : time < 4800 ? '氧氣中的木條開始復燃；二氧化碳中的餘燼漸暗。' : '氧氣中的木條復燃；二氧化碳中的餘燼漸暗，未復燃。';
}
function player(root, duration, render, selectors) {
  const [play, pause, reset] = selectors.map(s => root.querySelector(s));
  const status = root.querySelector('[role=status]');
  let state = 'overview', elapsed = duration, started = 0, frame = 0, message = '';
  function paint() {
    root.dataset.state = state;
    const next = (state === 'paused' ? '已暫停：' : '') + render(elapsed, state);
    // Announce stage changes, not every animation frame.
    if (message !== next) { status.textContent = next; message = next; }
    play.textContent = state === 'paused' ? '繼續播放' : '同時放入木條';
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
    document.dispatchEvent(new CustomEvent('air-experiment-play',{detail:'properties'}));
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
player(comparison, COMPARISON_DURATION, renderComparison, ['[data-compare-play]', '[data-compare-pause]', '[data-compare-reset]']);
comparison.dataset.ready='true';
document.addEventListener('visibilitychange',()=>{if(document.hidden)players.forEach(p=>p.pausePlayback());});
window.addEventListener('pagehide',()=>players.forEach(p=>p.pausePlayback()));
document.addEventListener('air-experiment-play',event=>{if(event.detail!=='properties')players.forEach(p=>p.pausePlayback());});
const narrow=matchMedia('(max-width:700px)');
function resizeDetails(){comparison.querySelectorAll('figure svg').forEach(svg=>svg.setAttribute('viewBox',narrow.matches?'130 30 340 360':'0 0 600 400'));}
resizeDetails();narrow.addEventListener('change',resizeDetails);
section.dataset.renderer='collected-gas-comparison';
