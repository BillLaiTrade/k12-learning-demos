// Geometrical-optics model for the existing narrow optical-bench beam. A small
// source sends straight rays towards a uniformly lit circular patch on screen.
// Every aperture clips that SAME bundle, including both faces of its thickness.
export const APERTURE_OPTICS = Object.freeze({
  sourceX: -4, axisY: 1.28, screenX: 4.265, screenRadius: 0.15,
  halfHeight: 0.18, halfWidth: 0.21, halfThickness: 0.06,
});

// Area of a circular beam surviving a vertical strip, relative to the full disk.
// The 0.42-wide holes exceed the beam width everywhere along this apparatus;
// plates move in x/y only, so the vertical strip is the only clipping dimension.
export function circularStripFraction(lower, upper, radius = APERTURE_OPTICS.screenRadius) {
  const lo = Math.max(-radius, lower), hi = Math.min(radius, upper);
  if (hi <= lo) return 0;
  const primitive = y => y * Math.sqrt(Math.max(0, radius * radius - y * y)) + radius * radius * Math.asin(y / radius);
  return Math.max(0, Math.min(1, (primitive(hi) - primitive(lo)) / (Math.PI * radius * radius)));
}

export function traceApertures(plates) {
  const {sourceX, screenX, screenRadius, halfHeight, halfThickness} = APERTURE_OPTICS;
  const ordered = plates.map((plate, index) => {
    if (!Number.isFinite(plate.x) || !Number.isFinite(plate.height) || plate.x - halfThickness <= sourceX || plate.x + halfThickness >= screenX) {
      throw new RangeError('Apertures must be finite and lie between the source and screen.');
    }
    return {...plate, index};
  }).sort((a, b) => a.x - b.x);
  let lower = -screenRadius, upper = screenRadius, power = 1;
  const stages = new Array(plates.length);
  for (const plate of ordered) {
    const received = power;
    for (const x of [plate.x - halfThickness, plate.x + halfThickness]) {
      const t = (x - sourceX) / (screenX - sourceX);
      // y_at_hole = t * y_at_screen, measured from the fixed optical axis.
      lower = Math.max(lower, (plate.height - halfHeight) / t);
      upper = Math.min(upper, (plate.height + halfHeight) / t);
    }
    power = circularStripFraction(lower, upper);
    stages[plate.index] = {index: plate.index, x: plate.x, received, power, lower, upper};
  }
  return {power, lower, upper, stages};
}
