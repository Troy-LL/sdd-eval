import fs from "node:fs";
import path from "node:path";

const MAP = new Set([
  "readme.md",
  "docs/architecture.md",
  "docs/design.md",
  "docs/eval.md",
]);

const DUMP = new Set(["docs/changelog.md", "docs/ops-noise.md"]);

const SKIP_UNUSED =
  "Troy's SDD load: AGENTS.md is the map. Open only the file this turn needs. Cap is a ceiling, not a quota: skip unused; do not open architecture or eval to fill leftover slots. Cite paths. Do not paste. Do not glob docs/decisions/.";

function rootOf(payload, env = process.env) {
  const fromEnv = env.CLAUDE_PROJECT_DIR || env.CURSOR_PROJECT_DIR;
  const cwd = typeof payload.cwd === "string" && payload.cwd ? payload.cwd : process.cwd();
  const raw = typeof fromEnv === "string" && fromEnv.trim() ? fromEnv : cwd;
  try {
    return fs.realpathSync.native(raw);
  } catch {
    return path.resolve(raw);
  }
}

export function relFromRoot(root, filePath) {
  const abs = path.isAbsolute(filePath) ? filePath : path.resolve(root, filePath);
  let rel = path.relative(root, abs).replace(/\\/g, "/");
  if (rel.startsWith("./")) rel = rel.slice(2);
  return rel.replace(/^\/+/, "");
}

export function extraCap(root) {
  return fs.existsSync(path.join(root, "docs", "eval.md")) ? 3 : 2;
}

function isExtra(rel) {
  const key = rel.toLowerCase();
  if (key === "agents.md") return false;
  return true;
}

function isAllowedDoc(rel) {
  const key = rel.toLowerCase();
  if (key === "agents.md") return true;
  if (MAP.has(key)) return true;
  if (/^docs\/decisions\/[^/]+\.md$/i.test(rel) && !rel.toLowerCase().includes("*")) return true;
  return false;
}

function filePathOf(payload) {
  const input = payload.tool_input || payload.input || payload;
  const v = input.file_path || input.filePath || input.path || payload.file_path || payload.path;
  return typeof v === "string" ? v : "";
}

function statePath(root) {
  return path.join(root, ".sdd-hook-state.json");
}

function loadState(root) {
  try {
    return JSON.parse(fs.readFileSync(statePath(root), "utf8"));
  } catch {
    return { sessions: {} };
  }
}

function saveState(root, state) {
  fs.writeFileSync(statePath(root), `${JSON.stringify(state)}\n`);
}

function extrasFor(root, sessionId) {
  const state = loadState(root);
  const rows = state.sessions[sessionId];
  return Array.isArray(rows) ? rows : [];
}

function rememberExtra(root, sessionId, rel) {
  const state = loadState(root);
  const cur = extrasFor(root, sessionId);
  if (!cur.includes(rel)) cur.push(rel);
  state.sessions[sessionId] = cur;
  saveState(root, state);
}

export function docsPreRead(rel, extras, cap) {
  const key = rel.toLowerCase();
  if (DUMP.has(key)) {
    return { allow: false, reason: `${rel} is off the map (dump extra). Read AGENTS.md, then one mapped file.` };
  }
  if (/^docs\/decisions\/?$/i.test(rel) || rel.toLowerCase().includes("*")) {
    return { allow: false, reason: "Never glob docs/decisions/. Cite one ADR file if you have a named decision." };
  }
  if (key.startsWith("docs/") && !isAllowedDoc(rel)) {
    return { allow: false, reason: `${rel} is not on the Troy's SDD allowlist.` };
  }
  if (isExtra(rel) && !extras.includes(rel) && extras.length >= cap) {
    return { allow: false, reason: `load cap is ${cap} extras after AGENTS.md. Skip unused.` };
  }
  return { allow: true };
}

function claudeAllow() {
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "allow",
    },
  };
}

function claudeDeny(reason) {
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason,
    },
  };
}

function claudeContext(eventName, text) {
  return {
    hookSpecificOutput: {
      hookEventName: eventName,
      additionalContext: text,
    },
  };
}

function handle(payload, env = process.env) {
  const event = String(payload.hook_event_name || "");
  const root = rootOf(payload, env);
  const sessionId = typeof payload.session_id === "string" ? payload.session_id : "none";
  const cap = extraCap(root);

  if (event === "SessionStart" || event === "UserPromptSubmit") {
    return claudeContext(event, SKIP_UNUSED);
  }

  if (event === "PreToolUse") {
    const fp = filePathOf(payload);
    if (!fp) return claudeAllow();
    const rel = relFromRoot(root, fp);
    const extras = extrasFor(root, sessionId);
    const d = docsPreRead(rel, extras, cap);
    if (!d.allow) return claudeDeny(d.reason);
    if (isExtra(rel) && isAllowedDoc(rel)) rememberExtra(root, sessionId, rel);
    return claudeAllow();
  }

  if (event === "PostToolUse") {
    const fp = filePathOf(payload);
    if (!fp) return {};
    const rel = relFromRoot(root, fp);
    if (isExtra(rel) && isAllowedDoc(rel)) rememberExtra(root, sessionId, rel);
    if (rel.toLowerCase() === "agents.md") {
      return claudeContext("PostToolUse", SKIP_UNUSED);
    }
    return {};
  }

  return claudeAllow();
}

const entry = process.argv[1] && path.basename(process.argv[1]) === "docs-load.mjs";
if (entry) {
  let payload = {};
  try {
    const raw = fs.readFileSync(0, "utf8").trim();
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    payload = {};
  }
  const out = handle(payload);
  if (out && Object.keys(out).length) process.stdout.write(`${JSON.stringify(out)}\n`);
}

export const SKIP_UNUSED_TEXT = SKIP_UNUSED;
export { handle as handleDocsHook };
