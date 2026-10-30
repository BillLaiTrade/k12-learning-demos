import {
  DISTANCE, START_X, END_X,
  appearance, arrivalTime, reachedDistance, conditions,
  positions, runEnd, sample
} from './sound-speed-model.mjs?v=fixed-22';
import { addMaterials, particleGlyph, springPath, materialInfo, mediumScene, tuningForkSource } from './sound-speed-rendering.mjs?v=fixed-22';
import { createTemperatureProgress } from './temperature-progress.mjs?v=start-time-20261029';
import { airChamberScene } from './temperature-chamber.mjs?v=fixed-22';
import { stopOnLeave } from './lesson-playback.mjs?v=1';

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

const state = { mode: root.dataset.soundSpeedMode === 'temperature' ? 'temperature' : 'material', phase: 'idle', time: 0, scope: 'together' };
let models = [], groups = [], frame = 0, runStartWall = null, runStartTime = 0;
const panel = $('#experiment-panel');

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
        <button class="source-hit" type="button" aria-label="單獨敲擊${group.name}音叉"></button>
      </div>
      <div class="arrival-readout"><span>到達時間</span><output aria-live="off" aria-label="${group.name}傳到最右端的實際經過時間">—</output></div>
    </div>`;
  $('#models').append(row);
  row.querySelector('.source-hit').addEventListener('click', () => startSingle(group.id));
  const field = row.querySelector('.field svg'), fill = addMaterials(field, `${idPrefix}${group.id}-field`);
  const temperatureMode = state.mode === 'temperature';
  const hot = group.id === 'hot';
  if (temperatureMode) {
    const height = 150;
    field.setAttribute('viewBox', `0 0 456 ${height}`);
    Object.assign(row.querySelector('.source-hit').style, { top: `${22/height*100}%`, height: `${100/height*100}%`, bottom: 'auto' });
  }
  const scene = temperatureMode ? airChamberScene(field, `${idPrefix}${group.id}-scene`) : mediumScene(field, group.kind, `${idPrefix}${group.id}-scene`);
  if (temperatureMode) scene.setTemperature(group.temperature);
  const source = tuningForkSource(scene.sourceLayer || field, group.kind, fill, { labelY: temperatureMode ? 146 : 139 });
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
  const progress = temperatureMode && hot ? createTemperatureProgress(row, group.id) : null;
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
  text($('#result-title'), '觀察結果');
  let summary;
  if (state.mode === 'material') summary = '在本次條件下，鋼最先、水其次、空氣最後。介質傳遞振動的特性不同，不能只靠粒子疏密判斷快慢。';
  else {
    const difference = Math.abs(arrivalTime(groups[0].speed) - arrivalTime(groups[1].speed));
    summary = `80°C 比 0°C 早 ${secondsText(difference)}到達。`;
  }
  text($('#result-summary'), summary);
  // 第五區以核可的一行差值呈現結果，第四區保留原有比較表。
  if (!$('#result-rows')) return;
  const signature = state.mode;
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

function paint() {
  panel.dataset.mode = state.mode; panel.dataset.phase = state.phase;
  panel.dataset.scope = state.scope;
  panel.dataset.time = state.time.toFixed(8); panel.dataset.playbackRate = '1';
  if (state.mode === 'temperature') panel.dataset.temperatures = groups.map(group => group.temperature).join(',');

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
  }
  if (state.mode === 'temperature' && models.length === 2) {
    const observations = models.map(model => ({
      ...model, distance: Number(model.row.dataset.reachedDistance), active: model.startedAt !== null
    }));
    models.forEach((model, index) => model.progress?.render(observations[index], observations[1-index], state.scope === 'together'));
  }
  const actionLabel = state.scope === 'individual' ? '同時敲擊音叉' : { idle: '同時敲擊音叉', running: '暫停觀察', paused: '繼續觀察', complete: state.mode === 'temperature' ? '同時敲擊音叉' : '再次敲擊音叉' }[state.phase];
  text($('#primary-action'), actionLabel);
  $('#pause-action').hidden = state.scope !== 'individual' || !['running','paused'].includes(state.phase);
  text($('#pause-action'), state.phase === 'paused' ? '繼續觀察' : '暫停觀察');
  const playbackState = $('#playback-state');
  if (playbackState) text(playbackState, state.phase === 'running' ? '實時播放，暫停期間不計時。' : state.phase === 'paused' ? '已暫停，繼續後接續計時。' : state.phase === 'complete' ? '可再次敲擊音叉，重新比較。' : '點按音叉可單獨敲擊該組。');
  drawResult();
}

function stopFrame() {
  if (frame) cancelAnimationFrame(frame);
  frame = 0; runStartWall = null;
}

function resetRun() {
  stopFrame();
  state.phase = 'idle'; state.time = 0; state.scope = 'together';
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
  commitTime(performance.now()); paint();
  if (state.phase === 'running') frame = requestAnimationFrame(tick);
  else runStartWall = null;
}

function resume() {
  const bounds = $('#models').getBoundingClientRect();
  if (bounds.height <= innerHeight - 24 && (bounds.top < 12 || bounds.bottom > innerHeight - 12)) {
    $('#models').scrollIntoView({ block: 'center', behavior: 'auto' });
  }
  state.phase = 'running'; runStartTime = state.time; runStartWall = performance.now();
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
  resume();
}

function pause() {
  if (state.phase !== 'running') return;
  commitTime(performance.now());
  if (state.phase !== 'complete') state.phase = 'paused';
  stopFrame(); paint();
}

function rebuild() {
  resetRun();
  groups = conditions(state.mode);
  $('#models').replaceChildren();
  models = groups.map(buildModel);
  const temperatureMode = state.mode === 'temperature';
  text($('#lesson-title'), temperatureMode ? '溫度不同，聲音傳到哪裡了？' : '聲音在不同介質中，傳得多快？');
  text($('#lesson-intro'), temperatureMode ? '同時敲擊，比較 0°C 與 80°C 空氣中的傳播進度。' : '觀察相鄰粒子如何逐段受振，再比較終點的到達時間。');
  text($('#girl-line'), temperatureMode ? '同樣都是空氣，如果溫度不同，聲音傳得會一樣快嗎？' : '阿公，除了空氣，還有其他介質能傳聲音嗎？');
  text($('#grandpa-line'), temperatureMode ? '兩組都是空氣、距離也相同，只比較溫度的差異。' : '有，水和鋼也能傳聲音。我們可以讓聲音傳過相同的距離，看看在不同介質裡，到達的時間有什麼不同。');
  $('#takeaway').innerHTML = temperatureMode
    ? '原來同樣是空氣，溫度較高時，聲音傳得比較快。'
    : '原來不只空氣能傳聲音，水和鋼也可以！而且聲音在這三種介質裡，傳播的速度還不一樣呢！';
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
stopOnLeave(root.closest('.lesson-card'), pause);
rebuild();

}

for (const root of document.querySelectorAll('[data-sound-speed-lab]')) initSoundSpeed(root);
