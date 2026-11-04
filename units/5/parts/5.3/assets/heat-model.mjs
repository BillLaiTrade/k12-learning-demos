// 吸收熱量以 cal、質量以 g、比熱以 cal/(g·°C) 表示。
// 固定比熱、無相變，忽略容器吸熱與向環境散熱。
export const MATERIALS = Object.freeze({
  water: { name: '水', c: 1, color: '#427e94' },
  aluminum: { name: '鋁', c: 0.22, color: '#b2693d' },
  iron: { name: '鐵', c: 0.11, color: '#b2693d' },
  copper: { name: '銅', c: 0.093, color: '#b2693d' },
});

export function temperature({ heat, mass, c, initial = 20 }) {
  if (![heat, mass, c, initial].every(Number.isFinite) || mass <= 0 || c <= 0) {
    throw new RangeError('熱量與溫度必須為有限值，質量與比熱須大於零。');
  }
  return initial + heat / (mass * c);
}

export function samplesFor(mode, setting) {
  if (mode === 'heat') return [{ name: '水', mass: 100, material: 'water', key: 'a' }];
  if (mode === 'mass') return [
    { name: 'A 杯水', mass: 100, material: 'water', key: 'a' },
    { name: 'B 杯水', mass: Number(setting), material: 'water', key: 'b' },
  ];
  if (mode === 'material' && MATERIALS[setting]) return [
    { name: '水', mass: 100, material: 'water', key: 'a' },
    { name: MATERIALS[setting].name, mass: 100, material: setting, key: 'b' },
  ];
  throw new RangeError('未知的實驗條件。');
}

export function reading(sample, heat) {
  const c = MATERIALS[sample.material].c;
  const end = temperature({ heat, mass: sample.mass, c });
  return { ...sample, c, temperature: end, rise: end - 20, heat };
}
