import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import {
  bucketsFromOpenAI,
  call1_dollars,
  cap_obey,
  cites_ok,
  extraFileCap,
  gold_ok,
  GPT_4O_MINI_RATES,
  isOpenAIUsage,
  refuse_count,
  task_success,
  type Arm,
  type Observation,
  type OpenAIRates,
  type OpenAIUsageBuckets,
  type Provider,
  type Rates,
  type Task,
  type UsageBuckets,
} from "./schema.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE = path.join(ROOT, "fixtures", "product");
const TASKS_PATH = path.join(ROOT, "sdd-eval-tasks.yaml");
const EVAL_MD = path.join(ROOT, "docs", "eval.md");
const README = path.join(ROOT, "README.md");

const MAP_NAMED = [
  "README.md",
  "docs/architecture.md",
  "docs/design.md",
  "docs/eval.md",
] as const;

export const PREFIX = ["AGENTS.md", ...MAP_NAMED] as const;

export const DUMP_EXTRAS = [
  "docs/changelog.md",
  "docs/ops-noise.md",
  "docs/decisions/001-preempt-lease.md",
] as const;

const ALLOWLIST = new Set<string>([
  "AGENTS.md",
  "README.md",
  "docs/architecture.md",
  "docs/design.md",
  "docs/eval.md",
  "docs/decisions/001-preempt-lease.md",
]);

const ADR = "docs/decisions/001-preempt-lease.md";
const EVAL_IN_PLAY = true;

export type CapMode = "prompt" | "mechanical";
export const CAP_REFUSE = "cap: refuse";

export function capModeFromEnv(env: NodeJS.ProcessEnv = process.env): CapMode {
  const raw = env.SDD_CAP;
  if (raw === undefined || raw === "" || raw === "prompt") return "prompt";
  if (raw === "mechanical") return "mechanical";
  throw new Error(`SDD_CAP must be prompt or mechanical, got ${JSON.stringify(raw)}`);
}

export function extraSlotsUsed(loaded: Iterable<string>): number {
  return [...loaded].filter((p) => p !== "AGENTS.md").length;
}

export function toolFirstTurn(agents: string, extraCap: number, task: Task): {
  role: "user";
  blocks: { text: string; cache?: boolean }[];
} {
  return {
    role: "user",
    blocks: [
      { text: `## AGENTS.md\n${agents}`, cache: true },
      {
        text: `L1 cap: AGENTS.md + at most ${extraCap} files (eval.md in play).\n\nTASK ${task.id}: ${task.prompt}`,
      },
    ],
  };
}

export async function applyCapRead(opts: {
  mode: CapMode;
  loaded: Set<string>;
  refused: string[];
  rel: string;
  extraCap: number;
  read: (rel: string) => Promise<string>;
}): Promise<string> {
  if (opts.loaded.has(opts.rel)) {
    try {
      return await opts.read(opts.rel);
    } catch {
      return `missing: ${opts.rel}`;
    }
  }
  if (opts.mode === "mechanical" && extraSlotsUsed(opts.loaded) >= opts.extraCap) {
    opts.refused.push(opts.rel);
    return CAP_REFUSE;
  }
  opts.loaded.add(opts.rel);
  try {
    return await opts.read(opts.rel);
  } catch {
    return `missing: ${opts.rel}`;
  }
}

export function liveJsonlRel(mode: CapMode, existing: ReadonlySet<string>, at: Date = new Date()): string {
  const preferred = mode === "mechanical" ? "run-mechanical-cap.jsonl" : "run.jsonl";
  if (!existing.has(preferred)) return preferred;
  const iso = at.toISOString();
  const stem = mode === "mechanical" ? "run-mechanical-cap" : "run";
  let name = `${stem}-${iso}.jsonl`;
  let n = 2;
  while (existing.has(name)) {
    name = `${stem}-${iso}-${n}.jsonl`;
    n += 1;
  }
  return name;
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

export async function resolveLiveJsonlPath(outDir: string, mode: CapMode, at: Date = new Date()): Promise<string> {
  const existing = new Set<string>();
  const preferred = liveJsonlRel(mode, existing, at);
  const preferredFull = path.join(outDir, preferred);
  if (!(await fileExists(preferredFull))) return preferredFull;
  existing.add(preferred);
  const next = liveJsonlRel(mode, existing, at);
  if (mode === "mechanical" && next === "run.jsonl") {
    throw new Error("mechanical-cap must not write evals/run.jsonl");
  }
  return path.join(outDir, next);
}

const RATES: Record<string, Rates> = {
  "claude-sonnet-4-20250514": {
    write_5m: 3.75e-6,
    write_1h: 6e-6,
    read: 0.3e-6,
    uncached: 3e-6,
    output: 15e-6,
  },
  "claude-haiku-4-5-20251001": {
    write_5m: 1.25e-6,
    write_1h: 2e-6,
    read: 0.1e-6,
    uncached: 1e-6,
    output: 5e-6,
  },
};

const OPENAI_RATES: Record<string, OpenAIRates> = {
  "gpt-4o-mini": GPT_4O_MINI_RATES,
  "gpt-4o-mini-2024-07-18": GPT_4O_MINI_RATES,
};

export function sha256File(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function loadTasks(raw: string): Task[] {
  const doc = parseYaml(raw) as { tasks?: unknown };
  if (!doc || !Array.isArray(doc.tasks)) throw new Error("sdd-eval-tasks.yaml: missing tasks array");
  const tasks: Task[] = [];
  const ids = new Set<string>();
  for (const row of doc.tasks) {
    if (!row || typeof row !== "object") throw new Error("task row is not an object");
    const t = row as Record<string, unknown>;
    for (const key of ["cap_obey", "cites_ok", "task_success", "refuse_count"] as const) {
      if (key in t) throw new Error(`do not store ${key}; derive it`);
    }
    if (typeof t.id !== "string" || typeof t.prompt !== "string" || typeof t.gold !== "string") {
      throw new Error("task missing id/prompt/gold");
    }
    if (t.stratum !== "prefix-gold" && t.stratum !== "missing-slice") {
      throw new Error(`${t.id}: bad stratum`);
    }
    if (typeof t.expected_path !== "string") throw new Error(`${t.id}: missing expected_path`);
    if (ids.has(t.id)) throw new Error(`duplicate id ${t.id}`);
    ids.add(t.id);
    tasks.push({
      id: t.id,
      stratum: t.stratum,
      prompt: t.prompt,
      gold: t.gold,
      expected_path: t.expected_path,
    });
  }
  return tasks;
}

async function readFixture(rel: string): Promise<string> {
  return readFile(path.join(FIXTURE, rel), "utf8");
}

export async function check(opts?: { tasksRaw?: string; evalMd?: string; readme?: string }): Promise<{
  n: number;
  prefixGold: number;
  missingSlice: number;
  sha256: string;
}> {
  const tasksRaw = opts?.tasksRaw ?? (await readFile(TASKS_PATH, "utf8"));
  const evalMd = opts?.evalMd ?? (await readFile(EVAL_MD, "utf8"));
  const readme = opts?.readme ?? (await readFile(README, "utf8"));
  const tasks = loadTasks(tasksRaw);
  const sha256 = sha256File(new TextEncoder().encode(tasksRaw));

  const prefixGold = tasks.filter((t) => t.stratum === "prefix-gold");
  const missingSlice = tasks.filter((t) => t.stratum === "missing-slice");
  const n = tasks.length;

  const mapTexts = Object.fromEntries(
    await Promise.all(MAP_NAMED.map(async (p) => [p, await readFixture(p)] as const)),
  );
  const agents = await readFixture("AGENTS.md");
  const treeFiles = [...PREFIX, ...DUMP_EXTRAS];
  const treeText = Object.fromEntries(
    await Promise.all(treeFiles.map(async (p) => [p, await readFixture(p)] as const)),
  );

  if (!agents.includes("docs/architecture.md") || !agents.includes("docs/design.md") || !agents.includes("docs/eval.md")) {
    throw new Error("AGENTS.md must name architecture, design, eval");
  }
  if (/decisions|001-preempt|ADR/i.test(agents)) {
    throw new Error("AGENTS.md must stay silent on the ADR");
  }

  const goldSeen = new Map<string, string>();
  for (const t of tasks) {
    const home = treeText[t.expected_path];
    if (home === undefined) throw new Error(`${t.id}: expected_path ${t.expected_path} not in fixture`);
    if (!home.includes(t.gold)) throw new Error(`${t.id}: gold not in ${t.expected_path}`);
    const hits = treeFiles.filter((p) => treeText[p].includes(t.gold));
    if (hits.length !== 1 || hits[0] !== t.expected_path) {
      throw new Error(`${t.id}: gold must live only in ${t.expected_path}, found ${hits.join(",")}`);
    }
    const prev = goldSeen.get(t.gold);
    if (prev) throw new Error(`gold ${t.gold} reused by ${prev} and ${t.id}`);
    goldSeen.set(t.gold, t.id);
    if (t.stratum === "prefix-gold" && !(MAP_NAMED as readonly string[]).includes(t.expected_path)) {
      throw new Error(`${t.id}: prefix-gold must sit in a map-named file`);
    }
    if (t.stratum === "missing-slice") {
      if (t.expected_path !== ADR) throw new Error(`${t.id}: missing-slice gold must be the unnamed ADR`);
      for (const p of MAP_NAMED) {
        if (mapTexts[p].includes(t.gold)) throw new Error(`${t.id}: missing-slice gold leaked into ${p}`);
      }
    }
  }

  if (/cratewake/i.test(evalMd)) throw new Error("docs/eval.md must not name cratewake");
  if (evalMd.includes(sha256)) throw new Error("docs/eval.md must not pin the microbench tasks hash");
  if (/fixtures\/product/i.test(evalMd)) throw new Error("docs/eval.md must not pin the microbench fixture");
  if (/microbench/i.test(evalMd)) throw new Error("docs/eval.md is the KEEP rule, not the microbench");
  if (/trial 1 KEEP/i.test(evalMd)) throw new Error("do not write trial 1 KEEP");
  if (/mechanical-cap/i.test(evalMd)) throw new Error("docs/eval.md must not name mechanical-cap");
  if (/L1-gated/i.test(evalMd)) throw new Error("docs/eval.md must not name L1-gated");
  if (!/no KEEP subject/.test(evalMd)) throw new Error("docs/eval.md subject pin must be no KEEP subject");
  if (!/\$call1.*=.*billed \$ through the first scored answer/s.test(evalMd)) {
    throw new Error("docs/eval.md lost the $call1 definition");
  }
  if (!/provider's billed buckets \(OpenAI or Anthropic\)/.test(evalMd)) {
    throw new Error("docs/eval.md $ must be provider billed buckets (OpenAI or Anthropic)");
  }
  if (!/## W3 — cites vs gold/.test(evalMd)) throw new Error("docs/eval.md lost W3");
  if (!/microbench/i.test(readme)) throw new Error("README must label this checkout a microbench");
  if (!readme.includes(sha256)) throw new Error("README must carry the microbench tasks hash (not a KEEP pin)");
  if (/trial 1 KEEP/i.test(readme)) throw new Error("do not write trial 1 KEEP");
  if (/L1-gated/i.test(readme)) throw new Error("do not call it L1-gated");
  if (/same L1/.test(readme)) throw new Error("do not describe mechanical-cap as same L1");
  if (!/harness enforcement log/.test(readme)) {
    throw new Error("README must call mechanical-cap a harness enforcement log");
  }
  if (!/not allowlist\+cap/.test(readme)) {
    throw new Error("README must say mechanical-cap is not allowlist+cap");
  }
  if (!readme.includes("OPENAI_API_KEY")) {
    throw new Error("README must say how to run with OPENAI_API_KEY");
  }

  return { n, prefixGold: prefixGold.length, missingSlice: missingSlice.length, sha256 };
}

export function parseCiteAnswer(text: string): { cited_path: string | null; answer: string } {
  const cite = text.match(/^CITE:\s*(.+)$/m);
  const ans = text.match(/^ANSWER:\s*(.+)$/m);
  return {
    cited_path: cite ? cite[1].trim() : null,
    answer: ans ? ans[1].trim() : text,
  };
}

type Usage = UsageBuckets | OpenAIUsageBuckets;
type ToolUse = { id: string; name: string; input: Record<string, unknown> };
type UserBlock = { text: string; cache?: boolean };
type HistoryItem =
  | { role: "user"; blocks: UserBlock[] }
  | { role: "assistant"; text: string; toolUses: ToolUse[]; anthropicContent?: AnthropicContent[] }
  | { role: "tool_results"; results: { id: string; content: string }[] };

function emptyUsage(provider: Provider, ttl: "5m" | "1h"): Usage {
  if (provider === "openai") return { prompt_tokens: 0, completion_tokens: 0, cached_tokens: 0 };
  return {
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
    input_tokens: 0,
    output_tokens: 0,
    cache_ttl: ttl,
  };
}

function addUsage(into: Usage, part: Usage): void {
  if (isOpenAIUsage(into) && isOpenAIUsage(part)) {
    into.prompt_tokens += part.prompt_tokens;
    into.completion_tokens += part.completion_tokens;
    into.cached_tokens += part.cached_tokens;
    return;
  }
  if (!isOpenAIUsage(into) && !isOpenAIUsage(part)) {
    into.cache_creation_input_tokens += part.cache_creation_input_tokens;
    into.cache_read_input_tokens += part.cache_read_input_tokens;
    into.input_tokens += part.input_tokens;
    into.output_tokens += part.output_tokens;
  }
}

function bucketsFromAnthropic(usage: Record<string, unknown> | undefined, ttl: "5m" | "1h"): UsageBuckets {
  const create =
    (Number(usage?.cache_creation_input_tokens) || 0) +
    (typeof usage?.cache_creation === "object" && usage.cache_creation
      ? Number((usage.cache_creation as { ephemeral_5m_input_tokens?: number }).ephemeral_5m_input_tokens) || 0
      : 0);
  return {
    cache_creation_input_tokens: create,
    cache_read_input_tokens: Number(usage?.cache_read_input_tokens) || 0,
    input_tokens: Number(usage?.input_tokens) || 0,
    output_tokens: Number(usage?.output_tokens) || 0,
    cache_ttl: ttl,
  };
}

type AnthropicContent =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> };

async function anthropic(apiKey: string, body: unknown): Promise<{ content: AnthropicContent[]; usage: Record<string, unknown> }> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { content?: AnthropicContent[]; usage?: Record<string, unknown>; error?: { message?: string } };
  if (!res.ok) throw new Error(json.error?.message ?? `anthropic HTTP ${res.status}`);
  return { content: json.content ?? [], usage: json.usage ?? {} };
}

type OpenAIToolCall = { id: string; function?: { name?: string; arguments?: string } };
type OpenAIMessage = { content?: string | null; tool_calls?: OpenAIToolCall[] };

async function openai(
  apiKey: string,
  body: unknown,
): Promise<{ message: OpenAIMessage; usage: Record<string, unknown> }> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as {
    choices?: { message?: OpenAIMessage }[];
    usage?: Record<string, unknown>;
    error?: { message?: string };
  };
  if (!res.ok) throw new Error(json.error?.message ?? `openai HTTP ${res.status}`);
  return { message: json.choices?.[0]?.message ?? {}, usage: json.usage ?? {} };
}

export const INSTRUCT = `Cite one path. Answer with the exact token from that file.
Format:
CITE: relative/path.md
ANSWER: token`;

const ANTHROPIC_TOOLS = [
  {
    name: "read_file",
    description: "Read one allowlisted fixture file. Path relative to fixture root.",
    input_schema: {
      type: "object",
      properties: { path: { type: "string" } },
      required: ["path"],
    },
  },
];

const OPENAI_TOOLS = [
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read one allowlisted fixture file. Path relative to fixture root.",
      parameters: {
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"],
      },
    },
  },
];

function parseOpenAIInput(argumentsJson: string | undefined): Record<string, unknown> {
  try {
    const parsed = JSON.parse(argumentsJson ?? "{}") as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

async function completeRound(opts: {
  provider: Provider;
  apiKey: string;
  model: string;
  history: HistoryItem[];
  withTools: boolean;
  maxTokens: number;
  ttl: "5m" | "1h";
}): Promise<{ text: string; toolUses: ToolUse[]; usage: Usage; anthropicContent?: AnthropicContent[] }> {
  if (opts.provider === "openai") {
    const messages: unknown[] = [{ role: "system", content: INSTRUCT }];
    for (const item of opts.history) {
      if (item.role === "user") {
        messages.push({ role: "user", content: item.blocks.map((b) => b.text).join("\n\n") });
      } else if (item.role === "assistant") {
        const msg: Record<string, unknown> = { role: "assistant", content: item.text || null };
        if (item.toolUses.length) {
          msg.tool_calls = item.toolUses.map((tu) => ({
            id: tu.id,
            type: "function",
            function: { name: tu.name, arguments: JSON.stringify(tu.input) },
          }));
        }
        messages.push(msg);
      } else {
        for (const r of item.results) {
          messages.push({ role: "tool", tool_call_id: r.id, content: r.content });
        }
      }
    }
    const body: Record<string, unknown> = { model: opts.model, max_tokens: opts.maxTokens, messages };
    if (opts.withTools) body.tools = OPENAI_TOOLS;
    const resp = await openai(opts.apiKey, body);
    const toolUses: ToolUse[] = (resp.message.tool_calls ?? []).map((tc) => ({
      id: tc.id,
      name: tc.function?.name ?? "read_file",
      input: parseOpenAIInput(tc.function?.arguments),
    }));
    return {
      text: resp.message.content ?? "",
      toolUses,
      usage: bucketsFromOpenAI(resp.usage),
    };
  }

  const messages: unknown[] = [];
  for (const item of opts.history) {
    if (item.role === "user") {
      messages.push({
        role: "user",
        content: item.blocks.map((b) => ({
          type: "text",
          text: b.text,
          ...(b.cache ? { cache_control: { type: "ephemeral" as const } } : {}),
        })),
      });
    } else if (item.role === "assistant") {
      messages.push({
        role: "assistant",
        content: item.anthropicContent ?? [
          ...(item.text ? [{ type: "text" as const, text: item.text }] : []),
          ...item.toolUses.map((tu) => ({
            type: "tool_use" as const,
            id: tu.id,
            name: tu.name,
            input: tu.input,
          })),
        ],
      });
    } else {
      messages.push({
        role: "user",
        content: item.results.map((r) => ({
          type: "tool_result",
          tool_use_id: r.id,
          content: r.content,
        })),
      });
    }
  }
  const body: Record<string, unknown> = {
    model: opts.model,
    max_tokens: opts.maxTokens,
    system: [{ type: "text", text: INSTRUCT, cache_control: { type: "ephemeral" } }],
    messages,
  };
  if (opts.withTools) body.tools = ANTHROPIC_TOOLS;
  const resp = await anthropic(opts.apiKey, body);
  const toolUses = resp.content
    .filter((c): c is Extract<AnthropicContent, { type: "tool_use" }> => c.type === "tool_use")
    .map((c) => ({ id: c.id, name: c.name, input: c.input }));
  return {
    text: resp.content.filter((c) => c.type === "text").map((c) => c.text).join("\n"),
    toolUses,
    usage: bucketsFromAnthropic(resp.usage, opts.ttl),
    anthropicContent: resp.content,
  };
}

async function runArm(opts: {
  provider: Provider;
  apiKey: string;
  model: string;
  task: Task;
  arm: Arm;
}): Promise<Observation> {
  const ttl: "5m" | "1h" = "5m";
  const usage = emptyUsage(opts.provider, ttl);
  const loaded = new Set<string>();
  const extraCap = extraFileCap(EVAL_IN_PLAY);
  const roundOpts = {
    provider: opts.provider,
    apiKey: opts.apiKey,
    model: opts.model,
    ttl,
  };

  if (opts.arm === "L0") {
    const prefix = await Promise.all(
      PREFIX.map(async (p) => `## ${p}\n${await readFixture(p)}`),
    );
    const extras = await Promise.all(
      DUMP_EXTRAS.map(async (p) => `## ${p}\n${await readFixture(p)}`),
    );
    for (const p of PREFIX) loaded.add(p);
    for (const p of DUMP_EXTRAS) loaded.add(p);
    const resp = await completeRound({
      ...roundOpts,
      history: [
        {
          role: "user",
          blocks: [
            { text: prefix.join("\n\n"), cache: true },
            { text: `${extras.join("\n\n")}\n\nTASK ${opts.task.id}: ${opts.task.prompt}` },
          ],
        },
      ],
      withTools: false,
      maxTokens: 256,
    });
    addUsage(usage, resp.usage);
    const parsed = parseCiteAnswer(resp.text);
    return {
      task_id: opts.task.id,
      arm: "L0",
      answer: parsed.answer,
      cited_path: parsed.cited_path,
      loaded_paths: [...loaded],
      eval_in_play: EVAL_IN_PLAY,
      usage,
      model: opts.model,
      provider: opts.provider,
      refused_paths: [],
    };
  }

  const capMode: CapMode = opts.arm === "mechanical-cap" ? "mechanical" : "prompt";
  loaded.add("AGENTS.md");
  const agents = await readFixture("AGENTS.md");
  const history: HistoryItem[] = [toolFirstTurn(agents, extraCap, opts.task)];
  const refused: string[] = [];

  let text = "";
  for (let round = 0; round < 8; round++) {
    const resp = await completeRound({
      ...roundOpts,
      history,
      withTools: true,
      maxTokens: 512,
    });
    addUsage(usage, resp.usage);
    text = resp.text;
    if (resp.toolUses.length === 0) break;
    history.push({
      role: "assistant",
      text: resp.text,
      toolUses: resp.toolUses,
      anthropicContent: resp.anthropicContent,
    });
    const results = [];
    for (const tu of resp.toolUses) {
      const rel = String(tu.input.path ?? "").replace(/^\.\//, "");
      const content = await applyCapRead({
        mode: capMode,
        loaded,
        refused,
        rel,
        extraCap,
        read: readFixture,
      });
      results.push({ id: tu.id, content });
    }
    history.push({ role: "tool_results", results });
  }

  const parsed = parseCiteAnswer(text);
  return {
    task_id: opts.task.id,
    arm: opts.arm === "mechanical-cap" ? "mechanical-cap" : "L1",
    answer: parsed.answer,
    cited_path: parsed.cited_path,
    loaded_paths: [...loaded],
    eval_in_play: EVAL_IN_PLAY,
    usage,
    model: opts.model,
    provider: opts.provider,
    refused_paths: refused,
  };
}

export function observationLine(obs: Observation): Record<string, unknown> {
  return {
    task_id: obs.task_id,
    arm: obs.arm,
    answer: obs.answer,
    cited_path: obs.cited_path,
    loaded_paths: obs.loaded_paths,
    eval_in_play: obs.eval_in_play,
    usage: obs.usage,
    model: obs.model,
    provider: obs.provider,
    refused_paths: obs.refused_paths,
  };
}

/** $call1 keys rates off obs.model. envModel / process.env are ignored. Unknown model → null. */
export function derive(obs: Observation, task: Task, envModel?: string): {
  cap_obey: boolean;
  cites_ok: boolean;
  gold_ok: boolean;
  task_success: boolean;
  call1_dollars: number | null;
  refuse_count: number;
} {
  void envModel;
  const modelId = typeof obs.model === "string" ? obs.model.trim() : "";
  let dollars: number | null = null;
  if (obs.usage && modelId) {
    if (obs.provider === "openai" && isOpenAIUsage(obs.usage)) {
      const rates = OPENAI_RATES[modelId];
      dollars = rates ? call1_dollars(obs.usage, rates) : null;
    } else if (obs.provider === "anthropic" && !isOpenAIUsage(obs.usage)) {
      const rates = RATES[modelId];
      dollars = rates ? call1_dollars(obs.usage, rates) : null;
    }
  }
  return {
    cap_obey: cap_obey(obs, ALLOWLIST),
    cites_ok: cites_ok(obs, task),
    gold_ok: gold_ok(obs.answer, task.gold),
    task_success: task_success(obs, task, ALLOWLIST),
    call1_dollars: dollars,
    refuse_count: refuse_count(obs),
  };
}

function usageLog(obs: Observation): string {
  if (!obs.usage) return "";
  if (isOpenAIUsage(obs.usage)) {
    return ` prompt_tokens=${obs.usage.prompt_tokens} completion_tokens=${obs.usage.completion_tokens} cached_tokens=${obs.usage.cached_tokens}`;
  }
  return (
    ` cache_creation_input_tokens=${obs.usage.cache_creation_input_tokens}` +
    ` cache_read_input_tokens=${obs.usage.cache_read_input_tokens}` +
    ` input_tokens=${obs.usage.input_tokens}` +
    ` output_tokens=${obs.usage.output_tokens}`
  );
}

async function runLive(): Promise<void> {
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  let provider: Provider;
  let apiKey: string;
  let model: string;
  if (openaiKey) {
    provider = "openai";
    apiKey = openaiKey;
    model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  } else if (anthropicKey) {
    provider = "anthropic";
    apiKey = anthropicKey;
    model = process.env.MODEL ?? "claude-haiku-4-5-20251001";
  } else {
    throw new Error("no OPENAI_API_KEY or ANTHROPIC_API_KEY; stub path is `npm run check`. will not fake billed $");
  }
  const capMode = capModeFromEnv();
  console.log(`model=${model} cap=${capMode}`);
  const tasks = loadTasks(await readFile(TASKS_PATH, "utf8"));
  const outDir = path.join(ROOT, "evals");
  await mkdir(outDir, { recursive: true });
  const outPath = await resolveLiveJsonlPath(outDir, capMode);
  if (capMode === "mechanical" && path.basename(outPath) === "run.jsonl") {
    throw new Error("mechanical-cap must not overwrite evals/run.jsonl");
  }
  const toolArm: Arm = capMode === "mechanical" ? "mechanical-cap" : "L1";
  const lines: string[] = [];
  for (const task of tasks) {
    for (const arm of ["L0", toolArm] as const) {
      const obs = await runArm({ provider, apiKey, model, task, arm });
      const line = observationLine(obs);
      if ("refuse_count" in line) throw new Error("do not store refuse_count on JSONL");
      lines.push(JSON.stringify(line));
      const d = derive(obs, task, model);
      console.log(
        `${task.id} ${arm} gold=${d.gold_ok} cap=${d.cap_obey} success=${d.task_success}` +
          ` refused=${d.refuse_count}` +
          (d.call1_dollars !== null ? ` $call1=${d.call1_dollars}` : " $call1=omitted") +
          usageLog(obs),
      );
    }
  }
  await writeFile(outPath, lines.join("\n") + "\n");
  console.log(`wrote ${outPath} (gitignored). microbench. not KEEP.`);
}

/** Dangling map bullets and dead links in this repo's own docs. */
async function lintDocsHere(): Promise<void> {
  const { formatIssues, lintDocs } = await import("./docs-lint.ts");
  const issues = await lintDocs({
    root: ROOT,
    map: "AGENTS.md",
    docs: ["README.md", "TROYS-SDD.md", "docs/eval.md"],
  });
  if (issues.length) throw new Error(`docs lint:\n${formatIssues(issues)}`);
  console.log("docs lint ok: map bullets and links resolve.");
}

async function main(): Promise<void> {
  const cmd = process.argv[2] ?? "check";
  if (cmd === "lint-docs") {
    await lintDocsHere();
    return;
  }
  if (cmd === "check") {
    const r = await check();
    await lintDocsHere();
    console.log("microbench fixture ok. not KEEP.");
    console.log(`prefix-gold: ${r.prefixGold} (yaml construction, not W2)`);
    console.log(`missing-slice: ${r.missingSlice}`);
    console.log(`n: ${r.n}`);
    console.log(`sdd-eval-tasks.yaml SHA-256 ${r.sha256}`);
    console.log("no billed $. no KEEP result.");
    return;
  }
  if (cmd === "run") {
    await runLive();
    return;
  }
  if (cmd === "claude-pilot") {
    const { runClaudePilot } = await import("./claude-cli.ts");
    await runClaudePilot();
    return;
  }
  if (cmd === "claude-wave2") {
    const { runClaudeWave2 } = await import("./claude-cli.ts");
    await runClaudeWave2();
    return;
  }
  if (cmd === "claude-wave3") {
    const { runClaudeWave3 } = await import("./claude-cli.ts");
    await runClaudeWave3();
    return;
  }
  if (cmd === "claude-wave4") {
    const { runClaudeWave4 } = await import("./claude-cli.ts");
    await runClaudeWave4();
    return;
  }
  throw new Error(`unknown command ${cmd}`);
}

const entry = process.argv[1] && path.basename(process.argv[1]) === "run.ts";
if (entry) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
