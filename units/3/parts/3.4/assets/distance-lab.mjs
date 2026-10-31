import {echo} from './echo-model.mjs';

export const FIXED_DISTANCE = 34, MIN_DISTANCE = 34, MAX_DISTANCE = 102;
export const AIR_SPEED = 340, TIME_SCALE = 8, END_HOLD = .025;
export const SOURCE_X = 240, PIXELS_PER_METRE = 660 / MAX_DISTANCE;
export const wallX = distance => SOURCE_X + distance * PIXELS_PER_METRE;
export const distanceDuration = (distance, selection = 'both') => (echo(selection === 'near' ? FIXED_DISTANCE : distance, AIR_SPEED).time + END_HOLD) * TIME_SCALE;
export function laneFrame(distance, elapsed) {
  const {time: arrival} = echo(distance, AIR_SPEED), half = arrival / 2;
  const time = Math.max(0, elapsed), received = time >= arrival;
  const stage = received ? 'received' : time < half ? 'outbound' : time < half + .012 ? 'surface' : 'returning';
  const travelled = time < half ? time * AIR_SPEED : Math.max(0, 2 * distance - time * AIR_SPEED);
  return {stage, received, arrival, x: SOURCE_X + travelled * PIXELS_PER_METRE};
}
export function distanceTaps(distance, selection = 'both') {
  const times = [...new Set(selection === 'near' ? [FIXED_DISTANCE] : selection === 'far' ? [distance] : [FIXED_DISTANCE, distance])];
  return [{delay: 0, gain: 1}, ...times.map(d => ({delay: echo(d, AIR_SPEED).time * TIME_SCALE, gain: .45}))];
}
const $ = id => document.getElementById(id);
const seconds = n => n.toFixed(2);
function wavefronts(frame, boundary) {
  if (frame.received) return '';
  const returning = frame.stage === 'returning', color = returning ? '#ffb34d' : '#92d9de';
  let paths = '';
  for (let i = 0; i < 4; i++) {
    const x = frame.x + (returning ? 1 : -1) * i * 15;
    if (x < SOURCE_X || x > boundary) continue;
    const radius = 26 + i * 7, bend = returning ? -18 : 18;
    paths += `<path d="M${x} ${220-radius}Q${x+bend} 220 ${x} ${220+radius}" fill="none" stroke="${color}" stroke-width="9" opacity=".2"/><path d="M${x} ${220-radius}Q${x+bend} 220 ${x} ${220+radius}" fill="none" stroke="${color}" stroke-width="3" opacity="${.95-i*.12}"/>`;
  }
  return paths;
}
export function renderDistance(progress) {
  const root = $('distance'), distance = Number($('wall-distance').value), ready = root.dataset.phase === 'ready';
  const selection = root.dataset.selection || 'both';
  const arrival = echo(selection === 'near' ? FIXED_DISTANCE : distance, AIR_SPEED).time;
  const elapsed = ready ? 0 : Math.min(arrival, progress * distanceDuration(distance, selection) / TIME_SCALE);
  root.dataset.elapsed = elapsed.toFixed(4);
  $('distance-elapsed').textContent = seconds(elapsed);
  $('wall-distance-value').value = distance + ' 公尺';
  $('distance-far-title').textContent = `調整距離｜${distance} 公尺`;
  $('distance-far-record-label').textContent = `${distance === FIXED_DISTANCE ? '同距' : '遠牆'}（${distance} 公尺）`;
  const handle = $('distance-wall');
  handle.setAttribute('aria-valuenow', String(distance));
  handle.setAttribute('aria-valuetext', distance + ' 公尺');
  for (const [name, d] of [['near', FIXED_DISTANCE], ['far', distance]]) {
    const lane = $(`distance-${name}-lane`), frame = laneFrame(d, elapsed), boundary = wallX(d);
    const waiting = ready || (selection !== 'both' && selection !== name);
    const stage = waiting ? 'ready' : frame.stage;
    lane.dataset.stage = stage; lane.dataset.wallX = boundary.toFixed(3);
    lane.style.setProperty('--wall-x', boundary / 10 + '%');
    const words = {ready: '等待發聲', outbound: '傳向牆面', surface: '到達牆面', returning: '反射傳回', received: `已收到 ${seconds(frame.arrival)} 秒`};
    const state = $(`distance-${name}-state`);
    state.textContent = words[stage]; state.dataset.stage = stage;
    $(`distance-${name}-waves`).innerHTML = waiting ? '' : wavefronts(frame, boundary);
    $(`distance-${name}-received`).innerHTML = !waiting && frame.received ? '<circle cx="205" cy="218" r="12" fill="#ffbd58" opacity=".35"/><circle cx="205" cy="218" r="5" fill="#ffe3a2" stroke="#ffb347" stroke-width="2"/>' : '';
    $(`distance-${name}-route`).innerHTML = !waiting && frame.received ? `<path d="M${boundary-4} 220H${SOURCE_X+13}m10-7-10 7 10 7" fill="none" stroke="#ffb34d" stroke-width="2.5" stroke-dasharray="5 4" opacity=".75"/>` : '';
    $(`distance-${name}-dimension`).innerHTML = `<path d="M${SOURCE_X} 332v18m0-9H${boundary}m0-9v18" fill="none" stroke="white" stroke-width="2.5"/><text x="${(SOURCE_X+boundary)/2}" y="365" text-anchor="middle">${d} 公尺</text>`;
    const row = $(`distance-${name}-record`), received = !waiting && frame.received;
    row.dataset.received = String(received);
    row.style.setProperty('--playhead', (waiting ? 0 : Math.min(100, elapsed / .6 * 100)) + '%');
    row.style.setProperty('--trace-end', (waiting ? 0 : Math.min(elapsed, frame.arrival)) / .6 * 100 + '%');
    row.style.setProperty('--arrival', frame.arrival / .6 * 100 + '%');
    const marker = row.querySelector('.distance-arrival'); marker.hidden = !received;
    marker.textContent = seconds(frame.arrival) + ' 秒'; marker.classList.toggle('at-end', frame.arrival > .5);
    const pending = row.querySelector('.distance-pending'); pending.hidden = received;
    pending.textContent = waiting ? '等待發聲' : '等待返回';
  }
  $('distance-reading').textContent = ready ? `固定參照34公尺；下方牆距${distance}公尺，兩組以相同聲速比較。` : `經過${seconds(elapsed)}秒；上方${$('distance-near-state').textContent}，下方${$('distance-far-state').textContent}。`;
}
export function bindDistanceWall(reset) {
  const wall = $('distance-wall'), input = $('wall-distance'), scene = $('distance-far-scene');
  let drag = null;
  const setDistance = value => {
    const next = Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, Math.round(value)));
    if (Number(input.value) === next) return;
    input.value = String(next); input.dispatchEvent(new Event('input', {bubbles: true}));
  };
  wall.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    reset(); drag = {id: event.pointerId, x: event.clientX, distance: Number(input.value)};
    wall.setPointerCapture(event.pointerId); wall.dataset.dragging = 'true'; event.preventDefault(); wall.focus({preventScroll: true});
  });
  wall.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    setDistance(drag.distance + (event.clientX-drag.x) / scene.getBoundingClientRect().width * 1000 / PIXELS_PER_METRE);
  });
  const finish = () => {drag = null; wall.dataset.dragging = 'false';};
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) wall.addEventListener(event, finish);
  wall.addEventListener('keydown', event => {
    const current = Number(input.value), actions = {ArrowLeft: current-1, ArrowDown: current-1, ArrowRight: current+1, ArrowUp: current+1, Home: MIN_DISTANCE, End: MAX_DISTANCE};
    if (!(event.key in actions)) return;
    event.preventDefault(); setDistance(actions[event.key]);
  });
}
export function bindDistanceSpeakers(play) {
  for (const speaker of document.querySelectorAll('[data-distance-speaker]')) {
    let lastTouch = -Infinity;
    speaker.addEventListener('pointerup', event => {
      if (event.pointerType !== 'touch' || !event.isPrimary) return;
      const box = speaker.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) return;
      lastTouch = performance.now(); play(speaker.dataset.distanceSpeaker);
    });
    speaker.addEventListener('click', event => {
      // Touch can omit its compatibility click immediately after dragging. When it
      // does produce one, consume it so the same tap never emits a second pulse.
      const touchClick = event.pointerType === 'touch' || (!event.pointerType && event.detail > 0);
      if (touchClick && performance.now() - lastTouch < 700) return;
      play(speaker.dataset.distanceSpeaker);
    });
  }
}
