import assert from "node:assert/strict";
import { test } from "node:test";
import {
  bucketsFromOpenAI,
  call1_dollars,
  cap_obey,
  cites_ok,
  extraFileCap,
  gold_ok,
  GPT_4O_MINI_CACHED_INPUT_PER_TOKEN,
  GPT_4O_MINI_INPUT_PER_TOKEN,
  GPT_4O_MINI_OUTPUT_PER_TOKEN,
  GPT_4O_MINI_RATES,
  missingSliceFloor,
  task_success,
  type Observation,
  type Task,
} from "./schema.ts";
import { observationLine } from "./run.ts";

const allowlist = new Set([
  "AGENTS.md",
  "README.md",
  "docs/architecture.md",
  "docs/design.md",
  "docs/eval.md",
  "docs/decisions/001-preempt-lease.md",
]);

const task: Task = {
  id: "pg-01",
  stratum: "prefix-gold",
  prompt: "port?",
  gold: "7481/tcp",
  expected_path: "README.md",
};

function obs(partial: Partial<Observation>): Observation {
  return {
    task_id: "pg-01",
    arm: "L1",
    answer: "7481/tcp",
    cited_path: "README.md",
    loaded_paths: ["AGENTS.md", "README.md"],
    eval_in_play: true,
    usage: null,
    model: "gpt-4o-mini",
    provider: "openai",
    ...partial,
  };
}

test("eval.md in play raises extra cap to 3", () => {
  assert.equal(extraFileCap(true), 3);
  assert.equal(extraFileCap(false), 2);
});

test("L1 cap_obey fails when extras exceed cap; bill is not this function", () => {
  const over = obs({
    loaded_paths: [
      "AGENTS.md",
      "README.md",
      "docs/architecture.md",
      "docs/design.md",
      "docs/eval.md",
    ],
  });
  assert.equal(cap_obey(over, allowlist), false);
  assert.equal(task_success(over, task, allowlist), false);
});

test("L1 cap_obey holds at AGENTS.md + 3 when eval.md is in play", () => {
  const ok = obs({
    loaded_paths: ["AGENTS.md", "README.md", "docs/architecture.md", "docs/eval.md"],
  });
  assert.equal(cap_obey(ok, allowlist), true);
});

test("L1 loading a dump extra fails cap_obey", () => {
  const dump = obs({ loaded_paths: ["AGENTS.md", "docs/changelog.md"] });
  assert.equal(cap_obey(dump, allowlist), false);
});

test("L0 has no cap", () => {
  const l0 = obs({
    arm: "L0",
    loaded_paths: ["AGENTS.md", "README.md", "docs/changelog.md", "docs/ops-noise.md"],
  });
  assert.equal(cap_obey(l0, allowlist), true);
});

test("gold checker is exact substring, not a judge", () => {
  assert.equal(gold_ok("listen 7481/tcp on lo", "7481/tcp"), true);
  assert.equal(gold_ok("7481", "7481/tcp"), false);
  assert.equal(gold_ok(null, "7481/tcp"), false);
});

test("cites_ok is path equality, both arms", () => {
  assert.equal(cites_ok(obs({ arm: "L0", cited_path: "README.md" }), task), true);
  assert.equal(cites_ok(obs({ cited_path: "docs/architecture.md" }), task), false);
});

test("task_success does not AND cites_ok", () => {
  const goldNoCite = obs({ cited_path: "docs/design.md" });
  assert.equal(cites_ok(goldNoCite, task), false);
  assert.equal(task_success(goldNoCite, task, allowlist), true);
});

test("$call1 uses provider buckets; does not infer hit/miss", () => {
  const dollars = call1_dollars(
    {
      cache_creation_input_tokens: 1000,
      cache_read_input_tokens: 2000,
      input_tokens: 3000,
      output_tokens: 400,
      cache_ttl: "5m",
    },
    { write_5m: 3.75e-6, write_1h: 6e-6, read: 0.3e-6, uncached: 3e-6, output: 15e-6 },
  );
  assert.equal(dollars, 1000 * 3.75e-6 + 2000 * 0.3e-6 + 3000 * 3e-6 + 400 * 15e-6);
});

test("$call1 from OpenAI-shaped buckets; cached_tokens is not cache_creation", () => {
  const usage = bucketsFromOpenAI({
    prompt_tokens: 5000,
    completion_tokens: 200,
    prompt_tokens_details: { cached_tokens: 4000 },
  });
  assert.deepEqual(Object.keys(usage).sort(), ["cached_tokens", "completion_tokens", "prompt_tokens"]);
  assert.equal("cache_creation_input_tokens" in usage, false);
  assert.equal(usage.cached_tokens, 4000);
  const dollars = call1_dollars(usage, GPT_4O_MINI_RATES);
  assert.equal(
    dollars,
    1000 * GPT_4O_MINI_INPUT_PER_TOKEN +
      4000 * GPT_4O_MINI_CACHED_INPUT_PER_TOKEN +
      200 * GPT_4O_MINI_OUTPUT_PER_TOKEN,
  );
});

test("OpenAI cached_tokens never maps into Anthropic cache_creation", () => {
  const fromDetails = bucketsFromOpenAI({
    prompt_tokens: 1000,
    completion_tokens: 0,
    cached_tokens: 999,
    cache_creation_input_tokens: 999,
    prompt_tokens_details: { cached_tokens: 800 },
  });
  const fromTop = bucketsFromOpenAI({
    prompt_tokens: 1000,
    completion_tokens: 10,
    cached_tokens: 400,
  });
  const missing = bucketsFromOpenAI({ prompt_tokens: 100, completion_tokens: 5 });
  for (const u of [fromDetails, fromTop, missing]) {
    assert.equal("cache_creation_input_tokens" in u, false);
    assert.equal("cache_read_input_tokens" in u, false);
  }
  assert.equal(fromDetails.cached_tokens, 800);
  assert.equal(fromTop.cached_tokens, 400);
  assert.equal(missing.cached_tokens, 0);
  const openaiDollars = call1_dollars(fromDetails, GPT_4O_MINI_RATES);
  const asAnthropicCreate = call1_dollars(
    {
      cache_creation_input_tokens: fromDetails.cached_tokens,
      cache_read_input_tokens: 0,
      input_tokens: 0,
      output_tokens: 0,
      cache_ttl: "5m",
    },
    { write_5m: 3.75e-6, write_1h: 6e-6, read: 0.3e-6, uncached: 3e-6, output: 15e-6 },
  );
  assert.notEqual(openaiDollars, asAnthropicCreate);
});

test("missingSliceFloor is max(10, 25% of n)", () => {
  assert.equal(missingSliceFloor(40), 10);
  assert.equal(missingSliceFloor(80), 20);
});

test("serialized observation includes model", () => {
  const line = observationLine(
    obs({
      model: "gpt-4o-mini",
      provider: "openai",
      usage: { prompt_tokens: 10, completion_tokens: 2, cached_tokens: 0 },
    }),
  );
  const parsed = JSON.parse(JSON.stringify(line)) as { model?: unknown; provider?: unknown; usage?: object };
  assert.equal(typeof parsed.model, "string");
  assert.equal(parsed.model, "gpt-4o-mini");
  assert.equal(parsed.provider, "openai");
  assert.equal(parsed.usage && "cache_creation_input_tokens" in parsed.usage, false);
});
