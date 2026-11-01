import {materials} from './optics.mjs';

// The agreed classroom approximation: air ~ 300,000 km/s, with representative
// water/glass indices. Distance is a model length, not the size of the apparatus.
export const distanceKm = 1_000_000;
export const airSpeedKmPerSecond = 300_000;
export const media = ['air', 'water', 'glass'];
export const speedKmPerSecond = key => airSpeedKmPerSecond / materials[key].n;
export const arrivalMs = key => distanceKm / speedKmPerSecond(key) * 1000;
export const durationMs = Math.max(...media.map(arrivalMs));
export function snapshot(elapsedMs) {
  const time = Math.max(0, Math.min(durationMs, elapsedMs));
  return media.map(key => {
    const traveledKm = Math.min(distanceKm, speedKmPerSecond(key) * time / 1000);
    return {key, traveledKm, progress: traveledKm / distanceKm, arrived: time >= arrivalMs(key)};
  });
}
