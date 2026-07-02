# Sequence coverage audit — basic-shooting-range (2026-07-02)

Skill: `sdlc:complete-sequence-diagrams`. PRD §4: 6 user stories. SAD §6 before run: 4 flows (Critical flow 1-4).

## Coverage table (before → after)

| US | Title | Before | After |
|---|---|---|---|
| US-01 | Fire the shotgun | Covered (Flow 1, Flow 2) | Covered |
| US-02 | Reload the shotgun | Partial (error branch only, Flow 2) | **Covered** (Flow 5 added) |
| US-03 | Score a kill | Covered (Flow 1) | Covered |
| US-04 | See the round result | Covered (Flow 4) | Covered |
| US-05 | Face patterned demons | Missing | **Covered** (Flow 6 added) |
| US-06 | Miss when a demon escapes | Covered (Flow 3) | Covered |

## Added

- **Flow 5: Reload cycle (US-02, AC-02)** — happy path: last shell consumed → reload timer over fixed steps → shells full → ready cue. Complements the existing error branch in Critical flow 2.
- **Flow 6: Demon spawn & patterned movement (US-05, AC-06)** — wave schedule → spawn at spawn point (type, pathId, z) → movement along fixed paths → render with sprite scale from z (ADR-0001). Cross-references despawn/miss in Critical flow 3.

## Skipped (trivial)

- **AC-07 (US-01) input-gating** — single guard at the Input boundary (focus / pointer scope), no business logic beyond a boolean gate; `input/pointer.ts` in §5 already names it. Deliberately not diagrammed.

## New actors flagged

None. All participants (Input, Game loop, Spawn, Weapon, GameState, Renderer) exist in §5 Container view; Spawn/Weapon/Hit/Round/Score follow the established convention of splitting the "Simulation systems" container per system.

## ADR potential

None. Spawn patterns and reload timing are tuning parameters, not architectural forks; depth resolution is already covered by ADR-0001/ADR-0003.

## Notes

- All flows are synchronous (client-side fixed-step loop); no async patterns (idempotency / retry / DLQ) apply.
- Mermaid validation: `mmdc --parse-only` skipped by user decision (avoids ~300 MB puppeteer download); blocks reviewed manually against the already-rendering Flow 1-4 syntax (same constructs: `alt`, `loop`, `Note over`, `actor`).
- Heading convention in §6 is `**Flow N: <title> (US-N, AC-N)**` (bold, not `### US-N`); new flows follow the file's existing style.

## Self-check (DoD)

- [x] Every PRD US is Covered or explicitly Trivial (6/6: 5 covered before+after diagrams, AC-07 edge explicitly trivial).
- [x] New blocks syntax-reviewed (mmdc waived, see Notes).
- [x] Existing sequences untouched (additive only).
