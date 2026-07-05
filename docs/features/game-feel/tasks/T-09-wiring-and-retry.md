---
id: T-09
epic: game-feel
project: doom-shooter
wave: 4
priority: P1
estimate: M
blocks: [T-10]
blocked_by: [T-02, T-05, T-08]
status: todo
context_budget: 5000
created: 2026-07-06
owner: Maksym Vakulenko
---

# T-09 — Wiring in main.ts + retry

## Goal

Integrate the layers in `src/main.ts` (SAD §5 `main.ts ◐`): arm audio on the first user gesture (T-04); on each game event trigger the paired SFX (T-05) **and** feed the effects store (T-06) — shoot/pump/reload/spawn/hurt/death, closing the 6/6 action→feedback KPI; add a **"try again"** button on the ended round that calls `createInitialGameState()`, rerolls a random backdrop (T-07), and clears the effects store (T-06) so no demon/score/weapon/effect state leaks (AC-10); prune splats each frame. This is the one story that crosses all layers — its event→(SFX + FX) contract is the integration surface T-10 verifies.

## Linked artifacts

- [[../PRD.md]] AC-01/AC-04/AC-05 (each action's SFX + visual), AC-07 (arm audio on first gesture), AC-10 (retry resets score + round + rerolls backdrop, no leak), AC-09 (retry mid-animation clears cleanly).
- [[../sad.md]] §6 Critical flow 1 (fire → SFX + splat + viewmodel), flow 2 (death), **flow 3 (try again → `createInitialGameState` + reroll backdrop + clear effects)**, §5 (`main.ts ◐ arm audio; wire effects; retry; prune splats`).
- [[../adr/0003-web-audio-graph-armed-on-first-gesture.md]] (gesture listener), [[../adr/0004-juice-animation-state-on-render-layer.md]] (effects fed from events, cleared on retry).

## Acceptance criteria

**AC-T09-1 (6/6 action feedback, PRD KPI/AC-01/04/05)**
Given the wired loop
When each of shoot / pump / reload / spawn / hurt / death occurs
Then the matching `play(key)` fires **and** the matching effect is spawned — 6 of 6 actions paired.

**AC-T09-2 (arm on first gesture, PRD AC-07)**
Given the page just loaded
When the player's first gesture fires and then they shoot
Then audio is armed on that gesture so the shot is audible; no pre-gesture error.

**AC-T09-3 (retry, PRD AC-10)**
Given an ended round with a final score shown
When the player clicks "try again"
Then score resets to 0, the round is rebuilt via `createInitialGameState()`, a fresh backdrop is rerolled, the effects store is cleared, and nothing leaks from the prior round.

**AC-T09-4 (retry mid-animation, PRD AC-09)**
Given death visuals are still animating at round end
When the player retries
Then the effects store is cleared and the new round starts clean — no finalized-score mutation, no leftover visual.

## Atomic checklist

- [ ] Step 1: register the first-gesture listener → `armOnFirstGesture()` (T-04); ensure it only arms once.
- [ ] Step 2: event → SFX map — call `play(key)` for shoot/pump/reload/spawn/hurt/death at the right emit points (fire path, spawn path, hit/kill path from T-02).
- [ ] Step 3: event → effects — `spawnSplat` on hit, `spawnDeath` on kill, `onFire` for the viewmodel; `advance(dt)` + `pruneExpired()` each frame.
- [ ] Step 4: "try again" button on round-end → `createInitialGameState()` + `backdrops.pickRandom()` + `effects.clear()`.
- [ ] Step 5: integration test/harness — 6/6 event→(SFX+FX) fire; retry leaves zero leaked state (score 0, no demons, fresh backdrop, empty effects store).

## Edge cases

| Case | Expected |
|---|---|
| First gesture is the same click that fires | arm then fire in the same handler; first shot audible |
| Retry clicked twice fast | idempotent — second click rebuilds again cleanly, no double listeners |

## DoD

- 6/6 action→(SFX + effect) wired; audio arms on first gesture; retry resets score + round + backdrop + effects with no leak; splats pruned each frame; integration harness green.
