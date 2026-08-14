import { access, readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Two dangling-pointer checks a product repo can copy.
 *
 * Deliberately not "every backticked path must exist". A handbook is full of
 * paths you must NOT create (`docs/api.md`, `llms.txt`), so that rule is all
 * false positives. A markdown link is unambiguous intent to point at a file.
 */
export type DocsIssue = { file: string; target: string; why: string };

const HTTP = /^(https?:|mailto:|#)/i;

/** Bullets of the shape `- \`path\` — note`. The map's routing table. */
export function mapBullets(text: string): string[] {
  const out: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*[-*]\s+`([^`]+)`/.exec(line);
    if (m?.[1]) out.push(m[1]);
  }
  return out;
}

/** `[label](target)` with http, mail, and anchors dropped. */
export function markdownLinks(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
    const target = m[1];
    if (!target || HTTP.test(target)) continue;
    out.push(target.split("#")[0] as string);
  }
  return out;
}

async function exists(root: string, rel: string): Promise<boolean> {
  try {
    await access(path.join(root, rel));
    return true;
  } catch {
    return false;
  }
}

/**
 * `map` is the routing file; its bullets must resolve. `docs` are content
 * files; their markdown links must resolve. Missing content files are skipped,
 * because the ladder says you only create what is true.
 */
export async function lintDocs(opts: {
  root: string;
  map: string;
  docs: readonly string[];
}): Promise<DocsIssue[]> {
  const issues: DocsIssue[] = [];
  const mapText = await readFile(path.join(opts.root, opts.map), "utf8");

  for (const target of mapBullets(mapText)) {
    if (!(await exists(opts.root, target))) {
      issues.push({ file: opts.map, target, why: "map bullet does not resolve" });
    }
  }

  for (const rel of [opts.map, ...opts.docs]) {
    if (!(await exists(opts.root, rel))) continue;
    const text = await readFile(path.join(opts.root, rel), "utf8");
    const from = path.dirname(rel);
    for (const target of markdownLinks(text)) {
      const resolved = path.posix.join(from === "." ? "" : from, target);
      if (!(await exists(opts.root, resolved))) {
        issues.push({ file: rel, target, why: "link does not resolve" });
      }
    }
  }

  return issues;
}

export function formatIssues(issues: readonly DocsIssue[]): string {
  return issues.map((i) => `${i.file}: ${i.target} — ${i.why}`).join("\n");
}
