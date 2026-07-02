---
id: T-03
epic: basic-shooting-range
project: doom-shooter
wave: 2
priority: P1
estimate: M
blocks: [T-05, T-06]
blocked_by: [T-01, T-02]
status: todo
context_budget: 4500
created: 2026-07-02
owner: Maksim Vakulenko
---

# T-03 — Fixed-timestep game loop

## Goal

`src/core/loop.ts`: delta-accumulator loop on `requestAnimationFrame` — logic advances in fixed steps, render is decoupled, a max-steps guard prevents the spiral of death. This is the clock every system consumes (never wall-clock).

## Linked artifacts

- [[../adr/0002-fixed-timestep-game-loop.md]] — the decision + spiral-of-death consequence this task implements.
- [[../sad.md]] §6 — every flow runs "(fixed step)" through the Game loop participant; §8 Time/step crosscutting row.
- [[../PRD.md]] §6 NFR — timing drift ≤ 1% between 60↔144 Hz; input→shot ≤ 50 ms.
- Data delta: none on entities — the loop owns the `update(fixedDt)` / `render(state)` contract over [[../data-model.md]] `GameState`, it adds no fields.

## Acceptance criteria

**AC-T03-1 (drift NFR)**
Given synthetic frame timestamps simulating 60 Hz and 144 Hz over 60 simulated seconds
When the accumulator drives `update` for both traces
Then total simulated logic time differs by ≤ 1% between the two traces.

**AC-T03-2 (spiral guard)**
Given a single frame delta of 500 ms (stall)
When the loop processes it
Then executed steps are capped at the configured maximum and the loop recovers on the next frame instead of cascading.

## Atomic checklist

- [ ] Step 1: accumulator loop with fixed `STEP_MS`, `update(fixedDt)` + `render(state)` callback contract.
- [ ] Step 2: max-steps-per-frame guard (ADR-0002 negative consequence).
- [ ] Step 3: unit tests with synthetic timestamp traces — drift (60↔144 Hz) and stall recovery.
- [ ] Step 4: replace the T-01 rAF stub in `main.ts` with the loop, wiring a no-op update.

## Edge cases

| Case | Expected |
|---|---|
| Tab backgrounded (rAF pauses) | on resume, delta clamped by the guard — no burst of steps |
| Frame shorter than STEP_MS | zero update steps, render still runs |

## DoD

- Unit tests green incl. the two AC traces; no system reads wall-clock (grep-check `Date.now` outside loop).
- Render interpolation explicitly NOT added (ADR-0002 neutral — accepted debt in [[../sad.md]] §11).
