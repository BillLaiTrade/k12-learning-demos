import {
  DISTANCE, START_X, END_X,
  appearance, arrivalTime, reachedDistance, clamp, conditions,
  positions, runEnd, sample, winners
} from './sound-speed-model.mjs?v=race-20';
import { addMaterials, particleGlyph, springPath, materialInfo, mediumScene, tuningForkSource } from './sound-speed-rendering.mjs?v=race-20';
import { createTemperatureRig, temperatureText } from './temperature-rig.mjs?v=race-20';
import { createTemperatureProgress } from './temperature-progress.mjs?v=race-20';
import { airChamberScene } from './temperature-chamber.mjs?v=race-20';

export function initSoundSpeed(root) {
// 兩個獨立區塊共用控制器，原生標籤及 SVG 定義各自使用唯一 ID。
const idPrefix = root.dataset.idPrefix || '';
const $ = selector => root.querySelector(selector.replace(/#([\w-]+)/g, (_, id) => `#${idPrefix}${id}`));
const svgNS = 'http://www.w3.org/2000/svg';
const number = new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 1 });
const secondsText = seconds => `${seconds.toFixed(3)} 秒`;
const text = (node, value) => { if (node.textContent !== value) node.textContent = value; };
const attr = (node, name, value) => {
  const next = String(value);
  if (node.getAttribute(name) !== next) node.setAttribute(name, next);
};
const svg = (tag, attributes, parent) => {
  const node = document.createElementNS(svgNS, tag);
  for (const [name, value] of Object.entries(attributes)) attr(node, name, value);
  parent.append(node);
  return node;
};

const state = { mode: root.dataset.soundSpeedMode === 'temperature' ? 'temperature' : 'material', temperature: 80, temperatureTarget: 80, phase: 'idle', time: 0, scope: 'together' };
let models = [], groups = [], frame = 0, runStartWall = null, runStartTime = 0;
let temperatureRig = null;
let noticed = new Set(), context = null, audioFailed = false;
const tones = new Set();
const panel = $('#experiment-panel');

function stopTones() {
  for (const oscillator of tones) { try { oscillator.stop(); } catch {} }
  tones.clear();
}

function audioFailure() {
  audioFailed = true;
  $('#audio-error').hidden = false;
  text($('#audio-error'), '到達提示音暫時無法播放，振動比較仍可繼續操作。');
}

function unlockAudio() {
  if (!$('#arrival-sound').checked || audioFailed) return;
  try {
    if (!context) {
      const Constructor = window.AudioContext || window.webkitAudioContext;
      context = new Constructor();
    }
    context.resume().catch(audioFailure);
  } catch { audioFailure(); }
}

function arrivalTone() {
  if (!$('#arrival-sound').checked || !context || context.state !== 'running' || audioFailed) return;
  const oscillator = context.createOscillator(), gain = context.createGain();
  const now = context.currentTime;
  oscillator.type = 'sine'; oscillator.frequency.value = 740;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(.045, now + .008);
  gain.gain.setValueAtTime(.045, now + .045);
  gain.gain.linearRampToValueAtTime(0, now + .09);
  oscillator.connect(gain); gain.connect(context.destination);
  tones.add(oscillator);
  oscillator.onended = () => { tones.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
  oscillator.start(now); oscillator.stop(now + .1);
}

function buildModel(group) {
  const settings = appearance[group.kind], material = materialInfo[group.kind];
  const heading = state.mode === 'temperature'
    ? group.name.split(' ').map(part => `<span>${part}</span>`).join(' ')
    : group.name;
  const row = document.createElement('figure');
  row.className = 'medium-row'; row.dataset.group = group.id; row.dataset.kind = group.kind;
  row.dataset.speed = String(group.speed);
  row.innerHTML = `
    <header class="medium-header">
      <div class="medium-heading"><h3 class="${state.mode === 'temperature' ? 'temperature-heading' : ''}">${heading}</h3><p>${state.mode === 'temperature' ? group.description : material.phase}</p><p class="individual-time" hidden><span></span><output></output></p></div>
    </header>
    <div class="row-body">
      <div class="field">
        <p class="propagation-readout"><span>振動已傳到</span><output aria-live="off" aria-label="${group.name}振動目前傳到的位置">0 公尺</output></p>
        <svg viewBox="0 0 456 146" role="img" aria-label="${group.name}的內部放大模型，${group.kind === 'water' ? '水槽中的水分子' : group.kind === 'steel' ? '金屬剖面中的原子' : '透明空氣中的分子'}在原位附近沿水平方向振動。"></svg>
        <button class="source-hit" type="button" aria-label="單獨敲擊${group.name}組音叉"></button>
      </div>
      <div class="arrival-readout"><span>到達時間</span><output aria-live="off" aria-label="${group.name}傳到最右端的實際經過時間">—</output></div>
    </div>`;
  $('#models').append(row);
  row.querySelector('.source-hit').addEventListener('click', () => startSingle(group.id));
  const field = row.querySelector('.field svg'), fill = addMaterials(field, `${idPrefix}${group.id}-field`);
  const temperatureMode = state.mode === 'temperature';
  const adjustable = group.id === 'adjustable';
  if (temperatureMode) {
    const height = adjustable?250:170;
    field.setAttribute('viewBox', `0 0 456 ${height}`);
    Object.assign(row.querySelector('.source-hit').style, { top: `${22/height*100}%`, height: `${100/height*100}%`, bottom: 'auto' });
  }
  const scene = temperatureMode ? airChamberScene(field, `${idPrefix}${group.id}-scene`, adjustable) : mediumScene(field, group.kind, `${idPrefix}${group.id}-scene`);
  if (temperatureMode) scene.setTemperature(group.temperature, group.temperature);
  const source = tuningForkSource(scene.sourceLayer || field, group.kind, fill, { labelY: temperatureMode ? 160 : 139 });
  const bonds = svg('g', { fill: 'none', stroke: '#8a9e9c', 'stroke-width': .8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, scene.interior);
  const dots = svg('g', { 'aria-hidden': 'true' }, scene.interior);
  const points = positions(group.kind).map((point, index) => {
    const node = particleGlyph(dots, { kind: group.kind, index, className: 'particle', x: point.x, y: point.y, fill, scale: group.kind === 'steel' ? 1.35 : 1.5 });
    attr(node, 'data-origin-x', point.x); attr(node, 'data-origin-y', point.y); attr(node, 'data-distance', point.distance);
    return { ...point, node };
  });
  const links = [];
  if (group.kind === 'steel') for (const point of points) {
    const index = point.row * settings.columns + point.column;
    for (const offset of [point.column < settings.columns - 1 ? 1 : 0, point.row < settings.rows - 1 ? settings.columns : 0]) {
      if (!offset) continue;
      const other = points[index + offset];
      links.push({ point, other, node: svg('path', { class: 'elastic-link', 'data-first': index, 'data-second': index + offset, d: springPath(point.x, point.y, other.x, other.y) }, bonds) });
    }
  }
  let front = null, reachedTrack = null;
  const trackY = 125;
  const progress = temperatureMode ? createTemperatureProgress(row, group.id) : null;
  if (!temperatureMode) {
    svg('path', { class: 'distance-track', d: `M${START_X} ${trackY}H${END_X}`, stroke: '#c6d5cd', 'stroke-width': 2.2 }, field);
    reachedTrack = svg('path', { class: 'distance-reached', d: `M${START_X} ${trackY}H${START_X}`, stroke: '#176b53', 'stroke-width': 2.6 }, field);
    for (let i = 0; i <= 4; i++) {
      const x = START_X + (END_X - START_X) * i / 4;
      svg('path', { d: `M${x} ${trackY-2}V${trackY+5}`, stroke: '#91aa9b', 'stroke-width': 1 }, field);
    }
    front = svg('g', { class: 'propagation-front', transform: `translate(${START_X} 0)`, visibility: 'hidden', 'aria-hidden': 'true' }, field);
    svg('path', { d: `M0 ${trackY-2}V${trackY+6}`, stroke: '#176b53', 'stroke-width': 1.8, 'vector-effect': 'non-scaling-stroke' }, front);
    svg('path', { d: `M-4 ${trackY-9}H4L0 ${trackY-3}Z`, fill: '#176b53' }, front);
    text(svg('text', { x: START_X, y: trackY+14, 'text-anchor': 'middle', fill: '#5d7565', 'font-size': 12 }, field), '0 m');
    text(svg('text', { x: END_X, y: trackY+14, 'text-anchor': 'middle', fill: '#5d7565', 'font-size': 12 }, field), `${number.format(DISTANCE)} m`);
  }
  if (temperatureMode && adjustable) temperatureRig = createTemperatureRig(row, { prefix: idPrefix, onSelect: conditionTo, chamber: scene });
  return {
    ...group, trackY, progress, startedAt: null, row, points, links, source, scene, front, reachedTrack,
    timeWrap: row.querySelector('.individual-time'), timeCaption: row.querySelector('.individual-time span'), timeOutput: row.querySelector('.individual-time output'),
    distanceOutput: row.querySelector('.propagation-readout output'),
    arrivalCaption: row.querySelector('.arrival-readout span'), arrivalOutput: row.querySelector('.arrival-readout output')
  };
}

function drawResult() {
  const finished = state.scope === 'together' && groups.length > 0 && groups.every(group => state.time >= arrivalTime(group.speed));
  $('#result').hidden = !finished;
  if (!finished) return;
  const first = winners(groups);
  text($('#result-title'), '觀察結果');
  let summary;
  if (state.mode === 'material') summary = '在本次條件下，鋼最先、水其次、空氣最後。介質傳遞振動的特性不同，不能只靠粒子疏密判斷快慢。';
  else {
    const difference = Math.abs(arrivalTime(groups[0].speed) - arrivalTime(groups[1].speed));
    summary = first.length > 1
      ? '兩組都是 20°C，聲音同時到達。'
      : state.temperature > 20
        ? `${temperatureText(state.temperature)}°C 比 20°C 早 ${secondsText(difference)}到達。`
        : `${temperatureText(state.temperature)}°C 比 20°C 晚 ${secondsText(difference)}到達。`;
  }
  text($('#result-summary'), summary);
  // 第五區以核可的一行差值呈現結果，第四區保留原有比較表。
  if (!$('#result-rows')) return;
  const signature = `${state.mode}:${state.temperature}`;
  if ($('#result-rows').dataset.signature === signature) return;
  $('#result-rows').dataset.signature = signature;
  $('#result-rows').replaceChildren();
  for (const group of [...groups].sort((a, b) => b.speed - a.speed)) {
    const row = document.createElement('tr');
    for (const value of [group.name, `${number.format(group.speed)} m/s`, secondsText(arrivalTime(group.speed))]) {
      const cell = document.createElement('td'); cell.textContent = value; row.append(cell);
    }
    $('#result-rows').append(row);
  }
}

function paint(audible = false) {
  panel.dataset.mode = state.mode; panel.dataset.phase = state.phase;
  panel.dataset.scope = state.scope;
  panel.dataset.time = state.time.toFixed(8); panel.dataset.playbackRate = '1';
  if (state.mode === 'temperature') {
    panel.dataset.temperature = state.temperature.toFixed(4);
    panel.dataset.targetTemperature = String(state.temperatureTarget);
    panel.dataset.conditioning = 'false';
    temperatureRig?.render(state.temperature, state.temperatureTarget);
  }
  let newArrival = false;
  for (const model of models) {
    const elapsed = model.startedAt === null ? 0 : Math.min(runEnd([model]), Math.max(0, state.time - model.startedAt));
    const phase = model.startedAt === null ? 'idle' : elapsed >= runEnd([model]) ? 'complete' : state.phase;
    const arrived = elapsed >= arrivalTime(model.speed);
    const distance = reachedDistance(model.speed, elapsed);
    model.row.dataset.time = elapsed.toFixed(8); model.row.dataset.phase = phase;
    model.timeWrap.hidden = state.scope !== 'individual';
    text(model.timeCaption, model.startedAt === null ? '尚未敲擊' : '敲擊後');
    model.timeOutput.hidden = model.startedAt === null;
    text(model.timeOutput, secondsText(elapsed));
    const frontX = START_X + distance / DISTANCE * (END_X - START_X);
    model.row.dataset.reachedDistance = distance.toFixed(4);
    if (model.front) {
      attr(model.front, 'transform', `translate(${frontX.toFixed(4)} 0)`);
      attr(model.front, 'visibility', elapsed > 0 ? 'visible' : 'hidden');
      attr(model.reachedTrack, 'd', `M${START_X} ${model.trackY}H${frontX.toFixed(4)}`);
    }
    text(model.distanceOutput, `${number.format(Math.floor(distance + 1e-8))} 公尺${arrived ? ' · 已到終點' : ''}`);
    for (const point of model.points) {
      const next = sample(point, model.speed, elapsed); point.position = next.x;
      attr(point.node, 'transform', `translate(${next.x.toFixed(4)} ${point.y.toFixed(4)})`);
      attr(point.node, 'data-moving', next.moving);
      attr(point.node, 'data-reached', next.reached);
    }
    model.scene.paint(elapsed, model.speed);
    for (const link of model.links) {
      attr(link.node, 'd', springPath(link.point.position, link.point.y, link.other.position, link.other.y));
    }
    model.source.paint(elapsed, phase);
    text(model.arrivalCaption, '到達時間');
    text(model.arrivalOutput, arrived ? secondsText(arrivalTime(model.speed)) : '—');
    if (arrived) attr(model.arrivalOutput, 'data-arrival', arrivalTime(model.speed));
    else model.arrivalOutput.removeAttribute('data-arrival');
    if (arrived && !noticed.has(model.id)) { noticed.add(model.id); newArrival = true; }
  }
  if (state.mode === 'temperature' && models.length === 2) {
    const observations = models.map(model => ({
      ...model, distance: Number(model.row.dataset.reachedDistance), active: model.startedAt !== null
    }));
    models.forEach((model, index) => model.progress.render(observations[index], observations[1-index], state.scope === 'together'));
  }
  if (audible && newArrival) arrivalTone();
  const actionLabel = state.scope === 'individual' ? '同時敲擊音叉' : { idle: '同時敲擊音叉', running: '暫停觀察', paused: '繼續觀察', complete: state.mode === 'temperature' ? '同時敲擊音叉' : '再次敲擊音叉' }[state.phase];
  text($('#primary-action'), actionLabel);
  $('#pause-action').hidden = state.scope !== 'individual' || !['running','paused'].includes(state.phase);
  text($('#pause-action'), state.phase === 'paused' ? '繼續觀察' : '暫停觀察');
  text($('#playback-state'), state.phase === 'running' ? '實時播放，暫停期間不計時。' : state.phase === 'paused' ? '已暫停，繼續後接續計時。' : state.phase === 'complete' ? '可再次敲擊音叉，重新比較。' : '點按音叉可單獨敲擊該組。');
  drawResult();
}

function stopFrame() {
  if (frame) cancelAnimationFrame(frame);
  frame = 0; runStartWall = null;
}

function resetRun() {
  stopFrame(); stopTones();
  state.phase = 'idle'; state.time = 0; state.scope = 'together'; noticed = new Set();
  for (const model of models) model.startedAt = null;
  paint();
}

function commitTime(now) {
  if (runStartWall === null) return;
  const end = Math.max(0, ...models.filter(model => model.startedAt !== null).map(model => model.startedAt + runEnd([model])));
  state.time = Math.min(end, runStartTime + Math.max(0, now - runStartWall) / 1000);
  if (state.time >= end) state.phase = 'complete';
}

function tick() {
  frame = 0;
  if (state.phase !== 'running') return;
  commitTime(performance.now()); paint(true);
  if (state.phase === 'running') frame = requestAnimationFrame(tick);
  else runStartWall = null;
}

function resume() {
  const bounds = $('#models').getBoundingClientRect();
  if (bounds.height <= innerHeight - 24 && (bounds.top < 12 || bounds.bottom > innerHeight - 12)) {
    $('#models').scrollIntoView({ block: 'center', behavior: 'auto' });
  }
  unlockAudio(); state.phase = 'running'; runStartTime = state.time; runStartWall = performance.now();
  paint(); frame = requestAnimationFrame(tick);
}

function startFresh() {
  resetRun();
  for (const model of models) model.startedAt = 0;
  resume();
}

function startSingle(id) {
  if (state.phase === 'running') commitTime(performance.now());
  stopFrame();
  state.scope = 'individual';
  models.find(model => model.id === id).startedAt = state.time;
  noticed.delete(id);
  resume();
}

function pause() {
  if (state.phase !== 'running') return;
  commitTime(performance.now());
  if (state.phase !== 'complete') state.phase = 'paused';
  stopFrame(); stopTones(); paint();
}

function rebuild() {
  resetRun();
  groups = conditions(state.mode, state.temperature);
  $('#models').replaceChildren();
  models = groups.map(buildModel);
  const temperatureMode = state.mode === 'temperature';
  text($('#lesson-title'), temperatureMode ? '溫度不同，聲音傳到哪裡了？' : '聲音在不同介質中，傳得多快？');
  text($('#lesson-intro'), temperatureMode ? '固定 20°C 參考組，同時敲擊，比較兩組的傳播進度。' : '觀察相鄰粒子如何逐段受振，再比較終點的到達時間。');
  text($('#girl-line'), temperatureMode ? '我們把空氣加熱，再敲一次音叉看看！' : '空氣、水和鋼，裡面的粒子是怎麼把振動傳開的？');
  text($('#grandpa-line'), temperatureMode ? '參考組維持 20°C，用相同距離來比較。' : '音叉被敲一下後來回振動，帶動附近粒子；再看相鄰粒子如何依序受振。');
  $('#takeaway').innerHTML = temperatureMode
    ? '<strong>觀察重點：</strong>只改變空氣溫度，振動頻率維持相同；同溫時，振動會同時傳到最右端。'
    : '<strong>觀察重點：</strong>粒子在原位附近往返；同一聲源頻率相同，三種介質傳遞振動的速度不同。';
  if (temperatureMode && !root.querySelector('.progress-legend')) {
    const legend = document.createElement('p');
    legend.className = 'progress-legend';
    legend.innerHTML = '<span><i class="legend-own" aria-hidden="true"></i>實線：本組進度</span><span><i class="legend-other" aria-hidden="true"></i>虛線：另一組進度</span>';
    root.querySelector('.comparison-board').prepend(legend);
  }
  paint();
}

function updateTemperature(value) {
  state.temperature = value;
  groups = conditions('temperature', value);
  const model = models.find(model => model.id === 'adjustable');
  if (!model) return;
  Object.assign(model, groups.find(group => group.id === 'adjustable'));
  model.row.dataset.speed = String(model.speed);
  const heading = model.row.querySelector('h3');
  text(heading.firstElementChild, `${temperatureText(value)}°C`);
  model.row.style.setProperty('--group-temperature-color', value>20?'#dd7034':value<20?'#348dc1':'#176b53');
  attr(model.row.querySelector('.source-hit'), 'aria-label', `單獨敲擊${model.name}音叉`);
  attr(model.row.querySelector('.field svg'), 'aria-label', `${model.name}的空氣分子放大模型，粒子在原位附近沿水平方向振動。`);
  attr(model.arrivalOutput, 'aria-label', `${model.name}傳到最右端的實際經過時間`);
}

function conditionTo(target) {
  state.temperatureTarget = clamp(target, 0, 80);
  resetRun();
  updateTemperature(state.temperatureTarget);
  paint();
}

$('#primary-action').addEventListener('click', () => {
  if (state.scope === 'individual') startFresh();
  else if (state.phase === 'running') pause();
  else if (state.phase === 'paused') resume();
  else startFresh();
});
$('#pause-action').addEventListener('click', () => state.phase === 'running' ? pause() : resume());
$('#reset-action').addEventListener('click', resetRun);
$('#arrival-sound').addEventListener('change', () => {
  if ($('#arrival-sound').checked) { audioFailed = false; $('#audio-error').hidden = true; unlockAudio(); }
  else { stopTones(); $('#audio-error').hidden = true; }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pause();
});
window.addEventListener('pagehide', () => { pause(); stopTones(); });
rebuild();

}

for (const root of document.querySelectorAll('[data-sound-speed-lab]')) initSoundSpeed(root);
