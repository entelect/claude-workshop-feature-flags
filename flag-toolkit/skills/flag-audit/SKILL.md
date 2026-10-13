---
name: flag-audit
description: Audit feature flags for prod rollouts that exceed staging. Use when asked to audit flags or check prod vs staging percentages.
---

List every flag whose prod percent is higher than its staging percent. Compare `effectivePercent` (the current percent, including any ramp) when present, otherwise `rolloutPercent`; note any active ramp and its target.

1. Read flags via the `flag-store` MCP `list_flags` tool if available; otherwise read `lib/flags.js`.
2. Pair each prod flag with its staging entry by `key`.
3. Report a table: key, prod %, staging %, and status:
   - **VIOLATION** if prod % > staging %
   - **NO STAGING** if the key has no staging entry
   - **DISABLED IN STAGING** if staging `enabled` is false but prod is on
4. End with a count of problems, or "All prod flags are within staging." Change nothing.
