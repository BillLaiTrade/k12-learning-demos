// One world (cm) for the side construction and the observer's pinhole view.
// y is height above the floor; the pupil is small, the water surface is flat.
export const TANK = Object.freeze({ length: 170, width: 130, height: 110, rim: 2.1, eyeHeight: 190, coinX: 55, coinRadius: 13, n: 4 / 3 });
export const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const unit = v => { const n = Math.hypot(...v); return v.map(x => x / n); };

export function solveCoinRay(depth, eyeX, coinX = TANK.coinX) {
  let low = coinX, high = eyeX;
  for (let i = 0; i < 56; i++) {
    const x = (low + high) / 2;
    const waterSin = (x - coinX) / Math.hypot(x - coinX, depth);
    const airSin = (eyeX - x) / Math.hypot(eyeX - x, TANK.eyeHeight - depth);
    if (TANK.n * waterSin > airSin) high = x; else low = x;
  }
  const hit = [(low + high) / 2, depth], eye = [eyeX, TANK.eyeHeight];
  const rimHeight = depth + (TANK.length - hit[0]) * (eye[1] - depth) / (eye[0] - hit[0]);
  const openingX = hit[0] + (TANK.height - depth) * (eye[0] - hit[0]) / (eye[1] - depth);
  const visible = openingX >= TANK.rim && openingX <= TANK.length - TANK.rim;
  const blockPoint = rimHeight >= TANK.height ? [openingX, TANK.height] : [TANK.length, rimHeight];
  return { coin: [coinX, 0], hit, eye, rimHeight, openingX, blockPoint, visible };
}

export function depthGeometry(depth = 70, eyeX = 250) {
  depth = clamp(Number.isFinite(depth) ? depth : 70, 40, 100);
  eyeX = clamp(Number.isFinite(eyeX) ? eyeX : 250, 210, 340);
  const center = solveCoinRay(depth, eyeX);
  const rays = [-.3, .3].map(offset => solveCoinRay(depth, eyeX + offset));
  const slopes = rays.map(r => (r.hit[0] - r.eye[0]) / (depth - r.eye[1]));
  const apparentY = depth + (rays[1].hit[0] - rays[0].hit[0]) / (slopes[0] - slopes[1]);
  const apparent = [rays[0].hit[0] + slopes[0] * (apparentY - depth), apparentY];
  const samples = [-12, -8, -4, 0, 4, 8, 12].map(dx => solveCoinRay(depth, eyeX, TANK.coinX + dx));
  const visibleSamples = samples.filter(r => r.visible);
  const status = !visibleSamples.length ? 'hidden' : visibleSamples.length === samples.length ? 'visible' : 'partial';
  return { depth, eyeX, coin: center.coin, eye: center.eye, center, rays, apparent,
    apparentDepth: depth - apparentY, status, representative: center.visible ? center : visibleSamples[0] || center };
}

export function observerCamera(g, aspect = 1.4) {
  const origin = [g.eyeX, TANK.eyeHeight, 0];
  // Look at the same fixed region of the tank, never automatically track the coin.
  const forward = unit([85 - g.eyeX, 73 - TANK.eyeHeight, 0]);
  const up = [forward[1], -forward[0], 0], lens = Math.tan(24 * Math.PI / 180);
  return { origin, forward, up, lens, aspect };
}

export function cameraDirection(camera, u, v) {
  return unit([camera.forward[0] + camera.up[0] * v * camera.lens,
    camera.forward[1] + camera.up[1] * v * camera.lens, u * camera.lens * camera.aspect]);
}

// Trace a camera ray BACKWARDS for rendering. This is numerical ray tracing,
// not light emitted by the eye. Physical arrows in the side view run coin -> eye.
export function traceViewRay(g, origin, direction) {
  const L = TANK.length, Z = TANK.width / 2, H = TANK.height;
  let enter = -Infinity, leave = Infinity, face = '';
  for (const [axis, min, max, name] of [[0, 0, L, 'end'], [1, 0, H, 'top'], [2, -Z, Z, 'side']]) {
    const d = direction[axis];
    if (Math.abs(d) < 1e-12) { if (origin[axis] < min || origin[axis] > max) return null; continue; }
    const a = (min - origin[axis]) / d, b = (max - origin[axis]) / d;
    const start = Math.min(a, b), end = Math.max(a, b);
    if (start > enter) { enter = start; face = name; }
    leave = Math.min(leave, end);
  }
  if (leave < Math.max(0, enter)) return null;
  const point = t => origin.map((x, i) => x + direction[i] * t);
  const entry = point(Math.max(0, enter));
  // The near wall is opaque: the observation is through the opening, not the wall.
  if (face !== 'top' || direction[1] >= 0) return { kind: 'outside', point: entry, face };
  const inset = TANK.rim;
  if (entry[0] < inset || entry[0] > L - inset || Math.abs(entry[2]) > Z - inset)
    return { kind: 'rim', point: entry };
  const surfaceT = (g.depth - origin[1]) / direction[1];
  if (surfaceT > leave) return { kind: 'wall', point: point(leave), wet: false };
  const surface = point(surfaceT), eta = 1 / TANK.n;
  const waterDirection = [direction[0] * eta, -Math.sqrt(1 - eta * eta * (1 - direction[1] ** 2)), direction[2] * eta];
  let distance = -surface[1] / waterDirection[1], kind = 'floor';
  for (const [axis, min, max] of [[0, 0, L], [2, -Z, Z]]) {
    const d = waterDirection[axis];
    if (Math.abs(d) < 1e-12) continue;
    const t = ((d > 0 ? max : min) - surface[axis]) / d;
    if (t >= 0 && t < distance) { distance = t; kind = 'wall'; }
  }
  const hit = surface.map((x, i) => x + waterDirection[i] * distance);
  if (kind === 'floor' && Math.hypot(hit[0] - TANK.coinX, hit[2]) <= TANK.coinRadius) kind = 'coin';
  return { kind, point: hit, surface, direction: waterDirection, wet: true, distance };
}
