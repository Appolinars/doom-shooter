---
status: Living
updated_at: "2026-07-12"
---

# Domain Context — survival-loop

<!--
Feature-scoped glossary for survival-loop. The shared gameplay glossary lives in
docs/features/basic-shooting-range/CONTEXT.md (demon, round, miss, score, path, depth/z,
fire intent, spawn point, wave) and docs/features/game-feel/CONTEXT.md (juice, viewmodel,
pump, HP [demon], hurt state, death animation, backdrop, retry). Below are ONLY the new
domain words this feature introduces. Domain words + boundaries only, no implementation.

NOTE: this feature AMENDS two base-glossary boundaries once implemented:
- score: gains a combo multiplier (base said "NOT combo/multiplier") — base entry to be
  updated at PRD stage.
- round: gains a lose condition / player death end (base said "NOT a game with a lose
  condition") — base entry to be updated at PRD stage.
-->

## Glossary

<!-- term · 1-sentence canonical definition · 1-sentence boundary (what it is NOT). -->
- game mode — the player-chosen ruleset for a run: Endless or Survive-60s. NOT difficulty setting (a mode changes the end condition and wave source, not a slider on the same rules).
- endless mode — the mode where escalating waves continue until the player dies; longer survival = higher wave number. NOT infinite content (escalation is generated from the same demon roster, not new levels).
- survive-60s mode — the mode where the player must live through 60 seconds of heavy waves; surviving is the win. NOT the old base-game round (the timer is a win condition here, not a neutral end).
- player HP — the player's hit points; each demon that completes its path (or a fireball that lands) removes some. NOT demon HP (game-feel term: demons' shot-durability is a separate concept).
- player hit — the moment a demon reaching the end of its path (or an unblocked fireball) damages the player, with strong screen feedback. NOT a miss (the base "miss" statistic is superseded by damage in this feature).
- game over — the run-ending state reached when player HP hits zero, showing final score, stats, and rank. NOT round end by timer (survive-60s ends in a win screen, not game over).
- run — one attempt at a mode, from start (or retry) to game over / win. NOT session (a session may contain many runs across modes).
- wave — a numbered group of scheduled demons within a run; wave N+1 is denser/faster/tougher than wave N. AMENDS the base term (was: a group within a single fixed round; now: generated, numbered, escalating).
- combo multiplier — a score multiplier that grows with consecutive kills and resets on a combo break. NOT rhythm/timing-based (it counts kills, never pump-timing quality — rejected in ideation).
- far-kill bonus — extra points for killing a demon while it is still far away (deep in the scene). NOT a different weapon mechanic (same shot, distance-scaled reward).
- rank — the letter grade (D to S) summarizing a run on the end screen, derived from score/stats. NOT the record (rank grades one run; the record compares runs).
- best score / record — the highest score per mode, kept in the player's browser between sessions; beating it shows "NEW RECORD!". NOT a leaderboard (personal, per-browser, never shared or uploaded).
- start screen — the pre-run screen where the player picks a mode (and arms audio with the first click). NOT a pause menu (pause interrupts a run; the start screen precedes one).
- fireball — a projectile thrown by a shooter demon that damages the player unless shot down mid-flight. NOT a demon (it is shootable but has no path-walking, score value, or HP tiers).
- zigzag path — a path whose waypoints weave laterally while still advancing toward the player. NOT AI (still fixed waypoint data, never computed at runtime).
