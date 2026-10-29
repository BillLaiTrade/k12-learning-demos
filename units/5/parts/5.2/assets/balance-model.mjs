// Two equal lumped heat capacities in a fixed room; all rates are illustrative.
export const ROOM_C = 25;
export const ROOM_RATE = 0.04;
export const CONTACT_RATE = 0.24;
export const ROOM_TOLERANCE = 0.05;
export const PAIR_TOLERANCE = 0.15;
export const MIN_OFFSET = -90;
export const MAX_OFFSET = 110;
export const SNAP_DISTANCE = 5;

export function initialTemperatures() {
  return { a: 60, b: 20 };
}

function exchangeRate(gap) {
  // A small residual exchange across air approximates non-contact effects.
  // Direct contact is substantially stronger; no fluid/radiation solver is implied.
  return gap === 0 ? CONTACT_RATE : 0.0008 * Math.exp(-Math.max(0, gap) / 60);
}

export function advanceBalance(temperatures, gap, seconds) {
  const dt = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const mean = ROOM_C + ((temperatures.a + temperatures.b) / 2 - ROOM_C) * Math.exp(-ROOM_RATE * dt);
  const halfDifference = (temperatures.a - temperatures.b) / 2 * Math.exp(-(ROOM_RATE + 2 * exchangeRate(gap)) * dt);
  const next = { a: mean + halfDifference, b: mean - halfDifference };
  if (Math.max(Math.abs(next.a - ROOM_C), Math.abs(next.b - ROOM_C)) < ROOM_TOLERANCE) return { a: ROOM_C, b: ROOM_C };
  return next;
}

export function balanceState(temperatures, gap) {
  const difference = temperatures.a - temperatures.b;
  const rate = exchangeRate(gap);
  return {
    ...temperatures,
    complete: Math.max(Math.abs(temperatures.a - ROOM_C), Math.abs(temperatures.b - ROOM_C)) < ROOM_TOLERANCE,
    pairClose: Math.abs(difference) < PAIR_TOLERANCE,
    rateA: ROOM_RATE * (ROOM_C - temperatures.a) - rate * difference,
    rateB: ROOM_RATE * (ROOM_C - temperatures.b) + rate * difference,
    flowStrength: 0.25 + 0.75 * Math.min(1, Math.abs(difference) / 40),
  };
}

export function moveBlock(positions, side, requestedOffset) {
  const next = { ...positions };
  if (!Number.isFinite(requestedOffset)) return next;
  if (side === 'a') {
    next.a = Math.max(MIN_OFFSET, Math.min(next.b, requestedOffset));
    if (next.b - next.a <= SNAP_DISTANCE) next.a = next.b;
  } else if (side === 'b') {
    next.b = Math.min(MAX_OFFSET, Math.max(next.a, requestedOffset));
    if (next.b - next.a <= SNAP_DISTANCE) next.b = next.a;
  }
  return next;
}
