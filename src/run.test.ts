import assert from "node:assert/strict";
import { test } from "node:test";
import { extraFileCap, cap_obey, type Observation } from "./schema.ts";
import {
  applyCapRead,
  CAP_REFUSE,
  capModeFromEnv,
  liveJsonlRel,
  observationLine,
  toolFirstTurn,
} from "./run.ts";

const allowlist = new Set([
  "AGENTS.md",
  "README.md",
  "docs/architecture.md",
  "docs/design.md",
  "docs/eval.md",
  "docs/decisions/001-preempt-lease.md",
]);

const files: Record<string, string> = {
  "AGENTS.md": "agents body",
  "README.md": "readme body",
  "docs/architecture.md": "arch body",
  "docs/design.md": "design body",
  "docs/eval.md": "eval body",
};

async function readRel(rel: string): Promise<string> {
  const body = files[rel];
  if (body === undefined) throw new Error(`missing ${rel}`);
  return body;
}

async function play(mode: "prompt" | "mechanical", paths: string[]) {
  const loaded = new Set<string>(["AGENTS.md"]);
  const refused: string[] = [];
  const extraCap = extraFileCap(true);
  const contents: string[] = [];
  for (const rel of paths) {
    contents.push(await applyCapRead({ mode, loaded, refused, rel, extraCap, read: readRel }));
  }
  return { loaded: [...loaded], refused, contents };
}

test("SDD_CAP default is prompt; mechanical is the runner switch", () => {
  assert.equal(capModeFromEnv({}), "prompt");
  assert.equal(capModeFromEnv({ SDD_CAP: "" }), "prompt");
  assert.equal(capModeFromEnv({ SDD_CAP: "prompt" }), "prompt");
  assert.equal(capModeFromEnv({ SDD_CAP: "mechanical" }), "mechanical");
});

test("mechanical-cap refuses a 4th extra: path in refused_paths, not loaded_paths", async () => {
  const fourth = "docs/eval.md";
  const { loaded, refused, contents } = await play("mechanical", [
    "README.md",
    "docs/architecture.md",
    "docs/design.md",
    fourth,
  ]);
  assert.equal(contents[3], CAP_REFUSE);
  assert.equal(refused.includes(fourth), true);
  assert.equal(loaded.includes(fourth), false);
  assert.equal(loaded.filter((p) => p !== "AGENTS.md").length, 3);
  const obs: Observation = {
    task_id: "pg-01",
    arm: "mechanical-cap",
    answer: null,
    cited_path: null,
    loaded_paths: loaded,
    eval_in_play: true,
    usage: null,
    model: "gpt-4o-mini",
    provider: "openai",
    refused_paths: refused,
  };
  const line = observationLine(obs);
  assert.deepEqual(line.refused_paths, [fourth]);
  assert.equal((line.loaded_paths as string[]).includes(fourth), false);
  assert.equal("refuse_count" in line, false);
});

test("mechanical-cap re-read of an already-loaded file is not a refuse", async () => {
  const { loaded, refused, contents } = await play("mechanical", [
    "README.md",
    "docs/architecture.md",
    "docs/design.md",
    "README.md",
  ]);
  assert.equal(contents[3], "readme body");
  assert.deepEqual(refused, []);
  assert.deepEqual(
    loaded.filter((p) => p !== "AGENTS.md"),
    ["README.md", "docs/architecture.md", "docs/design.md"],
  );
});

test("prompt mode still records a 4th extra on loaded_paths so cap_obey can fail", async () => {
  const fourth = "docs/eval.md";
  const { loaded, refused, contents } = await play("prompt", [
    "README.md",
    "docs/architecture.md",
    "docs/design.md",
    fourth,
  ]);
  assert.equal(contents[3], "eval body");
  assert.deepEqual(refused, []);
  assert.equal(loaded.includes(fourth), true);
  const obs: Observation = {
    task_id: "pg-01",
    arm: "L1",
    answer: "x",
    cited_path: "README.md",
    loaded_paths: loaded,
    eval_in_play: true,
    usage: null,
    model: "gpt-4o-mini",
    provider: "openai",
    refused_paths: refused,
  };
  assert.equal(cap_obey(obs, allowlist), false);
});

test("mechanical-cap jsonl is run-mechanical-cap.jsonl and never run.jsonl", () => {
  const at = new Date("2026-08-14T04:59:00.000Z");
  assert.equal(liveJsonlRel("mechanical", new Set()), "run-mechanical-cap.jsonl");
  assert.equal(liveJsonlRel("prompt", new Set()), "run.jsonl");
  const afterPrompt = liveJsonlRel("prompt", new Set(["run.jsonl"]), at);
  assert.notEqual(afterPrompt, "run.jsonl");
  const afterMech = liveJsonlRel("mechanical", new Set(["run-mechanical-cap.jsonl"]), at);
  assert.equal(afterMech, `run-mechanical-cap-${at.toISOString()}.jsonl`);
  assert.notEqual(afterMech, "run.jsonl");
  assert.notEqual(liveJsonlRel("mechanical", new Set(["run.jsonl"])), "run.jsonl");
});

test("tool first turn is AGENTS.md + cap + task, not PREFIX dump", () => {
  const turn = toolFirstTurn("agents body", 3, {
    id: "pg-01",
    stratum: "prefix-gold",
    prompt: "port?",
    gold: "7481/tcp",
    expected_path: "README.md",
  });
  const blob = turn.blocks.map((b) => b.text).join("\n");
  assert.match(blob, /## AGENTS.md/);
  assert.match(blob, /TASK pg-01/);
  assert.doesNotMatch(blob, /## README.md/);
  assert.doesNotMatch(blob, /## docs\/architecture.md/);
  assert.doesNotMatch(blob, /## docs\/design.md/);
  assert.doesNotMatch(blob, /## docs\/eval.md/);
});
