# flag-service — Claude Code Workshop

A tiny feature-flags service built on Next.js App Router. Twelve flags across
dev/staging/prod, percentage rollouts with deterministic user bucketing, and
one test that fails on a cold clone. You'll fix the bug, teach Claude the
repo, wire an MCP server, and package the workflow as a plugin.

## Setup

```bash
unzip flag-service.zip
cd flag-service
npm test            # expect: 3 passing, 1 failing — that's the starting point
```

Zero install required for the core exercises. Tests run on plain `node --test`
and import `lib/` directly — no bundler, no Next build. Only `npm install`
when you hit Exercise 3 (the MCP SDK is a real dep).

## Structure

```
lib/flags.js                 ← 12 flags. Static array. Start by reading this.
lib/evaluate.js              ← Rollout bucketing. THE BUG LIVES HERE.
test/evaluate.test.js        ← 4 tests. One fails. Your target for Ex 1.
test/killswitch.test.js      ← Kill switch tests.
app/api/flags/route.js       ← GET all flags, ?env= filter
app/api/flags/[key]/         ← GET one flag, ?userId= to evaluate
app/api/rollout/route.js     ← POST to bump a flag's %
app/api/killswitch/route.js  ← POST to disable every prod flag
mcp/flag-store/server.js     ← Stdio MCP server. Ex 3 wires this up.
CLAUDE.md                    ← Sparse TODOs. Ex 2 fills these in.
```

---

## Exercise 1 — Fix the failing test (15 min)

Open `claude` in this directory. One test is red. You don't know why yet.

Paste this prompt:

> *"Run npm test. One test fails. Read the failing test and the code it
> exercises — figure out why user-23 gets excluded at 100% rollout and fix
> it. Don't touch the test file."*

Watch Claude run the test, read `lib/evaluate.js`, spot the arithmetic, and
patch it. If it proposes changing the test instead of the code, push back.

**Done when:** `npm test` → `✔ 4 passing`. Claude found the `% 101` and
changed it to `% 100`.

**Stretch:** ask *"why does this bug only show up at 100% rollout and not at,
say, 50%?"* — the answer tells you something about how off-by-one bugs hide.

---

## Exercise 2 — Teach Claude the repo (12 min)

Two artifacts: a filled-in `CLAUDE.md`, and a skill that wraps the rollout
workflow.

Paste this prompt:

> *"Fill in the three TODO sections in CLAUDE.md — how to run tests, what a
> flag looks like, and what you should never do with prod flags. Then create
> .claude/skills/rollout/SKILL.md that: (1) runs npm test, (2) if green, bumps
> the named flag's rolloutPercent in lib/flags.js, (3) if red, refuses and
> shows the failure."*

Then test it: `/rollout new-checkout 50`. The skill should run tests, see
4/4, and edit `lib/flags.js` to bump the prod `new-checkout` flag from 25→50.

**Done when:** `CLAUDE.md` has three filled sections (no more TODOs),
`.claude/skills/rollout/SKILL.md` exists, and `/rollout new-checkout 50` ran
tests before touching the flag.

**Stretch:** add a "Never" rule to `CLAUDE.md` that forbids raising a prod
flag above its staging percentage. Then try `/rollout beta-search 80` (staging
is at 25%) and watch Claude refuse.

---

## Exercise 3 — Wire the MCP server (15 min)

Give Claude live read access to the flag store — not by reading files, but by
calling tools.

First `npm install` (the MCP SDK is a real dep).

Paste this prompt:

> *"Register mcp/flag-store/server.js as an MCP server called flag-store.
> Then restart and tell me which prod flags are over 50% rollout — answer by
> calling the MCP tools, not by reading lib/flags.js."*

The registration command is
`claude mcp add flag-store -- node mcp/flag-store/server.js`. Claude may or
may not figure that out on its own — fine either way.

**Done when:** Claude answers the prod-flags question via
`mcp__flag-store__list_flags`, not by reading `lib/flags.js`.

**Stretch:** *"Use check_rollout_safety to tell me if it's safe to take
new-checkout to 75% in prod."* (It isn't — staging is at 100% so the
staging-coverage check passes, but if you did the stretch in Ex 2 your
CLAUDE.md rule might add its own objection.)

---

## Exercise 4 — Package as plugin (8 min)

Your skill from Ex 2 becomes one installable unit.

Paste this prompt:

> *"Create flag-toolkit/ at the repo root with a .claude-plugin/plugin.json
> (name, description, author) and copy the rollout skill into
> flag-toolkit/skills/rollout/SKILL.md. Then validate it."*

The shape:

```
flag-toolkit/
├── .claude-plugin/plugin.json
└── skills/rollout/SKILL.md   ← copy from Ex 2
```

**Done when:** `claude plugin validate flag-toolkit` passes.

**Stretch:** add a second skill to the plugin — `/flag-audit` that lists
every flag where prod % > staging %. Ship both skills as one plugin.

---

## Kill switch

For incidents: one call turns off every prod feature at once.

```bash
curl -X POST http://localhost:3000/api/killswitch
```

```json
{
  "disabled": ["dark-mode", "legacy-export", "new-checkout", "beta-search"],
  "alreadyDisabled": [],
  "count": 4
}
```

- Idempotent: calling it again returns `"disabled": []` with the same `count`.
- Sets `enabled = false` only; `rolloutPercent` is kept, so re-enabling restores the old rollout.
- Dev and staging flags are untouched.
- In-memory only, like `POST /api/rollout`: a restart restores `lib/flags.js`. No auth.

---

## Reset between runs

```bash
./reset-demo.sh   # re-plants the bug, restores sparse CLAUDE.md, clears skills + plugin
```
