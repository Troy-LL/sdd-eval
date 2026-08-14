# sdd-eval

Does **allowlist + load cap** beat **dump docs/** on billed tokens × task success?

This checkout is a **microbench** on a self-authored fixture, `fixtures/product/` (cratewake). A self-authored fixture cannot KEEP the cookbook. The cookbook remains untested for KEEP on real products. This is not a KEEP trial. It does not generalize to Troy-LL apps.

W5 still applies: if L1 sweeps dump-winnable axes, the result is cannot distinguish, not KEEP.

Winner rule: [`docs/eval.md`](docs/eval.md). Pre-registered. W5 unsigned until there is a log. This PR does not invent a billed JSONL or a KEEP result.

## Treatments

Dump vs allowlist+cap only. Same fixture tree, different load rule. L0 may append dump extras after a shared allowlisted prefix. L1 loads `AGENTS.md` + at most 2 files, or 3 if `eval.md` is in play. Cap violation makes L1 `task_success` false. The bill stays in `$call1`.

No compact. No yaml layout.

## Honest counts

| stratum | n |
| --- | --- |
| prefix-gold | 40 |
| missing-slice | 14 |
| paired total | 54 |

Missing-slice floor is `max(10, 0.25 * 54) = 13.5`, so 14.

Prefix-gold facts sit in map-named files (`README.md`, `docs/architecture.md`, `docs/design.md`, `docs/eval.md`). Missing-slice facts sit only on the unnamed ADR `docs/decisions/001-preempt-lease.md`. The map does not name it. Gold is exact string/path. No LLM-as-judge.

## How to run

```bash
npm ci
npm test
npm run check
```

`npm run check` is the CI stub: gold exists, n bars, hash pin, map silence. It does not call a model. It does not print billed `$`.

Live, only if you have a key:

```bash
ANTHROPIC_API_KEY=... npm run eval
```

That path logs provider usage buckets and derives `$call1` from [`docs/eval.md`](docs/eval.md). No key, no `$`. Do not commit `evals/`. Do not read a local JSONL as KEEP.

## What this repo may contain

- `README.md` — this question
- `AGENTS.md` — map only
- `docs/eval.md` — winner rule, before run 1
- `fixtures/product/` — subject, not a shipping product
- `src/` — harness
- `prompts/` / `evals/` — logs, not docs

No `SPEC.md`, `ARCHITECTURE.md`, `DESIGN.md`, `BEST_PRACTICES.md`, `COOKBOOK.md`, no ADR that names a winner before numbers. No `architecture.md` of the philosophy. The harness code is the architecture.

## Rules that stop us cheating

- Winner rule pre-registered. Cheap and wrong loses.
- First reported run is the run. Pilots are throwaway.
- Do not tune `AGENTS.md` against the test tasks.
- Do not use the same model as subject and judge.
- If allowlist wins every axis, the eval is probably rigged.
- Dump may win success. Say so.
- Self-authored fixture cannot KEEP the cookbook.
