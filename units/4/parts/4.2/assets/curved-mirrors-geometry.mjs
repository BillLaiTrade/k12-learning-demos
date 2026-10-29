// Exact specular reflection on the central section of a spherical mirror.
// Coordinates are SVG coordinates (positive y points down). All light arrives
// horizontally from the left. Image examples use the paraxial mirror model.
export const MIRRORS = {
  plane: { name: '平面鏡', result: '仍互相平行' },
  concave: { name: '凹面鏡', result: '向內會聚' },
  convex: { name: '凸面鏡', result: '向外發散' },
};
export const OPTICS = { vertex: 270, centerY: 110, radius: 340, offsets: [-38, 0, 38], aperture: 76 };

export function reflectionAt(mode, offset) {
  if (!Object.hasOwn(MIRRORS, mode)) throw new RangeError('Unknown mirror');
  const { vertex, centerY, radius } = OPTICS;
  const root = Math.sqrt(radius ** 2 - offset ** 2);
  const sign = mode === 'concave' ? -1 : 1;
  const x = mode === 'plane' ? vertex : vertex + sign * (radius - root);
  // Unit normal points into the left (illuminated) half-space.
  const normal = mode === 'plane' ? [-1, 0] : [-root / radius, sign * offset / radius];
  const direction = [1 - 2 * normal[0] ** 2, -2 * normal[0] * normal[1]];
  const distance = (20 - x) / direction[0];
  return {
    point: [x, centerY + offset], normal, direction,
    end: [20, centerY + offset + distance * direction[1]],
    angle: Math.acos(Math.min(1, -normal[0])) * 180 / Math.PI,
  };
}

export function mirrorOutline(mode) {
  const points = [];
  for (let y = -OPTICS.aperture; y <= OPTICS.aperture; y += 2) points.push(reflectionAt(mode, y).point);
  return points;
}

// Normalized examples: f=1 for concave, f=-1 for convex. These are NOT
// distances in the ray diagram; arrow illustrations compare appearance only.
export function imageExample(mode, position = 'near') {
  if (mode === 'plane') return { objectDistance: 1.5, imageDistance: -1.5, magnification: 1 };
  const f = mode === 'convex' ? -1 : 1;
  const objectDistance = mode === 'convex' ? 1.5 : position === 'near' ? 0.5 : 3;
  const imageDistance = f * objectDistance / (objectDistance - f);
  return { objectDistance, imageDistance, magnification: -imageDistance / objectDistance };
}
