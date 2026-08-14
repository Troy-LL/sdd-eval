import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { decide, isInside, responseJson, shellOutsideRoot } from "../hooks/keep-inside-root.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("isInside is case-insensitive on the repo root", () => {
  assert.equal(isInside(root, path.join(root, "TROYS-SDD.md")), true);
  assert.equal(isInside(root, path.join(root, "..", "other")), false);
});

test("decide allows in-repo writes and npm scripts", () => {
  const ok = decide(
    { tool_name: "Write", tool_input: { file_path: path.join(root, "TROYS-SDD.md") } },
    root,
  );
  assert.equal(ok.allow, true);
  assert.equal(decide({ command: "npm test" }, root).allow, true);
});

test("decide denies writes and cd outside the root", () => {
  const outside = path.resolve(root, "..", "secret.txt");
  const write = decide({ tool_name: "Write", tool_input: { file_path: outside } }, root);
  assert.equal(write.allow, false);
  assert.match(write.reason, /outside repo root/);
  const cd = decide({ command: `cd "${path.resolve(root, "..")}"` }, root);
  assert.equal(cd.allow, false);
});

test("shellOutsideRoot ignores bare npm and catches Out-File", () => {
  assert.equal(shellOutsideRoot("npm run check", root), null);
  const dest = path.resolve(root, "..", "leak.txt");
  assert.ok(shellOutsideRoot(`Set-Content -Path "${dest}"`, root));
});

test("Claude deny payload uses permissionDecision", () => {
  const body = responseJson(
    { allow: false, reason: "no" },
    { CLAUDE_PROJECT_DIR: root },
    { tool_name: "Write" },
  );
  assert.equal(body.hookSpecificOutput.permissionDecision, "deny");
});
