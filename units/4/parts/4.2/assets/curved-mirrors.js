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
  const defs = `<defs>
    <linearGradient id="${id}-glass" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#c4e0eb"/><stop offset=".42" stop-color="#edf7f7"/><stop offset="1" stop-color="#9fc6d9"/></linearGradient>
    <linearGradient id="${id}-wood" x1="0" y1="0" x2="1" y2=".3"><stop stop-color="#e0be88"/><stop offset=".3" stop-color="#bb8e59"/><stop offset=".65" stop-color="#d6b47e"/><stop offset="1" stop-color="#946b42"/></linearGradient>
    <linearGradient id="${id}-metal" x1="0" y1="0" x2="1" y2=".3"><stop stop-color="#87999a"/><stop offset=".22" stop-color="#e3e6db"/><stop offset=".43" stop-color="#fff9e9"/><stop offset=".68" stop-color="#a9b7b4"/><stop offset="1" stop-color="#6f868a"/></linearGradient>
    <linearGradient id="${id}-orange" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#ffd08b"/><stop offset=".35" stop-color="#f4a04c"/><stop offset="1" stop-color="#c86727"/></linearGradient>
    <radialGradient id="${id}-shadow"><stop stop-color="#62736a" stop-opacity=".28"/><stop offset="1" stop-color="#62736a" stop-opacity="0"/></radialGradient>
  </defs>`;
  const shadow = `<ellipse cx="50" cy="114" rx="41" ry="5" fill="url(#${id}-shadow)"/>`;
  if (mode === 'plane') return defs + shadow + `
    <path d="M62 69L84 111L80 113L58 73Z" fill="#98734e" stroke="#806144" stroke-width=".6"/>
    <path d="M67 82L79 107" stroke="#d3b17c" stroke-width="1.5"/>
    <path d="M25 96L20 113M65 102L69 114" stroke="#916c45" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M74 10L79 14L71 106L66 103Z" fill="#94724e"/>
    <path d="M26 4L74 10L66 103L18 96Z" fill="url(#${id}-wood)" stroke="#a47e51" stroke-width="1"/>
    <path d="M29 8L70 13L63 99L21 93Z" fill="none" stroke="#f3dfb8" stroke-width="1.2"/>
    <path d="M32 12L67 17L60 95L25 89Z" fill="url(#${id}-glass)" stroke="#8fa9ac" stroke-width="1"/>
    <clipPath id="${id}-glass-clip"><path d="M32 12L67 17L60 95L25 89Z"/></clipPath>
    <g clip-path="url(#${id}-glass-clip)"><path d="M35 10L56 13L24 81L20 65Z" fill="#fff" opacity=".62"/><path d="M62 14L68 15L32 93L27 91Z" fill="#fff" opacity=".36"/><path d="M25 74L65 79" stroke="#a7c2c9" stroke-width=".8" opacity=".5"/></g>
    <path d="M28 8L21 92M73 15L67 99" stroke="#7c5d3d" stroke-width=".65" opacity=".3"/>
    <path d="M18 96L66 103L71 106L22 99Z" fill="#aa8151"/>
    <path d="M20 96L66 102" stroke="#edd2a2" stroke-width="1.3"/>`;
  if (mode === 'concave') return defs + shadow + `
    <ellipse cx="51" cy="109" rx="26" ry="5" fill="#71898a" opacity=".4"/>
    <path d="M27 106Q49 99 75 106L75 110Q50 116 27 110Z" fill="url(#${id}-metal)" stroke="#9aaba5" stroke-width=".7"/>
    <ellipse cx="51" cy="106" rx="24" ry="4.2" fill="url(#${id}-metal)"/>
    <rect x="48" y="74" width="7" height="30" rx="3" fill="url(#${id}-metal)" stroke="#a9b5ad" stroke-width=".6"/>
    <path d="M50 77V101" stroke="#fffbed" stroke-width="1.4" opacity=".85"/>
    <path d="M22 46Q18 83 50 81Q81 83 82 46" fill="none" stroke="#839b9b" stroke-width="3"/>
    <g transform="rotate(13 50 43)">
      <ellipse cx="53" cy="43" rx="32" ry="37" fill="#788e93"/>
      <ellipse cx="50" cy="42" rx="32" ry="37" fill="url(#${id}-metal)" stroke="#a5b4af" stroke-width=".7"/>
      <ellipse cx="50" cy="42" rx="27" ry="32" fill="url(#${id}-glass)" stroke="#6c8f9c" stroke-width="1.3"/>
      <clipPath id="${id}-glass-clip"><ellipse cx="50" cy="42" rx="26" ry="31"/></clipPath>
      <g clip-path="url(#${id}-glass-clip)"><path d="M43 7H59L23 66L19 48Z" fill="#fff" opacity=".63"/><path d="M70 14L77 21L40 78H30Z" fill="#fff" opacity=".26"/></g>
      <path d="M27 25A29 34 0 0 1 59 8" fill="none" stroke="#fff9e9" stroke-width="1.6" opacity=".85"/>
    </g>
    <circle cx="20" cy="49" r="3.1" fill="url(#${id}-metal)" stroke="#7e9699" stroke-width=".8"/>
    <circle cx="82" cy="49" r="3.1" fill="url(#${id}-metal)" stroke="#7e9699" stroke-width=".8"/>`;
  return defs + shadow + `
    <rect x="46" y="70" width="8" height="44" rx="2" fill="url(#${id}-metal)" stroke="#82999b" stroke-width=".7"/>
    <path d="M48 75V112" stroke="#e3ebe6" stroke-width="1.3"/>
    <circle cx="52" cy="43" r="36" fill="#b76c32"/>
    <circle cx="50" cy="41" r="36" fill="url(#${id}-orange)" stroke="#d48942" stroke-width="1"/>
    <circle cx="50" cy="41" r="29.5" fill="#748e98"/>
    <clipPath id="${id}-glass-clip"><circle cx="50" cy="41" r="28"/></clipPath>
    <g clip-path="url(#${id}-glass-clip)">
      <circle cx="50" cy="41" r="28" fill="url(#${id}-glass)"/>
      <path d="M20 43Q39 32 52 38Q71 28 82 40V75H18Z" fill="#afc2a9"/>
      <path d="M23 72Q34 53 48 45Q62 38 80 49L82 65Q61 48 51 53Q41 61 38 74Z" fill="#7a8d90"/>
      <path d="M30 71Q40 52 51 49Q64 44 80 55" fill="none" stroke="#f3e4ae" stroke-width="1.5" stroke-dasharray="5 4"/>
      <g transform="rotate(16 64 51)"><path d="M55 47L59 42H68L72 47Z" fill="#b95f4e"/><rect x="54" y="47" width="20" height="10" rx="3" fill="#d36c52" stroke="#a44f40" stroke-width=".6"/><path d="M59 44H67L69 47H57Z" fill="#dfedf0"/><path d="M56 50H72" stroke="#f3a28c" stroke-width=".8"/><circle cx="58" cy="57" r="2" fill="#455a5b"/><circle cx="70" cy="57" r="2" fill="#455a5b"/><path d="M55 53H58M70 53H73" stroke="#fff3cf" stroke-width="1.2"/></g>
      <path d="M27 23Q43 10 61 17L27 52Z" fill="#fff" opacity=".17"/>
    </g>
    <circle cx="50" cy="41" r="28" fill="none" stroke="#dcebed" stroke-width="1"/>
    <path d="M22 25A32 32 0 0 1 70 16" fill="none" stroke="#ffe0ab" stroke-width="2" stroke-linecap="round"/>
    <path d="M24 69Q50 83 76 67" fill="none" stroke="#bc732f" stroke-width="1.2" opacity=".65"/>`;
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
