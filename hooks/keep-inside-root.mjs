import fs from "node:fs";
import path from "node:path";

const FILE_KEYS = [
  "file_path",
  "filePath",
  "path",
  "target_file",
  "targetFile",
  "file",
  "filename",
];

export function repoRoot(env = process.env, cwd = process.cwd()) {
  const fromEnv = env.CLAUDE_PROJECT_DIR || env.CURSOR_PROJECT_DIR;
  const raw = typeof fromEnv === "string" && fromEnv.trim() ? fromEnv : cwd;
  try {
    return fs.realpathSync.native(raw);
  } catch {
    return path.resolve(raw);
  }
}

function norm(p) {
  return path.resolve(p).replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
}

export function isInside(root, target) {
  const r = norm(root);
  const t = norm(target);
  return t === r || t.startsWith(`${r}/`);
}

function resolveExisting(p, root) {
  const abs = path.resolve(root, p);
  try {
    return fs.realpathSync.native(abs);
  } catch {
    return abs;
  }
}

function collectFilePaths(obj, into) {
  if (!obj || typeof obj !== "object") return;
  if (Array.isArray(obj)) {
    for (const item of obj) collectFilePaths(item, into);
    return;
  }
  for (const key of FILE_KEYS) {
    const v = obj[key];
    if (typeof v === "string" && v.trim()) into.push(v);
  }
  if (Array.isArray(obj.files)) {
    for (const f of obj.files) {
      if (typeof f === "string") into.push(f);
      else collectFilePaths(f, into);
    }
  }
}

function filePathsFromPayload(payload) {
  const found = [];
  collectFilePaths(payload, found);
  collectFilePaths(payload.tool_input, found);
  collectFilePaths(payload.input, found);
  collectFilePaths(payload.updated_input, found);
  if (typeof payload.file_path === "string") found.push(payload.file_path);
  if (typeof payload.path === "string") found.push(payload.path);
  return [...new Set(found)];
}

function shellCommand(payload) {
  if (typeof payload.command === "string") return payload.command;
  const input = payload.tool_input;
  if (input && typeof input.command === "string") return input.command;
  return "";
}

function captureGroups(re, text) {
  const out = [];
  const clone = new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`);
  let m;
  while ((m = clone.exec(text))) {
    const hit = m[1] || m[2] || m[3];
    if (hit) out.push(hit);
  }
  return out;
}

export function shellOutsideRoot(command, root) {
  if (!command.trim()) return null;
  const cds = captureGroups(
    /(?:^|[;&|\n]|\s&&\s)\s*(?:cd|chdir|Set-Location|Push-Location)\s+(?:\/[dD]\s+)?(?:"([^"]+)"|'([^']+)'|(\S+))/gi,
    command,
  );
  for (const dest of cds) {
    if (dest === "-" || dest.startsWith("$")) continue;
    const abs = resolveExisting(dest, root);
    if (!isInside(root, abs)) return abs;
  }
  const writes = captureGroups(
    /(?:>>?|Out-File|Set-Content|Add-Content|New-Item)\s+(?:-Path\s+)?(?:"([^"]+)"|'([^']+)'|(\S+))/gi,
    command,
  );
  for (const dest of writes) {
    if (dest.startsWith("$") || dest.startsWith("-")) continue;
    const abs = resolveExisting(dest, root);
    if (!isInside(root, abs)) return abs;
  }
  return null;
}

function isWriteish(payload) {
  const name = String(
    payload.tool_name || payload.toolName || payload.tool || payload.toolType || "",
  );
  return /write|edit|delete|notebook/i.test(name);
}

/**
 * @returns {{ allow: true } | { allow: false, reason: string }}
 */
export function decide(payload, root = repoRoot()) {
  const files = filePathsFromPayload(payload);
  const write = isWriteish(payload) || Boolean(payload.tool_input?.contents) || Boolean(payload.tool_input?.new_string);
  if (write) {
    for (const f of files) {
      const abs = resolveExisting(f, root);
      if (!isInside(root, abs)) {
        return { allow: false, reason: `write path is outside repo root: ${abs}` };
      }
    }
  }
  const cmd = shellCommand(payload);
  if (cmd) {
    const escaped = shellOutsideRoot(cmd, root);
    if (escaped) {
      return { allow: false, reason: `shell leaves repo root: ${escaped}` };
    }
  }
  return { allow: true };
}

function isClaude(env = process.env, payload = {}) {
  return Boolean(env.CLAUDE_PROJECT_DIR) || typeof payload.tool_name === "string";
}

export function responseJson(decision, env = process.env, payload = {}) {
  if (decision.allow) {
    if (isClaude(env, payload)) {
      return {
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "allow",
        },
      };
    }
    return { permission: "allow" };
  }
  if (isClaude(env, payload)) {
    return {
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: decision.reason,
      },
    };
  }
  return {
    permission: "deny",
    user_message: decision.reason,
    agent_message: decision.reason,
  };
}

function readStdin() {
  return fs.readFileSync(0, "utf8");
}

const entry = process.argv[1] && path.basename(process.argv[1]) === "keep-inside-root.mjs";
if (entry) {
  let payload = {};
  try {
    const raw = readStdin().trim();
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    payload = {};
  }
  const root = repoRoot();
  const decision = decide(payload, root);
  process.stdout.write(`${JSON.stringify(responseJson(decision, process.env, payload))}\n`);
  process.exit(0);
}
