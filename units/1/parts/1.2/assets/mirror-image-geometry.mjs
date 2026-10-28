export const MIRROR_SCENE = Object.freeze({
  mirrorX: 540, mirrorTop: 68, mirrorBottom: 570,
  source: Object.freeze([345, 440]), eyeX: 150,
  eyeMin: 90, eyeMax: 290, initialEye: 108, otherEye: 270,
  bearSize: 203, observerSize: 160,
  bearNose: Object.freeze([104 / 145, 47 / 145]),
  observerEye: Object.freeze([153 / 220, 101 / 220]),
});

export function mirrorPoint(point, mirrorX = MIRROR_SCENE.mirrorX) {
  return [2 * mirrorX - point[0], point[1]];
}
export function clampEye(y) {
  return Math.max(MIRROR_SCENE.eyeMin, Math.min(MIRROR_SCENE.eyeMax, y));
}
export function spriteAt(point, anchor, size) {
  return {x: point[0] - anchor[0] * size, y: point[1] - anchor[1] * size, width: size, height: size};
}
export function observation(y) {
  const eye = [MIRROR_SCENE.eyeX, clampEye(y)];
  const source = [...MIRROR_SCENE.source];
  const image = mirrorPoint(source);
  const t = (MIRROR_SCENE.mirrorX - eye[0]) / (image[0] - eye[0]);
  const hit = [MIRROR_SCENE.mirrorX, eye[1] + t * (image[1] - eye[1])];
  return {eye, source, image, hit,
    visible: hit[1] >= MIRROR_SCENE.mirrorTop && hit[1] <= MIRROR_SCENE.mirrorBottom,
    incoming: [source, hit], outgoing: [hit, eye], extension: [hit, image]};
}
export function incomingDirection(ray) {
  const [a, b] = ray.incoming, length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  return [(b[0] - a[0]) / length, (b[1] - a[1]) / length];
}
export function outgoingDirection(ray) {
  const [a, b] = ray.outgoing, length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  return [(b[0] - a[0]) / length, (b[1] - a[1]) / length];
}
export function opticalPath([a, b], arrow = false) {
  const points = arrow ? [a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], b] : [a, b];
  return 'M' + points.map(point => point.join(',')).join('L');
}
