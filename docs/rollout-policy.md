# Rollout policy

How the platform team rolls out a feature flag. This file is the single source
of truth: CLAUDE.md and skills should point here (an `@docs/rollout-policy.md`
import) instead of restating the rules.

1. **Staging first.** A prod flag's `rolloutPercent` never exceeds the same
   flag's staging `rolloutPercent`.
2. **Small steps.** Raise prod by at most 25 percentage points at a time.
3. **Soak.** Leave staging at the target percentage for 48 hours before you
   match it in prod.
4. **Tests gate every change.** Run `npm test` before any rollout. If it fails,
   stop.
5. **Never auto-enable a flag in prod.** A person confirms every prod change.
   In January 2026 an automated prod rollout took checkout down for 40 minutes.

Questions about this policy go to #platform-eng.
