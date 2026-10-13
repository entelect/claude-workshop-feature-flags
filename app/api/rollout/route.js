import { FLAGS } from '../../../lib/flags.js';

// In-memory only. Restarting the server resets everything.
// A real flag service would persist to a DB and emit an audit event.

const ENVS = ['dev', 'staging', 'prod'];

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'request body must be valid JSON' }, { status: 400 });
  }
  const { key, percent, env = 'prod' } = body ?? {};

  if (typeof key !== 'string' || key === '') {
    return Response.json({ error: 'key must be a non-empty string' }, { status: 400 });
  }
  if (!ENVS.includes(env)) {
    return Response.json({ error: `env must be one of ${ENVS.join(', ')}` }, { status: 400 });
  }
  if (typeof percent !== 'number' || percent < 0 || percent > 100) {
    return Response.json({ error: 'percent must be a number between 0 and 100' }, { status: 400 });
  }

  const flag = FLAGS.find((f) => f.key === key && f.env === env);
  if (!flag) {
    return Response.json({ error: `flag '${key}' not found in ${env}` }, { status: 404 });
  }

  // Prove it in staging first: prod may never be raised above the staging rollout.
  // Lowering prod (a rollback) is always allowed.
  if (env === 'prod' && percent > flag.rolloutPercent) {
    const staging = FLAGS.find((f) => f.key === key && f.env === 'staging');
    const stagingPercent = staging?.enabled ? staging.rolloutPercent : 0;
    if (percent > stagingPercent) {
      return Response.json(
        { error: `prod cannot exceed staging (${stagingPercent}%) for '${key}'` },
        { status: 409 }
      );
    }
  }

  const previous = flag.rolloutPercent;
  flag.rolloutPercent = percent;

  return Response.json({
    flag,
    change: { from: previous, to: percent },
  });
}
