export const TEMPERATURES = Object.freeze([0, 10, 20, 30]);
export const MIN_DELAY = 2;
export const MAX_DELAY = 6;

// 核對答案採用題目提供的近似公式；聲速由學生自行代入氣溫計算。
export const referenceSpeed = temperature => 331 + .6 * temperature;
export const distanceFor = (speed, delay) => Math.round(speed * delay * 100) / 100;

export function createChallenge({ random = Math.random, previous = null } = {}) {
  const unit = () => Math.max(0, Math.min(1 - Number.EPSILON, random()));
  const temperature = TEMPERATURES[Math.floor(unit() * TEMPERATURES.length)];
  let delay = (200 + Math.floor(unit() * 401)) / 100;
  if (previous && temperature === previous.temperature && delay === previous.delay) {
    delay = delay === MAX_DELAY ? MIN_DELAY : Math.round((delay + .01) * 100) / 100;
  }
  const speed = referenceSpeed(temperature);
  return Object.freeze({
    temperature, speed, delay,
    distance: distanceFor(speed, delay),
    seed: Math.floor(unit() * 0xffffffff) || 1
  });
}

export function checkEstimate(value, challenge) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return 'invalid';
  // 這是估算題；接受整數四捨五入與約 1% 的合理估算。
  return Math.abs(value - challenge.distance) <= Math.max(2, challenge.distance * .01)
    ? 'correct' : 'incorrect';
}

export function seededRandom(seed) {
  let value = seed >>> 0 || 1;
  return () => {
    value ^= value << 13; value ^= value >>> 17; value ^= value << 5;
    return (value >>> 0) / 4294967296;
  };
}
