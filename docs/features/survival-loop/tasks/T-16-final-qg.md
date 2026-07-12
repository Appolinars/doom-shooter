---
id: T-16
epic: survival-loop
project: doom-shooter
wave: 4
priority: P1
estimate: M
blocks: []
blocked_by: [T-15]
status: todo
context_budget: 5000
created: 2026-07-13
owner: Maksym Vakulenko
---

# T-16 — Final QG: NFR numbers + 16-AC walkthrough

## Goal

The release gate, following the game-feel T-10 pattern: produce `T-16-results.md` with (a) the full **AC matrix — 16/16** PRD acceptance criteria walked through manually against the SAD §6 flows (release evidence on top of the automated rows), and (b) the **PRD §6 NFR numbers** measured and recorded. Automated NFR set per test-plan: late-wave FPS stress via `?e2e` fast-forward at the entity cap (p95 ≤ 33.3 ms), input→shot latency ≤ 50 ms re-based probe, player-hit feedback ≤ 100 ms probe, determinism drift ≤ 1% at 60↔144 Hz + the no-wall-clock static scan, cap ≤ 32 long-run assertion, fail-soft 100% (blocked + corrupt E2E). Manual: Lighthouse initial load ≤ 3 s against the built bundle. Any red number → fix task spawned, gate stays open until green.

## Linked artifacts

- [[../test-plan.md]] §NFR validation (the row-by-row how), §CI (release-level scope), §Coverage targets.
- [[../PRD.md]] §5 (all 16 AC), §6 (the numbers, verbatim targets).
- [[../sad.md]] §10 QG-1/2/3 scenarios, §6 flows (walkthrough script).
- Pattern: `docs/features/game-feel/tasks/T-10-results.md`.

## Acceptance criteria

**AC-T16-1 (AC matrix)**
Given the shipped feature on `vite preview`
Then all 16 PRD AC pass a recorded manual walkthrough (per-AC verdict + notes in the results file).

**AC-T16-2 (NFR numbers)**
Given the automated probes + stress scenario + Lighthouse run
Then every PRD §6 row has a measured number in the results file, each within target.

**AC-T16-3 (suite totality)**
Given the final commit
Then the full unit + Playwright suites are green, coverage guideline (≥ 80% lines in `systems/`/`core/`/`storage/`) checked and noted.

## Atomic checklist

- [ ] Step 1: FPS stress spec (fast-forward to late wave at cap) + capture p95.
- [ ] Step 2: latency probes (input→shot, hit→feedback) re-run; drift + static-scan + cap tests re-confirmed.
- [ ] Step 3: Lighthouse load number against the built bundle; bundle-size note.
- [ ] Step 4: manual 16-AC walkthrough per SAD §6 flows; write `T-16-results.md` (matrix + numbers + coverage note).
- [ ] Step 5: verify no doc drift — tracker all-done, PRD/SAD status fields flipped per ship convention.

## Edge cases

| Case | Expected |
|---|---|
| An NFR number misses target | recorded red + a fix task; T-16 re-runs after — the gate never passes on a promise |
| Stage 3 was cut (T-12/13/14 skipped) | walkthrough covers AC-01..13 and marks AC-14/15 as descoped with the PRD-stage rationale |

## DoD

- `T-16-results.md` with 16/16 matrix + all NFR numbers in target; all suites green; feature ready for the ship stage.
