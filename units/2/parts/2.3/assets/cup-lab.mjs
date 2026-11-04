import { CUP, freshCup, moveCup, advanceCup, cupGeometry } from './cup-lab-model.mjs?v=reaudit-20261103-2';
import { cupSVG, cupEntryDetail } from './cup-lab-view.mjs?v=real-water-entry-20261104';
const $ = s => document.querySelector(s);
const scene = $('#cup-scene'), reduced = matchMedia('(prefers-reduced-motion: reduce)');
let cup = freshCup(), before = null, after = null, preview = null, bubbles = [], recordBubbles = [], previewBubbles = [], drag = null;
const exampleBefore = moveCup(freshCup(), 12, 0);
const exampleAfter = moveCup(exampleBefore, 12, 115);
let rotationUnlocked = false;
let frame = 0, previousTime = 0, lastPaint = 0, lastBubble = 0;
const snapshot = () => ({ ...cup, bubbles: bubbles.map(b => ({ ...b })) });
const displayed = () => preview === 'before' ? before || exampleBefore : preview === 'after' ? after || exampleAfter : cup;
const geometry = (state = cup) => cupGeometry(state.depth, state.angle, state.escaped, state.waterArea);
const needsFrame = () => geometry().draining || bubbles.length || recordBubbles.length || previewBubbles.length;
const ensureTick = () => { if (!frame && needsFrame()) frame = requestAnimationFrame(tick); };
const cancelTick = () => { if (frame) cancelAnimationFrame(frame); frame = 0; previousTime = 0; };
function emit(oldVent, g) {
  if (g.vent - oldVent < .001 || g.mouthExposed) return;
  const now = performance.now();
  if (now - lastBubble < 85) return;
  lastBubble = now;
  bubbles.push({ x: 500 + g.outlet.x * 24, y: 210 + g.outlet.y * 24, r: 8 + (bubbles.length % 3) * 2, age: 0 });
  if (bubbles.length > 16) bubbles.shift();
}
function update(depth, angle, { capture = true, elapsed = 0 } = {}) {
  const old = cup.escaped;
  cup = moveCup(cup, depth, rotationUnlocked ? angle : 0);
  if (elapsed) cup = advanceCup(cup, elapsed);
  const g = geometry();
  if (g.mouthExposed) bubbles = [];
  emit(old, g);
  if (capture && !drag && !before && !cup.wet && g.submerged && g.paperBelowOutside && Math.abs(cup.angle) < .5) before = snapshot();
  if (capture && !drag && before && cup.wet && !after) {
    after = snapshot();
    recordBubbles = after.bubbles.map(b => ({ ...b }));
  }
}
function status(g) {
  if (preview) return preview === 'before' ? '回看杯口朝下入水：少量水已進入杯口，尚未碰到紙團。' : '回看傾斜之後：空氣從杯口逸出，水進入並接觸紙團。';
  if (g.draining) return '杯口露出水面，空氣進入，杯內的水正從杯口流出；紙團仍然是濕的。';
  if (cup.wet && !g.mouthExposed && g.minY < 0 && g.waterArea > 71) return '杯口還在水中，水仍留在杯內；紙團已經沾濕。';
  if (rotationUnlocked && g.mouthExposed) return cup.wet ? g.waterArea > .01 ? '能流出的水已流出，仍有水留在杯內較低處；紙團仍然是濕的。' : '杯內的水已流回水槽；紙團仍然是濕的。' : '杯口已接通外界空氣；上下移動仍會保留你設定的角度。';
  if (cup.wet) return Math.abs(cup.angle) < 2 ? '紙團已經沾水；回正杯子，不會自動補回空氣或讓紙團變乾。' : '空氣從杯口逸出，水進入杯內；水碰到紙團，紙團才變濕。';
  if (g.vent > .005) return '空氣從杯口逸出，水逐漸進入；繼續觀察水是否碰到紙團。';
  if (g.submerged && g.paperBelowOutside) return '少量水已進入杯口，杯內空氣受到壓縮；水還沒碰到紙團，所以紙團保持乾燥。';
  return '請再往下移，讓整個杯子浸入水中；放開後即可抓杯口旋轉。';
}
function render() {
  const state = displayed(), g = geometry(state);
  if (!drag && !preview && geometry().submerged && geometry().paperBelowOutside) rotationUnlocked = true;
  const canRotate = rotationUnlocked;
  scene.innerHTML = cupSVG(state, { id: 'cup-main', bubbles: preview ? previewBubbles : bubbles }) + cupEntryDetail(state);
  Object.assign(scene.dataset, { depth: cup.depth, angle: cup.angle, escaped: cup.escaped, wet: cup.wet, preview: preview || '',
    submerged: g.submerged, paperBelow: g.paperBelowOutside, withinTank: g.withinTank, water: g.water,
    paperY: g.paper.y, waterArea: g.waterArea, targetWaterArea: g.equilibriumWaterArea,
    mouthExposed: g.mouthExposed, draining: g.draining, minY: g.minY,
    rotationUnlocked: canRotate, dragMode: drag?.mode || '' });
  const message = status(g);
  if ($('#cup-status').textContent !== message) $('#cup-status').textContent = message;
  const instruction = preview ? '再點一次同一張觀察紀錄，即可返回目前狀態繼續拖曳。' : canRotate ? '抓住杯口繞著杯身轉動，可向左或向右傾斜；拖杯身可上下移動。' : '先抓住杯子直直往下拖；完全浸入後放開，再抓杯口旋轉。';
  if ($('#cup-instruction').textContent !== instruction) $('#cup-instruction').textContent = instruction;
  const showComparison = true;
  $('#cup-comparison').hidden = !showComparison;
  $('#cup-conclusion').hidden = !showComparison;
  if (showComparison) {
    $('#cup-before-scene').innerHTML = cupSVG(before || exampleBefore, { id: 'cup-before', mini: true }) + cupEntryDetail(before || exampleBefore);
    $('#cup-after-scene').innerHTML = cupSVG(after || exampleAfter, { id: 'cup-after', mini: true, bubbles: recordBubbles });
    document.querySelectorAll('[data-cup-preview]').forEach(b => b.setAttribute('aria-pressed', String(preview === b.dataset.cupPreview)));
  }
}
function tick(now) {
  frame = 0;
  const dt = previousTime ? Math.min(.05, (now - previousTime) / 1000) : 0;
  previousTime = now;
  if (geometry().draining) update(cup.depth, cup.angle, { elapsed: dt });
  // Upward travel conveys escaped air even with reduced motion; omit the sway
  // and slow it down there. Stored observations replay independent particles.
  const rise = particles => particles.filter(bubble => {
    bubble.age += dt; bubble.y -= dt * (reduced.matches ? 65 : 80);
    if (!reduced.matches) bubble.x += Math.sin(bubble.age * 6) * dt * 14;
    return bubble.y > 211 && bubble.age < 8;
  });
  bubbles = rise(bubbles); recordBubbles = rise(recordBubbles); previewBubbles = rise(previewBubbles);
  if (now - lastPaint > 45 || !needsFrame()) { render(); lastPaint = now; }
  if (needsFrame()) frame = requestAnimationFrame(tick);
  else previousTime = 0;
}
$('#cup-reset').addEventListener('click', () => {
  cancelTick(); drag = null; rotationUnlocked = false; cup = freshCup(); before = after = preview = null; bubbles = []; recordBubbles = []; previewBubbles = []; lastBubble = 0;
  render();
});
document.querySelectorAll('[data-cup-preview]').forEach(button => button.addEventListener('click', () => {
  preview = preview === button.dataset.cupPreview ? null : button.dataset.cupPreview;
  previewBubbles = preview === 'after' ? (after?.bubbles || []).map(b => ({ ...b })) : [];
  render(); ensureTick();
}));
function manual(depth, angle) { cancelTick(); preview = null; update(depth, angle); render(); ensureTick(); }
scene.addEventListener('keydown', e => {
  if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) || preview) return;
  e.preventDefault();
  if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !rotationUnlocked) return;
  manual(cup.depth + (e.key === 'ArrowDown' ? .5 : e.key === 'ArrowUp' ? -.5 : 0), cup.angle + (e.key === 'ArrowRight' ? 5 : e.key === 'ArrowLeft' ? -5 : 0));
});
function pointerInScene(e) {
  const svg = scene.querySelector('svg'), matrix = svg.getScreenCTM();
  return new DOMPoint(e.clientX, e.clientY).matrixTransform(matrix.inverse());
}
scene.addEventListener('pointerdown', e => {
  if (e.button !== 0 || !e.target.closest('.cup-glass') || preview) return;
  e.preventDefault(); scene.focus({ preventScroll: true });
  const point = pointerInScene(e), matrix = scene.querySelector('svg').getScreenCTM();
  const canRotate = rotationUnlocked;
  cancelTick();
  drag = { id: e.pointerId, mode: canRotate && e.target.closest('[data-cup-handle="rim"]') ? 'rotate' : 'vertical',
    y: e.clientY, depth: cup.depth, angle: cup.angle, escaped: cup.escaped,
    pixelsPerCm: 24 * Math.hypot(matrix.c, matrix.d),
    polar: Math.atan2(point.y - (210 + (cup.depth - 5) * 24), point.x - 500), rotation: cup.angle };
  scene.setPointerCapture(e.pointerId); render(); ensureTick();
});
scene.addEventListener('pointermove', e => {
  if (!drag || drag.id !== e.pointerId) return;
  if (drag.mode === 'vertical') {
    // A gesture never changes modes midway, even after crossing the immersion threshold.
    update(drag.depth + (e.clientY - drag.y) / drag.pixelsPerCm, drag.angle);
  } else {
    const p = pointerInScene(e), polar = Math.atan2(p.y - (210 + (drag.depth - 5) * 24), p.x - 500);
    const delta = Math.atan2(Math.sin(drag.polar - polar), Math.cos(drag.polar - polar));
    drag.rotation = Math.max(-CUP.maxAngle, Math.min(CUP.maxAngle, drag.rotation + delta * 180 / Math.PI));
    drag.polar = polar;
    update(drag.depth, drag.rotation);
  }
  render();
  ensureTick();
});
function finishDrag(e) {
  if (!drag || drag.id !== e.pointerId) return;
  drag = null;
  if (scene.hasPointerCapture(e.pointerId)) scene.releasePointerCapture(e.pointerId);
  update(cup.depth, cup.angle);
  render();
  ensureTick();
}
for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) scene.addEventListener(event, finishDrag);
document.addEventListener('visibilitychange', () => { previousTime = 0; });
reduced.addEventListener('change', () => {
  previousTime = 0; render(); ensureTick();
});
render();
