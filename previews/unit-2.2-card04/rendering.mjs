// 材質近照與分子／原子圖形只協助辨識；位移仍由共同的波動模型計算。
export const materialInfo = {
  air: {
    index: 0, name: '空氣', phase: '氣體',
    description: '空氣主要由氮、氧等氣體組成。本身透明，近照用空的玻璃容器呈現；微觀模型以常見分子示意，省略熱運動。'
  },
  water: {
    index: 1, name: '水', phase: '液體',
    description: '水具有液面、可流動，透明水體會折射背景。微觀模型以彎折形的水分子示意，整個分子在平衡位置附近往返。'
  },
  steel: {
    index: 2, name: '鋼', phase: '固體',
    description: '鋼具有固定形狀與金屬表面。微觀模型簡化原子排列；連結的伸縮表示彈性作用，不是鋼內真的裝有彈簧。'
  }
};

export const SPECIMEN_URL = 'assets/material-specimens.png';

export function svgNode(tag, attributes, parent) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  parent.append(node);
  return node;
}

export function addMaterials(root, prefix) {
  const defs = svgNode('defs', {}, root);
  const colors = {
    nitrogen: ['#f4fcff', '#7fb2c7', '#315c7c'],
    oxygen: ['#fff4f2', '#d57a76', '#963f44'],
    hydrogen: ['#ffffff', '#f4f5f3', '#a2b2b3'],
    argon: ['#fcf9ff', '#c6b9da', '#79728f'],
    metal: ['#ffffff', '#b4c1c3', '#52666e']
  };
  for (const [name, stops] of Object.entries(colors)) {
    const gradient = svgNode('radialGradient', { id: `${prefix}-${name}`, cx: '28%', cy: '24%', r: '80%' }, defs);
    stops.forEach((color, index) => svgNode('stop', { offset: [0, .42, 1][index], 'stop-color': color }, gradient));
  }
  const metal = svgNode('linearGradient', { id: `${prefix}-source`, x1: 0, x2: 1, y1: 0, y2: 0 }, defs);
  for (const [offset, color] of [[0, '#52636b'], [.22, '#c9d1ce'], [.46, '#f4f4ec'], [.7, '#9aabaa'], [1, '#4e6169']]) svgNode('stop', { offset, 'stop-color': color }, metal);
  return name => `url(#${prefix}-${name})`;
}

export function speciesFor(kind, index) {
  if (kind === 'water') return 'water';
  if (kind === 'steel') return 'metal';
  const order = index * 37 % 72;
  return order < 56 ? 'nitrogen' : order < 71 ? 'oxygen' : 'argon';
}

function atom(parent, x, y, radius, material, fill) {
  svgNode('ellipse', { cx: x + radius * .15, cy: y + radius * .5, rx: radius, ry: radius * .42, fill: '#43565b', opacity: .13 }, parent);
  svgNode('circle', { class: 'atom', 'data-element': material, cx: x, cy: y, r: radius, fill: fill(material), stroke: material === 'hydrogen' ? '#9eafb0' : '#47616b', 'stroke-width': material === 'hydrogen' ? .25 : .18, 'stroke-opacity': .45 }, parent);
}

export function particleGlyph(parent, { kind, index, className, x, y, fill, scale = 1 }) {
  const species = speciesFor(kind, index);
  const group = svgNode('g', { class: className, transform: `translate(${x} ${y})`, 'data-species': species, opacity: .34 }, parent);
  const angle = kind === 'steel' ? 0 : ((index * 73.17) % 160) - 80;
  const body = svgNode('g', { transform: `rotate(${angle}) scale(${scale})` }, group);
  if (species === 'water') {
    const angle = 52.25 * Math.PI / 180;
    const hx = 4.6 * Math.cos(angle), hy = 4.6 * Math.sin(angle);
    for (const sign of [-1, 1]) {
      svgNode('path', { d: `M0 0L${hx} ${hy * sign}`, stroke: '#9badae', 'stroke-width': 1.5, 'stroke-linecap': 'round' }, body);
    }
    atom(body, hx, -hy, 1.45, 'hydrogen', fill);
    atom(body, hx, hy, 1.45, 'hydrogen', fill);
    atom(body, 0, 0, 2.8, 'oxygen', fill);
  } else if (species === 'nitrogen' || species === 'oxygen') {
    svgNode('path', { d: 'M-2.8 0H2.8', stroke: species === 'nitrogen' ? '#6d9ba9' : '#bb8581', 'stroke-width': 2.1, 'stroke-linecap': 'round' }, body);
    atom(body, -2.8, 0, 2.7, species, fill);
    atom(body, 2.8, 0, 2.7, species, fill);
  } else atom(body, 0, 0, species === 'metal' ? 3.8 : 3, species, fill);
  return group;
}

export function springPath(x1, y1, x2, y2) {
  const distance = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / distance, uy = (y2 - y1) / distance;
  const trim = Math.min(3.8, distance / 4), parts = [];
  for (let i = 0; i <= 12; i++) {
    const length = trim + (distance - 2 * trim) * i / 12;
    const normal = i === 0 || i === 12 ? 0 : (i % 2 ? 1 : -1) * 1.05;
    parts.push(`${i ? 'L' : 'M'}${(x1 + ux * length - uy * normal).toFixed(3)} ${(y1 + uy * length + ux * normal).toFixed(3)}`);
  }
  return parts.join('');
}

export function specimenSvg(kind, className = 'specimen-photo') {
  const image = materialInfo[kind];
  return `<svg class="${className}" viewBox="0 ${image.index * 512} 1024 512" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${image.name}材質近照"><image href="${SPECIMEN_URL}" width="1024" height="1536"/></svg>`;
}
