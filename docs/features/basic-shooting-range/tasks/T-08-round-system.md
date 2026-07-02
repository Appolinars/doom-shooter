---
id: T-08
epic: basic-shooting-range
project: doom-shooter
wave: 3
priority: P1
estimate: S
blocks: [T-11]
blocked_by: [T-05, T-07]
status: todo
context_budget: 4500
created: 2026-07-02
owner: Maksim Vakulenko
---

# T-08 — Round system: end-condition, timer, freeze

## Goal

`src/systems/round.ts`: decrement the round timer on the fixed step, end the round when all scheduled demons are resolved OR the timer expires, freeze gameplay on end — with the same-step final kill counted before the freeze (AC-04b).

## Linked artifacts

- [[../adr/0004-round-ends-on-all-resolved-or-timer.md]] — the end-condition decision (no hard game-over in MVP).
- [[../sad.md]] §6 Critical flow 4 — round end incl. concurrent final kill; the ordering note under the diagram is the implementation contract.
- [[../PRD.md]] AC-04 (freeze + final score), AC-04b (same-step kill included).
- [[../data-model.md]] `Round` — **data delta: writes `status`, `timeLeftMs`; reads `resolvedCount` vs `scheduledCount`** (O(1) counter access pattern, no scans).

## Acceptance criteria

**AC-T08-1 (all-resolved end, PRD AC-04)**
Given `resolvedCount === scheduledCount`
When the round system's end-check runs
Then `round.status` becomes `ended`, gameplay is frozen and the final score is available to render.

**AC-T08-2 (same-step kill, PRD AC-04b)**
Given the final demon is killed in the same fixed step as the timer would expire
When the step executes in the §6 Flow 4 order (weapon/score before end-check)
Then the kill's points are included in the final score before the freeze.

**AC-T08-3 (timer end)**
Given live demons remain but `timeLeftMs` reaches 0
When the end-check runs
Then the round ends; remaining demons are not retroactively counted as misses (escape ≠ timer-end — ADR-0004).

## Atomic checklist

- [ ] Step 1: timer decrement by fixed step; end-check comparing counters (never scanning demons + schedule).
- [ ] Step 2: freeze gate — once `ended`, weapon/spawn/hit mutations are skipped by the step driver.
- [ ] Step 3: assert/step-order contract — end-check runs after weapon+score within one step (AC-04b).
- [ ] Step 4: unit tests — all-resolved end, timer end, same-step final kill.

## Edge cases

| Case | Expected |
|---|---|
| Kill and timer-expiry in the same step | score counted, then freeze (AC-04b) |
| Fire intent arriving after freeze | ignored — no mutation on an ended round |

## DoD

- Unit tests green incl. the AC-04b same-step case; freeze verified to stop all system mutations.
