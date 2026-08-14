# Troy's SDD

Map only. This repo is the guidebook. Do not paste it into a product.

- `README.md` — who for, ladder, how to run this repo
- `docs/architecture.md` — authoring vs load, executable spec, never-list
- `docs/files.md` — occasion → maybe a file. Open when asking whether to create one. Not a checklist.
- `docs/decisions/001-intent-in-the-file-that-changed.md` — keep the pause, kill the tree
- `references/sources.md` — primary sources. Open when citing, not every turn
- `src/docs-lint.ts` — map bullets and links must resolve. `npm run check`
- `hooks/keep-inside-root.mjs` — deny writes and shell that leave this root

Load this file + at most 2. One extra file is enough. Skip unused.
Pin order only when loading more than one: README → architecture → files → ADR.
Cite paths. Do not paste.
