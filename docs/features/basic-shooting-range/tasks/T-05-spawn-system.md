---
id: T-05
epic: basic-shooting-range
project: doom-shooter
wave: 3
priority: P1
estimate: M
blocks: [T-08]
blocked_by: [T-02, T-03]
status: todo
context_budget: 4500
created: 2026-07-02
owner: Maksim Vakulenko
---

# T-05 — Spawn system: schedule, paths, escape = miss

## Goal

`src/systems/spawn.ts`: advance the wave schedule on the fixed step (spawn demons at due slots), move demons along their fixed paths updating `x/y/z` from `progress`, and resolve escapes — despawn + record a miss.

## Linked artifacts

- [[../sad.md]] §6 Flow 6 (spawn & patterned movement) and Critical flow 3 (escape → miss) — the two sequences this task implements.
- [[../PRD.md]] US-05, AC-05 — escaped demon despawns and records a miss.
- [[../data-model.md]] — **data delta: creates/removes `Demon` rows in `state.demons`, writes `round.misses` + `round.resolvedCount`**; consumes `WaveSchedule`/`Path` via the "due spawn slots" cursor access pattern.

## Acceptance criteria

**AC-T05-1 (spawn at slot)**
Given the round clock reaches a spawn slot's `atMs`
When the spawn system steps
Then a demon of the slot's type is created at the path's first waypoint with `typeId`, `pathId` and `z` populated.

**AC-T05-2 (escape = miss, PRD AC-05)**
Given a live demon whose `progress` reaches 1.0 un-killed
When the spawn system steps
Then the demon is removed from `state.demons`, `round.misses` increments by 1 and `round.resolvedCount` increments by 1.

**AC-T05-3 (path fidelity)**
Given a demon mid-path
When it advances by fixed steps
Then `x/y/z` are interpolated from the path waypoints at `progress` and the path is never re-assigned (US-05).

## Atomic checklist

- [ ] Step 1: schedule cursor (amortized O(1) per step — data-model access pattern) + demon creation.
- [ ] Step 2: path interpolation — `progress` advance by `speed × fixedDt`, `x/y/z` from waypoints.
- [ ] Step 3: escape resolution — despawn + `misses` + `resolvedCount`.
- [ ] Step 4: unit tests driving synthetic fixed-step sequences over a 2-slot schedule.

## Edge cases

| Case | Expected |
|---|---|
| Two slots due in one step (stall recovery) | both spawn, order preserved |
| Escape on the same step the round ends | counted before freeze — ordering owned by T-08 |

## DoD

- Unit tests green; no rendering or scoring logic in this module (scoring is T-07, round freeze is T-08).
