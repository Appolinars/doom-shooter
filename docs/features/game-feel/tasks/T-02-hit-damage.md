---
id: T-02
epic: game-feel
project: doom-shooter
wave: 1
priority: P1
estimate: S
blocks: [T-09]
blocked_by: [T-01]
status: todo
context_budget: 4000
created: 2026-07-06
owner: Maksym Vakulenko
---

# T-02 — HP damage inline in the hit path

## Goal

The behaviour half of ADR-0001: in `src/systems/hit.ts`, a landed shot on the front-most-by-`z` demon does `hp--`; the demon is despawned and `applyKill` (score) is called **only** when `hp` reaches 0. A demon with `hp > 0` after the hit stays alive in its (derived) hurt state and the score is unchanged. The front-most-by-`z` resolution (base ADR-0001) and the non-decreasing-score invariant are preserved by construction — `applyKill` still fires exactly once per kill.

## Linked artifacts

- [[../adr/0001-demon-hp-as-bounded-field-damaged-inline.md]] — decrement vs kill branch lives inline in `hit.ts`; `step.ts` order unchanged.
- [[../PRD.md]] AC-03 (remove exactly one HP, score only on last HP), AC-04 (killing shot scores once), AC-08 (hurt demon escapes = normal miss, no score).
- [[../sad.md]] §6 Critical flow 2 (killing shot → despawn + applyKill once), §5 (`hit.ts ◐ hp-- inline`, `score.ts ○ unchanged`).

## Acceptance criteria

**AC-T02-1 (multi-shot decrement, PRD AC-03)**
Given a live demon with `hp > 1` under the crosshair
When a shot lands
Then `hp` decreases by exactly 1, the demon remains in `state.demons`, and `round.score` is unchanged.

**AC-T02-2 (killing shot, PRD AC-04)**
Given a live demon with `hp == 1`
When the killing shot lands
Then the demon is removed, `resolvedCount` increments, and `applyKill` adds its type's point value exactly once.

**AC-T02-3 (non-decreasing score, PRD AC-03)**
Given any random sequence of shots across demons of mixed HP
Then `round.score` is a non-decreasing integer and increases by exactly one `pointValue` per demon killed — never per hit.

**AC-T02-4 (hurt escape = miss, PRD AC-08)**
Given a damaged demon (`hp < maxHp`, still `hp > 0`) reaches the end of its path un-killed
When it leaves the field
Then it counts as a normal miss (existing escape path), adds no score, and its hurt state changes neither miss count nor score.

## Atomic checklist

- [ ] Step 1: `hit.ts` — on front-most hit, branch: `hp--`; if `hp > 0` return a "damaged, alive" outcome (no despawn, no score); if `hp == 0` despawn + `applyKill`.
- [ ] Step 2: record the `Shot`/hit outcome enough for T-08/T-09 to show a splat on any hit and a death visual on a kill (do not couple to render — just the state/outcome).
- [ ] Step 3: confirm `step.ts` order and `score.ts` are untouched (ADR-0001 minimal-diff).
- [ ] Step 4: unit tests — 2-HP takes two shots to score, 4-HP takes four; non-decreasing-score property over a random kill sequence; AC-08 hurt-then-escape via the existing miss path.

## Edge cases

| Case | Expected |
|---|---|
| Two demons overlap under crosshair, front one has `hp > 1` | only front-most is damaged; rear untouched (base front-most-by-`z` preserved) |
| Killing shot is also the last scheduled demon | despawn + score commit on this step; round-end freeze decision stays in `round.ts` (AC-09 handled render-side in T-06/T-08) |

## DoD

- Multi-shot + non-decreasing-score property + AC-08 escape tests green; `score.ts` and `step.ts` diff = 0; base hit/score tests extended, not moved.
