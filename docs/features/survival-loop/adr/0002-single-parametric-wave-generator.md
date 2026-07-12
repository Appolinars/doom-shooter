---
status: Accepted
owner: "Maksym Vakulenko"
reviewers: ["Tech Lead"]
updated_at: "2026-07-12"
feature_size: M
stage: "04-05"
ticket: "N/A (personal pet-project)"
---

# 0002 — Use a single parametric wave generator for both modes

- **Status:** Accepted
- **Date:** 2026-07-12
- **Deciders:** Maksym Vakulenko (Architect) + Claude (Socratic walk)

## Context

The base game drains a static `WAVE_SCHEDULE` (12 sorted spawn slots, `config.ts`) with a monotonic cursor — finite and non-looping. Endless mode needs unbounded, escalating waves; Survive-60s needs 60 seconds of heavy pressure. PRD §8 pre-committed a default: one wave source to maintain, the generator pinned at high intensity for Survive-60s.

## Decision drivers

- QG-1 Determinism: wave generation must derive from run progress on the fixed step, never wall-clock (PRD §1, §6 NFR).
- QG-2: the ≤ 32 live-entity cap must hold at any wave — the generator is where the cap is enforced at the source.
- §2 Organisational: 3-evening tuning budget — one code path halves the tuning surface.
- AC-03: wave N+1 must be verifiably harder than wave N (denser, faster, or tougher).

## Considered options

1. **Single parametric generator** — pure function `(waveNumber, modeParams) → wave spec`, called on the fixed step when the current wave is exhausted; endless escalates the params, survive60 pins them high.
2. **Generator for endless + a hand-written fixed schedule for survive60** — keep a curated 60-second schedule beside the generator.

## Decision outcome

**Chosen:** Option 1. One code path means one determinism test, one entity-cap proof, and no double maintenance; it also matches the PRD §8 default. Option 2 buys hand-tuned survive60 pacing at the cost of a second wave source whose determinism and cap must be proven separately — rejected under the tuning budget.

## Consequences

**Positive**
- The 60↔144 Hz drift test and the cap stress test cover both modes in one run each.
- `WAVE_SCHEDULE` and its cursor retire — spawn logic has a single successor.

**Negative**
- Survive-60s balance is coupled to the endless formulas — re-tuning one mode independently means touching shared parameters.

**Neutral**
- The escalation curve shape (linear/stepped/exponential) stays a tuning decision inside `modeParams` — tracked as a §11 risk with the 3-evening budget.

## Links

- PRD: [[../PRD.md]] US-03, US-10; AC-03, AC-13; §8 open question 5 (closed here)
- SAD: [[../sad.md]] §4 pillar 2
- Related ADR: [[0001-extend-round-into-mode-aware-run-state]]
