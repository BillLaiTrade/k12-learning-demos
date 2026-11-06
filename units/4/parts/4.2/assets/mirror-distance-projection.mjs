// Fixed pinhole viewpoint looking horizontally toward a vertical plane mirror.
// The side-view bear is 72 SVG units high at 4 units/cm: 18 cm physically.
// Camera height and focal length place the table/mirror contact at y = 258.
export const FRONT_VIEW = Object.freeze({
  eyeToMirror: 150, eyeHeight: 200/7, focalLength: 840,
  horizonY: 98, centerX: 310, bearHeight: 18,
});

export function projectMirrorDistance(distance, view=FRONT_VIEW) {
  if(!Number.isFinite(distance)||distance<10||distance>60)throw new RangeError('距離須介於 10 到 60 公分');
  const project=depth=>{
    const scale=view.focalLength/depth;
    const size=view.bearHeight*scale;
    const ground=view.horizonY+view.eyeHeight*scale;
    return {depth,size,ground,top:ground-size};
  };
  // The image is the same physical size as the object and equally far behind
  // the mirror. Only the projection changes with distance from the viewer.
  return {object:project(view.eyeToMirror-distance),image:project(view.eyeToMirror+distance)};
}
