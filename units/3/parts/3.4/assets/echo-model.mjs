// Distances and times use metres and seconds. All gains below are teaching values.
export function echo(distance, speed) {
  if (!Number.isFinite(distance) || distance < 0 || !Number.isFinite(speed) || speed <= 0) throw new RangeError('Invalid distance or sound speed');
  return {distance, speed, total: 2 * distance, time: 2 * distance / speed};
}
export function distanceFromEcho(time, speed) {
  if (!Number.isFinite(time) || time < 0) throw new RangeError('Invalid echo time');
  return echo(time * speed / 2, speed);
}
export function wavePosition(progress) {
  const p = Math.max(0, Math.min(1, progress));
  return {fraction: p <= .5 ? p * 2 : 2 * (1 - p), stage: p < .5 ? 'outbound' : p < 1 ? 'returning' : 'received'};
}
export function arrivals(mode = 'dense', treated = false) {
  if (mode === 'single') return [{delay: 0, gain: 1}, {delay: .65, gain: .55}];
  const delays = [0, .07, .13, .21, .31, .44, .59, .77, .98, 1.22];
  return delays.map((delay, i) => ({delay, gain: i === 0 ? 1 : .62 * Math.exp(-i * (treated ? .65 : .22))}));
}
