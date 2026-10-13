#!/usr/bin/env node
// Stdio MCP server exposing the flag store to Claude.
// Run: node mcp/flag-store/server.js  (or `npm run mcp`)
// Register: claude mcp add flag-store -- node mcp/flag-store/server.js

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FLAGS } from '../../lib/flags.js';
import { effectivePercent } from '../../lib/evaluate.js';

// Include the current (possibly ramping) percent alongside the stored one.
const withEffective = (f) => ({ ...f, effectivePercent: effectivePercent(f) });

const server = new Server(
  { name: 'flag-store', version: '0.1.0' },
  { capabilities: { tools: {} } }
);

// ---- input schemas ----
const ListFlagsInput = z.object({
  env: z.enum(['dev', 'staging', 'prod']).optional(),
});
const GetFlagInput = z.object({
  key: z.string(),
  env: z.enum(['dev', 'staging', 'prod']).optional(),
});
const CheckSafetyInput = z.object({
  key: z.string(),
  targetPercent: z.number().min(0).max(100),
});

// ---- tool list ----
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'list_flags',
      description: 'List feature flags, optionally filtered by environment.',
      inputSchema: {
        type: 'object',
        properties: { env: { type: 'string', enum: ['dev', 'staging', 'prod'] } },
      },
    },
    {
      name: 'get_flag',
      description: 'Get a single flag by key. Defaults to prod if env is omitted.',
      inputSchema: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          env: { type: 'string', enum: ['dev', 'staging', 'prod'] },
        },
        required: ['key'],
      },
    },
    {
      name: 'check_rollout_safety',
      description:
        'Check whether it is safe to raise a prod flag to targetPercent. Safe means: the flag exists, it is enabled in staging, and the staging rollout % is >= targetPercent.',
      inputSchema: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          targetPercent: { type: 'number' },
        },
        required: ['key', 'targetPercent'],
      },
    },
  ],
}));

// ---- dispatch ----
server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;

  if (name === 'list_flags') {
    const { env } = ListFlagsInput.parse(args ?? {});
    const flags = (env ? FLAGS.filter((f) => f.env === env) : FLAGS).map(withEffective);
    return { content: [{ type: 'text', text: JSON.stringify(flags, null, 2) }] };
  }

  if (name === 'get_flag') {
    const { key, env = 'prod' } = GetFlagInput.parse(args ?? {});
    const flag = FLAGS.find((f) => f.key === key && f.env === env);
    if (!flag) {
      return { content: [{ type: 'text', text: `No flag '${key}' in ${env}.` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify(withEffective(flag), null, 2) }] };
  }

  if (name === 'check_rollout_safety') {
    const { key, targetPercent } = CheckSafetyInput.parse(args ?? {});
    const reasons = [];

    const prodFlag = FLAGS.find((f) => f.key === key && f.env === 'prod');
    const stagingFlag = FLAGS.find((f) => f.key === key && f.env === 'staging');

    if (!prodFlag) reasons.push(`flag '${key}' does not exist in prod`);
    if (!stagingFlag) {
      reasons.push(`flag '${key}' does not exist in staging`);
    } else {
      if (!stagingFlag.enabled) reasons.push('flag is disabled in staging');
      const stagingPercent = effectivePercent(stagingFlag);
      if (stagingPercent < targetPercent) {
        reasons.push(
          `staging is only at ${stagingPercent}% — prove it there first before going to ${targetPercent}% in prod`
        );
      }
    }

    const safe = reasons.length === 0;
    return {
      content: [{ type: 'text', text: JSON.stringify({ safe, reasons }, null, 2) }],
    };
  }

  return { content: [{ type: 'text', text: `unknown tool: ${name}` }], isError: true };
});

const transport = new StdioServerTransport();
await server.connect(transport);
