---
name: ramp
description: Schedule a gradual staging rollout (e.g. +10% every hour up to a target) by adding a ramp to the flag in lib/flags.js, behind a passing test suite. Use when asked to ramp, gradually roll out, or step up a flag over time.
argument-hint: <flag-key> <target> [step=10] [intervalMinutes=60] [startAt=now]
---

Schedule a ramp. Arguments: $ARGUMENTS (flag key, target %, optional step %, interval in minutes, ISO start time).

1. **Staging only.** If `prod` appears in the arguments, refuse: prod changes go through `POST /api/rollout`, capped at staging. Do not touch any prod entry.
2. Validate against the **staging** entry in `lib/flags.js`: it exists, `enabled` is true, it has no `ramp` already, and the target is above its current %. Build `ramp = { to, step, intervalMinutes, startAt }` (defaults: step 10, interval 60, startAt = now as ISO, to the minute) and check it:
   `node --input-type=module -e "import { validateRamp } from './lib/evaluate.js'; console.log(validateRamp({ rolloutPercent: <current> }, <ramp JSON>) ?? 'ok')"`
   If it prints anything other than `ok`, stop and show the error.
3. Run `npm test`. If any test fails: **stop**, edit nothing, show the failing tests.
4. If green, add the ramp to that staging entry only, after `rolloutPercent`, leaving `rolloutPercent` unchanged:
   `ramp: { to: <to>, step: <step>, intervalMinutes: <n>, startAt: '<iso>' },`
5. Print the schedule:
   `node --input-type=module -e "import { FLAGS } from './lib/flags.js'; import { rampSchedule } from './lib/evaluate.js'; console.table(rampSchedule(FLAGS.find((f) => f.key === '<key>' && f.env === 'staging')))"`
6. Show `git diff lib/flags.js` and a one-line summary: flag, staging, from % → to %, step, interval, finish time.

Change nothing else: no other flags or files, no commits. To cancel a ramp, set a percentage with `/rollout` or `POST /api/rollout` (a manual percentage overrides the ramp).
