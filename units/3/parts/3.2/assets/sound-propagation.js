import { BellReceptionAudio } from './bell-reception-audio.mjs?v=1';
import { stopOnLeave } from './lesson-playback.mjs?v=1';

// 慢速的一維縱波示意。q 是粒子的平衡位置，不隨波向右漂移。
const scene = document.querySelector('#air-wave');
const group = document.querySelector('#air-particles');
const strikeButton = document.querySelector('#air-strike');
const bellAudio = document.querySelector('#bell-audio');
bellAudio.volume = 1;
const reception = new BellReceptionAudio(bellAudio.currentSrc || bellAudio.src);
let soundRequest = 0;
const bell = document.querySelector('#sound-bell');
const bellBody = document.querySelector('#sound-bell-body');
const eardrum = document.querySelector('#sound-eardrum');
const status = document.querySelector('#air-status');
const LEFT = 210, RIGHT = 840, SPEED = 315, WAVELENGTH = 240;
const PERIOD = WAVELENGTH / SPEED, AMPLITUDE = 22;
const ARRIVAL = (RIGHT - LEFT) / SPEED;
let train = 6, end = ARRIVAL + train;
const TAU = Math.PI * 2;

function envelope(localTime) {
  if (localTime <= 0 || localTime >= train) return 0;
  const ramp = Math.min(1, localTime / .1, (train - localTime) / .35);
  return Math.sin(ramp * Math.PI / 2) ** 2 * reception.levelAt(localTime);
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

let elapsed = 0, playing = false, frame = 0, startAt = null, startElapsed = 0, phase = '';
function draw() {
  for (const { node, q } of dots) node.setAttribute('cx', (q + displacement(q, elapsed)).toFixed(4));
  const source = displacement(LEFT, elapsed) / AMPLITUDE;
  const received = displacement(RIGHT, elapsed) / AMPLITUDE;
  bellBody.setAttribute('transform', `rotate(${(source * 1.8).toFixed(4)} 440 200)`);
  eardrum.setAttribute('transform', `translate(${(received * 3.5).toFixed(4)} 0)`);
  scene.dataset.elapsed = elapsed.toFixed(4);
  scene.dataset.audio = elapsed >= end ? 'ended' : elapsed >= ARRIVAL ? 'playing' : playing ? 'scheduled' : 'idle';
}
function announce() {
  const next = elapsed >= ARRIVAL ? 'received' : 'travelling';
  if (next === phase) return;
  phase = next;
  status.textContent = next === 'received'
    ? '疏密變化抵達右側耳朵，現在聽到鐘聲，耳膜隨之振動。'
    : '鐘開始振動，疏密變化正向右傳播；傳到右側耳朵時才會聽到鐘聲。';
}
function animate() {
  if (!playing) return;
  elapsed = Math.min(end, startElapsed + Math.max(0, reception.now() - startAt));
  draw(); announce();
  if (elapsed >= end) {
    playing = false; frame = 0; startAt = null;
    scene.dataset.state = 'ended';
    status.textContent = '鐘聲已結束，耳膜停止振動，粒子回到原位附近。再敲一次鐘，可重新觀察。';
    return;
  }
  frame = requestAnimationFrame(animate);
}
async function startTimeline(request) {
  try {
    // resume 在敲鐘事件中提出；解碼後才建立共用時間軸，避免載入延誤聲畫對應。
    await reception.prepare();
    if (request !== soundRequest || document.hidden || !playing) return;
    train = reception.buffer.duration; end = ARRIVAL + train;
    reception.context.onstatechange = () => {
      if (reception.context.state !== 'running' && playing && !document.hidden) {
        freeze();
        playing = false; scene.dataset.state = 'interrupted'; scene.dataset.audio = 'idle';
        status.textContent = '聲音播放已中斷，請再敲一次鐘重新觀察。';
      }
    };
    frame = requestAnimationFrame(() => {
      if (request !== soundRequest || !playing || document.hidden) return;
      const now = reception.now();
      startAt = elapsed > 0 ? Math.max(now, reception.context.currentTime + .015) : now;
      startElapsed = elapsed;
      reception.playAt(startAt + Math.max(0, ARRIVAL - elapsed), Math.max(0, elapsed - ARRIVAL));
      scene.dataset.state = 'playing'; phase = ''; animate();
    });
  } catch {
    if (request !== soundRequest) return;
    reception.stop(); playing = false; frame = 0; startAt = null;
    scene.dataset.state = 'error'; scene.dataset.audio = 'error';
    status.textContent = '鐘聲暫時無法播放，請再敲一次鐘。';
  }
}
function strike() {
  const request = ++soundRequest;
  cancelAnimationFrame(frame);
  reception.stop(); frame = 0; startAt = null;
  elapsed = 0; phase = ''; playing = true;
  draw(); scene.dataset.state = 'preparing'; scene.dataset.audio = 'idle';
  status.textContent = '正在準備鐘聲…';
  startTimeline(request);
}

function freeze() {
  ++soundRequest;
  if (startAt !== null) elapsed = Math.min(end, startElapsed + Math.max(0, reception.now() - startAt));
  cancelAnimationFrame(frame); frame = 0; startAt = null; reception.stop(); draw();
  scene.dataset.state = playing ? 'paused' : scene.dataset.state;
  scene.dataset.audio = 'paused';
}
strikeButton.addEventListener('click', strike);
bell.addEventListener('click', strike);
bell.addEventListener('keydown', event => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    if (!event.repeat) strike();
  }
});
stopOnLeave(document.querySelector('#card-02'), () => {
  if (!playing && !frame) return;
  freeze(); playing = false; elapsed = 0; phase = ''; startElapsed = 0;
  draw(); scene.dataset.state = 'ready'; scene.dataset.audio = 'idle';
  status.textContent = '播放已停止，再敲一次鐘可重新觀察。';
});
draw(); scene.dataset.state = 'ready';
