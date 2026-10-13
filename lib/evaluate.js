// Deterministic per-user bucketing. Same user + same flag = same answer,
// every time, across every server. No state, no DB round-trip.

function simpleHash(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(hash);
}

export function isUserInRollout(userId, rolloutPercent) {
  if (rolloutPercent <= 0) return false;
  if (rolloutPercent >= 100) return true;
  const hash = simpleHash(userId);
  return (hash % 100) < rolloutPercent;
}

// Gradual ramps: an optional flag.ramp = { to, step, intervalMinutes, startAt }
// raises rolloutPercent by `step` every interval, capped at `to`. The current
// percent is computed on read, so no scheduler or extra state is needed.

const MINUTE = 60 * 1000;

export function effectivePercent(flag, now = Date.now()) {
  const { ramp, rolloutPercent } = flag;
  if (!ramp) return rolloutPercent;
  const elapsed = now - Date.parse(ramp.startAt);
  if (elapsed < 0) return rolloutPercent;
  const steps = Math.floor(elapsed / (ramp.intervalMinutes * MINUTE));
  return Math.min(ramp.to, rolloutPercent + steps * ramp.step);
}

const isWhole = (n) => Number.isInteger(n);

export function validateRamp(flag, ramp) {
  if (!ramp || typeof ramp !== 'object') return 'ramp must be an object';
  const { to, step, intervalMinutes, startAt } = ramp;
  if (!isWhole(to) || to > 100) return 'to must be a whole number up to 100';
  if (to <= flag.rolloutPercent) return `to must be above the current ${flag.rolloutPercent}% (ramps only go up)`;
  if (!isWhole(step) || step < 1 || step > 100) return 'step must be a whole number from 1 to 100';
  if (!isWhole(intervalMinutes) || intervalMinutes < 1) return 'intervalMinutes must be a positive whole number';
  if (typeof startAt !== 'string' || Number.isNaN(Date.parse(startAt))) return 'startAt must be an ISO date';
  return null;
}

export function rampSchedule(flag) {
  const { ramp, rolloutPercent } = flag;
  if (!ramp) return [{ at: new Date().toISOString(), percent: rolloutPercent }];
  const start = Date.parse(ramp.startAt);
  const schedule = [];
  for (let i = 0; ; i++) {
    const percent = Math.min(ramp.to, rolloutPercent + i * ramp.step);
    schedule.push({ at: new Date(start + i * ramp.intervalMinutes * MINUTE).toISOString(), percent });
    if (percent >= ramp.to) return schedule;
  }
}

export function evaluate(flag, userId, now = Date.now()) {
  if (!flag || !flag.enabled) return false;
  return isUserInRollout(userId, effectivePercent(flag, now));
}
