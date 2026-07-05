---
id: T-02
epic: basic-shooting-range
project: doom-shooter
wave: 1
priority: P1
estimate: M
blocks: [T-03, T-04, T-05, T-06, T-09]
blocked_by: []
status: done
context_budget: 4500
created: 2026-07-02
owner: Maksim Vakulenko
---

# T-02 — GameState, entity types & static config

## Goal

`src/core/state.ts` becomes the schema: `GameState` aggregate root + `Round` / `Weapon` / `Demon` / `Shot` types exactly per the data-model contract, plus static config (`DemonType` ×2, `Path`, `WaveSchedule`) as typed module constants with keyed lookups, plus test factories.

## Linked artifacts

- [[../data-model.md]] — the full in-memory storage contract this task implements (entities, constraints, static config, test fixtures). **Data delta: creates every entity in the model.**
- [[../adr/0003-plain-typed-entities-over-ecs.md]] — plain typed structs, central mutable `GameState`, no ECS.
- [[../sad.md]] §5 — module placement (`core/state.ts`, `entities/*`); §8 — in-memory incremental ID strategy.
- [[../PRD.md]] AC-03 — score field invariant (flat, non-decreasing) the types must make expressible.

## Acceptance criteria

**AC-T02-1 (contract fidelity)**
Given the types in `src/core/state.ts`
When compared field-by-field against [[../data-model.md]] Entities tables
Then every field, enum literal and constraint comment matches, and `Demon.z` is present from day one (SAD §2 locked-in convention).

**AC-T02-2 (config lookups)**
Given the static config built at boot
When a system dereferences `typeId` / `pathId`
Then keyed `Record` lookups resolve in O(1) and the two MVP demon types (fast/low-point, slow/high-point) are present.

**AC-T02-3 (factories)**
Given test code calls `makeDemon()` / `makeRound()` / `makeGameState()`
When no overrides are passed
Then each returns a contract-valid default, and per-test overrides apply without shared global state.

## Atomic checklist

- [ ] Step 1: entity types (`GameState`, `Round`, `Weapon`, `Demon`, `Shot`) in `core/state.ts` + `entities/*`.
- [ ] Step 2: lock the `fireIntents` queue shape (resolves the data-model TBD) and record it back into [[../data-model.md]].
- [ ] Step 3: static config constants (`DEMON_TYPES`, `PATHS`, `WAVE_SCHEDULE` with placeholder slot values) + keyed lookup builders.
- [ ] Step 4: test factories per [[../data-model.md]] Test fixtures.
- [ ] Step 5: unit tests — config lookup, schedule sorted by `atMs`, factory defaults valid.

## Edge cases

| Case | Expected |
|---|---|
| Unknown `typeId`/`pathId` | unrepresentable via types / lookup returns undefined handled at boot validation |
| Wave schedule out of order | sorted at build time (data-model access pattern) |

## DoD

- Types compile strict; unit tests green; both data-model TBDs either resolved or explicitly re-scoped in [[../data-model.md]].
- No behavior/system logic in this PR (values are data, rules live in `systems/*` — `.claude/rules/migrations.md`).
