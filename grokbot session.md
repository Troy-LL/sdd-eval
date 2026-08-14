Cookbook, frozen enough to use. Bob can still veto provenance; I won’t add types.

Allowlist only:

README.md — product
AGENTS.md — the only map, thin, under ~200 lines. Commands, do-nots, pointers. No architecture pasted in.
docs/architecture.md — how it works, including how an agent uses the API
docs/design.md — human look/feel; omit if no screen
docs/eval.md — only if a model is in the loop
docs/decisions/NNN-title.md — cite one; never glob; superseded-by
Load: AGENTS.md + 2 files, or + 3 if eval.md exists. Cite paths. Don’t paste the spec. Don’t put this cookbook in the repo.

Scratch: README. App: add architecture/design only when those files exist. AI: eval.md exists. prompts/ and evals/ are code, not in the map.

so tell me what is our cookbook looking like now

This is the cookbook. Not a framework, not a file you commit. A set of rules you apply per repo.

Allowlist. These filenames only.

README.md — what it is, who it’s for, how to run. The product page. No docs/product.md.
AGENTS.md — the only map. Thin (target under 200 lines): commands, do-nots, pointers. No architecture pasted in. No second index in docs/README.md.
docs/architecture.md — how it works, data flow, schema, how an agent uses the API.
docs/design.md — human look/feel. Omit if there’s no screen.
docs/eval.md — how we know it works. Exists only if a model is in the loop.
docs/decisions/NNN-title.md — one ADR when you cite it. Never glob the folder. Mark superseded by NNN. Don’t turn it into a changelog.
prompts/ and evals/ can exist as code. They are not in the map. Dated reports live under evals/reports/, not in docs/.

How an agent loads it

Per turn: AGENTS.md + 2 files. If eval.md exists, + 3, so a real AI change can take README + architecture + eval.

Cite paths. Don’t paste the spec. Don’t compact it into a summary. Don’t dual-write YAML next to prose.

Stable content above volatile inside each file (cache). Scratch notes stay out of git.

Ladder

Scratch / classwork: README.md only
Product app: add architecture and/or design only when those files exist
AI system: eval.md exists; you still don’t dump the folder
Don’t

Don’t ship this cookbook in the repo. Don’t add api.md, data-model.md, ai-architecture.md, Diátaxis trees, or a phase log in the spec. Don’t copy EditLayer’s six shouting-case files. That’s the anti-pattern this is built to prevent.

Bob can still punch a hole in provenance. Until then, this is what we use.

so go on talk with bob

Pinging Bob with the frozen cookbook, not the old draft. I need a provenance veto or a sign-off, not a new file type.

He’s on it. I’ll fold whatever he sends into the freeze.

Bob signed off. I’m taking all three conditions. Without the schema rule he vetoes, so that’s locked.

Frozen cookbook, final:

Allowlist only: README.md, AGENTS.md, docs/architecture.md, docs/design.md (omit if no screen), docs/eval.md (only if a model), docs/decisions/NNN-title.md (cite one, never glob).

architecture.md points at the schema file (types / JSON Schema). It does not recap fields. If it lists the shape, that’s data-model.md in disguise.

AGENTS.md is the prefix map: commands, do-nots, pointers. Ceiling 200 lines, not a target. If it grows product or architecture text, it’s a second SDD.

Load cap, not a starter kit: AGENTS.md + 2, or + 3 if eval.md exists. Don’t default-load README+architecture+eval every turn. Skip what the job doesn’t need. When you load more than one, pin order: README → architecture → design → eval. An ADR counts as one of the 2–3. Reordering is a cache miss.

Cite paths. Don’t paste the spec. Don’t put this cookbook in the repo. prompts/ and evals/ stay out of the map.

That’s freeze. Scratch = README. App = add architecture/design only when those files exist. AI = eval.md exists, still not dumped every turn.

---

Metric patch v0.6 (2026-08-14). Throwaway Claude Code lookup microbench on cratewake. n=10 + 4 follow-ups. cli_cost_usd is a client-side estimate, not $call1. Self-authored fixture cannot KEEP. Apply outside sdd-eval. Do not retune fixtures/product/AGENTS.md.

CHANGE — cap is a ceiling, not a quota.
AGENTS.md + at most 2 files, or 3 if eval.md exists. One file is fine. Skip unused. Do not spend leftover slots on architecture/eval when the map already pointed at README.
Evidence: L1 loaded README+architecture on every prefix-gold turn. Forcing one extra file (L1o) made pg-01 read architecture and miss README.

KEEP — ADRs off the map until you cite one. Never glob.
Evidence: silent map → L1 missing-slice 0/5 gold, never opened the ADR, hunt cost ~2× dump. Naming the ADR (L1n) recovered ms-02/03. That probe is not the cookbook.

TRADE — dump still wins unnamed facts. Pin-order only when loading more than one. Do not make “exactly one extra file” the rule.
Evidence: L1o pg-01 wrong file; pg-02 cheaper wording miss.

Unjustified: 200-line ceiling, schema-not-recap, reorder-as-cache-miss, omit design.md, “cap is cheaper,” KEEP.

Sources: https://agents.md/ (AGENTS.md as the agent map). Karpathy llm-wiki: schema/index then drill into linked pages, not a no-tools dump — https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f
Logs: evals/claude-pilot.jsonl, evals/claude-wave2-L1n.jsonl, evals/claude-wave2-L1o.jsonl, evals/claude-wave3-L1j.jsonl (gitignored).

Wave3 L1j (copy-only job map, 4 calls). Not KEEP. Do not add to freeze.
pg-01 gold, still README+architecture, $0.035 vs L1 $0.027 (+31%).
pg-02 gold, README+eval, $0.029 vs L1 $0.028.
ms-02 gold miss, ADR unopened, $0.066.
ms-03 gold miss, cap fail (4 extras), $0.051.
Dual-load on mapped facts: 100% still. Job headers are not more efficient.

Human-facing percentages (throwaway, cli_cost, n=10 paired):
Mapped facts exact gold 60% dump = 60% cap. Right file 100% = 100%.
Unnamed ADR exact gold 40% vs 0%. Right file 100% vs 0%.
Cap $ vs dump: mapped facts +3%, unnamed hunt +99%, all 10 +51%.
Files in context on mapped facts: 8 vs 3 (63% fewer). Turns: 1 vs 5 (5× more).
Name the ADR (L1n, not cookbook): 0% → 100% gold on 2 tasks, hunt $ −48%.
Force one extra file (L1o): gold 100% → 0% on 2 tasks, $ −40%.

---

Autonomous v0.7 (2026-08-14). Claude Code CLI only. No provider $call1. Decisions, not a KEEP waiver.

KEEP trial 1 is postponed. Not cratewake. Not cli_cost_usd. Do not edit docs/eval.md to treat Claude estimates as W1. Do not pin this fixture as subject. Do not run the 54-task yaml as theater.

Quote cratewake as microbench percentages only:
- Cap cheaper: FALSE (+51% / +3% / +99%).
- Job tables: FALSE (L1j).
- One extra file as the rule: FALSE (L1o).
- Name a cited ADR: product move, not a fixture retune (L1n).

Dropped from freeze: the number 200, mermaid/dek as claims, full eng handbook.
Kept unmeasured: schema-not-recap (Bob), prefix-bust cache pair.
AGENTS.md stays thin pointers, no architecture pasted. No line cap to quote.

Handbook v0.8 lives in TROYS-SDD.md (this checkout only). Product repos still do not get COOKBOOK.md. Philosophy: allowlist + per-turn load, not Spec Kit / OpenSpec / Kiro artifact trees. Cost-efficient means skip unused and name cited ADRs, not “cap is cheaper.” Rot: attention budget, cite don’t paste, don’t compact the spec. Bloat: no spec.md/plan.md/tasks.md per feature, no llms-full, no second map.

---

Handbook v0.9 (2026-08-14). L1h docs-load Read hook, four matched tasks vs wave-1 L1. Throwaway. Not KEEP.

CHANGE — hooks fence load; they do not train it.
keep-inside-root stays the product copy (writes/shell in this root). Do not copy hooks/docs-load.mjs into a product, the fixture, or this repo’s live Read hooks.
Evidence: cap_obey 3/4 → 4/4 (ms-02 denied eval.md as 4th extra). Prefix dual-load 2/2 → 0/2. Gold 2/4 → 1/4 (pg-02 dock:lease vs cratewake dock:lease, same miss as L1o). Missing-slice gold 0/2. cli_cost_usd +19%. Silent ADR still unnamed. --safe-mode disables hooks; drop it without pinning opus and denying mcp__* and you measured a different subject.

Logs: evals/claude-wave4-L1h.jsonl (gitignored).

---

Handbook v1.0 (2026-08-14). Review response. Maintenance dimension, no new load rules.

ADD — layer rule: hooks enforce invariants, docs teach judgment, never swap them. Hook-worthy is side-effect boundaries, destructive commands, secrets, format gates: false no cheap, missed yes expensive, fail closed. Never hook load discipline, routing, or style. Never gate reads.
ADD — hook hygiene: one script N adapters; test deny AND allow (allow-test is the skipped one); repo-local for invariants, global only for ergonomics; budget hooks like dependencies and audit dead ones.
ADD — ADR map rule: a map line iff violating the ADR would produce a plausible-looking wrong change. Runtime behaviour → map it. "pnpm over npm" → silent.
ADD — executable-spec priority: test > eval > schema-in-code > prose. docs/ holds the non-executable residue.
ADD — layer table (map / docs / hooks / tests / bench) and the loop: bench → handbook rule with its number → mechanical subset in map+hooks → lint between benches.
ADD — provenance on section 8: Claude Code 2.1.223, claude-opus-5, 2026-08-14. Re-bench on model change. Keep the graveyard of failed probes with cost figures.

CODE — src/docs-lint.ts + npm run lint:docs, wired into npm run check. Fails on a dangling map bullet or dead markdown link. Deliberately NOT "every backticked path exists": a handbook is full of paths you must not create, so that rule is all false positives. Gold-token uniqueness was already in check() (one fact, one file) — not rebuilt.
Not a hook. A lint on the docs is not a gate on the agent.
Tests: 54 pass, including an allow-test per failure mode and a dogfood lint of this repo's own map.