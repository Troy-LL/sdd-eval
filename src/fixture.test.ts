import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { check, loadTasks } from "./run.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("fixture + tasks meet W2 n bars and stay a microbench", async () => {
  const r = await check();
  assert.equal(r.prefixGold, 40);
  assert.equal(r.missingSlice, 14);
  assert.equal(r.n, 54);
  assert.ok(r.missingSlice >= Math.max(10, r.n * 0.25));
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

test("research eval.md keeps W1-W4 bars and drops EditLayer pins", async () => {
  const evalMd = await readFile(path.join(ROOT, "docs", "eval.md"), "utf8");
  assert.match(evalMd, /\$call1.*=.*billed \$ through the first scored answer/s);
  assert.match(evalMd, /n_missing ≥ 10, or ≥ 25% of n/);
  assert.match(evalMd, /Prefix-gold n ≥ 40 paired/);
  assert.doesNotMatch(evalMd, /767a4266/);
  assert.doesNotMatch(evalMd, /e726f48/);
  assert.doesNotMatch(evalMd, /trial 1 KEEP/i);
  assert.doesNotMatch(evalMd, /KEEP trial 1/i);
  assert.match(evalMd, /cannot KEEP the cookbook/);
  assert.match(evalMd, /microbench/i);
});
