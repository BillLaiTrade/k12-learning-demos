import {PROBE_Y, MAX_DEPTH, DEPTH_HEIGHT} from './sonar-terrain.mjs?v=20261031-landforms';
// Only completed measurements are available to this reconstruction.
// Do not sample the ground-truth terrain between measurements.
export function surveyProfile(records) {
 const positions = new Map();
 for (const record of records) if (record.done) positions.set(record.x, record);
 return [...positions.values()].sort((a,b)=>a.x-b.x).map(record=>({
   x: record.x, y: PROBE_Y+record.depth/MAX_DEPTH*DEPTH_HEIGHT, name: record.name
 }));
}
