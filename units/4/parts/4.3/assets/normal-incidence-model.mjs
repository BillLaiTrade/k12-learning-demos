import { speedKmPerSecond } from './light-speed-model.mjs';
export { speedKmPerSecond };

// A model route, not the physical size of the pictured apparatus. One second
// of unpaused playback is one second calculated from the representative speeds.
export const layout = Object.freeze({ width:1536, height:1024, source:240, boundary:484, end:728, axes:[350,768,1184] });
export const media = Object.freeze(['air','water','glass']);
export const distanceKm = 1_500_000;
export const airDistanceKm = distanceKm*(layout.boundary-layout.source)/(layout.end-layout.source);
export const mediumDistanceKm = distanceKm-airDistanceKm;
export const airRate = speedKmPerSecond('air')/1000*(layout.end-layout.source)/distanceKm;
export const boundaryMs = airDistanceKm/speedKmPerSecond('air')*1000;
export const arrivalMs = medium => medium==='air' ? distanceKm/speedKmPerSecond('air')*1000 : boundaryMs+mediumDistanceKm/speedKmPerSecond(medium)*1000;
export const comparisonMs = arrivalMs('air');
export const durationMs = arrivalMs('glass');
export function snapshot(elapsed) {
  const time = Math.max(0,Number.isFinite(elapsed)?elapsed:0);
  return media.map((medium,i)=>{
    const arrived=time>=arrivalMs(medium);
    const traveledKm=arrived?distanceKm:Math.min(distanceKm,medium==='air'||time<=boundaryMs ? speedKmPerSecond('air')*time/1000 : airDistanceKm+speedKmPerSecond(medium)*(time-boundaryMs)/1000);
    const y=layout.source+(layout.end-layout.source)*traveledKm/distanceKm;
    return {medium,x:layout.axes[i],y,traveledKm,entered:medium!=='air'&&time>=boundaryMs,arrived};
  });
}
