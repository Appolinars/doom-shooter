---
id: T-07
epic: game-feel
project: doom-shooter
wave: 3
priority: P1
estimate: S
blocks: [T-08]
blocked_by: []
status: done
context_budget: 4000
created: 2026-07-06
owner: Maksym Vakulenko
---

# T-07 — Sprite / backdrop / demon-art assets (fail-soft)

## Goal

Wire the author-supplied art through the existing fail-soft atlas: extend `src/assets/sprites.ts` with viewmodel (shotgun) frames + per-HP-step hurt frames + death frames; extend `src/assets/demon-art.ts` with hurt/death art per demon type; add `src/assets/backdrops.ts` that picks a random backdrop per round and falls back to black when none loads. Every new key reuses `atlas.get → null → placeholder` (AC-06) so a missing file degrades, never crashes. **Product DoR:** the exact asset list (PRD §8 OQ) must be resolved to at least its defaults before this ships.

## Linked artifacts

- [[../PRD.md]] AC-06 (missing sprite/backdrop → placeholder, never crash), §8 OQ "exact asset list" + "hurt = per-HP-step frames" (resolved: per-step), §6 NFR "Initial load ≤ 3 s" (assets never block).
- [[../sad.md]] §5 (`sprites.ts ◐ viewmodel + per-HP-step hurt + death frames`, `backdrops.ts ● random pick, fail-soft → black`, `demon-art.ts ◐ hurt/death per type`), §8 (Fail-soft assets row), §11 (per-HP-step art multiplies frames; fail-soft covers gaps).
- [[../adr/0001-demon-hp-as-bounded-field-damaged-inline.md]] — hurt frame chosen by `hp` (per-step), read render-side.
- Base loader reused: [[../../basic-shooting-range/tasks/T-10-sprites-and-assets.md]].

## Acceptance criteria

**AC-T07-1 (fail-soft every kind, PRD AC-06)**
Given any new asset key (viewmodel frame, hurt/death frame, backdrop) is missing
When it is requested
Then `atlas.get`/backdrop pick returns a placeholder/black and logs once — never throws.

**AC-T07-2 (per-HP-step hurt frames)**
Given a demon type with `maxHp = 4`
Then hurt frames exist per step (`@3/@2/@1`) plus full + death; a missing step falls back to the nearest available (fail-soft), not an error.

**AC-T07-3 (random backdrop per round)**
Given ≥ 2 backdrops are supplied
When a round starts (or retry rerolls)
Then one is picked at random; with zero loaded, the backdrop is black (fail-soft) and the round still plays.

**AC-T07-4 (license-clean)**
Given assets are published
Then a license note records each asset's source/license (PRD §6.1 abuse case) — no unlicensed art in `dist/`.

## Atomic checklist

- [x] Step 0 (DoR): confirm the asset list against PRD §8 default (1 SFX/action handled in T-05; here: ≥ 2 backdrops, 1 shotgun sheet, per-type demon set incl. per-HP-step hurt + death frames). *(assets-manifest.md + all 36 files already committed)*
- [x] Step 1: `sprites.ts` — register viewmodel frames, per-HP-step hurt frames, death frames as atlas keys.
- [x] Step 2: `demon-art.ts` — map each demon type → {full, hurt@step, death} keys. *(landed in sprites.ts as the key registry — `hurtFrameKey`/`deathFrameKey`/`DEATH_FRAME_COUNTS` + `resolveHurtSprite`; demon-art.ts stays the bundled pixel-art fallback)*
- [x] Step 3: `backdrops.ts` — load list; `pickRandom()`; fail-soft → black; expose for round start + retry reroll.
- [x] Step 4: license note (source + license per asset) alongside the assets. *(public/assets/CREDITS.md)*
- [x] Step 5: unit tests — missing key → placeholder/black + log-once (per kind); `pickRandom` returns a loaded key or the black fallback.

## Edge cases

| Case | Expected |
|---|---|
| Only 1 backdrop supplied | reroll may repeat it; still valid (≥ 2 is the target, not a hard gate) |
| 4-HP demon missing `hurt@2` | nearest available hurt/full frame used (fail-soft), no crash |

## DoD

- All new keys load through the fail-soft atlas; per-kind missing-asset placeholder tests green; backdrop `pickRandom` + black fallback tested; license note committed; no render-pass code here (that is T-08).
