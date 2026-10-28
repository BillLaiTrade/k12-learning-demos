// 定性鐘罩實驗：控制空氣量，聲源振動與空氣量分開處理。
const lab = document.querySelector('#vacuum-lab');
const audio = document.querySelector('#vacuum-audio');
const powerButton = document.querySelector('#vacuum-power');
const pumpButtons = [document.querySelector('#vacuum-pump'), document.querySelector('#vacuum-extract')];
const inletButtons = [document.querySelector('#vacuum-valve'), document.querySelector('#vacuum-admit')];
const hammer = document.querySelector('#vacuum-hammer');
const vibration = document.querySelector('#vacuum-vibration');
const needle = document.querySelector('#vacuum-needle');
const status = document.querySelector('#vacuum-status');
const MIN_AIR = .02;
let air = 1, power = false, mode = 'idle', frame = 0, lastTime = null, phase = 0;
let context = null, gain = null, mediaSource = null, soundRequest = 0, audioState = 'off', audioError = '';
let analysers = [], meterBuffers = [], meterEnergy = null, lastMeterTime = null;
// 以這段錄音的全段雙聲道 RMS 作 70 dB 示意參考，不代表校準過的聲壓值。
const DB_REFERENCE_OFFSET = 92.3276669648;
audio.volume = 1;
const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const text = (id, value) => { const node = document.getElementById(id); if (node.textContent !== value) node.textContent = value; };

// 先建立均勻候選位置，再以最遠點順序選取：空氣變少時仍分布在整個自由空間。
const halton = (index, base) => {
  let value = 0, fraction = 1 / base;
  while (index > 0) { value += fraction * (index % base); index = Math.floor(index / base); fraction /= base; }
  return value;
};
const pool = [];
for (let i = 1; i < 600; i++) {
  const x = 342 + 363 * halton(i, 2), y = 180 + 427 * halton(i, 3);
  const inDome = y > 290 || ((x - 525) / 183) ** 2 + ((y - 290) / 125) ** 2 < 1;
  const inBell = ((x - 510) / 108) ** 2 + ((y - 445) / 104) ** 2 < 1;
  const inStand = x > 431 && x < 611 && y > 491;
  if (inDome && !inBell && !inStand) pool.push({ x, y });
}
const particles = [], chosen = [];
for (let i = 0; i < 84; i++) {
  let best = 0, distance = -1;
  for (let j = 0; j < pool.length; j++) {
    const p = pool[j];
    const d = chosen.length ? Math.min(...chosen.map(q => (q.x - p.x) ** 2 + (q.y - p.y) ** 2)) : -((p.x - 410) ** 2 + (p.y - 220) ** 2);
    if (d > distance || j === 0) { best = j; distance = d; }
  }
  const position = pool.splice(best, 1)[0]; chosen.push(position);
  const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  dot.setAttribute('cx', position.x.toFixed(2)); dot.setAttribute('cy', position.y.toFixed(2));
  dot.setAttribute('r', '4.3'); dot.setAttribute('fill', '#64abb0');
  document.querySelector('#vacuum-particles').append(dot); particles.push(dot);
}
function soundLevel() { return power ? .012 + .988 * air ** 1.7 : 0; }
function setGain() {
  const target = soundLevel();
  lab.dataset.gain = target.toFixed(5);
  if (gain) gain.gain.setTargetAtTime(target, context.currentTime, .035);
}
function updateMeter() {
  if (!power || audioState !== 'playing' || !analysers.length) {
    meterEnergy = null; lastMeterTime = null;
    text('vacuum-db-value', '—');
    document.querySelector('#vacuum-db-value').removeAttribute('data-value');
    document.querySelector('#vacuum-db-bar').style.width = '0%';
    return;
  }
  const now = context.currentTime;
  if (lastMeterTime !== null && now - lastMeterTime < .1) return;
  const delta = lastMeterTime === null ? .1 : now - lastMeterTime;
  lastMeterTime = now;
  let sum = 0, count = 0;
  analysers.forEach((node, channel) => {
    const samples = meterBuffers[channel]; node.getFloatTimeDomainData(samples);
    for (const value of samples) { sum += value * value; count++; }
  });
  const energy = sum / count;
  if (energy < 1e-12) {
    meterEnergy = null; text('vacuum-db-value', '—');
    document.querySelector('#vacuum-db-value').removeAttribute('data-value');
    document.querySelector('#vacuum-db-bar').style.width = '0%'; return;
  }
  const weight = 1 - Math.exp(-delta / .16);
  meterEnergy = meterEnergy === null ? energy : meterEnergy + weight * (energy - meterEnergy);
  const db = DB_REFERENCE_OFFSET + 10 * Math.log10(meterEnergy);
  text('vacuum-db-value', String(Math.round(db)));
  document.querySelector('#vacuum-db-value').dataset.value = db.toFixed(2);
  document.querySelector('#vacuum-db-bar').style.width = `${(clamp((db - 20) / 60) * 100).toFixed(1)}%`;
}
function render() {
  const airLabel = air > .67 ? '充足' : air > .15 ? '逐漸減少' : '接近真空';
  const heard = !power ? '未發聲' : air > .67 ? '清楚' : air > .15 ? '變弱' : '幾乎聽不見';
  const modeLabel = mode === 'pump' ? '抽氣中' : mode === 'inlet' ? '進氣中' : air <= MIN_AIR + .0001 ? '接近真空' : power ? '觀察中' : '等待啟動';
  lab.dataset.air = air.toFixed(5); lab.dataset.power = power ? 'on' : 'off';
  lab.dataset.mode = mode; lab.dataset.audio = audioState;
  powerButton.setAttribute('aria-checked', String(power));
  text('vacuum-switch-word', power ? 'ON' : 'OFF');
  text('vacuum-mode', modeLabel); text('vacuum-air-label', airLabel);
  text('vacuum-source-tag', power ? '電鈴持續振動' : '電鈴已關閉');
  text('vacuum-extract-label', mode === 'pump' ? '停止抽氣' : '抽氣');
  text('vacuum-admit-label', mode === 'inlet' ? '關閉進氣' : '放入空氣');
  for (const button of pumpButtons) { button.disabled = air <= MIN_AIR + .0001; button.setAttribute('aria-pressed', String(mode === 'pump')); }
  for (const button of inletButtons) { button.disabled = air >= .99999; button.setAttribute('aria-pressed', String(mode === 'inlet')); }
  pumpButtons[0].setAttribute('aria-label', mode === 'pump' ? '停止抽氣' : '點按幫浦抽氣');
  inletButtons[0].setAttribute('aria-label', mode === 'inlet' ? '關閉進氣閥' : '打開進氣閥，放入空氣');
  needle.setAttribute('transform', `translate(1665 535) rotate(${(-60 + air * 120).toFixed(3)})`);
  const count = 3 + 81 * air;
  particles.forEach((dot, index) => dot.setAttribute('opacity', (clamp(count - index) * .75).toFixed(3)));
  const sentence = audioError || (!power && mode === 'idle' && air === 1
    ? '先開啟電鈴，再抽氣比較聽到的鈴聲。'
    : `${modeLabel}，罩內空氣${airLabel}；${power ? `電鈴持續運作，聽到的鈴聲${heard}。` : '電鈴已關閉，可開啟電鈴比較鈴聲。'}`);
  if (status.textContent !== sentence) status.textContent = sentence;
  status.classList.toggle('vacuum-status-error', Boolean(audioError));
  setGain(); updateMeter();
}
function drawHammer() {
  const angle = power ? -5 * Math.sin(phase * Math.PI * 2 * 3.5) ** 2 : 0;
  hammer.setAttribute('transform', `rotate(${angle.toFixed(3)} 635 607)`);
  vibration.setAttribute('opacity', power ? '.85' : '0');
}
function tick(now) {
  frame = 0;
  const delta = lastTime === null ? 0 : Math.min(.05, (now - lastTime) / 1000);
  lastTime = now; phase += delta;
  if (mode === 'pump') { air = Math.max(MIN_AIR, air - delta * .16); if (air <= MIN_AIR) mode = 'idle'; }
  else if (mode === 'inlet') { air = Math.min(1, air + delta * .245); if (air >= 1) mode = 'idle'; }
  drawHammer(); render();
  if (power || mode !== 'idle') frame = requestAnimationFrame(tick);
  else lastTime = null;
}
function ensureFrame() { if (!frame && (power || mode !== 'idle')) { lastTime = null; frame = requestAnimationFrame(tick); } }
function setPower(enabled) {
  const request = ++soundRequest;
  power = enabled; audioError = '';
  if (!power) {
    audio.pause(); audio.currentTime = 0; audioState = 'off';
    drawHammer(); render(); ensureFrame(); return;
  }
  try {
    if (!context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      context = new AudioContext(); gain = context.createGain();
      mediaSource = context.createMediaElementSource(audio); mediaSource.connect(gain);
      // 各聲道分別量取調整後訊號能量，避免直接合成單聲道時相位抵銷。
      const splitter = context.createChannelSplitter(2), merger = context.createChannelMerger(2);
      gain.connect(splitter);
      analysers = [0, 1].map(channel => {
        const node = context.createAnalyser(); node.fftSize = 4096;
        splitter.connect(node, channel); node.connect(merger, 0, channel); return node;
      });
      meterBuffers = analysers.map(node => new Float32Array(node.fftSize));
      merger.connect(context.destination);
    }
    gain.gain.setValueAtTime(soundLevel(), context.currentTime);
    // 兩個播放要求都在使用者事件內提出，支援行動瀏覽器的手勢限制。
    audioState = 'starting'; audio.currentTime = 0;
    const resumed = context.resume(), started = audio.play();
    Promise.all([resumed, started]).then(() => {
      if (request !== soundRequest || !power) return;
      audioState = 'playing'; render();
    }).catch(() => fail(request));
  } catch { fail(request); }
  render(); ensureFrame();
}
function fail(request) {
  if (request !== soundRequest) return;
  power = false; audioState = 'error'; audio.pause(); audio.currentTime = 0;
  audioError = '電鈴聲暫時無法播放，請再開啟一次電鈴。';
  drawHammer(); render();
}
function toggleMode(next) {
  if (next === 'pump' && air <= MIN_AIR + .0001 || next === 'inlet' && air >= .99999) return;
  mode = mode === next ? 'idle' : next;
  render(); ensureFrame();
}
powerButton.addEventListener('click', () => setPower(!power));
for (const button of pumpButtons) button.addEventListener('click', () => toggleMode('pump'));
for (const button of inletButtons) button.addEventListener('click', () => toggleMode('inlet'));
function stopWhenAway() {
  mode = 'idle'; setPower(false); cancelAnimationFrame(frame); frame = 0; lastTime = null;
}
document.addEventListener('visibilitychange', () => { if (document.hidden) stopWhenAway(); });
if ('IntersectionObserver' in window) {
  new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting && (power || mode !== 'idle')) stopWhenAway();
  }).observe(document.querySelector('#card-03'));
}
render(); drawHammer();
