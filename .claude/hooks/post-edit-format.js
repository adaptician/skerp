#!/usr/bin/env node
// Post-tool hook for Edit / Write: runs the project formatter on the
// file just modified, based on its extension.
//
// Input:  JSON on stdin in Claude Code's hook input format.
// Output: empty stdout on success; warnings on stderr if a formatter
//         fails or is not installed.
// Exit:   always 0 — formatter failures here are advisory and do not
//         block the workflow.

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

let input = "";
process.stdin.on("data", (chunk) => {
  input += chunk;
});
process.stdin.on("end", () => {
  let payload;
  try {
    payload = JSON.parse(input);
  } catch {
    process.exit(0);
  }
  const filePath = payload?.tool_input?.file_path;
  if (!filePath || !fs.existsSync(filePath)) process.exit(0);

  const ext = path.extname(filePath).toLowerCase();
  let cmd = null;

  switch (ext) {
    case ".cs":
      cmd = `dotnet format --include "${filePath}"`;
      break;
    case ".ts":
    case ".html":
    case ".scss":
    case ".css":
    case ".json":
      // --no-install: do not auto-download prettier if it is not present.
      cmd = `npx --no-install prettier --write "${filePath}"`;
      break;
    default:
      // No formatter configured for this extension; skip silently.
      process.exit(0);
  }

  try {
    execSync(cmd, { stdio: "pipe" });
  } catch (err) {
    const firstLine = (err.message || "").split("\n")[0];
    process.stderr.write(
      `Formatter advisory (${path.basename(filePath)}): ${firstLine}\n`
    );
  }
  process.exit(0);
});
