---
status: Accepted
owner: "Maksim Vakulenko"
reviewers: ["Tech Lead"]
updated_at: "2026-07-02"
feature_size: M
stage: "04-05"
ticket: "N/A (personal pet-project)"
---

# 0003 — Model entities as plain typed structs over an ECS

- **Status:** Accepted
- **Date:** 2026-07-02
- **Deciders:** Maksim Vakulenko (Architect + author)

## Context

SAD §5 decomposes the game into a small set of modules operating on game entities — primarily the `Demon`, which SAD §2 requires to carry a `z` field from stage 1. PRD scopes the MVP to 2 demon types (fast/low-point, slow/high-point). The question at the architecture gate: are entities plain typed structs in a central `GameState`, or an entity-component-system?

## Decision drivers

- §2 organisational constraint — solo dev, playable scoreable round in ≤ 2 evenings (PRD §7 KPI).
- QG-2 depth-readiness — the `z` field must be a first-class part of the entity either way.
- PRD scope — 2 demon types, no between-round progression (N3), no combo systems (N4).

## Considered options

1. **Plain typed entities + central `GameState`** — `Demon`, `Shot`, `Round` as small TypeScript structs; systems are plain functions over arrays.
2. **Entity-component-system (ECS)** — entities as ids, behaviour composed from components, iterated by systems.

## Decision outcome

**Chosen:** Option 1 (plain typed entities). With only 2 demon types and no progression, an ECS is over-engineering that spends the ≤ 2-evening budget on framework rather than gameplay. Plain structs keep the `z` field and the sprite-scaling contract (ADR-0001) trivially readable.

## Consequences

**Positive**
- Fastest path to a playable round — no ECS framework to build or learn.
- The `Demon.z` field is directly visible to the renderer and hit-test.

**Negative**
- Adding many heterogeneous entity types later would pressure this model toward an ECS refactor (≥ 3 days — the irreversibility that made this ADR-worthy).

**Neutral**
- The component-ish shape of the structs leaves an incremental path to an ECS if scope grows.

## Links

- PRD: [[../PRD.md]] — US-03 (score by type), US-05 (patterned demons)
- SAD: [[../sad.md]] §4 (strategic pillar 3), §5 (building blocks)
- Related ADR: [[0001-render-on-canvas-2d-with-sprite-scaling]] — consumes the `z` field this entity carries
