# Architecture

How the guidebook works. Not the product spec of some other repo.

## Split

Authoring decides **which files exist**. Load decides **which of those you open this turn**.

Do not write the ladder into `AGENTS.md`. If the map lists a file because it exists, the agent will open it because it exists.

```
README.md + AGENTS.md     always, once the repo is a product
docs/architecture.md      when topology is not already in code
docs/design.md            when there is a screen
docs/eval.md              when a model has a scored probe
docs/decisions/NNN-*.md   when a decision would look right if violated
OpenAPI / proto / SQL     the contract. Architecture points. Do not recap.
SKILL.md                  sometimes-procedures. Name + description always; body on match.
```

## The cap is the map

Context rot is fought at **load**, not by banning filenames.

`AGENTS.md` stays thin because it is **always on**. Claude’s own trim: keep it under ~200 lines; Cursor rules under ~500. That is the quote-unquote line cap. It is not a cap on `docs/architecture.md`.

A long architecture file sitting on disk does not rot the window. Opening it every turn does. Opening five synonyms of it (`architecture.md`, `ai-architecture.md`, `data-model.md`, `api.md`, `overview.md`) is dump with extra steps. Exploratory drafts live in `scratch/` and stay off the map so a thinking model can brainstorm without boxing itself into a template.

If one file is too large **even for the turn that needs that job**, split by **job**, not by synonym:

| Split | Good | Bad |
| --- | --- | --- |
| New job | runbook, threat model, OpenAPI, a skill, a nested package map | `ai-architecture.md` that restates architecture |
| Same job, shorter | point at `src/schema/lease.sql` and stop | paste columns into `docs/data-model.md` |
| Sometimes-procedure | `SKILL.md` body loads on match | job table on `AGENTS.md` that lists every procedure |

Test: would an agent with **only this file** do a **different** job? If not, you invented dump bait.

## Load

1. Read `AGENTS.md`.
2. Open the one or two files the job needs. At most two extras. If `eval.md` exists **and this turn needs it**, at most three.
3. That cap is a ceiling, not a quota. One extra file is enough.
4. Cite the path. Do not paste the spec. Do not summarize architecture into the map.

Nearest nested `AGENTS.md` wins in a monorepo. Do not stack three maps that copy each other. `CLAUDE.md`, if a tool requires it, imports `AGENTS.md`. It does not clone it.

Procedures that are only sometimes true live in skills, not on the map. Path-scoped rules exist for file-type conventions. Unscoped rules that load every session are a second map.

## Executable spec

Priority: **test > eval > schema-in-code > prose**.

`docs/` holds the residue schema cannot hold: grain, topology, UI behaviour, the why of a decision. If a sentence can be regenerated from DDL, OpenAPI, or a test, delete it.

Point at the types file. Do not paste columns. Agents Read the schema path. They do not recap it into markdown.

## Layers

| Layer | Job | Fails when asked to |
| --- | --- | --- |
| `AGENTS.md` | Routing and the load ceiling | Hold content, job tables, architecture |
| `docs/` | One fact per file | Mirror code, or each other |
| Skills | Sometimes-procedures | Always-do one-liners |
| Hooks | Side-effect boundaries | Teach which file to open. Never gate reads |
| Tests / schema / eval gold | What can fail CI | A vibe paragraph |

## Never

Do not add `docs/README.md` (second map). Do not add per-feature `spec.md` / `plan.md` / `tasks.md`. Do not add handwritten `docs/api.md` or `docs/data-model.md`. Do not add `llms-full.txt`. Do not scaffold empty `tutorials/` / `how-to/` / `reference/` / `explanation/` trees. Do not put this handbook in a product. Do not create empty shells for later.

`plan.md` / `tasks.md` may exist as **scratch** for a migration, an audit, or a multi-week epic. Delete them when it merges. They are not the product.

Dump still wins a small self-contained folder and a lexical needle. Index-then-drill wins once distractors and unnamed facts sit in a long haystack. Do not claim the cap is cheaper. Compact traces, not the spec.

The catalog of product files is [`files.md`](files.md). The decision this repo made is [`decisions/001-intent-in-the-file-that-changed.md`](decisions/001-intent-in-the-file-that-changed.md). Sources: [`../references/sources.md`](../references/sources.md).
