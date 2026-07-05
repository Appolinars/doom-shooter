---
id: T-03
epic: game-feel
project: doom-shooter
wave: 1
priority: P1
estimate: S
blocks: [T-08]
blocked_by: []
status: todo
context_budget: 4000
created: 2026-07-06
owner: Maksym Vakulenko
---

# T-03 — Pump gate as a fixed-step weapon state

## Goal

The pump is the **only** juice element that changes gameplay (ADR-0002), so its timer lives on the fixed step exactly like reload — not on the render layer. In `src/core/state.ts` add `'pumping'` to `Weapon.status` plus `pumpRemainingMs`; in `src/core/config.ts` add `PUMP_DURATION_MS = 350` (PRD-resolved); in `src/systems/weapon.ts`, a successful fire sets `status = 'pumping'`, `pumpRemainingMs = PUMP_DURATION_MS`, the timer counts down on the fixed step (like reload, never wall-clock), and while `'pumping'` a fire attempt is **blocked and consumes no shell**. Only the pump **sprite** is render-side (that is T-08).

## Linked artifacts

- [[../adr/0002-pump-as-fixed-step-weapon-gate.md]] — pump timer on the fixed step, mirrors the reload gate; sprite alone is render-side.
- [[../PRD.md]] AC-02 (mid-pump/mid-reload fire is blocked, consumes no shell), §8 OQ resolved: `PUMP_DURATION_MS ≈ 350`.
- [[../sad.md]] §6 Critical flow 1 (fire → `status → 'pumping'` → gate), §5 (`weapon.ts ◐ pump gate`, `state.ts ◐ status gains 'pumping' + pumpRemainingMs`), §10 QG-2 (drift ≤ 1% must stay green — pump uses the fixed-step clock, not wall-clock).
- Base gate this mirrors: [[../../basic-shooting-range/PRD.md]] AC-02 (reload gate).

## Acceptance criteria

**AC-T03-1 (pump blocks fire, no shell, PRD AC-02)**
Given `status == 'pumping'` (or `'reloading'`)
When the player attempts to fire
Then the shot is blocked, no shell is consumed, and the weapon reports not-ready — identical to the existing reload gate.

**AC-T03-2 (pump after a shot)**
Given a ready weapon with shells
When a fire succeeds
Then a shell is spent, `status` becomes `'pumping'`, `pumpRemainingMs = PUMP_DURATION_MS`, and the shot resolves this step (hit path runs).

**AC-T03-3 (deterministic timer, PRD/SAD determinism)**
Given the pump is counting down
When the fixed step advances
Then `pumpRemainingMs` decreases by the fixed-step delta only; at ≤ 0 the weapon returns to `'ready'` (or `'reloading'` if the magazine emptied) — the existing drift ≤ 1% test between 60↔144 Hz stays green.

## Atomic checklist

- [ ] Step 1: `config.ts` — `PUMP_DURATION_MS = 350` (placeholder-tunable, PRD §8).
- [ ] Step 2: `state.ts` — add `'pumping'` to the `Weapon.status` union + `pumpRemainingMs: number`.
- [ ] Step 3: `weapon.ts` — successful fire → enter `'pumping'`; tick `pumpRemainingMs` down on the fixed step; exit to `'ready'`/`'reloading'`; fire while `'pumping'`/`'reloading'` → blocked, no shell.
- [ ] Step 4: unit tests — AC-02 gate (no shell consumed while pumping); pump→ready transition after `PUMP_DURATION_MS`; interaction with the empty-magazine → reload transition; re-run base drift test with pump active.

## Edge cases

| Case | Expected |
|---|---|
| Fire empties the magazine on the same shot | after pump completes, transition to `'reloading'`, not `'ready'` (pump and reload compose, both fixed-step) |
| Fire attempted the exact step pump hits 0 | resolves as ready that step (define ordering in code; keep it deterministic) |

## DoD

- AC-02 block-no-shell + pump-timer transition tests green; pump uses **only** the fixed-step clock (no `performance.now`/`Date`); base drift test green with pump enabled.
