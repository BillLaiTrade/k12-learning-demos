const SVG_NS = 'http://www.w3.org/2000/svg';

function svgNode(parent, tag, attributes = {}, text = '') {
  const element = document.createElementNS(SVG_NS, tag);
  Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, String(value)));
  if (text) element.textContent = text;
  parent.append(element);
  return element;
}

function renderSolid(svg, length, width, height) {
  svg.replaceChildren();
  const cx = 220, baseY = 258, horizontal = 24, diagonal = 12, vertical = 24;
  const point = (x, y, z) => [
    cx + (x - z) * horizontal,
    baseY + (x + z) * diagonal - y * vertical
  ];
  const path = coordinates => coordinates.map((p, index) => (index ? 'L' : 'M') + p[0] + ',' + p[1]).join(' ') + ' Z';
  const polygon = (points, fill, stroke = '#789083', widthPx = 1.4) =>
    svgNode(svg, 'path', { d: path(points.map(p => point(...p))), fill, stroke, 'stroke-width': widthPx, 'stroke-linejoin': 'round' });
  const line = (a, b, stroke, widthPx = 1) =>
    svgNode(svg, 'line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke, 'stroke-width': widthPx });
  const text = (x, y, value, fill, anchor = 'middle') =>
    svgNode(svg, 'text', { x, y, fill, 'text-anchor': anchor, class: 'volume-dimension-label' }, value);

  const depth = width;
  polygon([[0, 0, depth], [length, 0, depth], [length, height, depth], [0, height, depth]], '#b8d6c4');
  polygon([[length, 0, 0], [length, 0, depth], [length, height, depth], [length, height, 0]], '#91b7a2');
  polygon([[0, height, 0], [length, height, 0], [length, height, depth], [0, height, depth]], '#e0eee3');

  const grid = '#6f9380';
  for (let z = 0; z <= depth; z++) line(point(0, height, z), point(length, height, z), grid);
  for (let x = 0; x <= length; x++) line(point(x, height, 0), point(x, height, depth), grid);
  for (let x = 0; x <= length; x++) line(point(x, 0, depth), point(x, height, depth), grid);
  for (let y = 0; y <= height; y++) line(point(0, y, depth), point(length, y, depth), grid);
  for (let z = 0; z <= depth; z++) line(point(length, 0, z), point(length, height, z), grid);
  for (let y = 0; y <= height; y++) line(point(length, y, 0), point(length, y, depth), grid);

  const dimensions = [
    { from: point(0, 0, depth + 0.35), to: point(length, 0, depth + 0.35), color: '#147968', label: length + ' cm', dx: 0, dy: 20 },
    { from: point(length + 0.35, 0, 0), to: point(length + 0.35, 0, depth), color: '#5269a6', label: width + ' cm', dx: 0, dy: 12 },
    { from: point(length + 1, 0, depth), to: point(length + 1, height, depth), color: '#bd633e', label: height + ' cm', dx: 24, dy: 4 }
  ];
  dimensions.forEach(({ from, to, color, label, dx, dy }) => {
    line(from, to, color, 2.2);
    [from, to].forEach(([x, y]) => svgNode(svg, 'circle', { cx: x, cy: y, r: 3.2, fill: color }));
    text((from[0] + to[0]) / 2 + dx, (from[1] + to[1]) / 2 + dy, label, color);
  });

  svg.setAttribute('aria-label', '由每一公分刻線組成的長方體，長 ' + length + ' 公分、寬 ' + width + ' 公分、高 ' + height + ' 公分，體積 ' + length * width * height + ' 立方公分');
}

function renderLayers(svg, length, width, height) {
  svg.replaceChildren();
  const cell = Math.min(22, 125 / length, 105 / width);
  const gridX = 28, gridY = 44;
  svgNode(svg, 'text', { x: gridX, y: 23, class: 'volume-svg-heading' }, '每層底面：' + length + ' × ' + width);
  for (let z = 0; z < width; z++) {
    for (let x = 0; x < length; x++) {
      svgNode(svg, 'rect', {
        x: gridX + x * cell,
        y: gridY + z * cell,
        width: cell - 1,
        height: cell - 1,
        rx: 2,
        fill: x === 0 && z === 0 ? '#d99459' : (x + z) % 2 ? '#dcebe0' : '#c8dfd0',
        stroke: '#75917e',
        'stroke-width': 0.8
      });
    }
  }
  const stackX = 270, stackY = 36, stackW = 94, layerH = Math.min(19, 104 / height);
  svgNode(svg, 'text', { x: stackX + stackW / 2, y: 23, class: 'volume-svg-heading' }, '高度：' + height + ' 層');
  for (let layer = 0; layer < height; layer++) {
    const y = stackY + (height - layer - 1) * layerH;
    svgNode(svg, 'rect', {
      x: stackX, y, width: stackW, height: layerH - 1,
      rx: 2, fill: layer % 2 ? '#a8cbb5' : '#c5dece',
      stroke: '#668573', 'stroke-width': 0.9
    });
    if (layerH >= 15) svgNode(svg, 'text', { x: stackX + stackW + 8, y: y + layerH * 0.72, class: 'volume-layer-label' }, '1 cm');
  }
  svgNode(svg, 'text', { x: gridX + length * cell / 2, y: gridY + width * cell + 22, class: 'volume-layer-label' }, length * width + ' 個 1 cm³ 小方塊');
  svgNode(svg, 'text', { x: stackX + stackW / 2, y: stackY + height * layerH + 21, class: 'volume-layer-label' }, '共 ' + height + ' 層');
  svg.setAttribute('aria-label', '每層底面有 ' + length + ' 乘 ' + width + ' 個單位方格，共 ' + length * width + ' 個；疊 ' + height + ' 層，共 ' + length * width * height + ' 個一立方公分小方塊');
}

export function mountVolumeModel() {
  const inputs = {
    length: document.querySelector('#length'),
    width: document.querySelector('#width'),
    height: document.querySelector('#height')
  };
  const outputs = {
    length: document.querySelector('#length-out'),
    width: document.querySelector('#width-out'),
    height: document.querySelector('#height-out')
  };
  const solid = document.querySelector('#volume-solid');
  const layers = document.querySelector('#volume-layer-view');
  const formula = document.querySelector('#cuboid-formula');
  const summary = document.querySelector('#volume-layer-summary');

  function update() {
    const length = Number(inputs.length.value);
    const width = Number(inputs.width.value);
    const height = Number(inputs.height.value);
    const volume = length * width * height;
    Object.entries(inputs).forEach(([axis, input]) => {
      outputs[axis].textContent = input.value + ' cm';
      input.setAttribute('aria-valuetext', input.value + ' 公分');
    });
    renderSolid(solid, length, width, height);
    renderLayers(layers, length, width, height);
    formula.innerHTML = length + ' cm × ' + width + ' cm × ' + height + ' cm = ' + volume + ' cm³<small>長 × 寬 × 高 = 體積</small>';
    summary.textContent = '每層有 ' + length + ' × ' + width + ' = ' + length * width + ' 個小方格；疊 ' + height + ' 層，共 ' + volume + ' 個 1 cm³ 小方塊，也就是 ' + volume + ' cm³。';
  }

  Object.values(inputs).forEach(input => input.addEventListener('input', update));
  update();
}
