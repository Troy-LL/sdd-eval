import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { test } from "node:test";
import {
  docsPreRead,
  extraCap,
  handleDocsHook,
  relFromRoot,
  SKIP_UNUSED_TEXT,
} from "../hooks/docs-load.mjs";

test("docsPreRead denies dump extras and folder glob, allows mapped files", () => {
  assert.equal(docsPreRead("README.md", [], 3).allow, true);
  assert.equal(docsPreRead("docs/architecture.md", [], 3).allow, true);
  assert.equal(docsPreRead("docs/changelog.md", [], 3).allow, false);
  assert.equal(docsPreRead("docs/ops-noise.md", [], 3).allow, false);
  assert.equal(docsPreRead("docs/decisions", [], 3).allow, false);
  assert.equal(docsPreRead("docs/decisions/001-preempt-lease.md", [], 3).allow, true);
});

test("docsPreRead enforces extra cap without counting AGENTS.md", () => {
  const extras = ["README.md", "docs/architecture.md", "docs/eval.md"];
  assert.equal(docsPreRead("docs/design.md", extras, 3).allow, false);
  assert.equal(docsPreRead("AGENTS.md", extras, 3).allow, true);
  assert.equal(docsPreRead("README.md", extras, 3).allow, true);
});

test("extraCap is 3 when eval.md exists on disk", () => {
  const dir = path.join(os.tmpdir(), `sdd-docs-cap-${Date.now()}`);
  mkdirSync(path.join(dir, "docs"), { recursive: true });
  assert.equal(extraCap(dir), 2);
  writeFileSync(path.join(dir, "docs", "eval.md"), "# eval\n");
  assert.equal(extraCap(dir), 3);
  assert.equal(relFromRoot(dir, path.join(dir, "docs", "eval.md")).replace(/\\/g, "/"), "docs/eval.md");
});

test("skip-unused reminder does not name gold or the ADR", () => {
  assert.match(SKIP_UNUSED_TEXT, /ceiling/i);
  assert.doesNotMatch(SKIP_UNUSED_TEXT, /001-preempt-lease/);
  assert.doesNotMatch(SKIP_UNUSED_TEXT, /7481\/tcp|9104|cratewake dock:lease|max-bays 36/);
});

test("handleDocsHook denies dump extras and injects skip-unused on SessionStart", () => {
  const dir = path.join(os.tmpdir(), `sdd-docs-hook-${Date.now()}`);
  mkdirSync(path.join(dir, "docs"), { recursive: true });
  writeFileSync(path.join(dir, "docs", "eval.md"), "# eval\n");
  const env = { CLAUDE_PROJECT_DIR: dir };
  const start = handleDocsHook({ hook_event_name: "SessionStart", cwd: dir, session_id: "s1" }, env);
  assert.equal(start.hookSpecificOutput.hookEventName, "SessionStart");
  assert.match(start.hookSpecificOutput.additionalContext, /skip unused/i);
  const dump = handleDocsHook(
    {
      hook_event_name: "PreToolUse",
      cwd: dir,
      session_id: "s1",
      tool_input: { file_path: path.join(dir, "docs", "changelog.md") },
    },
    env,
  );
  assert.equal(dump.hookSpecificOutput.permissionDecision, "deny");
  const ok = handleDocsHook(
    {
      hook_event_name: "PreToolUse",
      cwd: dir,
      session_id: "s1",
      tool_input: { file_path: path.join(dir, "README.md") },
    },
    env,
  );
  assert.equal(ok.hookSpecificOutput.permissionDecision, "allow");
});
