#!/usr/bin/env node
// Pre-flight check for the Claude Code Foundations workshop.
// Run `npm run preflight` before the session: every line should be a ✓.

import { execFileSync } from 'node:child_process';

const MIN_NODE_MAJOR = 26;
const CONTEXT7_URL = 'https://mcp.context7.com/mcp';

const results = [];
const check = (ok, label, hint) => results.push({ ok, label, hint });

const nodeMajor = Number(process.versions.node.split('.')[0]);
check(
  nodeMajor >= MIN_NODE_MAJOR,
  `Node.js ${process.versions.node}`,
  `Install Node.js ${MIN_NODE_MAJOR} LTS from https://nodejs.org (or run \`nvm install\` here), then open a new terminal.`
);

function version(command) {
  try {
    return execFileSync(command, ['--version'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      shell: process.platform === 'win32',
    }).trim();
  } catch {
    return null;
  }
}

const git = version('git');
check(!!git, git || 'git', 'Install git from https://git-scm.com.');

const claude = version('claude');
check(
  !!claude,
  claude ? `Claude Code ${claude}` : 'Claude Code',
  'Install Claude Code: https://code.claude.com/docs/en/setup'
);

// Context7 answers an MCP initialize without an API key.
try {
  const res = await fetch(CONTEXT7_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'flag-service-preflight', version: '1.0.0' },
      },
    }),
    signal: AbortSignal.timeout(10_000),
  });
  check(
    res.ok,
    `Context7 MCP reachable (HTTP ${res.status})`,
    'Check your network or proxy can reach https://mcp.context7.com.'
  );
} catch (error) {
  check(
    false,
    `Context7 MCP reachable (${error.name})`,
    'Check your network or proxy can reach https://mcp.context7.com.'
  );
}

for (const { ok, label, hint } of results) {
  console.log(`${ok ? '✓' : '✗'} ${label}${ok ? '' : `\n    ${hint}`}`);
}

const failed = results.filter((r) => !r.ok).length;
console.log(failed ? `\n${failed} check(s) failed.` : '\nReady for the workshop.');
process.exitCode = failed ? 1 : 0;
