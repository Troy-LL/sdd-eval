import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { loadTasks } from "./run.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("yaml has 40 prefix-gold rows by construction, not W2", async () => {
  const raw = await readFile(path.join(ROOT, "sdd-eval-tasks.yaml"), "utf8");
  const tasks = loadTasks(raw);
  const prefixGold = tasks.filter((t) => t.stratum === "prefix-gold");
  assert.equal(prefixGold.length, 40);
});

test("tasks yaml has no stored diagnoses and no extra treatments", async () => {
  const raw = await readFile(path.join(ROOT, "sdd-eval-tasks.yaml"), "utf8");
  assert.equal(raw.includes("cap_obey"), false);
  assert.equal(raw.includes("cites_ok"), false);
  assert.equal(raw.includes("task_success"), false);
  assert.equal(raw.includes("compact"), false);
  const tasks = loadTasks(raw);
  assert.equal(tasks.every((t) => t.stratum === "prefix-gold" || t.stratum === "missing-slice"), true);
});

test("docs/eval.md stays the KEEP rule and does not mention cratewake/03034964/fixtures/product/microbench", async () => {
  const evalMd = await readFile(path.join(ROOT, "docs", "eval.md"), "utf8");
  assert.match(evalMd, /\$call1.*=.*billed \$ through the first scored answer/s);
  assert.match(evalMd, /n_missing ≥ 10, or ≥ 25% of n/);
  assert.match(evalMd, /Prefix-gold n ≥ 40 paired/);
  assert.match(evalMd, /## W3 — cites vs gold/);
  assert.match(evalMd, /no KEEP subject/);
  assert.doesNotMatch(evalMd, /cratewake/i);
  assert.doesNotMatch(evalMd, /03034964/);
  assert.doesNotMatch(evalMd, /fixtures\/product/);
  assert.doesNotMatch(evalMd, /microbench/i);
  assert.doesNotMatch(evalMd, /trial 1 KEEP/i);
  assert.doesNotMatch(evalMd, /KEEP trial 1/i);
});
