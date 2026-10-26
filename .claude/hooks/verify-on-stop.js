// verify-on-stop.js
// Stop hook: runs the FAST quality gate when the agent tries to finish, and
// blocks completion if it fails — the executable form of "Verify before you hand
// off" (AGENTS.md). The agent cannot quietly stop with the generated mirrors out
// of sync.
//
// CommonJS (require), not ESM: this repo has no package.json with "type":"module",
// so Node treats a .js file as CommonJS. (The .mjs scripts under .agents/ are ESM.)
// No shebang: the hook is always invoked as `node verify-on-stop.js`, and omitting
// the shebang lets Node strip a stray UTF-8 BOM a Windows editor might add.
//
// Why --fast: this fires at the end of every turn, so it must be quick — only the
// instant mirror/sync gates. The full gate (build, tests, format, lint) is for CI
// and the explicit pre-handoff `verify` run. Drop `--fast` below to run the lot.
//
// Loop safety: `stop_hook_active` is set when the agent is already continuing
// because of a previous Stop block; in that case we allow the stop so an
// unfixable failure cannot trap the agent in a loop.
//
// Exit: 0 to allow the agent to finish; 2 to block and send stderr to the agent.

const { spawnSync } = require("child_process");
const path = require("path");

let input = "";
process.stdin.on("data", (c) => (input += c));
process.stdin.on("end", () => {
  let payload = {};
  try {
    payload = JSON.parse(input);
  } catch {
    process.exit(0); // malformed — don't block
  }

  if (payload.stop_hook_active) process.exit(0); // already continuing — don't loop

  const repoRoot =
    process.env.CLAUDE_PROJECT_DIR ||
    process.env.CODEX_PROJECT_DIR ||
    process.cwd();

  const r = spawnSync(
    "node",
    [path.join(repoRoot, ".agents", "scripts", "verify.mjs"), "--fast"],
    { cwd: repoRoot, encoding: "utf8" },
  );

  if (r.status === 0) process.exit(0); // gate green — allow finish

  process.stderr.write(
    "Quality gate (fast) failed — do not finish yet.\n" +
    ((r.stdout || "") + (r.stderr || "")).trim() +
    "\n\nRegenerate the mirrors / fix the failures above, then run " +
    "`node .agents/scripts/verify.mjs` before handing off.\n",
  );
  process.exit(2); // block the stop; the agent sees the message and continues
});
