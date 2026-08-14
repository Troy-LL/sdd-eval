# Troy's SDD

A guide to the `docs/` tree (and the two files next to it) so a human can skim it and a coding agent can open one file per turn instead of eating the whole folder.

Do not copy this file into a product repo. Put the files below in the product. This page is how to write them.

---

## 1. Start with the smallest tree that is true

Do not create empty docs for a future you do not have.

| If the repo is… | Create |
| --- | --- |
| Scratch, classwork, a spike | `README.md` only. No `docs/` yet |
| A product people run | `README.md`, `AGENTS.md`, `docs/architecture.md`. Add `docs/design.md` only if there is a screen |
| A product with a model in the loop | All of the above plus `docs/eval.md` |
| A product that made a real decision | Add one file under `docs/decisions/` when that decision ships |

That is the **ladder**. It is an authoring rule (what to create), not a load rule (what to open this turn). Do not write the ladder into `AGENTS.md` or the agent will open extra files because they exist.

A weekend script is `README.md` and nothing else. That is still Troy's SDD. You just have not climbed the ladder.

---

## 2. The folder

This is the whole tree. If a name is not here, it does not belong in `docs/`.

```
.
├── README.md                 humans: what it is, how to run
├── AGENTS.md                 agents: map of the files below, not a second spec
├── docs/
│   ├── architecture.md       how it works. points at schema. no column dump
│   ├── design.md             how it looks. omit if there is no screen
│   ├── eval.md               how we know it works. omit if no model
│   └── decisions/
│       └── 001-short-title.md   one decision. cite it. never glob this folder
├── src/                      code, including schema files architecture points at
├── hooks/keep-inside-root.mjs  deny writes and shell that leave this root
├── .cursor/hooks.json        Cursor: preToolUse + beforeShellExecution
├── .claude/settings.json     Claude Code: PreToolUse on Write/Edit/Bash
├── prompts/                  prompt text as code, not docs
└── evals/                    runs and reports as code, not docs
    └── reports/              dated writeups live here, not under docs/
```

Root `README.md` and `AGENTS.md` sit next to `docs/`, not inside it. `docs/` is the product spec. The map is one level up so every agent that looks for `AGENTS.md` finds it.

### Do not add

| Tempting file | Why not |
| --- | --- |
| `docs/README.md` | Second index. The map is `AGENTS.md` |
| `spec.md`, `plan.md`, `tasks.md` per feature | Spec Kit / Kiro bloat. Intent lives in the allowlisted file that changed, plus one ADR if it was a decision |
| `openspec/specs/` | Second source of truth |
| `docs/api.md`, `docs/data-model.md` | Schema lives in code. Architecture points at it |
| `docs/ai-architecture.md` | That is architecture, or eval |
| `tutorials/`, `how-to/`, `reference/` | Diátaxis needs can live *inside* the files above. Do not make four folder trees |
| `llms.txt` next to `AGENTS.md` | Second map |
| `llms-full.txt` | Dump |
| `CLAUDE.md` / `.cursorrules` that copy `AGENTS.md` | Dual-write. Point those files at `AGENTS.md` if a tool requires them |
| `docs/changelog.md` as the spec | Changelog is not how the product works |
| `COOKBOOK.md`, `BEST_PRACTICES.md`, this handbook | Process law stays out of the product |

---

## 3. Write each file for one job

Put a short identity line under the `#` title: what this file is. Then the facts that belong here and nowhere else. Stable content first, volatile later (cache). Do not repeat the same gold token in two files.

Before writing prose, check whether the fact can execute instead. Priority: **test > eval > schema-in-code > prose**. A gold command with an expected output is a spec that cannot rot silently; a paragraph describing the same behaviour can. `docs/` stays small because it holds only the non-executable residue — topology, rationale, UI behaviour.

| File | Holds | Never |
| --- | --- | --- |
| `README.md` | What it is, who for, run (install, command, config path, port, health), limits operators hit. Exact strings, not paraphrases | Process topology, UI tokens, SLOs |
| `AGENTS.md` | One bullet per file that exists, plus the load rule. See below | Architecture pasted in, limits copied from README, a job table of verbs that restates README |
| `docs/architecture.md` | Data flow, processes, sockets, replicas, one line pointing at the schema file in code | Field recaps. List columns and you just invented `data-model.md` |
| `docs/design.md` | Operator or user UI: poll, badges, empty copy, keyboard, retry, backoff, focus | Schema recap. Skip the file entirely on a headless service |
| `docs/eval.md` | Gold command and where it writes, SLOs, scrape, metric prefix, alert files | A winner-rule essay. Omit the file if no model or scored probe |
| `docs/decisions/NNN-title.md` | One decision: Status, Context, Decision, Consequences | A changelog, a second architecture, or a folder you glob |

`AGENTS.md` is the one worth copying verbatim, because the load rule lives in it:

```markdown
# <product>

Map only.

- `README.md` — run, limits, paths, commands
- `docs/architecture.md` — process, sockets, replicas, schema path
- `docs/design.md` — operator UI
- `docs/eval.md` — SLOs, scrape, gold command

Load this file + at most 2, or + 3 if this turn needs eval.md.
One extra file is enough. Skip unused.
Pin order only when loading more than one: README → architecture → design → eval.
Cite paths. Do not paste.
```

Drop any bullet whose file does not exist. In a monorepo a nested `AGENTS.md` in a package is fine (nearest file wins); do not stack three maps that copy each other.

**ADRs.** [Nygard](https://www.cognitect.com/blog/2011/11/15/documenting-architecture-decisions) shape, one decision per file, `001-preempt-lease.md` then `002-…`. Mark `superseded-by 002-…` when you reverse it. Write it when the decision ships. Do not recap it inside architecture.

Naming an ADR on the map is a routing decision, not an archival one. History can stay silent, and silent decisions are still real — dump-style reads find them, capped reads do not.

**An ADR gets a map line if and only if violating it would produce a plausible-looking wrong change.** `001-preempt-lease` changes runtime behaviour, so an agent that has not read it will write something that looks fine and is wrong: map it. "We picked pnpm over npm" cannot be violated by accident in a way that survives review: leave it silent, grep finds it when someone needs it.

**One special case.** In *this* git repo, `docs/eval.md` is the KEEP winner rule for a future real-product trial. Your product's `docs/eval.md` is the product probe, not that file.

---

## 4. How an agent should use this tree

The tree only works if the agent does not dump it.

1. Read `AGENTS.md`.
2. Open the one or two files the job needs. At most two extras, or three if this turn actually needs `eval.md`.
3. That cap is a **ceiling, not a quota**. One extra file is enough. Do not open architecture to fill a slot.
4. If you already know you need two, open them in pin order: README, architecture, design, eval. An ADR counts as one slot.
5. Cite the path. Do not paste the spec into chat. Do not summarize architecture into the map.

That is **just-in-time** load ([Anthropic](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents), [Karpathy index-then-drill](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)). The map holds paths. The Read tool holds the page.

Three fixes that look right and lose on the bench (numbers in section 8):

- **Forcing "exactly one extra file."** Sends a listen-port question to architecture.
- **Job headers on the map** to help routing. The agent still opens a leftover file.
- **Putting the load rule in a Read hook.** A hook can refuse a fourth file. It cannot teach which file to open, and it cannot find a silent ADR.

---

## 5. Hooks

**Hooks enforce invariants. Docs teach judgment. Never swap them.** A hook is a deterministic gate. It can say no to a fourth file or an out-of-root write, but it cannot say which file was right, and on our bench the deny made answers worse because the agent routed around the gate instead of learning from it.

| Hook-worthy | Never hook-worthy |
| --- | --- |
| Side-effect boundaries: writes and shell leaving the root | Load discipline and file routing |
| Destructive commands, secrets in output | Style, tone, "read the map first" |
| Format gates: commit message shape | Anything correct only in context the hook cannot see |

The test is cost asymmetry: hook it when a false no is cheap and a missed yes is expensive, then fail closed. **Never gate reads.** Read gating breaks skills, SDKs, and `node_modules`, and buys nothing — a read has no blast radius.

### The write fence

Docs discipline is not enough if the model writes to `C:\Users\…` or `cd ..`. Put the guard **in the product repo**, next to `AGENTS.md`, never as a global hook under `~/.cursor` or `~/.claude`.

- **Writes** (`Write`, `Edit`, Cursor `preToolUse`): path must resolve inside the repo root.
- **Shell** (Cursor `beforeShellExecution`, Claude `Bash`): `cd` / `Set-Location` and redirects (`>`, `Out-File`, `Set-Content`) must not land outside the root.
- **Reads**: not gated.

It is not an OS sandbox, not network allowlisting, and not a substitute for the load cap. Copy these three into another product:

```
hooks/keep-inside-root.mjs      the logic
.cursor/hooks.json              adapter: preToolUse + beforeShellExecution
.claude/settings.json           adapter: PreToolUse on Write/Edit/Bash
```

`.claude/settings.local.json` stays gitignored. Do not add these hooks to `fixtures/product/` — that fixture is an isolated copy for the bench. Cursor reloads `.cursor/hooks.json` on save; if a hook does not fire, open the Hooks output channel.

**`hooks/docs-load.mjs` is not in that list.** It is a bench probe (L1h) that gates Reads against the allowlist and cap. Do not install it in a product, in the fixture, or on this checkout's live Read hooks — it would block reading the fixture's dump extras while you work on the harness.

### Keeping hooks honest

- **One script, N adapters.** Logic lives once; the per-tool files only wire events to it. Adding a third tool is config, not code.
- **Hooks are code: test them.** Prove the bad case is denied *and* the good case is allowed. The allow-test is the one people skip, and it is how a hook silently breaks a workflow.
- **Repo-local for product invariants, global only for personal ergonomics.** The fence travels with the repo so every teammate and every agent inherits it.
- **Budget hooks like dependencies.** Each adds latency, a failure mode, and drift against the tool's hook API. Audit occasionally: a hook that never fires is either perfect or dead, and you should know which.

---

## 6. Which layer does what

Every negative result below is one layer doing another layer's job.

| Layer | Job | Fails when asked to |
| --- | --- | --- |
| `AGENTS.md` map | Routing and the load rule | Hold content (job headers: +31%, still dual-loads) |
| `docs/` files | Non-executable knowledge, one fact each | Mirror code, or each other |
| Hooks | Deterministic boundaries | Teach judgment (L1h) |
| Tests and evals | Executable spec, regression floor | — this layer absorbs almost anything |
| Bench | Measure the method, feed rules back here | Become the product |

The loop: bench measures → this handbook records the rule *with the number that justifies it* → map and hooks implement the mechanical subset → the docs lint keeps it from rotting between benches.

---

## 7. Keep it from rotting

**Bloat** is extra files and two copies of the same fact. **Rot** is the model's recall falling as you stuff more tokens in.

- One fact, one file. If README has `max-bays 36`, architecture does not.
- Point at schema. Do not copy the columns up.
- Do not put a YAML twin next to the Markdown.
- Do not compact the spec into a TL;DR on the map. Anthropic compact is for long *traces*, not for the product docs.
- Scratch notes stay out of git. Dated reports stay under `evals/reports/`.
- When a file's job dies (you remove the UI), delete `docs/design.md` and drop it from the map. Empty files are dump bait.

Two of those fail mechanically, so do not leave them to discipline. `npm run lint:docs` (`src/docs-lint.ts`, copyable) fails CI when a **map bullet does not resolve** or a **markdown link is dead** — the dangling-map case you get the day you delete `design.md`. `npm run check` also asserts every gold token lives in **exactly one** file, which is the dual-fact case. Neither lints prose, and neither gates the agent: a lint on the docs is not a hook.

---

## 8. What the bench actually showed

Spec Kit, OpenSpec, and Kiro all want intent before code. Keep that. They also emit `spec.md` / `plan.md` / `tasks.md` (or a parallel `openspec/specs/`) per change. That is a second spec, and it is what we are trying not to load.

Everything below is a planted-token lookup bench (cratewake, Claude Code, throwaway, `cli_cost_usd` not `$call1`, **not a KEEP trial**). A self-authored fixture cannot KEEP the method.

**Provenance: Claude Code 2.1.223, `claude-opus-5`, 2026-08-14.** These are properties of one model generation's retrieval-versus-context behaviour, not eternal truths. Long-context recall keeps improving, so the dump penalty may shrink and the cap's turn overhead may stop paying. **Re-bench on model change** and date the replacement. Keep every failed probe in this list: a graveyard with cost figures is what stops the next clever reader from re-proposing "exactly one extra file."

- **Mapped facts:** dump **60%** exact gold = cap **60%**, right file **100%** both ways. Dumping extra docs did not help. Cap used **63% fewer files** and **5× more turns**, at **+3%** cost.
- **Facts only on an unnamed ADR:** dump cited the file **100%**, cap **0%**, hunt cost **+99%**. Naming the ADR on a copy recovered **0% → 100%** gold and cut hunt cost **48%**. Do not retune a test fixture's map to cheat that.
- **Cap is not a cost cut overall:** **+51%** across ten paired tasks. It is a bloat cut on mapped facts and a trade on silent decisions.
- **"Exactly one extra file" (L1o):** gold **100% → 0%** on two tasks, **−40%** cost. Cheaper and wrong — pg-01 read architecture and answered `grpc 9104` instead of `7481/tcp`.
- **Job-routed map (L1j):** still dual-loaded on every mapped fact, **+31%** cost on pg-01, and still missed the ADR.
- **Read hook as a docs trainer (L1h): FALSE.** Four matched tasks against the prompt cap: cap_obey **3/4 → 4/4** (a fourth file was denied), prefix dual-load **2/2 → 0/2**, gold **2/4 → 1/4**, cost **+19%**, silent-ADR gold still **0**. The skip-unused reminder reproduced the L1o miss: `dock:lease` instead of `cratewake dock:lease`. Claude `--safe-mode` disables hooks; drop it without pinning the model and denying MCP tools and you measured a different subject.

---

## 9. Bench names

This git checkout is `sdd-eval`. It measures the tree. It is not a product.

| Name | Meaning |
| --- | --- |
| L0 | Dump the allowlist plus extras, no tools |
| L1 | Cap + Read |
| L1o / L1j / L1n / L1h | Probes: force one extra file / job-routed map / map names the ADR / Read hook. None are product |
| `$call1` | Billed $ from OpenAI or Anthropic buckets. KEEP cost bar |
| `cli_cost_usd` | Claude Code estimate. We quoted it. It cannot KEEP |
| KEEP (`docs/eval.md`) | Pre-registered winner rule for a *real* product. Cratewake cannot KEEP |

Do not retune `fixtures/product/AGENTS.md` against the yaml tasks. Do not copy this handbook into cratewake.
