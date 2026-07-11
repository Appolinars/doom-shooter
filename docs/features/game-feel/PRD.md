---
status: Draft
owner: "Maksym Vakulenko"
reviewers: ["Tech Lead"]
updated_at: "2026-07-05"
feature_size: S                  # set by sdlc:classify-size
stage: "03"
ticket: "N/A (personal pet-project)"
---

# PRD — game-feel

> **Inputs (required):** [idea-brief](./idea-brief.md) · [CONTEXT](./CONTEXT.md)
> **Reference module:** N/A — this feature extends the same repo's shipped `basic-shooting-range` game (`src/`), not an external module.
> **External context channels used:** Base game source (`src/core/state.ts`, `src/systems/weapon.ts`, `src/systems/hit.ts`, `src/assets/sprites.ts`, `src/render/canvas2d.ts`, `src/systems/round.ts`) + base game docs (`docs/features/basic-shooting-range/PRD.md`, `sad.md`, `data-model.md`) — used as traceability context for §1 and to reuse the fail-soft asset pattern and the fixed-step/render split.

## 1. Context

The `basic-shooting-range` MVP is mechanically complete and passes all its tests, but it reads as a tech demo, not a game: demons are drawn shapes on a black screen, the shotgun is invisible, every action is silent, kills are instant with no consequence shown, and a finished round is a dead-end score with no way to replay (idea-brief §2). The single most important emotional goal of the whole project — "feel like Doom" — is entirely unmet. This feature adds a juice/atmosphere layer on top of the working mechanics so the game becomes something the author (and a demo viewer) actually want to keep playing. Primary user: the author, as player and as the person publishing a demo to itch.io / GitHub Pages; secondary: casual viewers who click the published link and play a round or two (idea-brief §3).

Why now: the base game just reached a playable, tested, pushed state (all 11 stories merged, 90 unit + 5 E2E green). The mechanics are stable enough to decorate without fighting a moving target, and the "feel like Doom" pull was explicitly parked for exactly this increment (idea-brief §4).

Accepted vector: **Approach C — Structured additive feel-layer** (idea-brief §13). Deliver the confirmed items as fail-soft, additive modules — audio, feedback effects, a random backdrop, a weapon viewmodel driven by weapon state, demon sprites selected by HP — with HP tiers added as a bounded, config-driven extension of the demon model. Locked-in pointer from idea-brief §13: HP is a per-demon durability field (1/2/4), each shot removes 1 and scores on reaching 0; every author-supplied asset is optional and fail-soft; and "try again" resets score + round and rerolls the backdrop.

Traceability context from the base game code and its author's decisions during this stage:
- The demon entity (`src/entities/demon.ts`) has **no HP field today** — a hit removes the demon immediately and scores (`src/systems/hit.ts`). This feature adds a single `hp` field plus a "remove 1, score on 0" damage step; the front-most-by-`z` hit resolution (ADR-0001) is preserved.
- The engine runs a **deterministic fixed step decoupled from render** (ADR-0002). All *pure* juice (muzzle-in-sprite firing frame, hit splats, death animation, backdrop) is computed on the render layer and never mutates the fixed step or the crosshair→world aim mapping.
- **Author decision (this stage): the between-shots pump gates fire rate, and the magazine-reload mechanic is removed.** *(Amended 2026-07-11 during asset collection.)* The shotgun now has **unlimited ammo and no reload**; the pump between shots is the **only** weapon gate. Unlike the other effects, the pump is *not* presentation-only — while pumping, a fire attempt is blocked (input-gate pattern: shot dropped, no state corruption). Its timer lives on the fixed step (never wall-clock); only its sprite is render-side. This supersedes the earlier "pump mirrors the reload gate" framing: with reload gone, pump is the sole fixed-step weapon gate. Deliberate, author-confirmed gameplay change beyond idea-brief §5's "no new logic beyond HP". **Ripple:** the base game's `SHELL_CAPACITY`/`RELOAD_DURATION_MS`/`Weapon.status: 'reloading'` (shipped in `basic-shooting-range`) are to be removed when game-feel is implemented — not yet done in code.
- The engine already ships a **fail-soft sprite loader** (`src/assets/sprites.ts`): `atlas.get` returns `null` for an unloaded key and the renderer falls back to a placeholder, so a missing asset never crashes a round. Every new asset kind (audio, backdrops, gun + per-HP demon sprites) reuses this pattern.

## 2. Goals

- Every player action — shoot, pump, spawn, hurt, death, retry — has visible and audible feedback within a sub-100ms window, turning the silent tech demo into something that reads as Doom (idea-brief §13, §7 Approach C).
- Kills show consequence: demons carry shot-durability (HP 1/2/4), bleed while damaged, and play a short death animation on the killing shot — while the flat, non-decreasing score invariant stays intact (idea-brief §13 locked-in pointer).
- A finished round is replayable in one click against a fresh random Doom backdrop, and every author-supplied asset is optional and fail-soft so a missing file degrades to placeholder/silence, never crashes (idea-brief §13).

## 3. Non-goals

- N1: No player movement or map traversal — backdrops are pure decoration with no gameplay geometry (idea-brief §5).
- N2: No networking, multiplayer, accounts, or server-side leaderboard (idea-brief §5).
- N3: No lose condition / game-over ("demon reaches player") — still parked from the base game (idea-brief §5).
- N4: No score or settings persistence across reloads — a reload resets everything (idea-brief §5, `.claude/rules/migrations.md`).
- N5: No full 3D, vertical aiming, or physics engine (idea-brief §5).
- N6: No procedurally generated or in-app-authored art/audio — all assets are author-supplied files; this feature only wires and sequences them (idea-brief §5).
- N7: No new demon movement patterns or spawn logic beyond what HP tiers require (idea-brief §5).
- N8: No screen shake and no mute/volume control in this increment — dropped during this stage to keep the effect surface minimal; the pump/firing sprite and muzzle-in-sprite flash carry the on-fire feel instead (author decision, this stage).

## 4. User stories

### US-01: See and hear the shot

**As a** player
**I want** the shotgun to visibly fire and sound off when I shoot
**So that** firing feels physical instead of silent and invisible.

### US-02: Feel the pump

**As a** player
**I want** a short pump between shots that briefly gates the next shot, with its own animation and sound
**So that** the weapon has rhythm and weight rather than instant infinite spam.

> *Amended 2026-07-11: the magazine reload was dropped — unlimited ammo, the pump is the only weapon gate.*

### US-03: Wear demons down

**As a** player
**I want** demons to take one, two, or four shots (each shot removing one hit point)
**So that** tougher demons feel tougher and shots have accumulating consequence.

### US-04: See a demon hurt, then die

**As a** player
**I want** a damaged demon to bleed while it still has hit points and to play a short death animation on the killing shot before it disappears
**So that** I can read the consequence of my shots.

### US-05: Hear the field come alive

**As a** player
**I want** demons to make a sound when they spawn and when they die
**So that** the range feels alive and threatening.

### US-06: Play against a Doom backdrop

**As a** player
**I want** a random atmospheric backdrop behind the gameplay each round
**So that** the scene feels like Doom instead of a black screen.

### US-07: Try again

**As a** player
**I want** to restart a finished round in one click
**So that** I can immediately play again with a fresh score, round, and backdrop.

## 5. Acceptance criteria

### AC-01 (US-01) — happy path

**Given** the shotgun is ready and the crosshair is over a live demon
**When** the player fires
**Then** the system plays the shot sound, runs the viewmodel firing→pump→idle sequence, and shows a hit splat at the impact point, all within the feedback window.

### AC-02 (US-02) — domain invariant / input gating

**Given** the shotgun is mid-pump
**When** the player attempts to fire
**Then** the system blocks the shot (drops the fire attempt with no state change) and the player sees the weapon is not ready.

### AC-03 (US-03) — domain invariant

**Given** a live demon with more than one hit point remaining
**When** the player lands a shot on it
**Then** the system removes exactly one hit point, leaves the demon alive in a hurt state, and does not change the round score — the score increases only when the demon's last hit point is removed.

### AC-04 (US-04) — happy path

**Given** a live demon with exactly one hit point remaining
**When** the player lands the killing shot
**Then** the system plays that demon's death animation and death sound, despawns it after the animation, and adds its type's point value exactly once.

### AC-05 (US-05) — happy path

**Given** a round is in progress and a scheduled demon reaches its spawn time
**When** the demon appears on the field
**Then** the system plays that demon's spawn sound as it enters (and its death sound when later killed, per AC-04).

### AC-06 (US-06) — error / fail-soft

**Given** an author-supplied asset (a sound, a demon or weapon sprite, or a backdrop) is missing or fails to load
**When** the action that would use it occurs
**Then** the system still resolves the action — falling back to silence or a placeholder — and never crashes the round.

### AC-07 (US-01) — authorization / gating

**Given** the page has just loaded and the player has not yet interacted
**When** the player makes their first gesture and then fires
**Then** the system arms audio on that first gesture so the shot is audible, and every pure-juice effect (firing sprite, hit splat, death animation, backdrop) is computed on the render layer only and never shifts the crosshair→world aim mapping or the deterministic fixed step.

### AC-08 (US-03) — domain invariant

**Given** a demon that has taken damage but still has hit points (in its hurt state) reaches the end of its path un-killed
**When** it leaves the field
**Then** the system records a normal miss, adds no score, and its hurt state changes neither the miss count nor the score.

### AC-09 (US-04) — cross-context / concurrent edge

**Given** a demon's death animation is still playing at the moment the round's end condition triggers
**When** the round ends and freezes
**Then** the system freezes cleanly — resolving or holding the animation — without mutating the finalized score.

### AC-10 (US-07) — happy path

**Given** a round has ended and its final score is shown
**When** the player chooses "try again"
**Then** the system resets the score to zero, rebuilds a fresh round, and rerolls a new random backdrop, with no demon, score, or weapon state leaked from the prior round.

> Note on the authorization coverage type: a single-player, client-side game has no permission model (no server, no accounts). AC-07 is the closest business-observable analog — it gates audio at the browser's first-gesture boundary and gates juice at the render/fixed-step boundary. This mirrors the base game's AC-07 adaptation of the template's authorization type for a single-player context.

## 6. Non-functional requirements

| Aspect | Target | Measurement |
|---|---|---|
| Action→feedback latency | ≤ 100 ms from action to visible + audible feedback | in-engine timestamp delta (fire event → sound trigger + firing frame) |
| Frame rate with juice under a wave | ≥ 30 FPS (frame-time p95 ≤ 33.3 ms) with viewmodel + multiple concurrent death animations + backdrop active | rAF frame-time in profiler (existing `createFrameTimer`) |
| Determinism preserved | timing drift ≤ 1% between 60↔144 Hz — juice adds 0 mutations to the fixed step | existing elapsed-time test on two refresh rates (unchanged from base) |
| Aim independence | crosshair→world error unchanged (≤ 2 px across DPR/resize) with all render-layer effects active | mapping test on HiDPI + resize with juice enabled |
| Audio overlap safety | concurrent voices capped (voice pool) so overlapping deaths + rapid fire never distort | cap constant + audit under a stress wave |
| Initial load with assets | round playable ≤ 3 s on broadband even while backdrops/sprites/audio load fail-soft | Performance timing / Lighthouse |

## 6.1 Security / privacy

- **Data classification:** public — client-side game, no accounts, all state ephemeral in the browser.
- **Personal data touched:** none — no PII, no accounts, no analytics in MVP.
- **AuthZ/AuthN impact:** none — no server, no auth boundary; fully client-side. The only "gating" surfaces are input focus/scope (inherited from base AC-07) and the browser audio first-gesture policy (AC-07).
- **Abuse cases:**
  - Asset licensing: publish only license-clean author-supplied assets (sounds, sprites, backdrops) to avoid a takedown once the demo is released.
  - Missing/corrupt asset: handled by fail-soft loading (AC-05), not a security issue but a robustness one — a bad file degrades, never crashes.
  - No network surface: SSRF / injection / server-side spam are not applicable (nothing is sent to a server).
- **Security review:** N/A — client-side, no PII, no auth boundary, no server. Revisit if a server-side leaderboard is ever added.

## 7. Metrics / KPIs

- **"Feels like Doom" self-rating** — baseline: 2/5 (silent tech demo, current base game), target: ≥ 4.5/5 after the feel layer (idea-brief §7 Approach C outcome metric).
- **Action-feedback coverage** — baseline: 0 of 5 actions have paired audio + visual feedback, target: 5/5 actions (shoot, pump, spawn, hurt, death) each with feedback within the sub-100ms window (idea-brief §13).
- **Sustained FPS with juice** — baseline: ≥ 30 FPS (base game), target: ≥ 30 FPS for ≥ 95% of session time with viewmodel, HP demons, death animations, and a backdrop active.

## 8. Open questions

- [x] **RESOLVED (2026-07-11) → [assets-manifest.md](./assets-manifest.md).** Exact asset list: SFX `shoot/pump/spawn/death/hurt` (5, reload dropped), viewmodel `idle/fire/pump-1/pump-2/flash`, per-type demon full/hurt/death frames (all sourced from Freedoom, BSD-3), ≥ 2 backdrops. — owner: Maksym
- [ ] HP-tier balance — point values and spawn mix for 1/2/4-HP demons? Default now: extend the two existing types (fast=1 HP, brute=2 HP) and add one 4-HP type; point values tuned in implementation. — owner: Maksym, due: during implementation (tuning debt)
- [ ] Is the bleeding/hurt sprite one shared frame or per-HP-step frames? Default now: one shared hurt frame per demon type. — owner: Maksym, due: architecture gate
- [ ] Pump duration (`PUMP_DURATION_MS`) that gates fire rate — how short? Default now: ~350 ms, tuned so rapid fire still feels responsive but the pump reads. — owner: Maksym, due: architecture gate

## Related

- [idea-brief.md](./idea-brief.md) — stage 01 idea brief (Approach C, RICE 2.4, Confirmed).
- [CONTEXT.md](./CONTEXT.md) — new domain glossary (juice, viewmodel, pump, HP, hurt, death animation, backdrop, retry).
- Base feature: [docs/features/basic-shooting-range/](../basic-shooting-range/) (PRD, sad.md, data-model.md, tasks/).
- Next stage: `sdlc:classify-size game-feel`, then `sdlc:architecture-design game-feel` (gate 04-05).
