#!/usr/bin/env bash
# Reset to pre-workshop state. Safe to run between sessions.
# Only touches this repo and its local-scope MCP registrations. Your global
# ~/.claude/ files are never changed.

set -euo pipefail
cd "$(dirname "$0")"

echo "→ Restoring buggy evaluate.js (re-plants the % 101 bug)"
cp .reset-snapshots/evaluate.js lib/evaluate.js

echo "→ Restoring the flags and the [key] route (re-plants the Next.js 16 params bug)"
cp .reset-snapshots/flags.js lib/flags.js
cp .reset-snapshots/flag-key-route.js 'app/api/flags/[key]/route.js'
rm -f test/flag-route.test.js

echo "→ Restoring CLAUDE.md files (sparse root, nested app/api and mcp)"
cp .reset-snapshots/CLAUDE.md CLAUDE.md
cp .reset-snapshots/api-CLAUDE.md app/api/CLAUDE.md
cp .reset-snapshots/mcp-CLAUDE.md mcp/CLAUDE.md
rm -f CLAUDE.local.md HANDOFF.md

echo "→ Clearing skills, rules, hooks and project settings"
rm -rf .claude/skills .claude/rules .claude/hooks
rm -f .claude/settings.json .claude/settings.local.json
mkdir -p .claude/skills
touch .claude/skills/.gitkeep

echo "→ Removing plugin packaging (if any)"
rm -rf flag-toolkit/

echo "→ Removing MCP registrations (if any)"
claude mcp remove context7 -s local >/dev/null 2>&1 || true
claude mcp remove flag-store -s local >/dev/null 2>&1 || true

echo "✓ Reset complete. Run: npm test  (expect: 1 failing — '100% rollout includes all users')"
