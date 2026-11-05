// Screen coordinates: x points right, y points down. Surface relief is enlarged.
// Each representative incident ray meets its own local planar facet.
export const INCIDENT_DIRECTION = Object.freeze([.6, .8]);
const FLAT = [[40,150],[145,150],[195,150],[260,150],[310,150],[375,150],[425,150],[520,150]];
const ROUGH = [[40,154],[115,148],[145,155.5],[195,146.5],[235,153],[260,150],[310,150],[345,156],[375,146.5],[425,155.5],[520,150]];
export function surfaceDiagram(kind) {
  if (kind !== 'smooth' && kind !== 'rough') throw new RangeError('Unknown surface');
  const profile = (kind === 'smooth' ? FLAT : ROUGH).map(p => [...p]);
  const rays = [170,285,400].map(x => {
    const i = profile.findIndex((p,j) => j < profile.length-1 && p[0] <= x && x < profile[j+1][0]);
    const a = profile[i], b = profile[i+1];
    const dx = b[0]-a[0], dy = b[1]-a[1], length = Math.hypot(dx,dy);
    const normal = [dy/length,-dx/length];
    const hit = [x,a[1]+(x-a[0])*dy/dx];
    const dot = INCIDENT_DIRECTION[0]*normal[0]+INCIDENT_DIRECTION[1]*normal[1];
    const reflected = INCIDENT_DIRECTION.map((v,j) => v-2*dot*normal[j]);
    return { hit, normal, incident:[...INCIDENT_DIRECTION], reflected,
      start:hit.map((v,j) => v-150*INCIDENT_DIRECTION[j]),
      end:hit.map((v,j) => v+150*reflected[j]) };
  });
  return {kind,profile,rays};
}
