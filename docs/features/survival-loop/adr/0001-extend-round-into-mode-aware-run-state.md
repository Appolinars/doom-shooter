---
status: Accepted
owner: "Maksym Vakulenko"
reviewers: ["Tech Lead"]
updated_at: "2026-07-12"
feature_size: M
stage: "04-05"
ticket: "N/A (personal pet-project)"
---

# 0001 — Extend Round into a mode-aware run state

- **Status:** Accepted
- **Date:** 2026-07-12
- **Deciders:** Maksym Vakulenko (Architect) + Claude (Socratic walk)

## Context

The shipped game models one scripted round: `Round = { status: running|paused|ended, score, misses, timeLeftMs, scheduledCount, resolvedCount }` with a one-way freeze on end. survival-loop needs a run lifecycle: a chosen mode (Endless / Survive-60s), player HP, two distinct terminal outcomes (game over / won), and a pre-run start-screen phase. The question is where that lifecycle lives — the answer shapes every system, test factory, and the E2E debug API.

## Decision drivers

- QG-1 Determinism: all phase transitions must happen on the fixed step (PRD §6 NFR).
- Existing one-way freeze + pause + `isRoundActive` gate are proven and covered by 195 unit tests — reuse over rebuild.
- AC-12: gameplay input accepted only while a run is actually running — needs one authoritative phase source.
- Base ADR-0003: one central mutable `GameState`, plain structs, no ECS.

## Considered options

1. **Extend `Round` into a mode-aware run state** — add `mode`, `playerHp`, `outcome`, and an `idle` status to the existing object.
2. **Separate app-level FSM above GameState** — new screen-manager automaton outside the simulation; Round stays as-is.

## Decision outcome

**Chosen:** Option 1. One source of truth for the game phase: the freeze, pause, step gating, wiring diff observers, and test factories all keep working; screens render off the same status the systems already read. Option 2 would create two phase authorities that must be manually synchronized — a race surface the poll/diff wiring was designed to avoid.

## Consequences

**Positive**
- One-way freeze, `isRoundActive`, retry reset, and E2E `window.__doom` API extend instead of forking.
- Screens (ADR-0005) derive directly from `run.status` — no bridge state.

**Negative**
- The run object grows: survive-timer and endless-wave fields coexist with per-mode nullable semantics.
- Every existing test factory and several unit tests need the new fields (mechanical, wide diff).

**Neutral**
- The base term "round" is superseded by "run" in docs; code identifiers migrate opportunistically.

## Links

- PRD: [[../PRD.md]] US-01, US-02, US-09, US-10; AC-02, AC-11, AC-12
- SAD: [[../sad.md]] §4 pillar 1
- Related ADR: [[0002-single-parametric-wave-generator]], [[0005-hybrid-canvas-screens-with-dom-controls]]
