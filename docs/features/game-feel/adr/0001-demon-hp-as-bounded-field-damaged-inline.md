---
status: Accepted
owner: "Maksym Vakulenko"
reviewers: ["Tech Lead"]
updated_at: "2026-07-05"
feature_size: S
stage: "04-05"
ticket: "N/A (personal pet-project)"
---

# 0001 — Model demon HP as a bounded field, damaged inline in the hit path

- **Status:** Accepted
- **Date:** 2026-07-05
- **Deciders:** Maksym Vakulenko (author), during the architecture-design Socratic walk

## Context

PRD US-03/AC-03 adds shot-durability: demons take 1/2/4 shots, each landed shot removes one hit point, and score is added only when the last point is removed. The base demon entity (`src/entities/demon.ts`) has **no HP** today — a hit removes the demon immediately and scores (`src/systems/hit.ts`). This is the one accepted gameplay-rule change of the feature, and it touches two base invariants: front-most-by-`z` hit resolution (base ADR-0001) and the flat non-decreasing score (data-model).

## Decision drivers

- Preserve front-most-by-`z` hit resolution and the non-decreasing-score invariant (base SAD, data-model).
- Smallest viable change for size **S** (PRD `.size = S`).
- Single source of truth — avoid a second structure that can desync from the demon list.
- `hurt state` (PRD glossary) must be derivable, not separately tracked.

## Considered options

1. **`hp` field on `Demon`, damaged inline in `hit.ts`** — `Demon` gains `hp` (initialised from its `DemonType.maxHp` at spawn); `resolveFire` does `hp--` and only despawns + calls `applyKill` when `hp == 0`. `hurt` is derived as `hp < maxHp`.
2. **Separate `damage.ts` system** — a new system between hit and score owns the decrement, added as a new step in `step.ts`.
3. **HP in a parallel `Map<demonId, hp>`** — durability kept outside `Demon` to avoid editing the entity.

## Decision outcome

**Chosen:** Option 1. HP is intrinsic demon state, so it belongs on the entity; a `Map` would create a second source of truth to keep in sync with despawns (Option 3), and a whole new system + step is overkill for a single decrement (Option 2). Inline damage keeps the front-most-by-`z` scan and the "score once, on the killing shot" path exactly where they already live, so the existing hit/score tests extend rather than move.

## Consequences

**Positive**
- One source of truth; `hurt` needs no extra field (`hp < maxHp`).
- `applyKill` stays called exactly once per kill → non-decreasing-score invariant holds by construction.
- Minimal diff: `Demon` + `DemonType.maxHp` + `hit.ts` branch; `step.ts` order unchanged.

**Negative**
- `hit.ts` grows a branch (decrement vs kill); its unit tests must cover the multi-shot path.
- HP tiers/point values are placeholder until tuned (tracked as OQ in SAD §11).

**Neutral**
- A future "damage over time" or armor mechanic would still fit on the field; only then would a dedicated system pay off.

## Links

- PRD: [[../PRD.md]] US-03 / AC-03 / AC-08
- SAD: [[../sad.md]] §4, §5
- Related ADR: [[0004-juice-animation-state-on-render-layer]] (hurt/death visuals read `hp` render-side)
