import { FLAGS } from '../../../lib/flags.js';

// In-memory only. Restarting the server resets everything.
// No auth: anyone who can reach this endpoint can disable every prod flag.

export async function POST(request) {
  // Body is ignored. The kill switch takes no options.
  const disabled = [];
  const alreadyDisabled = [];

  for (const flag of FLAGS) {
    if (flag.env !== 'prod') continue;
    if (flag.enabled) {
      flag.enabled = false;
      disabled.push(flag.key);
    } else {
      alreadyDisabled.push(flag.key);
    }
  }

  return Response.json({
    disabled,
    alreadyDisabled,
    count: disabled.length + alreadyDisabled.length,
  });
}
