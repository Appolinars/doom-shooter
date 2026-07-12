---
status: Draft
owner: "Maksym Vakulenko"
reviewers: ["Tech Lead"]
updated_at: "2026-07-12"
feature_size: M                  # set by sdlc:classify-size
stage: "03"
ticket: "N/A (personal pet-project)"
---

# PRD — survival-loop

> **Inputs (required):** [idea-brief](./idea-brief.md) · [CONTEXT](./CONTEXT.md)
> **Reference module:** N/A — this feature extends the same repo's shipped game (`src/`), not an external module.
> **External context channels used:** Base game source (`src/core/state.ts`, `src/core/config.ts`, `src/systems/round.ts`, `src/systems/score.ts`, `src/systems/spawn.ts`, `src/systems/hit.ts`, `src/systems/weapon.ts`) + project docs (`docs/features/basic-shooting-range/PRD.md` + `CONTEXT.md`, `docs/features/game-feel/PRD.md` + `CONTEXT.md`) — traceability context for §1 and explicit tracking of the base-glossary invariants this feature amends.

## 1. Context

The game is mechanically complete and feels good (game-feel shipped 2026-07-12), but there is nothing to lose and nothing to aim for: an escaped demon is only a statistic, the score disappears on page reload, and the single scripted 60-second round plays identically every time (idea-brief §2). The author's "excitement / want to replay" self-rating sits at ~2/5 — the single biggest remaining gap between "polished tech demo" and "actual game". Primary user: the author-as-player, who wants a run he voluntarily replays on an evening whim; secondary: demo guests (~10-20/quarter after publishing) who click a portfolio link and should feel the "one more try" pull within 1-3 runs with zero onboarding; plus the author-as-learner, who needs the first M-sized feature to exercise the full SDLC pipeline (idea-brief §3).

Why now: game-feel just closed (all 13 tasks merged, QG green) — mechanics and juice are a stable base for stakes. Publishing was deliberately deferred until after this feature: no publishing a game with no stakes. The "no lose condition" debt, parked twice since the base feature, lands here (idea-brief §4).

Accepted vector: **Approach C — Survival Loop, Staged Ascent** (idea-brief §13). Ship the full confirmed vision in three stages, each ending green and playable: stage 1 = player HP + game over + endless escalating waves + retry; stage 2 = combo multiplier + far-kill bonus + stats/rank + persisted per-mode records + start screen with both modes (Endless / Survive-60s); stage 3 = fireball-throwing shooter demon + zigzag paths. Locked-in pointers from §13: the combo is a standard kill-streak multiplier (never rhythm/timing-gated); on-screen callouts and a "best moment" line are stolen from the rejected Approach B; records are per-mode and follow the pre-committed versioned browser-storage contract, fail-soft when unavailable; endless balance carries an explicit kill criterion (fixed tuning budget, fallback = Survive-60s becomes the primary mode); retry restarts the same mode in one click.

Traceability context from the shipped base game (code + docs), read during this stage:
- The round today ends via a one-way freeze (`ended` status) on all-resolved OR timer — game over and the Survive-60s win are new terminal outcomes of that same freeze, driven by player HP and mode rules.
- This feature **amends two base-game invariants**: the base PRD's Non-goal N4 / AC-03 "flat score, no multipliers" (score gains a combo multiplier + far-kill bonus but stays non-decreasing) and the base CONTEXT boundary "round … NOT a game with a lose condition" (player HP + game over introduce one). The base glossary entries are to be updated when this PRD is approved, as pre-announced in this feature's CONTEXT.md.
- The base "miss" statistic (escaped demon) is superseded by player damage: a demon completing its path now hits the player instead of only incrementing a counter.
- The fixed wave schedule (a static, sorted spawn-slot list consumed by a cursor) is replaced/extended by a generated, escalating wave source; wave generation must stay derived from run progress on the fixed step, never wall-clock.
- The persisted per-mode record activates reopen-trigger #1 of the project storage rules (versioned browser-storage key, no PII, fail-soft).
- The hit-test today resolves the front-most single entity kind (demons by depth); stage 3 adds a second shootable entity kind (fireball) to that rule.

## 2. Goals

- A run can be lost: demons that break through cost player HP, and at zero HP the run ends — turning the neutral gallery into a survival arcade with real stakes (idea-brief §13, stage 1).
- Every finished run gives a reason for one more: combo-multiplied score with far-kill bonuses, a letter rank, and a per-mode personal record that survives the session and celebrates "NEW RECORD!" when beaten (idea-brief §13, stage 2).
- The full confirmed scope ships in three independently playable stages — core loop, then the reason to retry, then the new threats — with the riskiest tuning content last and cheaply cuttable (idea-brief §13).

## 3. Non-goals

- N1: No new weapons or weapon switching — parked to backlog in ideation (idea-brief §5).
- N2: No server-side or shared leaderboards — the record is personal, per-browser, never uploaded (idea-brief §5).
- N3: No meta-progression, unlocks, currencies, or between-run upgrades (idea-brief §5).
- N4: No difficulty settings beyond one forgiving default (idea-brief §5).
- N5: No player movement, map traversal, or level geometry — unchanged base non-goals (idea-brief §5).
- N6: No checkpoint "floors" every N waves — parked; endless + Survive-60s cover the session shapes (idea-brief §5, §14).
- N7: No persistence beyond the per-mode best score — no settings, no run history (idea-brief §5).

## 4. User stories

### US-01: Take hits from breakthrough demons

**As a** player
**I want** a demon that completes its path to hit me and remove player HP, with strong screen feedback
**So that** every demon is a real threat and letting one through has consequences.

### US-02: Reach game over at zero HP

**As a** player
**I want** the run to end in a game over screen (final score, stats, rank) when my HP hits zero
**So that** a run has real stakes and a definite end I want to beat.

### US-03: Fight endless escalating waves

**As a** player
**I want** endless mode to send numbered waves where wave N+1 is denser/faster/tougher
**So that** longer survival means a visibly harder fight and a higher wave number to brag about.

### US-04: Retry the same mode instantly

**As a** player
**I want** one click on the end screen to restart a fresh run of the same mode
**So that** the "one more try" impulse is never interrupted.

### US-05: Build a kill-streak combo

**As a** player
**I want** consecutive kills to grow a score multiplier that resets on a combo break
**So that** consistent shooting is rewarded beyond flat points.

### US-06: Earn far-kill bonuses

**As a** player
**I want** extra points and an on-screen callout ("SNIPED!") for killing a demon while it is still far away
**So that** risky early shots feel skillful and are visibly rewarded.

### US-07: See my run graded

**As a** player
**I want** the end screen to grade the run with a letter rank (D–S) plus stats and a "best moment" line
**So that** the next run has a qualitative goal, not just a number.

### US-08: Beat my personal record

**As a** player
**I want** my best score per mode kept in my browser between sessions, with "NEW RECORD!" when I beat it
**So that** every run competes with my past self.

### US-09: Pick a mode on the start screen

**As a** player
**I want** a start screen where I choose Endless or Survive-60s (and my first click arms audio)
**So that** I control the kind of run I'm about to play.

### US-10: Win by surviving 60 seconds

**As a** player
**I want** Survive-60s mode to end in a win screen when I outlive 60 seconds of heavy waves
**So that** there is a mode I can definitively beat.

### US-11: Shoot down fireballs

**As a** player
**I want** shooter demons to throw telegraphed fireballs I can shoot down before they hit me
**So that** a new ranged threat has fair, skill-based counterplay.

### US-12: Face zigzag demons

**As a** player
**I want** some demons to advance along weaving zigzag paths
**So that** aiming stays challenging as I learn the straight paths.

## 5. Acceptance criteria

### AC-01 (US-01) — happy path

**Given** a run is in progress and player HP is above zero
**When** a live demon completes its path un-killed
**Then** the demon despawns, the player loses that demon's damage from player HP, and the player sees strong screen feedback plus the updated HP indicator.

### AC-02 (US-02) — happy path

**Given** a run is in progress and player HP is at its last point
**When** a player hit lands
**Then** the run ends in game over: gameplay freezes and the screen shows the final score, run stats, and rank.

### AC-02b (US-02) — concurrent edge

**Given** a killing shot and a player hit that empties player HP resolve at the same moment
**When** the run ends
**Then** that final kill's points (with the active multiplier and any far-kill bonus) are counted before the freeze.

### AC-03 (US-03) — domain invariant

**Given** an endless-mode run is in progress
**When** wave N ends and wave N+1 begins
**Then** wave N+1 is harder than wave N per the escalation rule (denser, faster, or tougher demons) and the current wave number is visible to the player.

### AC-04 (US-04) — happy path

**Given** an end screen (game over or win) is shown
**When** the player chooses retry
**Then** a fresh run of the same mode starts in one click — full player HP, zero score, base combo, wave one, no demon/score/weapon state leaked — while the per-mode record is retained.

### AC-05 (US-05) — domain invariant

**Given** a run with an active combo multiplier grown by consecutive kills
**When** a combo break occurs (per the combo-break rule)
**Then** the multiplier resets to base, already-earned score is unchanged (the score stays non-decreasing), and subsequent kills score at base until a new streak builds.

### AC-06 (US-06) — happy path

**Given** a live demon is still far away (beyond the far-kill threshold)
**When** the player kills it
**Then** the far-kill bonus is added on top of the multiplied kill points and an on-screen callout confirms it.

### AC-07 (US-07) — happy path

**Given** a run reaches its end (game over or win)
**When** the end screen appears
**Then** it shows a letter rank (D–S) derived from the run's score/stats, the run stats, and a "best moment" line.

### AC-08 (US-08) — happy path

**Given** a finished run whose score beats the stored record for its mode
**When** the end screen appears
**Then** it celebrates "NEW RECORD!", the record for that mode is updated, and the new record survives a page reload.

### AC-09 (US-08) — domain invariant

**Given** the endless record is higher than the survive-60s record
**When** a survive-60s run ends beating the survive-60s record but not the endless one
**Then** "NEW RECORD!" fires for survive-60s and the endless record is untouched — records never compare across modes.

### AC-10 (US-08) — error / fail-soft

**Given** the browser's record storage is unavailable or holds corrupt data
**When** a run ends
**Then** the end screen still shows fully; the record degrades to session-only and the player is never blocked from playing.

### AC-11 (US-09) — happy path

**Given** the page has just loaded and the start screen is shown
**When** the player picks a mode with their first click
**Then** that gesture arms audio and a run of the chosen mode starts.

### AC-12 (US-09) — authorization / input gating

**Given** the start screen or an end screen is shown
**When** the player clicks inside the play area
**Then** no shot fires and no run state mutates — gameplay input is accepted only while a run is actually running (extends the base focus/scope gating).

### AC-13 (US-10) — happy path

**Given** a survive-60s run is in progress and player HP is above zero
**When** the 60-second timer expires
**Then** the run ends in a win screen — not game over — showing score, stats, and rank, with any same-moment final kill counted first.

### AC-14 (US-11) — happy path / counterplay

**Given** a shooter demon has telegraphed and thrown a fireball
**When** the player shoots the fireball down mid-flight
**Then** it despawns harmlessly, awarding no kill points and neither growing nor breaking the combo; if instead it is never shot down and reaches the player, a player hit lands (HP loss + strong feedback).

### AC-15 (US-12) — cross-context

**Given** a zigzag-path demon and a fireball overlap under the crosshair at different depths
**When** the player fires
**Then** the single hit resolves to the front-most entity by depth across both entity kinds.

> Note on the authorization coverage type: a single-player, client-side game has no permission model (no server, no accounts). AC-12 is the closest business-observable analog — it gates gameplay input at the run-state boundary (start/end screens), mirroring the base game's AC-07 adaptation of the template's authorization type for a single-player context.

## 6. Non-functional requirements

| Aspect | Target | Measurement |
|---|---|---|
| Frame rate in late waves | ≥ 30 FPS (frame-time p95 ≤ 33.3 ms) with the entity cap active | rAF frame-time profiler (existing `createFrameTimer`) during a late-wave stress run |
| Input→shot latency | ≤ 50 ms click → hit resolution (unchanged from base) | in-engine timestamp delta |
| Player-hit feedback latency | ≤ 100 ms from hit landing to visible + audible feedback | in-engine timestamp delta (same window as game-feel) |
| Determinism preserved | timing drift ≤ 1% between 60↔144 Hz; waves/combo/fireballs advance only on the fixed step, 0 wall-clock reads | existing elapsed-time test on two refresh rates, extended to generated waves |
| Bounded entities in endless | concurrent live entities (demons + fireballs) ≤ 32 at any moment, any wave | unit/stress test asserting the cap under a long generated run |
| Record persistence fail-soft | 100% of runs reach their end screen with storage unavailable or corrupt | E2E run with storage disabled/corrupted |
| Initial load | ≤ 3 s on broadband (unchanged) | Lighthouse / Performance timing |

## 6.1 Security / privacy

- **Data classification:** public — client-side game, no accounts; the only persisted datum is a per-mode best score in the player's own browser.
- **Personal data touched:** none — scores only, no PII, no settings, no run history (storage rules: no PII ever).
- **AuthZ/AuthN impact:** none — no server, no auth boundary. Gating surfaces: input focus/scope (base), audio first-gesture arming (game-feel), and the new run-state gating (start/end screens, AC-12).
- **Abuse cases:**
  - Record tampering via devtools/storage editing: accepted — the record is personal and never shared; no integrity requirement (unchanged from base score-tampering stance).
  - Corrupt or hostile storage payload: parsed defensively — a malformed record degrades to session-only (AC-10), never crashes or executes anything.
  - Asset licensing for new sprites (fireball, shooter demon, screens): license-clean sources only, as with all shipped assets.
  - No network surface: nothing is sent anywhere; SSRF/injection/spam are not applicable.
- **Security review:** N/A — client-side, no PII, no auth boundary, no server; the new browser storage holds a single non-personal number per mode. Revisit if a shared leaderboard (Non-goal N2) ever appears.

## 7. Metrics / KPIs

- **"Want to replay" self-rating** — baseline: 2/5 (idea-brief §2), target: ≥ 4/5, checked at the end of each delivery stage (idea-brief §7 Approach C outcome metric).
- **Natural retries per author session** — baseline: ~0 (a finished round is a dead end today), target: ≥ 3 voluntary retries per evening session after stage 1 ships.
- **Guest replay pull (post-publish)** — baseline: N/A (not published), target: a demo guest voluntarily plays ≥ 2 runs in their first session, observed on ≥ 2 of 3 informal playtests (idea-brief §8 Executive proxy).
- **First-death timing in endless** — baseline: N/A, target: median first-ever run ends between 45–120 s, never before ~40 s (the "feels cheated" window, idea-brief §8 UX), measured by informal playtest observation.

## 8. Open questions

- [ ] Player HP count and per-hit damage? Default now: player HP = 5; every player hit (breakthrough demon or fireball) removes exactly 1. — owner: Maksym, due: architecture gate
- [ ] Combo-break rule and far-kill threshold? Default now: the combo breaks on a taken player hit or an escaped demon, NOT on a missed shot (forgiving for guests/trackpads); far-kill = the demon has not yet crossed the midpoint of its path. — owner: Maksym, due: architecture gate
- [ ] Escalation curve shape and the concrete kill-criterion tuning budget? Default now: budget = 3 tuning evenings; if endless is not fun within it, Survive-60s becomes the primary mode (idea-brief §10 mitigation). — owner: Maksym, due: architecture gate
- [ ] Rank thresholds (D–S): fixed table vs derived from personal history? Default now: fixed table, tuned once during implementation. — owner: Maksym, due: architecture gate
- [ ] Survive-60s wave source: the retired fixed schedule or the generator at high intensity? Default now: the generator pinned at high intensity (one wave source to maintain). — owner: Maksym, due: architecture gate

## Related

- [idea-brief.md](./idea-brief.md) — stage 01 idea brief (Approach C, RICE 1.4, Confirmed).
- [CONTEXT.md](./CONTEXT.md) — new domain glossary (game mode, player HP, player hit, game over, run, combo multiplier, far-kill bonus, rank, record, start screen, fireball, zigzag path).
- Base features: [basic-shooting-range](../basic-shooting-range/) and [game-feel](../game-feel/) — this PRD amends base Non-goal N4 (flat score) and the "no lose condition" round boundary; base glossary entries to be updated on approval.
- Storage rules: `.claude/rules/migrations.md` — reopen trigger #1 (versioned browser-storage key) activates with the per-mode record.
- Next stage: `sdlc:classify-size survival-loop`, then `sdlc:architecture-design survival-loop` (gate 04-05).
