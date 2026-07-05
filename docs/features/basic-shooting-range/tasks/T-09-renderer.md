---
id: T-09
epic: basic-shooting-range
project: doom-shooter
wave: 4
priority: P1
estimate: M
blocks: [T-11]
blocked_by: [T-01, T-02]
status: todo
context_budget: 4500
created: 2026-07-02
owner: Maksim Vakulenko
---

# T-09 — Renderer: sprite scaling from z + HUD

## Goal

`src/render/canvas2d.ts`: draw the state each frame — demons back→front with size/position derived from `z` (placeholder shapes until T-10 sprites land), crosshair, HUD (score, shells, reload cue, timer) and the round-result screen. Includes the FPS dev overlay.

## Linked artifacts

- [[../adr/0001-render-on-canvas-2d-with-sprite-scaling.md]] — scale/position/draw-order as functions of `z`.
- [[../sad.md]] §6 Flow 6 (render leg: sprite scale from z) and Critical flow 4 (render round result); §7 — FPS dev overlay is the NFR measurement source.
- [[../PRD.md]] AC-04 (show final total score), AC-01/AC-02 render cues (hit feedback / not-ready); §6 NFR ≥ 30 FPS under a wave.
- [[../data-model.md]] — "draw order far→near: sort by `z` per frame" access pattern; reads `Shot` for feedback cues. **Data delta: read-only over `GameState`** — the renderer never mutates state.

## Acceptance criteria

**AC-T09-1 (depth rendering)**
Given demons at varied `z`
When a frame renders
Then they draw back→front and on-screen size is a monotonic function of `z` (flat round = all `z` equal renders identically sized — QG-2).

**AC-T09-2 (round result, PRD AC-04)**
Given `round.status === 'ended'`
When the frame renders
Then the result screen shows the finalized total score and gameplay visuals freeze.

**AC-T09-3 (performance, PRD §6 NFR)**
Given ~30 live demons on screen
When rendering on mid-range hardware
Then the dev overlay shows ≥ 30 FPS (frame-time p95 ≤ 33.3 ms).

## Atomic checklist

- [x] Step 1: `render(state)` entry — clear, per-frame `z`-sort, placeholder-shape demon draw scaled by `z`.
- [x] Step 2: crosshair + HUD — score, shells, reload cue (T-06 flag), round timer.
- [x] Step 3: hit/miss feedback cue from transient `Shot`s; round-result overlay.
- [x] Step 4: FPS / frame-time dev overlay (SAD §7 monitoring) via `createFrameTimer` (mean FPS + p95).
- [x] Step 5: 30-demon render check + z-order/depth-radius/frame-timer unit tests (`tests/unit/render.test.ts`). Live FPS-NFR measurement runs in-browser under T-11 (Playwright); node tests cover the ordering/scale/timer logic.

## Edge cases

| Case | Expected |
|---|---|
| All demons at equal `z` (flat MVP round) | identical size, stable order — no flicker from unstable sort |
| Sprite assets not yet loaded | placeholder shapes render (fail-soft, SAD §8) |

## DoD

- z-order unit test green; 30-demon perf check meets the FPS NFR; renderer is read-only over state.
