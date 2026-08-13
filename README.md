# sdd-eval

Which project-docs layout wins on **billed tokens × task success × cite-accuracy** for SDD tasks?

Not a spec framework. Not a template shop. Cursor-Maxxing and Troysetup already encode a cookbook. This repo exists to falsify it.

## Treatments (same information, different layout)

Fixtures, not docs:

- `fixtures/dump`
- `fixtures/allowlist`
- `fixtures/compact`
- `fixtures/yaml`

Same corpus across dump vs allowlist. If writing quality differs, the eval is confounded. Corpus must change between turns or cache-bust is fake.

## What this repo may contain

- `README.md` — this question
- `AGENTS.md` — map only, no Toktok essay
- `docs/eval.md` — winner rule, **before** run 1
- `prompts/` / `evals/` — treatments and logs, not docs

No `SPEC.md`, `ARCHITECTURE.md`, `DESIGN.md`, `BEST_PRACTICES.md`, `COOKBOOK.md`, no ADR that names a winner before numbers. No `architecture.md` of the philosophy. The harness code is the architecture.

## Rules that stop us cheating

- Winner rule pre-registered. Cheap and wrong loses.
- First reported run is the run. Pilots are throwaway.
- Do not tune `AGENTS.md` against the test tasks.
- Do not use the same model as subject and judge.
- If allowlist wins every axis, the eval is probably rigged.
- Dump may win success. Compaction may win tokens on a static corpus. Say so.

`docs/eval.md` is not written yet. It lands when the protocol survives the rest of the team.
