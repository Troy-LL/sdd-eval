# Troy's SDD

Troy's SDD is a way to write product docs that both a human and a coding agent can use without dumping the whole `docs/` folder into every turn.

This file is the handbook. Read it top to bottom and the names, rules, and numbers should make sense without another document. The git repo that holds this file is still called `sdd-eval`. That name is the microbench harness. Troy's SDD is the method.

It is not GitHub Spec Kit. It is not OpenSpec. It is not Kiro. It is not a KEEP winner. KEEP is defined below.

## How to read this file

1. [Names](#names) — every label we use, in plain language.
2. [Rules](#rules) — what you put in a product repo and how an agent loads it.
3. [Findings](#findings) — what we measured, with the percentage attached to the name.
4. [Steal and veto](#steal-and-veto) — what we took from other cookbooks and what we refused.
5. [This checkout](#this-checkout) — what each path in `sdd-eval` is for.

Product repos get the allowlisted files in [Rules](#rules). They do not get a copy of this handbook, `COOKBOOK.md`, `SPEC.md`, or `BEST_PRACTICES.md`.

---

## Names

### Troy's SDD

Spec-driven development as we practice it: a small **allowlist** of living Markdown files, plus a **load cap** per agent turn. Intent before code. Not a new `spec.md` / `plan.md` / `tasks.md` for every feature.

### Allowlist

The only product-doc filenames we will load on purpose:

| File | Job | Skip when |
| --- | --- | --- |
| `README.md` | What it is, who it is for, how to run | Never on scratch work |
| `AGENTS.md` | Thin **map**: commands, do-nots, pointers. No architecture pasted in | Never if agents work in the repo |
| `docs/architecture.md` | How it works. Points at the schema file. Does not recap columns | No shipping system yet |
| `docs/design.md` | Human look and feel | No screen |
| `docs/eval.md` | How we know it works | No model in the loop |
| `docs/decisions/NNN-title.md` | One **ADR** when you cite it | No decision yet |

`prompts/` and `evals/` may exist as code. They are not on the map. Dated reports go under `evals/reports/`, not `docs/`.

### Map

`AGENTS.md`. An index of paths, not a second spec. The agent reads the map first, then opens one of the files above. Same idea as [agents.md](https://agents.md/) and Karpathy's index-then-drill, not a paste of five files.

### Load cap (ceiling, not quota)

Per turn: `AGENTS.md`, then **at most 2** other allowlisted files, or **3** if `docs/eval.md` exists. One extra file is enough. Skip unused. Do not spend leftover slots.

Pin order **only when loading more than one**: README, then architecture, then design, then eval. An ADR counts as one of those slots.

### Ladder (authoring, not load)

Which files to *create*. Not which files to *open this turn*. Do not put the ladder inside `AGENTS.md` or the agent will spend the third slot because eval exists.

| Kind | Create |
| --- | --- |
| Scratch / classwork | `README.md` only |
| Product app | Add architecture and/or design when those things exist |
| AI system | `eval.md` exists. Still do not dump `docs/` every turn |

### ADR

Architecture Decision Record ([Nygard](https://www.cognitect.com/blog/2011/11/15/documenting-architecture-decisions)). One decision per file: context, decision, status, consequences. Mark `superseded-by NNN`. Cite one. Never glob `docs/decisions/`. Off the map until you want agents to find it on ordinary turns.

### KEEP / CHANGE / TRADE / VETO

Council labels, not git keep.

| Label | Means |
| --- | --- |
| KEEP | This rule stays |
| CHANGE | The freeze changed after evidence |
| TRADE | A real cost. Dump still wins unnamed facts |
| VETO | Do not do this |

**KEEP** in `docs/eval.md` is different. That file is the pre-registered winner rule for a future trial on a **real product**: billed `$call1` plus quality gates. This checkout has no KEEP subject. Cratewake cannot KEEP. Claude Code `cli_cost_usd` is not `$call1`.

### `$call1` versus `cli_cost_usd`

| Name | What it is |
| --- | --- |
| `$call1` | Billed dollars through the first scored answer, from OpenAI or Anthropic usage buckets. The KEEP cost bar |
| `cli_cost_usd` | Claude Code's client-side estimate. We quote it on cratewake. It cannot KEEP |

### Cratewake

The planted-token fixture under `fixtures/product/`. A fake dock-bay lease clock. Self-authored. Exists to be measured. Not a shipping product. Not a KEEP subject. Do not retune `fixtures/product/AGENTS.md` against the test tasks.

### Strata (what kind of fact)

| Name | Meaning | Where the gold lives |
| --- | --- | --- |
| prefix-gold | Fact the map already points at | README, architecture, design, or eval |
| missing-slice | Fact the map does not name | Only `docs/decisions/001-preempt-lease.md` |

Gold is an **exact substring**. Citing the right file is `cites_ok`. Opening too many extras on the cap arm is a `cap_obey` fail. Those two are diagnostics. KEEP quality uses `task_success` (gold, and cap-obey on L1).

### Arms and probes

Same fixture tree. Different load rule. Copy-only probes rewrite a temp checkout, never the committed fixture.

| Name | What it does |
| --- | --- |
| L0 | **Dump.** Prefix allowlist plus changelog, ops-noise, and the ADR, pasted, no tools |
| L1 | **Cap.** `AGENTS.md` plus Read, at most 2 extras (3 if eval exists) |
| L1n | Cheat-probe: copy of the map **names** the ADR. Not the cookbook |
| L1o | Prompt: read **at most one** extra file. Not the cookbook |
| L1j | Copy map rewritten as job headers. Not the cookbook |

Task ids: `pg-01` is prefix-gold row 1. `ms-02` is missing-slice row 2.

### Context rot and bloat

**Rot** (Anthropic): as tokens grow, recall falls. Attention is a finite budget. **Bloat** is extra files and dual-writes that spend that budget: `spec.md`/`plan.md`/`tasks.md` trees, `llms-full.txt`, a second `llms.txt` next to `AGENTS.md`, architecture pasted into the map, YAML that restates the prose.

---

## Rules

1. These filenames only. No `api.md`, `data-model.md`, `ai-architecture.md`, Diátaxis folder tree, or EditLayer shouting-case files.
2. `architecture.md` points at the schema (types / JSON Schema). If it lists columns, that is `data-model.md` in disguise.
3. `AGENTS.md` stays a map. Thin. No product or architecture text. No line-count to quote (200 was never measured).
4. Load cap is a ceiling. Skip unused. Do not force exactly one extra file.
5. Cite paths. Do not paste the spec. Do not compact it into a summary on the map.
6. Do not dual-write YAML next to the same prose.
7. One ADR when you cite it. Never glob. Off the map until named.
8. Stable content above volatile inside each file (cache prefix). Scratch notes stay out of git.
9. Do not ship this handbook inside a product repo.
10. Do not retune a KEEP fixture's `AGENTS.md` against its test tasks.

Per turn:

```
AGENTS.md
+ at most 2 files
+ 3 only if this turn needs eval.md
```

---

## Findings

Throwaway Claude Code 2.1.223, model `claude-opus-5`, n=10 paired tasks (5 prefix-gold + 5 missing-slice) plus 8 follow-up calls. Gold is exact substring. Dollars below are `cli_cost_usd`, not `$call1`. Logs are gitignored under `evals/`.

### Mapped facts (prefix-gold, n=5)

Facts the map already named. Dump vs cap.

| Metric | L0 dump | L1 cap | Read it as |
| --- | --- | --- | --- |
| Exact gold | 60% (3/5) | 60% (3/5) | Tied. Misses were shortened tokens (`36` vs `max-bays 36`), not the wrong file |
| Right file cited | 100% | 100% | Writing README paid for itself |
| Mean `cli_cost_usd` | $0.027 | $0.028 | Cap **+3%**. Not cheaper |
| Files in context | 8 | 3 | Cap **63% fewer files** |
| Turns | 1 | 5 | Cap **5× more turns** |

Dumping changelog, ops-noise, and the ADR did not raise mapped-fact gold.

### Unnamed decisions (missing-slice, n=5)

Gold lives only on the silent ADR.

| Metric | L0 dump | L1 cap | Read it as |
| --- | --- | --- | --- |
| Exact gold | 40% (2/5) | 0% | Dump wins. Cap never opened the ADR |
| Right file cited | 100% | 0% | Silence is a TRADE |
| Mean `cli_cost_usd` | $0.028 | $0.055 | Hunt **+99%** |

### All 10 paired

Cap **+51%** `cli_cost_usd` vs dump. Cap cheaper is **false** on this bench.

### Follow-up probes (not the cookbook)

| Probe | What we changed | Result | Cookbook? |
| --- | --- | --- | --- |
| L1n | Named the ADR on a **copy** of the map | Gold 0% → 100% on `ms-02` and `ms-03`. Hunt $ **−48%** | No. Product move: name a cited ADR. Do not retune the KEEP fixture |
| L1o | Force one extra file | Gold 100% → 0% on `pg-01` and `pg-02`. $ **−40%**. `pg-01` answered `9104` | No. Cheaper and wrong |
| L1j | Job headers on a copy map | Dual-load still 100% on those two prefix-golds. ADR still closed. `ms-03` broke cap | No. Shape did not beat leftover-slot fill |

### What you may quote

- Mapped facts: same gold, same cite, 63% fewer files, not cheaper $, 5× turns.
- Unnamed ADRs: dump finds them. Cap does not, and costs ~2× hunting.
- Name the ADR when agents should find it.
- Do not sell cap-as-cheaper. Do not sell job tables. Do not sell one-extra-file.

### What you may not quote as product KEEP

Cratewake is self-authored. n=10 throwaway. No `$call1`. No subject pin. A 54-task Claude rerun would still be throwaway. Trial 1 needs a real product and provider billed buckets. See `docs/eval.md`.

Dropped from the freeze because they were never measured: the number 200, mermaid/dek as speed claims, this method as a full eng handbook (CI, types, on-call).

Still unmeasured, still in the freeze as provenance: architecture must not recap schema fields (Bob). Reorder-as-cache-miss has no prefix-bust pair.

---

## Steal and veto

| Source | Steal | Veto |
| --- | --- | --- |
| [GitHub Spec Kit](https://github.github.com/spec-kit/) | Intent before code | Per-feature `spec.md` / `plan.md` / `tasks.md` |
| [OpenSpec](https://openspec.dev/docs/overview) | Delta of behavior. Enablers, not gates. Archive into truth | `openspec/specs/` as a second truth |
| [Kiro specs](https://kiro.dev/docs/specs/) | What / how / steps as a thinking order | Three new files per spec forever |
| [agents.md](https://agents.md/) | README for humans, `AGENTS.md` as the map | Fat AGENTS. Job tables as load policy. `CLAUDE.md` forks |
| [llms.txt](https://llmstxt.org/index.md) | Curated links, Optional = skippable | A second `/llms.txt`. `llms-full.txt` (dump) |
| [Karpathy llm-wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) | Index, then drill one page | An LLM-owned wiki that restates the spec |
| [Anthropic context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) | Attention budget. Just-in-time paths | Compacting the product spec. Sub-agents instead of a map |
| [Nygard ADR](https://www.cognitect.com/blog/2011/11/15/documenting-architecture-decisions) | One decision, one file, superseded-by | Globbing the folder |
| [Diátaxis](https://diataxis.fr/) | Four needs can live inside our filenames | `tutorials/` `how-to/` `reference/` trees |

---

## This checkout

| Path | What it is |
| --- | --- |
| `TROYS-SDD.md` | This handbook |
| `README.md` | How to run the microbench. Not the method |
| `AGENTS.md` | Map of this repo |
| `docs/eval.md` | KEEP winner rule for a **real** product. No subject pinned. Must not name cratewake |
| `fixtures/product/` | Cratewake. Do not retune its `AGENTS.md` against tasks |
| `sdd-eval-tasks.yaml` | 40 prefix-gold + 14 missing-slice. Hash in README is not a KEEP pin |
| `src/run.ts` | Harness. This code is the architecture of the bench |
| `src/claude-cli.ts` | Claude Code subject. Treatments L0, L1, L1n, L1o, L1j |
| `evals/` | Logs. Gitignored. Not docs |
| `grokbot session.md` | Conversation freeze. Not the handbook |

Canvases (open beside chat, not in git as product docs):

- Cookbook metrics: `canvases/sdd-cookbook.canvas.tsx` under the Cursor project
- Handbook UI: `canvases/sdd-handbook.canvas.tsx`

### Commands

```bash
npm ci
npm test
npm run check
```

`npm run check` does not call a model and does not score KEEP.

```bash
OPENAI_API_KEY=... npm run eval
```

That path can emit `$call1`. Still a cratewake microbench. Still not KEEP.

```bash
npm run eval:claude-pilot
npm run eval:claude-wave2
npm run eval:claude-wave3
```

Claude Code subscription. `cli_cost_usd` is not `$call1`.

`SDD_CAP=mechanical` writes a harness enforcement log (`evals/run-mechanical-cap.jsonl`). It is not allowlist+cap, not Troy's SDD, not KEEP, and not W4.

---

## Apply in another repo

1. Create the allowlisted files the ladder needs.
2. Keep `AGENTS.md` a skim of paths.
3. When a decision ships, write `docs/decisions/NNN-title.md`. If agents must find it on ordinary turns, add one map line. If not, leave it silent and accept that dump would still find it.
4. Do not copy this file into that repo.
