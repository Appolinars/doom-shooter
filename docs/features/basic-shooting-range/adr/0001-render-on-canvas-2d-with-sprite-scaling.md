---
status: Accepted
owner: "Maksim Vakulenko"
reviewers: ["Tech Lead"]
updated_at: "2026-07-02"
feature_size: M
stage: "04-05"
ticket: "N/A (personal pet-project)"
---

# 0001 — Render on Canvas 2D with per-frame sprite scaling

- **Status:** Accepted
- **Date:** 2026-07-02
- **Deciders:** Maksim Vakulenko (Architect + author)

## Context

PRD §1 fixes the accepted vector as Approach C — a flat-2D playable round first, then an additive sprite-scaling depth layer so demons "approach" from depth. SAD §2 pins the rendering surface to the Canvas 2D context and locks in a `depth/z` field on the demon from stage 1. The question at the architecture gate: which rendering technique turns that `z` into on-screen pseudo-depth, and is it additive rather than a rewrite between the flat and the 2.5D stages?

## Decision drivers

- QG-2 depth-readiness — the 2.5D layer must be additive, not a rewrite (SAD §1, idea-brief §13).
- QG-1 performance — ≥ 30 FPS under a wave, frame-time p95 ≤ 33.3 ms (PRD §6).
- §2 constraint — Canvas 2D surface, solo developer, no external engine baseline.
- PRD N5 — no full 3D engine with real wall geometry or vertical aiming.

## Considered options

1. **Canvas 2D + per-frame sprite scaling** — scale, screen position, draw order (back→front) and hit priority (front-most) are all functions of the demon's `z`; flat-2D is the same path with equal `z`.
2. **WebGL / Phaser engine** — GPU-accelerated sprites, more headroom, but a heavier dependency and API surface for a solo flat-first demo.
3. **True raycasting (Doom-style walls)** — an authentic pseudo-3D engine, but it contradicts PRD N5 and is a rewrite, not an additive layer.

## Decision outcome

**Chosen:** Option 1 (Canvas 2D + sprite scaling). It is the only option where the flat-2D round and the 2.5D layer share one code path — the depth layer only starts varying `z` — which is exactly the additive property QG-2 demands. Canvas 2D comfortably holds ≥ 30 FPS for the small entity counts in scope, and it avoids the N5 raycasting rewrite.

## Consequences

**Positive**
- The depth layer is additive: no render rewrite between the flat and 2.5D stages.
- Minimal dependency footprint — no engine, faster load (PRD §6 load-time NFR).
- `z`-driven draw order and hit priority reuse one value for four concerns.

**Negative**
- Canvas 2D has a lower performance ceiling than WebGL if entity counts grow far beyond MVP.
- Sprite scaling is manual (image smoothing, sub-pixel rounding) rather than free from the GPU.

**Neutral**
- Migrating to WebGL later is possible but is a full render-module rewrite (this is the irreversibility that made this ADR-worthy).

## Links

- PRD: [[../PRD.md]] — US-05 (patterned demons with depth), US-01 (fire), §6 NFR
- SAD: [[../sad.md]] §4 (strategic pillar 1), §5 (building blocks)
- Related ADR: [[0003-plain-typed-entities-over-ecs]] — the `Demon` entity that carries the `z` field this renderer consumes
