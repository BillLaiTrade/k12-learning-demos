import {
  DISTANCE, START_X, END_X, STEP, ZOOM, PULSE_DURATION,
  appearance, arrivalTime, clamp, conditions, displacement,
  positions, runEnd, sample, winners
} from './model.mjs?v=medium-4';
import { addMaterials, particleGlyph, springPath, materialInfo, mediumScene } from './rendering.mjs?v=medium-4';

const $ = selector => document.querySelector(selector);
const svgNS = 'http://www.w3.org/2000/svg';
const number = new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 1 });
const milliseconds = seconds => (seconds * 1000).toFixed(1);
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

const state = { mode: 'material', temperature: 30, slowdown: 50, phase: 'idle', time: 0 };
let models = [], groups = [], frame = 0, lastWallTime = null;
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
  const row = document.createElement('figure');
  row.className = 'medium-row'; row.dataset.group = group.id; row.dataset.kind = group.kind;
  row.dataset.speed = String(group.speed);
  row.innerHTML = `
    <header class="medium-header">
      <div class="medium-heading"><h2>${group.name}</h2><p>${state.mode === 'temperature' ? group.description : material.phase}</p></div>
    </header>
    <div class="row-body">
      <div class="field">
        <svg viewBox="0 0 456 146" role="img" aria-label="${group.name}的內部放大模型，${group.kind === 'water' ? '水槽中的水分子' : group.kind === 'steel' ? '金屬剖面中的原子' : '透明空氣中的分子'}在原位附近沿水平方向振動。"></svg>
        <button class="source-hit" type="button" aria-label="點按${group.name}振動源，重新同時啟動所有組別"></button>
      </div>
      <div class="end-observation"><p class="zoom-title sr-only">最右端放大</p><svg class="zoom" viewBox="0 0 150 120" role="img" aria-label="${group.name}最右端的粒子，尚未開始振動"></svg><p class="end-state">尚未開始振動</p><div class="arrival-readout"><span class="sr-only">最右端到達時間</span><output aria-live="off" aria-label="${group.name}傳到最右端的模型時間">—</output></div></div>
    </div>`;
  $('#models').append(row);
  row.querySelector('.source-hit').addEventListener('click', startFresh);
  const field = row.querySelector('.field svg'), fill = addMaterials(field, `${group.id}-field`);
  const scene = mediumScene(field, group.kind, `${group.id}-scene`);
  svg('path', { class: 'end-connection', d: 'M447 41V101M447 71H456', fill: 'none', stroke: '#94aaa0', 'stroke-width': 1.2 }, field);
  svg('rect', { x: 10, y: 43, width: 26, height: 59, rx: 4, fill: fill('source'), stroke: '#7f9495', 'stroke-width': .8 }, field);
  svg('path', { d: 'M15 48V96M31 48V96', stroke: '#dce4df', 'stroke-width': .8, opacity: .7 }, field);
  const sourceRod = svg('path', { d: 'M30 71H49', stroke: '#728b8b', 'stroke-width': 4 }, field);
  const piston = svg('rect', { x: 45, y: 35, width: 8, height: 72, rx: 2, fill: fill('source'), stroke: '#718a8d', 'stroke-width': .8 }, field);
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
  for (const x of [START_X, END_X]) svg('path', { d: `M${x} 124V133`, stroke: '#a0b1a3', 'stroke-width': 1.2 }, field);
  text(svg('text', { x: START_X, y: 139, 'text-anchor': 'middle', fill: '#5d7565', 'font-size': 12 }, field), '0 m');
  text(svg('text', { x: END_X, y: 139, 'text-anchor': 'middle', fill: '#5d7565', 'font-size': 12 }, field), '100 m');
  const zoom = row.querySelector('.zoom'), zoomFill = addMaterials(zoom, `${group.id}-zoom`);
  const zoomScene = mediumScene(zoom, group.kind, `${group.id}-zoom-scene`, true);
  const endPoints = [30, 60, 90].map((y, index) => particleGlyph(zoomScene.interior, { kind: group.kind, index: Math.round(index * (settings.rows - 1) / 2) * settings.columns + settings.columns - 1, className: 'end-particle', x: 75, y, fill: zoomFill, scale: 1.8 }));
  return {
    ...group, row, points, links, piston, sourceRod, endPoints, zoom, scene,
    arrivalCaption: row.querySelector('.arrival-readout span'), arrivalOutput: row.querySelector('.arrival-readout output'),
    endState: row.querySelector('.end-state')
  };
}

function caption() {
  if (state.phase === 'idle') return '一起啟動振動源，觀察介質裡的振動如何逐段傳開。';
  const arrived = groups.filter(group => state.time >= arrivalTime(group.speed));
  if (!arrived.length) return state.mode === 'material' ? '三組一起開始，觀察粒子逐段受振。' : '兩組一起開始，觀察哪一組先傳到最右端。';
  if (arrived.length === groups.length) return state.phase === 'complete' ? '本輪比較完成，粒子都已回復原位。' : '各組都已傳到最右端，繼續觀察粒子回復原位。';
  if (state.mode === 'material') return arrived.length === 1 ? '鋼已傳到最右端；水與空氣仍在傳遞。' : '水也已傳到最右端；空氣仍在傳遞。';
  return arrived[0].id === 'reference' ? '20°C 參考組先傳到；設定組仍在傳遞。' : `${state.temperature}°C 設定組先傳到；20°C 參考組仍在傳遞。`;
}

function drawResult() {
  const finished = groups.length > 0 && groups.every(group => state.time >= arrivalTime(group.speed));
  $('#result').hidden = !finished;
  if (!finished) return;
  const first = winners(groups);
  text($('#result-title'), '觀察結果');
  let summary;
  if (state.mode === 'material') summary = '在本次條件下，鋼最先、水其次、空氣最後。介質傳遞振動的特性不同，不能只靠粒子疏密判斷快慢。';
  else {
    const difference = Math.abs(arrivalTime(groups[0].speed) - arrivalTime(groups[1].speed));
    summary = first.length > 1
      ? '兩組都是 20°C，聲速相同，振動同時傳到最右端。'
      : `${groups.find(group => group.id === first[0]).name}早約 ${milliseconds(difference)} 毫秒到達。同樣是空氣，溫度較高的一組聲速較快。`;
  }
  text($('#result-summary'), summary);
  const signature = `${state.mode}:${state.temperature}`;
  if ($('#result-rows').dataset.signature === signature) return;
  $('#result-rows').dataset.signature = signature;
  $('#result-rows').replaceChildren();
  for (const group of [...groups].sort((a, b) => b.speed - a.speed)) {
    const row = document.createElement('tr');
    for (const value of [group.name, `${number.format(group.speed)} m/s`, `${milliseconds(arrivalTime(group.speed))} 毫秒`]) {
      const cell = document.createElement('td'); cell.textContent = value; row.append(cell);
    }
    $('#result-rows').append(row);
  }
}

function paint(audible = false, overrideCaption = '') {
  panel.dataset.mode = state.mode; panel.dataset.phase = state.phase;
  panel.dataset.time = state.time.toFixed(8); panel.dataset.slowdown = state.slowdown;
  let newArrival = false;
  for (const model of models) {
    const arrived = state.time >= arrivalTime(model.speed);
    for (const point of model.points) {
      const next = sample(point, model.speed, state.time); point.position = next.x;
      attr(point.node, 'transform', `translate(${next.x.toFixed(4)} ${point.y.toFixed(4)})`);
      attr(point.node, 'opacity', next.reached ? 1 : .64);
      attr(point.node, 'data-reached', next.reached);
    }
    model.scene.paint(state.time, model.speed);
    for (const link of model.links) {
      attr(link.node, 'd', springPath(link.point.position, link.point.y, link.other.position, link.other.y));
    }
    const sourcePosition = 45 + displacement(state.time);
    attr(model.piston, 'x', sourcePosition.toFixed(4));
    attr(model.sourceRod, 'd', `M30 71H${sourcePosition + 4}`);
    const localTime = state.time - arrivalTime(model.speed);
    const offset = displacement(localTime) * ZOOM;
    model.endPoints.forEach((dot, index) => {
      attr(dot, 'transform', `translate(${(75 + offset).toFixed(4)} ${30 + index * 30})`);
      attr(dot, 'opacity', arrived ? 1 : .64);
    });
    const endState = !arrived ? '尚未開始振動' : localTime < PULSE_DURATION ? '正在往返振動' : '已回復靜止';
    text(model.endState, endState);
    attr(model.zoom, 'aria-label', `${model.name}最右端粒子，${endState}，位移放大五倍`);
    text(model.arrivalCaption, arrived ? '已傳到最右端' : '最右端到達時間');
    text(model.arrivalOutput, arrived ? `${milliseconds(arrivalTime(model.speed))} 毫秒` : '—');
    if (arrived) attr(model.arrivalOutput, 'data-arrival', arrivalTime(model.speed));
    else model.arrivalOutput.removeAttribute('data-arrival');
    if (arrived && !noticed.has(model.id)) { noticed.add(model.id); newArrival = true; }
  }
  if (audible && newArrival) arrivalTone();
  text($('#model-time'), `${milliseconds(state.time)} 毫秒`);
  text($('#observation-caption'), overrideCaption || caption());
  const actionLabel = { idle: '同時啟動振動', running: '暫停觀察', paused: '繼續觀察', complete: '再次比較' }[state.phase];
  text($('#primary-action'), actionLabel);
  text($('#playback-state'), state.phase === 'running' ? '所有組別共用相同放慢倍率。' : state.phase === 'paused' ? '已暫停，可繼續或逐格觀察。' : state.phase === 'complete' ? '可再次比較，或切換另一種條件。' : '也可以直接點按各列左側的振動源。');
  drawResult();
}

function stopFrame() {
  if (frame) cancelAnimationFrame(frame);
  frame = 0; lastWallTime = null;
}

function resetRun() {
  stopFrame(); stopTones();
  state.phase = 'idle'; state.time = 0; noticed = new Set();
  paint();
}

function commitTime(now) {
  if (lastWallTime === null) { lastWallTime = now; return; }
  state.time = Math.min(runEnd(groups), state.time + Math.max(0, now - lastWallTime) / 1000 / state.slowdown);
  lastWallTime = now;
  if (state.time >= runEnd(groups)) state.phase = 'complete';
}

function tick(now) {
  frame = 0;
  if (state.phase !== 'running') return;
  commitTime(now); paint(true);
  if (state.phase === 'running') frame = requestAnimationFrame(tick);
  else lastWallTime = null;
}

function resume() {
  const bounds = $('#models').getBoundingClientRect();
  if (bounds.height <= innerHeight - 24 && (bounds.top < 12 || bounds.bottom > innerHeight - 12)) {
    $('#models').scrollIntoView({ block: 'center', behavior: 'auto' });
  }
  unlockAudio(); state.phase = 'running'; lastWallTime = performance.now();
  paint(); frame = requestAnimationFrame(tick);
}

function startFresh() { resetRun(); resume(); }

function pause(message = '') {
  if (state.phase !== 'running') return;
  commitTime(performance.now());
  if (state.phase !== 'complete') state.phase = 'paused';
  stopFrame(); stopTones(); paint(false, message);
}

function rebuild(message = '') {
  resetRun();
  groups = conditions(state.mode, state.temperature);
  $('#models').replaceChildren();
  models = groups.map(buildModel);
  $('#temperature-settings').hidden = state.mode !== 'temperature';
  const temperatureMode = state.mode === 'temperature';
  for (const [mode, button] of [['material', $('#tab-material')], ['temperature', $('#tab-temperature')]]) {
    attr(button, 'aria-selected', mode === state.mode); button.tabIndex = mode === state.mode ? 0 : -1;
  }
  attr(panel, 'aria-labelledby', temperatureMode ? 'tab-temperature' : 'tab-material');
  text($('#lesson-title'), temperatureMode ? '都是空氣，升溫後會早一點傳到嗎？' : '聲音在不同介質中，傳得多快？');
  text($('#lesson-intro'), temperatureMode ? '固定參考組，只改變設定組的空氣溫度。' : '觀察粒子逐段受振，再比較最右端開始振動的時間。');
  text($('#girl-line'), temperatureMode ? '溫度不同時，空氣裡的振動傳遞會怎麼改變？' : '空氣、水和鋼，裡面的粒子是怎麼把振動傳開的？');
  text($('#grandpa-line'), temperatureMode ? '參考組維持 20°C。只改另一組溫度，再用相同條件一起比較。' : '一起啟動，觀察三種介質裡的粒子如何往返，再比較振動傳到最右端的時間。');
  $('#takeaway').innerHTML = temperatureMode
    ? '<strong>觀察重點：</strong>只改變空氣溫度，振動頻率維持相同；同溫時，振動會同時傳到最右端。'
    : '<strong>觀察重點：</strong>粒子在原位附近往返；同一聲源頻率相同，三種介質傳遞振動的速度不同。';
  paint(false, message);
}

function setMode(mode) {
  if (mode === state.mode) return;
  state.mode = mode; rebuild();
}

function setTemperature(value) {
  const next = clamp(Math.round(Number(value)), 0, 30);
  if (!Number.isFinite(next) || next === state.temperature) return;
  state.temperature = next; $('#temperature').value = String(next);
  text($('#temperature-value'), `${next}°C`);
  attr($('#temperature'), 'aria-valuetext', `設定組 ${next} 攝氏度`);
  rebuild(`設定組已改為 ${next}°C，請重新比較。`);
}

$('#primary-action').addEventListener('click', () => {
  if (state.phase === 'running') pause();
  else if (state.phase === 'paused') resume();
  else startFresh();
});
$('#step-action').addEventListener('click', () => {
  unlockAudio();
  if (state.phase === 'running') pause();
  if (state.phase === 'complete') resetRun();
  state.time = Math.min(runEnd(groups), state.time + STEP);
  state.phase = state.time >= runEnd(groups) ? 'complete' : 'paused';
  paint(true);
});
$('#reset-action').addEventListener('click', () => resetRun());
$('#temperature').addEventListener('input', event => setTemperature(event.target.value));
$('#temperature-down').addEventListener('click', () => setTemperature(state.temperature - 1));
$('#temperature-up').addEventListener('click', () => setTemperature(state.temperature + 1));
$('#slowdown').addEventListener('change', event => {
  const value = Number(event.target.value);
  if (![20, 50].includes(value)) return;
  if (state.phase === 'running') commitTime(performance.now());
  state.slowdown = value; paint();
});
$('#arrival-sound').addEventListener('change', () => {
  if ($('#arrival-sound').checked) { audioFailed = false; $('#audio-error').hidden = true; unlockAudio(); }
  else { stopTones(); $('#audio-error').hidden = true; }
});
const tabs = [$('#tab-material'), $('#tab-temperature')];
tabs.forEach((button, index) => {
  button.addEventListener('click', () => setMode(index === 0 ? 'material' : 'temperature'));
  button.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : 1 - index;
    setMode(next === 0 ? 'material' : 'temperature'); tabs[next].focus();
  });
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pause('頁面已暫停，返回後可繼續觀察。');
});
window.addEventListener('pagehide', () => { pause(); stopTones(); });
attr($('#temperature'), 'aria-valuetext', '設定組 30 攝氏度');
rebuild();
