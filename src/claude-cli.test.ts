import assert from "node:assert/strict";
import { test } from "node:test";
import {
  claudePilotLine,
  docsHookSettings,
  exactSystemPrompt,
  jobMap,
  namedMap,
  normalizeRelPath,
  oneFileCapNote,
  parseClaudeStream,
  PILOT_IDS,
  scoringArm,
  WAVE2_RUN,
  WAVE2_TREATMENTS,
  WAVE3_RUN,
  WAVE4_RUN,
} from "./claude-cli.ts";
import { cap_obey, gold_ok, task_success, type Observation, type Task } from "./schema.ts";
import { derive } from "./run.ts";

const cwd = "C:\\Users\\admin\\AppData\\Local\\Temp\\sdd-eval-smoke-l1";
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
  prompt: "What TCP listen token does cratewake use?",
  gold: "7481/tcp",
  expected_path: "README.md",
};

test("plain text stdout is not a Claude result", () => {
  const parsed = parseClaudeStream("Empty prompt. What you need?\n", cwd);
  assert.equal(parsed.session_id, null);
  assert.equal(parsed.result_text, "");
});

test("wave2 run is L1n on two missing-slice golds, then L1o on two prefix-golds", () => {
  assert.deepEqual(
    WAVE2_RUN.map((r) => [r.treatment, [...r.ids]]),
    [
      ["L1n", ["ms-02", "ms-03"]],
      ["L1o", ["pg-01", "pg-02"]],
    ],
  );
  assert.deepEqual(WAVE2_TREATMENTS, ["K", "L1e", "L1o", "L1n"]);
  assert.equal(scoringArm("K"), "L0");
  assert.equal(scoringArm("L1o"), "L1");
  assert.equal(scoringArm("L1n"), "L1");
});

test("namedMap is a cheat-probe: it names the ADR", () => {
  const named = namedMap("- `README.md` — limits\n");
  assert.match(named, /001-preempt-lease/);
  assert.match(named, /cheat-probe/i);
});

test("wave3 is L1j on pg-01 pg-02 ms-02 ms-03", () => {
  assert.deepEqual(
    WAVE3_RUN.map((r) => [r.treatment, [...r.ids]]),
    [["L1j", ["pg-01", "pg-02", "ms-02", "ms-03"]]],
  );
  assert.equal(scoringArm("L1j"), "L1");
});

test("wave4 is L1h on pg-01 pg-02 ms-02 ms-03", () => {
  assert.deepEqual(
    WAVE4_RUN.map((r) => [r.treatment, [...r.ids]]),
    [["L1h", ["pg-01", "pg-02", "ms-02", "ms-03"]]],
  );
  assert.equal(scoringArm("L1h"), "L1");
});

test("docsHookSettings is a Claude Read hook, not a gold leak", () => {
  const settings = docsHookSettings();
  assert.match(settings, /docs-load\.mjs/);
  assert.match(settings, /PreToolUse/);
  assert.match(settings, /UserPromptSubmit/);
  assert.doesNotMatch(settings, /001-preempt-lease/);
  assert.doesNotMatch(settings, /7481\/tcp|9104|cratewake dock:lease|max-bays 36/);
});

test("jobMap does not name the ADR or gold tokens", () => {
  const map = jobMap();
  assert.match(map, /README\.md/);
  assert.match(map, /ceiling/i);
  assert.doesNotMatch(map, /docs\/decisions/);
  assert.doesNotMatch(map, /001-preempt-lease/);
  assert.doesNotMatch(map, /preempt|fence|yield/i);
  assert.doesNotMatch(map, /7481\/tcp|9104|cratewake dock:lease|max-bays 36/);
});

test("exactSystemPrompt does not leak gold tokens", () => {
  assert.doesNotMatch(exactSystemPrompt(), /max-bays 36/);
  assert.match(exactSystemPrompt(), /key words/);
});

test("oneFileCapNote bans unix-root paths and extra architecture", () => {
  assert.match(oneFileCapNote(), /README\.md/);
  assert.doesNotMatch(oneFileCapNote(), /\/README\.md/);
  assert.match(oneFileCapNote(), /one file/i);
});

test("pilot is 5 prefix-gold plus 5 missing-slice, throwaway", () => {
  assert.deepEqual(PILOT_IDS, [
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
  ]);
});

test("normalizeRelPath strips unix-root and cwd prefix", () => {
  assert.equal(normalizeRelPath("/README.md", cwd), "README.md");
  assert.equal(normalizeRelPath("/docs/architecture.md", cwd), "docs/architecture.md");
  assert.equal(
    normalizeRelPath(`${cwd}\\README.md`, cwd),
    "README.md",
  );
  assert.equal(
    normalizeRelPath(`${cwd}/docs/architecture.md`, cwd),
    "docs/architecture.md",
  );
});

test("parseClaudeStream keeps failed Reads and unique loaded extras", () => {
  const ndjson = [
    JSON.stringify({
      type: "assistant",
      message: {
        content: [{ type: "tool_use", id: "r1", name: "Read", input: { file_path: "/README.md" } }],
      },
    }),
    JSON.stringify({
      type: "user",
      message: {
        content: [{ type: "tool_result", tool_use_id: "r1", is_error: true, content: "File does not exist." }],
      },
    }),
    JSON.stringify({
      type: "assistant",
      message: {
        content: [
          {
            type: "tool_use",
            id: "r2",
            name: "Read",
            input: { file_path: `${cwd}\\README.md` },
          },
        ],
      },
    }),
    JSON.stringify({
      type: "user",
      message: {
        content: [{ type: "tool_result", tool_use_id: "r2", content: "Listen 7481/tcp" }],
      },
    }),
    JSON.stringify({
      type: "result",
      is_error: false,
      result: "CITE: README.md\nANSWER: 7481/tcp",
      model: "claude-opus-5",
      session_id: "sess-1",
      total_cost_usd: 0.03,
      num_turns: 5,
      usage: {
        input_tokens: 10,
        output_tokens: 4,
        cache_creation_input_tokens: 1,
        cache_read_input_tokens: 2,
      },
    }),
  ].join("\n");
  const parsed = parseClaudeStream(ndjson, cwd);
  assert.deepEqual(
    parsed.files_requested.map((e) => e.path),
    ["README.md", "README.md"],
  );
  assert.equal(parsed.files_requested[0]?.ok, false);
  assert.equal(parsed.files_requested[1]?.ok, true);
  assert.deepEqual(parsed.loaded_extras, ["README.md"]);
  assert.equal(parsed.result_text, "CITE: README.md\nANSWER: 7481/tcp");
  assert.equal(parsed.cli_cost_usd, 0.03);
  assert.equal(parsed.session_id, "sess-1");
});

test("claude-code observations never get $call1 even when CLI reports usage", () => {
  const obs: Observation = {
    task_id: "pg-01",
    arm: "L1",
    answer: "7481/tcp",
    cited_path: "README.md",
    loaded_paths: ["AGENTS.md", "README.md"],
    eval_in_play: true,
    usage: {
      input_tokens: 333,
      output_tokens: 307,
      cache_creation_input_tokens: 2099,
      cache_read_input_tokens: 2950,
      cache_ttl: "1h",
    },
    model: "claude-opus-5",
    provider: "claude-code",
    refused_paths: [],
  };
  const d = derive(obs, task);
  assert.equal(gold_ok(obs.answer, task.gold), true);
  assert.equal(cap_obey(obs, allowlist), true);
  assert.equal(task_success(obs, task, allowlist), true);
  assert.equal(d.call1_dollars, null);
  const line = claudePilotLine(obs, d, {
    treatment: "L1",
    cli_cost_usd: 0.03,
    session_id: "sess-1",
    files_requested: [{ path: "README.md", ok: true }],
    num_turns: 5,
  });
  assert.equal("call1_dollars" in line, false);
  assert.equal(line.cli_cost_usd, 0.03);
  assert.equal(line.usage, null);
});
