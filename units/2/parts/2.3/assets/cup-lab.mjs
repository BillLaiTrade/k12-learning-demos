import { CUP, freshCup, moveCup, advanceCup, cupGeometry } from './cup-lab-model.mjs?v=cup-lab-6';
import { cupSVG } from './cup-lab-view.mjs?v=cup-lab-7';
const $ = s => document.querySelector(s);
const scene = $('#cup-scene'), action = $('#cup-action'), reduced = matchMedia('(prefers-reduced-motion: reduce)');
let cup = freshCup(), before = null, after = null, preview = null, animation = null, bubbles = [], drag = null;
let rotationUnlocked = false;
let frame = 0, previousTime = 0, lastPaint = 0, lastBubble = 0, hiddenPaused = false;
const snapshot = () => ({ ...cup, bubbles: bubbles.map(b => ({ ...b })) });
const displayed = () => preview === 'before' ? before : preview === 'after' ? after : cup;
const geometry = (state = cup) => cupGeometry(state.depth, state.angle, state.escaped, state.waterArea);
const needsFrame = () => !!animation || geometry().draining || (bubbles.length && !reduced.matches);
const ensureTick = () => { if (!frame && needsFrame()) frame = requestAnimationFrame(tick); };
const cancelAnimation = () => { animation = null; if (frame) cancelAnimationFrame(frame); frame = 0; previousTime = 0; };
function staticTrace(g) {
  if (g.mouthExposed) return [];
  return [1, 2, 3].map(i => ({ x: 500 + g.outlet.x * 24 + Math.sin(i) * 3, y: 210 + g.outlet.y * 24 * i / 4, r: 2 + i, age: 0 }));
}
function emit(oldVent, g) {
  if (g.vent - oldVent < .001 || reduced.matches || g.mouthExposed) return;
  const now = performance.now();
  if (now - lastBubble < 85) return;
  lastBubble = now;
  bubbles.push({ x: 500 + g.outlet.x * 24, y: 210 + g.outlet.y * 24, r: 4 + (bubbles.length % 3) * 1.5, age: 0 });
  if (bubbles.length > 16) bubbles.shift();
}
function update(depth, angle, { capture = true, elapsed = 0 } = {}) {
  const old = cup.escaped;
  cup = moveCup(cup, depth, rotationUnlocked ? angle : 0);
  if (elapsed) cup = advanceCup(cup, elapsed);
  const g = geometry();
  if (g.mouthExposed) bubbles = [];
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
  if (animation?.paused) return '觀察已暫停。按「繼續觀察」，接著看杯子、水面和氣泡的變化。';
  if (animation?.kind === 'lower') return rotationUnlocked ? '保持目前角度，將杯子放回水中。' : '保持杯口朝下，讓杯子和紙團的位置都低於外側水面。';
  if (g.draining) return '杯口露出水面，空氣進入，杯內的水正從杯口流出；紙團仍然是濕的。';
  if (cup.wet && !g.mouthExposed && g.minY < 0 && g.waterArea > 71) return '杯口還在水中，水仍留在杯內；紙團已經沾濕。';
  if (rotationUnlocked && g.mouthExposed) return cup.wet ? g.waterArea > .01 ? '能流出的水已流出，仍有水留在杯內較低處；紙團仍然是濕的。' : '杯內的水已流回水槽；紙團仍然是濕的。' : '杯口已接通外界空氣；上下移動仍會保留你設定的角度。';
  if (cup.wet) return Math.abs(cup.angle) < 2 ? '紙團已經沾水；回正杯子，不會自動補回空氣或讓紙團變乾。' : '空氣從杯口逸出，水進入杯內；水碰到紙團，紙團才變濕。';
  if (g.vent > .005) return '空氣從杯口逸出，水逐漸進入；繼續觀察水是否碰到紙團。';
  if (g.submerged && g.paperBelowOutside && cup.depth < 11.5) return '紙團已低於外側水面，仍保持乾燥。再往下放一些，放開後即可拖動杯口。';
  if (g.submerged && g.paperBelowOutside) return '紙團低於外側水面，仍保持乾燥。杯裡的水未填滿，空氣可稍微壓縮。';
  return '紙團目前還在外側水面以上。先把整只杯子垂直放入水中。';
}
function render() {
  const state = displayed(), g = geometry(state);
  if (!drag && !animation && cup.depth >= 11.5 && g.submerged && g.paperBelowOutside) rotationUnlocked = true;
  const canRotate = rotationUnlocked;
  scene.innerHTML = cupSVG(state, { id: 'cup-main', bubbles: preview ? state.bubbles || [] : bubbles });
  Object.assign(scene.dataset, { depth: cup.depth, angle: cup.angle, escaped: cup.escaped, wet: cup.wet, preview: preview || '',
    submerged: g.submerged, paperBelow: g.paperBelowOutside, withinTank: g.withinTank, water: g.water,
    paperY: g.paper.y, waterArea: g.waterArea, targetWaterArea: g.equilibriumWaterArea,
    mouthExposed: g.mouthExposed, draining: g.draining, minY: g.minY,
    rotationUnlocked: canRotate, dragMode: drag?.mode || '', paused: animation?.paused || false, animating: !!animation });
  const message = status(g);
  if ($('#cup-status').textContent !== message) $('#cup-status').textContent = message;
  action.innerHTML = `${preview ? '回到目前觀察' : animation ? animation.paused ? '繼續觀察' : '暫停觀察' : cup.depth < 11.5 ? rotationUnlocked ? '放回水中' : '垂直放入水中' : Math.abs(cup.angle) > 90 ? '杯口轉回朝下' : '慢慢傾斜'} <span aria-hidden="true">›</span>`;
  action.disabled = !!drag;
  const instruction = preview ? '回看時保留當時的狀態；返回目前觀察後可繼續拖曳。' : canRotate ? '抓住杯口繞著杯身轉動，可向左或向右傾斜；拖杯身可上下移動。' : '先抓住杯子直直往下拖；完全浸入後放開，再抓杯口旋轉。';
  if ($('#cup-instruction').textContent !== instruction) $('#cup-instruction').textContent = instruction;
  const showComparison = !!(before && after && !animation && !drag);
  $('#cup-comparison').hidden = !showComparison;
  $('#cup-conclusion').hidden = !showComparison;
  if (showComparison) {
    $('#cup-before-scene').innerHTML = cupSVG(before, { id: 'cup-before', mini: true });
    $('#cup-after-scene').innerHTML = cupSVG(after, { id: 'cup-after', mini: true, bubbles: after.bubbles || [] });
    document.querySelectorAll('[data-cup-preview]').forEach(b => b.setAttribute('aria-pressed', String(preview === b.dataset.cupPreview)));
  }
}
function tick(now) {
  frame = 0;
  const dt = previousTime ? Math.min(.05, (now - previousTime) / 1000) : 0;
  previousTime = now;
  if (!animation?.paused) {
    if (animation) {
      animation.elapsed += dt;
      const t = Math.min(1, animation.elapsed / animation.duration), ease = animation.kind === 'tilt' ? t : t * t * (3 - 2 * t);
      update(animation.fromDepth + (animation.toDepth - animation.fromDepth) * ease, animation.fromAngle + (animation.toAngle - animation.fromAngle) * ease, { elapsed: dt });
      if (t === 1) {
        animation = null;
        if (reduced.matches) { const g = geometry(); bubbles = g.vent > .01 ? staticTrace(g) : []; }
      }
    } else if (geometry().draining) {
      update(cup.depth, cup.angle, { elapsed: dt });
    }
    if (!reduced.matches) {
      for (const bubble of bubbles) { bubble.age += dt; bubble.y -= dt * 95; bubble.x += Math.sin(bubble.age * 8) * dt * 6; }
      bubbles = bubbles.filter(b => b.y > 211 && b.age < 4);
    }
  }
  if (now - lastPaint > 45 || !animation) { render(); lastPaint = now; }
  if (needsFrame()) frame = requestAnimationFrame(tick);
  else previousTime = 0;
}
function run(depth, angle, kind) {
  cancelAnimation(); preview = null;
  // The requested cup movement is the observation itself, including in reduced
  // motion mode. Only decorative moving bubbles are suppressed in that mode.
  if (reduced.matches) bubbles = [];
  animation = { fromDepth: cup.depth, fromAngle: cup.angle, toDepth: depth, toAngle: angle, elapsed: 0, duration: kind === 'lower' ? 1.8 : 6, kind, paused: false };
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
  render();
});
document.querySelectorAll('[data-cup-preview]').forEach(button => button.addEventListener('click', () => {
  if (animation) return;
  preview = preview === button.dataset.cupPreview ? null : button.dataset.cupPreview; render();
}));
function manual(depth, angle) { cancelAnimation(); preview = null; update(depth, angle); render(); ensureTick(); }
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
  const escaped = drag.escaped;
  drag = null;
  if (scene.hasPointerCapture(e.pointerId)) scene.releasePointerCapture(e.pointerId);
  update(cup.depth, cup.angle);
  if (reduced.matches && cup.escaped > escaped + .001) bubbles = staticTrace(geometry());
  render();
  ensureTick();
}
for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) scene.addEventListener(event, finishDrag);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { hiddenPaused = !!animation && !animation.paused; if (animation) animation.paused = true; }
  else { previousTime = 0; if (hiddenPaused && animation) animation.paused = false; hiddenPaused = false; }
});
reduced.addEventListener('change', () => {
  if (reduced.matches) bubbles = [];
  render();
});
render();
