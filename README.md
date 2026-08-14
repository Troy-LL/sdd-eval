# sdd-eval

Does **allowlist + load cap** beat **dump docs/** on billed tokens × task success?

This checkout is a **microbench** on a self-authored fixture, `fixtures/product/` (cratewake). A self-authored fixture cannot KEEP the cookbook. The cookbook remains untested for KEEP on real products. This is not a KEEP trial. It does not generalize to Troy-LL apps.

W5 still applies: if L1 sweeps dump-winnable axes, the result is cannot distinguish, not KEEP.

The KEEP winner rule lives in [`docs/eval.md`](docs/eval.md). It is for a real product. This fixture is not that subject. Prefix-gold n=40 here is by construction. The fruit is `$call1` dump vs cap. Do not read cratewake gold hits as SDD KEEP `task_success`.

## Treatments

Dump vs allowlist+cap only. Same fixture tree, different load rule. L0 may append dump extras after a shared allowlisted prefix. L1 loads `AGENTS.md` + at most 2 files, or 3 if `eval.md` is in play. Cap violation makes L1 `task_success` false. The bill stays in `$call1`.

No compact. No yaml layout.

## Honest counts

Prefix-gold 40 on this fixture is by construction, not a KEEP bar.

| stratum | n |
| --- | --- |
| prefix-gold | 40 |
| missing-slice | 14 |
| paired total | 54 |

Missing-slice floor is `max(10, 0.25 * 54) = 13.5`, so 14.

Prefix-gold facts sit in map-named files (`README.md`, `docs/architecture.md`, `docs/design.md`, `docs/eval.md`). Missing-slice facts sit only on the unnamed ADR `docs/decisions/001-preempt-lease.md`. The map does not name it. Gold is exact string/path. No LLM-as-judge.

Microbench tasks file SHA-256 `030349642c36cf2e3f0b1827a61499c835cf5c1caac39c8f8aa7e6d4beaf61eb`. That hash is not a KEEP pin.

## How to run

```bash
npm ci
npm test
npm run check
```

`npm run check` is the CI stub: gold exists, n counts, map silence. It does not call a model. It does not print billed `$`. It does not score KEEP.

Live, only if you have a key:

```bash
ANTHROPIC_API_KEY=... npm run eval
```

That path logs provider usage buckets and derives `$call1` from the formula in [`docs/eval.md`](docs/eval.md). No key, no `$`. Do not commit `evals/`. Do not read a local JSONL as KEEP.

## What this repo may contain

- `README.md` — this question
- `AGENTS.md` — map only
- `docs/eval.md` — KEEP winner rule for a real product, before run 1
- `fixtures/product/` — microbench fixture, not a KEEP subject
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
