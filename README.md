# sdd-eval

Eval harness for project docs layouts. Not a spec framework.

## Problem

Agents dump `docs/`, compact it into a second document, or dual-write YAML next to prose. We froze a cookbook (allowlist + load cap) and shipped it into Cursor-Maxxing `/bootstrap` and Troysetup `AGENTS.md`. We have not measured whether it is better.

This repo exists to kill or keep that cookbook with numbers.

## What this is not

- A 12-file docs kit
- A second EditLayer SPEC pile
- GraphRAG, image-SDDs, or Clojure-dense schemas
- A `cookbook.md` you copy into every project

## What we will measure (draft, under attack)

Layouts: dump `docs/` vs allowlist+load-cap vs compaction vs YAML dual-write.

Per trial: files loaded (path, hash, order), billed buckets (`cache_creation` / `cache_read` / uncached / output), task success, whether the agent cited the right file.

If the cookbook loses, we change it. If dump wins, we say so.

## Repo rule

This repo follows its own allowlist. Right now that is this README. `docs/eval.md` lands after the eval protocol survives Satan. No other doc types.
