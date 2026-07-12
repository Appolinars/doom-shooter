---
id: T-06
epic: survival-loop
project: doom-shooter
wave: 2
priority: P1
estimate: S
blocks: [T-10]
blocked_by: [T-05]
status: todo
context_budget: 4000
created: 2026-07-13
owner: Maksym Vakulenko
---

# T-06 — RunStats accumulation + rank pure function

## Goal

The grading inputs and the grade. `run.stats` (`kills`, `farKills`, `bestStreak`, `wavesReached`, `survivedMs`) accumulates on the fixed step alongside the systems that own the events (kill → combo/score step, wave rollover → waves step, `survivedMs` — fixed-step accumulated, never wall-clock). New `src/systems/rank.ts`: a pure function `(score, stats) → { rank: 'D'..'S', bestMoment }` over `RANK_TABLE` (fixed thresholds, placeholder values — tuned once in T-15), computed at run end, never stored (Non-goal N7). The "best moment" line derives from stats (e.g. best streak / far-kill count / waves survived).

## Linked artifacts

- [[../PRD.md]] AC-07 (rank + stats + best-moment on the end screen — the computation half; display = T-10); §8 fixed-table default.
- [[../data-model.md]] §`RunStats` (invariants: `farKills ≤ kills`, `bestStreak` = max streak), rank-fn contract under it.
- [[../sad.md]] §6 flow 3 (rank computed at `running → ended`), §4 defaults block.
- [[../test-plan.md]] AC-07 row (boundary values hit each rank exactly once).

## Acceptance criteria

**AC-T06-1 (stats accumulation)**
Given a scripted run (kills incl. far kills, waves, a known duration in steps)
Then `stats` matches exactly: `kills`/`farKills` counts, `bestStreak` = max streak reached (survives later breaks), `wavesReached` mirrors `wave.number`, `survivedMs` = steps × STEP_MS.

**AC-T06-2 (rank table, PRD AC-07)**
Given `RANK_TABLE` fixture boundaries
Then the rank fn maps deterministically, each rank D/C/B/A/S is hit exactly once at its boundary, and the same inputs always give the same rank (pure).

**AC-T06-3 (best moment)**
Given finished-run stats
Then `bestMoment` is a deterministic line derived from stats per the locked derivation rule.

## Atomic checklist

- [ ] Step 1: stats accumulation wired into existing system steps (kill/far-kill/streak/wave/step counters) — no new step slot.
- [ ] Step 2: `rank.ts` pure fn + `RANK_TABLE` config (placeholder values; small fixture per test-plan).
- [ ] Step 3: best-moment derivation rule + test.
- [ ] Step 4: unit tests per ACs; static-scan check: no wall-clock in the accumulation.

## Edge cases

| Case | Expected |
|---|---|
| Zero-kill run (instant death) | stats all-zero except `wavesReached ≥ 1`, `survivedMs > 0`; rank = lowest; bestMoment degrades gracefully |
| `farKills` vs `kills` invariant | property test: `farKills ≤ kills` over random sequences |

## DoD

- AC-07 unit row green; boundaries locked; purity asserted; stats never persisted.
