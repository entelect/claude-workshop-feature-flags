import { test } from 'node:test';
import assert from 'node:assert';
import { isUserInRollout, evaluate } from '../lib/evaluate.js';

const users = Array.from({ length: 10000 }, (_, i) => `user-${i}`);
const share = (percent) =>
  users.filter((u) => isUserInRollout(u, percent)).length / users.length * 100;

test('above 100% includes all users', () => {
  for (const u of users) assert.strictEqual(isUserInRollout(u, 150), true);
});

test('negative rollout excludes all users', () => {
  for (const u of users) assert.strictEqual(isUserInRollout(u, -5), false);
});

test('1% and 99% are partial, not all-or-nothing', () => {
  // Guards the boundaries next to the 0% and 100% short-circuits.
  assert.ok(share(1) > 0 && share(1) < 5, `1% rollout gave ${share(1)}%`);
  assert.ok(share(99) > 95 && share(99) < 100, `99% rollout gave ${share(99)}%`);
});

test('rollout share tracks the requested percent', () => {
  for (const p of [10, 25, 50, 75]) {
    assert.ok(Math.abs(share(p) - p) < 2, `${p}% rollout gave ${share(p)}%`);
  }
});

test('raising the rollout never removes a user', () => {
  // A user included at p% must still be included at p+1%, up to and including 100%.
  for (const u of users.slice(0, 1000)) {
    for (let p = 0; p < 100; p++) {
      if (isUserInRollout(u, p)) {
        assert.strictEqual(isUserInRollout(u, p + 1), true, `${u} dropped going ${p}% -> ${p + 1}%`);
      }
    }
  }
});

test('enabled flag at 100% includes every user', () => {
  const flag = { key: 'f', enabled: true, rolloutPercent: 100 };
  for (const u of users) assert.strictEqual(evaluate(flag, u), true);
});

test('missing flag returns false', () => {
  assert.strictEqual(evaluate(undefined, 'anyone'), false);
  assert.strictEqual(evaluate(null, 'anyone'), false);
});
