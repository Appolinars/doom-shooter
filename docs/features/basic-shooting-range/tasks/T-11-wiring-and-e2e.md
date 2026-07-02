---
id: T-11
epic: basic-shooting-range
project: doom-shooter
wave: 5
priority: P1
estimate: M
blocks: []
blocked_by: [T-04, T-08, T-09, T-10]
status: todo
context_budget: 4500
created: 2026-07-02
owner: Maksim Vakulenko
---

# T-11 — Wiring, playable round & NFR verification (E2E)

## Goal

`src/main.ts` wires all modules per the SAD §5 topology into one playable round: aim → fire → reload → score → round end. Then verify every PRD AC manually and every §6 NFR with measurements. This is the "clickable, scoreable round" KPI gate.

## Linked artifacts

- [[../sad.md]] §5 (module wiring/topology), §6 (all six flows — the E2E walkthrough script), §10 (quality scenarios with verify methods).
- [[../PRD.md]] §5 AC-01…AC-07 (manual walkthrough checklist), §6 NFR table (FPS, latency ≤ 50 ms, drift ≤ 1%, aim ≤ 2 px, load ≤ 3 s), §7 KPI (playable round).
- [[../data-model.md]] — **data delta: none; this task fixes the per-step system order over `GameState`**: input drain → weapon → hit/score → spawn → round end-check (the Flow 4 / AC-04b ordering).

## Acceptance criteria

**AC-T11-1 (playable round)**
Given a fresh page load
When the player plays a full round
Then every PRD AC-01…AC-07 is observable per the §6 flow walkthrough, and the round ends with a final score screen.

**AC-T11-2 (NFR evidence)**
Given a scripted wave harness and profiler run
When measurements are taken per SAD §10 verify methods
Then FPS ≥ 30 under ~30 demons, input→hit ≤ 50 ms, 60↔144 Hz drift ≤ 1%, aim error ≤ 2 px, initial load ≤ 3 s — recorded in the PR description.

## Atomic checklist

- [ ] Step 1: wire modules in `main.ts`; fix the per-step system order (AC-04b contract).
- [ ] Step 2: scripted-wave harness (deterministic schedule) for perf + walkthrough runs.
- [ ] Step 3: NFR measurement pass — record numbers against each PRD §6 row.
- [ ] Step 4: manual AC-01…AC-07 walkthrough; fix small integration gaps found.
- [ ] Step 5: README play instructions + build/publish note (static host).

## Edge cases

| Case | Expected |
|---|---|
| Refresh mid-round | clean reset — all state ephemeral (PRD §6.1), no residue |
| Rapid clicking across reload boundary | AC-02 + Flow 5 behavior holds end-to-end |

## DoD

- All AC checked off with the walkthrough evidence; all five NFR numbers recorded and within target.
- KPI "time-to-first-playable-round" retro note added to [[../idea-brief.md]] context in the PR description.
