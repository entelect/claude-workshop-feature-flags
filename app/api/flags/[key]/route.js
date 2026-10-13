import { FLAGS } from '../../../../lib/flags.js';
import { evaluate } from '../../../../lib/evaluate.js';

export async function GET(request, { params }) {
  // Next 15+ passes params as a Promise; reading it synchronously gives undefined.
  const { key } = await params;
  const { searchParams } = new URL(request.url);
  const env = searchParams.get('env') || 'prod';
  const userId = searchParams.get('userId');

  const flag = FLAGS.find((f) => f.key === key && f.env === env);

  if (!flag) {
    return Response.json({ error: `flag '${key}' not found in ${env}` }, { status: 404 });
  }

  const body = { flag };
  if (userId) {
    body.enabled = evaluate(flag, userId);
    body.userId = userId;
  }

  return Response.json(body);
}
