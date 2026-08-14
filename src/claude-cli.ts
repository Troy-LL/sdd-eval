import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { accessSync } from "node:fs";
import { access, copyFile, mkdir, mkdtemp, readFile, rename, rm, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extraFileCap, type Arm, type Observation, type Task } from "./schema.ts";
import {
  DUMP_EXTRAS,
  INSTRUCT,
  PREFIX,
  derive,
  loadTasks,
  observationLine,
  parseCiteAnswer,
  toolFirstTurn,
} from "./run.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE = path.join(ROOT, "fixtures", "product");
const TASKS_PATH = path.join(ROOT, "sdd-eval-tasks.yaml");
const EVAL_IN_PLAY = true;

/** Bench subject. Every Claude call pins this; init and completions must match. */
export const BENCH_MODEL = "claude-opus-5";
export const BENCH_MODEL_ALIAS = "claude-opus-5[1m]";
export const BENCH_PERMISSION_MODE = "dontAsk";
const ALLOWED_MODELS = new Set([BENCH_MODEL, BENCH_MODEL_ALIAS]);
const DENY_MCP = "mcp__*";
const DENY_TOOL_TREATMENT = `Bash,Edit,Write,Agent,Glob,Grep,${DENY_MCP}`;

export const PILOT_IDS = [
  "pg-01",
  "pg-02",
  "pg-03",
  "pg-04",
  "pg-05",
  "ms-01",
  "ms-02",
  "ms-03",
  "ms-04",
  "ms-05",
] as const;

/** Four-call wave. L1n is cheat-probe only. L1e/K not run (gold leak / tautology). */
export const WAVE2_RUN: { treatment: Treatment; ids: readonly string[] }[] = [
  { treatment: "L1n", ids: ["ms-02", "ms-03"] },
  { treatment: "L1o", ids: ["pg-01", "pg-02"] },
];

export const WAVE2_TREATMENTS = ["K", "L1e", "L1o", "L1n"] as const;
export const WAVE3_TREATMENTS = ["L1j"] as const;
export const WAVE3_RUN: { treatment: Treatment; ids: readonly string[] }[] = [
  { treatment: "L1j", ids: ["pg-01", "pg-02", "ms-02", "ms-03"] },
];
export const WAVE4_TREATMENTS = ["L1h"] as const;
export const WAVE4_RUN: { treatment: Treatment; ids: readonly string[] }[] = [
  { treatment: "L1h", ids: ["pg-01", "pg-02", "ms-02", "ms-03"] },
];
export type Treatment =
  | "L0"
  | "L1"
  | (typeof WAVE2_TREATMENTS)[number]
  | (typeof WAVE3_TREATMENTS)[number]
  | (typeof WAVE4_TREATMENTS)[number];

export function scoringArm(treatment: Treatment): Arm {
  return treatment === "L0" || treatment === "K" ? "L0" : "L1";
}

export function usesTools(treatment: Treatment): boolean {
  return scoringArm(treatment) === "L1";
}

export function exactSystemPrompt(): string {
  return `${INSTRUCT}
ANSWER must copy the token including any key words, not a shortened value.`;
}

export function oneFileCapNote(): string {
  return `Read cwd-relative paths only (README.md, never a leading slash). After AGENTS.md, read at most one file: the map entry that holds this fact. Then answer. Do not also read architecture unless the map says the fact is there.`;
}

export function namedMap(agents: string): string {
  return `${agents.trimEnd()}
- \`docs/decisions/001-preempt-lease.md\` — preempt, fence, yield. cheat-probe: map names the ADR.
`;
}

/** Copy-only job map. Does not name the ADR. Not the committed fixture. */
export function jobMap(): string {
  return `# cratewake

Map only. This tree exists to be measured. Not a shipping product.

> One job, one file. Skip unused. Cap is a ceiling: this file + at most 2, or 3 because \`docs/eval.md\` exists. Pin order only when loading more than one: README → architecture → design → eval. Cite paths. Do not paste.

## Jobs

- [\`README.md\`](README.md): Run, Limits
- [\`docs/architecture.md\`](docs/architecture.md): Replica and clock; Sockets and spill
- [\`docs/design.md\`](docs/design.md): Retry, Surface
- [\`docs/eval.md\`](docs/eval.md): Command, SLOs
`;
}

/** Installed on the L1h fixture copy only. Not this repo's live hooks. */
export function docsHookSettings(): string {
  return `${JSON.stringify(
    {
      hooks: {
        SessionStart: [
          {
            hooks: [{ type: "command", command: "node hooks/docs-load.mjs" }],
          },
        ],
        UserPromptSubmit: [
          {
            hooks: [{ type: "command", command: "node hooks/docs-load.mjs" }],
          },
        ],
        PreToolUse: [
          {
            matcher: "Read",
            hooks: [{ type: "command", command: "node hooks/docs-load.mjs" }],
          },
        ],
        PostToolUse: [
          {
            matcher: "Read",
            hooks: [{ type: "command", command: "node hooks/docs-load.mjs" }],
          },
        ],
      },
    },
    null,
    2,
  )}\n`;
}

export type FileRequest = { path: string; ok: boolean };

export type ClaudeInitMeta = {
  model: string;
  /** null: absent, not an array, or a non-string entry. */
  tools: string[] | null;
  permissionMode: string;
};

export type ClaudeStreamParse = {
  result_text: string;
  files_requested: FileRequest[];
  loaded_extras: string[];
  cli_cost_usd: number | null;
  session_id: string | null;
  num_turns: number | null;
  model: string;
  init: ClaudeInitMeta | null;
  init_count: number;
  result_model: string | null;
  completion_models: string[];
};

export function expectedTools(treatment: Treatment): string[] {
  return usesTools(treatment) ? ["Read"] : [];
}

export function isAllowedBenchModel(model: string): boolean {
  return ALLOWED_MODELS.has(model);
}

function addModel(models: string[], model: string): void {
  if (!models.includes(model)) models.push(model);
}

function parseInitTools(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  if (!v.every((t) => typeof t === "string")) return null;
  return v as string[];
}

function assertToolSet(got: string[], want: string[], prefix: string): void {
  const gotSet = new Set(got);
  if (gotSet.size !== got.length) {
    throw new Error(`${prefix}: duplicate tools ${JSON.stringify(got)}`);
  }
  if (gotSet.size !== want.length || !want.every((t) => gotSet.has(t))) {
    const mcp = got.filter((t) => t.startsWith("mcp__"));
    const extra = mcp.length ? `; mcp tools ${mcp.join(",")}` : "";
    throw new Error(
      `${prefix}: tools ${JSON.stringify(got)} !== ${JSON.stringify(want)}${extra}`,
    );
  }
}

/** Fail-closed. Contaminated streams must not become scored logs. */
export function assertCleanClaudeInit(parsed: ClaudeStreamParse, treatment: Treatment): void {
  const prefix = `${treatment}: contamination`;
  if (parsed.init_count === 0 || !parsed.init) {
    throw new Error(`${prefix}: missing system/init`);
  }
  if (parsed.init_count !== 1) {
    throw new Error(`${prefix}: duplicate system/init count=${parsed.init_count}`);
  }
  if (!isAllowedBenchModel(parsed.init.model)) {
    throw new Error(`${prefix}: init model ${parsed.init.model} !== ${BENCH_MODEL}`);
  }
  if (parsed.completion_models.length === 0) {
    throw new Error(`${prefix}: missing completion model`);
  }
  for (const m of parsed.completion_models) {
    if (!isAllowedBenchModel(m)) {
      throw new Error(`${prefix}: completion model ${m} !== ${BENCH_MODEL}`);
    }
  }
  if (parsed.init.permissionMode !== BENCH_PERMISSION_MODE) {
    throw new Error(
      `${prefix}: permissionMode ${parsed.init.permissionMode} !== ${BENCH_PERMISSION_MODE}`,
    );
  }
  if (parsed.init.tools === null) {
    throw new Error(`${prefix}: malformed tools`);
  }
  assertToolSet(parsed.init.tools, expectedTools(treatment), prefix);
}

type PendingRead = { index: number; path: string };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function contentBlocks(v: unknown): Record<string, unknown>[] {
  if (!isRecord(v)) return [];
  const message = isRecord(v.message) ? v.message : v;
  const content = message.content;
  if (!Array.isArray(content)) return [];
  return content.filter(isRecord);
}

export function normalizeRelPath(filePath: string, cwd: string): string {
  let p = filePath.replace(/\\/g, "/");
  const cwdFwd = cwd.replace(/\\/g, "/").replace(/\/+$/, "");
  if (p.toLowerCase().startsWith(cwdFwd.toLowerCase() + "/")) {
    p = p.slice(cwdFwd.length + 1);
  }
  return p.replace(/^\/+/, "");
}

export function parseClaudeStream(ndjson: string, cwd: string): ClaudeStreamParse {
  const files_requested: FileRequest[] = [];
  const pending = new Map<string, PendingRead>();
  let result_text = "";
  let cli_cost_usd: number | null = null;
  let session_id: string | null = null;
  let num_turns: number | null = null;
  let model = "claude-code";
  let init: ClaudeInitMeta | null = null;
  let init_count = 0;
  let result_model: string | null = null;
  const completion_models: string[] = [];

  for (const raw of ndjson.split(/\r?\n/)) {
    if (!raw.trim()) continue;
    let row: unknown;
    try {
      row = JSON.parse(raw);
    } catch {
      continue;
    }
    if (!isRecord(row)) continue;
    if (row.type === "system" && row.subtype === "init") {
      init_count += 1;
      if (init_count === 1) {
        const initModel = typeof row.model === "string" ? row.model : "";
        const permissionMode = typeof row.permissionMode === "string" ? row.permissionMode : "";
        init = { model: initModel, tools: parseInitTools(row.tools), permissionMode };
        if (initModel) model = initModel;
        if (typeof row.session_id === "string") session_id = row.session_id;
      }
    }
    if (row.type === "assistant") {
      const message = isRecord(row.message) ? row.message : null;
      if (message && typeof message.model === "string") {
        addModel(completion_models, message.model);
      }
      for (const block of contentBlocks(row)) {
        if (block.type !== "tool_use" || block.name !== "Read") continue;
        const input = isRecord(block.input) ? block.input : {};
        const filePath = typeof input.file_path === "string" ? input.file_path : "";
        const rel = normalizeRelPath(filePath, cwd);
        const id = typeof block.id === "string" ? block.id : `anon-${files_requested.length}`;
        pending.set(id, { index: files_requested.length, path: rel });
        files_requested.push({ path: rel, ok: false });
      }
    }
    if (row.type === "user") {
      for (const block of contentBlocks(row)) {
        if (block.type !== "tool_result") continue;
        const id = typeof block.tool_use_id === "string" ? block.tool_use_id : "";
        const ok = block.is_error !== true;
        const hit = pending.get(id);
        if (!hit) continue;
        files_requested[hit.index] = { path: hit.path, ok };
        pending.delete(id);
      }
    }
    if (row.type === "result") {
      if (typeof row.result === "string") result_text = row.result;
      if (typeof row.total_cost_usd === "number") cli_cost_usd = row.total_cost_usd;
      if (typeof row.session_id === "string") session_id = row.session_id;
      if (typeof row.num_turns === "number") num_turns = row.num_turns;
      if (typeof row.model === "string") {
        result_model = row.model;
        model = row.model;
        addModel(completion_models, row.model);
      }
    }
  }

  const loaded_extras: string[] = [];
  for (const e of files_requested) {
    if (!e.ok) continue;
    if (e.path === "AGENTS.md") continue;
    if (loaded_extras.includes(e.path)) continue;
    loaded_extras.push(e.path);
  }

  return {
    result_text,
    files_requested,
    loaded_extras,
    cli_cost_usd,
    session_id,
    num_turns,
    model,
    init,
    init_count,
    result_model,
    completion_models,
  };
}

export function claudePilotLine(
  obs: Observation,
  _derived: ReturnType<typeof derive>,
  extra: {
    treatment: Treatment;
    cli_cost_usd: number | null;
    session_id: string | null;
    files_requested: FileRequest[];
    num_turns: number | null;
  },
): Record<string, unknown> {
  void _derived;
  const line = observationLine({ ...obs, usage: null, provider: "claude-code" });
  return {
    ...line,
    usage: null,
    treatment: extra.treatment,
    cli_cost_usd: extra.cli_cost_usd,
    session_id: extra.session_id,
    files_requested: extra.files_requested,
    num_turns: extra.num_turns,
  };
}

async function readRel(root: string, rel: string): Promise<string> {
  return readFile(path.join(root, rel), "utf8");
}

async function l0Prompt(root: string, task: Task): Promise<string> {
  const prefix = await Promise.all(PREFIX.map(async (p) => `## ${p}\n${await readRel(root, p)}`));
  const extras = await Promise.all(DUMP_EXTRAS.map(async (p) => `## ${p}\n${await readRel(root, p)}`));
  return `${prefix.join("\n\n")}\n\n${extras.join("\n\n")}\n\nTASK ${task.id}: ${task.prompt}`;
}

async function kPrompt(root: string, task: Task): Promise<string> {
  const prefix = await Promise.all(PREFIX.map(async (p) => `## ${p}\n${await readRel(root, p)}`));
  return `${prefix.join("\n\n")}\n\nTASK ${task.id}: ${task.prompt}`;
}

async function l1Prompt(root: string, task: Task, note?: string): Promise<string> {
  const agents = await readRel(root, "AGENTS.md");
  const turn = toolFirstTurn(agents, extraFileCap(EVAL_IN_PLAY), task);
  const body = turn.blocks.map((b) => b.text).join("\n\n");
  return note ? `${body}\n\n${note}` : body;
}

async function promptFor(root: string, task: Task, treatment: Treatment): Promise<string> {
  if (treatment === "L0") return l0Prompt(root, task);
  if (treatment === "K") return kPrompt(root, task);
  if (treatment === "L1o") return l1Prompt(root, task, oneFileCapNote());
  return l1Prompt(root, task);
}

function claudeBin(): string {
  if (process.platform !== "win32") return "claude";
  const candidates = [
    path.join(process.env.APPDATA ?? "", "npm", "node_modules", "@anthropic-ai", "claude-code", "bin", "claude.exe"),
    "D:\\Offload\\npm\\node_modules\\@anthropic-ai\\claude-code\\bin\\claude.exe",
  ];
  for (const c of candidates) {
    try {
      accessSync(c);
      return c;
    } catch {
      /* next */
    }
  }
  return "claude.exe";
}

async function installDocsHooks(cwd: string): Promise<void> {
  await mkdir(path.join(cwd, "hooks"), { recursive: true });
  await mkdir(path.join(cwd, ".claude"), { recursive: true });
  await copyFile(path.join(ROOT, "hooks", "docs-load.mjs"), path.join(cwd, "hooks", "docs-load.mjs"));
  await writeFile(path.join(cwd, ".claude", "settings.json"), docsHookSettings());
}

async function resetDocsHookState(cwd: string): Promise<void> {
  try {
    await unlink(path.join(cwd, ".sdd-hook-state.json"));
  } catch {
    /* first task, or already gone */
  }
}

export async function invokeClaude(opts: {
  cwd: string;
  prompt: string;
  tools: boolean;
  systemPrompt?: string;
  safeMode?: boolean;
  settingSources?: string;
  includeHookEvents?: boolean;
  sessionId?: string;
  model?: string;
  disallowedTools?: string;
}): Promise<string> {
  const args = [
    "-p",
    opts.prompt,
    "--output-format",
    "stream-json",
    "--verbose",
    "--permission-mode",
    "dontAsk",
    "--no-session-persistence",
    "--disable-slash-commands",
    "--system-prompt",
    opts.systemPrompt ?? INSTRUCT,
  ];
  if (opts.safeMode !== false) args.push("--safe-mode");
  if (opts.settingSources) args.push("--setting-sources", opts.settingSources);
  if (opts.includeHookEvents) args.push("--include-hook-events");
  if (opts.sessionId) args.push("--session-id", opts.sessionId);
  args.push("--model", opts.model ?? BENCH_MODEL);
  if (!opts.tools) {
    args.push("--tools", "", "--disallowedTools", opts.disallowedTools ?? DENY_MCP);
  } else {
    args.push(
      "--tools",
      "Read",
      "--allowedTools",
      "Read",
      "--disallowedTools",
      opts.disallowedTools ?? DENY_TOOL_TREATMENT,
    );
  }
  return await new Promise((resolve, reject) => {
    const child = spawn(claudeBin(), args, {
      cwd: opts.cwd,
      windowsHide: true,
    });
    let out = "";
    let err = "";
    child.stdout.on("data", (buf: Buffer) => {
      out += buf.toString("utf8");
    });
    child.stderr.on("data", (buf: Buffer) => {
      err += buf.toString("utf8");
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0 && !out.includes('"type":"result"')) {
        reject(new Error(`claude exit ${code}: ${err || out.slice(-500)}`));
        return;
      }
      resolve(out);
    });
  });
}

function observationFromParse(opts: {
  task: Task;
  treatment: Treatment;
  parsed: ClaudeStreamParse;
}): Observation {
  const parsedAns = parseCiteAnswer(opts.parsed.result_text);
  const loaded =
    opts.treatment === "L0"
      ? [...PREFIX, ...DUMP_EXTRAS]
      : opts.treatment === "K"
        ? [...PREFIX]
        : ["AGENTS.md", ...opts.parsed.loaded_extras];
  return {
    task_id: opts.task.id,
    arm: scoringArm(opts.treatment),
    answer: parsedAns.answer,
    cited_path: parsedAns.cited_path,
    loaded_paths: loaded,
    eval_in_play: EVAL_IN_PLAY,
    usage: null,
    model: opts.parsed.model,
    provider: "claude-code",
    refused_paths: [],
  };
}

export type EvalArtifactPaths = {
  rawDir: string;
  summaryPath: string;
  stagingRaw: string;
  stagingSummary: string;
  backupRaw: string;
  backupSummary: string;
};

export function evalArtifactPaths(outDir: string, outName: string, invocationId: string): EvalArtifactPaths {
  return {
    rawDir: path.join(outDir, outName),
    summaryPath: path.join(outDir, `${outName}.jsonl`),
    stagingRaw: path.join(outDir, `${outName}.staging-${invocationId}`),
    stagingSummary: path.join(outDir, `${outName}.jsonl.staging-${invocationId}`),
    backupRaw: path.join(outDir, `${outName}.backup-${invocationId}`),
    backupSummary: path.join(outDir, `${outName}.jsonl.backup-${invocationId}`),
  };
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function rmForce(p: string, dir: boolean): Promise<void> {
  await rm(p, { recursive: dir, force: true });
}

/**
 * Same-filesystem rename swap. Back up finals, install staging, restore on error.
 * `failAfter` is a test hook only.
 */
export async function commitEvalArtifacts(
  paths: EvalArtifactPaths,
  opts?: { failAfter?: "backup" | "install-raw" | "install-summary" },
): Promise<void> {
  let backedUpRaw = false;
  let backedUpSummary = false;
  let installedRaw = false;
  let installedSummary = false;
  let committed = false;
  try {
    if (await pathExists(paths.rawDir)) {
      await rename(paths.rawDir, paths.backupRaw);
      backedUpRaw = true;
    }
    if (await pathExists(paths.summaryPath)) {
      await rename(paths.summaryPath, paths.backupSummary);
      backedUpSummary = true;
    }
    if (opts?.failAfter === "backup") throw new Error("simulated install failure");

    await rename(paths.stagingRaw, paths.rawDir);
    installedRaw = true;
    if (opts?.failAfter === "install-raw") throw new Error("simulated install failure");

    await rename(paths.stagingSummary, paths.summaryPath);
    installedSummary = true;
    if (opts?.failAfter === "install-summary") throw new Error("simulated install failure");

    committed = true;
  } catch (err) {
    try {
      if (installedRaw) await rmForce(paths.rawDir, true);
      if (installedSummary) await rmForce(paths.summaryPath, false);
      if (backedUpRaw) await rename(paths.backupRaw, paths.rawDir);
      if (backedUpSummary) await rename(paths.backupSummary, paths.summaryPath);
    } catch (rollbackErr) {
      const a = err instanceof Error ? err.message : String(err);
      const b = rollbackErr instanceof Error ? rollbackErr.message : String(rollbackErr);
      throw new Error(`commit failed: ${a}; rollback failed: ${b}`);
    }
    throw err;
  } finally {
    await rmForce(paths.stagingRaw, true);
    await rmForce(paths.stagingSummary, false);
    if (committed) {
      await rmForce(paths.backupRaw, true);
      await rmForce(paths.backupSummary, false);
    }
  }
}

export async function runClaudeTreatments(opts: {
  treatments: readonly Treatment[];
  ids?: readonly string[];
  outName: string;
  label: string;
}): Promise<void> {
  const ids = new Set(opts.ids ?? PILOT_IDS);
  const tasks = loadTasks(await readFile(TASKS_PATH, "utf8")).filter((t) => ids.has(t.id));
  if (tasks.length !== ids.size) {
    throw new Error(`ids missing from yaml: ${[...ids].filter((id) => !tasks.some((t) => t.id === id)).join(",")}`);
  }
  const { cp } = await import("node:fs/promises");
  const outDir = path.join(ROOT, "evals");
  const artifacts = evalArtifactPaths(outDir, opts.outName, randomUUID());
  const lines: string[] = [];

  console.log(`${opts.label} throwaway. not KEEP. cli_cost_usd is a client-side estimate.`);

  await mkdir(outDir, { recursive: true });
  await mkdir(artifacts.stagingRaw, { recursive: true });
  try {
    for (const treatment of opts.treatments) {
      const cwd = await mkdtemp(path.join(os.tmpdir(), `sdd-eval-${treatment}-`));
      await mkdir(cwd, { recursive: true });
      await cp(FIXTURE, cwd, { recursive: true });
      if (treatment === "L1n") {
        const agents = await readRel(cwd, "AGENTS.md");
        await writeFile(path.join(cwd, "AGENTS.md"), namedMap(agents));
      }
      if (treatment === "L1j") {
        await writeFile(path.join(cwd, "AGENTS.md"), jobMap());
      }
      if (treatment === "L1h") {
        await installDocsHooks(cwd);
      }
      console.log(`treatment=${treatment} cwd=${cwd}`);
      for (const task of tasks) {
        if (treatment === "L1h") await resetDocsHookState(cwd);
        const prompt = await promptFor(cwd, task, treatment);
        const ndjson = await invokeClaude({
          cwd,
          prompt,
          tools: usesTools(treatment),
          systemPrompt: treatment === "L1e" ? exactSystemPrompt() : INSTRUCT,
          safeMode: treatment !== "L1h",
          settingSources: treatment === "L1h" ? "project" : undefined,
          includeHookEvents: treatment === "L1h",
          sessionId: treatment === "L1h" ? randomUUID() : undefined,
        });
        const parsed = parseClaudeStream(ndjson, cwd);
        try {
          assertCleanClaudeInit(parsed, treatment);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          throw new Error(`${task.id} ${msg}`);
        }
        if (!parsed.session_id) {
          throw new Error(`${task.id} ${treatment}: no Claude result. head=${JSON.stringify(ndjson.slice(0, 180))}`);
        }
        await writeFile(path.join(artifacts.stagingRaw, `${task.id}-${treatment}.ndjson`), ndjson);
        const obs = observationFromParse({ task, treatment, parsed });
        const d = derive(obs, task);
        const line = claudePilotLine(obs, d, {
          treatment,
          cli_cost_usd: parsed.cli_cost_usd,
          session_id: parsed.session_id,
          files_requested: parsed.files_requested,
          num_turns: parsed.num_turns,
        });
        lines.push(JSON.stringify(line));
        console.log(
          `${task.id} ${treatment} gold=${d.gold_ok} cap=${d.cap_obey} success=${d.task_success}` +
            ` cites=${d.cites_ok} $call1=omitted` +
            (parsed.cli_cost_usd !== null ? ` cli_cost_usd=${parsed.cli_cost_usd}` : "") +
            ` loaded=${obs.loaded_paths.join(",")}`,
        );
      }
    }

    await writeFile(artifacts.stagingSummary, lines.join("\n") + "\n");
    await commitEvalArtifacts(artifacts);
    console.log(`wrote ${artifacts.summaryPath} (gitignored). microbench. not KEEP.`);
  } finally {
    await rm(artifacts.stagingRaw, { recursive: true, force: true });
    await rm(artifacts.stagingSummary, { force: true });
  }
}

export async function runClaudePilot(opts?: { ids?: readonly string[] }): Promise<void> {
  await runClaudeTreatments({
    treatments: ["L0", "L1"],
    ids: opts?.ids,
    outName: "claude-pilot",
    label: "claude-code print-mode pilot.",
  });
}

export async function runClaudeWave2(): Promise<void> {
  for (const row of WAVE2_RUN) {
    await runClaudeTreatments({
      treatments: [row.treatment],
      ids: row.ids,
      outName: `claude-wave2-${row.treatment}`,
      label: `wave2 ${row.treatment}.${row.treatment === "L1n" ? " cheat-probe, not cookbook." : ""}`,
    });
  }
}

export async function runClaudeWave3(): Promise<void> {
  for (const row of WAVE3_RUN) {
    await runClaudeTreatments({
      treatments: [row.treatment],
      ids: row.ids,
      outName: `claude-wave3-${row.treatment}`,
      label: "wave3 L1j. job-routed copy map, not KEEP, not the fixture.",
    });
  }
}

export async function runClaudeWave4(): Promise<void> {
  for (const row of WAVE4_RUN) {
    await runClaudeTreatments({
      treatments: [row.treatment],
      ids: row.ids,
      outName: `claude-wave4-${row.treatment}`,
      label: "wave4 L1h. docs-load hooks on the copy only. not KEEP. not this repo's live hooks.",
    });
  }
}

const entry = process.argv[1] && path.basename(process.argv[1]) === "claude-cli.ts";
if (entry) {
  const wave =
    process.argv[2] === "wave4"
      ? runClaudeWave4
      : process.argv[2] === "wave3"
        ? runClaudeWave3
        : process.argv[2] === "wave2"
          ? runClaudeWave2
          : runClaudePilot;
  wave().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
