---
id: T-10
epic: survival-loop
project: doom-shooter
wave: 2
priority: P1
estimate: M
blocks: [T-11]
blocked_by: [T-04, T-06, T-07, T-09]
status: todo
context_budget: 5000
created: 2026-07-13
owner: Maksym Vakulenko
---

# T-10 — End screens (rank / stats / record celebration) + combo HUD + callouts

## Goal

The convergence task of stage 2 — SAD §6 flow 3 wired end-to-end, still **zero simulation mutations**. Wiring: on the `running → ended` diff, compute rank/stats/best-moment (T-06) and submit the score to the record store (T-07) for the finished mode. Renderer: the full end screens — game-over vs win variants (off `outcome`), showing final score, stats, rank letter, best-moment line, and the "NEW RECORD!" celebration when the store reports one (session-only degradation shows identically — the screen never depends on storage health). In-run HUD additions: combo multiplier/streak display and on-screen callouts ("SNIPED!" on far kills) via the poll/diff effects path, pooled per the GC risk row.

## Linked artifacts

- [[../PRD.md]] AC-07 (display half), AC-08 (celebration; reload persistence = T-11), AC-06 (callout half), AC-13 (win-screen variant).
- [[../sad.md]] §6 Critical flow 3 (incl. both fail-soft alt branches), §11 GC-hitch risk row.
- [[../adr/0005-hybrid-canvas-screens-with-dom-controls.md]] — screen construction; retry button carried from T-04.
- [[../data-model.md]] — rank computed at end, never stored; record compared in memory.
- [[../test-plan.md]] AC-06 integration row, AC-08 unit-side, flow-3 integration.

## Acceptance criteria

**AC-T10-1 (flow-3 wiring)**
Given a run ends (either outcome)
Then wiring computes rank exactly once, submits the score to the record store exactly once with the correct mode, and never blocks the end screen on the store's answer — integration test at the wiring contract level.

**AC-T10-2 (end-screen variants, PRD AC-07/13)**
Given `outcome = 'gameOver'` / `'won'`
Then the correct variant renders with score, stats, rank, best-moment; win is visually distinct from game over — E2E smoke (full assertions in T-11).

**AC-T10-3 (celebration, PRD AC-08 half)**
Given the store reports a new record (healthy or session-only)
Then "NEW RECORD!" renders on the end screen; when the record stands, the existing best is shown instead.

**AC-T10-4 (callouts + combo HUD, PRD AC-06 half)**
Given a far kill on a step
Then wiring emits one "SNIPED!" callout cue; the HUD reflects `combo.multiplier`/`streak` from state each frame.

## Atomic checklist

- [ ] Step 1: wiring — `running → ended` diff → rank compute + `records.submit(mode, score)`; result feeds render state.
- [ ] Step 2: renderer — end-screen variants (score/stats/rank/best-moment/record line); screen art via manifest, fail-soft.
- [ ] Step 3: renderer + effects — combo HUD, callout pipeline (pooled).
- [ ] Step 4: integration tests (flow 3 incl. fail-soft branches via injected stub) + E2E smoke.

## Edge cases

| Case | Expected |
|---|---|
| Storage session-only (T-07 flag) | celebration and screen identical to healthy path; nothing hints at storage failure mid-game |
| Run ends during an active callout animation | render-side effects age out on rAF; no state coupling |
| Rank computed for a zero-kill instant death | lowest rank + graceful best-moment (T-06 edge) renders without gaps |

## DoD

- Flow-3 integration green (all three alt branches); both screen variants render with full data; callout/HUD cues asserted; zero `systems/*` diffs; frame-time sanity vs QG-2 unchanged.
