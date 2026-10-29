// Coordinates are centimetres in a side section; y=0 is the outside water level.
// The model is qualitative, isothermal, and omits surface tension / dissolution.
export const CUP = Object.freeze({ height: 10, tankDepth: 15.2, minDepth: -1, maxDepth: 13.5, immersedDepth: 12, maxAngle: 125, paperCenter: -3.2, paperRadius: 1.7 });
const limit = (v, a, b) => Math.max(a, Math.min(b, Number(v) || 0));
const local = [{ x: -3.2, y: -5 }, { x: 3.2, y: -5 }, { x: 4, y: 5 }, { x: -4, y: 5 }];
export function rotateCup(point, depth, angle) {
  const a = -angle * Math.PI / 180;
  return { x: point.x * Math.cos(a) - point.y * Math.sin(a), y: depth - 5 + point.x * Math.sin(a) + point.y * Math.cos(a) };
}
export function polygonArea(points) {
  return Math.abs(points.reduce((sum, p, i) => { const q = points[(i + 1) % points.length]; return sum + p.x * q.y - q.x * p.y; }, 0)) / 2;
}
export function aboveWater(points, level) {
  const clipped = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length], insideA = a.y <= level, insideB = b.y <= level;
    if (insideA) clipped.push(a);
    if (insideA !== insideB) clipped.push({ x: a.x + (b.x - a.x) * (level - a.y) / (b.y - a.y), y: level });
  }
  return clipped;
}
const originalArea = polygonArea(local);
export function cupGeometry(depth, angle, escaped = 0) {
  const d = limit(depth, CUP.minDepth, CUP.maxDepth), tilt = limit(angle, -CUP.maxAngle, CUP.maxAngle);
  const polygon = local.map(p => rotateCup(p, d, tilt));
  const mouth = [polygon[2], polygon[3]], outlet = mouth.reduce((a, b) => a.y < b.y ? a : b);
  const minY = Math.min(...polygon.map(p => p.y)), maxY = Math.max(...polygon.map(p => p.y));
  let vent = limit(escaped, 0, 1), water;
  if (outlet.y <= 0) {
    // An exposed part of the mouth connects to ambient air. Water drains to
    // the outside level; the wet-paper history is retained in state.
    vent = limit(1 - polygonArea(aboveWater(polygon, 0)) / originalArea, 0, 1); water = 0;
  } else {
    const capacity = polygonArea(aboveWater(polygon, outlet.y)) * (1 + outlet.y / 1033);
    vent = Math.max(vent, 1 - limit(capacity / originalArea, 0, 1));
    const mass = originalArea * (1 - vent);
    let low = minY - .01, high = maxY + .01;
    for (let i = 0; i < 48; i++) {
      const y = (low + high) / 2;
      if (polygonArea(aboveWater(polygon, y)) * (1 + y / 1033) > mass) high = y;
      else low = y;
    }
    water = mass < 1e-8 ? minY - .01 : (low + high) / 2;
  }
  const paper = rotateCup({ x: 0, y: CUP.paperCenter }, d, tilt);
  return { depth: d, tilt, polygon, mouth, outlet, minY, maxY, paper, water, vent,
    airArea: polygonArea(aboveWater(polygon, water)),
    paperBelowOutside: paper.y - CUP.paperRadius > 0,
    paperTouchesWater: paper.y + CUP.paperRadius >= water && paper.y + CUP.paperRadius > 0,
    submerged: minY > 0, withinTank: maxY < CUP.tankDepth };
}
export const freshCup = () => ({ depth: -1, angle: 0, escaped: 0, wet: false });
export function moveCup(state, depth, angle) {
  const d = limit(depth, CUP.minDepth, CUP.maxDepth);
  // Translation preserves the requested orientation at every depth. The UI
  // separately locks rotation until the first upright immersion is completed.
  const a = limit(angle, -CUP.maxAngle, CUP.maxAngle);
  const g = cupGeometry(d, a, state.escaped);
  return { depth: d, angle: a, escaped: g.vent, wet: state.wet || g.paperTouchesWater };
}
