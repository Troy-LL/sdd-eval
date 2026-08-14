# Troy's SDD

A guidebook for the two files next to `docs/` and the few files inside it. Humans skim it. Agents open one file per turn.

Do not copy this repo into a product. Put the files the product actually needs. This page is how to choose them.

## Who it is for

Anyone shipping software that a coding agent will touch. Scratch scripts, libraries, apps, services with a model in the loop.

## Two rules

**Authoring** is a ladder. Create a file when that job is true. Absence is correct.

**Load** is index-then-drill. Read [`AGENTS.md`](AGENTS.md). Open the one or two files this turn needs. Do not dump `docs/`.

Intent before code stays. A per-feature `spec.md` / `plan.md` / `tasks.md` tree does not.

## Apply it

| If the repo is… | Create |
| --- | --- |
| Scratch, classwork, a spike, a small library | `README.md` only |
| A product people run | `README.md`, `AGENTS.md`, `docs/architecture.md` if topology is not already in compose / schema / mains |
| A product with a screen | Add `docs/design.md` |
| A product with a model and a scored probe | Add `docs/eval.md` |
| A decision that would look right if violated | Add one `docs/decisions/NNN-title.md` and map it |

What belongs in each file: [`docs/files.md`](docs/files.md). How authoring and load fit together: [`docs/architecture.md`](docs/architecture.md). Primary sources: [`references/sources.md`](references/sources.md).

Agents run the ladder through [`/sdd`](.cursor/skills/sdd/SKILL.md). Point it at a PRD or idea dump to distill — it writes only the files that job earned, then deletes the dump (or parks it in `scratch/`). Load stays on the product `AGENTS.md`.

## Run this repo

```bash
npm ci
npm test
npm run check
```

`npm run check` fails if a map bullet or a markdown link dangles. It does not call a model.

Copy into a product, if you want the write fence:

```
hooks/keep-inside-root.mjs
.cursor/hooks.json
.claude/settings.json
```

Reads are not gated. Hooks fence writes and shell that leave the root.

A thinking model drafts in `scratch/` (gitignored). Do not map it. Promote a fact into the durable file that owns it, or delete the draft.

## Limits

This is not a framework. It does not generate folders. It does not score KEEP. Cap is a ceiling, not a cost claim.
