---
id: T-15
epic: survival-loop
project: doom-shooter
wave: 4
priority: P1
estimate: M (timebox 3 evenings)
blocks: [T-16]
blocked_by: [T-11, T-14]
status: todo
context_budget: 4000
created: 2026-07-13
owner: Maksym Vakulenko
---

# T-15 — Tuning timebox (3 evenings) + kill-criterion checkpoint

## Goal

The feature's High risk (SAD §11) gets its budgeted, recorded resolution. Within a **hard timebox of 3 tuning evenings** (SAD §2 organisational constraint): tune the real values of `MODE_PARAMS` (escalation curve — the shape decision deferred since §4), `COMBO_TABLE`, `RANK_TABLE` (tuned once, per PRD §8), and `FIREBALL_PARAMS`, playing real runs (use the `run-game` skill / dev build). Values only — every change is a `config.ts` data edit; if tuning demands a logic change, that is a new task, not scope creep here.

**Kill-criterion checkpoint (PRD §8, idea-brief §10):** at the end of the timebox, record a decision in `T-15-results.md` — endless "want to replay" self-rating ≥ 4/5 ⇒ endless stays primary; otherwise **Survive-60s becomes the primary mode** (start-screen ordering/default flips — a one-line follow-up in config/main). Targets to observe: median first death in endless between 45–120 s, never before ~40 s (PRD §7); natural retries ≥ 3 per evening session.

## Linked artifacts

- [[../PRD.md]] §7 metrics (replay rating, first-death window, retries), §8 escalation-budget default.
- [[../sad.md]] §2 (3-evening budget), §11 (High-risk row + cap-flattens-difficulty row + rank-drift accepted debt).
- [[../data-model.md]] §TBDs (the tuning-values list this task closes).

## Acceptance criteria

**AC-T15-1 (values land as data)**
Given the timebox ends
Then tuned values are committed in `config.ts` only; unit suites stay green (fixtures use tiny tables per test-plan — real curves don't break tests).

**AC-T15-2 (checkpoint recorded)**
Given the 3rd evening closes
Then `T-15-results.md` records: the self-rating, observed first-death timings, retries count, the primary-mode decision, and — if the cap flattened late-wave difficulty — what speed/toughness escalation was applied (SAD §11 Medium row).

**AC-T15-3 (timebox is hard)**
Given endless is still not fun after evening 3
Then the fallback executes (Survive-60s primary) rather than extending the box — the decision is an artifact, not a feeling.

## Atomic checklist

- [ ] Evening 1: endless curve first pass (density/speed/toughness growth); first-death timing observations.
- [ ] Evening 2: combo/far-kill/rank feel; survive60 intensity; fireball fairness (telegraph/cooldown).
- [ ] Evening 3: cross-mode balance, cap-flattening check, final values; write `T-15-results.md` + checkpoint decision.
- [ ] Follow-through: if fallback fired — flip primary mode presentation (one-line) and note it in results.

## Edge cases

| Case | Expected |
|---|---|
| Tuning wants a mechanic change (e.g. combo decay timer) | out of scope — backlog note in results, not a config hack |
| Rank table feels wrong after wave tuning | accepted debt (SAD §11) — note in results for the follow-up re-tune |

## DoD

- Tuned values committed; all suites green; `T-15-results.md` with the recorded kill-criterion decision exists; timebox respected.
