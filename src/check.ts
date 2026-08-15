import path from "node:path";
import { fileURLToPath } from "node:url";
import { formatIssues, lintDocs } from "./docs-lint.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const DOCS = [
  "README.md",
  "docs/architecture.md",
  "docs/files.md",
  "docs/decisions/001-intent-in-the-file-that-changed.md",
  "references/sources.md",
  ".cursor/skills/sdd/SKILL.md",
  ".cursor/skills/sdd-eng/SKILL.md",
  ".cursor/skills/sdd/occasion.md",
  ".cursor/skills/sdd/promote.md",
  ".cursor/skills/sdd/distill.md",
  ".cursor/skills/sdd/map.md",
  ".cursor/skills/sdd/owners.md",
] as const;

const issues = await lintDocs({ root: ROOT, map: "AGENTS.md", docs: DOCS });
if (issues.length) {
  console.error(formatIssues(issues));
  process.exit(1);
}
console.log("docs lint ok: map bullets and links resolve.");
