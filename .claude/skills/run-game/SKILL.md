---
name: run-game
description: Launch and visually verify doom-shooter — build, serve via vite preview, drive a real playthrough (mouse clicks, Esc pause, retry) with tools/play-game.mjs, then LOOK at the screenshots it produces.
---

# run-game — visual smoke playthrough

Use this whenever you need to see the game actually working in a browser: after a
render/wiring change, before a release, or when the user asks "запусти и проверь".
Unit + E2E suites assert state; this skill verifies the *picture*.

## Steps

1. **Build** (skip if `dist/` is fresh for the current code):

   ```bash
   npm run build
   ```

2. **Serve the build** in the background (Playwright's own E2E config uses the same port):

   ```bash
   npm run preview -- --port 4173 --strictPort
   ```

3. **Run the playthrough** from the project root (ESM resolves `@playwright/test`
   from the script's location, so the script must stay inside the repo):

   ```bash
   node tools/play-game.mjs <outDir>
   ```

   `<outDir>` — use the session scratchpad. Optional second arg overrides the base
   URL (default `http://localhost:4173`).

   The script plays like a human: real mouse clicks on demon positions (through the
   350 ms pump gate), Esc to pause/resume, the real TRY AGAIN button. `?e2e=1` is
   only used to read GameState for aiming and to fast-forward the round timer. It
   exits non-zero if no kill lands, Esc doesn't pause, or retry doesn't reset.

4. **Look at the screenshots** — read each PNG as an image; the console JSON alone
   is not verification. Expected content:

   | File | Must show |
   |---|---|
   | `1-boot-first-demon` | hell backdrop, shotgun viewmodel, a demon, HUD `Score 0` + timer + FPS |
   | `2-first-shot-flash` | muzzle flash on the barrel, crosshair on the demon |
   | `3-hurt-demon-splat` | blood splat / hurt frame on the clicked demon |
   | `4-after-kill` | score > 0 in HUD (kill landed) |
   | `5-paused-overlay` | dimmed scene, `PAUSED`, RESUME button, frozen timer |
   | `6-end-screen` | `ROUND OVER`, `Final Score N`, TRY AGAIN button |
   | `7-after-retry` | fresh round: `Score 0`, full timer, live field |

   A blank/black frame where the table expects content = failure (unless you
   deliberately blocked assets to test fail-soft — then black backdrop + placeholder
   shapes is the *correct* picture).

5. **Stop the preview server** when done.

## Limits

- No audio verification — the SFX `play()` trigger is covered by QG-1 in
  `tests/e2e/game-feel.spec.ts`; how it sounds needs a human.
- Headless Chromium only; game feel (pump rhythm, weight) stays a manual check.
