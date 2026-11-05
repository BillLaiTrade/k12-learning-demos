import {mountCartPlayback} from './cart-playback.mjs?v=20261105-eleven1';
// Differential-wheel analogy only: the light model never uses friction.
function initCart(prefix, { initialAngle = 40, upperSpeed = 100, lowerSpeed = 55, finishY = 260 } = {}) {
const details = document.querySelector(`#${prefix}-explanation`);
const accelerating = lowerSpeed > upperSpeed;
const cart = document.querySelector(`#${prefix}-cart`);
const button = document.querySelector(`#${prefix}-cart-play`);
const caption = document.querySelector(`#${prefix}-cart-status`);
const trail = document.querySelector(`#${prefix}-cart-trail`);
const track = 140, boundary = 160, step = 1 / 240;
const samples = [];
let x = 145, y = 67, angle = initialAngle * Math.PI / 180, time = 0;
// A rigid axle: each wheel changes speed when its centre crosses the boundary.
// Equal speeds translate it; unequal speeds rotate it toward the slower wheel.
while (y < finishY) {
  const leftY = y + track / 2 * Math.sin(angle);
  const rightY = y - track / 2 * Math.sin(angle);
  const leftSpeed = leftY >= boundary ? lowerSpeed : upperSpeed;
  const rightSpeed = rightY >= boundary ? lowerSpeed : upperSpeed;
  samples.push({ time: time * 1000, x, y, angle, leftY, rightY });
  const speed = (leftSpeed + rightSpeed) / 2;
  x += speed * Math.sin(angle) * step;
  y += speed * Math.cos(angle) * step;
  angle += (leftSpeed - rightSpeed) / track * step;
  time += step;
}
const end = samples.at(-1).time;
const crossing = samples.find(p => p.y >= boundary);
document.querySelector(`#${prefix}-cart-normal`).setAttribute('d', `M${crossing.x} 18V315`);
document.querySelector(`#${prefix}-cart-normal-label`).setAttribute('x', crossing.x + 10);
function draw({elapsed,state}) {
  const index = Math.min(samples.length - 1, Math.floor(elapsed / (step * 1000)));
  const p = samples[index];
  cart.setAttribute('transform', `translate(${p.x} ${p.y}) rotate(${-p.angle * 180 / Math.PI})`);
  for (const key of ['x', 'y', 'angle', 'leftY', 'rightY']) cart.dataset[key] = String(p[key]);
  cart.dataset.state = state;
  trail.setAttribute('d', samples.filter((_, i) => i <= index && (i % 8 === 0 || i === index)).map((q, i) => `${i ? 'L' : 'M'}${q.x} ${q.y}`).join(''));
  const text = p.rightY >= boundary
    ? accelerating ? '兩輪都已加速，沿新方向前進，更遠離法線。' : '兩輪都已變慢，沿新方向前進，更靠近法線。'
    : p.leftY >= boundary ? accelerating ? '左輪先進入、先加速；右輪仍較慢，小車開始轉向。' : '左輪先進入、先變慢；右輪仍較快，小車開始轉向。'
    : '斜著前進，兩輪速度相同。';
  if (caption.textContent !== text) caption.textContent = text;
}
mountCartPlayback({details,button,scene:details.querySelector('.oblique-cart-scene'),cart,duration:end,draw});

// Material names follow the fourth experiment; the cart remains a qualitative analogy.
if (accelerating) {
  const selector = document.querySelector('#exit-medium-toggle');
  function updateMedium() {
    const name = selector.dataset.current === 'glass' ? '玻璃' : '水';
    document.querySelector('#exit-cart-medium-label').textContent = `${name}（光速較慢）`;
    details.querySelector('[data-cart-medium]').textContent = name;
  }
  new MutationObserver(updateMedium).observe(selector, { attributes: true, attributeFilter: ['data-current'] });
  updateMedium();
}
}
initCart('oblique');
initCart('exit', { initialAngle: 30, upperSpeed: 70, lowerSpeed: 100, finishY: 245 });
