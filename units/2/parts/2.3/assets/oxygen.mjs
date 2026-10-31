import { PREPARATION_DURATION, COMPARISON_DURATION, PREPARATION_STAGES, preparationFrame, comparisonFrame } from './oxygen-model.mjs?v=refined-4';
const section = document.querySelector('.oxygen-lesson');
const panel = section.querySelector('.oxygen-preparation');
const comparison = section.querySelector('.oxygen-comparison');
const $ = id => section.querySelector(id);
const steps = [...panel.querySelectorAll('[data-stage]')];
const names = ['準備材料：集氣瓶先裝滿水並倒置。', '先排空氣：導管口在瓶外，開始的混合氣不收集。', '排水集氣：移入導管，氧氣進入後，瓶內的水逐漸排出。', '收集完成：先移開導管，再在水下蓋上玻璃片。'];
const opacity = (selector, value) => $(selector).setAttribute('opacity', String(value));
function renderPreparation(time, state) {
  const f = preparationFrame(time), overview = state === 'overview';
  panel.dataset.stage = overview ? '-1' : f.stage;
  panel.dataset.collected = f.collected.toFixed(4);
  panel.dataset.tipX = (800 + 235*f.tube).toFixed(3);
  panel.dataset.cover = f.cover.toFixed(4);
  steps.forEach((step, i) => {
    const current = !overview && f.stage === i;
    step.classList.toggle('is-current', current);
    if (current) step.setAttribute('aria-current', 'step'); else step.removeAttribute('aria-current');
  });
  const waterY = 280 + f.collected*400;
  $('#oxygen-jar-water').setAttribute('y', waterY);
  $('#oxygen-jar-water').setAttribute('height', 680-waterY);
  $('#oxygen-water-line').setAttribute('cy', waterY);
  opacity('#oxygen-water-line', f.collected < 1 ? 1 : 0);
  opacity('#oxygen-stopper', f.stage > 0 ? 1 : 0);
  opacity('#oxygen-delivery-tube',f.stage>0?1:0);opacity('#oxygen-tube-highlight',f.stage>0?1:0);
  const reacting = f.purging || (f.stage === 2);
  opacity('#oxygen-reaction-bubbles', reacting ? 1 : 0);
  opacity('#oxygen-purge-bubbles', f.purging ? 1 : 0);
  // Bubble positions are constrained between the submerged outlet and the
  // moving liquid surface. There are never bubbles in the collected gas space.
  const liquidRoom = 665-waterY-10;
  opacity('#oxygen-collection-bubbles', f.collecting && liquidRoom>12 ? 1 : 0);
  $('#oxygen-collection-bubbles').querySelectorAll('circle').forEach((bubble,i)=>{
    const phase=(time/1000+i*.27)%1;
    const r=Number(bubble.getAttribute('r'));
    bubble.setAttribute('cx', 1035+Math.sin(i*2+phase*4)*13);
    bubble.setAttribute('cy', Math.max(waterY+r+3,665-phase*Math.max(0,liquidRoom-r)));
  });
  $('#oxygen-purge-bubbles').querySelectorAll('circle').forEach((b,i)=>{
    const phase=(time/1150+i*.33)%1;b.setAttribute('cx',800+Math.sin(phase*5+i)*8);b.setAttribute('cy',657-phase*90);
  });
  opacity('#oxygen-water-out', f.collecting ? 1 : 0);
  opacity('#oxygen-water-label', f.collecting ? 1 : 0);
  $('#oxygen-cover').setAttribute('transform', `translate(${(1-f.cover)*290} 0)`);
  opacity('#oxygen-cover', f.stage === 3 ? 1 : 0);
  opacity('#oxygen-gas-label', f.collected > .3 ? 1 : 0);
  opacity('#oxygen-flow', reacting ? 1 : 0);
  const x=800+235*f.tube;
  const tube=`M315 275V200Q315 180 335 180H700Q720 180 720 200V710Q720 730 740 730H${x-20}Q${x} 730 ${x} 710V665`;
  for(const id of ['#oxygen-delivery-tube','#oxygen-tube-highlight','#oxygen-flow'])$(id).setAttribute('d',tube);
  $('#oxygen-reaction-bubbles').setAttribute('transform', `translate(0 ${-((time%900)/900)*30})`);
  $('#oxygen-flow').style.strokeDashoffset=String(-time/35);
  $('#oxygen-scene-note').textContent = f.stage === 3 ? (f.covered ? '導管已移開，集氣瓶在水下蓋好' : f.tube > 0 ? '先移開導管，集氣瓶口保持在水下' : '在水下滑入玻璃片，蓋好瓶口') : ['集氣瓶先裝滿水，倒置在水中','導管口在瓶外：先排出裝置原有的空氣','導管移入瓶口：氧氣進入，水位下降'][f.stage];
  return overview ? '已收集氧氣，導管移開後，集氣瓶在水下蓋好。' : names[f.stage];
}
function renderComparison(time) {
  const f=comparisonFrame(time);
  comparison.dataset.inserted=f.inserted.toFixed(4);comparison.dataset.ignition=f.ignition.toFixed(4);
  comparison.querySelectorAll('.oxygen-splint').forEach(stick=>stick.setAttribute('transform',`translate(0 ${-150*(1-f.inserted)})`));
  const air=comparison.querySelector('[data-sample=air]'),oxygen=comparison.querySelector('[data-sample=oxygen]');
  air.querySelector('.oxygen-ember').setAttribute('opacity',(1-f.fading).toFixed(4));
  oxygen.querySelector('.oxygen-ember').setAttribute('opacity','1');
  const flame=oxygen.querySelector('.oxygen-flame');flame.setAttribute('opacity',String(f.ignition));
  // Flame texture stays anchored to the wood tip. Motion uses the player's
  // elapsed clock, so pause freezes the flame as well as the inserted wood.
  const flicker=1+Math.sin(time/90)*.035*f.ignition;
  flame.setAttribute('transform',`translate(300 263) scale(${.7+.3*f.ignition} ${(.65+.35*f.ignition)*flicker}) translate(-300 -263)`);
  const captions = time < 1500 ? ['帶餘燼木條，正在放入','帶餘燼木條，正在放入'] : time <= 2000 ? ['木條已放入，觀察餘燼','木條已放入，觀察餘燼'] : time < 4800 ? ['餘燼逐漸變暗','木條開始復燃，出現火焰'] : ['餘燼漸暗，未同樣復燃','木條復燃，出現火焰'];
  [air,oxygen].forEach((sample,i)=>{sample.querySelector('figcaption').textContent=captions[i];sample.querySelector('svg').setAttribute('aria-label',`${i?'收集的氧氣':'一般空氣'}中的木條：${captions[i]}`)});
  return time < 1500 ? '兩支木條同時放入，起始都帶餘燼。' : time <= 2000 ? '兩支木條已放入，觀察尖端的餘燼。' : time < 4800 ? '一般空氣中餘燼漸暗；氧氣中的木條開始復燃。' : '一般空氣中的木條未同樣復燃；氧氣中的木條復燃。';
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
steps.forEach((step, i) => { step.disabled = false; step.addEventListener('click', () => preparation.start(PREPARATION_STAGES[i])); });
document.addEventListener('visibilitychange', () => { if (document.hidden) players.forEach(p => p.pausePlayback()); });
window.addEventListener('pagehide', () => players.forEach(p => p.pausePlayback()));
// Explicit playback retains essential educational motion under reduced motion.
// No automatic or independent decorative loops. Both SVG viewports reference
// the same scene group, including water, submerged bubbles, tube and glass cover.
const narrow=matchMedia('(max-width: 700px)');
function resizeDetails(){comparison.querySelectorAll('figure svg').forEach(svg=>svg.setAttribute('viewBox',narrow.matches?'130 30 340 360':'0 0 600 400'))}
resizeDetails();narrow.addEventListener('change',resizeDetails);
section.dataset.renderer='material-svg';
section.querySelector('.oxygen-drawing').dataset.ready='true';
