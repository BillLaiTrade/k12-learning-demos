// Qualitative thermal RC network; coefficients are teaching parameters, not measured properties.
export const ROOM_C = 25;
export const HEATER_C = 90;
const SEGMENTS = 7;
export function initialConduction() { return Array(SEGMENTS + 2).fill(ROOM_C); }

export function conductionRates(temperatures, material) {
  const wood = material === 'wood';
  const conductance = wood ? .12 : .8;
  const capacities = [12, 2, ...Array(SEGMENTS).fill(wood ? .2 : .5)];
  const power = temperatures.map((t, i) => -(i === 0 ? .02 : i === 1 ? .06 : .08) * (t - ROOM_C));
  power[0] += HEATER_C - temperatures[0];
  for (let i = 0; i < temperatures.length - 1; i++) {
    const flux = (i === 0 ? .35 : conductance) * (temperatures[i] - temperatures[i + 1]);
    power[i] -= flux;
    power[i + 1] += flux;
  }
  return power.map((p, i) => p / capacities[i]);
}

export function advanceConduction(temperatures, material, seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return temperatures.slice();
  const steps = Math.ceil(seconds / .025), dt = seconds / steps;
  let values = temperatures.slice();
  for (let i = 0; i < steps; i++) {
    const rates = conductionRates(values, material);
    values = values.map((v, j) => v + rates[j] * dt);
  }
  return values;
}

export function conductionSample(temperatures, material) {
  return {
    body: temperatures[0], joint: temperatures[1], tip: temperatures.at(-1),
    steady: Math.max(...conductionRates(temperatures, material).map(Math.abs)) < .002,
    jointFlux: .35 * (temperatures[0] - temperatures[1]),
  };
}
