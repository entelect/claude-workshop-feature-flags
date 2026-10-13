import { test } from 'node:test';
import assert from 'node:assert';
import { FLAGS } from '../lib/flags.js';
import { evaluate, effectivePercent, validateRamp, rampSchedule } from '../lib/evaluate.js';

const HOUR = 60 * 60 * 1000;
const START = Date.parse('2026-10-13T12:00:00Z');
const ramped = (overrides = {}) => ({
  key: 'f',
  env: 'staging',
  enabled: true,
  rolloutPercent: 25,
  ramp: { to: 100, step: 10, intervalMinutes: 60, startAt: '2026-10-13T12:00:00Z', ...overrides },
});

test('flag without a ramp uses rolloutPercent', () => {
  assert.strictEqual(effectivePercent({ rolloutPercent: 40 }, START), 40);
});

test('flags without a ramp are unchanged (no migration needed); any scheduled ramp is valid', () => {
  for (const flag of FLAGS) {
    if (flag.ramp) {
      assert.strictEqual(validateRamp(flag, flag.ramp), null, `${flag.key}/${flag.env} has an invalid ramp`);
    } else {
      assert.strictEqual(effectivePercent(flag), flag.rolloutPercent);
    }
  }
});

test('before startAt the ramp has not begun', () => {
  assert.strictEqual(effectivePercent(ramped(), START - 1), 25);
});

test('at startAt the flag is at its starting percent', () => {
  assert.strictEqual(effectivePercent(ramped(), START), 25);
});

test('steps happen exactly on interval boundaries', () => {
  assert.strictEqual(effectivePercent(ramped(), START + HOUR - 1), 25);
  assert.strictEqual(effectivePercent(ramped(), START + HOUR), 35);
  assert.strictEqual(effectivePercent(ramped(), START + 3 * HOUR + 30 * 60 * 1000), 55);
});

test('the final step is capped at the target, never overshooting', () => {
  // 25 -> 95 after 7 steps; the 8th step would be 105 but caps at 100.
  assert.strictEqual(effectivePercent(ramped(), START + 7 * HOUR), 95);
  assert.strictEqual(effectivePercent(ramped(), START + 8 * HOUR), 100);
});

test('long after the ramp ends it stays at the target', () => {
  assert.strictEqual(effectivePercent(ramped({ to: 60 }), START + 1000 * HOUR), 60);
});

test('evaluate uses the ramped percent at the given time', () => {
  const flag = ramped();
  const users = Array.from({ length: 2000 }, (_, i) => `user-${i}`);
  const share = (now) => users.filter((u) => evaluate(flag, u, now)).length / users.length * 100;
  assert.ok(Math.abs(share(START) - 25) < 4, `start share ${share(START)}`);
  assert.ok(Math.abs(share(START + 3 * HOUR) - 55) < 4, `3h share ${share(START + 3 * HOUR)}`);
  assert.ok(users.every((u) => evaluate(flag, u, START + 8 * HOUR)), 'everyone in at 100%');
});

test('a disabled flag stays off even while its ramp advances', () => {
  assert.strictEqual(evaluate({ ...ramped(), enabled: false }, 'alice', START + 8 * HOUR), false);
});

test('users are never dropped as the ramp advances', () => {
  const flag = ramped({ to: 100, step: 5 });
  for (let i = 0; i < 500; i++) {
    const u = `user-${i}`;
    let wasIn = false;
    for (let h = 0; h <= 16; h++) {
      const isIn = evaluate(flag, u, START + h * HOUR);
      assert.ok(!(wasIn && !isIn), `${u} dropped at hour ${h}`);
      wasIn = isIn;
    }
  }
});

test('validateRamp accepts a valid ramp', () => {
  assert.strictEqual(validateRamp({ rolloutPercent: 25 }, ramped().ramp), null);
});

test('validateRamp rejects invalid ramps', () => {
  const flag = { rolloutPercent: 25 };
  const base = ramped().ramp;
  const bad = [
    { ...base, to: 25 },          // not above current
    { ...base, to: 10 },          // ramps only go up
    { ...base, to: 101 },         // above 100
    { ...base, to: 50.5 },        // not whole
    { ...base, step: 0 },
    { ...base, step: 101 },
    { ...base, step: 2.5 },
    { ...base, intervalMinutes: 0 },
    { ...base, intervalMinutes: -60 },
    { ...base, intervalMinutes: 1.5 },
    { ...base, startAt: 'not a date' },
    { ...base, startAt: undefined },
  ];
  for (const ramp of bad) {
    const err = validateRamp(flag, ramp);
    assert.strictEqual(typeof err, 'string', `expected an error for ${JSON.stringify(ramp)}`);
  }
  assert.strictEqual(typeof validateRamp(flag, null), 'string');
});

test('rampSchedule lists each step up to and including the target', () => {
  const schedule = rampSchedule(ramped());
  assert.deepStrictEqual(
    schedule.map((s) => s.percent),
    [25, 35, 45, 55, 65, 75, 85, 95, 100]
  );
  assert.strictEqual(schedule[0].at, '2026-10-13T12:00:00.000Z');
  assert.strictEqual(schedule[8].at, '2026-10-13T20:00:00.000Z');
});

test('rampSchedule for a flag without a ramp is just its current percent', () => {
  assert.deepStrictEqual(rampSchedule({ rolloutPercent: 40 }).map((s) => s.percent), [40]);
});
