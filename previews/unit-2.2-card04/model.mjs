// 所有組別使用同一振動脈衝；只改變傳播延遲。
export const DISTANCE = 1000;
export const START_X = 64;
export const END_X = 410;
export const FREQUENCY = 25;
export const PULSE_DURATION = .16;
export const AMPLITUDE = 4.2;
export const STEP = .02;
export const ZOOM = 5;
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const airSpeed = temperature => 331 + .6 * temperature;
export const arrivalTime = speed => DISTANCE / speed;
export const reachedDistance = (speed, time) => clamp(speed * time, 0, DISTANCE);

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
    { id: 'air', kind: 'air', name: '空氣', description: '氣體・分子分散', speed: 343 },
    { id: 'water', kind: 'water', name: '水', description: '液體・水分子密集', speed: 1480 },
    { id: 'steel', kind: 'steel', name: '鋼', description: '固體・原子彈性連結', speed: 5900 }
  ];
}

export const appearance = {
  air: { columns: 16, rows: 3 },
  water: { columns: 16, rows: 5 },
  steel: { columns: 20, rows: 4 }
};

export function positions(kind) {
  const { columns, rows } = appearance[kind];
  const points = [];
  for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
    const seed = Math.sin((column + 1) * 127.1 + (row + 1) * 311.7) * 43758.5453;
    const noise = kind === 'steel' ? 0 : 2 * (seed - Math.floor(seed)) - 1;
    const fraction = column / (columns - 1);
    const stagger = kind === 'water' ? Math.sin(Math.PI * fraction) * (row % 2 ? 6 : -6) : 0;
    const x = START_X + fraction * (END_X - START_X)
      + (column === 0 || column === columns - 1 ? 0 : noise * 1.1 + stagger);
    points.push({
      x, y: (kind === 'water' ? 45 : 41) + row / (rows - 1) * (kind === 'water' ? 54 : 60) + noise * (kind === 'air' ? 7 : 1.8),
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
