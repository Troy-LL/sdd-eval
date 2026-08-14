import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  assertCleanClaudeInit,
  claudePilotLine,
  commitEvalArtifacts,
  docsHookSettings,
  evalArtifactPaths,
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

function ndjsonRows(...rows: Record<string, unknown>[]): string {
  return rows.map((r) => JSON.stringify(r)).join("\n");
}

function initRow(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    type: "system",
    subtype: "init",
    model: "claude-opus-5",
    tools: [],
    permissionMode: "dontAsk",
    session_id: "sess-1",
    mcp_servers: [],
    ...over,
  };
}

function assistantRow(over: Record<string, unknown> = {}): Record<string, unknown> {
  const messageOver = isRecord(over.message) ? over.message : {};
  const { message: _ignored, ...rest } = over;
  return {
    type: "assistant",
    message: {
      model: "claude-opus-5",
      id: "msg_1",
      type: "message",
      role: "assistant",
      content: [{ type: "text", text: "CITE: README.md\nANSWER: 7481/tcp" }],
      ...messageOver,
    },
    ...rest,
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function opusUsage(key = "claude-opus-5", canonical = "claude-opus-5"): Record<string, unknown> {
  return {
    [key]: {
      inputTokens: 6,
      outputTokens: 4,
      canonicalModel: canonical,
      provider: "firstParty",
    },
  };
}

function opusPlusHaikuUsage(): Record<string, unknown> {
  return {
    "claude-haiku-4-5-20251001": {
      inputTokens: 750,
      outputTokens: 16,
      cacheReadInputTokens: 0,
      cacheCreationInputTokens: 0,
      webSearchRequests: 0,
      costUSD: 0.00083,
      contextWindow: 200000,
      maxOutputTokens: 32000,
      canonicalModel: "claude-haiku-4-5",
      provider: "firstParty",
    },
    "claude-opus-5[1m]": {
      inputTokens: 4,
      outputTokens: 300,
      cacheReadInputTokens: 2294,
      cacheCreationInputTokens: 1060,
      webSearchRequests: 0,
      costUSD: 0.019267,
      contextWindow: 1000000,
      maxOutputTokens: 64000,
      canonicalModel: "claude-opus-5",
      provider: "firstParty",
    },
  };
}

function resultRow(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    type: "result",
    is_error: false,
    result: "CITE: README.md\nANSWER: 7481/tcp",
    session_id: "sess-1",
    modelUsage: opusUsage(),
    ...over,
  };
}

function cleanStream(initOver: Record<string, unknown> = {}, resultOver: Record<string, unknown> = {}): string {
  return ndjsonRows(initRow(initOver), assistantRow(), resultRow(resultOver));
}

test("clean no-tools init is accepted for L0 and K", () => {
  const parsed = parseClaudeStream(
    ndjsonRows(
      initRow({ tools: [], model: "claude-opus-5[1m]" }),
      assistantRow(),
      resultRow({
        modelUsage: opusUsage("claude-opus-5[1m]", "claude-opus-5"),
      }),
    ),
    cwd,
  );
  assert.deepEqual(parsed.init, {
    model: "claude-opus-5[1m]",
    tools: [],
    permissionMode: "dontAsk",
  });
  assert.equal(parsed.init_count, 1);
  assert.equal(parsed.result_model, null);
  assert.deepEqual(parsed.completion_models, ["claude-opus-5"]);
  assert.doesNotThrow(() => assertCleanClaudeInit(parsed, "L0"));
  assert.doesNotThrow(() => assertCleanClaudeInit(parsed, "K"));
});

test("clean Read init is accepted even with connected MCP servers", () => {
  const parsed = parseClaudeStream(
    ndjsonRows(
      initRow({
        tools: ["Read"],
        mcp_servers: [
          { name: "claude.ai Gmail", status: "connected" },
          { name: "claude.ai Google Drive", status: "connected" },
        ],
      }),
      assistantRow(),
      resultRow(),
    ),
    cwd,
  );
  assert.deepEqual(parsed.init?.tools, ["Read"]);
  assert.equal(parsed.init?.model, "claude-opus-5");
  assert.equal(parsed.result_model, null);
  assert.deepEqual(parsed.completion_models, ["claude-opus-5"]);
  assert.doesNotThrow(() => assertCleanClaudeInit(parsed, "L1"));
  assert.doesNotThrow(() => assertCleanClaudeInit(parsed, "L1h"));
});

test("wrong init or result model is rejected", () => {
  const badInit = parseClaudeStream(cleanStream({ tools: ["Read"], model: "claude-sonnet-5" }), cwd);
  assert.throws(() => assertCleanClaudeInit(badInit, "L1"), /init model claude-sonnet-5/);
  const badResult = parseClaudeStream(
    ndjsonRows(
      initRow({ tools: ["Read"] }),
      assistantRow(),
      resultRow({ model: "claude-sonnet-5", modelUsage: opusUsage() }),
    ),
    cwd,
  );
  assert.throws(() => assertCleanClaudeInit(badResult, "L1"), /completion model claude-sonnet-5/);
});

test("MCP tool exposure is rejected", () => {
  const parsed = parseClaudeStream(
    cleanStream({
      tools: ["Read", "mcp__gmail__search"],
      mcp_servers: [{ name: "claude.ai Gmail", status: "connected" }],
    }),
    cwd,
  );
  assert.throws(() => assertCleanClaudeInit(parsed, "L1"), /mcp__gmail__search/);
});

test("extra built-in tool is rejected", () => {
  const parsed = parseClaudeStream(cleanStream({ tools: ["Read", "Bash"] }), cwd);
  assert.throws(() => assertCleanClaudeInit(parsed, "L1"), /Bash/);
  const dup = parseClaudeStream(cleanStream({ tools: ["Read", "Read"] }), cwd);
  assert.throws(() => assertCleanClaudeInit(dup, "L1"), /duplicate tools/);
});

test("wrong permission mode is rejected", () => {
  const parsed = parseClaudeStream(cleanStream({ tools: ["Read"], permissionMode: "acceptEdits" }), cwd);
  assert.throws(() => assertCleanClaudeInit(parsed, "L1"), /permissionMode acceptEdits/);
});

test("missing init is rejected", () => {
  const parsed = parseClaudeStream(ndjsonRows(assistantRow(), resultRow({ model: "claude-opus-5" })), cwd);
  assert.equal(parsed.init, null);
  assert.equal(parsed.init_count, 0);
  assert.throws(() => assertCleanClaudeInit(parsed, "L0"), /missing system\/init/);
});

test("missing completion model is rejected", () => {
  const parsed = parseClaudeStream(
    ndjsonRows(
      initRow({ tools: ["Read"] }),
      assistantRow({ message: { model: undefined, content: [] } }),
      resultRow({ modelUsage: opusPlusHaikuUsage() }),
    ),
    cwd,
  );
  assert.deepEqual(parsed.completion_models, []);
  assert.throws(() => assertCleanClaudeInit(parsed, "L1"), /missing completion model/);
});

test("malformed tools are rejected", () => {
  const missing = parseClaudeStream(cleanStream({ tools: undefined }), cwd);
  assert.equal(missing.init?.tools, null);
  assert.throws(() => assertCleanClaudeInit(missing, "L0"), /malformed tools/);
  const notArray = parseClaudeStream(cleanStream({ tools: "Read" }), cwd);
  assert.equal(notArray.init?.tools, null);
  assert.throws(() => assertCleanClaudeInit(notArray, "L1"), /malformed tools/);
  const mixed = parseClaudeStream(cleanStream({ tools: ["Read", 2] }), cwd);
  assert.equal(mixed.init?.tools, null);
  assert.throws(() => assertCleanClaudeInit(mixed, "L1"), /malformed tools/);
});

test("duplicate init is rejected even when identical", () => {
  const parsed = parseClaudeStream(
    ndjsonRows(initRow({ tools: ["Read"] }), initRow({ tools: ["Read"] }), assistantRow(), resultRow()),
    cwd,
  );
  assert.equal(parsed.init_count, 2);
  assert.throws(() => assertCleanClaudeInit(parsed, "L1"), /duplicate system\/init/);
});

test("unknown model alias is rejected", () => {
  const badInit = parseClaudeStream(cleanStream({ tools: ["Read"], model: "claude-opus-5[2m]" }), cwd);
  assert.throws(() => assertCleanClaudeInit(badInit, "L1"), /init model claude-opus-5\[2m\]/);
});

test("modelUsage haiku helper is ignored when assistant.message.model is opus", () => {
  const parsed = parseClaudeStream(
    ndjsonRows(
      initRow({ tools: ["Read"] }),
      assistantRow(),
      resultRow({ modelUsage: opusPlusHaikuUsage() }),
    ),
    cwd,
  );
  assert.deepEqual(parsed.completion_models, ["claude-opus-5"]);
  assert.doesNotThrow(() => assertCleanClaudeInit(parsed, "L1"));
});

test("assistant.message.model sonnet is rejected even when init and modelUsage are opus", () => {
  const parsed = parseClaudeStream(
    ndjsonRows(
      initRow({ tools: ["Read"], model: "claude-opus-5" }),
      assistantRow({ message: { model: "claude-sonnet-5" } }),
      resultRow({ modelUsage: opusUsage() }),
    ),
    cwd,
  );
  assert.deepEqual(parsed.completion_models, ["claude-sonnet-5"]);
  assert.throws(() => assertCleanClaudeInit(parsed, "L1"), /completion model claude-sonnet-5/);
});

async function withArtifactRoot(fn: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "sdd-art-"));
  try {
    await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function seedArtifacts(
  root: string,
  id: string,
  oldRaw: string,
  oldSum: string,
  newRaw: string,
  newSum: string,
) {
  const paths = evalArtifactPaths(root, "run", id);
  await mkdir(paths.rawDir);
  await writeFile(path.join(paths.rawDir, "old.ndjson"), oldRaw);
  await writeFile(paths.summaryPath, oldSum);
  await mkdir(paths.stagingRaw);
  await writeFile(path.join(paths.stagingRaw, "new.ndjson"), newRaw);
  await writeFile(paths.stagingSummary, newSum);
  return paths;
}

test("commitEvalArtifacts replaces matching new raw and summary", async () => {
  await withArtifactRoot(async (root) => {
    const paths = await seedArtifacts(root, "ok", "old-raw", "old-sum\n", "new-raw", "new-sum\n");
    await commitEvalArtifacts(paths);
    assert.equal(await readFile(path.join(paths.rawDir, "new.ndjson"), "utf8"), "new-raw");
    assert.equal(await readFile(paths.summaryPath, "utf8"), "new-sum\n");
    await assert.rejects(() => access(path.join(paths.rawDir, "old.ndjson")));
    await assert.rejects(() => access(paths.stagingRaw));
    await assert.rejects(() => access(paths.stagingSummary));
    await assert.rejects(() => access(paths.backupRaw));
    await assert.rejects(() => access(paths.backupSummary));
  });
});

test("commitEvalArtifacts restores old raw and summary on install failure", async () => {
  await withArtifactRoot(async (root) => {
    const paths = await seedArtifacts(root, "fail", "old-raw", "old-sum\n", "new-raw", "new-sum\n");
    await assert.rejects(
      () => commitEvalArtifacts(paths, { failAfter: "install-summary" }),
      /simulated install failure/,
    );
    assert.equal(await readFile(path.join(paths.rawDir, "old.ndjson"), "utf8"), "old-raw");
    assert.equal(await readFile(paths.summaryPath, "utf8"), "old-sum\n");
    await assert.rejects(() => access(path.join(paths.rawDir, "new.ndjson")));
    await assert.rejects(() => access(paths.stagingRaw));
    await assert.rejects(() => access(paths.stagingSummary));
    await assert.rejects(() => access(paths.backupRaw));
    await assert.rejects(() => access(paths.backupSummary));
  });
});
