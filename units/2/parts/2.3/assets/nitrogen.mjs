const panel = document.querySelector('.nitrogen-compare');
const button = panel.querySelector('.nitrogen-replay');
const heading = panel.querySelector('#nitrogen-oxygen-heading');
const description = panel.querySelector('#nitrogen-oxygen-description');
const note = panel.querySelector('#nitrogen-oxygen-note');
const fill = panel.querySelector('#nitrogen-oxygen-fill');
const track = panel.querySelector('.nitrogen-oxygen-qualitative');
const status = panel.querySelector('.nitrogen-playback-status');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const duration = 5100;
let state = 'complete', elapsed = duration, startedAt = 0, frame = 0, lastPhase = 'sealed';
function cancel() { cancelAnimationFrame(frame); frame = 0; }
function render() {
  const phase = elapsed < 900 ? 'air' : elapsed < 4200 ? 'flushing' : elapsed < duration ? 'sealing' : 'sealed';
  panel.dataset.nitrogenState = state;
  panel.dataset.nitrogenPhase = phase;
  const progress = reduced.matches
    ? (phase === 'air' ? 0 : phase === 'flushing' ? 0.5 : 1)
    : Math.min(1, Math.max(0, (elapsed - 900) / 3300));
  // Only the air reference is quantitative. The final short fill is a qualitative drawing,
  // not a claimed residual-oxygen percentage, process rate or measured preservation result.
  fill.style.width = `${21 - 15 * progress}%`;
  heading.textContent = phase === 'air' ? '氧氣約21%' : phase === 'flushing' ? '氧氣逐漸減少' : '氧氣較少';
  description.textContent = phase === 'air' ? '袋內原本有空氣' : phase === 'flushing' ? '充氮並排出原有空氣' : '袋內以氮氣為主';
  note.textContent = phase === 'air' ? '充氮前，袋內原本有空氣' : phase === 'flushing' ? '充氮並排氣，氧氣逐漸減少' : '氧氣減少，比例因製程而異';
  track.setAttribute('aria-label', phase === 'air' ? '袋內原本為一般空氣，氧氣約21%' : '氧氣含量降低的定性示意，比例因製程而異');
  button.setAttribute('aria-label', state === 'paused' ? '繼續觀看充氮過程' : state === 'playing' ? '重新觀看充氮、排氣與封口過程' : '重新觀看充氮、排氣與封口過程');
  if (phase !== lastPhase || state === 'paused') {
    const message = phase === 'air' ? '袋內原本有空氣。' : phase === 'flushing' ? '充入氮氣，同時排出原有空氣。' : phase === 'sealing' ? '完成封口，保留比較結果。' : '充氮後以氮氣為主，氧氣較少。';
    status.textContent = (state === 'paused' ? '已暫停：' : '') + message;
  }
  lastPhase = phase;
}
function tick(now) {
  if (state !== 'playing') return;
  elapsed = Math.min(duration, now - startedAt);
  if (elapsed >= duration) state = 'complete';
  render();
  if (state === 'playing') frame = requestAnimationFrame(tick);
}
function pause() {
  if (state !== 'playing') return;
  elapsed = Math.min(duration, performance.now() - startedAt);
  cancel(); state = 'paused'; render();
}
button.addEventListener('click', () => {
  cancel();
  if (state !== 'paused') elapsed = 0;
  state = 'playing'; startedAt = performance.now() - elapsed; lastPhase = ''; render();
  frame = requestAnimationFrame(tick);
});
button.addEventListener('keydown', event => { if (event.key === 'Escape') pause(); });
if ('IntersectionObserver' in window) {
  new IntersectionObserver(entries => { if (!entries[0].isIntersecting) pause(); }).observe(button);
}
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
// A deliberate replay still shows distinct stages with reduced motion; only smooth
// interpolation and decorative motion are suppressed, so clicking has visible feedback.
const motionChanged = () => render();
if (reduced.addEventListener) reduced.addEventListener('change', motionChanged);
else if (reduced.addListener) reduced.addListener(motionChanged);
// CSS loads the visual assets independently. Image.decode support or a transient decode
// failure must not leave this otherwise functional interaction permanently disabled.
button.disabled = false;
