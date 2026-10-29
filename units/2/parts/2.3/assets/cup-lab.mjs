import { CUP, freshCup, moveCup, cupGeometry } from './cup-lab-model.mjs?v=cup-lab-3';
import { cupSVG } from './cup-lab-view.mjs?v=cup-lab-3';
const $ = s => document.querySelector(s);
const scene = $('#cup-scene'), action = $('#cup-action'), reduced = matchMedia('(prefers-reduced-motion: reduce)');
let cup = freshCup(), before = null, after = null, preview = null, animation = null, bubbles = [], drag = null;
let rotationUnlocked = false;
let frame = 0, previousTime = 0, lastPaint = 0, lastBubble = 0, hiddenPaused = false;
const snapshot = () => ({ ...cup, bubbles: bubbles.map(b => ({ ...b })) });
const displayed = () => preview === 'before' ? before : preview === 'after' ? after : cup;
const cancelAnimation = () => { animation = null; if (frame) cancelAnimationFrame(frame); frame = 0; previousTime = 0; };
function staticTrace(g) {
  return [1, 2, 3].map(i => ({ x: 500 + g.outlet.x * 24 + Math.sin(i) * 3, y: 210 + g.outlet.y * 24 * i / 4, r: 2 + i, age: 0 }));
}
function emit(oldVent, g) {
  if (g.vent - oldVent < .001 || reduced.matches) return;
  const now = performance.now();
  if (now - lastBubble < 85) return;
  lastBubble = now;
  bubbles.push({ x: 500 + g.outlet.x * 24, y: 210 + g.outlet.y * 24, r: 4 + (bubbles.length % 3) * 1.5, age: 0 });
  if (bubbles.length > 16) bubbles.shift();
}
function update(depth, angle, { capture = true } = {}) {
  const old = cup.escaped;
  cup = moveCup(cup, depth, rotationUnlocked ? angle : 0);
  const g = cupGeometry(cup.depth, cup.angle, cup.escaped);
  emit(old, g);
  if (capture && !drag && cup.depth >= 11.5 && !before && !cup.wet && g.submerged && g.paperBelowOutside && Math.abs(cup.angle) < .5 && (!animation || animation.kind !== 'lower' || cup.depth >= animation.toDepth - .05)) before = snapshot();
  if (capture && !drag && before && cup.wet && (Math.abs(cup.angle) >= 95 || !animation) && !after) {
    after = snapshot();
    // In reduced motion, a static transition trace replaces moving bubbles.
    if (reduced.matches) after.bubbles = staticTrace(g);
  }
}
function status(g) {
  if (preview) return preview === 'before' ? '回看直立入水：紙團低於外側水面，仍保持乾燥。' : '回看傾斜之後：空氣從杯口逸出，水進入並接觸紙團。';
  if (animation?.paused) return '觀察已暫停。可繼續播放，或放大杯口看看。';
  if (animation?.kind === 'lower') return rotationUnlocked ? '保持目前角度，將杯子放回水中。' : '保持杯口朝下，讓杯子和紙團的位置都低於外側水面。';
  if (rotationUnlocked && g.outlet.y <= 0) return cup.wet ? '杯口已接通外界空氣，水可流出；紙團仍然是濕的。' : '杯口已接通外界空氣；上下移動仍會保留你設定的角度。';
  if (cup.wet) return Math.abs(cup.angle) < 2 ? '紙團已經沾水；回正杯子，不會自動補回空氣或讓紙團變乾。' : '空氣從杯口逸出，水進入杯內；水碰到紙團，紙團才變濕。';
  if (g.vent > .005) return '空氣從杯口逸出，水逐漸進入；繼續觀察水是否碰到紙團。';
  if (g.submerged && g.paperBelowOutside && cup.depth < 11.5) return '紙團已低於外側水面，仍保持乾燥。再往下放一些，放開後即可拖動杯口。';
  if (g.submerged && g.paperBelowOutside) return '紙團低於外側水面，仍保持乾燥。杯裡的水未填滿，空氣可稍微壓縮。';
  return '紙團目前還在外側水面以上。先把整只杯子垂直放入水中。';
}
function render() {
  const state = displayed(), g = cupGeometry(state.depth, state.angle, state.escaped);
  if (!drag && !animation && cup.depth >= 11.5 && g.submerged && g.paperBelowOutside) rotationUnlocked = true;
  const canRotate = rotationUnlocked;
  scene.innerHTML = cupSVG(state, { id: 'cup-main', bubbles: preview ? state.bubbles || [] : bubbles });
  Object.assign(scene.dataset, { depth: cup.depth, angle: cup.angle, escaped: cup.escaped, wet: cup.wet, preview: preview || '',
    submerged: g.submerged, paperBelow: g.paperBelowOutside, withinTank: g.withinTank, water: g.water,
    paperY: g.paper.y, rotationUnlocked: canRotate, dragMode: drag?.mode || '', paused: animation?.paused || false, animating: !!animation });
  const message = status(g);
  if ($('#cup-status').textContent !== message) $('#cup-status').textContent = message;
  action.innerHTML = `${preview ? '回到目前觀察' : animation ? animation.paused ? '繼續觀察' : '暫停觀察' : cup.depth < 11.5 ? rotationUnlocked ? '放回水中' : '垂直放入水中' : Math.abs(cup.angle) > 90 ? '杯口轉回朝下' : '慢慢傾斜'} <span aria-hidden="true">›</span>`;
  action.disabled = !!drag;
  const instruction = preview ? '回看時保留當時的狀態；返回目前觀察後可繼續拖曳。' : canRotate ? '抓住杯口繞著杯身轉動，可向左或向右傾斜；拖杯身可上下移動。' : '先抓住杯子直直往下拖；完全浸入後放開，再抓杯口旋轉。';
  if ($('#cup-instruction').textContent !== instruction) $('#cup-instruction').textContent = instruction;
  $('#cup-depth').value = cup.depth; $('#cup-angle').value = cup.angle;
  $('#cup-angle').disabled = !canRotate || !!animation || !!preview || !!drag;
  $('#cup-depth').disabled = !!animation || !!preview;
  const showComparison = !!(before && after && !animation && !drag);
  $('#cup-comparison').hidden = !showComparison;
  $('#cup-conclusion').hidden = !showComparison;
  if (showComparison) {
    $('#cup-before-scene').innerHTML = cupSVG(before, { id: 'cup-before', mini: true });
    $('#cup-after-scene').innerHTML = cupSVG(after, { id: 'cup-after', mini: true, bubbles: after.bubbles || [] });
    document.querySelectorAll('[data-cup-preview]').forEach(b => b.setAttribute('aria-pressed', String(preview === b.dataset.cupPreview)));
  }
  if (!$('#cup-zoom').hidden) $('#cup-zoom-scene').innerHTML = cupSVG(state, { id: 'cup-detail', zoom: true, bubbles: preview ? state.bubbles || [] : bubbles });
}
function tick(now) {
  frame = 0;
  const dt = previousTime ? Math.min(.05, (now - previousTime) / 1000) : 0;
  previousTime = now;
  if (!animation?.paused) {
    if (animation) {
      animation.elapsed += dt;
      const t = Math.min(1, animation.elapsed / animation.duration), ease = t * t * (3 - 2 * t);
      update(animation.fromDepth + (animation.toDepth - animation.fromDepth) * ease, animation.fromAngle + (animation.toAngle - animation.fromAngle) * ease);
      if (t === 1) animation = null;
    }
    for (const bubble of bubbles) { bubble.age += dt; bubble.y -= dt * 95; bubble.x += Math.sin(bubble.age * 8) * dt * 6; }
    bubbles = bubbles.filter(b => b.y > 211 && b.age < 4);
  }
  if (now - lastPaint > 45 || !animation) { render(); lastPaint = now; }
  if (animation || bubbles.length) frame = requestAnimationFrame(tick);
  else previousTime = 0;
}
function run(depth, angle, kind) {
  cancelAnimation(); preview = null;
  if (reduced.matches) { update(depth, angle); const g = cupGeometry(cup.depth, cup.angle, cup.escaped); bubbles = g.vent > .01 ? staticTrace(g) : []; render(); return; }
  animation = { fromDepth: cup.depth, fromAngle: cup.angle, toDepth: depth, toAngle: angle, elapsed: 0, duration: kind === 'lower' ? 1.8 : 3.2, kind, paused: false };
  frame = requestAnimationFrame(tick); render();
}
action.addEventListener('click', () => {
  if (preview) { preview = null; render(); return; }
  if (animation) { animation.paused = !animation.paused; render(); return; }
  if (cup.depth < 11.5) run(CUP.immersedDepth, cup.angle, 'lower');
  else run(cup.depth, Math.abs(cup.angle) > 90 ? 0 : (cup.angle < 0 ? -CUP.maxAngle : CUP.maxAngle), 'tilt');
});
$('#cup-reset').addEventListener('click', () => {
  cancelAnimation(); drag = null; rotationUnlocked = false; cup = freshCup(); before = after = preview = null; bubbles = []; lastBubble = 0;
  $('#cup-zoom').hidden = true;
  $('#cup-zoom-toggle').setAttribute('aria-expanded', 'false'); render();
});
$('#cup-zoom-toggle').addEventListener('click', () => {
  $('#cup-zoom').hidden = !$('#cup-zoom').hidden;
  $('#cup-zoom-toggle').setAttribute('aria-expanded', String(!$('#cup-zoom').hidden)); render();
});
document.querySelectorAll('[data-cup-preview]').forEach(button => button.addEventListener('click', () => {
  if (animation) return;
  preview = preview === button.dataset.cupPreview ? null : button.dataset.cupPreview; render();
}));
function manual(depth, angle) { cancelAnimation(); preview = null; update(depth, angle); render(); if (bubbles.length && !reduced.matches) frame = requestAnimationFrame(tick); }
$('#cup-depth').addEventListener('input', e => manual(e.target.value, cup.angle));
$('#cup-angle').addEventListener('input', e => manual(cup.depth, e.target.value));
$('#cup-straight').addEventListener('click', () => manual(cup.depth, 0));
$('#cup-up').addEventListener('click', () => manual(cup.depth - 2, cup.angle));
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
  cancelAnimation();
  drag = { id: e.pointerId, mode: canRotate && e.target.closest('[data-cup-handle="rim"]') ? 'rotate' : 'vertical',
    y: e.clientY, depth: cup.depth, angle: cup.angle, escaped: cup.escaped,
    pixelsPerCm: 24 * Math.hypot(matrix.c, matrix.d),
    polar: Math.atan2(point.y - (210 + (cup.depth - 5) * 24), point.x - 500), rotation: cup.angle };
  scene.setPointerCapture(e.pointerId); render();
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
  if (!frame && bubbles.length && !reduced.matches) frame = requestAnimationFrame(tick);
});
function finishDrag(e) {
  if (!drag || drag.id !== e.pointerId) return;
  const escaped = drag.escaped;
  drag = null;
  if (scene.hasPointerCapture(e.pointerId)) scene.releasePointerCapture(e.pointerId);
  update(cup.depth, cup.angle);
  if (reduced.matches && cup.escaped > escaped + .001) bubbles = staticTrace(cupGeometry(cup.depth, cup.angle, cup.escaped));
  render();
  if (!frame && bubbles.length && !reduced.matches) frame = requestAnimationFrame(tick);
}
for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) scene.addEventListener(event, finishDrag);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { hiddenPaused = !!animation && !animation.paused; if (animation) animation.paused = true; }
  else { previousTime = 0; if (hiddenPaused && animation) animation.paused = false; hiddenPaused = false; }
});
reduced.addEventListener('change', () => {
  if (reduced.matches && animation) { const { toDepth, toAngle } = animation; cancelAnimation(); update(toDepth, toAngle); bubbles = []; render(); }
});
render();
