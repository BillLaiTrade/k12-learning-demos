// Parallel interfaces conserve n sin(theta). Geometry and playback use the
// same refractive indices; labels and colours never encode the answer.
export const LAYER_NAMES = Object.freeze(['甲', '乙', '丙']);
const INDICES = Object.freeze([1.12, 1.4, 1.78]);
const PERMUTATIONS = Object.freeze([
  [0, 2, 1], [0, 1, 2], [1, 0, 2],
  [1, 2, 0], [2, 0, 1], [2, 1, 0],
].map(Object.freeze));
export const MS_PER_OPTICAL_UNIT = 520;

export function layerGeometry(indices, incident = 40) {
  if (!Array.isArray(indices) || indices.length !== 3 ||
      indices.some(n => !Number.isFinite(n) || n < 1) || new Set(indices).size !== 3 ||
      !Number.isFinite(incident) || incident <= 0 || incident >= 90) {
    throw new RangeError('Three distinct transparent media and oblique incidence are required');
  }
  const radians = incident * Math.PI / 180, invariant = Math.sin(radians);
  const points = [[-.5 * Math.tan(radians), -.5], [0, 0]];
  const segments = [];
  let arrival = 0;
  const append = (from, to, n, layer, angle) => {
    const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
    const duration = length * n * MS_PER_OPTICAL_UNIT;
    segments.push({from, to, n, layer, angle, length, startMs:arrival, durationMs:duration});
    arrival += duration;
  };
  append(points[0], points[1], 1, -1, incident);
  const layers = indices.map((n, i) => {
    const theta = Math.asin(invariant / n), from = points.at(-1);
    const to = [from[0] + Math.tan(theta), i + 1];
    const angle = theta * 180 / Math.PI;
    points.push(to); append(from, to, n, i, angle);
    return {id:i, name:LAYER_NAMES[i], n, speed:1/n, angle, from, to};
  });
  return {incident, invariant, points, layers, segments, durationMs:arrival,
    order:layers.toSorted((a,b) => b.speed-a.speed).map(layer=>layer.id)};
}

export function layerSnapshot(geometry, elapsed) {
  const time = Math.max(0, Math.min(geometry.durationMs, Number(elapsed)||0));
  return {complete:time>=geometry.durationMs, segments:geometry.segments.map(segment => {
    const fraction = Math.max(0, Math.min(1, (time-segment.startMs)/segment.durationMs));
    return {...segment, fraction, end:segment.from.map((v,i)=>v+(segment.to[i]-v)*fraction)};
  })};
}

export function createLayerDeck(random = Math.random) {
  let remaining = [0], last = -1, serial = 0;
  const shuffle = list => {
    for(let i=list.length-1;i>0;i--){const j=Math.min(i,Math.max(0,Math.floor(random()*(i+1))));[list[i],list[j]]=[list[j],list[i]];}
    return list;
  };
  return {next(){
    if(!remaining.length){
      remaining = shuffle(PERMUTATIONS.map((_,i)=>i));
      if(remaining[0]===last)remaining.push(remaining.shift());
    }
    const key = remaining.shift();
    if(serial===0)remaining=shuffle([1,2,3,4,5]);
    const incident = serial===0||random()>=.5 ? 40 : 36;
    last=key;serial++;
    return {id:serial, key, geometry:layerGeometry(PERMUTATIONS[key].map(i=>INDICES[i]),incident)};
  }};
}

export function placeLayer(order, medium, slot) {
  if(!Array.isArray(order)||order.length!==3||!Number.isInteger(medium)||medium<0||medium>2||!Number.isInteger(slot)||slot<0||slot>2)throw new RangeError('Invalid layer placement');
  const next=[...order], previous=next.indexOf(medium), displaced=next[slot];
  if(previous===slot)return next;
  if(previous>=0)next[previous]=displaced;
  next[slot]=medium;
  return next;
}

export function compareLayers(geometry, order) {
  if(!Array.isArray(order)||order.length!==3||order.some(x=>!Number.isInteger(x)||x<0||x>2)||new Set(order).size!==3)return {complete:false, correct:false, positions:[]};
  const positions=order.map((id,i)=>id===geometry.order[i]);
  return {complete:true, correct:positions.every(Boolean), positions};
}
