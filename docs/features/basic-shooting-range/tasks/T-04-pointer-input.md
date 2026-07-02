---
id: T-04
epic: basic-shooting-range
project: doom-shooter
wave: 2
priority: P1
estimate: S
blocks: [T-11]
blocked_by: [T-01, T-02]
status: todo
context_budget: 4500
created: 2026-07-02
owner: Maksim Vakulenko
---

# T-04 — Pointer input: aim mapping + fire gating

## Goal

`src/input/pointer.ts`: DPR/resize-corrected crosshair→world mapping and input gating (focus + play-area scope, AC-07); valid clicks enqueue fire intents into `GameState.fireIntents` for the loop to drain.

## Linked artifacts

- [[../PRD.md]] AC-07 — input-gating (focus lost / pointer outside play area ⇒ no fire, no shell); §6 NFR aim accuracy ≤ 2 px.
- [[../sad.md]] §6 Critical flow 1 — the `Player → Input → Game loop: enqueue fire intent` leg; §8 DPR/coordinate-mapping row.
- [[../data-model.md]] `GameState.fireIntents` — **data delta: this task writes the queue** (shape locked in T-02); `Shot.aimX/aimY` are DPR-corrected world coords.

## Acceptance criteria

**AC-T04-1 (gating, PRD AC-07)**
Given the tab has lost focus or the pointer is outside the play area
When a click occurs
Then no fire intent is enqueued (and therefore no shell can be consumed downstream).

**AC-T04-2 (aim accuracy)**
Given DPR 1 and DPR 2 viewports, before and after a window resize
When a click lands on a known screen point
Then the mapped world coordinate deviates ≤ 2 px from the expected point.

## Atomic checklist

- [ ] Step 1: pointer listeners + crosshair position tracking on the canvas.
- [ ] Step 2: screen→world mapping function accounting for DPR and canvas resize.
- [ ] Step 3: gating — document focus/visibility + play-area bounds check before enqueue.
- [ ] Step 4: enqueue fire intents into `state.fireIntents`; unit tests for mapping (DPR 1/2, resize) and gating.

## Edge cases

| Case | Expected |
|---|---|
| Click during `blur` → `focus` transition | gated until focus is back |
| Click on canvas edge pixel | inside bounds ⇒ intent enqueued; outside ⇒ dropped |

## DoD

- Mapping + gating unit tests green; manual check on a HiDPI screen.
- Module only enqueues — no weapon/shell logic here (that is T-06's contract).
