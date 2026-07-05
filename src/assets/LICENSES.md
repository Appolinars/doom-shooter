# Asset licenses — doom-shooter

Resolves SAD §11 open question *"asset / sprite source + sizing pipeline"* and satisfies
the license-clean requirement (SAD §2 regulatory, PRD §6.1 asset-licensing abuse case).

## Sprites

| Asset | Source | License |
|---|---|---|
| `demon-fast` (lean red imp) | Own pixel art, authored in-repo | Original work — © project, all rights reserved to the author |
| `demon-brute` (bulky green brute) | Own pixel art, authored in-repo | Original work — © project, all rights reserved to the author |

**Decision (PRD §8 default): own pixel art.** Both demon sprites are hand-authored as
char-grid pixel matrices in [`demon-art.ts`](./demon-art.ts) and rasterized at load by
[`sprites.ts`](./sprites.ts). Nothing is sourced from a third party, so there is zero
license-takedown exposure.

## Budget

The sprites are a few hundred bytes of source each (12×12 char grids) with no binary image
files, staying far inside the ~2–3 MB asset budget (PRD §7) and the ≤ 3 s initial-load NFR
(PRD §6). Adding any third-party asset later requires a new row here **and** re-checking the
budget before commit.
