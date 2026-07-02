# Data-model audit — basic-shooting-range (2026-07-02)

Skill: `sdlc:generate-data-model`, **adapted mode**: client-only game, no database in MVP (decision recorded 2026-07-02: "адаптировать к реальности"). SQL migration generation, seeds, migrate up/down and expand→backfill→contract are intentionally out of scope — there is nothing to migrate (PRD §6.1: all state ephemeral).

## Generated files

- `docs/features/basic-shooting-range/data-model.md` — ER (in-memory contract) + 5 runtime entities + 3 static-config entities + access-patterns table (index analog) + storage N/A rationale + test-fixtures plan.
- `.claude/rules/migrations.md` — **bootstrapped on first run (adapted)**: current no-DB contract, reopen-triggers, localStorage versioned-key rules, full course Postgres defaults pre-committed for the day persistence appears. Edit if you disagree with any default.
- `migrations/*.up.sql / *.down.sql` — **none (N/A)**, deliberate.

## Sources used

- PRD §4/§5 AC → entities and invariants (score non-decreasing AC-03, reload gating AC-02, miss-on-escape AC-05, counters for AC-04/04b).
- PRD §6.1 → no persistence, no PII.
- SAD §5 → module map (`core/state.ts` as contract location); §6 Flows 1-6 → access patterns; §7 → ≤30 demons budget justifying linear scans; §8 → ID strategy (incremental in-memory).
- SAD had no §6.4 ER stub — ER drawn fresh here; consider back-linking from SAD §6.4 later (optional).

## Default deviations applied (vs course baseline)

| Course default | Here | Why |
|---|---|---|
| UUID v7 PK app-side | incremental in-memory integer ids | SAD §8; single client, no pagination/merge concerns |
| `created_at TIMESTAMPTZ` on every entity | none | no wall-clock in sim (ADR-0002); no persistence to audit |
| Timestamp-named SQL migration pairs | none | no DB; contract = TS types in `src/core/state.ts` |
| Lookup-data seed migrations | typed module constants | config shipped in the bundle |
| Test fixtures as code factories | kept as-is | `makeDemon/makeRound/makeGameState` planned in test code |
| Hard delete + audit table | kept (analog) | resolved demons removed from state; residue on `Round` |
| No business logic in storage | kept (analog) | config holds values; invariants live in `src/systems/*` |

## Self-check (4 mandatory checks, adapted)

1. **Naming** — entities match CONTEXT.md glossary (demon, wave, spawn point, reload, score); fields camelCase per TS convention. ✅
2. **down/up reversibility** — N/A (no migrations); reversibility analog: page reload resets all state by design. ✅
3. **FK indexes** — analog: every cross-reference (`typeId`, `pathId`) resolves through keyed `Record` maps built at boot, O(1); no dangling-reference path. ✅
4. **Forbidden features** — no business defaults / triggers / checks in "storage": config is pure data, all invariants enforced in systems code. ✅

## Drift detection

Skipped — no domain code exists yet (`src/` not started). First implementation of `core/state.ts` should be checked against data-model.md manually or via `--drift-only` once code lands.

## Breaking changes decomposed

None (greenfield, no existing schema). Expand→backfill→contract exercise from the lesson skipped with the whole SQL scope — no table to break.

## TBDs

- `data-model.md` → `GameState.fireIntents` — exact queue shape, lock during implementation.
- `data-model.md` → `WaveSchedule` — concrete slot values, tuning during implementation (§11 accepted debt).

## Next stage

`api-forge basic-shooting-range` (stage 10) — likely also heavily adapted or N/A: no server API. Decide at that lesson.
