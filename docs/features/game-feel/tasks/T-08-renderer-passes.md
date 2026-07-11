---
id: T-08
epic: game-feel
project: doom-shooter
wave: 3
priority: P1
estimate: M
blocks: [T-09]
blocked_by: [T-01, T-03, T-06, T-07]
status: todo
context_budget: 5000
created: 2026-07-06
owner: Maksym Vakulenko
---

# T-08 — Renderer passes (backdrop / viewmodel / splat / death / hurt)

## Goal

Extend `src/render/canvas2d.ts` with the new draw passes (ADR-0004), all **snapshot-only** — the renderer reads a `GameState` snapshot + the T-06 effects store + the T-07 atlas and mutates neither. Passes: (1) backdrop behind everything; (2) per-demon frame selection — full vs per-HP-step hurt frame chosen by `hp/maxHp` (T-01), death frame from the effects store (T-06); (3) hit-splat pass; (4) first-person **viewmodel** pass driven by the weapon `status` (T-03: idle / firing / pumping / reloading) and the effects clock. Crosshair→world aim mapping and z-ordering are untouched, so the aim-≤2px and z-order tests stay green (QG-2).

## Linked artifacts

- [[../adr/0004-juice-animation-state-on-render-layer.md]] — renderer reads the effects store; no fixed-step reach.
- [[../adr/0001-demon-hp-as-bounded-field-damaged-inline.md]] — hurt frame selected by `hp` (per-step).
- [[../adr/0002-pump-as-fixed-step-weapon-gate.md]] — viewmodel reflects `'pumping'`/`'ready'` from the fixed-step weapon state (no `'reloading'` — reload dropped 2026-07-11).
- [[../PRD.md]] AC-01 (firing viewmodel + splat), AC-04 (death animation), AC-07 (juice render-only, aim unchanged), §6 NFR (≥ 30 FPS with viewmodel + concurrent deaths + backdrop; aim ≤ 2 px).
- [[../sad.md]] §5 (`canvas2d.ts ◐ backdrop/viewmodel/splat/death-anim passes`), §6 flow 1 & 2, §10 QG-2.

## Acceptance criteria

**AC-T08-1 (snapshot-only, PRD AC-07)**
Given the render passes run
Then they read a `GameState` snapshot + effects store + atlas and write nothing back; the crosshair→world mapping test stays ≤ 2 px across DPR/resize with all passes active.

**AC-T08-2 (hurt/death frame by hp, PRD AC-03/AC-04)**
Given a demon with `hp < maxHp`
Then the renderer draws its per-HP-step hurt frame (T-07); on a kill, the death frame from the effects store plays, then the demon is gone (despawn already happened on the fixed step in T-02).

**AC-T08-3 (viewmodel reflects weapon state, PRD AC-01/AC-02)**
Given the weapon `status`
Then the viewmodel shows `idle` when ready and the fire→pump sequence while `'pumping'` — reading state, not driving it. **No `fire` frame:** the shot draws `weapon-shotgun-idle` with `flash-1`→`flash-2` overlaid additively at the muzzle, then `pump-1`→`pump-2`→`pump-3`, then `idle`. No reload animation (mechanic dropped).

**AC-T08-4 (z-order + backdrop)**
Given the backdrop pass
Then it draws behind all demons/effects; existing z-order (front-most nearest) is unchanged; ≥ 30 FPS holds under a stress wave (verified numerically in T-10).

## Atomic checklist

- [ ] Step 1: backdrop pass — draw the T-07 picked backdrop (or black) first each frame.
- [ ] Step 2: demon frame selection — full vs hurt@step by `hp/maxHp`; death frame from effects store; fail-soft to placeholder.
- [ ] Step 3: splat pass — draw active splats from the effects store at their impact points.
- [ ] Step 4: viewmodel pass — draw the shotgun frame from weapon `status` + effects clock: idle+flash-1/2 overlay at the shot → pump-1/2/3 → idle (no fire frame, no reload). Flash drawn additively over idle at the muzzle.
- [ ] Step 5: tests — z-order unchanged; hurt-frame-by-hp selection; aim-mapping ≤ 2 px with all passes on; renderer writes nothing to `GameState` (review + snapshot arg is readonly).

## Edge cases

| Case | Expected |
|---|---|
| Death frame missing for a type (T-07 gap) | fail-soft placeholder; despawn timing unaffected |
| Viewmodel sheet missing | placeholder/no gun drawn; firing still resolves (fail-soft, AC-06) |

## DoD

- Backdrop/viewmodel/splat/death/hurt passes render from a readonly snapshot + effects store; z-order + hurt-by-hp + aim-≤2px tests green; no `GameState` writes; FPS numbers deferred to T-10.
