---
id: T-12
epic: survival-loop
project: doom-shooter
wave: 3
priority: P2
estimate: M
blocks: [T-13]
blocked_by: [T-03]
status: todo
context_budget: 5000
created: 2026-07-13
owner: Maksym Vakulenko
---

# T-12 — Fireball entity + shooter demon attack

## Goal

ADR-0004's entity half (the hit-test half is T-13). New `src/entities/fireball.ts` (typed struct: `id` — own incremental counter, `x/y/z` with Demon depth semantics, `progress 0..1`) and `state.fireballs[]` beside `demons[]`. `Demon` gains `attack: AttackState | null` (`{ cooldownRemainingMs, telegraphRemainingMs }`, fixed-step decremented); `DemonType` gains `attackSpec?` marking shooter-capable types. New `src/systems/fireball.ts` — the single writer: cooldown → telegraph → (telegraph hits 0) spawn a fireball at the demon's position **through the shared cap helper** (T-03; the helper now counts a real second list) → flight on the fixed step → `progress = 1.0` ⇒ player hit (−1 HP via the damage path, so combo break and game-over rules apply for free) + despawn. `FIREBALL_PARAMS` config (speed, telegraph ms, cooldown — placeholder values, tuning = T-15). The fireball inherits nothing demon-specific: no path-walking, no score value, no HP tiers (CONTEXT boundary).

## Linked artifacts

- [[../adr/0004-fireball-as-first-class-shootable-entity.md]] — separate kind, glossary boundary.
- [[../PRD.md]] AC-14 landing half (shoot-down half = T-13); US-11.
- [[../sad.md]] §6 Critical flow 4 (landing branch), §7 (cap at the second spawn site).
- [[../data-model.md]] §`Fireball`, §`Demon` delta (`attack`), §Static config (`FIREBALL_PARAMS`, `DemonType + attackSpec`).
- [[../test-plan.md]] AC-14 unit rows (spawn/landing), NFR cap row.

## Acceptance criteria

**AC-T12-1 (telegraph → spawn)**
Given a shooter demon with `telegraphRemainingMs` reaching 0 on a step
Then exactly one fireball spawns at the demon's position, the cooldown rearms, and `systems/fireball.ts` is the only writer of both lists' attack state.

**AC-T12-2 (landing = player hit, PRD AC-14 half)**
Given a fireball reaching `progress = 1.0`
Then it despawns and a player hit lands (−1 HP, strong feedback via the existing damage → wiring path; combo breaks per T-05's rule).

**AC-T12-3 (cap at the second spawn site, QG-2)**
Given `demons + fireballs = 32`
When a telegraph completes
Then the spawn is clamped by the shared helper — no 33rd entity, no crash, cooldown behavior deterministic.

**AC-T12-4 (determinism)**
Given the drift suite extended to runs with shooter demons
Then GameState stays deep-equal across 60↔144 Hz; no wall-clock in the new system.

## Atomic checklist

- [ ] Step 1: types — `Fireball`, `AttackState`, `DemonType.attackSpec`; `state.fireballs[]`; factory `makeFireball(overrides?)`.
- [ ] Step 2: `fireball.ts` — cooldown/telegraph decrement, spawn-through-cap-helper, flight, landing → damage path.
- [ ] Step 3: `step.ts` — fireball slot per SAD §5 order (waves → fireball → damage → end-conditions).
- [ ] Step 4: `MODE_PARAMS`/wave specs include shooter-capable types from a configured wave onward.
- [ ] Step 5: unit tests per ACs + drift extension; render of fireballs deferred to T-14 (state-only here, dev rectangle placeholder acceptable).

## Edge cases

| Case | Expected |
|---|---|
| Shooter demon killed mid-telegraph | no fireball spawns; its live fireballs (already airborne) continue independently |
| Fireball lands on the same step HP hits 0 from a breakthrough | HP floors at 0, one game-over (T-02 dual-fatal discipline extends) |
| Shooter demon reaches `progress = 1.0` while telegraphing | breakthrough resolves normally (damage), attack state dies with the demon |

## DoD

- Telegraph/spawn/landing/cap/drift tests green; single-writer discipline held; combo + game-over interplay covered by extending T-02/T-05 suites, not forking them.
