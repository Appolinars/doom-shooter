---
status: Accepted
owner: "Maksym Vakulenko"
reviewers: ["Tech Lead"]
updated_at: "2026-07-12"
feature_size: M
stage: "04-05"
ticket: "N/A (personal pet-project)"
---

# 0003 — Put the per-mode record behind a fail-soft store with a versioned localStorage key

- **Status:** Accepted
- **Date:** 2026-07-12
- **Deciders:** Maksym Vakulenko (Architect) + Claude (Socratic walk)

## Context

The per-mode best score is the project's first persisted datum — it fires reopen-trigger #1 of `.claude/rules/migrations.md`, which pre-commits the key shape (`doom-shooter.v<N>`, one JSON document, version bump = migration with a unit test, no PII). What remained open was the adapter's behavior: when to read/write and how to degrade when storage is unavailable or corrupt (AC-10).

## Decision drivers

- QG-3: 100% of runs reach their end screen with storage unavailable or corrupt (PRD §6 NFR, AC-10).
- migrations.md contract: single namespaced versioned key, migration functions next to the type, unit test per version step.
- §3 trust boundary: localStorage is an external, untrusted system — every read parsed defensively.
- AC-09: records never compare across modes — per-mode fields in one document.

## Considered options

1. **Dedicated fail-soft adapter module: read-on-boot, write-on-run-end** — the only touchpoint with localStorage; defensive parse to defaults + session-only flag on any error; writes swallowed on failure.
2. **Inline read/write in `wiring.ts`** — try/catch around localStorage at the `running → ended` transition, no separate module.

## Decision outcome

**Chosen:** Option 1. Migration logic and defensive parsing live next to the record type where the migrations.md contract expects them, unit-testable in isolation; the game loop never touches storage, making QG-3 hold by construction. Option 2 smears version-migration concerns across the feedback wiring and makes the per-version unit tests awkward.

## Consequences

**Positive**
- AC-10 fail-soft is structural: one module to fault-inject in unit tests and one E2E run with storage disabled.
- Schema v1 `{ endless: number, survive60: number }` is fixed for the data-model stage.

**Negative**
- A record beaten in another tab is only picked up after reload (single read at boot) — accepted for a personal, per-browser record.

**Neutral**
- A future v2 schema (e.g. per-mode stats) goes through the pre-committed migration path: read `v1`, transform, write `v2`, delete old key.

## Links

- PRD: [[../PRD.md]] US-08; AC-08, AC-09, AC-10; §6.1 abuse cases
- SAD: [[../sad.md]] §4 pillar 3
- Related ADR: [[0001-extend-round-into-mode-aware-run-state]]
