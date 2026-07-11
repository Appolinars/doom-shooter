---
id: T-03
epic: game-feel
project: doom-shooter
wave: 1
priority: P1
estimate: S
blocks: [T-08]
blocked_by: []
status: done
context_budget: 4000
created: 2026-07-06
owner: Maksym Vakulenko
---

# T-03 — Pump gate as a fixed-step weapon state

> **Amended 2026-07-11:** the magazine-reload mechanic is removed (PRD §1 amendment) — **unlimited ammo, no shells, no `'reloading'` status**. This task now also strips reload/shells from the base-game weapon (same files it touches), leaving the pump as the *only* weapon gate.

## Goal

The pump is the **only** juice element that changes gameplay (ADR-0002), so its timer lives on the fixed step — not on the render layer. In `src/core/state.ts` add `'pumping'` to `Weapon.status` plus `pumpRemainingMs`; in `src/core/config.ts` add `PUMP_DURATION_MS = 350` (PRD-resolved); in `src/systems/weapon.ts`, a ready fire always succeeds (no ammo check), sets `status = 'pumping'`, `pumpRemainingMs = PUMP_DURATION_MS`, the timer counts down on the fixed step (never wall-clock), and while `'pumping'` a fire attempt is **blocked and dropped** (no state change). Only the pump **sprite** is render-side (that is T-08).

**Reload removal (same files):** delete `SHELL_CAPACITY` + `RELOAD_DURATION_MS` from `config.ts`, the `'reloading'` status + `shells`/`reloadRemainingMs` from `state.ts`, and all shell-spend / reload-transition logic from `weapon.ts`. Remove or rewrite the base game's reload unit tests. The weapon becomes a two-state machine: `'ready'` ↔ `'pumping'`.

## Linked artifacts

- [[../adr/0002-pump-as-fixed-step-weapon-gate.md]] — pump timer on the fixed step; sprite alone is render-side. *(ADR's "mirrors the reload gate" rationale is now historical — reload is gone; pump is the sole gate.)*
- [[../PRD.md]] §1 amendment (reload removed, unlimited ammo), AC-02 (mid-pump fire is blocked/dropped), §8 OQ resolved: `PUMP_DURATION_MS ≈ 350`.
- [[../sad.md]] §6 Critical flow 1 (fire → `status → 'pumping'` → gate), §5 (`weapon.ts ◐ pump gate; reload/shells removed`, `state.ts ◐ status gains 'pumping' + pumpRemainingMs`), §10 QG-2 (drift ≤ 1% must stay green — pump uses the fixed-step clock, not wall-clock).

## Acceptance criteria

**AC-T03-1 (pump blocks fire, PRD AC-02)**
Given `status == 'pumping'`
When the player attempts to fire
Then the shot is blocked and dropped (no state change), and the weapon reports not-ready.

**AC-T03-2 (pump after a shot)**
Given a ready weapon
When a fire succeeds
Then `status` becomes `'pumping'`, `pumpRemainingMs = PUMP_DURATION_MS`, and the shot resolves this step (hit path runs). No ammo is consumed (unlimited).

**AC-T03-3 (deterministic timer, PRD/SAD determinism)**
Given the pump is counting down
When the fixed step advances
Then `pumpRemainingMs` decreases by the fixed-step delta only; at ≤ 0 the weapon returns to `'ready'` — the existing drift ≤ 1% test between 60↔144 Hz stays green.

## Atomic checklist

- [x] Step 1: `config.ts` — add `PUMP_DURATION_MS = 350` (placeholder-tunable, PRD §8); **remove** `SHELL_CAPACITY`, `RELOAD_DURATION_MS`.
- [x] Step 2: `state.ts` — `Weapon.status` union becomes `'ready' | 'pumping'` (**drop** `'reloading'`); add `pumpRemainingMs: number`; **remove** `shells` / `reloadRemainingMs`.
- [x] Step 3: `weapon.ts` — ready fire always succeeds → enter `'pumping'`; tick `pumpRemainingMs` down on the fixed step; exit to `'ready'`; fire while `'pumping'` → blocked/dropped. **Remove** shell-spend + reload logic.
- [x] Step 4: unit tests — AC-02 gate (fire dropped while pumping); pump→ready transition after `PUMP_DURATION_MS`; re-run base drift test with pump active. **Delete/rewrite** the base reload/shell tests.

## Results (2026-07-11)

- Weapon is now `{ status: 'ready' | 'pumping', pumpRemainingMs }` — shells/reload fully removed from `config.ts`/`state.ts`/`weapon.ts`; zero reload references left in `src/` + `tests/`.
- Ordering locked deterministic: pump advances **before** intents drain, so a fire on the exact completion step fires (mirrors the old reload edge case).
- `weapon.test.ts` rewritten as the pump suite (gate / always-fires / deterministic timer / exact-completion-step / multi-intent / drain — incl. a 20-volley rapid-fire spam test proving ammo never runs out); factories + state tests updated.
- HUD ripple in `canvas2d.ts`: shell pips + RELOADING text removed; interim centered "PUMPING" cue until the T-08 viewmodel sprite takes over.
- Drift/aim tests untouched and green (pump uses only the fixed-step clock). 103 unit + 5 E2E green; typecheck + lint clean.

## Edge cases

| Case | Expected |
|---|---|
| Rapid fire spam | each ready fire enters pump; shots between pump end and next fire are simply gated — no ammo ever runs out |
| Fire attempted the exact step pump hits 0 | resolves as ready that step (define ordering in code; keep it deterministic) |

## DoD

- AC-02 fire-dropped-while-pumping + pump-timer transition tests green; pump uses **only** the fixed-step clock (no `performance.now`/`Date`); base drift test green with pump enabled; reload/shell code + tests removed, typecheck clean.
