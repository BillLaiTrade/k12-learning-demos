import { MIRRORS, OPTICS, reflectionAt, mirrorOutline, imageExample } from './curved-mirrors-geometry.mjs';

const section = document.querySelector('#card-05');
const detail = section.querySelector('#mirror-detail');
const choices = [...section.querySelectorAll('[data-mirror]')];
const pointButtons = [...section.querySelectorAll('[data-mirror-point]')];
let mode = 'concave', selected = 0, open = true;
const f = n => Number(n.toFixed(4));
const xy = p => p.map(f).join(',');
const line = (a, b, attrs = '') => `<path d="M${xy(a)}L${xy(b)}" fill="none" ${attrs}/>`;
const colors = { in: '#648c77', out: '#ce841f', normal: '#267caa' };

function arrow(point, direction, color) {
  const [x, y] = point, [dx, dy] = direction;
  return `<path d="M${f(x + dx * 7)},${f(y + dy * 7)}L${f(x - dx * 7 - dy * 5)},${f(y - dy * 7 + dx * 5)}L${f(x - dx * 7 + dy * 5)},${f(y - dy * 7 - dx * 5)}Z" fill="${color}"/>`;
}

function drawing(which, interactive = false) {
  const outline = mirrorOutline(which), paths = [];
  // Backing is drawn to the right, away from the illuminated reflecting face.
  for (let offset = -70; offset <= 70; offset += 10) {
    const p = reflectionAt(which, offset).point;
    paths.push(line([p[0] + 5, p[1]], [p[0] + 15, p[1] - 7], 'stroke="#adbcb3" stroke-width="1.3"'));
  }
  paths.push(`<path d="M${outline.map(xy).join('L')}" fill="none" stroke="#82988e" stroke-width="7" stroke-linecap="round"/>`);
  OPTICS.offsets.forEach((offset, index) => {
    const ray = reflectionAt(which, offset), hit = ray.point;
    const active = !interactive || index === selected;
    paths.push(`<g class="mirror-ray" data-offset="${offset}" opacity="${active ? 1 : 0.28}">`);
    paths.push(line([20, hit[1]], hit, `stroke="${colors.in}" stroke-width="3.5"`));
    paths.push(line(hit, ray.end, `class="mirror-out-path" stroke="${colors.out}" stroke-width="2.3"`));
    // Separate arrow positions keep retracing rays visible, including the plane mirror.
    paths.push(arrow([95, hit[1]], [1, 0], colors.in));
    const t = (150 - hit[0]) / ray.direction[0];
    paths.push(arrow([150, hit[1] + t * ray.direction[1]], ray.direction, colors.out));
    paths.push('</g>');
  });
  if (interactive) {
    const ray = reflectionAt(which, OPTICS.offsets[selected]), p = ray.point, n = ray.normal;
    const a = [p[0] + n[0] * 175, p[1] + n[1] * 175];
    const b = [p[0] - n[0] * 20, p[1] - n[1] * 20];
    paths.push(line(a, b, `stroke="${colors.normal}" stroke-width="1.7" stroke-dasharray="5 4"`));
    paths.push(line([p[0] - n[1] * 23, p[1] + n[0] * 23], [p[0] + n[1] * 23, p[1] - n[0] * 23], 'stroke="#50645b" stroke-width="1.3"'));
    OPTICS.offsets.forEach((offset, i) => {
      const p = reflectionAt(which, offset).point;
      paths.push(`<circle class="mirror-hit" data-hit="${i}" cx="${f(p[0])}" cy="${f(p[1])}" r="11" fill="transparent" role="button" tabindex="0" aria-label="查看${['上方', '中央', '下方'][i]}反射點" aria-pressed="${i === selected}"/><circle cx="${f(p[0])}" cy="${f(p[1])}" r="5.5" fill="${i === selected ? '#176b53' : '#fffdf8'}" stroke="${i === selected ? '#fffdf8' : '#82988e'}" stroke-width="1.5" pointer-events="none"/>`);
    });
  }
  return paths.join('');
}

function localAngles() {
  const ray = reflectionAt(mode, OPTICS.offsets[selected]);
  const p = [235, 77], normal = ray.normal, out = ray.direction;
  const point = (v, d) => [p[0] + v[0] * d, p[1] + v[1] * d];
  const nAngle = Math.atan2(normal[1], normal[0]);
  const inAngle = normal[1] >= 0 ? Math.PI : -Math.PI;
  const rAngle = Math.atan2(out[1], out[0]);
  function arc(a, b, color, radius) {
    return `<path d="M${xy(point([Math.cos(a), Math.sin(a)], radius))}A${radius},${radius} 0 0 ${b > a ? 1 : 0} ${xy(point([Math.cos(b), Math.sin(b)], radius))}" fill="none" stroke="${color}" stroke-width="2"/>`;
  }
  const zero = ray.angle < 0.001;
  return `<title>所選反射點的角度，均從法線量起</title>
    ${line([25, 77], p, `stroke="${colors.in}" stroke-width="3.5"`)}
    ${line(p, point(out, 210), `stroke="${colors.out}" stroke-width="2.2"`)}
    ${line(point(normal, 215), point(normal, -12), `stroke="${colors.normal}" stroke-width="1.6" stroke-dasharray="5 4"`)}
    ${line(point([-normal[1], normal[0]], 46), point([-normal[1], normal[0]], -46), 'stroke="#82988e" stroke-width="4"')}
    ${arrow([65, 77], [1, 0], colors.in)}${arrow(point(out, 145), out, colors.out)}
    ${zero ? '' : arc(inAngle, nAngle, '#267caa', 68) + arc(nAngle, rAngle, '#ce841f', 96)}
    <circle cx="235" cy="77" r="4" fill="#176b53"/>
    <text x="12" y="22" font-size="13" fill="#405851">${zero ? '正向入射：兩角均為 0°' : `i：入射角 ${ray.angle.toFixed(1)}°　r：反射角 ${ray.angle.toFixed(1)}°`}</text>
    <text x="12" y="${normal[1] >= 0 ? 142 : 154}" font-size="12" fill="#267caa">藍色虛線是法線；灰線是當地鏡面切線</text>`;
}

function appearance(which, position) {
  const example = imageExample(which, position), m = example.magnification;
  const base = m > 0 ? 83 : 58, objectHeight = 30, tip = base - objectHeight * m;
  const arrowShape = (x, y, height, color) => {
    const direction = Math.sign(height), end = y - height;
    return `<path d="M${x},${y}V${end + direction * 7}" stroke="${color}" stroke-width="6"/><path d="M${x},${end}l-7,${direction * 10}h14Z" fill="${color}"/>`;
  };
  return `<svg viewBox="0 0 150 114" preserveAspectRatio="none" role="img" aria-label="${which === 'concave' ? position === 'near' ? '焦點內，像正立放大' : '曲率中心外，像倒立縮小' : which === 'plane' ? '像正立同大' : '像正立縮小'}" data-magnification="${m}">
    <path d="M22 ${base}H130" stroke="#b9c9bf" stroke-width="1"/>
    ${arrowShape(48, base, objectHeight, '#bb4d3e')}${arrowShape(105, base, base - tip, '#276eae')}
    <text x="48" y="107" text-anchor="middle" font-size="12" fill="#bb4d3e">物體</text><text x="105" y="107" text-anchor="middle" font-size="12" fill="#276eae">像</text></svg>`;
}

for (const choice of choices) {
  const key = choice.dataset.mirror;
  choice.querySelector('svg').innerHTML = `<title>${MIRRORS[key].name}：平行入射光${MIRRORS[key].result}</title>${drawing(key)}`;
  choice.addEventListener('click', () => {
    if (key !== mode) selected = 0;
    mode = key; open = true; render();
    detail.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  });
}
section.querySelectorAll('[data-appearance]').forEach(el => {
  el.innerHTML = appearance(el.dataset.appearance, el.dataset.position);
});

function render() {
  section.dataset.mirrorMode = mode;
  section.dataset.mirrorPoint = String(selected);
  detail.hidden = !open;
  choices.forEach(choice => choice.setAttribute('aria-expanded', String(open && choice.dataset.mirror === mode)));
  section.querySelector('#mirror-detail-title').textContent = `${MIRRORS[mode].name}｜查看反射原因`;
  section.querySelector('#mirror-detail-svg').innerHTML = `<title>${MIRRORS[mode].name}的反射光路；可選上方、中央、下方反射點</title>${drawing(mode, true)}`;
  section.querySelector('#mirror-point-label').textContent = `${['上方', '中央', '下方'][selected]}反射點`;
  const angle = reflectionAt(mode, OPTICS.offsets[selected]).angle.toFixed(1);
  section.querySelector('#mirror-angle-readout').textContent = `入射角 ${angle}° ／ 反射角 ${angle}°`;
  section.querySelector('#mirror-point-explanation').textContent = mode === 'plane' ? '平面鏡各處的法線平行；這三道光都正向入射，再沿原路返回。' : selected === 1 ? '中央這一道光正向入射，入射角與反射角都是 0°，沿原路返回。' : '法線垂直於這一處的鏡面。換一個位置，法線方向改變，反射方向也跟著改變。';
  section.querySelector('#mirror-local-svg').innerHTML = localAngles();
  pointButtons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === selected)));
}

pointButtons.forEach((button, i) => button.addEventListener('click', () => { selected = i; render(); }));
const diagram = section.querySelector('#mirror-detail-svg');
function selectHit(event) {
  const hit = event.target.closest('[data-hit]');
  if (!hit) return;
  if (event.type === 'keydown' && !['Enter', ' '].includes(event.key)) return;
  event.preventDefault(); selected = Number(hit.dataset.hit); render();
  diagram.querySelector(`[data-hit="${selected}"]`).focus({ preventScroll: true });
}
diagram.addEventListener('click', selectHit); diagram.addEventListener('keydown', selectHit);
section.querySelector('#mirror-detail-close').addEventListener('click', () => {
  open = false; render(); choices.find(choice => choice.dataset.mirror === mode).focus({ preventScroll: true });
});
render();
