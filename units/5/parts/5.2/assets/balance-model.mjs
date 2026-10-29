// Equal masses of the same material; heat exchange with the exterior is ignored.
export const CONTACT_SECONDS = 0.7;
export const EQUILIBRIUM_SECONDS = CONTACT_SECONDS + Math.log(20 / 0.05) / 0.24;

export function balanceState(mode, elapsed = 0) {
  const time = Math.max(0, Number.isFinite(elapsed) ? elapsed : 0);
  const contact = Math.min(1, time / CONTACT_SECONDS);
  const ease = contact * contact * (3 - 2 * contact);
  const touching = contact === 1;
  const thermalTime = Math.max(0, time - CONTACT_SECONDS);
  const difference = mode === 'same' ? 0 : 20 * Math.exp(-0.24 * thermalTime);
  const complete = touching && (mode === 'same' || time >= EQUILIBRIUM_SECONDS);
  const halfDifference = complete ? 0 : difference;
  return {
    a: 40 + halfDifference,
    b: 40 - halfDifference,
    gap: 28 * (1 - ease),
    touching,
    complete,
    thermalTime,
    flow: touching && !complete && mode !== 'same',
    flowStrength: 0.25 + 0.75 * halfDifference / 20,
  };
}
