import { test, afterEach } from 'node:test';
import assert from 'node:assert';
import { FLAGS } from '../lib/flags.js';
import { GET as listFlags } from '../app/api/flags/route.js';
import { GET as getFlag } from '../app/api/flags/[key]/route.js';
import { POST as rollout } from '../app/api/rollout/route.js';

// Route handlers mutate the shared in-memory FLAGS; restore after each test.
const original = FLAGS.map((f) => ({ ...f }));
afterEach(() => FLAGS.forEach((f, i) => {
  for (const k of Object.keys(f)) if (!(k in original[i])) delete f[k];
  Object.assign(f, original[i]);
}));

const HOUR = 60 * 60 * 1000;
const flagAt = (key, env) => FLAGS.find((f) => f.key === key && f.env === env);
// A ramp that started `hoursAgo` hours ago, stepping `step`% per hour.
const rampFrom = (hoursAgo, to, step = 10) => ({
  to, step, intervalMinutes: 60, startAt: new Date(Date.now() - hoursAgo * HOUR).toISOString(),
});

const post = (body) =>
  rollout(new Request('http://x/api/rollout', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }));
const percentOf = (key, env) => FLAGS.find((f) => f.key === key && f.env === env).rolloutPercent;

test('GET /api/flags filters by env and rejects unknown env', async () => {
  const res = await listFlags(new Request('http://x/api/flags?env=prod'));
  const body = await res.json();
  assert.strictEqual(res.status, 200);
  assert.ok(body.count > 0 && body.flags.every((f) => f.env === 'prod'));

  const bad = await listFlags(new Request('http://x/api/flags?env=qa'));
  assert.strictEqual(bad.status, 400);
});

test('GET /api/flags/[key] resolves async params and evaluates a user', async () => {
  const res = await getFlag(
    new Request('http://x/api/flags/dark-mode?env=prod&userId=alice'),
    { params: Promise.resolve({ key: 'dark-mode' }) }
  );
  const body = await res.json();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(body.flag.key, 'dark-mode');
  assert.strictEqual(body.enabled, true); // prod dark-mode is at 100%
});

test('GET /api/flags/[key] returns 404 for an unknown flag', async () => {
  const res = await getFlag(new Request('http://x/api/flags/nope'), {
    params: Promise.resolve({ key: 'nope' }),
  });
  assert.strictEqual(res.status, 404);
});

test('POST /api/rollout rejects malformed input with 400', async () => {
  assert.strictEqual((await post('{not json')).status, 400);
  assert.strictEqual((await post({ percent: 10 })).status, 400);
  assert.strictEqual((await post({ key: 'beta-search', percent: 10, env: 'qa' })).status, 400);
  assert.strictEqual((await post({ key: 'beta-search', percent: 101 })).status, 400);
  assert.strictEqual((await post({ key: 'beta-search', percent: '10' })).status, 400);
});

test('POST /api/rollout returns 404 for an unknown flag', async () => {
  assert.strictEqual((await post({ key: 'nope', percent: 10 })).status, 404);
});

test('POST /api/rollout refuses to raise prod above staging', async () => {
  // beta-search: staging 25%, prod 10%
  const res = await post({ key: 'beta-search', percent: 80 });
  assert.strictEqual(res.status, 409);
  assert.strictEqual(percentOf('beta-search', 'prod'), 10);
});

test('POST /api/rollout allows prod up to staging, and rollbacks without staging', async () => {
  const up = await post({ key: 'beta-search', percent: 25 });
  assert.strictEqual(up.status, 200);
  assert.deepStrictEqual((await up.json()).change, { from: 10, to: 25 });

  // legacy-export has no staging entry: raising is refused, lowering is allowed.
  assert.strictEqual((await post({ key: 'legacy-export', percent: 60 })).status, 409);
  assert.strictEqual((await post({ key: 'legacy-export', percent: 20 })).status, 200);
  assert.strictEqual(percentOf('legacy-export', 'prod'), 20);
});

test('POST /api/rollout does not apply the staging check outside prod', async () => {
  assert.strictEqual((await post({ key: 'beta-search', percent: 90, env: 'staging' })).status, 200);
});

test('GET /api/flags and /api/flags/[key] include effectivePercent', async () => {
  flagAt('beta-search', 'staging').ramp = rampFrom(2.5, 100); // 25 + 2 steps of 10

  const list = await (await listFlags(new Request('http://x/api/flags?env=staging'))).json();
  const listed = list.flags.find((f) => f.key === 'beta-search');
  assert.strictEqual(listed.rolloutPercent, 25);
  assert.strictEqual(listed.effectivePercent, 45);
  assert.strictEqual(list.flags.find((f) => f.key === 'dark-mode').effectivePercent, 100);

  const one = await (await getFlag(
    new Request('http://x/api/flags/beta-search?env=staging'),
    { params: Promise.resolve({ key: 'beta-search' }) }
  )).json();
  assert.strictEqual(one.flag.effectivePercent, 45);
});

test('POST /api/rollout caps prod at staging\'s current ramped percent', async () => {
  flagAt('beta-search', 'staging').ramp = rampFrom(2.5, 100); // staging now effectively 45%
  assert.strictEqual((await post({ key: 'beta-search', percent: 45 })).status, 200);
  assert.strictEqual((await post({ key: 'beta-search', percent: 55 })).status, 409);
});

test('POST /api/rollout on a ramping flag cancels the ramp and reports the current percent', async () => {
  const staging = flagAt('beta-search', 'staging');
  staging.ramp = rampFrom(2.5, 100); // effectively 45%
  const res = await post({ key: 'beta-search', percent: 60, env: 'staging' });
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual((await res.json()).change, { from: 45, to: 60 });
  assert.strictEqual(staging.ramp, undefined);
  assert.strictEqual(staging.rolloutPercent, 60);
});
