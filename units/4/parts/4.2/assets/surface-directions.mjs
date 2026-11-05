// Screen coordinates: x points right, y points down. Surface relief is enlarged.
// Each representative incident ray meets its own local planar facet.
export const INCIDENT_DIRECTION = Object.freeze([.6, .8]);
const FLAT = [[44,180],[160,180],[220,180],[288,180],[352,180],[420,180],[480,180],[596,180]];
const ROUGH = [[44,185],[118,175],[160,189],[220,171],[260,186],[288,180],[352,180],[390,190],[420,171],[480,189],[596,178]];
export function surfaceDiagram(kind) {
  if (kind !== 'smooth' && kind !== 'rough') throw new RangeError('Unknown surface');
  const profile = (kind === 'smooth' ? FLAT : ROUGH).map(p => [...p]);
  const rays = [190,320,450].map(x => {
    const i = profile.findIndex((p,j) => j < profile.length-1 && p[0] <= x && x < profile[j+1][0]);
    const a = profile[i], b = profile[i+1];
    const dx = b[0]-a[0], dy = b[1]-a[1], length = Math.hypot(dx,dy);
    const normal = [dy/length,-dx/length];
    const hit = [x,a[1]+(x-a[0])*dy/dx];
    const dot = INCIDENT_DIRECTION[0]*normal[0]+INCIDENT_DIRECTION[1]*normal[1];
    const reflected = INCIDENT_DIRECTION.map((v,j) => v-2*dot*normal[j]);
    return { hit, normal, incident:[...INCIDENT_DIRECTION], reflected,
      start:hit.map((v,j) => v-165*INCIDENT_DIRECTION[j]),
      end:hit.map((v,j) => v+165*reflected[j]) };
  });
  return {kind,profile,rays};
}
