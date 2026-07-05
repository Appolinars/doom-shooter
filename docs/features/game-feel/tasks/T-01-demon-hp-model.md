---
id: T-01
epic: game-feel
project: doom-shooter
wave: 1
priority: P1
estimate: S
blocks: [T-02, T-08]
blocked_by: []
status: todo
context_budget: 3500
created: 2026-07-06
owner: Maksym Vakulenko
---

# T-01 — Demon HP model (field + config + spawn init)

## Goal

Give demons shot-durability as a bounded, config-driven field — the data half of ADR-0001. Add `maxHp` per `DemonType` in `src/core/config.ts` (incl. one new 4-HP type), a per-demon `hp` field in `src/core/state.ts` / `src/entities/demon.ts`, and set `hp = maxHp` at spawn in `src/systems/spawn.ts`. **No damage logic here** — that is T-02; this task only establishes the field and its initialisation so the rest can read it.

## Linked artifacts

- [[../adr/0001-demon-hp-as-bounded-field-damaged-inline.md]] — HP is intrinsic demon state on the entity; `hurt` derived as `hp < maxHp`, no extra field.
- [[../PRD.md]] AC-03 (durability data), §8 OQ "HP-tier balance" (fast=1, brute=2, +one 4-HP type — values are tuning debt).
- [[../sad.md]] §5 (`config.ts ◐ demon maxHp per type, 4-HP type`; `state.ts ◐ Demon gains hp`; `demon.ts ◐ + hp`).
- Base data contract: [[../../basic-shooting-range/data-model.md]] — **data delta: `Demon` gains `hp: number`; `DemonType` gains `maxHp: number`.**

## Acceptance criteria

**AC-T01-1 (typed durability)**
Given the demon types config
When a demon of any type is created at spawn
Then its `hp` equals that type's `maxHp`, and `maxHp ∈ {1, 2, 4}` for the three types (fast=1, brute=2, new type=4).

**AC-T01-2 (hurt is derived, not stored)**
Given a demon with `hp` and `maxHp`
When any code needs "is it hurt?"
Then it computes `hp < maxHp` — there is no separate `hurt` flag on the entity.

**AC-T01-3 (invariant on the field)**
Given a fresh demon
Then `0 < hp ≤ maxHp` holds at spawn; the field is a bounded integer.

## Atomic checklist

- [ ] Step 1: `config.ts` — add `maxHp` to each `DemonType`; add the new 4-HP type (point value placeholder, flagged as tuning debt per PRD §8).
- [ ] Step 2: `state.ts` / `demon.ts` — add `hp: number` to `Demon`; update the demon factory to take/derive `hp`.
- [ ] Step 3: `spawn.ts` — set `hp = DEMON_TYPES[typeId].maxHp` when the scheduled demon enters.
- [ ] Step 4: unit tests — factory sets `hp === maxHp`; each of the 3 types resolves the expected `maxHp`; `hurt` helper (`hp < maxHp`) if extracted.

## Edge cases

| Case | Expected |
|---|---|
| New 4-HP type point value not yet tuned | placeholder constant, `// TODO tuning` comment referencing PRD §8 OQ |
| Existing spawn schedule/mix references only 2 types | extend mix to include the 4-HP type; keep schedule deterministic (base spawn test stays green) |

## DoD

- `hp`/`maxHp` types match the data delta 1:1; factory + type-resolution tests green; base spawn tests still pass; no change to `hit.ts` yet (kept for T-02).
