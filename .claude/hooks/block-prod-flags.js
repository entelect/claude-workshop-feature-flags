#!/usr/bin/env node
// PreToolUse hook: block Edits to lib/flags.js whose new text mentions prod.
// Exit 2 blocks the tool call and feeds stderr back to Claude.

let input = '';
process.stdin.on('data', (chunk) => (input += chunk));
process.stdin.on('end', () => {
  const { tool_input = {} } = JSON.parse(input || '{}');
  const filePath = tool_input.file_path || '';
  const newText = tool_input.new_string || '';

  if (filePath.endsWith('lib/flags.js') && newText.includes('prod')) {
    console.error('BLOCKED: direct prod flag edits are not allowed. Use the rollout API.');
    process.exit(2);
  }
  process.exit(0);
});
