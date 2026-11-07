import * as THREE from '../../4.1/assets/vendor/three/build/three.module.js';

// Keep the compact silhouette; inset its color to leave a fine black edge.
export function directionArrow(color) {
  const points = [[0, 0.36], [-0.22, -0.23], [0, -0.10], [0.22, -0.23]].map(p => new THREE.Vector2(...p));
  const width = 0.018;
  const inset = points.map((point, index) => {
    const incoming = point.clone().sub(points[(index + points.length - 1) % points.length]).normalize();
    const outgoing = points[(index + 1) % points.length].clone().sub(point).normalize();
    const a = new THREE.Vector2(-incoming.y, incoming.x), b = new THREE.Vector2(-outgoing.y, outgoing.x);
    return point.clone().addScaledVector(a.clone().add(b), width / (1 + a.dot(b)));
  });
  const arrow = new THREE.Group();
  [[points, '#202622'], [inset, color]].forEach(([vertices, fill], index) => {
    const geometry = new THREE.ShapeGeometry(new THREE.Shape(vertices));
    geometry.rotateX(Math.PI / 2);
    // Beam tubes render in the transparent pass. Keep both arrow layers in
    // that pass too, so their higher renderOrder closes the tip over the beam.
    const layer = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
      color: fill, side: THREE.DoubleSide, transparent: true, opacity: 1, depthTest: false, depthWrite: false
    }));
    layer.renderOrder = 15 + index; layer.frustumCulled = false; arrow.add(layer);
  });
  return arrow;
}

