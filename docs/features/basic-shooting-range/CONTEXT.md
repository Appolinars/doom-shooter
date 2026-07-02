---
status: Living
updated_at: "2026-07-02"
---

# Domain Context

<!--
CONTEXT.md = domain glossary, not SPEC and not a scratch pad. NO implementation details
(no Redis vs Postgres, no library names, no API contracts) — only domain words
and the boundaries between them. The rest lives in SPEC.md, architecture-brief.md, ADR.

Terms resolving during interview/brainstorm/decide go here inline,
not batched "I'll consolidate later". MP rule: empty H2 — delete before commit;
in CONTEXT.md keep only sections that have real content.
-->

## Glossary

<!-- term · 1-sentence canonical definition · 1-sentence boundary (what it is NOT / what it gets confused with). -->
- demon — a target creature the player shoots at. NOT enemy in the general sense (non-demonic enemies may appear in the future and are not automatically demons).
- reload — the delayed shotgun-reloading process that blocks firing while it lasts. NOT weapon switch (reloading refills the current weapon, it does not change the weapon).
- score — the total number of points accumulated during one round. NOT combo/multiplier (score is the final flat number, without any multiplier logic).
- spawn point — a specific fixed screen coordinate where a demon appears. NOT spawn zone (a spawn point is a single fixed coordinate, not an area).
- wave — a group of demons appearing within a single round/run. NOT level/location (a wave is about enemies, not about the map).
- round — one self-contained play session that ends on all-resolved OR timer with a final score. NOT a game with a lose condition (there is no game-over in MVP — ADR-0004).
- miss — a demon that reaches the end of its path un-killed, recorded against the round. NOT a shot that hits nothing (a wasted shot is a shot outcome, a miss is an escaped demon).
- path — the fixed ordered route (waypoints with depth) a demon follows from its spawn point. NOT AI/pathfinding (paths are static data, never computed or re-assigned at runtime).
- depth / z — the per-demon value driving sprite scale, screen position, draw order and hit priority. NOT a third world axis with physics (it is a rendering/priority scalar, no vertical aiming).
- fire intent — a player click that passed input gating and is queued for the next fixed step. NOT a shot (a shot exists only after the weapon resolves the intent — an intent can be blocked by reload).

## Invariants

<!-- Business rules that hold across every story; enforced in systems code, never in config/data. -->
- Score is a flat, non-decreasing integer sum of killed demons' point values — no multipliers, no deductions (PRD AC-03, N4).
- Firing while the weapon is reloading is blocked and consumes no shell (PRD AC-02).
- When demons overlap under the crosshair, the hit resolves to the front-most by depth only (PRD AC-06).
- A demon that completes its path un-killed despawns and records exactly one miss (PRD AC-05).
- A round ends when all scheduled demons are resolved (killed or escaped) OR the timer expires; a same-step final kill is counted before the freeze (PRD AC-04/04b, ADR-0004).
- After a round ends, no game state mutates until a new round starts.
- Game logic advances only on the fixed step, never on wall-clock or render frames (ADR-0002).

## Sentinel errors

<!-- Adapted for a client-only game: no server error codes; these are the domain's named
     rejection states — every blocked action maps to exactly one of them (module.state form). -->
- `weapon.not_ready` — fire intent rejected: reload in progress or no shell (AC-02).
- `input.out_of_scope` — click ignored: tab unfocused or pointer outside the play area (AC-07).
- `round.ended` — any gameplay action ignored: the round is frozen (AC-04).
- `assets.sprite_unavailable` — sprite failed to load: render falls back to placeholder shapes, never crashes (SAD §8 fail-soft).
- `config.unknown_ref` — a `typeId`/`pathId`/`spriteKey` not present in static config: boot-time validation error, never a mid-round failure.

## Org-filter invariant

N/A — single-player client-only game: no organizations, no accounts, no multi-tenant data to isolate (PRD §6.1). Revisit only if a server-side leaderboard (Non-goal N7) ever appears.

## Out of scope

<!-- Deliberately outside this feature — from PRD §3 Non-goals. -->
- Player movement across a map (N1) · multiplayer/networking/server (N2) · multiple levels or progression (N3) · combo/multiplier scoring (N4) · full 3D engine / vertical aiming (N5) · public release as an MVP goal (N6) · saved scoreboard / leaderboard / score persistence (N7).
- Hard lose condition ("a demon reaches the player") — deferred to the depth-layer stage (ADR-0004, SAD §11).
