// Only accumulated contact time changes the temperatures in this teaching model.
export const EQUILIBRIUM_SECONDS = Math.log(20 / 0.05) / 0.24;
export const MIN_OFFSET = -90;
export const MAX_OFFSET = 110;
export const SNAP_DISTANCE = 5;

export function balanceState(mode, contactSeconds = 0) {
  const time = Math.max(0, Number.isFinite(contactSeconds) ? contactSeconds : 0);
  const difference = mode === 'same' ? 0 : 20 * Math.exp(-0.24 * time);
  const complete = mode === 'same' || time >= EQUILIBRIUM_SECONDS;
  const halfDifference = complete ? 0 : difference;
  return {
    a: 40 + halfDifference,
    b: 40 - halfDifference,
    complete,
    flowStrength: 0.25 + 0.75 * halfDifference / 20,
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
