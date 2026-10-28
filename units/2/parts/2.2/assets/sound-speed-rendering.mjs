// 介質場景、分子／原子與表面取樣共用同一波動模型。
import { positions, sample, PULSE_DURATION } from './sound-speed-model.mjs?v=instant-19';
// 敲擊動作保留 0.6 秒；接觸即起振，不延後傳播時計。
const STRIKE_DURATION = .6;
const CONTACT_DURATION = .06;
// 聲源外觀採微幅快速振動示意；微觀粒子另用便於追蹤的往返節奏。
// 此頻率不代表實際音高，亦不參與聲速、位置與到達時間計算。
export function forkVibration(time) {
  if(time<=0 || time>=PULSE_DURATION) return 0;
  const envelope=Math.sin(Math.PI/2*Math.min(1,time/.04))**2
    *Math.sin(Math.PI/2*Math.min(1,(PULSE_DURATION-time)/.25))**2;
  return 1.5*Math.sin(2*Math.PI*8*time)*envelope;
}
export const materialInfo = {
  air: {
    name: '空氣', phase: '氣體',
    description: '空氣主要由氮、氧等氣體組成。本身透明；微觀模型以常見分子示意，省略熱運動。'
  },
  water: {
    name: '水', phase: '液體',
    description: '水具有液面、可流動，透明水體會折射背景。微觀模型以彎折形的水分子示意，整個分子在平衡位置附近往返。'
  },
  steel: {
    name: '鋼', phase: '固體',
    description: '鋼具有固定形狀與金屬表面。微觀模型簡化原子排列；連結的伸縮表示彈性作用，不是鋼內真的裝有彈簧。'
  }
};

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
  const group = svgNode('g', { class: className, transform: `translate(${x} ${y})`, 'data-species': species, opacity: 1 }, parent);
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

// 先畫介質本體，再把振動圖形置於其內部，最後疊上表面反光。
// 表面取樣的位移也由 sample 計算，不另設裝飾性的行進光帶。
export function mediumScene(root, kind, prefix) {
  const defs = svgNode('defs', {}, root);
  const gradient = (name, stops, horizontal = false) => {
    const node = svgNode('linearGradient', { id: `${prefix}-${name}`, x1: 0, y1: 0, x2: horizontal ? 1 : 0, y2: horizontal ? 0 : 1 }, defs);
    stops.forEach(([offset, color, opacity = 1]) => svgNode('stop', { offset, 'stop-color': color, 'stop-opacity': opacity }, node));
    return `url(#${prefix}-${name})`;
  };
  const glass = gradient('glass', [[0,'#fff',.9],[.12,'#c3d9d9',.45],[.5,'#fff',.08],[.88,'#9ab9bb',.5],[1,'#faffff',.95]]);
  const liquid = gradient('liquid', [[0,'#f6ffff',.75],[.18,'#c8e8e9',.52],[.67,'#add3da',.46],[1,'#72aab9',.65]]);
  const surface = gradient('surface', [[0,'#faffff',.95],[.45,'#d6eff0',.65],[1,'#98c5cd',.8]]);
  const brushed = gradient('brushed', [[0,'#6b7e85'],[.14,'#e5e9e8'],[.28,'#a3b1b4'],[.53,'#f8faf7'],[.7,'#899da4'],[1,'#50656f']]);
  const cut = gradient('cut', [[0,'#7d929b'],[.1,'#d2dce0'],[.52,'#edf2f0'],[.9,'#bbcace'],[1,'#879ea5']]);
  const face = gradient('face', [[0,'#52656d'],[.5,'#c3ced0'],[1,'#6e8289']], true);
  const group = svgNode('g', { class: 'medium-scene', 'data-material': kind, 'data-view': 'field', 'aria-hidden': 'true' }, root);
  const back = svgNode('g', { class: 'medium-body' }, group);
  const x = kind === 'steel' ? 94 : 53, y = kind === 'water' ? 30 : 25, width = kind === 'steel' ? 334 : 375, height = kind === 'water' ? 83 : 88;
  if (kind !== 'air') {
    svgNode('ellipse', { cx: x + width / 2 + 4, cy: y + height + 6, rx: width / 2, ry: 5, fill: '#35575a', opacity: .1 }, back);
  }
  if (kind === 'water') {
    // 透明槽壁、上方水面及側面的折射，使液體具有可辨認的體積。
    svgNode('path', { class: 'glass-back', d: `M${x} ${y - 16}l12 -9h${width}V${y + height - 6}l-12 10H${x}Z`, fill: glass, stroke: '#a6c0c2', 'stroke-width': 1 }, back);
    svgNode('path', { class: 'water-side', d: `M${x + width} ${y}l12 -9v${height}l-12 9Z`, fill: '#86b7c3', 'fill-opacity': .55, stroke: '#9abfc4', 'stroke-width': .7 }, back);
    svgNode('rect', { class: 'liquid-volume', x, y, width, height, fill: liquid }, back);
    svgNode('path', { class: 'liquid-surface', d: `M${x} ${y}l12 -9h${width}l-12 9Z`, fill: surface, stroke: '#8dbac3', 'stroke-width': .8 }, back);
    svgNode('path', { d: `M${x + 3} ${y + 1}Q${x + width / 2} ${y + 3} ${x + width - 2} ${y}M${x + 14} ${y - 7}H${x + width + 8}`, fill: 'none', stroke: '#fff', 'stroke-width': 1.6, opacity: .9 }, back);
  } else if (kind === 'steel') {
    // 保留實心金屬外皮與斜切端面，中央剖開後才能看見內部原子。
    svgNode('path', { class: 'steel-top', d: `M${x - 2} ${y - 6}l12 -10h${width + 3}l-12 10Z`, fill: brushed, stroke: '#809198', 'stroke-width': .6 }, back);
    svgNode('path', { class: 'steel-end', d: `M${x + width + 1} ${y - 6}l12 -10v${height + 12}l-12 10Z`, fill: face, stroke: '#657b83', 'stroke-width': .7 }, back);
    svgNode('rect', { class: 'steel-shell', x: x - 2, y: y - 6, width: width + 3, height: height + 12, rx: 1.5, fill: brushed, stroke: '#6c828a', 'stroke-width': .8 }, back);
    svgNode('rect', { class: 'steel-cutaway', x: x + 2, y: y + 5, width: width - 3, height: height - 10, rx: 2, fill: cut, stroke: '#6c858d', 'stroke-width': .9 }, back);
    svgNode('path', { d: `M${x + 4} ${y + 7}H${x + width - 4}M${x + 4} ${y + height - 6}H${x + width - 4}`, stroke: '#fff', 'stroke-width': 1, opacity: .7 }, back);
    for (let i = 0; i < 5; i++) svgNode('path', { class: 'metal-grain', d: `M${x + 4} ${y - 4 + i * 1.2}h${width - 8}M${x + 4} ${y + height + i * .9}h${width - 8}`, stroke: i % 2 ? '#fff' : '#566d76', 'stroke-width': .35, opacity: .4 }, back);
  }
  const clip = svgNode('clipPath', { id: `${prefix}-inside` }, defs);
  svgNode('rect', { x: kind === 'air' ? x - 4 : x + 2, y: kind === 'steel' ? y + 6 : y + (kind === 'water' ? 2 : -7), width: width - (kind === 'air' ? -8 : 4), height: kind === 'steel' ? height - 12 : kind === 'water' ? height - 4 : height + 14, rx: 1 }, clip);
  const interior = svgNode('g', { class: 'medium-interior', 'clip-path': `url(#${prefix}-inside)` }, group);
  const front = svgNode('g', { class: 'medium-surface' }, group);
  const samples = [];
  if (kind === 'water') {
    svgNode('path', { class: 'glass-front', d: `M${x} ${y - 16}V${y + height + 4}h${width}V${y - 16}M${x - 1} ${y - 16}h${width + 1}l12 -9M${x} ${y + height + 4}l12 -9`, fill: 'none', stroke: '#d8e8e5', 'stroke-width': 2.2 }, front);
    svgNode('path', { d: `M${x + 2} ${y + height}h${width - 4}M${x + 5} ${y + 7}v${height - 16}`, stroke: '#fff', 'stroke-width': 1.4, opacity: .85 }, front);
    svgNode('path', { class: 'liquid-reflection', d: `M${x + width * .12} ${y + 7}h${width * .17}l-14 ${height - 15}h${-width * .17}Z`, fill: '#fff', opacity: .13 }, front);
  }
  if (kind !== 'air') {
    const points = positions(kind).filter(p => p.row === 0);
    for (const point of points) {
      const path = kind === 'steel' ? `M0 20l4 -3M0 114v3` : `M-4 111q4 -3 9 -1`;
      const node = svgNode('path', { class: 'surface-sample', 'data-origin-x': point.x, 'data-distance': point.distance, d: path, fill: 'none', stroke: kind === 'steel' ? '#f5faf9' : '#fff', 'stroke-width': kind === 'steel' ? .6 : 1.1, opacity: .55, transform: `translate(${point.x} 0)` }, front);
      samples.push({ point, node });
    }
  }
  return { interior, paint(time, speed) {
    for (const { point, node } of samples) node.setAttribute('transform', `translate(${sample(point, speed, time).x.toFixed(4)} 0)`);
  } };
}

// 叉臂幾何固定，只作水平微幅反向位移，不逐影格變形、旋轉或扭曲。
// 鋼材由右叉臂經薄接觸層傳振，另一臂自由；不把兩臂夾死。
export function tuningForkSource(root, kind, fill, { labelY = 139 } = {}) {
  const group = svgNode('g', { class:'sound-source tuning-fork', 'data-medium':kind, 'data-vibrating':'false', 'aria-hidden':'true' }, root);
  const body = svgNode('g', { class:'fork-fixed' }, group);
  const metal = (parent, d, cls='') => {
    const outer = svgNode('path', { class:cls, d, fill:'none', stroke:'#4f6670', 'stroke-width':7.5, 'stroke-linecap':'round', 'stroke-linejoin':'round' }, parent);
    const inner = svgNode('path', { class:cls, d, fill:'none', stroke:fill('source'), 'stroke-width':5.6, 'stroke-linecap':'round', 'stroke-linejoin':'round' }, parent);
    const shine = svgNode('path', { class:cls, d, fill:'none', stroke:'#f7fbf8', 'stroke-width':1, opacity:.65, 'stroke-linecap':'round' }, parent);
    return [outer,inner,shine];
  };
  let paths, hit, contact;
  if (kind === 'water') {
    metal(body,'M80 7V25');
    metal(body,'M68 44C68 19 92 19 92 44');
    paths = ['M68 44V99','M92 44V99'];
    hit = { x:68, y:9, handle:'M73 14L53 1', dx:-20, dy:4 };
    svgNode('path',{class:'fork-waterline',d:'M61 30H73M86 30H98',stroke:'#eaf9f7','stroke-width':1.5,opacity:.9},group);
  } else if (kind === 'steel') {
    metal(body,'M52 99C52 123 86 123 86 99');
    metal(body,'M69 117V125');
    paths = ['M52 99V35','M86 99V35'];
    contact = svgNode('path',{class:'source-contact','data-coupled-arm':'right',fill:'#9cabad',stroke:'#617980','stroke-width':.5},group);
    hit = { x:40, y:35, handle:'M46 41L27 63', dx:-20, dy:3 };
  } else {
    metal(body,'M42 79C42 104 74 104 74 79');
    metal(body,'M58 98V113');
    paths = ['M42 79V33','M74 79V33'];
    hit = { x:30, y:33, handle:'M36 39L16 62', dx:-24, dy:3 };
  }
  const traces=svgNode('g',{class:'fork-vibration-trace',visibility:'hidden','aria-hidden':'true'},group);
  for(const d of paths) for(const offset of [-2.1,2.1]) svgNode('path',{
    d,transform:`translate(${offset} 0)`,fill:'none',stroke:'#819ba3','stroke-width':1.2,
    'stroke-linecap':'round',opacity:.25
  },traces);
  const arms = paths.map(d => metal(group,d,'fork-tine'));
  const mallet = svgNode('g',{class:'fork-striker',visibility:'hidden','data-strike':'idle'},group);
  svgNode('path',{d:hit.handle,stroke:'#956b43','stroke-width':4.5,'stroke-linecap':'round'},mallet);
  svgNode('rect',{x:hit.x,y:hit.y,width:12,height:12,rx:4,fill:'#3a4649',stroke:'#1e3034','stroke-width':.8},mallet);
  svgNode('path',{d:`M${hit.x+3} ${hit.y+2}h6`,stroke:'#899497','stroke-width':1.3,'stroke-linecap':'round'},mallet);
  const label=svgNode('text',{x:kind==='water'?78:55,y:labelY,'text-anchor':'middle',fill:'#526f5c','font-size':12},group);
  label.textContent='音叉';
  return { paint(time,phase) {
    const value=forkVibration(time);
    const active=time>0&&time<PULSE_DURATION;
    group.setAttribute('data-vibrating',String(active));
    arms.forEach((arm,i)=>arm.forEach(node=>node.setAttribute('transform',`translate(${((i?1:-1)*value).toFixed(5)} 0)`)));
    traces.setAttribute('visibility',active?'visible':'hidden');
    if(contact) {
      // 右臂外緣與鋼端面之間始終連接，薄層彈性變形傳遞振動。
      const edge=86+value+2.8;
      contact.setAttribute('d',`M${edge} 35H94V52H${edge}Z`);
      contact.setAttribute('data-arm-edge',String(edge));
      contact.setAttribute('data-steel-edge','94');
    }
    const striking=phase!=='idle'&&time>=0&&time<STRIKE_DURATION;
    const progress=Math.min(1,Math.max(0,(time-CONTACT_DURATION)/(STRIKE_DURATION-CONTACT_DURATION)));
    const retreat=progress*progress*(3-2*progress);
    mallet.setAttribute('visibility',striking?'visible':'hidden');
    mallet.setAttribute('data-strike',striking?(time<CONTACT_DURATION?'contact':'withdrawing'):'idle');
    mallet.setAttribute('transform',`translate(${(hit.dx*retreat).toFixed(3)} ${(hit.dy*retreat).toFixed(3)})`);
    // 前半秒維持完整可見，最後 0.1 秒才淡出。
    mallet.setAttribute('opacity',String(Math.min(1,Math.max(0,(STRIKE_DURATION-time)/.1))));
  } };
}
