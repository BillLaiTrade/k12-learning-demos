// A fixed liquid column behind an engraved front scale. World coordinates are
// teaching dimensions, not a specification for a real thermometer's error.
export const SAMPLE_C = 37.5;
export const CAMERA_DISTANCE = 12;
export const SCALE_DEPTH = 0.94;
export const DEGREE_HEIGHT = 1.2;
export const degreeY = degree => (degree - SAMPLE_C) * DEGREE_HEIGHT;
export const eyeHeight = position => position * 0.06;

export function projectPoint([x, y, z], position) {
  const height = eyeHeight(position);
  const distance = Math.hypot(CAMERA_DISTANCE, height);
  const cos = CAMERA_DISTANCE / distance, sin = height / distance;
  // Camera at (0,height,12), looking at the fixed meniscus at (0,0,0).
  const depth = distance - y * sin - z * cos;
  return [200 + 420 * x / depth, 200 - 420 * (y * cos - z * sin) / depth];
}

export function apparentTemperature(position) {
  return SAMPLE_C + SCALE_DEPTH * eyeHeight(position) / CAMERA_DISTANCE / DEGREE_HEIGHT;
}
