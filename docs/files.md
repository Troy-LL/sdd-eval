# Files

What each product file is, when it exists, why, where it lives, and what goes inside. Omit any file whose occasion is false.

This page is the catalog. Do not copy it into a product. Write the files it names, **only when they apply**. Listing a name is not permission to create it. Open this file when the question is “do I need a new file?” — not every turn.

---

## Three lifetimes

| Kind | Job | Git | Agent map |
| --- | --- | --- | --- |
| **Executable** | Tests, schema, OpenAPI, eval gold. CI can fail it | yes | cite the path from architecture / eval. Do not recap |
| **Durable** | Residue schema cannot hold: topology, UI, mapped ADR | yes | bullet iff the file exists **and** this turn might need it |
| **Exploratory** | Spike, RFC draft, design-week notes, a thinking model brainstorming | `scratch/` (gitignored) or the PR body | **never**. Promote or delete. Do not append into architecture until accepted |

A strong / proprietary thinking model should draft in **exploratory** files so it is not filling a template. It must not promote scratch onto the map until the job is true. Gold sets and tests stay rigid. Architecture stays short. The messy thinking lives off the map.

Promotion ladder: `scratch/` → (accepted) one ADR or a paragraph in the durable file that owns the fact → delete the scratch. Never merge an RFC into architecture.md as a blob.

---

## Occasion → maybe a file (default omit)

| Job | Maybe | Default |
| --- | --- | --- |
| Front door, how to run | `README.md` | always, even scratch |
| Agent routing | `AGENTS.md` | omit until a product doc exists |
| Topology not in compose/schema | `docs/architecture.md` | omit |
| There is a screen | `docs/design.md` | omit |
| Model + scored probe | `docs/eval.md` | omit; tests own booleans |
| Invisible-wrong decision | one `docs/decisions/NNN-*.md` | omit; map iff violation looks right |
| Published contract | OpenAPI / proto / types in code | never `docs/api.md` |
| Same checklist, sometimes | `SKILL.md` | not a map essay |
| Package with different commands | nested `AGENTS.md` | omit if it restates root |
| Decision in flight, spike, design week | `scratch/` then ADR or delete | never Spec Kit trees; never map scratch |
| You ship weights or a dataset | card next to that artifact (Hub README) | not product `docs/`; not `ai-architecture.md` |

---

## `README.md`

**Where:** repo root. Not under `docs/`.

**When:** always, including scratch.

**Why:** the front door. GitHub, humans, and agents that have not opened the map yet.

**Inside:** what it is, who it is for, how to run (install, command, config path, port, health), limits operators hit. Exact strings. For a library: install + one usage snippet. Relative links to sibling docs.

**Never:** topology, UI tokens, SLOs, license text, changelog, contributing ritual, architecture.

---

## `AGENTS.md`

**Where:** repo root, next to `docs/`. Nested copies only when a package has different commands or “never do X.”

**When:** the repo is a product and at least one extra doc exists. Scratch with only a README does not need a map.

**Why:** one predictable filename for agent context that would clutter the README. The map, not a second spec.

**Inside:** one bullet per file that exists. The load ceiling. Commands and do-nots that differ from defaults. Pointers. Two lines that permit `scratch/` without listing it.

**Never:** architecture pasted in. Limits copied from README. A job table of verbs. Files that do not exist. A clone of this map in `CLAUDE.md` / `GEMINI.md` / `.cursorrules`. Product maps do not bullet `files.md` (this guidebook’s map does, because the job here is authoring). `TOOLS.md`, `MCP.md`, `llms-full.txt`. `@import` of architecture — that is still always-on.

**Hosts:** one `AGENTS.md`. `CLAUDE.md` is `@AGENTS.md` plus Claude-only deltas. Gemini: `context.fileName` → `AGENTS.md`, or the same import. Copilot Chat needs `.github/copilot-instructions.md` as a **stub**, not a second spec. Root `copilot-instructions.md` is dead. Live tools come from the host session, not from markdown.

**Load:** this file + at most 2, or + 3 if this turn needs `eval.md`. Ceiling, not a quota. Skip unused. Pin order only when loading more than one: README → architecture → design → eval. An ADR counts as one of the 2–3. Opening scratch this turn spends a slot; it still does not earn a bullet.

---

## `docs/architecture.md`

**Where:** `docs/architecture.md`.

**When:** topology is not already obvious from compose, schema, and process mains. Multi-process, sockets, replicas, spill, “schema lives at `src/schema/….sql`.”

**Why:** a map of the running system. C4 context + containers is enough. Components only if they add value.

**Inside:** data flow, processes, sockets, replica counts, one line pointing at the schema file in code.

**Never:** field lists (that is `data-model.md` in disguise). Pixel design. Restated ADRs. User stories. The HTTP catalog.

**Delete** when you collapse to one process and the compose file is the map.

---

## `docs/design.md`

**Where:** `docs/design.md`.

**When:** there is a screen. Omit on a headless service.

**Why:** visual and interaction truth is not architecture and not the README.

**Inside:** operator or user UI: poll, badges, empty copy, keyboard, retry, backoff, focus.

**Never:** schema recap. Domain requirements. Endpoint lists.

**Delete** the day the UI dies, and drop the map bullet the same day.

---

## `docs/eval.md`

**Where:** `docs/eval.md`.

**When:** a model is in the loop **and** quality is a distribution you score (gold set, graders, SLOs). Omit if there is no model. Omit if tests already fail the boolean cases (parsers, schema-valid tool calls, “no UUID leaked”).

**Why:** “be helpful” is not a spec. A gold command and a dataset path are.

**Inside:** gold command and where it writes, sample floor, scrape, metric prefix, alert files.

**Never:** a winner-rule essay. Schema recap. Prompt-change vibes.

---

## `docs/decisions/NNN-title.md`

**Where:** `docs/decisions/001-short-title.md`, then `002-…`. Never glob the folder.

**When:** a decision shipped that an agent would violate with a plausible-looking wrong change. Runtime policy, trust boundaries, “we preempt stale leases in 12s.” Not “we use pnpm.”

**Why:** Nygard: small modular records, or the next person blindly accepts or blindly reverses.

**Inside:** Title, Status, Context (forces), Decision (“We will…”), Consequences (good and bad). One decision. One or two pages. Keep superseded files. Mark `superseded-by NNN`. Never reuse numbers.

**Map it** if and only if violating it would look right. Silent ADRs are still real; capped reads will miss them. That is the trade.

---

## Contract files (OpenAPI, proto, SQL, types)

**Where:** next to the code that compiles or migrates them. Not under `docs/` as a recap.

**When:** there is a published or internal contract.

**Why:** OpenAPI exists so consumers understand the service without extra documentation. Protobuf defines structure once. Tests and `datacontract test` fail CI. Markdown catalogs do not.

**Inside:** the schema. Comments on the types if you need narrative next to a field.

**Never:** a handwritten `docs/api.md` or `docs/data-model.md` twin. Point from architecture. Read the types file.

Human changelog for SDK consumers: `CHANGELOG.md` at root. It is for people and releases. Keep it off the agent map.

---

## Skills

**Where:** `.agents/skills/<id>/SKILL.md` or the host’s skill root. Optional `references/` beside the skill.

This guidebook ships one addressable skill: [`sdd`](../.cursor/skills/sdd/SKILL.md) (`/sdd`). Occasion and promote are files it opens, not extra skills. This page is the catalog. Product maps do not bullet it.

**When:** you keep pasting the same checklist, or a map section became a procedure that is only sometimes needed (debug this service, run this eval, ship this package).

**Why:** startup loads name + description. Body loads on match. That is how Cursor and Claude Code keep context unbounded without stuffing it.

**Inside:** when to use (description), then the procedure. Point at a reference file instead of inlining a spec.

**Never:** always-do one-liners (those stay on `AGENTS.md`). Stuffing architecture into a skill “to be thorough.”

---

## Hooks

**Where:** `hooks/keep-inside-root.mjs` plus one adapter per host (`.cursor/hooks.json`, `.claude/settings.json`). Repo-local.

**When:** agents can write. Copy the three files into a product.

**Why:** hooks enforce invariants. Docs teach judgment. A false no on a write leaving the repo is cheap. A missed yes is expensive.

**Inside the fence:** writes and shell must resolve inside the root. Reads: not gated.

**Never:** a Read hook that teaches the load cap. Denied reads teach the agent to dodge the gate.

---

## A model in the project

There is no `docs/ai-architecture.md`. That job already has seats:

| Fact | Lives |
| --- | --- |
| Where the model sits, which tools it may call, how retrieval is wired, how an agent uses the API | `docs/architecture.md` (topology). Point at the config / schema / tool types |
| How we know it works: gold command, graders, SLOs | `docs/eval.md` |
| Prompt text | `prompts/` as **code**, not in the map |
| Run logs, dated reports | `evals/` (and `evals/reports/`). Not `docs/` |
| “How to run the eval / swap the provider” as a checklist | a **skill**, body on match |
| Why we picked TAI64n, a fence token, a judge model | one ADR, mapped only if violating it looks right |

A classifier with exact-match labels can stay a test. Do not create `eval.md` to describe assertions. Do not create `ai-architecture.md` so the AI feels special. If the topology paragraph is getting long, point at the graph in code and cut the recap — same rule as any other system.

A **model card** (Mitchell; Hub README of a *model* repo) discloses a checkpoint: intended use, out-of-scope, subgroup metrics, license. A **datasheet** (Gebru; dataset-repo README) discloses a dataset version: collection, labeling, forbidden uses. Those attach to the artifact you published, not to this service’s topology and not to this repo’s gold command. Folding them into `architecture.md` or `eval.md` makes the file lie the day you pin new weights. Gold sets stay rigid. wandb reports and dated `evals/reports/` stay exploratory. Thinking models still need gold; they do not get a looser spec.

## Other jobs that earn a file

Architecture, design, and eval are the default `docs/` trio. They are not the universe.

**Earn a file** when the job exists and is not already a schema, a test, or a row above:

- Human SDK history → `CHANGELOG.md` at root, off the agent map
- Pager → a runbook. Skill or cited path. Not always-on
- Auditor → threat model / ASVS packet. Same load rule

**Do not earn a file** for a new *name* of an old job. Graveyard (existence is not permission):

`docs/data-model.md` · `docs/api.md` · `docs/ai-architecture.md` · `docs/README.md` · `docs/overview.md` · `SPEC.md` · per-feature `spec.md` / `plan.md` / `tasks.md` · `openspec/specs/` as a twin of architecture · `llms-full.txt` · `TOOLS.md` · `MCP.md` · `PRODUCT.md` · `VISION.md` · `ROADMAP.md` as a wishlist · empty `GOVERNANCE.md` · `thinking.md` on the map · uppercase `ARCHITECTURE.md` / `DESIGN.md` next to `docs/` · Diátaxis `tutorials/` `how-to/` `reference/` `explanation/` trees

GitHub health files (`CONTRIBUTING`, `CODE_OF_CONDUCT`, `SECURITY`, `LICENSE`, `SUPPORT`, `FUNDING.yml`) exist so the **host UI** can find them. Do not mint the community-profile set. `GOVERNANCE.md` waits for a real decision body. `CHANGELOG.md` is for upgraders, off the map. A runbook waits for a paging alert.

## Scratch that is not the product

`plan.md` / `tasks.md` / RFC drafts for a migration, an audit, a multi-week epic, or a thinking-model design week: write them under `scratch/` (gitignored) or in the PR. Delete or promote when it merges. They are not the product.

Promote by distill, never by renaming `thinking.md` → `architecture.md`. An RFC still marked proposed is not current topology — “Proposed: we will add a queue” in `architecture.md` is a lie. OpenSpec archive-into-`specs/` is a markdown twin, not promote. Sprint notes, retros, ticket dumps, and meeting notes die at merge.

Runbooks and threat models: create them when the pager or the auditor exists. Load them as a skill or a cited path, not as always-on map body.

Do not create empty `docs/architecture.md` because a template expected it.
