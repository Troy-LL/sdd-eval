import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { formatIssues, lintDocs, mapBullets, markdownLinks } from "./docs-lint.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function tmpRepo(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "sdd-lint-"));
  await mkdir(path.join(dir, "docs"), { recursive: true });
  return dir;
}

test("mapBullets reads backticked paths, markdownLinks drops http and anchors", () => {
  const map = "# p\n\n- `README.md` — run\n- `docs/eval.md` — SLOs\n\nLoad this file + 2.\n";
  assert.deepEqual(mapBullets(map), ["README.md", "docs/eval.md"]);
  const body = "See [a](docs/architecture.md), [b](https://x.dev), [c](#section), [d](docs/eval.md#slos).";
  assert.deepEqual(markdownLinks(body), ["docs/architecture.md", "docs/eval.md"]);
});

test("lintDocs passes a tree where every bullet and link resolves", async () => {
  const dir = await tmpRepo();
  await writeFile(path.join(dir, "AGENTS.md"), "- `README.md` — run\n- `docs/eval.md` — SLOs\n");
  await writeFile(path.join(dir, "README.md"), "See [eval](docs/eval.md).\n");
  await writeFile(path.join(dir, "docs", "eval.md"), "# eval\n");
  const issues = await lintDocs({ root: dir, map: "AGENTS.md", docs: ["README.md", "docs/eval.md"] });
  assert.deepEqual(issues, []);
});

test("lintDocs catches a dangling map bullet after a file is deleted", async () => {
  const dir = await tmpRepo();
  await writeFile(path.join(dir, "AGENTS.md"), "- `README.md` — run\n- `docs/design.md` — UI\n");
  await writeFile(path.join(dir, "README.md"), "# p\n");
  const issues = await lintDocs({ root: dir, map: "AGENTS.md", docs: ["README.md"] });
  assert.deepEqual(
    issues.map((i) => [i.target, i.why]),
    [["docs/design.md", "map bullet does not resolve"]],
  );
  assert.match(formatIssues(issues), /docs\/design\.md/);
});

test("lintDocs resolves links relative to the citing file, not the root", async () => {
  const dir = await tmpRepo();
  await writeFile(path.join(dir, "AGENTS.md"), "- `docs/architecture.md` — process\n");
  await writeFile(path.join(dir, "docs", "architecture.md"), "ADR: [001](decisions/001-x.md)\n");
  const dangling = await lintDocs({ root: dir, map: "AGENTS.md", docs: ["docs/architecture.md"] });
  assert.deepEqual(dangling.map((i) => i.target), ["decisions/001-x.md"]);

  await mkdir(path.join(dir, "docs", "decisions"), { recursive: true });
  await writeFile(path.join(dir, "docs", "decisions", "001-x.md"), "# 001\n");
  assert.deepEqual(await lintDocs({ root: dir, map: "AGENTS.md", docs: ["docs/architecture.md"] }), []);
});

test("lintDocs skips content files the ladder has not created yet", async () => {
  const dir = await tmpRepo();
  await writeFile(path.join(dir, "AGENTS.md"), "- `README.md` — run\n");
  await writeFile(path.join(dir, "README.md"), "# p\n");
  const issues = await lintDocs({
    root: dir,
    map: "AGENTS.md",
    docs: ["README.md", "docs/design.md", "docs/eval.md"],
  });
  assert.deepEqual(issues, []);
});

test("this repo's own map and docs have no dangling pointers", async () => {
  const issues = await lintDocs({
    root: ROOT,
    map: "AGENTS.md",
    docs: [
      "README.md",
      "docs/architecture.md",
      "docs/files.md",
      "docs/decisions/001-intent-in-the-file-that-changed.md",
      "references/sources.md",
    ],
  });
  assert.deepEqual(issues, [], formatIssues(issues));
});
