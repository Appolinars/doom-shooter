---
status: Approved
owner: "Maksim Vakulenko"
reviewers: ["Tech Lead", "Security Lead"]
updated_at: "2026-07-01"
feature_size:                    # set by sdlc:classify-size, not here
stage: "03"
ticket: "N/A (personal pet-project)"
---

# PRD — basic-shooting-range

> **Inputs (required):** [idea-brief](./idea-brief.md) · [CONTEXT](./CONTEXT.md)
> **Reference module:** N/A — green-field mode
> **External context channels used:** None — only CONTEXT + idea-brief

## 1. Context

A client-side browser Doom-style shooting gallery: the player is stationary, aims with the mouse, and fires a shotgun with a reload delay at demons that advance along fixed movement patterns; a round ends with a total score. This addresses the gap that there is no finished playable artifact on which to both practice the SDLC process and learn retro depth-rendering (idea-brief §2 Problem). Primary users: the author-as-player (wants a genuinely fun mini-game) and the author-as-learner (needs an end-to-end SDLC artifact); the public (≈10-20 players/quarter) is a secondary segment after release (idea-brief §3).

Why now: the author is going through an SDLC course and needs a concrete project to run the pipeline end-to-end (ideation → PRD → architecture → tasks → implementation). There is no deadline, but the course sets a natural window (idea-brief §2 «Why now»).

Accepted vector: **Approach C — Layered 2.5D Shooting Gallery** (idea-brief §13). Ship a playable stationary-shotgun round on flat 2D first, then layer sprite scaling and a backdrop so demons «approach» from depth. Locked-in pointer from idea-brief §13: from stage 1 the demon data model carries a depth/`z` field (driving scale, screen position, draw order, hit priority) so the sprite-scaling layer is additive, not a rewrite.

## 2. Goals

- Player plays a full self-contained round in the browser without install — aim, shoot demons with a reload-gated shotgun, and get a final score (idea-brief §13).
- The round feels like Doom via staged depth — the demon carries a depth value from the start so the sprite-scaling layer is additive, not a rewrite (idea-brief §13 locked-in pointer).
- The project stands as an end-to-end SDLC artifact: a playable core shippable before any depth polish, degrading safely to a flat demo in the worst case (idea-brief §13).

## 3. Non-goals

- N1: No player movement across a map — the player is stationary, aiming only (idea-brief §6).
- N2: No multiplayer / networking / server side — fully client-side (idea-brief §6).
- N3: No multiple levels/locations or between-round progression (idea-brief §6).
- N4: No combo/multiplier on top of score — score stays a flat number (idea-brief §6).
- N5: No full 3D engine with real wall geometry or vertical aiming (idea-brief §6).
- N6: Public release is not an MVP goal — publishing is secondary after the playable core (idea-brief §6).
- N7: No saved scoreboard / leaderboard / score persistence in MVP — a round shows its score and does not store it between sessions (added during Socratic validation when US-04 was narrowed away from «compare runs»).

## 4. User stories

### US-01: Fire the shotgun

**As a** player
**I want** to aim with the mouse and fire at a demon
**So that** I kill it with immediate feedback.

### US-02: Reload the shotgun

**As a** player
**I want** the shotgun to reload after its shells are spent
**So that** firing has rhythm and weight, not infinite spam.

### US-03: Score a kill

**As a** player
**I want** each killed demon to add points by its type
**So that** skilful play yields a higher score.

### US-04: See the round result

**As a** player
**I want** the round to end and show my total score
**So that** I have a clear goal and see my final score for this round.

### US-05: Face patterned demons

**As a** player
**I want** demons to appear at spawn points and move along fixed paths with depth
**So that** the wave is readable and threatening.

### US-06: Miss when a demon escapes

**As a** player
**I want** a demon that completes its path un-killed to count as a miss
**So that** the round has stakes.

## 5. Acceptance criteria

### AC-01 (US-01) — happy path

**Given** the shotgun has at least one loaded shell and the crosshair is over a live demon
**When** the player fires
**Then** the system registers a hit on that demon, removes it, and shows hit feedback.

### AC-02 (US-02) — error / validation

**Given** the shotgun is mid-reload
**When** the player attempts to fire
**Then** the system blocks the shot, consumes no shell, and the player sees the weapon is not ready.

### AC-03 (US-03) — domain invariant

**Given** a round is in progress
**When** the player kills a demon
**Then** the round score increases by exactly that demon type's point value and stays a flat, non-decreasing total (no multipliers).

### AC-04 (US-04) — happy path

**Given** the round's end condition is reached
**When** the round ends
**Then** the system freezes gameplay and shows the final total score for that round.

### AC-04b (US-04) — happy / concurrent edge

**Given** a live demon is killed by a shot at the exact moment the round's end condition triggers
**When** the round ends
**Then** the system includes that final kill in the round's total before freezing and shows the finalized score.

### AC-05 (US-06) — domain invariant

**Given** a live demon reaches the end of its path un-killed
**When** it leaves the field
**Then** the system despawns it and records a miss for the round.

### AC-06 (US-05) — cross-context

**Given** two demons overlap under the crosshair at different depths
**When** the player fires
**Then** the system resolves the hit to the nearest (front-most by depth) demon only.

### AC-07 (US-01) — authorization (input-gating)

**Given** the browser tab has lost focus or the pointer is outside the play area
**When** a click occurs
**Then** the system does not fire the shotgun or consume a shell.

> Note on the authorization coverage type: a single-player, client-side game has no permission model (no server, no accounts). AC-07 is the closest business-observable analog — it gates input at the boundary of the play surface (focus / pointer scope). This is a deliberate adaptation of the template's authorization coverage type for a single-player context.

## 6. Non-functional requirements

| Aspect | Target | Measurement |
|---|---|---|
| Frame rate under a wave | ≥ 30 FPS (frame-time p95 ≤ 33.3 ms) | rAF frame-time in profiler |
| Input→shot latency | ≤ 50 ms from click to hit resolution | in-engine timestamp delta |
| Frame-rate independence | timing drift ≤ 1% between 60↔144 Hz | elapsed-time test on two refresh rates |
| Aim accuracy | crosshair→world error ≤ 2 px across DPR/resize | mapping test on HiDPI + resize |
| Initial load | ≤ 3 s on broadband | Lighthouse / Performance timing |

## 6.1 Security / privacy

- **Data classification:** public — client-side game, no accounts, all state is ephemeral in the browser.
- **Personal data touched:** none — no PII, no accounts, no analytics collecting personal data in MVP.
- **AuthZ/AuthN impact:** none — no server, no auth boundary; fully client-side.
- **Abuse cases:**
  - Score tampering via devtools: accepted — no server leaderboard in MVP, so there is no score-integrity requirement.
  - Asset licensing: publish only license-clean sprites to avoid a takedown once the demo is released.
  - No network surface: SSRF / injection / server-side spam are not applicable (nothing is sent to a server).
- **Security review:** N/A — client-side, no PII, no auth boundary, no server. Revisit if a server-side leaderboard is added later.

## 7. Metrics / KPIs

- **«Feels like Doom» self-rating** — baseline: 2/5 (flat targets), target: 4/5 after the depth layer (idea-brief §7 Approach C).
- **Time-to-first-playable-round** — baseline: no demo, target: a clickable, scoreable round within ≤ 2 evenings (idea-brief §7).
- **Sustained FPS in the field** — baseline: 0, target: ≥ 30 FPS on mid-range hardware for ≥ 95% of session time.

## 8. Open questions

- [ ] What exactly ends a round and is there a lose condition (timer / all demons resolved / a demon reaches the player)? Default now: a round ends when all demons of the wave are resolved (killed or escaped) OR a fixed timer expires; escapes count as misses; no hard game-over in MVP. — owner: Maksim, due: architecture gate
- [ ] Source of demon sprites (license-clean assets vs own pixel art), given publishing? Default now: own pixel art (license-clean). — owner: Maksim, due: before implementation
- [ ] How many demon types and their point contribution for the MVP round? Default now: 2 types (fast/low-point, slow/high-point). — owner: Maksim, due: architecture gate
- [ ] Rendering technology (flat-2D vs pseudo-3D sprite scaling) and its concrete implementation? — owner: Maksim, due: architecture gate

## Related

- [idea-brief.md](./idea-brief.md) — stage 01 idea brief (Approach C, RICE 6, Confirmed).
- [CONTEXT.md](./CONTEXT.md) — domain glossary (demon, wave, spawn point, reload, score).
- Next stage: `sdlc:architecture-design basic-shooting-range` (gate 04-05).
