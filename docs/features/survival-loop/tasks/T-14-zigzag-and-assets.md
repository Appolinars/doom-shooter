---
id: T-14
epic: survival-loop
project: doom-shooter
wave: 3
priority: P2
estimate: M
blocks: [T-15]
blocked_by: [T-13]
status: todo
context_budget: 5000
created: 2026-07-13
owner: Maksym Vakulenko
---

# T-14 — Zigzag paths + stage-3 assets + render

## Goal

Closes stage 3 as playable. **Zigzag paths** are pure data (CONTEXT: "NOT AI"): new `Path` entries with laterally weaving waypoints — the existing `waypoints: {x,y,z}[]` contract carries them with zero schema or logic change; `MODE_PARAMS`/wave specs mix zigzag paths and shooter demon types in from their configured waves. **Assets** via the existing manifest pipeline, license-clean with source notes, all fail-soft: shooter demon frames (idle/telegraph/hurt/death), fireball sprite, telegraph visual cue. **Render**: fireballs drawn depth-correct among demons, telegraph readable (the fairness half of "telegraphed" in US-11), zigzag demons animate through the existing draw path. E2E smoke for stage 3.

## Linked artifacts

- [[../PRD.md]] US-12 (zigzag), AC-14 "telegraphed" fairness, AC-15 context; §6.1 asset licensing.
- [[../sad.md]] §6 US-12 flow ("typed config, no new logic"), §11 accepted debt (fixed waypoints may read repetitive — accepted).
- [[../data-model.md]] §`Demon` delta (zigzag needs no schema change).
- [[../adr/0005-hybrid-canvas-screens-with-dom-controls.md]] — new art enters via the manifest.
- [[../test-plan.md]] zigzag-breakthrough edge, render smoke rows.

## Acceptance criteria

**AC-T14-1 (zigzag as data)**
Given the new zigzag `Path` entries
Then demons walk them via the existing path-walking code — `git diff` on path-walking logic = 0; a zigzag demon at `progress = 1.0` produces the same breakthrough semantics as straight paths (locked test).

**AC-T14-2 (telegraph readable)**
Given a shooter demon entering telegraph
Then a visible wind-up cue renders before the fireball spawns (E2E/screenshot smoke) — counterplay is fair by observation.

**AC-T14-3 (depth-correct render)**
Given overlapping demons and fireballs
Then draw order matches z (consistent with T-13 hit resolution) — render unit/smoke.

**AC-T14-4 (assets fail-soft)**
Given any stage-3 asset missing
Then placeholders draw, nothing throws, licenses documented in the manifest note.

## Atomic checklist

- [ ] Step 1: zigzag `Path` waypoint data + wave-mix config; breakthrough-parity test.
- [ ] Step 2: source + commit license-clean art (shooter frames, fireball, telegraph cue); manifest entries + license notes.
- [ ] Step 3: renderer — fireball pass in the depth-sorted draw, telegraph cue, shooter/zigzag demon frames.
- [ ] Step 4: E2E smoke — a stage-3 wave with shooters + zigzag plays to an end screen.

## Edge cases

| Case | Expected |
|---|---|
| Zigzag demon killed mid-weave | death visuals at its current position; no path special-casing |
| Fireball sprite missing | placeholder shape still telegraphs and flies — mechanics never depend on art |

## DoD

- Stage 3 playable (shooters throw, fireballs shootable and rendered, zigzag waves live); smoke green; licenses documented; path-walking logic diff = 0.
