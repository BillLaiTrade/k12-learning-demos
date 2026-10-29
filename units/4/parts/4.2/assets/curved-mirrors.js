import { MIRRORS, OPTICS, reflectionAt, mirrorOutline, imageExample, visibleRayEnd } from './curved-mirrors-geometry.mjs?v=three-steps-20261029';

const section = document.querySelector('#card-05');
const normalToggle = section.querySelector('#mirror-normal-toggle');
const bearToggle = section.querySelector('#mirror-bear-toggle');
const colors = { in: '#328463', out: '#e58a36', normal: '#287bd0' };
const f = value => Number(value.toFixed(4));
const xy = point => point.map(f).join(',');
const line = (a, b, attrs = '') => `<path d="M${xy(a)}L${xy(b)}" fill="none" ${attrs}/>`;
let normalsVisible = true, position = 'near';

function arrow(point, direction, color) {
  const [x, y] = point, [dx, dy] = direction;
  return `<path d="M${f(x + dx * 8)},${f(y + dy * 8)}L${f(x - dx * 7 - dy * 5)},${f(y - dy * 7 + dx * 5)}L${f(x - dx * 7 + dy * 5)},${f(y - dy * 7 - dx * 5)}Z" fill="${color}"/>`;
}

function surface(mode, prefix) {
  const points = mirrorOutline(mode), back = points.map(([x, y]) => [x + 9, y]);
  let svg = `<defs><linearGradient id="${prefix}-silver"><stop stop-color="#668a92"/><stop offset=".5" stop-color="#eff8fa"/><stop offset="1" stop-color="#98b5bc"/></linearGradient></defs>`;
  for (let offset = -80; offset <= 80; offset += 12) {
    const p = reflectionAt(mode, offset).point;
    svg += line([p[0] + 12, p[1]], [p[0] + 22, p[1] - 7], 'stroke="#bac5c3" stroke-width="1.3"');
  }
  svg += `<path d="M${points.map(xy).join('L')}L${back.reverse().map(xy).join('L')}Z" fill="url(#${prefix}-silver)" stroke="#6b8991" stroke-width="1.3"/>`;
  svg += `<path class="mirror-surface" d="M${points.map(xy).join('L')}" fill="none" stroke="#55767c" stroke-width="2.4"/>`;
  return svg;
}

function drawing(mode, reason = false) {
  const prefix = `mirror-${reason ? 'reason' : 'overview'}-${mode}`;
  let svg = `<title>${MIRRORS[mode].name}：${reason ? '上方反射點的法線垂直當地鏡面' : MIRRORS[mode].result}</title>`;
  svg += `<desc>綠色為向右的入射光，橙色為向左的反射光。${reason ? '藍色虛線為法線，由球面圓心與反射點的連線計算。' : '相同方向的平行光射向三種鏡面。'}</desc>`;
  svg += surface(mode, prefix);
  for (const offset of reason ? [OPTICS.reasonOffset] : OPTICS.offsets) {
    const ray = reflectionAt(mode, offset), p = ray.point, end = visibleRayEnd(ray);
    const retraces = mode === 'plane' || offset === 0;
    svg += `<g class="mirror-ray" data-offset="${offset}" data-angle="${f(ray.angle)}">`;
    svg += line([20, p[1]], p, `class="mirror-in-path" stroke="${colors.in}" stroke-width="3.8"`);
    // Retracing rays share their true geometric path; colored dashes retain both colors.
    svg += line(p, end, `class="mirror-out-path" stroke="${colors.out}" stroke-width="2.5"${retraces ? ' stroke-dasharray="8 5"' : ''}`);
    svg += arrow([92, p[1]], [1, 0], colors.in);
    const t = (end[0] - p[0]) / ray.direction[0] * 0.52;
    svg += arrow([p[0] + t * ray.direction[0], p[1] + t * ray.direction[1]], ray.direction, colors.out);
    if (reason) {
      const n = ray.normal, length = mode === 'plane' ? 72 : 150;
      const a = [p[0] + n[0] * length, p[1] + n[1] * length];
      const b = [p[0] - n[0] * 18, p[1] - n[1] * 18];
      svg += `<g class="mirror-normal" data-normal="${xy(n)}">${line(a, b, `stroke="${colors.normal}" stroke-width="2.2" stroke-dasharray="6 5"`)}</g>`;
      svg += `<circle class="mirror-reflection-point" cx="${f(p[0])}" cy="${f(p[1])}" r="5" fill="${colors.out}"/>`;
    }
    svg += '</g>';
  }
  return svg;
}

function appearance(mode, where = 'near') {
  const model = imageExample(mode, where), m = model.magnification;
  const prefix = `mirror-bear-${mode}`;
  const objectWidth = 116, objectHeight = objectWidth * 385 / 400;
  const width = objectWidth * Math.abs(m), height = objectHeight * Math.abs(m);
  const baseline = m > 0 ? 232 : 178;
  const cx = 233, cy = baseline - height / 2;
  const plane = mode === 'plane';
  const shape = plane ? '<path d="M155 47L320 25V264L155 270Z"/>' : '<ellipse cx="233" cy="150" rx="96" ry="120"/>';
  const outline = plane ? 'M155 47L320 25V264L155 270Z' : 'M233 30A96 120 0 1 1 233 270A96 120 0 1 1 233 30Z';
  const label = mode === 'concave' ? where === 'near' ? '焦點內，像正立放大' : '曲率中心外，像倒立縮小' : mode === 'plane' ? '像正立同大' : '像正立縮小';
  return `<title>${MIRRORS[mode].name}：${label}</title><desc>左邊是同樣大小的實物，右邊只比較像的外觀，不表示物距與像距。</desc>
    <defs><linearGradient id="${prefix}-glass" x2=".8" y2="1"><stop stop-color="#e6f3f5"/><stop offset=".55" stop-color="#f6faf6"/><stop offset="1" stop-color="#d4e7ea"/></linearGradient><clipPath id="${prefix}-clip">${shape}</clipPath></defs>
    <ellipse cx="62" cy="255" rx="41" ry="6" fill="#cfc3a1" opacity=".25"/>
    <path d="${outline}" fill="url(#${prefix}-glass)" stroke="#8ca7ac" stroke-width="7"/>
    <g clip-path="url(#${prefix}-clip)"><path d="M150 35L205 30L330 150L330 200Z" fill="#fff" opacity=".36"/><image class="mirror-bear-image" data-magnification="${m}" href="assets/mirror/teddy-front.webp" x="${f(cx - width / 2)}" y="${f(baseline - height)}" width="${f(width)}" height="${f(height)}"${m < 0 ? ` transform="rotate(180 ${cx} ${f(cy)})"` : ''}/></g>
    <path d="${outline}" fill="none" stroke="#577780" stroke-width="1.4"/>
    <image class="mirror-bear-object" href="assets/mirror/teddy-front.webp" x="8" y="${f(252 - objectHeight)}" width="${objectWidth}" height="${f(objectHeight)}"/>
    <text x="62" y="293" text-anchor="middle">實物</text><text x="233" y="293" text-anchor="middle">${m < 0 ? '像的外觀' : '鏡中像'}</text>`;
}

function application(mode) {
  const id = `mirror-use-${mode}`;
  const glass = `<defs><linearGradient id="${id}-glass" x2="1" y2="1"><stop stop-color="#d6edf7"/><stop offset=".45" stop-color="#f8fcfb"/><stop offset=".46" stop-color="#bad6e7"/><stop offset="1" stop-color="#eff8fb"/></linearGradient></defs>`;
  if (mode === 'plane') return glass + `<ellipse cx="50" cy="112" rx="32" ry="4" fill="#b5b9aa" opacity=".23"/><path d="M31 11L74 18L68 104L24 100Z" fill="#9b7952"/><path d="M34 15L69 21L64 98L29 95Z" fill="url(#${id}-glass)" stroke="#e8d2ad" stroke-width="2"/><path d="M29 102L26 114M67 103L75 112" stroke="#9b7952" stroke-width="4" stroke-linecap="round"/>`;
  if (mode === 'concave') return glass + `<ellipse cx="50" cy="110" rx="30" ry="5" fill="#b5b9aa" opacity=".23"/><path d="M54 72L53 102M37 107H71" stroke="#b49b69" stroke-width="5" stroke-linecap="round"/><ellipse cx="50" cy="44" rx="30" ry="37" fill="url(#${id}-glass)" stroke="#bca477" stroke-width="5" transform="rotate(17 50 44)"/><ellipse cx="50" cy="44" rx="25" ry="32" fill="none" stroke="#6e8c95" stroke-width="1.5" transform="rotate(17 50 44)"/>`;
  return glass + `<path d="M51 65V115" stroke="#7c9295" stroke-width="6"/><circle cx="50" cy="40" r="33" fill="#f4a043" stroke="#d7802a" stroke-width="3"/><circle cx="50" cy="40" r="27" fill="url(#${id}-glass)" stroke="#648291" stroke-width="2"/><image href="assets/mirror/teddy-front.webp" x="34" y="22" width="32" height="34"/>`;
}

for (const el of section.querySelectorAll('[data-overview]')) el.innerHTML = drawing(el.dataset.overview);
for (const el of section.querySelectorAll('[data-reason]')) el.innerHTML = drawing(el.dataset.reason, true);
for (const el of section.querySelectorAll('[data-appearance]')) el.innerHTML = appearance(el.dataset.appearance);
for (const el of section.querySelectorAll('[data-application]')) el.innerHTML = application(el.dataset.application);

normalToggle.addEventListener('click', () => {
  normalsVisible = !normalsVisible;
  section.dataset.normals = String(normalsVisible);
  normalToggle.setAttribute('aria-pressed', String(normalsVisible));
  section.querySelector('#mirror-normal-status').textContent = `${normalsVisible ? '已顯示' : '已隱藏'}三種鏡面的法線。`;
  for (const el of section.querySelectorAll('.mirror-normal')) el.setAttribute('aria-hidden', String(!normalsVisible));
});

bearToggle.addEventListener('click', () => {
  position = position === 'near' ? 'far' : 'near';
  const near = position === 'near';
  section.dataset.concavePosition = position;
  section.querySelector('#mirror-concave-appearance').innerHTML = appearance('concave', position);
  section.querySelector('#mirror-concave-appearance').setAttribute('aria-label', `凹面鏡：${near ? '焦點內，像正立放大' : '曲率中心外，像倒立縮小'}`);
  section.querySelector('#mirror-concave-condition').textContent = near ? '靠近鏡面・焦點內' : '移遠・曲率中心外';
  section.querySelector('#mirror-concave-result').textContent = near ? '正立・放大' : '倒立・縮小';
  bearToggle.textContent = near ? '把小熊移遠 →' : '把小熊移近 ←';
  section.querySelector('#mirror-concave-status').textContent = near ? '凹面鏡：小熊在焦點內，像正立、放大。' : '凹面鏡：小熊移到曲率中心外，像倒立、縮小。這是其中一個遠處位置的例子。';
});
