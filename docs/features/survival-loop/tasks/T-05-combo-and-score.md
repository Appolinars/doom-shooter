---
id: T-05
epic: survival-loop
project: doom-shooter
wave: 2
priority: P1
estimate: M
blocks: [T-06]
blocked_by: [T-02]
status: todo
context_budget: 5000
created: 2026-07-13
owner: Maksym Vakulenko
---

# T-05 — Combo multiplier + multiplied score + far-kill bonus

## Goal

The scoring heart of stage 2. New `src/systems/combo.ts` — the **single writer** of `run.combo`: streak +1 per kill, `multiplier` derived from `COMBO_TABLE` at streak change; break (streak → 0, multiplier → base) on a taken player hit — **never on a missed shot** (PRD §8 locked default). `score.ts` amends to multiplied kill points (`pointValue × multiplier`), plus the far-kill bonus (`FAR_KILL_PARAMS`: kill at `progress < 0.5`) on top. The base flat-score tests are amended **deliberately** here (test-plan: never silently). The non-decreasing-score invariant survives the amendment by construction.

## Linked artifacts

- [[../PRD.md]] AC-05 (break resets multiplier, score untouched), AC-06 (far-kill bonus); §8 combo-break + far-kill defaults.
- [[../sad.md]] §6 US-05/US-06 flows, §4 defaults block.
- [[../data-model.md]] §`Combo` (single-writer invariant), §Static config (`COMBO_TABLE`, `FAR_KILL_PARAMS` — placeholder values, tuning = T-15).
- [[../test-plan.md]] AC-05/06 rows; edge cases (midpoint boundary, break-in-kill-step ordering).

## Acceptance criteria

**AC-T05-1 (streak growth + multiplied score)**
Given consecutive kills with no break
Then `streak` increments per kill, `multiplier` follows `COMBO_TABLE`, and each kill adds exactly `pointValue × multiplier` to a non-decreasing `score`.

**AC-T05-2 (break rule, PRD AC-05)**
Given an active combo
When a player hit lands (breakthrough demon — and, from T-12, a landed fireball)
Then multiplier resets to base, earned score is unchanged, and subsequent kills score at base; a missed shot does NOT break the combo.

**AC-T05-3 (far kill, PRD AC-06)**
Given a kill at `progress < 0.5`
Then the flat far-kill bonus is added on top of the multiplied points; a kill at `progress ≥ 0.5` gets no bonus. Boundary `progress = 0.5` exactly = NOT a far kill (locked test).

**AC-T05-4 (same-step ordering)**
Given a kill and a combo break in one fixed step
Then the kill scores at the pre-break multiplier, then the break applies (AC-02b step-order discipline).

## Atomic checklist

- [ ] Step 1: `combo.ts` + `COMBO_TABLE`/`FAR_KILL_PARAMS` in config (placeholder values, small test fixtures per test-plan).
- [ ] Step 2: `score.ts` — multiplied kill points + far-kill bonus; amend base flat-score tests deliberately (named in PR).
- [ ] Step 3: `step.ts` — combo/score slot in the order (after hit, before damage); ordering test.
- [ ] Step 4: unit tests — growth, break-on-hit, no-break-on-miss, non-decreasing property over a random sequence, midpoint boundary, pre-break-multiplier ordering.

## Edge cases

| Case | Expected |
|---|---|
| Multi-kill in one step (two demons killed) | streak +2, each kill scored at the multiplier current when it resolves (deterministic resolve order) |
| Break with streak already 0 | no-op, multiplier stays base |
| Far-kill on the killing shot that also empties HP (AC-02b) | bonus + multiplied points counted before the freeze |

## DoD

- AC-05/06 unit rows green; non-decreasing property holds; base score tests amended deliberately; single-writer invariant asserted (only `combo.ts` writes `multiplier`).
