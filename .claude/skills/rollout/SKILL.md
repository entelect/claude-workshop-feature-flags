---
name: rollout
description: Change a feature flag's rolloutPercent in lib/flags.js behind a passing test suite. Use when asked to roll out, bump, ramp or set a flag's percentage.
argument-hint: <flag-key> <percent> [prod]
---

Roll out a flag. Arguments: $ARGUMENTS (flag key, percent 0–100, optional `prod`).

1. Validate: the flag key exists in `lib/flags.js` for the target env and the percent is a whole number 0–100. Otherwise stop and say why.
2. Run `npm test`.
3. If any test fails: **stop**. Do not edit anything. Show the failing test names and assertion output, and say the rollout was refused.
4. If all tests pass, edit only that flag's `rolloutPercent` in `lib/flags.js`:
   - Default target is the **staging** entry.
   - **Prod only if** `prod` was passed **and** the user explicitly confirms in this conversation after you state the current and new value. Without both, do not touch prod.
   - Refuse to set prod above that flag's staging percentage, even with confirmation.
5. Show `git diff lib/flags.js` and a one-line summary: flag, env, old % → new %.

Change nothing else: no other flags, fields or files, no commits.
