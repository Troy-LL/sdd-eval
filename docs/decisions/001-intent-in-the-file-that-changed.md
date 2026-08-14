# 001 — Intent in the file that changed

Status: accepted

## Context

Spec Kit, OpenSpec, and Kiro want intent before code. That part is right. They also emit `spec.md` / `plan.md` / `tasks.md` (or `openspec/specs/`) per change. That is a second spec. Diátaxis wants one job per file, then people scaffold four empty folder trees. First-party agent tools want a small always-on map and just-in-time reads; a six-file dump every turn fights that.

This git checkout used to be `sdd-eval`, a planted-token microbench. A self-authored fixture cannot KEEP a method. Literature already covers dump vs retrieve vs index-then-drill. We do not need another wheel.

## Decision

We will keep intent-before-code and throw away the per-feature tree.

- Behaviour change → edit the allowlisted file that owns that fact.
- Architecturally significant choice → one Nygard ADR, cited, never globbed.
- Public contract → OpenAPI / proto / types in code. Architecture points. No markdown twin.
- `plan.md` / `tasks.md` → scratch for migrations, audits, multi-week epics. Not the product.
- This repo is the guidebook. It is not a KEEP trial. Do not copy it into a product.

## Consequences

Agents load less, and silent ADRs stay silent unless mapped. Public APIs, runbooks, and threat models still earn a file when that job exists; they do not earn a seat every turn. Cap is a ceiling, not a billed-cost claim. The old harness, fixtures, and task yaml are gone.
