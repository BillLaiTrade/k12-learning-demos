// Representative transparent materials; classroom geometry, not a timing measurement.
export const materials = { air: { name: '空氣', n: 1 }, water: { name: '水', n: 4 / 3 }, glass: { name: '玻璃', n: 1.5 } };
export function refractedAngle(from, to, degrees) {
  const s = materials[from].n / materials[to].n * Math.sin(degrees * Math.PI / 180);
  if (Math.abs(s) > 1) throw new RangeError('No transmitted ray');
  return Math.asin(s) * 180 / Math.PI;
}
export function rayGeometry(medium, degrees, reverse = false) {
  const outgoing = refractedAngle(reverse ? medium : 'air', reverse ? 'air' : medium, degrees);
  const a = degrees * Math.PI / 180, b = outgoing * Math.PI / 180, sign = reverse ? -1 : 1;
  return { source: [320 - 160 * Math.sin(a), 190 - sign * 160 * Math.cos(a)], hit: [320, 190], end: [320 + 180 * Math.sin(b), 190 + sign * 180 * Math.cos(b)], outgoing };
}
export function apparentDepth(depth, eyeX = 370, aperture = 4) {
  const coin = [280, 340], surface = 340 - depth * 2;
  const rays = [-aperture, aperture].map(offset => {
    const eye = [eyeX + offset, 60];
    let lo = Math.min(coin[0], eye[0]), hi = Math.max(coin[0], eye[0]);
    for (let i = 0; i < 70; i++) {
      const x = (lo + hi) / 2;
      const a = (x - coin[0]) / Math.hypot(x - coin[0], coin[1] - surface);
      const b = (eye[0] - x) / Math.hypot(eye[0] - x, surface - eye[1]);
      if (materials.water.n * a > b) hi = x; else lo = x;
    }
    return { eye, hit: [(lo + hi) / 2, surface] };
  });
  const slopes = rays.map(r => (r.hit[0] - r.eye[0]) / (surface - r.eye[1]));
  const y = surface + (rays[1].hit[0] - rays[0].hit[0]) / (slopes[0] - slopes[1]);
  const apparent = [rays[0].hit[0] + slopes[0] * (y - surface), y];
  return { coin, surface, rays, apparent, apparentDepth: (y - surface) / 2 };
}
