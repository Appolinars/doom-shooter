---
id: T-13
epic: survival-loop
project: doom-shooter
wave: 3
priority: P2
estimate: S
blocks: [T-14]
blocked_by: [T-12]
status: todo
context_budget: 4000
created: 2026-07-13
owner: Maksym Vakulenko
---

# T-13 — Cross-kind hit resolution + shoot-down rules

## Goal

ADR-0004's hit-test half: `hit.ts` generalizes from "front-most demon by z" to "front-most **shootable** by z" — one linear scan collecting candidates under the crosshair from `demons[]` AND `fireballs[]` (combined n ≤ 32, no sorted structure), resolving the single hit to the nearest-by-z regardless of kind (AC-15), with a deterministic tie-break for equal z locked in a test. A shot-down fireball despawns **harmlessly**: no kill points, no stats change, and the combo **neither grows nor breaks** (AC-14). Demon resolution is byte-identical to before — the base front-most tests keep passing unmodified.

## Linked artifacts

- [[../adr/0004-fireball-as-first-class-shootable-entity.md]] — shared targetable surface, three call sites.
- [[../PRD.md]] AC-14 shoot-down half, AC-15 (cross-kind front-most); US-11/US-12.
- [[../sad.md]] §6 flow 4 (shoot-down branch) + US-12 flow (front-most across kinds).
- [[../data-model.md]] §Access patterns (hit-test across kinds row).
- [[../test-plan.md]] AC-14/15 rows; same-step shoot-down-vs-land edge.

## Acceptance criteria

**AC-T13-1 (cross-kind front-most, PRD AC-15)**
Given a demon and a fireball overlapping under the crosshair at different z
When the player fires
Then exactly the nearer-by-z entity resolves, whichever kind it is; the farther is untouched.

**AC-T13-2 (tie-break)**
Given equal z
Then the winner is deterministic and locked in a test (documented rule, e.g. fireball-first).

**AC-T13-3 (harmless despawn, PRD AC-14 half)**
Given a fireball shot down mid-flight
Then it despawns; `score`, `stats.kills`, and `combo.streak`/`multiplier` are all unchanged (neither grown nor broken) — property-asserted.

**AC-T13-4 (demon path unchanged)**
Given the existing hit/score suites
Then they pass without modification — demon-side behavior is untouched.

## Atomic checklist

- [ ] Step 1: `hit.ts` — shared targetable surface (position + z + hit radius), candidate collection over both lists, front-most resolution + tie-break.
- [ ] Step 2: shoot-down outcome routed to `fireball.ts` despawn (no score/combo calls on the fireball branch).
- [ ] Step 3: unit tests per ACs + the same-step edge below.

## Edge cases

| Case | Expected |
|---|---|
| Fireball shot down on the same step it would land | shot wins per step order (hit before fireball flight/damage): despawn, no HP loss — locked test |
| Crosshair over fireball only | fireball resolves; no demon side effects |
| Shot with nothing under crosshair | plain miss — combo NOT broken (T-05 rule reconfirmed cross-kind) |

## DoD

- AC-14/15 unit rows green; tie-break locked; base hit tests untouched and green; combo-neutrality property holds.
