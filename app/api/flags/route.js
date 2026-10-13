import { FLAGS } from '../../../lib/flags.js';

const ENVS = ['dev', 'staging', 'prod'];

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const env = searchParams.get('env');

  if (env && !ENVS.includes(env)) {
    return Response.json({ error: `env must be one of ${ENVS.join(', ')}` }, { status: 400 });
  }

  const flags = env ? FLAGS.filter((f) => f.env === env) : FLAGS;

  return Response.json({ flags, count: flags.length });
}
