# doom-shooter

A client-side, browser Doom-style shooting gallery (TypeScript + Vite + Canvas 2D).
Feature: `basic-shooting-range`. Design docs live in [`docs/features/basic-shooting-range`](./docs/features/basic-shooting-range).

## Requirements

- Node 20+ / npm 10+

## Scripts

| Command | What it does |
|---|---|
| `npm install` | Install dependencies |
| `npm run dev` | Vite dev server with HMR — full-window canvas |
| `npm run build` | Type-check + emit the static bundle to `dist/` |
| `npm run preview` | Serve the built `dist/` bundle locally |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint over the repo |
| `npm test` | Vitest unit suite (`tests/unit`) |
| `npm run e2e` | Playwright end-to-end suite (T-11) |

## Play

1. `npm install`
2. `npm run dev` and open the printed URL (or `npm run build && npm run preview` for the production bundle).

Move the mouse to aim; **click** to fire the shotgun. Each shot spends one shell; empty the
magazine (8 shells) and it auto-reloads (`RELOADING` shown in the HUD). Demons cross the range
along fixed paths — hit them for points (fast = 10, brute = 25); a demon that reaches the end
un-killed is a miss. The round runs 60 s or until every scheduled demon is resolved, then freezes
on a final-score screen. Reload the page to play again (all state is ephemeral — no save).

## Publish

The build is a fully static bundle (`vite build` → `dist/`, ~12 kB, no backend). Deploy `dist/`
to any static host — GitHub Pages or itch.io. `base: './'` in `vite.config.ts` makes the asset
paths relative, so it works from a project sub-path without extra config.

## Source layout (SAD §5)

```
src/
├── main.ts            bootstrap: mount canvas, wire modules, start loop, ?e2e debug hooks
├── core/              loop.ts (fixed timestep), state.ts (GameState + init), step.ts (per-step order)
├── entities/          demon.ts, shot.ts
├── systems/           spawn, weapon, hit, round, score
├── input/pointer.ts   aim + fire + gating
├── render/canvas2d.ts DPR-aware surface + sprite scaling
└── assets/sprites.ts  sprite loading
```
