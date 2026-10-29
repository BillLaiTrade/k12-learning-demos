import { DURATION, LIQUID, PAPER_HEIGHT, BASELINE, HOME, MOUNT, SAMPLES, placement, chromatographyState } from './chromatography-state.js?v=sixteen-1';
const lab = document.getElementById('chrom-lab');
const canvas = document.getElementById('chrom-canvas');
const paper = document.getElementById('chrom-paper');
const drop = document.getElementById('chrom-drop');
const clip = document.getElementById('chrom-clip');
const reset = document.getElementById('chrom-reset');
const status = document.getElementById('chrom-status');
const choices = [...document.querySelectorAll('.ink-choice')];
const ctx = canvas.getContext('2d');
const W = 1536, H = 1024, PW = 109, PH = PAPER_HEIGHT * H;
let sample = 'green', mode = 'ready', pos = { ...HOME }, seconds = 0;
let raf = null, last = null, drag = null, pointerHandled = false;
const background = new Image();
// Seeded paper fibers stay fixed as the solvent and dyes move.
const texture = document.createElement('canvas');
texture.width = PW; texture.height = PH;
const tc = texture.getContext('2d');
tc.fillStyle = '#f8f7f3'; tc.fillRect(0, 0, PW, PH);
let seed = 417;
const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
for (let i = 0; i < 11500; i++) {
  tc.strokeStyle = random() > .5 ? '#fff9' : '#756e5b10';
  const x = random() * PW, y = random() * PH;
  tc.beginPath(); tc.moveTo(x, y); tc.lineTo(x + random() * 2 - 1, y + 1 + random() * 3); tc.stroke();
}
function stop() { if (raf !== null) cancelAnimationFrame(raf); raf = null; last = null; }
function announce(message) { status.textContent = message; }
// A deterministic, mottled pigment stamp gives fiber-like feathering instead
// of identical geometric ellipses. It is cached and never changes with time.
const pigmentCache = new Map();
function pigment(color) {
  if (pigmentCache.has(color)) return pigmentCache.get(color);
  const stamp = document.createElement('canvas'); stamp.width = stamp.height = 128;
  const brush = stamp.getContext('2d'), pixels = brush.createImageData(128, 128);
  for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
    const nx = (x - 63.5) / 64, ny = (y - 63.5) / 64;
    const angle = Math.atan2(ny, nx);
    const edge = 1 + .065 * Math.sin(angle * 5) + .035 * Math.cos(angle * 11);
    const r = Math.hypot(nx, ny) / edge;
    const noise = (Math.sin(x * 127.1 + y * 311.7) * 43758.5453) % 1;
    const density = Math.max(0, Math.exp(-3 * r * r) - Math.exp(-3));
    const i = (y * 128 + x) * 4;
    pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = 255;
    pixels.data[i + 3] = Math.round(235 * density * (.75 + .20 * Math.abs(noise) + .05 * Math.sin(x * 2.8)));
  }
  brush.putImageData(pixels, 0, 0); brush.globalCompositeOperation = 'source-in';
  brush.fillStyle = color; brush.fillRect(0, 0, 128, 128);
  pigmentCache.set(color, stamp); return stamp;
}
function band(x, y, rx, ry, color, opacity = 1) {
  ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, opacity));
  ctx.drawImage(pigment(color), x - rx, y - ry, rx * 2, ry * 2); ctx.restore();
}
function pigmentTrail(baselineY, headY, color, opacity, width) {
  const distance = Math.max(0, baselineY - headY);
  if (distance < 1) return;
  const count = Math.ceil(distance / 4);
  for (let i = 0; i <= count; i++) {
    const f = i / count;
    // Taper the tail towards the origin. A slight fixed meander avoids a
    // ruler-straight stripe; no pigment is painted ahead of the band.
    const x = Math.sin(f * 8.3) * 2.2;
    band(x, baselineY - distance * f, width * (.48 + .52 * f), 5, color, opacity * (.2 + .8 * f));
  }
}
function draw() {
  const installed = !['ready', 'selected', 'dragging'].includes(mode);
  const state = chromatographyState(seconds, pos.top, sample);
  ctx.clearRect(0, 0, W, H); ctx.drawImage(background, 0, 0, W, H);
  // Ink entering the bath spreads, rather than producing separated bands.
  if (mode === 'spilled') {
    ctx.save(); ctx.beginPath(); ctx.ellipse(1048, 757, 191, 68, 0, 0, Math.PI * 2); ctx.clip();
    band(1048, 745, 45 + 155 * state.progress, 20 + 65 * state.progress, SAMPLES[sample].ink, .5 * state.progress);
    ctx.restore();
  }
  ctx.save(); ctx.translate(pos.x * W, pos.top * H);
  const angle = installed ? (mode === 'spilled' ? -.04 : 0) : .115;
  ctx.rotate(angle);
  ctx.shadowColor = '#27352e35'; ctx.shadowBlur = installed ? 4 : 13; ctx.shadowOffsetX = 4; ctx.shadowOffsetY = 6;
  ctx.drawImage(texture, -PW / 2, 0, PW, PH); ctx.shadowColor = 'transparent';
  ctx.save(); ctx.beginPath(); ctx.rect(-PW / 2, 0, PW, PH); ctx.clip();
  if (installed && state.kind !== 'dry') {
    const wetY = Math.max(0, (state.front - pos.top) * H);
    const wet = ctx.createLinearGradient(0, wetY, 0, wetY + 18);
    wet.addColorStop(0, '#9f9d8500'); wet.addColorStop(1, '#918b7636');
    ctx.fillStyle = wet; ctx.fillRect(-PW / 2, wetY, PW, PH - wetY);
    ctx.strokeStyle = '#737c6780'; ctx.lineWidth = 1.4; ctx.beginPath();
    for (let x = -PW / 2; x <= PW / 2; x += 2) {
      const y = wetY + Math.sin(x * .13) * 1.6;
      if (x === -PW / 2) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  const baselineY = PH * BASELINE;
  ctx.strokeStyle = '#68665b94'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-PW/2, baselineY); ctx.lineTo(PW/2, baselineY + .6); ctx.stroke();
  const active = installed && state.kind === 'valid';
  const separation = active ? state.separation : 0;
  const dotOpacity = mode === 'spilled' ? 1 - state.progress : active ? state.originOpacity : 1;
  if (active && state.spread > 0) {
    const travel = (state.baseline - state.front) * H;
    const mixedHead = baselineY - travel * .68;
    // The original mixed spot first elongates into a plume. Later it thins
    // into a faint trace, while the individual component bands resolve.
    pigmentTrail(baselineY, mixedHead, SAMPLES[sample].ink,
      state.spread * (.42 - .35 * separation), 18 + 5 * state.spread);
    band(0, baselineY - Math.min(12, travel * .3), 14 + 6 * state.spread,
      7 + Math.min(13, travel * .24), SAMPLES[sample].ink, .28 * state.spread * (1 - separation));
  }
  band(0, baselineY, 13 + (active ? 3 * state.spread : 0), 7, SAMPLES[sample].ink, dotOpacity);
  if (active && separation > 0) {
    for (const [i, b] of state.bands.entries()) {
      const y = (b.y - pos.top) * H;
      const room = (b.y - state.front) * H;
      const ry = Math.min(10 + 17 * state.progress, Math.max(1, room * .65));
      pigmentTrail(baselineY, y + ry * .35, b.color, .18 * separation, 14 + i * 2);
      band(0, y, 29 + 17 * state.progress, ry, b.color, separation);
      band(-10 + i * 7, y + 4, 17, Math.min(ry * 1.35, room * .8), b.color, .22 * separation);
    }
    ctx.globalAlpha = .28; ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(texture, -PW/2, 0); ctx.globalAlpha = 1;
  }
  ctx.restore();
  ctx.strokeStyle = '#d5d2c8'; ctx.lineWidth = 1; ctx.strokeRect(-PW/2, 0, PW, PH);
  if (installed && pos.top < LIQUID && state.bottom > LIQUID) {
    ctx.fillStyle = '#ccd8d51c'; ctx.fillRect(-PW/2, (LIQUID-pos.top)*H, PW, (state.bottom-LIQUID)*H);
  }
  ctx.restore();
  if (installed && mode !== 'spilled') {
    // Restore the actual pencil/clip in front of the paper, never stretch it.
    ctx.drawImage(background, 1006, 145, 100, 133, 1006, 145, 100, 133);
  }
  paper.style.left = `${pos.x * 100}%`; paper.style.top = `${pos.top * 100}%`;
  paper.style.height = `${PAPER_HEIGHT * 100}%`;
  paper.style.transform = `translateX(-50%) rotate(${installed ? 0 : 6.6}deg)`;
  paper.setAttribute('aria-label', installed ? (mode === 'running' ? '暫停層析實驗' : mode === 'paused' ? '繼續層析實驗' : '重做這份墨水的層析實驗') : '拿起濾紙，放入燒杯');
  paper.setAttribute('aria-pressed', String(mode === 'selected'));
  clip.disabled = !installed;
  lab.dataset.mode = mode; lab.dataset.ink = sample;
  lab.dataset.progress = state.progress.toFixed(5);
  lab.dataset.phase = state.phase;
  lab.dataset.contact = String(state.contact);
  lab.dataset.spread = state.spread.toFixed(5);
  lab.dataset.separation = state.separation.toFixed(5);
  lab.dataset.originOpacity = (installed ? dotOpacity : 1).toFixed(5);
  lab.dataset.front = state.front.toFixed(5); lab.dataset.baseline = state.baseline.toFixed(5);
  lab.dataset.bottom = state.bottom.toFixed(5); lab.dataset.liquid = String(LIQUID);
  lab.dataset.bandYs = JSON.stringify(installed ? state.bands.map(b => b.y) : []);
}
function tick(timestamp) {
  if (!['running','spilled'].includes(mode)) return;
  if (last !== null) seconds = Math.min(DURATION, seconds + Math.max(0, timestamp-last)/1000);
  last = timestamp; draw();
  if (seconds >= DURATION) {
    stop();
    if (mode === 'running') { mode = 'complete'; announce('實驗完成，濾紙上出現不同色帶。'); }
    else announce('墨點浸入溶劑，墨水散入杯中；可取新濾紙重新實驗。');
    draw();
  } else raf = requestAnimationFrame(tick);
}
function begin(top = MOUNT.top) {
  stop(); seconds = 0;
  const kind = placement(top).kind;
  // A submerged spot means the loose strip has slipped into the beaker.
  pos = { x: MOUNT.x, top: kind === 'spilled' ? .38 : Math.min(.27, top) };
  mode = kind === 'dry' ? 'dry' : kind === 'spilled' ? 'spilled' : 'running';
  announce(kind === 'dry' ? '濾紙底端未碰到溶劑，尚未展開。' : kind === 'spilled' ? '墨點浸入溶劑，墨水開始散入杯中。' : '濾紙已固定，溶劑正在沿濾紙上升。');
  draw();
  if (mode !== 'dry') raf = requestAnimationFrame(tick);
}
function fresh() { stop(); pos = { ...HOME }; seconds = 0; mode = 'ready'; draw(); announce('已換上新的濾紙。'); }
function activatePaper() {
  if (mode === 'running') { stop(); mode = 'paused'; announce('已暫停實驗。'); }
  else if (mode === 'paused') { mode = 'running'; raf = requestAnimationFrame(tick); announce('繼續觀察。'); }
  else if (['complete','spilled','dry'].includes(mode)) { begin(); return; }
  else { mode = mode === 'selected' ? 'ready' : 'selected'; announce(mode === 'selected' ? '已拿起濾紙，可點燒杯放入；Escape 可放回。' : '已放回濾紙。'); }
  draw();
}
function point(event) { const r = lab.getBoundingClientRect(); return { x: (event.clientX-r.left)/r.width, y: (event.clientY-r.top)/r.height }; }
paper.addEventListener('pointerdown', event => {
  pointerHandled = false;
  if (!['ready','selected'].includes(mode) || event.button !== 0) return;
  const p = point(event); drag = { id: event.pointerId, start: p, offsetX: p.x-pos.x, offsetY:p.y-pos.top, moved: false };
  paper.setPointerCapture(event.pointerId);
});
paper.addEventListener('pointermove', event => {
  if (!drag || event.pointerId !== drag.id) return;
  const p = point(event);
  if (Math.hypot(p.x-drag.start.x,p.y-drag.start.y) > .012) drag.moved = true;
  if (!drag.moved) return;
  mode = 'dragging'; pos = { x: Math.max(.06,Math.min(.94,p.x-drag.offsetX)), top: Math.max(.12,Math.min(.40,p.y-drag.offsetY)) }; draw();
});
paper.addEventListener('pointerup', event => {
  if (!drag || drag.id !== event.pointerId) return;
  const moved = drag.moved; drag = null;
  if (moved) {
    pointerHandled = true;
    if (pos.x >= .56 && pos.x <= .81) begin(pos.top); else fresh();
  }
});
function cancelDrag() { if (drag) { drag = null; pointerHandled = true; fresh(); } }
paper.addEventListener('pointercancel', cancelDrag);
paper.addEventListener('lostpointercapture', cancelDrag);
paper.addEventListener('click', event => { if (pointerHandled && event.detail > 0) { pointerHandled = false; return; } pointerHandled = false; activatePaper(); });
drop.addEventListener('click', () => { if (mode === 'selected') begin(); else if (mode === 'running' || mode === 'paused') activatePaper(); });
reset.addEventListener('click', () => { fresh(); paper.focus({preventScroll:true}); });
clip.addEventListener('click', () => { fresh(); paper.focus({preventScroll:true}); });
choices.forEach(button => button.addEventListener('click', () => {
  drag = null; pointerHandled = false; sample = button.dataset.ink;
  choices.forEach(b => b.setAttribute('aria-pressed', String(b === button)));
  begin();
}));
lab.addEventListener('keydown', event => {
  if (event.key === 'Escape') { cancelDrag(); if (mode === 'selected') fresh(); }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && mode === 'running') { stop(); mode = 'paused'; draw(); }
  else if (document.hidden && mode === 'spilled') stop();
  else if (!document.hidden && mode === 'spilled' && seconds < DURATION) raf = requestAnimationFrame(tick);
});
background.onload = () => {
  lab.dataset.ready = 'true'; [paper,drop,reset,...choices].forEach(b => { b.disabled = false; }); draw();
};
background.onerror = () => {
  lab.dataset.ready = 'error'; status.classList.add('chrom-error');
  status.textContent = '無法載入實驗場景，請重新整理頁面。';
};
background.src = new URL('./chromatography-workbench.webp', import.meta.url).href;
