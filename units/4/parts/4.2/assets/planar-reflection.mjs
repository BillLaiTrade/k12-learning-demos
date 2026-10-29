// World coordinates used by the shared laser bench: x is the mirror normal,
// y is height, z runs along the mirror. Left/front face of the actual mesh.
export const MIRROR_FACE_X = 1.96 - 0.055 / 2;
export const LASER_HEIGHT = 1.4;
export function reflect(direction) {
  const length = Math.hypot(...direction);
  if (!length) throw new RangeError('A ray needs a direction');
  return [-direction[0] / length, direction[1] / length, direction[2] / length];
}
export function traceMirror(source, direction, distance) {
  const length = Math.hypot(...direction);
  const d = direction.map(v => v / length);
  if (!(d[0] > 1e-9) || !(distance > 0)) throw new RangeError('Ray must hit the mirror from the front');
  const t = (MIRROR_FACE_X - source[0]) / d[0];
  if (!(t > 0)) throw new RangeError('Source must be in front of the mirror');
  const hit = source.map((v, i) => v + t * d[i]);
  const outgoing = reflect(d);
  return { source: [...source], hit, direction: outgoing, end: hit.map((v, i) => v + distance * outgoing[i]) };
}
export function laserPath(degrees, incomingLength = 7, outgoingLength = 10.5) {
  if (!(degrees >= 0 && degrees < 90)) throw new RangeError('Grazing rays do not strike this mirror');
  const a = degrees * Math.PI / 180;
  const source = [MIRROR_FACE_X - incomingLength * Math.cos(a), LASER_HEIGHT, -incomingLength * Math.sin(a)];
  return traceMirror(source, [Math.cos(a), 0, Math.sin(a)], outgoingLength);
}
export function reciprocalPath(degrees) {
  const forward = laserPath(degrees, 7, 7);
  // A new ray, emitted at B and aimed at M, is reflected independently.
  const backward = traceMirror(forward.end, forward.hit.map((v, i) => v - forward.end[i]), 7);
  const error = Math.hypot(...backward.end.map((v, i) => v - forward.source[i]));
  return { forward, backward, error };
}
