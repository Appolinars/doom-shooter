---
id: T-06
epic: game-feel
project: doom-shooter
wave: 3
priority: P1
estimate: M
blocks: [T-08]
blocked_by: []
status: done
context_budget: 4500
created: 2026-07-06
owner: Maksym Vakulenko
---

# T-06 — Render-side effects store (rAF clock)

## Goal

Add `src/render/effects.ts` (ADR-0004): a render-side store for all transient juice — hit splats, death visuals, and the viewmodel firing→pump→idle clock — advanced on the **rAF frame delta**, never the fixed step and never scattered wall-clock timers. It exposes `spawn*`/`advance(dtMs)`/`pruneExpired()` and a read API the renderer (T-08) consumes. **It holds zero `GameState` and mutates nothing on the fixed step** — this is the module that keeps base ADR-0002 (determinism), the drift test, and the aim test intact while juice runs. `SHOT_SPLAT_MS` and death-anim duration live in `config.ts`.

## Linked artifacts

- [[../adr/0004-juice-animation-state-on-render-layer.md]] — all juice animation state on the render layer, off `GameState`; killing shot despawns on the fixed step, render holds the dying visual.
- [[../PRD.md]] AC-01 (hit splat), AC-04 (death animation), AC-09 (death visual survives round-end freeze without mutating finalized score), AC-07 (juice on render layer only, never shifts aim/fixed step).
- [[../sad.md]] §6 Critical flow 2 + flow 3, §8 (Animation clock crosscutting row), §5 (`render/effects.ts ● render-side effect store; render-side clock`).

## Acceptance criteria

**AC-T06-1 (rAF-driven, no GameState)**
Given the effects store
When effects advance
Then they advance on the passed rAF `dtMs` only; the store imports/holds no `GameState` and calls no system — a static check + review confirms zero fixed-step reach.

**AC-T06-2 (splat lifecycle, PRD AC-01)**
Given a hit occurs
When a splat is spawned at the impact point
Then it renders for `SHOT_SPLAT_MS` and is pruned afterward; no unbounded growth under rapid fire.

**AC-T06-3 (death visual survives freeze, PRD AC-09)**
Given a death visual is mid-play when the round ends/freezes
When the round is frozen
Then the store keeps playing/holding the visual to completion and never touches the finalized score (it has no access to it).

**AC-T06-4 (viewmodel clock)**
Given a fire event feeds the store the weapon phase
When the clock advances
Then it yields the current viewmodel frame (firing→pump→idle) as a pure function of elapsed rAF time — consumed read-only by T-08.

## Atomic checklist

- [x] Step 1: `config.ts` — `SHOT_SPLAT_MS`, death-anim duration constants.
- [x] Step 2: `effects.ts` — store shape: active splats (pos + age), active death visuals (typeId + age), viewmodel clock (phase + elapsed).
- [x] Step 3: `advance(dtMs)` + `pruneExpired()` — age everything on the rAF delta; drop expired; bound the collections.
- [x] Step 4: spawn API — `spawnSplat(pos)`, `spawnDeath(typeId, pos)`, `onFire(phaseSeed)`; read API for the renderer.
- [x] Step 5: unit tests — splat pruned at `SHOT_SPLAT_MS`; death visual runs to completion independent of any round state; store references no `GameState`; collections stay bounded under a burst.

## Edge cases

| Case | Expected |
|---|---|
| Round ends while several deaths animate (AC-09) | all run to completion render-side; nothing writes score |
| Retry clicked mid-animation | store is cleared by the wiring (T-09); `clear()` drops all transient state |

## DoD

- Splats/death/viewmodel-clock advance on rAF delta with a prune test; store proven `GameState`-free (import check + review); `clear()` exists for retry (used by T-09).
