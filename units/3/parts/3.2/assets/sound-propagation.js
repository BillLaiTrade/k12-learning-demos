// 慢速的一維縱波示意。q 是粒子的平衡位置，不隨波向右漂移。
const scene = document.querySelector('#air-wave');
const group = document.querySelector('#air-particles');
const strikeButton = document.querySelector('#air-strike');
const bellAudio = document.querySelector('#bell-audio');
bellAudio.volume = 1;
let soundRequest = 0;
const bell = document.querySelector('#sound-bell');
const bellBody = document.querySelector('#sound-bell-body');
const eardrum = document.querySelector('#sound-eardrum');
const status = document.querySelector('#air-status');
const denseLabel = document.querySelector('#sound-dense-label');
const sparseLabel = document.querySelector('#sound-sparse-label');
const LEFT = 210, RIGHT = 840, SPEED = 80, WAVELENGTH = 200;
const PERIOD = WAVELENGTH / SPEED, AMPLITUDE = 22, TRAIN = 9;
const ARRIVAL = (RIGHT - LEFT) / SPEED, END = ARRIVAL + TRAIN;
const TAU = Math.PI * 2;
const mobileLabels = [[document.querySelector('#sound-mobile-dense'), denseLabel], [document.querySelector('#sound-mobile-sparse'), sparseLabel]];

function envelope(localTime) {
  if (localTime <= 0 || localTime >= TRAIN) return 0;
  const ramp = Math.min(1, localTime / .5, (TRAIN - localTime) / .5);
  return Math.sin(ramp * Math.PI / 2) ** 2;
}
function displacement(q, time) {
  const localTime = time - (q - LEFT) / SPEED;
  return -AMPLITUDE * Math.sin(TAU * localTime / PERIOD) * envelope(localTime);
}
const dots = [];
for (let row = 0; row < 3; row++) for (let col = 0; col < 43; col++) {
  const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  const q = LEFT + col * 15;
  const focus = row === 1 && col === 21;
  dot.setAttribute('cx', q);
  dot.setAttribute('cy', 180 + row * 35);
  dot.setAttribute('r', focus ? 8 : 4.2);
  dot.setAttribute('class', focus ? 'particle-dot focus' : 'particle-dot');
  if (focus) dot.id = 'sound-focus-particle';
  dot.dataset.origin = q;
  group.append(dot);
  dots.push({ node: dot, q });
}

let elapsed = 0, playing = false, frame = 0, lastTime = null, phase = '';
function labelBand(node, offset) {
  // 始終追蹤同一個相位區域，接近耳朵時淡出，不切換到後面的區域。
  const q = LEFT + SPEED * elapsed - offset;
  const edge = RIGHT - 42;
  const opacity = Math.max(0, Math.min(1, (edge - q) / 70));
  const local = elapsed - (q - LEFT) / SPEED;
  const visible = q >= LEFT + 42 && q < edge && local > .5 && local < TRAIN - .5;
  node.setAttribute('visibility', visible ? 'visible' : 'hidden');
  node.setAttribute('opacity', opacity.toFixed(4));
  node.setAttribute('transform', `translate(${q.toFixed(3)} 0)`);
}
function draw() {
  for (const { node, q } of dots) node.setAttribute('cx', (q + displacement(q, elapsed)).toFixed(4));
  const source = displacement(LEFT, elapsed) / AMPLITUDE;
  const received = displacement(RIGHT, elapsed) / AMPLITUDE;
  bellBody.setAttribute('transform', `rotate(${(source * 1.8).toFixed(4)} 440 200)`);
  eardrum.setAttribute('transform', `translate(${(received * 3.5).toFixed(4)} 0)`);
  labelBand(denseLabel, WAVELENGTH / 2);
  labelBand(sparseLabel, WAVELENGTH);
  for (const [mobile, original] of mobileLabels) {
    mobile.setAttribute('visibility', original.getAttribute('visibility'));
    mobile.setAttribute('opacity', original.getAttribute('opacity'));
    mobile.setAttribute('transform', original.getAttribute('transform'));
  }
  scene.dataset.elapsed = elapsed.toFixed(4);
}
function announce() {
  const next = elapsed >= ARRIVAL ? 'received' : 'travelling';
  if (next === phase) return;
  phase = next;
  status.textContent = next === 'received'
    ? '疏密變化抵達耳朵，耳膜隨之振動；橘色粒子仍在原位附近往返。'
    : '鐘受到敲擊開始振動，疏密變化逐步向右傳播。';
}
function animate(now) {
  if (!playing) return;
  if (lastTime !== null) elapsed = Math.min(END, elapsed + (now - lastTime) / 1000);
  lastTime = now;
  draw(); announce();
  if (elapsed >= END) {
    playing = false; frame = 0; lastTime = null;
    scene.dataset.state = 'ended';
    status.textContent = '疏密變化已通過，粒子回到原位附近。再敲一次鐘，可重新觀察。';
    return;
  }
  frame = requestAnimationFrame(animate);
}
function playBell() {
  const request = ++soundRequest;
  bellAudio.pause();
  bellAudio.currentTime = 0;
  // 在真實點擊／按鍵事件內呼叫 play，符合行動瀏覽器的播放限制。
  bellAudio.play().catch(() => {
    if (request !== soundRequest) return;
    status.textContent = '鐘的振動示範已開始，但鐘聲暫時無法播放，請再敲一次鐘。';
  });
}
function strike() {
  cancelAnimationFrame(frame);
  elapsed = 0; lastTime = null; phase = ''; playing = true;
  draw(); scene.dataset.state = 'playing'; announce();
  frame = requestAnimationFrame(animate);
  playBell();
}
strikeButton.addEventListener('click', strike);
bell.addEventListener('click', strike);
bell.addEventListener('keydown', event => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    if (!event.repeat) strike();
  }
});
// 背景分頁凍結時間；返回時接續，不額外觸發一次敲擊。
document.addEventListener('visibilitychange', () => {
  cancelAnimationFrame(frame); frame = 0; lastTime = null;
  if (document.hidden) {
    ++soundRequest; bellAudio.pause(); bellAudio.currentTime = 0;
  } else if (playing) frame = requestAnimationFrame(animate);
});
draw(); scene.dataset.state = 'ready';
