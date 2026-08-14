# sdd-eval

Map only.

- `TROYS-SDD.md` — Troy's SDD handbook. Names, rules, findings. Not a KEEP winner.
- `docs/eval.md` — KEEP winner rule for a real product. No KEEP subject pinned.
- `fixtures/product/` — microbench fixture (cratewake). Exists to be measured. Not a KEEP subject.
- `sdd-eval-tasks.yaml` — microbench tasks. Not a KEEP pin.
- `src/run.ts` — harness. This code is the architecture of the bench.
- `src/docs-lint.ts` — map bullets and links must resolve. `npm run lint:docs`.
- `hooks/keep-inside-root.mjs` — deny writes and shell that leave this root.
- `hooks/docs-load.mjs` — bench probe (L1h). Do not install it anywhere.

No winner in this file.
