// Planar cutouts cast scaled/transposed silhouettes on the parallel screen.
// Placement compares that projection, with independent size/position tolerances.
export const THEATRE_OPTICS = Object.freeze({
  light: Object.freeze({x: -0.8, y: 3.05, z: 3.5}),
  screenZ: -1.25, targetDepth: 0.42,
  sizeTolerance: 0.04, positionTolerance: 0.12,
});

export function shadowScaleAt(z) {
  const {light, screenZ} = THEATRE_OPTICS;
  if (!Number.isFinite(z) || z <= screenZ || z >= light.z) throw new RangeError('The cutout must lie between the light and screen.');
  return (light.z - screenZ) / (light.z - z);
}

export function projectShadow(position) {
  if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) throw new RangeError('The cutout position must be finite.');
  const scale = shadowScaleAt(position.z), {light} = THEATRE_OPTICS;
  return {x: light.x + (position.x - light.x) * scale, y: light.y + (position.y - light.y) * scale, scale};
}

export function positionForShadow(target, z) {
  const scale = shadowScaleAt(z), {light} = THEATRE_OPTICS;
  return {x: light.x + (target.x - light.x) / scale, y: light.y + (target.y - light.y) / scale, z};
}

export function assessShadow(position, target) {
  const projection = projectShadow(position);
  const sizeError = projection.scale / shadowScaleAt(THEATRE_OPTICS.targetDepth) - 1;
  const positionError = Math.hypot(projection.x - target.x, projection.y - target.y);
  const sizeMatches = Math.abs(sizeError) <= THEATRE_OPTICS.sizeTolerance + 1e-12;
  const positionMatches = positionError <= THEATRE_OPTICS.positionTolerance + 1e-12;
  return {projection, sizeError, positionError, sizeMatches, positionMatches, matches: sizeMatches && positionMatches};
}
