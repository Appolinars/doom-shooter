# Data-model audit — survival-loop (stage 08)

Date: 2026-07-13. Mode: client-only adaptation (brownfield delta over the base in-memory
contract), same as basic-shooting-range stage 08.

## Generated / updated files

- `docs/features/survival-loop/data-model.md` — NEW: delta ER + entity tables (Run,
  Combo, RunStats, Fireball, WaveState, Demon delta, config delta), access patterns,
  ACTIVE localStorage contract, test-fixture plan, TBDs.
- `.claude/rules/migrations.md` — UPDATED: reopen-trigger #1 marked FIRED; "If
  localStorage appears" promoted to "localStorage contract (ACTIVE)" with the concrete
  `doom-shooter.v1` schema and owner module.
- SQL `migrations/*.up.sql`/`.down.sql`, seeds, drift `_drift/` — **N/A** (no database;
  trigger #2 untouched). The persisted-storage "migration" is the in-code version-bump
  contract with a unit test per step.

## User decisions this stage (all via AskUserQuestion, first-pass)

1. Combo lives on `run.combo = { streak, multiplier }`; multiplier stored, single writer
   `systems/combo.ts`.
2. Rank inputs accumulate in `run.stats = { kills, farKills, bestStreak, wavesReached,
   survivedMs }`; rank computed at run end by a pure function, never stored.
3. `Fireball = { id, x, y, z, progress }` mirrors Demon; telegraph/cooldown timers live in
   an optional `attack` field on shooter-type Demons, driven by `systems/fireball.ts`.
4. Generated-wave runtime state lives in the aggregate: `state.wave = { number, slots,
   nextSlotIndex, waveElapsedMs }` (central-GameState discipline over system-local state).

## Default deviations / adaptations

- Course SQL defaults (timestamp filenames, UUID v7, `created_at`, hard-delete+audit) stay
  dormant behind trigger #2; the active analogs: versioned key = schema version,
  missing-key⇒defaults = bootstrap seed, in-code migration + unit test = up/down pair.
- Hard-delete analog unchanged: despawned demons/fireballs removed from arrays, residue on
  `run.stats`.
- IDs stay in-memory incremental per entity kind (SAD §8) — no UUIDs client-side.

## Self-check (adapted analogs of the 4 mandatory checks)

- Naming: entities singular TS interfaces / plural array fields, matches base contract — OK.
- Reversibility analog: v1 is the first schema version; missing-key⇒defaults path specified
  with its own unit test; version-bump contract pre-committed — OK.
- FK-index analog: every `typeId`/`pathId` deref via keyed `Record` maps (base pattern);
  cross-kind hit-test justified O(n≤32) — OK.
- Forbidden-features analog: config = values only, invariants in systems code; no business
  defaults in storage (records.ts stores raw numbers); PII guard satisfied (scores only) — OK.

## Breaking changes (internal, no decomposition needed — single deploy, no running pods)

- `Round` → `Run`: +`mode`/`playerHp`/`outcome`/`combo`/`stats`, `status` gains `idle`,
  `timeLeftMs` becomes nullable; `scheduledCount`/`resolvedCount` REMOVED with the fixed
  `WAVE_SCHEDULE` (ADR-0002). Wide-but-mechanical test-factory diff accepted in ADR-0001.
- `Demon.progress = 1.0` semantics: despawn+miss → despawn+player-hit.

## TBDs (file: data-model.md)

- `run.misses` final semantics (keep as shots-missed vs retire) — break-tasks.
- Tuning values: `COMBO_TABLE`, `MODE_PARAMS` escalation curve (3-evening budget),
  `RANK_TABLE`, `FIREBALL_PARAMS` — schema-stable, accepted debt.

## Next stage

Stage 10 api-contracts remains **N/A** for this repo (no runtime API — precedent decided
2026-07-02). M full path continues with `plan-tests` + `security-review` (PRD §6.1 already
argues N/A — formalize or waive), then `break-tasks`.
