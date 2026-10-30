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
export function judge({depth, reason, record, echo: answer}) {
  if (depth === '' || depth == null || !reason || !record || !answer) return {result: 'incomplete', message: '還沒填完：請填距離，並完成三項判讀。'};
  const errors = [];
  if (!Number.isFinite(Number(depth)) || Math.abs(Number(depth) - 150) > .01) errors.push('1500 × 0.20＝300m是往返總路程；探頭到海底只有一半，為150m。');
  if (reason !== 'roundtrip') errors.push('0.20s從發射計到接收，包括去程與回程，所以要除以二。');
  if (record !== 'b') errors.push('紀錄B保留直接聲，後續反射較弱，較少拖尾干擾。');
  if (answer !== 'overlap') errors.push('反射聲可能密集重疊；沒有清楚第二聲不代表沒有反射。');
  return errors.length ? {result: 'wrong', message: errors.join(' ')} : {result: 'correct', message: '判讀正確！探頭到海底150m；紀錄B的反射拖尾較弱。回聲能提供距離資訊，室內反射也可能干擾聆聽。'};
}
