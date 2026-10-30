import { stopOnLeave } from './lesson-playback.mjs?v=2';

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

// 與實景表殼共用中心點，240° 刻度讓抽氣／進氣的方向容易辨認。
const pressureScale = document.querySelector('#vacuum-pressure-scale');
for (let index = 0; index <= 16; index++) {
  const tick = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  const major = index % 4 === 0;
  tick.setAttribute('d', `M0 ${major ? -49 : -54}V-62`);
  tick.setAttribute('transform', `rotate(${-120 + index * 15})`);
  tick.setAttribute('fill', 'none');
  tick.setAttribute('stroke', '#657065');
  tick.setAttribute('stroke-width', major ? '3.5' : '2');
  pressureScale.append(tick);
}

// 七段顯示器的可見筆畫與無障礙讀值共用相同資料，未烘焙在照片內。
const meterDigits = document.querySelector('#vacuum-led-digits');
const segmentPaths = [
  'M10 0H46L51 5L46 10H10L5 5Z', 'M48 12L53 7L58 12V39L53 44L48 39Z',
  'M48 51L53 46L58 51V78L53 83L48 78Z', 'M10 80H46L51 85L46 90H10L5 85Z',
  'M0 51L5 46L10 51V78L5 83L0 78Z', 'M0 12L5 7L10 12V39L5 44L0 39Z',
  'M10 40H46L51 45L46 50H10L5 45Z'
];
const numeralSegments = ['abcdef', 'bc', 'abdeg', 'abcdg', 'bcfg', 'acdfg', 'acdefg', 'abc', 'abcdefg', 'abcdfg'];
const digitGroups = [0, 1].map(index => {
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  group.setAttribute('transform', `translate(${index * 74} 0) skewX(-5)`);
  segmentPaths.forEach((d, segment) => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d); path.classList.add('vacuum-led-segment');
    path.dataset.segment = 'abcdefg'[segment]; group.append(path);
  });
  meterDigits.append(group); return group;
});
function showMeter(value, measured = null) {
  const output = document.querySelector('#vacuum-db-value');
  text('vacuum-db-value', value);
  if (measured === null) output.removeAttribute('data-value');
  else output.dataset.value = measured.toFixed(2);
  if (meterDigits.dataset.reading === value) return;
  meterDigits.dataset.reading = value;
  const characters = value === '—' ? '--' : value.padStart(2, ' ');
  digitGroups.forEach((group, index) => {
    const character = characters[index]; group.dataset.digit = character;
    const lit = character === '-' ? 'g' : character === ' ' ? '' : numeralSegments[Number(character)] || '';
    for (const path of group.children) path.classList.toggle('is-lit', lit.includes(path.dataset.segment));
  });
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
    showMeter('—');
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
    meterEnergy = null; showMeter('—'); return;
  }
  const weight = 1 - Math.exp(-delta / .16);
  meterEnergy = meterEnergy === null ? energy : meterEnergy + weight * (energy - meterEnergy);
  const db = DB_REFERENCE_OFFSET + 10 * Math.log10(meterEnergy);
  showMeter(String(Math.round(clamp(db, 0, 99))), db);
}
function render() {
  const airLabel = air > .67 ? '充足' : air > .15 ? '逐漸減少' : '接近真空';
  const heard = !power ? '未發聲' : air > .67 ? '清楚' : air > .15 ? '變弱' : '幾乎聽不見';
  const modeLabel = mode === 'pump' && air > MIN_AIR ? '抽氣中' : mode === 'inlet' ? '進氣中' : air <= MIN_AIR + .0001 ? '接近真空' : power ? '觀察中' : '等待啟動';
  lab.dataset.air = air.toFixed(5); lab.dataset.power = power ? 'on' : 'off';
  lab.dataset.mode = mode; lab.dataset.audio = audioState;
  powerButton.setAttribute('aria-checked', String(power));
  text('vacuum-switch-word', power ? 'ON' : 'OFF');
  const pressureLabel = air >= .99999 ? '大氣壓' : air > .15 ? '較低' : '接近真空';
  text('vacuum-mode', modeLabel); text('vacuum-air-label', pressureLabel);
  text('vacuum-extract-label', mode === 'pump' ? '停止抽氣' : '抽氣');
  text('vacuum-admit-label', mode === 'inlet' ? '關閉進氣' : '放入空氣');
  for (const button of pumpButtons) { button.disabled = false; button.setAttribute('aria-pressed', String(mode === 'pump')); }
  for (const button of inletButtons) { button.disabled = air >= .99999; button.setAttribute('aria-pressed', String(mode === 'inlet')); }
  pumpButtons[0].setAttribute('aria-label', mode === 'pump' ? '停止抽氣' : '點按幫浦抽氣');
  inletButtons[0].setAttribute('aria-label', mode === 'inlet' ? '關閉進氣閥' : '打開進氣閥，放入空氣');
  needle.setAttribute('transform', `translate(1770 534) rotate(${(-120 + air * 240).toFixed(3)})`);
  const sentence = audioError || (!power && mode === 'idle' && air === 1
    ? '先開啟電鈴，再抽氣比較聽到的鈴聲。'
    : `${modeLabel}，罩內空氣${airLabel}；${power ? `電鈴持續運作，聽到的鈴聲${heard}。` : '電鈴已關閉，可開啟電鈴比較鈴聲。'}`);
  if (status.textContent !== sentence) status.textContent = sentence;
  status.classList.toggle('vacuum-status-error', Boolean(audioError));
  setGain(); updateMeter();
}
function drawHammer() {
  // 從鐘面向外退開再返回敲擊；固定底部樞軸，振幅不隨抽氣量改變。
  const angle = power ? 7.5 * Math.sin(phase * Math.PI * 2 * 3.5) ** 2 : 0;
  hammer.setAttribute('transform', `rotate(${angle.toFixed(3)} 783 594)`);
  vibration.setAttribute('opacity', power ? '.85' : '0');
}
function tick(now) {
  frame = 0;
  const delta = lastTime === null ? 0 : Math.min(.05, (now - lastTime) / 1000);
  lastTime = now; phase += delta;
  if (mode === 'pump') air = Math.max(MIN_AIR, air - delta * .16);
  else if (mode === 'inlet') { air = Math.min(1, air + delta * .245); if (air >= 1) mode = 'idle'; }
  drawHammer(); render();
  if (power || mode === 'inlet' || mode === 'pump' && air > MIN_AIR) frame = requestAnimationFrame(tick);
  else lastTime = null;
}
function ensureFrame() { if (!frame && (power || mode === 'inlet' || mode === 'pump' && air > MIN_AIR)) { lastTime = null; frame = requestAnimationFrame(tick); } }
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
  if (next === 'inlet' && air >= .99999) return;
  mode = mode === next ? 'idle' : next;
  render(); ensureFrame();
}
powerButton.addEventListener('click', () => setPower(!power));
for (const button of pumpButtons) button.addEventListener('click', () => toggleMode('pump'));
for (const button of inletButtons) button.addEventListener('click', () => toggleMode('inlet'));
function stopWhenAway() {
  mode = 'idle'; setPower(false); cancelAnimationFrame(frame); frame = 0; lastTime = null;
}
stopOnLeave(document.querySelector('#card-03'), () => {
  if (power || mode !== 'idle') stopWhenAway();
});
render(); drawHammer();
