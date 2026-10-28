// 所有組別使用同一振動脈衝；只改變傳播延遲。
export const DISTANCE = 100;
export const START_X = 64;
export const END_X = 604;
export const FREQUENCY = 25;
export const PULSE_DURATION = .16;
export const AMPLITUDE = 5.5;
export const STEP = .002;
export const ZOOM = 4;
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const airSpeed = temperature => 331 + .6 * temperature;
export const arrivalTime = speed => DISTANCE / speed;

export function displacement(localTime) {
  if (localTime <= 0 || localTime >= PULSE_DURATION) return 0;
  return AMPLITUDE * Math.sin(2 * Math.PI * FREQUENCY * localTime)
    * Math.sin(Math.PI * localTime / PULSE_DURATION) ** 2;
}

export function conditions(mode, temperature = 30) {
  if (mode === 'temperature') return [
    { id: 'reference', kind: 'air', name: '20°C 參考組', description: '溫度固定', speed: airSpeed(20), temperature: 20 },
    { id: 'adjustable', kind: 'air', name: `${temperature}°C 設定組`, description: '溫度可調整', speed: airSpeed(temperature), temperature }
  ];
  return [
    { id: 'air', kind: 'air', name: '空氣', description: '粒子較分散', speed: 343 },
    { id: 'water', kind: 'water', name: '水', description: '粒子較密集', speed: 1480 },
    { id: 'steel', kind: 'steel', name: '鋼', description: '簡化晶格與彈性連結', speed: 5900 }
  ];
}

export const appearance = {
  air: { columns: 38, rows: 3, color: '#367b8e', radius: 2.5 },
  water: { columns: 62, rows: 5, color: '#286b7c', radius: 2 },
  steel: { columns: 42, rows: 4, color: '#53635d', radius: 2.7 }
};

export function positions(kind) {
  const { columns, rows } = appearance[kind];
  const points = [];
  for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
    const seed = Math.sin((column + 1) * 127.1 + (row + 1) * 311.7) * 43758.5453;
    const noise = kind === 'steel' ? 0 : 2 * (seed - Math.floor(seed)) - 1;
    const x = START_X + column / (columns - 1) * (END_X - START_X)
      + (column === 0 || column === columns - 1 ? 0 : noise * 1.1);
    points.push({
      x, y: 41 + row / (rows - 1) * 60 + noise * 1.8,
      distance: (x - START_X) / (END_X - START_X) * DISTANCE,
      row, column
    });
  }
  return points;
}

export function sample(point, speed, time) {
  const localTime = time - point.distance / speed;
  return {
    x: point.x + displacement(localTime), y: point.y,
    reached: time > 0 && localTime >= 0,
    moving: localTime > 0 && localTime < PULSE_DURATION
  };
}

export function runEnd(groups) {
  return Math.max(...groups.map(group => arrivalTime(group.speed))) + PULSE_DURATION + .01;
}

export function winners(groups) {
  const first = Math.min(...groups.map(group => arrivalTime(group.speed)));
  return groups.filter(group => Math.abs(arrivalTime(group.speed) - first) < 1e-10).map(group => group.id);
}
