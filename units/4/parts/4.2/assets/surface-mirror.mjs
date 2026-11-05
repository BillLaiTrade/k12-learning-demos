import * as THREE from '../../4.1/assets/vendor/three/build/three.module.js';

// A finite plane mirror: reflect the actual camera, clip geometry below the
// mirror, then project the resulting HDR scene onto the physical mirror area.
// No direct-light BRDF highlight is added to this surface.
export function createSurfaceMirror(center, width, depth) {
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -center.y);
  const reflectionCamera = new THREE.OrthographicCamera();
  const target = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: true
  });
  const textureMatrix = new THREE.Matrix4();
  const bias = new THREE.Matrix4().set(.5,0,0,.5, 0,.5,0,.5, 0,0,.5,.5, 0,0,0,1);
  const material = new THREE.ShaderMaterial({
    uniforms: { reflection: { value: target.texture }, textureMatrix: { value: textureMatrix }, reflectance: { value: .92 } },
    vertexShader: `
      uniform mat4 textureMatrix;
      varying vec4 reflectionUv;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        reflectionUv = textureMatrix * world;
        gl_Position = projectionMatrix * viewMatrix * world;
      }`,
    fragmentShader: `
      uniform sampler2D reflection;
      uniform float reflectance;
      varying vec4 reflectionUv;
      void main() {
        gl_FragColor = vec4(texture2DProj(reflection, reflectionUv).rgb * reflectance, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  const surface = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
  surface.rotation.x = -Math.PI / 2;
  surface.position.copy(center);
  // Offset only the rasterized face to avoid z-fighting with its backing.
  surface.position.y += .0001;
  const worldDirection = new THREE.Vector3(), reflectedLook = new THREE.Vector3(), size = new THREE.Vector2();
  const reflectPoint = point => plane.projectPoint(point, new THREE.Vector3()).multiplyScalar(2).sub(point);
  const update = (renderer, scene, camera) => {
    camera.updateMatrixWorld();
    reflectionCamera.copy(camera, false);
    reflectionCamera.position.copy(reflectPoint(camera.getWorldPosition(new THREE.Vector3())));
    camera.getWorldDirection(worldDirection);
    reflectedLook.copy(camera.position).add(worldDirection);
    reflectedLook.copy(reflectPoint(reflectedLook));
    reflectionCamera.up.copy(camera.up).reflect(plane.normal);
    reflectionCamera.lookAt(reflectedLook);
    reflectionCamera.updateMatrixWorld();
    textureMatrix.copy(bias).multiply(reflectionCamera.projectionMatrix).multiply(reflectionCamera.matrixWorldInverse);
    renderer.getDrawingBufferSize(size);
    // One extra pass, capped independently of device pixel ratio.
    const scale = Math.min(1, 1200 / size.x, 900 / size.y);
    const w = Math.max(1, Math.round(size.x * scale)), h = Math.max(1, Math.round(size.y * scale));
    if (target.width !== w || target.height !== h) target.setSize(w, h);
    const previousTarget = renderer.getRenderTarget(), previousClips = renderer.clippingPlanes;
    const visible = surface.visible;
    try {
      surface.visible = false;
      renderer.clippingPlanes = [plane];
      renderer.setRenderTarget(target);
      renderer.clear();
      renderer.render(scene, reflectionCamera);
    } finally {
      surface.visible = visible;
      renderer.clippingPlanes = previousClips;
      renderer.setRenderTarget(previousTarget);
    }
  };
  return { surface, plane, camera: reflectionCamera, target, textureMatrix, update,
    dispose() { target.dispose(); surface.geometry.dispose(); material.dispose(); } };
}

// The emitting aperture follows the same angular beam profile as its spotlight.
// This is evaluated from the active camera, including the reflected camera.
export function directApertureEmission(material, axis, angle, penumbra) {
  material.onBeforeCompile = shader => {
    shader.uniforms.apertureAxis = { value: axis.clone().normalize() };
    shader.uniforms.apertureOuter = { value: Math.cos(angle) };
    shader.uniforms.apertureInner = { value: Math.cos(angle * (1 - penumbra)) };
    shader.fragmentShader = 'uniform vec3 apertureAxis;\nuniform float apertureOuter;\nuniform float apertureInner;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', `
      #include <emissivemap_fragment>
      vec3 apertureView = isOrthographic ? vec3(0.0, 0.0, 1.0) : normalize(vViewPosition);
      vec3 axisInView = normalize(mat3(viewMatrix) * apertureAxis);
      totalEmissiveRadiance *= smoothstep(apertureOuter, apertureInner, dot(axisInView, apertureView));
    `);
  };
  material.customProgramCacheKey = () => 'directional-aperture-v1';
}
