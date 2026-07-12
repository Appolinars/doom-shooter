---
id: T-01
epic: survival-loop
project: doom-shooter
wave: 1
priority: P1
estimate: S
blocks: [T-02, T-07]
blocked_by: []
status: todo
context_budget: 4000
created: 2026-07-13
owner: Maksym Vakulenko
---

# T-01 — Run state model + config scaffold (Round→Run)

## Goal

The accepted wide-but-mechanical diff of ADR-0001, and nothing else: `Round` becomes `Run` (type + code identifiers), gaining `mode: 'endless' | 'survive60' | null`, `playerHp` (init `PLAYER_MAX_HP`), `outcome: 'gameOver' | 'won' | null`, the `'idle'` status literal (unused until T-09), `combo: Combo` (`{ streak: 0, multiplier: 1 }`), and `stats: RunStats` (zeros). `config.ts` gains `PLAYER_MAX_HP = 5` and `ENTITY_CAP = 32` (values only — invariants come with their systems). Every test factory gains the new fields. **Behavior-neutral by definition:** the game plays exactly as before this PR.

Legacy fields (`misses`, `scheduledCount`/`resolvedCount`, `WAVE_SCHEDULE`) stay — their successors retire them (T-02, T-03). `WaveState` and `fireballs[]` are NOT introduced here (they land with their systems, T-03 / T-12).

Also carries the pre-announced docs debt (SAD §11): amend the base-feature glossary entries (`score` — now multiplied; `round` — superseded by `run` with a lose condition) in `docs/features/basic-shooting-range/CONTEXT.md`.

## Linked artifacts

- [[../adr/0001-extend-round-into-mode-aware-run-state.md]] — one phase authority; mechanical wide diff accepted.
- [[../data-model.md]] §`Run`, §`Combo`, §`RunStats`, §Static config — field-by-field contract.
- [[../sad.md]] §5 (`state.ts` delta), §11 (glossary-amendment debt row).
- [[../test-plan.md]] §Test data — factories `makeRun(overrides?)` etc. gain the new fields.

## Acceptance criteria

**AC-T01-1 (type contract)**
Given the data-model §`Run`/`Combo`/`RunStats` tables
When `src/core/state.ts` compiles
Then every field, literal union, and default matches the tables exactly (including `'idle'` in the status union and per-mode nullable `timeLeftMs` semantics documented on the type).

**AC-T01-2 (behavior-neutral)**
Given the full existing suite (195 unit + 8 E2E)
When it runs against this PR
Then it is green with only mechanical amendments (renames, added factory fields) — no assertion's meaning changes.

**AC-T01-3 (glossary amended)**
Given `docs/features/basic-shooting-range/CONTEXT.md`
Then the `score` and `round` entries carry the pre-announced amendments with a pointer to this feature.

## Atomic checklist

- [ ] Step 1: `state.ts` — rename `Round`→`Run` (+ `round`→`run` field, identifiers via rename-symbol), add `mode` / `playerHp` / `outcome` / `'idle'` literal / `combo` / `stats` with defaults.
- [ ] Step 2: `config.ts` — `PLAYER_MAX_HP`, `ENTITY_CAP` constants (values only).
- [ ] Step 3: `tests/factories.ts` — `makeRun(overrides?)` (ex-`makeRound`), defaults mirror state; ripple through existing factories/tests mechanically.
- [ ] Step 4: base glossary amendments in `basic-shooting-range/CONTEXT.md`.
- [ ] Step 5: full suite green, zero behavior diff confirmed (`git diff` review: no logic files beyond renames/additions).

## Edge cases

| Case | Expected |
|---|---|
| `timeLeftMs` today is a number (base 60s round) | keep current behavior untouched; per-mode `null` semantics activate in T-08, documented on the type now |
| E2E `window.__doom` exposes round state | rename ripples into the debug API + specs mechanically; API surface change noted for T-11 |

## DoD

- Suite green, behavior-neutral confirmed; types match data-model verbatim; glossary amended; PR ≤ 500 LOC (mechanical bulk is acceptable here — ADR-0001 consequence).
