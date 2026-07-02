---
id: T-07
epic: basic-shooting-range
project: doom-shooter
wave: 3
priority: P1
estimate: M
blocks: [T-08]
blocked_by: [T-06]
status: todo
context_budget: 4500
created: 2026-07-02
owner: Maksim Vakulenko
---

# T-07 — Hit-test (front-most by z) + score

## Goal

`src/systems/hit.ts` + `src/systems/score.ts`: resolve a shot to the front-most demon under the crosshair by `z`, remove the killed demon, add exactly its type's point value to the flat non-decreasing round score, record the `Shot` outcome for feedback.

## Linked artifacts

- [[../sad.md]] §6 Critical flow 1 (fire → hit → score) — the sequence this task implements.
- [[../PRD.md]] AC-01 (hit + removal + feedback), AC-03 (score invariant), AC-06 (front-most by depth wins).
- [[../adr/0001-render-on-canvas-2d-with-sprite-scaling.md]] — `z` drives hit priority.
- [[../data-model.md]] — **data delta: removes killed `Demon`, writes `round.score` + `round.resolvedCount`, appends transient `Shot`**; implements the "hit-test linear scan, front-most by z" access pattern.

## Acceptance criteria

**AC-T07-1 (front-most, PRD AC-06)**
Given two demons overlapping under the crosshair at different `z`
When a shot resolves
Then only the front-most (nearest by `z`) demon is killed; the other is untouched.

**AC-T07-2 (score invariant, PRD AC-03)**
Given a demon of a known type is killed
When the score system applies the kill
Then `round.score` increases by exactly that type's `pointValue`, stays an integer, and never decreases across any sequence of events (no multipliers — PRD N4).

**AC-T07-3 (clean miss)**
Given no demon under the crosshair
When a shot resolves
Then a `Shot` with `outcome: 'miss'` is recorded, no demon is removed and the score is unchanged.

## Atomic checklist

- [ ] Step 1: hit query — linear scan of `state.demons` with a hit radius, collect candidates under the crosshair.
- [ ] Step 2: front-most selection by `z`; kill = remove demon + `resolvedCount` increment.
- [ ] Step 3: score system — `score += DEMON_TYPES[typeId].pointValue` (values are data, the rule lives here — `.claude/rules/migrations.md`).
- [ ] Step 4: append transient `Shot` (hit/miss) for the T-09 feedback cue.
- [ ] Step 5: unit tests — overlap by z, exact point add, non-decreasing property over a random kill sequence, clean miss.

## Edge cases

| Case | Expected |
|---|---|
| Two demons at identical `z` under crosshair | deterministic tie-break (lower id) — documented in code |
| Kill of the last scheduled demon | `resolvedCount` reaches `scheduledCount`; freeze decision belongs to T-08 |

## DoD

- Unit tests green incl. the non-decreasing property test; `Shot` pruning after the cue verified.
