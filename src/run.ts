import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import {
  call1_dollars,
  cap_obey,
  cites_ok,
  extraFileCap,
  gold_ok,
  task_success,
  type Arm,
  type Observation,
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

const PREFIX = ["AGENTS.md", ...MAP_NAMED] as const;

const DUMP_EXTRAS = [
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
    for (const key of ["cap_obey", "cites_ok", "task_success"] as const) {
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
  if (!/no KEEP subject/.test(evalMd)) throw new Error("docs/eval.md subject pin must be no KEEP subject");
  if (!/\$call1.*=.*billed \$ through the first scored answer/s.test(evalMd)) {
    throw new Error("docs/eval.md lost the $call1 definition");
  }
  if (!/## W3 — cites vs gold/.test(evalMd)) throw new Error("docs/eval.md lost W3");
  if (!/microbench/i.test(readme)) throw new Error("README must label this checkout a microbench");
  if (!readme.includes(sha256)) throw new Error("README must carry the microbench tasks hash (not a KEEP pin)");
  if (/trial 1 KEEP/i.test(readme)) throw new Error("do not write trial 1 KEEP");

  return { n, prefixGold: prefixGold.length, missingSlice: missingSlice.length, sha256 };
}

function parseCiteAnswer(text: string): { cited_path: string | null; answer: string } {
  const cite = text.match(/^CITE:\s*(.+)$/m);
  const ans = text.match(/^ANSWER:\s*(.+)$/m);
  return {
    cited_path: cite ? cite[1].trim() : null,
    answer: ans ? ans[1].trim() : text,
  };
}

function addUsage(into: UsageBuckets, part: UsageBuckets): void {
  into.cache_creation_input_tokens += part.cache_creation_input_tokens;
  into.cache_read_input_tokens += part.cache_read_input_tokens;
  into.input_tokens += part.input_tokens;
  into.output_tokens += part.output_tokens;
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

const INSTRUCT = `Cite one path. Answer with the exact token from that file.
Format:
CITE: relative/path.md
ANSWER: token`;

async function runArm(opts: {
  apiKey: string;
  model: string;
  task: Task;
  arm: Arm;
}): Promise<Observation> {
  const ttl: "5m" | "1h" = "5m";
  const usage: UsageBuckets = {
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
    input_tokens: 0,
    output_tokens: 0,
    cache_ttl: ttl,
  };
  const loaded = new Set<string>();
  const extraCap = extraFileCap(EVAL_IN_PLAY);

  const tools = [
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

  if (opts.arm === "L0") {
    const prefix = await Promise.all(
      PREFIX.map(async (p) => `## ${p}\n${await readFixture(p)}`),
    );
    const extras = await Promise.all(
      DUMP_EXTRAS.map(async (p) => `## ${p}\n${await readFixture(p)}`),
    );
    for (const p of PREFIX) loaded.add(p);
    for (const p of DUMP_EXTRAS) loaded.add(p);
    const resp = await anthropic(opts.apiKey, {
      model: opts.model,
      max_tokens: 256,
      system: [{ type: "text", text: INSTRUCT, cache_control: { type: "ephemeral" } }],
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prefix.join("\n\n"), cache_control: { type: "ephemeral" } },
            { type: "text", text: `${extras.join("\n\n")}\n\nTASK ${opts.task.id}: ${opts.task.prompt}` },
          ],
        },
      ],
    });
    addUsage(usage, bucketsFromAnthropic(resp.usage, ttl));
    const text = resp.content.filter((c) => c.type === "text").map((c) => c.text).join("\n");
    const parsed = parseCiteAnswer(text);
    return {
      task_id: opts.task.id,
      arm: "L0",
      answer: parsed.answer,
      cited_path: parsed.cited_path,
      loaded_paths: [...loaded],
      eval_in_play: EVAL_IN_PLAY,
      usage,
    };
  }

  loaded.add("AGENTS.md");
  const agents = await readFixture("AGENTS.md");
  const messages: unknown[] = [
    {
      role: "user",
      content: [
        { type: "text", text: `## AGENTS.md\n${agents}`, cache_control: { type: "ephemeral" } },
        {
          type: "text",
          text: `L1 cap: AGENTS.md + at most ${extraCap} files (eval.md in play).\n\nTASK ${opts.task.id}: ${opts.task.prompt}`,
        },
      ],
    },
  ];

  let text = "";
  for (let round = 0; round < 8; round++) {
    const resp = await anthropic(opts.apiKey, {
      model: opts.model,
      max_tokens: 512,
      tools,
      system: [{ type: "text", text: INSTRUCT, cache_control: { type: "ephemeral" } }],
      messages,
    });
    addUsage(usage, bucketsFromAnthropic(resp.usage, ttl));
    const toolUses = resp.content.filter((c) => c.type === "tool_use");
    const texts = resp.content.filter((c) => c.type === "text").map((c) => c.text);
    text = texts.join("\n");
    if (toolUses.length === 0) break;
    (messages as object[]).push({ role: "assistant", content: resp.content });
    const toolResults = [];
    for (const tu of toolUses) {
      const rel = String(tu.input.path ?? "").replace(/^\.\//, "");
      loaded.add(rel);
      let content: string;
      try {
        content = await readFixture(rel);
      } catch {
        content = `missing: ${rel}`;
      }
      toolResults.push({ type: "tool_result", tool_use_id: tu.id, content });
    }
    (messages as object[]).push({ role: "user", content: toolResults });
  }

  const parsed = parseCiteAnswer(text);
  return {
    task_id: opts.task.id,
    arm: "L1",
    answer: parsed.answer,
    cited_path: parsed.cited_path,
    loaded_paths: [...loaded],
    eval_in_play: EVAL_IN_PLAY,
    usage,
  };
}

function observationLine(obs: Observation): Record<string, unknown> {
  return {
    task_id: obs.task_id,
    arm: obs.arm,
    answer: obs.answer,
    cited_path: obs.cited_path,
    loaded_paths: obs.loaded_paths,
    eval_in_play: obs.eval_in_play,
    usage: obs.usage,
  };
}

function derive(obs: Observation, task: Task, model: string): {
  cap_obey: boolean;
  cites_ok: boolean;
  gold_ok: boolean;
  task_success: boolean;
  call1_dollars: number | null;
} {
  const rates = RATES[model];
  return {
    cap_obey: cap_obey(obs, ALLOWLIST),
    cites_ok: cites_ok(obs, task),
    gold_ok: gold_ok(obs.answer, task.gold),
    task_success: task_success(obs, task, ALLOWLIST),
    call1_dollars: obs.usage && rates ? call1_dollars(obs.usage, rates) : null,
  };
}

async function runLive(): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("no ANTHROPIC_API_KEY; stub path is `npm run check`. will not fake billed $");
  }
  const model = process.env.MODEL ?? "claude-haiku-4-5-20251001";
  const tasks = loadTasks(await readFile(TASKS_PATH, "utf8"));
  const outDir = path.join(ROOT, "evals");
  await mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, "run.jsonl");
  const lines: string[] = [];
  for (const task of tasks) {
    for (const arm of ["L0", "L1"] as const) {
      const obs = await runArm({ apiKey, model, task, arm });
      lines.push(JSON.stringify(observationLine(obs)));
      const d = derive(obs, task, model);
      console.log(
        `${task.id} ${arm} gold=${d.gold_ok} cap=${d.cap_obey} success=${d.task_success}` +
          (d.call1_dollars !== null ? ` $call1=${d.call1_dollars}` : " $call1=omitted"),
      );
    }
  }
  await writeFile(outPath, lines.join("\n") + "\n");
  console.log(`wrote ${outPath} (gitignored). microbench. not KEEP.`);
}

async function main(): Promise<void> {
  const cmd = process.argv[2] ?? "check";
  if (cmd === "check") {
    const r = await check();
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
  throw new Error(`unknown command ${cmd}`);
}

const entry = process.argv[1] && path.basename(process.argv[1]) === "run.ts";
if (entry) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
