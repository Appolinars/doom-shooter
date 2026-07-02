---
id: T-06
epic: basic-shooting-range
project: doom-shooter
wave: 3
priority: P1
estimate: M
blocks: [T-07]
blocked_by: [T-02, T-03]
status: todo
context_budget: 4500
created: 2026-07-02
owner: Maksim Vakulenko
---

# T-06 — Weapon system: fire, shells, reload cycle

## Goal

`src/systems/weapon.ts`: drain fire intents on the fixed step, consume shells on valid fire, block fire while reloading (no shell consumed), run the reload timer to completion on fixed steps.

## Linked artifacts

- [[../sad.md]] §6 Critical flow 2 (blocked fire) and Flow 5 (full reload cycle) — the sequences this task implements.
- [[../PRD.md]] US-01/US-02, AC-02 — mid-reload fire is blocked, no shell consumed, player sees "not ready".
- [[../data-model.md]] `Weapon` — **data delta: writes `shellsLoaded`, `status`, `reloadRemainingMs`**; drains `GameState.fireIntents`.
- [[../adr/0002-fixed-timestep-game-loop.md]] — reload timer decrements by fixed step, never wall-clock.

## Acceptance criteria

**AC-T06-1 (blocked fire, PRD AC-02)**
Given `weapon.status === 'reloading'`
When a fire intent is processed
Then the shot is blocked, `shellsLoaded` is unchanged, and a not-ready cue is flagged for the renderer.

**AC-T06-2 (reload cycle, SAD Flow 5)**
Given exactly one loaded shell
When the player fires and then fixed steps elapse past the reload duration
Then the shell is consumed, `status` goes `reloading` with the timer set, and on completion `shellsLoaded` returns to capacity with `status = 'ready'`.

## Atomic checklist

- [ ] Step 1: try-fire entry — drain `fireIntents` once per step, readiness check (`weapon.status`, O(1) — data-model access pattern).
- [ ] Step 2: shell consumption; auto-start reload when the last shell is spent.
- [ ] Step 3: reload timer advance per fixed step; completion restores full shells.
- [ ] Step 4: not-ready cue flag consumed by the renderer (T-09 reads it).
- [ ] Step 5: unit tests — blocked fire, full reload cycle, fire on the exact completion step.

## Edge cases

| Case | Expected |
|---|---|
| Fire intent on the exact step reload completes | reload completes first within the step order ⇒ shot fires |
| Multiple intents queued in one step | processed in order; stop when out of shells |

## DoD

- Unit tests green; hit resolution NOT in this PR (weapon calls into T-07's hit contract, stubbed here).
