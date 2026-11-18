# flag-service — Claude Code Foundations

A tiny feature-flags service built on the Next.js App Router. Twelve flags
across dev/staging/prod, percentage rollouts with deterministic user
bucketing, and one test that fails on a fresh clone. Over the workshop you fix
the bug, learn to manage Claude's context, teach Claude the repo, add a skill
and a hook, and give Claude live library docs over MCP.

> This is the `foundations` branch, used by the **Claude Code Foundations**
> workshop. The `main` branch is the **Foundations to Scale** workshop.

## Setup

You need **Node.js 26 LTS**, git and Claude Code.

```bash
git clone -b foundations https://github.com/entelect/claude-workshop-feature-flags.git flag-service
cd flag-service
npm run preflight   # every line should be a ✓
npm test            # expect: 1 failing — that's the starting point
```

Nothing to install for the exercises: tests run on plain `node --test` and
import `lib/` directly.

## Structure

```
lib/flags.js               ← 12 flags. Static array. Start by reading this.
lib/evaluate.js            ← Rollout bucketing. The first bug lives here.
test/evaluate.test.js      ← 4 tests. One fails.
app/api/                   ← Route handlers, with their own CLAUDE.md
mcp/                       ← Stdio MCP servers, with their own CLAUDE.md
docs/rollout-policy.md     ← How the team rolls out a flag
CLAUDE.md                  ← Sparse TODOs. You fill these in.
```

---

## Module 1 — Foundations

### E1. Fix the failing test

Open `claude` in this directory and give it the problem, not the solution:

> *npm test is failing. Find the bug and fix it. Don't touch the test file.*

**Done when:** `npm test` passes 4/4, and Claude found `% 101` and changed it
to `% 100`.

## Module 2 — Context

### E2. Fill, measure, compact, clear, hand off

1. Run `/context`. Note what's loaded before you've typed anything.
2. Ask: *Read every file in lib/, app/ and mcp/ and explain how a rollout
   flows through the system.* Run `/context` again.
3. Run `/compact focus on how evaluate.js buckets users`, then `/context`.
4. Ask: *Write a handoff note to HANDOFF.md: what we fixed in E1, why, and
   what's left to explore.*
5. Run `/clear`, then: *@HANDOFF.md what did we fix, and why?*

**Done when:** you saw `/context` grow and shrink, and a cleared session
answered from `HANDOFF.md`.

## Module 3 — Teach Claude your repo

### E3. A good CLAUDE.md

Run `/init`. Claude suggests what to put in `CLAUDE.md`. Edit the result
until it holds only what Claude can't work out by reading the code: the
commands to run, the hard constraints, and pointers (like
`@docs/rollout-policy.md`) instead of pasted docs.

**Done when:** in a fresh session, Claude answers *How do I run the tests?*,
*Can I raise a prod flag above staging?* and *Where do flags live?* correctly
without reading any files first.

### E4. The hierarchy

1. Run `/context all` and find **Memory files**. Is `app/api/CLAUDE.md` there?
2. Ask Claude to read `app/api/rollout/route.js`. Watch for the `Loaded` line.
3. From your shell (not via Claude), create `CLAUDE.local.md` with a rule that
   contradicts one in `CLAUDE.md`. Restart Claude and ask about that rule.
4. Predict, then run `/compact` and ask what Claude still knows about the API
   conventions in `app/api/CLAUDE.md`.

**Done when:** you've seen a nested file load on demand, a contradiction
between two files, and what survives `/compact`.

### E5. Memory

Tell Claude *remember that I prefer small commits*, then *add "run npm test
before every commit" to CLAUDE.md*. Open `/memory` and find where each went.

**Done when:** one landed in auto memory and one in `CLAUDE.md`.

## Module 4 — Skills and hooks

### E6. Your first skill: /rollout

> *Create .claude/skills/rollout/SKILL.md. When I run /rollout <flag-key>
> <percent> it should: (1) run npm test, (2) if red, refuse and show the
> failure, (3) if green, update that flag's staging rolloutPercent in
> lib/flags.js, (4) show me the diff. Follow @docs/rollout-policy.md.*

Then try `/rollout new-checkout 50`.

**Done when:** `/rollout` ran `npm test` before touching the flag and showed
a diff.

### E7. A hook that blocks prod edits

> *Create a PreToolUse hook in .claude/settings.json that blocks any Edit to
> lib/flags.js that would change a prod flag. Write the check as a small Node
> script in .claude/hooks/block-prod-flags.js that reads the hook JSON from
> stdin, and if the edit targets lib/flags.js and the new text contains
> "prod", prints "BLOCKED: direct prod flag edits are not allowed. Use the
> rollout API." to stderr and exits 2. Otherwise exit 0.*

Restart Claude (hooks load at startup), then ask it to bump `new-checkout` to
100% in prod.

**Done when:** the hook blocked the edit and prod in `lib/flags.js` is
unchanged.

## Module 5 — Scale

### E8. Live docs with Context7

```bash
claude mcp add --transport http context7 https://mcp.context7.com/mcp
```

Restart Claude, check `/mcp` shows **context7** connected, then ask:

> *Is app/api/flags/[key]/route.js correct for the Next.js version in
> package.json? use context7*

If Claude finds a problem, have it fix the route and add
`test/flag-route.test.js` that calls `GET` the way Next.js does.

**Done when:** the transcript shows a `mcp__context7__*` call, the route is
fixed, and `npm test` is green. Run `/context` to see what the MCP tools cost.

### E9. Parallel subagents

> *Map this repo for me: the data model, the API surface, and what's tested.
> Use parallel Explore agents, one per question.*

**Done when:** more than one subagent ran and you got one merged summary.

---

## Reset between runs

```bash
./reset-demo.sh   # re-plants both bugs, restores the CLAUDE.md files, clears skills, rules, hooks and MCP
```
