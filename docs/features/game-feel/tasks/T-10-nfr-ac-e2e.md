---
id: T-10
epic: game-feel
project: doom-shooter
wave: 4
priority: P1
estimate: M
blocks: []
blocked_by: [T-09]
status: done
context_budget: 5000
created: 2026-07-06
owner: Maksym Vakulenko
---

# T-10 — NFR + AC walkthrough / E2E

## Goal

Prove the feature meets its acceptance criteria and quality gates end-to-end on the wired build (T-09). Walk all 10 PRD AC and record the three QG numbers; **critically**, re-run the base determinism guardrails (drift ≤ 1% between 60↔144 Hz, aim ≤ 2 px across DPR/resize) **green with juice enabled** — the proof that pure juice added no fixed-step mutation. Since size **S** skips a separate test-plan/security-review, this story is the consolidated verification pass. Record actual numbers, not "looks fine".

## Linked artifacts

- [[../PRD.md]] §5 (AC-01…AC-10), §6 (all six NFR rows incl. latency ≤ 100 ms, ≥ 30 FPS p95, drift ≤ 1%, aim ≤ 2 px, voice cap, load ≤ 3 s), §7 (KPIs: 6/6 action-feedback coverage, feels-like-Doom self-rating).
- [[../sad.md]] §10 QG-1 (responsiveness ≤ 100 ms), QG-2 (determinism ≥ 30 FPS, 0 fixed-step mutations), QG-3 (fail-soft + voice overlap).
- Base guardrails re-run: [[../../basic-shooting-range/tasks/T-11-wiring-and-e2e.md]] (drift + aim + FPS tests this task re-runs with juice on).

## Acceptance criteria

**AC-T10-1 (all 10 AC walked)**
Given the wired build
Then each PRD AC-01…AC-10 has a green automated test or a recorded manual walkthrough result.

**AC-T10-2 (QG-1 latency ≤ 100 ms)**
Given a fire (and each of the 6 actions)
Then the event→(`play()` + first feedback frame) timestamp delta is ≤ 100 ms — recorded per action; 6/6 paired.

**AC-T10-3 (QG-2 determinism with juice)**
Given a stress wave with viewmodel + multiple concurrent death animations + backdrop
Then frame-time p95 ≤ 33.3 ms (≥ 30 FPS) via `createFrameTimer`; the base drift test (60↔144 Hz, ≤ 1%) and aim-mapping test (HiDPI + resize, ≤ 2 px) **re-run green with juice enabled**.

**AC-T10-4 (QG-3 fail-soft + overlap + load)**
Given assets missing and a burst of overlapping SFX
Then every action still resolves (placeholder/silence, AC-06), voices stay capped (no distortion), and the round is playable ≤ 3 s while assets still load.

## Atomic checklist

- [x] Step 1: AC matrix — map each AC-01…AC-10 to its test (unit/integration/E2E) or a recorded manual result; fill gaps. → [T-10-results.md](./T-10-results.md) §1, 10/10 automated.
- [x] Step 2: latency probe — timestamp event→(SFX + frame) for all 6 actions; record numbers (QG-1). → `game-feel.spec.ts` QG-1; worst case 17.1 ms.
- [x] Step 3: stress-wave FPS — `createFrameTimer` p95 under viewmodel + concurrent deaths + backdrop; record (QG-2). → 60 FPS, p95 18 ms.
- [x] Step 4: re-run base drift + aim-mapping tests **with juice enabled**; confirm green (the 0-mutation proof). → `determinism-juice.test.ts`: juice-on/off GameState deep-equal, drift ≤ 1%, aim exact.
- [x] Step 5: fail-soft E2E — run with assets removed (silence + placeholders + black backdrop, no crash); voice-cap audit under a burst; load-≤3s check. → QG-3 green; load 150 ms; voice cap audited at unit level.
- [x] Step 6: record all numbers in the story / a short results note; update `tracker.md`. → [T-10-results.md](./T-10-results.md).

## Edge cases

| Case | Expected |
|---|---|
| Drift or aim test regresses with juice on | **blocker** — some juice path mutated the fixed step; bounce to the offending story (only T-01/T-02/T-03 may touch it) |
| FPS p95 > 33.3 ms under stress | profile; the likely culprit is unbounded splats/voices — tighten prune/cap, re-measure |

## DoD

- 10/10 AC covered; QG-1/2/3 numbers recorded; base drift + aim tests green **with juice enabled**; fail-soft + voice-cap + load-≤3s verified; results noted and tracker updated. Feature ready for the ship stage.
