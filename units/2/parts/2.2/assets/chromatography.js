import { DURATION, LIQUID, PAPER_HEIGHT, BASELINE, MOUNT, SAMPLES, placement, chromatographyState } from './chromatography-state.js?v=sixteen-1';
const lab = document.getElementById('chrom-lab');
const canvas = document.getElementById('chrom-canvas');
const paper = document.getElementById('chrom-paper');
const drop = document.getElementById('chrom-drop');
const clip = document.getElementById('chrom-clip');
const reset = document.getElementById('chrom-reset');
const status = document.getElementById('chrom-status');
const observation = document.getElementById('chrom-observation-dialogue');
const observationText = document.getElementById('chrom-observation-text');
const choices = [...document.querySelectorAll('.ink-choice')];
const sourceLabels = [...lab.querySelectorAll('[data-chrom-source-label]')];
const ctx = canvas.getContext('2d');
const W = 1536, H = 1024, PW = 109, PH = PAPER_HEIGHT * H;
const SOURCE_PAPERS = {
  green: { x: 296 / W, top: 495 / H, angle: .27, sx: .85, sy: .69 },
  dark: { x: 431 / W, top: 495 / H, angle: .173, sx: .85, sy: .68 }
};
const MOUNT_MS = matchMedia('(prefers-reduced-motion: reduce)').matches ? 200 : 900;
const START_HINT = '點選紙張或名稱，觀察色帶分離。';
const PAUSE_HINT = '已暫停，點濾紙繼續觀察。';
let sample = 'green', mode = 'ready', pos = { ...MOUNT }, seconds = 0, mountProgress = 0;
let raf = null, last = null;
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
function updateGuidance() {
  const message = mode === 'ready' ? START_HINT : mode === 'paused' ? PAUSE_HINT : '';
  status.classList.toggle('is-visible', !!message);
  if (message && status.textContent !== message) status.textContent = message;
}
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
function drawPreparedInk(key) {
  const source = SOURCE_PAPERS[key];
  ctx.save();ctx.translate(source.x * W, source.top * H);ctx.rotate(source.angle);ctx.scale(source.sx, source.sy);
  ctx.strokeStyle = '#68665b94';ctx.lineWidth = 1.2;ctx.beginPath();ctx.moveTo(-PW / 2, PH * BASELINE);ctx.lineTo(PW / 2, PH * BASELINE);ctx.stroke();
  band(0, PH * BASELINE, 19, 10, SAMPLES[key].ink);ctx.restore();
}
function draw() {
  const completed = mode === 'complete';
  if (completed) {
    const message = sample === 'green'
      ? '原來看起來是綠色的墨水，竟然分出了藍色和黃色的色帶！'
      : '原來深色的墨水，竟然分出了藍色、紫色和粉紅色的色帶！';
    if (observationText.textContent !== message) observationText.textContent = message;
  }
  observation.hidden = !completed;
  const installed = !['ready', 'mounting'].includes(mode);
  const state = chromatographyState(seconds, pos.top, sample);
  const dotOpacity = mode === 'spilled' ? 1 - state.progress : installed && state.kind === 'valid' ? state.originOpacity : 1;
  ctx.clearRect(0, 0, W, H); ctx.drawImage(background, 0, 0, W, H);
  for (const choice of choices) {
    const key = choice.dataset.ink, available = mode === 'ready' || key !== sample;
    choice.hidden = !available;choice.setAttribute('aria-pressed', String(!available));
    const label = lab.querySelector(`[data-chrom-source-label="${key}"]`);
    label.hidden = !available && !installed;
    label.disabled = !available;
    label.style.left = available ? '' : `${MOUNT.x * 100}%`;
    label.style.top = available ? '' : '89%';
    if (available) drawPreparedInk(key);
  }
  // Ink entering the bath spreads, rather than producing separated bands.
  if (mode === 'spilled') {
    ctx.save(); ctx.beginPath(); ctx.ellipse(1048, 757, 191, 68, 0, 0, Math.PI * 2); ctx.clip();
    band(1048, 745, 45 + 155 * state.progress, 20 + 65 * state.progress, SAMPLES[sample].ink, .5 * state.progress);
    ctx.restore();
  }
  if (mode !== 'ready') {
    ctx.save(); ctx.translate(pos.x * W, pos.top * H);
    const angle = installed ? (mode === 'spilled' ? -.04 : 0) : pos.angle;
    ctx.rotate(angle);ctx.scale(pos.sx ?? 1, pos.sy ?? 1);
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
  }
  if (installed && mode !== 'spilled') {
    // Restore the actual pencil/clip in front of the paper, never stretch it.
    ctx.drawImage(background, 1006, 145, 100, 133, 1006, 145, 100, 133);
  }
  paper.style.left = `${pos.x * 100}%`; paper.style.top = `${pos.top * 100}%`;
  paper.style.height = `${PAPER_HEIGHT * 100}%`;
  paper.style.transform = 'translateX(-50%)';
  paper.hidden = !installed;
  paper.setAttribute('aria-label', mode === 'running' ? '暫停層析實驗' : mode === 'paused' ? '繼續層析實驗' : '重做這份墨水的層析實驗');
  clip.disabled = !installed;drop.disabled = !['running', 'paused'].includes(mode);
  lab.dataset.mode = mode; lab.dataset.ink = sample;lab.dataset.mountProgress = mountProgress.toFixed(5);
  lab.dataset.progress = state.progress.toFixed(5);
  lab.dataset.phase = state.phase;
  lab.dataset.contact = String(state.contact);
  lab.dataset.spread = state.spread.toFixed(5);
  lab.dataset.separation = state.separation.toFixed(5);
  lab.dataset.originOpacity = (installed ? dotOpacity : 1).toFixed(5);
  lab.dataset.front = state.front.toFixed(5); lab.dataset.baseline = state.baseline.toFixed(5);
  lab.dataset.bottom = state.bottom.toFixed(5); lab.dataset.liquid = String(LIQUID);
  lab.dataset.bandYs = JSON.stringify(installed ? state.bands.map(b => b.y) : []);
  updateGuidance();
}
function tick(timestamp) {
  if (mode === 'mounting') {
    if (last !== null) mountProgress = Math.min(1, mountProgress + Math.max(0, timestamp - last) / MOUNT_MS);
    last = timestamp;
    const from = SOURCE_PAPERS[sample], t = mountProgress * mountProgress * (3 - 2 * mountProgress);
    pos = {x: from.x + (MOUNT.x - from.x) * t, top: from.top + (MOUNT.top - from.top) * t, angle: from.angle * (1 - t), sx: from.sx + (1 - from.sx) * t, sy: from.sy + (1 - from.sy) * t};
    draw();
    if (mountProgress >= 1) {
      begin();
      if (document.activeElement === document.body || [...choices,...sourceLabels].includes(document.activeElement)) paper.focus({preventScroll:true});
    } else raf = requestAnimationFrame(tick);
    return;
  }
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
function fresh() {
  stop(); pos = { ...MOUNT }; seconds = 0; mountProgress = 0; mode = 'ready'; draw();
  announce(START_HINT);
}
function selectPaper(key) {
  stop();sample = key;seconds = 0;mountProgress = 0;pos = { ...SOURCE_PAPERS[key] };mode = 'mounting';
  announce(`已選擇${key === 'green' ? '綠色筆' : '深色筆'}墨點的濾紙，正在掛上夾具。`);
  draw();raf = requestAnimationFrame(tick);
}
function activatePaper() {
  if (mode === 'running') { stop(); mode = 'paused'; announce(PAUSE_HINT); }
  else if (mode === 'paused') { mode = 'running'; raf = requestAnimationFrame(tick); announce('繼續觀察。'); }
  else if (mode === 'complete') { selectPaper(sample); return; }
  draw();
}
paper.addEventListener('click', activatePaper);
drop.addEventListener('click', activatePaper);
reset.addEventListener('click', () => { fresh(); choices[0].focus({preventScroll:true}); });
clip.addEventListener('click', () => { fresh(); choices[0].focus({preventScroll:true}); });
choices.forEach(button => button.addEventListener('click', () => selectPaper(button.dataset.ink)));
sourceLabels.forEach(button => button.addEventListener('click', () => selectPaper(button.dataset.chromSourceLabel)));
document.addEventListener('visibilitychange', () => {
  if (document.hidden && ['running', 'mounting'].includes(mode)) { stop(); if (mode === 'running') mode = 'paused'; draw(); }
  else if (document.hidden && mode === 'spilled') stop();
  else if (!document.hidden && (mode === 'mounting' || mode === 'spilled' && seconds < DURATION)) raf = requestAnimationFrame(tick);
});
background.onload = () => {
  lab.dataset.ready = 'true'; [paper,drop,reset,...choices,...sourceLabels].forEach(b => { b.disabled = false; }); draw();
};
background.onerror = () => {
  lab.dataset.ready = 'error'; status.classList.add('chrom-error');
  status.textContent = '無法載入實驗場景，請重新整理頁面。';
};
background.src = new URL('./chromatography-workbench.webp', import.meta.url).href;
