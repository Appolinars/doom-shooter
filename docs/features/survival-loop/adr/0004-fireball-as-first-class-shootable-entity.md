---
status: Accepted
owner: "Maksym Vakulenko"
reviewers: ["Tech Lead"]
updated_at: "2026-07-12"
feature_size: M
stage: "04-05"
ticket: "N/A (personal pet-project)"
---

# 0004 — Model the fireball as a first-class shootable entity kind

- **Status:** Accepted
- **Date:** 2026-07-12
- **Deciders:** Maksym Vakulenko (Architect) + Claude (Socratic walk)

## Context

Stage 3 adds shooter demons whose telegraphed fireballs can be shot down mid-flight (US-11). Today the hit-test resolves the front-most single entity kind (demons by depth, linear scan, `DEMON_HIT_RADIUS`). AC-15 requires a single hit to resolve to the front-most entity by depth *across both kinds* when a demon and a fireball overlap under the crosshair.

## Decision drivers

- AC-14/AC-15: fireballs are shootable but award no kill points and neither grow nor break the combo — different rules from demons.
- CONTEXT glossary boundary: "fireball — NOT a demon (shootable but has no path-walking, score value, or HP tiers)."
- QG-2: the ≤ 32 live-entity cap counts demons + fireballs together (PRD §6 NFR).

## Considered options

1. **Separate entity kind + generalized hit-test** — `state.fireballs[]` beside `demons[]`; `hit.ts` collects candidates from both lists and picks the front-most by z (shared `Targetable` surface).
2. **Fireball as a demon subtype** — `kind: 'fireball'` inside `demons[]` with special-case flags (no score, no combo effect, straight flight). *Constraint-excluded rather than weighed as an equal: the CONTEXT glossary boundary ("fireball — NOT a demon") already ruled it out; listed because it was presented and rejected during the Socratic walk.*
3. **Generic `projectiles[]` list shared with future shot kinds** — a broader abstraction hosting fireballs and any later projectile.

## Decision outcome

**Chosen:** Option 1. The fireball inherits nothing demon-specific, matching the glossary boundary; demon invariants (miss statistics, score logic, HP tiers) stay free of fireball `if`s. Option 3 was rejected as a premature abstraction — the backlog has exactly one projectile kind in sight (YAGNI); Option 2 fell to the glossary constraint as noted above.

## Consequences

**Positive**
- Demon systems stay clean; fireball rules (despawn harmlessly, land as player hit) live in their own system.
- The generalized hit-test is the natural extension point if a third shootable kind ever appears.

**Negative**
- `hit.ts`, renderer depth-sort, and wiring diff observers must each handle two lists (one shared interface, three call sites).

**Neutral**
- The entity cap check moves to a helper that sums both lists.

## Links

- PRD: [[../PRD.md]] US-11, US-12; AC-14, AC-15
- SAD: [[../sad.md]] §4 pillar 4
- Related ADR: [[0002-single-parametric-wave-generator]]
