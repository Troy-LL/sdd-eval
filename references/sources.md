# Sources

Primary pages this guidebook steals from. Open when citing. Do not dump them into `docs/`.

## Agent maps and load

- [AGENTS.md](https://agents.md/) — one predictable agent map; closest file wins
- [Anthropic — Effective context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) — attention budget, just-in-time, compact traces
- [Anthropic — Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills) — name + description always; body on match
- [Karpathy llm-wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — index.md then drill; idea file, not an eval
- [llms.txt](https://llmstxt.org/) — small curated link index for *sites*, not a repo coding map
- [Claude Code memory](https://code.claude.com/docs/en/memory) — CLAUDE.md under ~200 lines; import AGENTS.md; trim architecture the model can derive
- [Cursor rules](https://cursor.com/docs/rules) — path-scoped vs always-on; do not copy the codebase into the map
- [Gemini CLI GEMINI.md](https://geminicli.com/docs/cli/gemini-md/) — hierarchical memory; point `context.fileName` at AGENTS.md instead of cloning
- [GitHub Copilot repository instructions](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions) — `.github/copilot-instructions.md` is the load path; keep it a stub

## Human docs

- [Diátaxis](https://diataxis.fr/) — one job per file; do not scaffold empty tutorial/how-to/reference/explanation trees
- [Nygard — Architecture decisions](https://www.cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
- [Readme Driven Development](https://tom.preston-werner.com/2010/08/23/readme-driven-development.html)
- [Standard Readme](https://github.com/RichardLitt/standard-readme/blob/master/spec.md) — libraries
- [GitHub — About READMEs](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes)
- [C4 model](https://c4model.com/) — you do not need all four levels
- [arc42](https://arc42.org/overview) — tailorable; travel light
- [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) — for humans, not machines
- [GitHub — default community health files](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/creating-a-default-community-health-file) — filenames so the UI can find them, not a create-all set
- [opensource.guide — governance](https://opensource.guide/leadership-and-governance/) — write it once you have a community, not at launch
- [Google SRE — on-call](https://sre.google/workbook/on-call/) — a playbook entry pairs with a paging alert

## Contracts

- [OpenAPI Specification](https://spec.openapis.org/oas/latest.html)
- [Protocol Buffers](https://protobuf.dev/overview/)
- [JSON Schema](https://json-schema.org/draft/2020-12/json-schema-validation)
- [Open Data Contract Standard](https://bitol-io.github.io/open-data-contract-standard/v3.0.1/home/)
- [Pact](https://docs.pact.io/) — contract from tests, not from a route table
- [dbt data tests](https://docs.getdbt.com/docs/build/data-tests)

## Models, cards, eval

- Mitchell et al., Model Cards — [arXiv 1810.03993](https://arxiv.org/abs/1810.03993)
- Gebru et al., Datasheets for Datasets — [arXiv 1803.09010](https://arxiv.org/abs/1803.09010)
- [Hugging Face model cards](https://huggingface.co/docs/hub/en/model-cards) — Hub README of the *model* repo, not the app `docs/`
- [OpenAI — Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices) — gold + criteria; vibe-based evals are an anti-pattern

## Spec-driven (keep the pause, kill the tree)

- [github/spec-kit](https://github.com/github/spec-kit)
- [OpenSpec](https://openspec.dev/docs/overview)
- [Kiro specs](https://kiro.dev/docs/specs/)

## Long context (do not overclaim)

- Liu et al., Lost in the Middle — [arXiv 2307.03172](https://arxiv.org/abs/2307.03172)
- Hsieh et al., RULER — [arXiv 2404.06654](https://arxiv.org/abs/2404.06654)
- Modarressi et al., NoLiMa — [arXiv 2502.05167](https://arxiv.org/abs/2502.05167)
- Lewis et al., RAG — [arXiv 2005.11401](https://arxiv.org/abs/2005.11401)
- Li et al., long-context vs RAG — [arXiv 2407.16833](https://arxiv.org/abs/2407.16833)
- Chroma, Context Rot — [technical report](https://research.trychroma.com/context-rot) (not peer-reviewed)
- Lu et al., SKILL0 — [arXiv 2604.02268](https://arxiv.org/abs/2604.02268) (train-time internalization, not an inference-cap receipt)

No billed study found that “cap is cheaper than dump” for skill-shaped product docs.
