#!/usr/bin/env node
// Pre-tool hook for Bash: blocks destructive git/filesystem commands.
//
// Input:  JSON on stdin in Claude Code's hook input format.
// Output: empty stdout on allow; message on stderr on block.
// Exit:   0 to allow the tool use, 2 to block it.
//
// This hook is intentionally narrow. It blocks only the cases listed in
// DANGEROUS_PATTERNS. Extend the list when a new destructive operation
// is identified — false positives are far more disruptive than missed
// cases, so prefer narrow patterns over broad ones.

const DANGEROUS_PATTERNS = [
  {
    pattern: /\bgit\s+push\s+(--force|-f)\b/,
    reason:
      "git push --force is destructive. Prefer --force-with-lease, or rebase locally and review with the team before pushing.",
  },
  {
    pattern: /\bgit\s+reset\s+--hard\b/,
    reason:
      "git reset --hard discards uncommitted changes irreversibly. Use `git stash` first, or run this manually outside the agent session if intentional.",
  },
  {
    pattern: /\bgit\s+clean\s+-[fdx]+/,
    reason:
      "git clean -fdx deletes untracked and ignored files. Run manually outside the agent session if intentional.",
  },
  {
    pattern: /\brm\s+-rf?\s+\.git\b/,
    reason: "Refusing to remove the .git directory.",
  },
  {
    pattern: /\brm\s+-rf?\s+\/\s*($|[\s'"])/,
    reason: "Refusing rm -rf /.",
  },
];

let input = "";
process.stdin.on("data", (chunk) => {
  input += chunk;
});
process.stdin.on("end", () => {
  let payload;
  try {
    payload = JSON.parse(input);
  } catch {
    // Malformed input — be conservative and allow.
    process.exit(0);
  }
  const command = payload?.tool_input?.command || "";
  for (const { pattern, reason } of DANGEROUS_PATTERNS) {
    if (pattern.test(command)) {
      process.stderr.write(
        `Blocked by .claude/hooks/block-destructive-git.js\n${reason}\n`
      );
      process.exit(2);
    }
  }
  process.exit(0);
});
