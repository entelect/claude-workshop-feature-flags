import { test, afterEach } from 'node:test';
import assert from 'node:assert';
import { FLAGS } from '../lib/flags.js';
import { evaluate } from '../lib/evaluate.js';
import { POST as killswitch } from '../app/api/killswitch/route.js';

// Route handlers mutate the shared in-memory FLAGS; restore after each test.
const original = FLAGS.map((f) => ({ ...f }));
afterEach(() => FLAGS.forEach((f, i) => Object.assign(f, original[i])));

const post = (body) =>
  killswitch(new Request('http://x/api/killswitch', { method: 'POST', body }));
const prodKeys = () => FLAGS.filter((f) => f.env === 'prod').map((f) => f.key);

test('POST /api/killswitch disables every prod flag and lists them in FLAGS order', async () => {
  const res = await post();
  const body = await res.json();
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(body, { disabled: prodKeys(), alreadyDisabled: [], count: prodKeys().length });
  assert.ok(FLAGS.filter((f) => f.env === 'prod').every((f) => f.enabled === false));
});

test('POST /api/killswitch leaves dev/staging untouched and preserves prod rolloutPercent', async () => {
  await post();
  FLAGS.forEach((f, i) => {
    assert.strictEqual(f.rolloutPercent, original[i].rolloutPercent);
    if (f.env !== 'prod') assert.strictEqual(f.enabled, original[i].enabled);
  });
});

test('POST /api/killswitch is idempotent', async () => {
  const first = await (await post()).json();
  const second = await (await post()).json();
  assert.deepStrictEqual(second, { disabled: [], alreadyDisabled: prodKeys(), count: first.count });
});

test('POST /api/killswitch reports a prod flag that was already off as alreadyDisabled', async () => {
  const off = FLAGS.find((f) => f.env === 'prod' && f.key === 'legacy-export');
  off.enabled = false;
  const body = await (await post()).json();
  assert.deepStrictEqual(body.alreadyDisabled, ['legacy-export']);
  assert.deepStrictEqual(body.disabled, prodKeys().filter((k) => k !== 'legacy-export'));
  assert.strictEqual(body.count, prodKeys().length);
});

test('POST /api/killswitch ignores a non-JSON body; evaluate() is false for all prod flags', async () => {
  const res = await post('not json');
  assert.strictEqual(res.status, 200);
  for (const flag of FLAGS.filter((f) => f.env === 'prod')) {
    for (const userId of ['alice', 'bob', 'carol', 'user-42']) {
      assert.strictEqual(evaluate(flag, userId), false, `${flag.key} for ${userId}`);
    }
  }
});
