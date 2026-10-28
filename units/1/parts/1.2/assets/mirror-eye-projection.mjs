import {MIRROR_SCENE as scene, clampEye, mirrorPoint} from './mirror-image-geometry.mjs?v=1';

// x is distance along the left diagram, y points down, z runs across the mirror.
// A pinhole camera at the SAME eye keeps looking at the fixed virtual nose.
export function eyeCamera(y) {
  const eye = [scene.eyeX, clampEye(y), 0], target = [...mirrorPoint(scene.source), 0];
  const dx = target[0] - eye[0], dy = target[1] - eye[1], length = Math.hypot(dx, dy);
  return {eye, target, c: dx / length, s: dy / length, focal: 320, center: [200, 310]};
}
export function projectPoint(camera, [x, y, z = 0]) {
  const dx = x - camera.eye[0], dy = y - camera.eye[1];
  const depth = dx * camera.c + dy * camera.s;
  return [camera.center[0] + camera.focal * z / depth,
    camera.center[1] + camera.focal * (dy * camera.c - dx * camera.s) / depth, depth];
}
export function planeQuad(camera, plane) {
  return [[plane.top, plane.left], [plane.top, plane.left + plane.width],
    [plane.top + plane.height, plane.left + plane.width], [plane.top + plane.height, plane.left]]
    .map(([y, z]) => projectPoint(camera, [plane.x, y, z]));
}
// Inverse perspective for a horizontal raster row on a plane parallel to the mirror.
export function planeRow(camera, plane, screenY) {
  const q = (screenY - camera.center[1]) / camera.focal, dx = plane.x - camera.eye[0];
  const y = camera.eye[1] + dx * (camera.s + q * camera.c) / (camera.c - q * camera.s);
  const left = projectPoint(camera, [plane.x, y, plane.left]);
  return {v: (y - plane.top) / plane.height, x: left[0], width: camera.focal * plane.width / left[2]};
}
export const EYE_PLANES = Object.freeze({
  // Existing transparent front/rear art supplies appearance; projection supplies geometry.
  front: Object.freeze({x: mirrorPoint(scene.source)[0], top: scene.source[1] - scene.bearSize * 132 / 385, height: scene.bearSize, left: -205 * 209 / 400, width: 205}),
  rear: Object.freeze({x: scene.source[0], top: scene.mirrorBottom - scene.bearSize, height: scene.bearSize, left: -102.5, width: 205}),
  frame: Object.freeze({x: scene.mirrorX, top: scene.mirrorTop, height: scene.mirrorBottom - scene.mirrorTop, left: -180, width: 360}),
  glass: Object.freeze({x: scene.mirrorX, top: scene.mirrorTop + 10, height: scene.mirrorBottom - scene.mirrorTop - 20, left: -170, width: 340}),
});
export function eyeView(y) {
  const camera = eyeCamera(y);
  return {camera, frame: planeQuad(camera, EYE_PLANES.frame), glass: planeQuad(camera, EYE_PLANES.glass),
    front: planeQuad(camera, EYE_PLANES.front), rear: planeQuad(camera, EYE_PLANES.rear),
    nose: projectPoint(camera, camera.target)};
}
