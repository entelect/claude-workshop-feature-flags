# flag-service

## Running tests
- `npm test` runs `node --test` over `test/`. No install or build needed; tests import `lib/` directly.
- `npm run check` syntax-checks the lib, API routes and MCP server.
- `npm install` is only needed for the MCP server (`npm run mcp`) and `npm run dev`.

## Flag structure
Flags are a static array in `lib/flags.js`, one entry per key per env:
- `key`: identifier; the same key usually exists in several envs
- `env`: `dev` | `staging` | `prod`
- `enabled`: kill switch; when false the flag is off regardless of `rolloutPercent`
- `rolloutPercent`: 0–100; 0 is nobody, 100 is everyone
- `description`, `owner`: free text and owning team slug

`lib/evaluate.js` hashes the userId into a bucket 0–99 and includes the user if
bucket < `rolloutPercent`. `POST /api/rollout` changes a % in memory only (lost on restart).

## Never
- Never bump a prod flag's `rolloutPercent` without `npm test` passing first.
- Never raise a prod flag above its staging %; prove it in staging first.
- Never edit percentages in `lib/flags.js` by hand; only the `/rollout` skill (tests first) may.
- Never edit tests to make them pass; fix the code.
- Never change the hash or modulus in `lib/evaluate.js` casually; it reassigns users on live rollouts.
