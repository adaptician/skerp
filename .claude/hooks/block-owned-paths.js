// block-owned-paths.js
// Pre-tool hook: hard-blocks agent edits to hook-enforced human-owned paths.
//
// Some paths may not be modified by an agent AT ALL — not even with approval in
// chat. `.humans/` is the canonical example. When a change there is needed, the
// agent proposes the content and a HUMAN makes the edit. See
// `.agents/owned-by-humans.md` ("Hook-enforced paths").
//
// CommonJS (require), not ESM: the repo has no package.json with "type":"module",
// so .js is CommonJS. No shebang (invoked as `node block-owned-paths.js`; lets
// Node strip a stray BOM).
//
// Input:  JSON on stdin (Claude Code hook format; Codex carries the same fields).
// Exit:   0 to allow the tool use, 2 to block it.

const path = require("path");

// Repo-relative directory prefixes an agent may never write to.
const BLOCKED_PREFIXES = [".humans"];

const SHELL_WRITE =
  /\b(rm|mv|cp|sed\s+-i|tee|truncate|dd|install|ln|chmod|chown|touch|mkdir|rmdir)\b/;
const SHELL_REDIRECT = />>?/;

const repoRoot =
  process.env.CLAUDE_PROJECT_DIR ||
  process.env.CODEX_PROJECT_DIR ||
  process.cwd();

function toRepoRel(p) {
  if (!p) return null;
  const abs = path.isAbsolute(p) ? p : path.resolve(repoRoot, p);
  const rel = path.relative(repoRoot, abs);
  if (rel.startsWith("..")) return null; // outside the repo — not our concern
  return rel.split(path.sep).join("/").replace(/^\.\//, "").toLowerCase();
}

function isBlocked(rel) {
  if (!rel) return false;
  return BLOCKED_PREFIXES.some(
    (prefix) => rel === prefix || rel.startsWith(prefix + "/"),
  );
}

function shellTouchesBlocked(command) {
  if (!command) return false;
  const writes = SHELL_WRITE.test(command) || SHELL_REDIRECT.test(command);
  if (!writes) return false; // pure read (cat/grep/less) is allowed
  return BLOCKED_PREFIXES.some((prefix) => {
    const esc = prefix.replace(/\./g, "\\.");
    const re = new RegExp(`(^|[\\s'"=(/])${esc}(/|[\\s'"})]|$)`, "i");
    return re.test(command);
  });
}

function block(reason) {
  process.stderr.write(
    "Blocked by .claude/hooks/block-owned-paths.js\n" +
    `${reason}\n` +
    "This path is human-owned and hook-enforced: an agent cannot edit it, even " +
    "with approval. Describe the change and propose the content; a human will " +
    "make the edit. See .agents/owned-by-humans.md (Hook-enforced paths).\n",
  );
  process.exit(2);
}

let input = "";
process.stdin.on("data", (c) => (input += c));
process.stdin.on("end", () => {
  let payload;
  try {
    payload = JSON.parse(input);
  } catch {
    process.exit(0); // malformed — be conservative and allow
  }

  const tool = payload && payload.tool_name ? payload.tool_name : "";
  const ti = (payload && payload.tool_input) || {};

  if (tool === "Bash") {
    if (shellTouchesBlocked(ti.command || "")) {
      block(`Shell command appears to write to a human-owned path: ${BLOCKED_PREFIXES.join(", ")}/`);
    }
    process.exit(0);
  }

  const candidates = [ti.file_path, ti.notebook_path, ti.path].filter(Boolean);
  for (const c of candidates) {
    const rel = toRepoRel(c);
    if (isBlocked(rel)) block(`Target path is human-owned: ${rel}`);
  }
  process.exit(0);
});
