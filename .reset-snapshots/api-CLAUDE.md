# API routes

Route handlers for the flag service, on the Next.js App Router.

- Every error response is `{ "error": "<message>" }` with a 4xx or 5xx status.
  Never return 200 with an error in the body.
- `env` defaults to `prod` when the query or body leaves it out. Say so in any
  new endpoint's docs, because callers are often surprised by it.
- GET handlers never change a flag. Only `POST /api/rollout` mutates state, and
  it is in-memory: restarting the server undoes every change.
- Name a new route after the resource (`/api/flags/...`), not the action.
