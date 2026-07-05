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

## Source layout (SAD §5)

```
src/
├── main.ts            bootstrap: mount canvas, wire modules, start loop
├── core/              loop.ts (fixed timestep), state.ts (GameState + types)
├── entities/          demon.ts, shot.ts
├── systems/           spawn, weapon, hit, round, score
├── input/pointer.ts   aim + fire + gating
├── render/canvas2d.ts DPR-aware surface + sprite scaling
└── assets/sprites.ts  sprite loading
```
