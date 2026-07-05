---
id: T-11
epic: basic-shooting-range
project: doom-shooter
wave: 5
priority: P1
estimate: M
blocks: []
blocked_by: [T-04, T-08, T-09, T-10]
status: todo
context_budget: 4500
created: 2026-07-02
owner: Maksim Vakulenko
---

# T-11 — Wiring, playable round & NFR verification (E2E)

## Goal

`src/main.ts` wires all modules per the SAD §5 topology into one playable round: aim → fire → reload → score → round end. Then verify every PRD AC manually and every §6 NFR with measurements. This is the "clickable, scoreable round" KPI gate.

## Linked artifacts

- [[../sad.md]] §5 (module wiring/topology), §6 (all six flows — the E2E walkthrough script), §10 (quality scenarios with verify methods).
- [[../PRD.md]] §5 AC-01…AC-07 (manual walkthrough checklist), §6 NFR table (FPS, latency ≤ 50 ms, drift ≤ 1%, aim ≤ 2 px, load ≤ 3 s), §7 KPI (playable round).
- [[../data-model.md]] — **data delta: none; this task fixes the per-step system order over `GameState`**: input drain → weapon → hit/score → spawn → round end-check (the Flow 4 / AC-04b ordering).

## Acceptance criteria

**AC-T11-1 (playable round)**
Given a fresh page load
When the player plays a full round
Then every PRD AC-01…AC-07 is observable per the §6 flow walkthrough, and the round ends with a final score screen.

**AC-T11-2 (NFR evidence)**
Given a scripted wave harness and profiler run
When measurements are taken per SAD §10 verify methods
Then FPS ≥ 30 under ~30 demons, input→hit ≤ 50 ms, 60↔144 Hz drift ≤ 1%, aim error ≤ 2 px, initial load ≤ 3 s — recorded in the PR description.

## Atomic checklist

- [x] Step 1: wire modules in `main.ts`; fix the per-step system order (AC-04b contract) — extracted to `core/step.ts`.
- [x] Step 2: scripted-wave harness (deterministic schedule) for perf + walkthrough runs — `?e2e` `window.__doom` API (spawnStress / fireWorld / endRoundSoon / frameStats).
- [x] Step 3: NFR measurement pass — recorded in Results (E2E `nfr.spec` + unit-test NFRs).
- [x] Step 4: AC-01…AC-07 walkthrough — mapped to automated evidence in Results; integration gap (unpruned feedback shots) fixed.
- [x] Step 5: README play instructions + build/publish note (static host).

## Edge cases

| Case | Expected |
|---|---|
| Refresh mid-round | clean reset — all state ephemeral (PRD §6.1), no residue |
| Rapid clicking across reload boundary | AC-02 + Flow 5 behavior holds end-to-end |

## DoD

- All AC checked off with the walkthrough evidence; all five NFR numbers recorded and within target.
- KPI "time-to-first-playable-round" retro note added to [[../idea-brief.md]] context in the PR description.

## Results (2026-07-05)

Wiring: `src/main.ts` boots the round (validate config + sprite keys → viewport → input → loop →
render, sprites load in the background fail-soft). The per-step order lives in the new DOM-free
`src/core/step.ts` (`advanceGameStep`: weapon → spawn → round, freeze-gated) so the AC-04b ordering
is unit-tested. `createInitialGameState` added to `core/state.ts` as the production initializer.
Integration gap fixed: feedback `Shot`s were never pruned — `main.ts` now drops cues older than
`SHOT_CUE_MS` (250 ms) each frame. A `?e2e`-gated `window.__doom` debug API (state + fireWorld +
spawnStress + endRoundSoon + frameStats) exists only in scripted runs, never in the normal load.

### AC walkthrough (each AC → automated evidence)

| AC | Evidence |
|---|---|
| AC-01 fire → hit → remove + feedback | `hit.test.ts`, `step.test.ts` (kill+score+shot in one step), E2E `play-round.spec` (real click → score) |
| AC-02 fire while reloading is blocked | `weapon.test.ts` (reloading blocks, no shell consumed) |
| AC-03 score += pointValue, non-decreasing | `score.test.ts` / `hit.test.ts`, `step.test.ts` |
| AC-04 end freezes + final score | `round.test.ts`, `step.test.ts`, E2E `play-round.spec` (endRoundSoon → status ended) |
| AC-04b kill on the end step still counts | `step.test.ts` "a kill on the same step the round resolves still counts before the freeze" |
| AC-05 escape → despawn + miss | `spawn.test.ts` (escape records miss) |
| AC-06 front-most by depth | `hit.test.ts` (nearest-z wins, id tie-break) |
| AC-07 focus / play-area gating | `pointer.test.ts` (blurred / outside-area drop) |

90 unit tests + 5 Playwright smoke/NFR flows green. `typecheck`, `lint`, `build` clean.

### NFR evidence (PRD §6)

| NFR | Target | Result | Source |
|---|---|---|---|
| Initial load | ≤ 3 s | 28 ms | E2E `nfr.spec` |
| FPS under ~30 demons | ≥ 30 | 60 (frame p95 17.5 ms) | E2E `nfr.spec` |
| Input → hit | ≤ 50 ms | 15 ms (sim path ~1 step ≈ 16.7 ms + 1 frame) | E2E `nfr.spec` |
| 60↔144 Hz drift | ≤ 1% | pass | unit `loop.test.ts:66` |
| Aim error | ≤ 2 px | pass | unit `pointer.test.ts:30` |

KPI retro: time-to-first-playable-round — reached at T-11 across 11 tasks / 5 waves; the depth
field carried from stage 1 (ADR-0001) meant the 2.5D layer stayed additive, no rewrite.
