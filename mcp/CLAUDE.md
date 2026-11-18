# MCP servers

Every server in this folder speaks MCP over stdio.

- stdout carries JSON-RPC and nothing else. A stray `console.log` corrupts the
  protocol, so log with `console.error`.
- `flag-store/` reads the real flags in `lib/flags.js`. It is read-only: it
  never changes a flag.
- The other five (`pagerduty`, `servicenow`, `confluence`, `jira`, `slack`) are
  mocks with fictional data. They use the zero-dependency helper in `_stdio.js`,
  so they run without `npm install`.
