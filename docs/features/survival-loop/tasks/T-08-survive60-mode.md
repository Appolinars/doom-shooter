---
id: T-08
epic: survival-loop
project: doom-shooter
wave: 2
priority: P1
estimate: S
blocks: [T-09]
blocked_by: [T-02]
status: todo
context_budget: 4000
created: 2026-07-13
owner: Maksym Vakulenko
---

# T-08 — Survive-60s mode end-condition (timer → won)

## Goal

The systems half of the second mode (the mode-select UI is T-09; a dev/`?e2e` switch suffices to exercise it here). `run.timeLeftMs` becomes per-mode: survive60 counts `60000 → 0` on the fixed step and `0` ⇒ `status = 'ended'`, `outcome = 'won'` (not gameOver); endless has `timeLeftMs = null` — the timer branch never fires. The wave source is already mode-aware (T-03's `MODE_PARAMS.survive60`, pinned high intensity). Same-step ordering discipline mirrors AC-02b: a final kill on the expiring step is scored before the freeze; timer-zero AND hp-zero in one step yield exactly one outcome per the `step.ts` order — the order is the spec, locked in a test.

## Linked artifacts

- [[../PRD.md]] AC-13 (win screen path, final kill counted); US-10.
- [[../sad.md]] §6 US-10 flow (incl. the hp-0-before-timer alt branch).
- [[../data-model.md]] §`Run` (`timeLeftMs` per-mode nullable contract).
- [[../adr/0001-extend-round-into-mode-aware-run-state.md]] — base timer branch becomes per-mode.
- [[../test-plan.md]] AC-13 rows; dual-fatal same-step edge.

## Acceptance criteria

**AC-T08-1 (win, PRD AC-13)**
Given a survive60 run, `playerHp > 0`, `timeLeftMs` reaching 0 on a step
Then same step: `ended` + `outcome = 'won'`; freeze one-way as ever.

**AC-T08-2 (same-step final kill)**
Given a killing shot resolving on the expiring step
Then its multiplied points (+ far-kill bonus if T-05 landed) are in `score` before the freeze.

**AC-T08-3 (dual-fatal determinism)**
Given `timeLeftMs = 0` and `playerHp → 0` in the same step
Then exactly one outcome results, per the documented `step.ts` order — locked in a test.

**AC-T08-4 (endless isolation)**
Given an endless run
Then `timeLeftMs` is `null` and no step ever takes the timer branch (long-run test).

## Atomic checklist

- [ ] Step 1: `round.ts` — per-mode timer branch (`survive60` countdown ⇒ `won`; `null` in endless); init per mode at run start/retry.
- [ ] Step 2: `step.ts` — confirm end-condition slot handles both terminal causes with one deterministic winner; document the order.
- [ ] Step 3: unit + integration tests per ACs (incl. AC-02b-mirror ordering).
- [ ] Step 4: dev-level mode switch (parameter into run start) so the mode is exercisable pre-T-09.

## Edge cases

| Case | Expected |
|---|---|
| Timer expires while paused | countdown only advances on running fixed steps — pause holds the timer |
| Retry after a won run | fresh survive60 run: `timeLeftMs = 60000`, outcome `null` |

## DoD

- AC-13 unit/integration rows green; dual-fatal order locked; endless long-run never touches the timer branch.
