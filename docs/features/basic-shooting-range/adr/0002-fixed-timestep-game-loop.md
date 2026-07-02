---
status: Accepted
owner: "Maksim Vakulenko"
reviewers: ["Tech Lead"]
updated_at: "2026-07-02"
feature_size: M
stage: "04-05"
ticket: "N/A (personal pet-project)"
---

# 0002 — Drive the game loop on a fixed timestep with a delta accumulator

- **Status:** Accepted
- **Date:** 2026-07-02
- **Deciders:** Maksim Vakulenko (Architect + author)

## Context

SAD §3 places the whole game inside the browser tab, driven by `requestAnimationFrame`, which fires at the display's refresh rate (60, 120, 144 Hz…). PRD §6 requires timing drift ≤ 1% between 60↔144 Hz and frame-rate independence. The question at the architecture gate: does game logic advance on the raw per-frame delta, or on a fixed logical step decoupled from the render rate?

## Decision drivers

- PRD §6 NFR — timing drift ≤ 1% between 60↔144 Hz; frame-rate independence (QG-3).
- PRD §6 NFR — input→hit ≤ 50 ms (the loop must not add perceptible latency).
- §2 constraint — no external engine; the loop is hand-written on `rAF`.

## Considered options

1. **Fixed-timestep update + delta accumulator** — accumulate elapsed time, step logic in fixed increments, render decoupled (optionally interpolated).
2. **Variable delta-time** — advance logic by the raw frame delta each frame.

## Decision outcome

**Chosen:** Option 1 (fixed timestep). A fixed logical step makes demon movement and reload timing reproducible regardless of refresh rate, which is the only way to hold the ≤ 1% drift NFR. Variable-`dt` is less code but couples simulation to the display rate and accumulates floating-point drift between 60 and 144 Hz.

## Consequences

**Positive**
- Deterministic movement/reload timing across refresh rates — satisfies the drift NFR.
- Reproducible simulation simplifies testing the frame-rate-independence NFR.

**Negative**
- Slightly more loop code (accumulator, possible render interpolation).
- A "spiral of death" guard is needed if a frame stalls (cap max steps per frame).

**Neutral**
- Render interpolation is optional now and can be added later without changing the update contract.

## Links

- PRD: [[../PRD.md]] — US-02 (reload rhythm), §6 NFR (drift, latency)
- SAD: [[../sad.md]] §4 (strategic pillar 2), §6 (runtime view)
- Related ADR: [[0001-render-on-canvas-2d-with-sprite-scaling]] — render step this loop drives
