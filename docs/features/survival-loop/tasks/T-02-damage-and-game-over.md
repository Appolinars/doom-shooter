---
id: T-02
epic: survival-loop
project: doom-shooter
wave: 1
priority: P1
estimate: S
blocks: [T-03, T-05, T-08]
blocked_by: [T-01]
status: todo
context_budget: 4000
created: 2026-07-13
owner: Maksym Vakulenko
---

# T-02 — Damage system + game-over end-condition

## Goal

The lose condition. New `src/systems/damage.ts`: a live demon reaching `progress = 1.0` un-killed despawns and lands a **player hit** (`playerHp -= 1`) — superseding the base "escaped = miss" path. `run.misses` **retires here** (field, render usages, tests — the break-tasks decision recorded in data-model). Run end-condition in `systems/round.ts`: `playerHp === 0` ⇒ `status = 'ended'`, `outcome = 'gameOver'` in the same fixed step, reusing the existing one-way freeze. `step.ts` order becomes the AC-02b spec: hit/score resolve **before** damage → end-conditions.

## Linked artifacts

- [[../PRD.md]] AC-01 (breakthrough), AC-02 (game over), AC-02b (same-step final kill counted before freeze).
- [[../sad.md]] §6 Critical flows 1–2, §5 (`damage.ts` NEW, `round.ts` run semantics).
- [[../data-model.md]] §`Run` (`playerHp` invariants, `misses` removed row), §`Demon` (progress-1.0 semantics change).
- [[../adr/0001-extend-round-into-mode-aware-run-state.md]] — freeze reuse.
- [[../test-plan.md]] AC-01/02/02b rows + edge cases (same-demon kill+breakthrough, double-fatal).

## Acceptance criteria

**AC-T02-1 (breakthrough player hit, PRD AC-01)**
Given a run in progress, `playerHp > 0`, a live demon at `progress = 1.0` un-killed
When the damage step runs
Then the demon is removed, `playerHp` decreases by exactly 1, and no miss is recorded (the concept is gone).

**AC-T02-2 (game over, PRD AC-02)**
Given `playerHp = 1`
When a player hit lands
Then same step: `status = 'ended'`, `outcome = 'gameOver'`; subsequent steps mutate nothing (freeze test extended to the new fields).

**AC-T02-3 (ordering, PRD AC-02b)**
Given a killing shot and a fatal player hit resolving in one fixed step
Then the kill's points are in `run.score` before the freeze — locked by an integration test over `step.ts` order.

**AC-T02-4 (misses retired)**
Given the codebase after this PR
Then no `misses` field, render usage, or test remains; base escape-path tests are amended deliberately (named in the PR description).

## Atomic checklist

- [ ] Step 1: `damage.ts` — breakthrough detection + despawn + `playerHp` decrement (floor 0).
- [ ] Step 2: `round.ts` — `hp === 0` ⇒ `ended`/`gameOver`; keep freeze one-way; leave base all-resolved/timer conditions untouched (T-03/T-08 own them).
- [ ] Step 3: `step.ts` — order: weapon → hit → score → spawn → damage → end-conditions; comment the order as the AC-02b spec.
- [ ] Step 4: remove `misses` (state, render, tests) — deliberate amendments.
- [ ] Step 5: unit + integration tests per test-plan rows AC-01/02/02b + edge cases below.

## Edge cases

| Case | Expected |
|---|---|
| Same demon killed AND at `progress = 1.0` in one step | resolves exactly once — killed (hit precedes damage in step order), no HP loss |
| Two breakthroughs in one step at `playerHp = 1` | HP floors at 0, exactly one `gameOver` transition |
| Breakthrough while `status ≠ 'running'` | impossible by construction (systems gated); freeze test asserts no post-end mutation |

## DoD

- AC-01/02/02b tests green; step order test = the spec; `misses` fully retired; existing suite green with deliberate amendments only.
