---
id: T-04
epic: survival-loop
project: doom-shooter
wave: 1
priority: P1
estimate: M
blocks: [T-10]
blocked_by: [T-02, T-03]
status: todo
context_budget: 5000
created: 2026-07-13
owner: Maksym Vakulenko
---

# T-04 — Stage-1 presentation: HP HUD, wave number, player-hit feedback, game-over screen, retry

## Goal

Makes stage 1 playable end-to-end, **zero simulation mutations** (render + wiring + `main.ts` only, ADR-0005 pattern). Renderer: HP indicator, current wave number, a game-over screen off `outcome = 'gameOver'` (score + waves reached; rank/stats/record arrive in T-10). Wiring poll/diff: player hit → strong feedback (flash/shake via the effects store + player-hit SFX) within the ≤ 100 ms window. Retry: the existing restart extends to the new fields — one click starts a fresh run of the same mode (full HP, score 0, base combo, wave 1, no entity leak). The run still auto-starts (endless) — the start screen is T-09, so the existing E2E suite stays green.

## Linked artifacts

- [[../PRD.md]] AC-01 (feedback + HP indicator half), AC-04 (retry; record retention asserted later in T-11).
- [[../sad.md]] §6 Critical flow 1, §5 (`render/canvas2d.ts`, `wiring.ts`, `main.ts` deltas).
- [[../adr/0005-hybrid-canvas-screens-with-dom-controls.md]] — canvas visuals + DOM buttons by status.
- [[../test-plan.md]] AC-01 integration/E2E rows, AC-04 rows, retry edge cases.

## Acceptance criteria

**AC-T04-1 (feedback, PRD AC-01)**
Given a player hit lands on a fixed step
When the next rendered frame diffs state
Then wiring emits the player-hit SFX + flash/shake cue and the HUD shows the decreased HP — asserted at the wiring contract level (cue emitted once per hit).

**AC-T04-2 (game-over screen)**
Given `outcome = 'gameOver'`
Then the renderer draws the game-over screen (final score, waves reached) and gameplay visuals freeze — E2E smoke.

**AC-T04-3 (retry, PRD AC-04 core)**
Given the game-over screen
When retry is clicked once
Then a fresh run of the same mode starts: `playerHp = PLAYER_MAX_HP`, `score = 0`, combo base, `wave.number = 1`, `demons`/`shots`/`fireIntents` empty — integration test over the restart + E2E click-through.

## Atomic checklist

- [ ] Step 1: renderer — HP indicator + wave number HUD (reads state, no writes).
- [ ] Step 2: renderer — game-over screen branch off `run.status`/`outcome` (extends the round-result overlay pattern).
- [ ] Step 3: wiring — diff `playerHp` drop → SFX + effects-store flash/shake (reuse pooling patterns, SAD §11 GC row).
- [ ] Step 4: `main.ts` — retry button visibility by status; restart covers all new `Run`/`WaveState` fields.
- [ ] Step 5: tests — wiring cue emission, retry reset integration, E2E: demon through → HP drops; game over → retry → fresh run.

## Edge cases

| Case | Expected |
|---|---|
| Retry clicked twice rapidly / during end-screen fade | idempotent restart (existing idempotence extends to new fields) |
| Two player hits in one step (HP 2 → 0) | feedback cue per hit but exactly one game-over transition observed |

## DoD

- Stage 1 fully playable (endless: fight → lose HP → game over → retry); wiring/retry/E2E tests green; existing 8 E2E green; zero `systems/*` diffs.
