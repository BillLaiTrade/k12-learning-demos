import {distanceFromEcho} from './echo-model.mjs';

export const CALCULATION_SPEED = 340, MIN_TIME = .1, MAX_TIME = 60, END_HOLD = .16;
export const normaliseTime = (value, fallback = 4) => Math.max(MIN_TIME, Math.min(MAX_TIME, Number.isFinite(value) ? value : fallback));
export const calculationDuration = time => time + END_HOLD;
export const calculationTaps = time => [{delay: 0, gain: 1}, {delay: time, gain: .45}];
export function calculationFrame(time, elapsed) {
  const progress = Math.max(0, Math.min(1, elapsed / time));
  const stage = progress >= 1 ? 'received' : progress < .5 ? 'outbound' : 'returning';
  // The apparatus is enlarged. Position shows the fraction of each leg, not a photographic metre scale.
  const x = 260 + 635 * (progress < .5 ? progress * 2 : 2 * (1 - progress));
  return {stage, x, elapsed: Math.max(0, Math.min(time, elapsed))};
}
const $ = id => document.getElementById(id);
const format = new Intl.NumberFormat('zh-TW', {maximumFractionDigits: 8});
let time = 4;
export const calculationTime = () => time;
function updateText(node, value) { if (node.textContent !== value) node.textContent = value; }
function wavefronts(frame) {
  if (frame.stage === 'received') return '';
  const returning = frame.stage === 'returning', y = returning ? 155 : 125, color = returning ? '#f4a13c' : '#268b65';
  let paths = '';
  for (let i = 0; i < 3; i++) {
    const x = frame.x + (returning ? 1 : -1) * i * 13;
    if (x < 260 || x > 895) continue;
    const radius = 18 + i * 6, bend = returning ? -12 : 12;
    paths += `<path d="M${x} ${y-radius}Q${x+bend} ${y} ${x} ${y+radius}" fill="none" stroke="${color}" stroke-width="4" opacity="${1-i*.15}"/>`;
  }
  return paths;
}
export function renderCalculation(progress) {
  const root = $('calculation'), ready = root.dataset.phase === 'ready', model = distanceFromEcho(time, CALCULATION_SPEED);
  const frame = calculationFrame(time, ready ? 0 : progress * calculationDuration(time)), stage = ready ? 'ready' : frame.stage;
  const total = format.format(model.total), leg = format.format(model.distance), timeLabel = format.format(time);
  root.dataset.time = String(time); root.dataset.elapsed = frame.elapsed.toFixed(4);
  $('calculation-scene').dataset.stage = stage;
  for (const [key, value] of [['time', timeLabel], ['total', total], ['leg', leg]]) {
    for (const node of root.querySelectorAll(`[data-calculation-${key}]`)) updateText(node, value);
  }
  $('calculation-lengths').setAttribute('aria-label', `去程與回程等長，合計總路程${total}公尺。`);
  $('calculation-waves').innerHTML = ready ? '' : wavefronts(frame);
  $('calculation-received').innerHTML = stage === 'received' ? '<circle cx="220" cy="138" r="12" fill="#ffbd58" opacity=".35"/><circle cx="220" cy="138" r="5" fill="#ffe3a2" stroke="#ffb347" stroke-width="2"/>' : '';
  const states = {ready: `已知往返${timeLabel}秒；總路程${total}公尺，去、回各${leg}公尺。`, outbound: '聲音正在去程，傳向反射板。', returning: '聲音已到反射板，正在回程。', received: `已收到返回聲，去程和回程共${timeLabel}秒。`};
  updateText($('calculation-reading'), states[stage]);
}
export function bindCalculationInput(reset) {
  const input = $('echo-time'), message = $('calculation-input-error');
  const entrances = [$('calculation-speaker'), document.querySelector('[data-play="calculation"]')];
  function error(text = '') {
    updateText(message, text); message.hidden = !text;
    input.setAttribute('aria-invalid', String(!!text));
  }
  function availability(disabled) { for (const button of entrances) button.disabled = disabled; }
  input.addEventListener('input', () => {
    const value = input.valueAsNumber, valid = Number.isFinite(value) && value >= MIN_TIME && value <= MAX_TIME;
    if (valid) time = value;
    reset(); availability(!valid);
    // Leave an empty field alone while a learner is replacing the number.
    error(!valid && input.value !== '' ? `請輸入 ${MIN_TIME}～${MAX_TIME} 秒的往返時間。` : '');
  });
  const commit = () => {
    const value = input.valueAsNumber, next = normaliseTime(value, time);
    time = next; input.value = String(time); reset(); availability(false); error();
  };
  input.addEventListener('change', commit);
  input.addEventListener('blur', commit);
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); commit(); input.blur(); }
  });
}
