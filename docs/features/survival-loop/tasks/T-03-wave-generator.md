---
id: T-03
epic: survival-loop
project: doom-shooter
wave: 1
priority: P1
estimate: M
blocks: [T-04, T-12]
blocked_by: [T-02]
status: todo
context_budget: 5000
created: 2026-07-13
owner: Maksym Vakulenko
---

# T-03 — Parametric wave generator + entity cap

## Goal

ADR-0002 in full: new `src/systems/waves.ts` with a pure generator `(waveNumber, modeParams) → wave spec`, consumed on the fixed step when the current wave is exhausted (slots drained + wave demons resolved). `WaveState` (`number`, `slots`, `nextSlotIndex`, `waveElapsedMs`) joins `GameState`; `spawn.ts` consumes generator output instead of the schedule. **Retires:** `WAVE_SCHEDULE`, its cursor, and `scheduledCount`/`resolvedCount` (with the base all-resolved end-condition — endless never ends by exhaustion). `MODE_PARAMS` config lands with both param sets (endless escalating; survive60 pinned high + `durationMs: 60000` — the timer end-condition itself is T-08). The shared entity-cap helper (`demons + fireballs ≤ ENTITY_CAP`; written to sum both lists even though `fireballs[]` arrives in T-12) clamps spawn density at the source — escalation continues on speed/toughness when density caps out.

## Linked artifacts

- [[../adr/0002-single-parametric-wave-generator.md]] — one code path, both modes.
- [[../PRD.md]] AC-03 (N+1 strictly harder, number visible); §6 NFR (determinism, ≤32 cap).
- [[../sad.md]] §6 US-03 flow (incl. the cap-clamp branch), §7 (cap helper at both spawn sites), §10 QG-1/QG-2.
- [[../data-model.md]] §`WaveState`, §Static config (`MODE_PARAMS`, `ENTITY_CAP`), §Access patterns (rollover, cap check, due slots).
- [[../test-plan.md]] AC-03 rows + NFR rows (drift, cap).

## Acceptance criteria

**AC-T03-1 (escalation, PRD AC-03)**
Given `MODE_PARAMS` for either mode
When params for waves N and N+1 are generated
Then N+1 is strictly harder per the escalation rule (denser, faster, or tougher) — a monotonicity property test over a long wave range, both modes.

**AC-T03-2 (rollover integration)**
Given wave N exhausted and its demons resolved
When the next fixed step runs
Then `wave.number` becomes N+1 and N+1 spawns begin — no gap step reads wall-clock.

**AC-T03-3 (cap, QG-2)**
Given a long generated run (hundreds of waves, both modes)
Then live entities never exceed 32 at any step (stress test), spawn clamps without crash, and escalation continues on non-density axes.

**AC-T03-4 (determinism, QG-1)**
Given the existing 60↔144 Hz drift test extended to generated waves
Then the full `GameState` is deep-equal across refresh rates; static scan: no `Date.now`/`performance.now` in `systems/*`/`core/*`.

## Atomic checklist

- [ ] Step 1: `waves.ts` — pure generator + `MODE_PARAMS` (placeholder curve values; real tuning = T-15).
- [ ] Step 2: `state.ts` — add `WaveState`; `config.ts` — `MODE_PARAMS`; factory `makeWaveState(overrides?)`.
- [ ] Step 3: cap helper (sums demons + fireballs-when-present) consulted before every generator-driven spawn.
- [ ] Step 4: `spawn.ts` — consume generator output; retire `WAVE_SCHEDULE` + cursor; `round.ts` — retire all-resolved end-condition + `scheduledCount`/`resolvedCount` (deliberate test amendments).
- [ ] Step 5: tests — monotonicity, rollover, cap stress, drift extension, tab-background accumulator clamp (extends base ADR-0002 test).

## Edge cases

| Case | Expected |
|---|---|
| Wave slot due while entities = 32 | spawn clamped (skipped/deferred per helper), no crash, wave still completes via resolution |
| Huge frame delta (tab background → return) mid-wave | accumulator clamp holds; no step burst; wave state consistent |
| Wave with all demons killed before all slots due | wave completes only when slots drained AND demons resolved — no premature rollover |

## DoD

- All four AC tests green; `WAVE_SCHEDULE`/counters gone; existing determinism suite green; stage-1 endless runs indefinitely in dev.
