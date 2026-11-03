// Differential-wheel analogy only: the light model never uses friction.
const details = document.querySelector('#oblique-explanation');
const cart = document.querySelector('#oblique-cart');
const button = document.querySelector('#oblique-cart-play');
const caption = document.querySelector('#oblique-cart-status');
const trail = document.querySelector('#oblique-cart-trail');
const track = 140, boundary = 160, step = 1 / 240;
const samples = [];
let x = 145, y = 67, angle = 40 * Math.PI / 180, time = 0;
// A rigid axle: each wheel changes speed when its centre crosses the boundary.
// Equal speeds translate it; unequal speeds rotate it toward the slower wheel.
while (y < 260) {
  const leftY = y + track / 2 * Math.sin(angle);
  const rightY = y - track / 2 * Math.sin(angle);
  const leftSpeed = leftY >= boundary ? 55 : 100;
  const rightSpeed = rightY >= boundary ? 55 : 100;
  samples.push({ time: time * 1000, x, y, angle, leftY, rightY });
  const speed = (leftSpeed + rightSpeed) / 2;
  x += speed * Math.sin(angle) * step;
  y += speed * Math.cos(angle) * step;
  angle += (leftSpeed - rightSpeed) / track * step;
  time += step;
}
const end = samples.at(-1).time;
const crossing = samples.find(p => p.y >= boundary);
document.querySelector('#oblique-cart-normal').setAttribute('d', `M${crossing.x} 18V315`);
document.querySelector('#oblique-cart-normal-label').setAttribute('x', crossing.x + 10);
let elapsed = 0, started = 0, frame = 0, state = 'idle';
function visible() {
  const box = details.getBoundingClientRect();
  return details.open && box.bottom > 0 && box.top < innerHeight;
}
function draw() {
  const index = Math.min(samples.length - 1, Math.floor(elapsed / (step * 1000)));
  const p = samples[index];
  cart.setAttribute('transform', `translate(${p.x} ${p.y}) rotate(${-p.angle * 180 / Math.PI})`);
  for (const key of ['x', 'y', 'angle', 'leftY', 'rightY']) cart.dataset[key] = String(p[key]);
  cart.dataset.state = state;
  trail.setAttribute('d', samples.filter((_, i) => i <= index && (i % 8 === 0 || i === index)).map((q, i) => `${i ? 'L' : 'M'}${q.x} ${q.y}`).join(''));
  const text = p.rightY >= boundary
    ? '兩輪都已變慢，沿新方向前進，更靠近法線。'
    : p.leftY >= boundary ? '左輪先進入、先變慢；右輪仍較快，小車開始轉向。'
    : '斜著前進，兩輪速度相同。';
  if (caption.textContent !== text) caption.textContent = text;
}
function stop() {
  cancelAnimationFrame(frame); frame = 0;
  if (state === 'running') {
    elapsed = Math.min(end, performance.now() - started);
    state = elapsed >= end ? 'complete' : 'paused';
    draw();
  }
  button.disabled = false;
  button.textContent = state === 'paused' ? '繼續小車示範' : state === 'complete' ? '再看一次小車示範' : '播放小車示範';
}
function tick(now) {
  if (document.hidden || !visible()) { stop(); return; }
  elapsed = Math.min(end, Math.max(0, now - started));
  if (elapsed >= end) state = 'complete';
  draw();
  if (state === 'complete') stop();
  else frame = requestAnimationFrame(tick);
}
function play() {
  if (state === 'running' || !details.open || document.hidden) return;
  if (state !== 'paused') elapsed = 0;
  state = 'running'; started = performance.now() - elapsed;
  button.disabled = true; draw(); frame = requestAnimationFrame(tick);
}
button.addEventListener('click', play);
details.addEventListener('toggle', () => {
  if (!details.open) stop();
  else if (!matchMedia('(prefers-reduced-motion: reduce)').matches) play();
});
document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
  // Entries can describe the position before a click scrolls the control onscreen.
  if (!entries[0].isIntersecting && !visible()) stop();
}).observe(details);
// Without motion (including no JavaScript), the accompanying copy states all stages.
draw();
