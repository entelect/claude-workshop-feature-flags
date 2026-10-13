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

export function evaluate(flag, userId) {
  if (!flag || !flag.enabled) return false;
  return isUserInRollout(userId, flag.rolloutPercent);
}
