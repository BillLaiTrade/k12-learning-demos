import {
  DISTANCE, START_X, END_X, ZOOM, PULSE_DURATION,
  appearance, arrivalTime, reachedDistance, clamp, conditions,
  positions, runEnd, sample, winners
} from './sound-speed-model.mjs?v=individual-11';
import { addMaterials, particleGlyph, springPath, materialInfo, mediumScene, tuningForkSource } from './sound-speed-rendering.mjs?v=individual-11';

export function initSoundSpeed(root) {
const $ = selector => root.querySelector(selector);
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

const state = { mode: 'material', temperature: 30, phase: 'idle', time: 0, scope: 'together' };
let models = [], groups = [], frame = 0, runStartWall = null, runStartTime = 0;
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
      <div class="medium-heading"><h3>${group.name}</h3><p>${state.mode === 'temperature' ? group.description : material.phase}</p><p class="individual-time" hidden><span></span><output></output></p></div>
    </header>
    <div class="row-body">
      <div class="field">
        <p class="propagation-readout"><span>振動已傳到</span><output aria-live="off" aria-label="${group.name}振動目前傳到的位置">0 公尺</output></p>
        <svg viewBox="0 0 456 146" role="img" aria-label="${group.name}的內部放大模型，${group.kind === 'water' ? '水槽中的水分子' : group.kind === 'steel' ? '金屬剖面中的原子' : '透明空氣中的分子'}在原位附近沿水平方向振動。"></svg>
        <button class="source-hit" type="button" aria-label="單獨敲擊${group.name}組音叉"></button>
      </div>
      <div class="end-observation"><p class="zoom-title sr-only">末端相鄰粒子</p><svg class="zoom" viewBox="0 0 150 120" role="img" aria-label="${group.name}末端三個相鄰粒子依序受振，最右邊為終點"></svg><p class="end-state">終點尚未受振</p><div class="arrival-readout"><span>到達時間</span><output aria-live="off" aria-label="${group.name}傳到最右端的實際經過時間">—</output></div></div>
    </div>`;
  $('#models').append(row);
  row.querySelector('.source-hit').addEventListener('click', () => startSingle(group.id));
  const field = row.querySelector('.field svg'), fill = addMaterials(field, `${group.id}-field`);
  const scene = mediumScene(field, group.kind, `${group.id}-scene`);
  svg('path', { class: 'end-connection', d: 'M447 41V101M447 71H456', fill: 'none', stroke: '#94aaa0', 'stroke-width': 1.2 }, field);
  const source = tuningForkSource(field, group.kind, fill);
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
  svg('path', { class: 'distance-track', d: `M${START_X} 125H${END_X}`, stroke: '#c6d5cd', 'stroke-width': 2.2 }, field);
  const reachedTrack = svg('path', { class: 'distance-reached', d: `M${START_X} 125H${START_X}`, stroke: '#176b53', 'stroke-width': 2.6 }, field);
  for (let i = 0; i <= 4; i++) {
    const x = START_X + (END_X - START_X) * i / 4;
    svg('path', { d: `M${x} 123V130`, stroke: '#91aa9b', 'stroke-width': 1 }, field);
  }
  const front = svg('g', { class: 'propagation-front', transform: `translate(${START_X} 0)`, visibility: 'hidden', 'aria-hidden': 'true' }, field);
  svg('path', { d: 'M0 123V131', stroke: '#176b53', 'stroke-width': 1.8, 'vector-effect': 'non-scaling-stroke' }, front);
  svg('path', { d: 'M-4 116H4L0 122Z', fill: '#176b53' }, front);
  text(svg('text', { x: START_X, y: 139, 'text-anchor': 'middle', fill: '#5d7565', 'font-size': 12 }, field), '0 m');
  text(svg('text', { x: END_X, y: 139, 'text-anchor': 'middle', fill: '#5d7565', 'font-size': 12 }, field), `${number.format(DISTANCE)} m`);
  const zoom = row.querySelector('.zoom'), zoomFill = addMaterials(zoom, `${group.id}-zoom`);
  const zoomScene = mediumScene(zoom, group.kind, `${group.id}-zoom-scene`, true);
  const rowIndex = Math.floor(settings.rows / 2);
  const endPoints = points.filter(point => point.row === rowIndex).slice(-3).map((point, index) => {
    const x = 38 + index * 37;
    const node = particleGlyph(zoomScene.interior, { kind: group.kind, index: rowIndex * settings.columns + point.column, className: 'end-particle', x, y: 60, fill: zoomFill, scale: 1.45 });
    attr(node, 'data-origin-x', x); attr(node, 'data-distance', point.distance);
    return { point, x, node };
  });
  const zoomLinks = group.kind === 'steel' ? endPoints.slice(0,-1).map((point, index) => {
    const other = endPoints[index + 1];
    const node = svg('path', { class: 'zoom-link', d: springPath(point.x,60,other.x,60), fill:'none', stroke:'#8a9e9c', 'stroke-width':1 }, zoomScene.interior);
    zoomScene.interior.prepend(node);
    return { point, other, node };
  }) : [];
  text(svg('text', { x:112, y:96, 'text-anchor':'middle', fill:'#526f5c', 'font-size':12 }, zoom), '終點');
  return {
    ...group, startedAt: null, row, points, links, source, endPoints, zoomLinks, zoom, scene, front, reachedTrack,
    timeWrap: row.querySelector('.individual-time'), timeCaption: row.querySelector('.individual-time span'), timeOutput: row.querySelector('.individual-time output'),
    distanceOutput: row.querySelector('.propagation-readout output'),
    arrivalCaption: row.querySelector('.arrival-readout span'), arrivalOutput: row.querySelector('.arrival-readout output'),
    endState: row.querySelector('.end-state')
  };
}

function caption() {
  if (state.phase === 'idle') return '敲擊後音叉來回振動，帶動附近粒子，再將擾動逐段傳開。';
  if (state.scope === 'individual') return state.phase === 'complete'
    ? '已敲擊的組別都已回復靜止，可再點音叉，或同時敲擊比較。'
    : '個別敲擊：各組從自己的敲擊時刻計時；可再點其他音叉。';
  const arrived = groups.filter(group => state.time >= arrivalTime(group.speed));
  if (!arrived.length) return state.mode === 'material' ? '粒子在原位附近往返，擾動由相鄰粒子逐段傳遞。' : '兩組一起開始，觀察哪一組先傳到最右端。';
  if (arrived.length === groups.length) return state.phase === 'complete' ? '本輪比較完成，粒子都已回復原位。' : '各組都已傳到最右端，繼續觀察粒子回復原位。';
  if (state.mode === 'material') return arrived.length === 1 ? '鋼已傳到最右端；水與空氣仍在傳遞。' : '水也已傳到最右端；空氣仍在傳遞。';
  return arrived[0].id === 'reference' ? '20°C 參考組先傳到；設定組仍在傳遞。' : `${state.temperature}°C 設定組先傳到；20°C 參考組仍在傳遞。`;
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
      ? '兩組都是 20°C，聲速相同，振動同時傳到最右端。'
      : `${groups.find(group => group.id === first[0]).name}早約 ${secondsText(difference)}到達。同樣是空氣，溫度較高的一組聲速較快。`;
  }
  text($('#result-summary'), summary);
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

function paint(audible = false, overrideCaption = '') {
  panel.dataset.mode = state.mode; panel.dataset.phase = state.phase;
  panel.dataset.scope = state.scope;
  panel.dataset.time = state.time.toFixed(8); panel.dataset.playbackRate = '1';
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
    attr(model.front, 'transform', `translate(${frontX.toFixed(4)} 0)`);
    attr(model.front, 'visibility', elapsed > 0 ? 'visible' : 'hidden');
    attr(model.reachedTrack, 'd', `M${START_X} 125H${frontX.toFixed(4)}`);
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
    const localTime = elapsed - arrivalTime(model.speed);
    for (const dot of model.endPoints) {
      const next = sample(dot.point, model.speed, elapsed);
      dot.position = dot.x + (next.x - dot.point.x) * ZOOM;
      attr(dot.node, 'transform', `translate(${dot.position.toFixed(4)} 60)`);
      attr(dot.node, 'data-moving', next.moving);
    }
    for (const link of model.zoomLinks) attr(link.node, 'd', springPath(link.point.position,60,link.other.position,60));
    const endState = !arrived ? '終點尚未受振' : localTime < PULSE_DURATION ? '終點振動中' : '終點已靜止';
    text(model.endState, endState);
    attr(model.zoom, 'aria-label', `${model.name}末端三個相鄰粒子依序受振，最右邊為終點，${endState}`);
    text(model.arrivalCaption, '到達時間');
    text(model.arrivalOutput, arrived ? secondsText(arrivalTime(model.speed)) : '—');
    if (arrived) attr(model.arrivalOutput, 'data-arrival', arrivalTime(model.speed));
    else model.arrivalOutput.removeAttribute('data-arrival');
    if (arrived && !noticed.has(model.id)) { noticed.add(model.id); newArrival = true; }
  }
  if (audible && newArrival) arrivalTone();
  text($('#model-time'), secondsText(state.time));
  text($('#clock-caption'), state.scope === 'individual' ? '操作經過時間' : '經過時間');
  text($('#observation-caption'), overrideCaption || caption());
  const actionLabel = state.scope === 'individual' ? '同時敲擊音叉' : { idle: '同時敲擊音叉', running: '暫停觀察', paused: '繼續觀察', complete: '再次敲擊音叉' }[state.phase];
  text($('#primary-action'), actionLabel);
  $('#pause-action').hidden = state.scope !== 'individual' || !['running','paused'].includes(state.phase);
  text($('#pause-action'), state.phase === 'paused' ? '繼續觀察' : '暫停觀察');
  text($('#playback-state'), state.phase === 'running' ? '實時播放，暫停期間不計時。' : state.phase === 'paused' ? '已暫停，繼續後接續計時。' : state.phase === 'complete' ? '可再次比較，或切換另一種條件。' : '點按音叉可單獨敲擊該組。');
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
  text($('#lesson-intro'), temperatureMode ? '固定參考組，只改變設定組的空氣溫度。' : '觀察相鄰粒子如何逐段受振，再比較終點的到達時間。');
  text($('#girl-line'), temperatureMode ? '溫度不同時，空氣裡的振動傳遞會怎麼改變？' : '空氣、水和鋼，裡面的粒子是怎麼把振動傳開的？');
  text($('#grandpa-line'), temperatureMode ? '參考組維持 20°C。只改另一組溫度，再用相同條件一起比較。' : '音叉被敲一下後來回振動，帶動附近粒子；再看相鄰粒子如何依序受振。');
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
  if (state.scope === 'individual') startFresh();
  else if (state.phase === 'running') pause();
  else if (state.phase === 'paused') resume();
  else startFresh();
});
$('#pause-action').addEventListener('click', () => state.phase === 'running' ? pause() : resume());
$('#reset-action').addEventListener('click', () => resetRun());
$('#temperature').addEventListener('input', event => setTemperature(event.target.value));
$('#temperature-down').addEventListener('click', () => setTemperature(state.temperature - 1));
$('#temperature-up').addEventListener('click', () => setTemperature(state.temperature + 1));
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

}

for (const root of document.querySelectorAll('[data-sound-speed-lab]')) initSoundSpeed(root);
