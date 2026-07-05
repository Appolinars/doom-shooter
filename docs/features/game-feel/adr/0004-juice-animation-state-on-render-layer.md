---
status: Accepted
owner: "Maksym Vakulenko"
reviewers: ["Tech Lead"]
updated_at: "2026-07-05"
feature_size: S
stage: "04-05"
ticket: "N/A (personal pet-project)"
---

# 0004 — Keep juice animation state on the render layer, off GameState

- **Status:** Accepted
- **Date:** 2026-07-05
- **Deciders:** Maksym Vakulenko (author), during the architecture-design Socratic walk

## Context

The feature adds pure-visual animation: a ~1 s demon death animation, viewmodel frames (idle/firing/pump/reload), and hit splats. The engine's core guarantee (base ADR-0002) is a deterministic fixed step decoupled from render, verified by drift ≤ 1% and aim ≤ 2 px tests. If animation timers were stored on `GameState` entities, the fixed step would gain visual-only mutations and those guarantees (and tests) would break. AC-09 also poses a race: a death animation may still be playing when the round's end-condition freezes it.

## Decision drivers

- Preserve base ADR-0002 determinism: **zero** fixed-step mutations from pure juice (PRD §6, QG-2).
- AC-09: a death animation in-flight at round-end must not mutate the finalized score.
- AC-04b: the killing shot's score must commit on the fixed step (already true).
- Keep the drift/aim base tests green with juice enabled.

## Considered options

1. **Render-layer effect store** — animation clocks live in a render-side store (`src/render/effects.ts`) advanced by the rAF frame delta. The killing shot despawns the demon on the fixed step (score once) and emits a transient "death visual" into the store; render owns its ~1 s lifetime. Viewmodel frames and splats live there too.
2. **Animation fields on `GameState` entities** — add `deathAnimMs`, `viewmodelFrame`, etc. to entities and advance them in the fixed step. Simplest wiring, one state tree.

## Decision outcome

**Chosen:** Option 1. Option 2 would put visual-only timers on the fixed step, adding mutations that break base ADR-0002's determinism guarantee and its drift/aim tests — the exact thing the feature promised not to do. A render-side store keeps the fixed step pure: the demon leaves `GameState` the instant it dies (score committed once, AC-04b), and a frozen round simply keeps drawing or drops the dying visual without ever touching the finalized score (AC-09).

## Consequences

**Positive**
- Fixed step stays pure → base drift/aim/determinism tests run unchanged and green with juice on.
- AC-09 falls out for free: death visuals are decoupled from round state, so a freeze can't corrupt the score.
- Effects advance on the real frame delta → smooth regardless of the fixed-step rate.

**Negative**
- A second (render-only) state tree to reason about, keyed to demons by id for the frame they die.
- Effects must be pruned each frame (splats past `SHOT_SPLAT_MS`, finished death visuals) — main.ts already prunes transient `Shot` cues, so this extends an existing pattern.

**Neutral**
- Determinism of *visuals* is intentionally not guaranteed (frame-rate dependent) — correct for pure juice, which never decides an outcome (CONTEXT: juice "only expresses" an outcome).

## Links

- PRD: [[../PRD.md]] AC-04 / AC-07 / AC-09 / §6 (determinism)
- SAD: [[../sad.md]] §4, §8 (Render/fixed-step boundary, Animation clock)
- Related ADR: [[0001-demon-hp-as-bounded-field-damaged-inline]] (visuals read `hp`); base ADR-0002 (fixed-step loop, preserved)
