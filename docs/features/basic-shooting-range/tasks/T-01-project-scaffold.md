---
id: T-01
epic: basic-shooting-range
project: doom-shooter
wave: 1
priority: P1
estimate: S
blocks: [T-03, T-04, T-09, T-10]
blocked_by: []
status: todo
context_budget: 4500
created: 2026-07-02
owner: Maksim Vakulenko
---

# T-01 — Project scaffold (Vite + TS + canvas mount)

## Goal

A fresh clone runs `npm run dev` and shows a full-window canvas with an empty render stub; `npm run build` emits the static bundle. Everything downstream lands into this skeleton.

## Linked artifacts

- [[../sad.md]] §2 Constraints — TypeScript 5.x / ES2022, Vite, Canvas 2D, static bundle.
- [[../sad.md]] §5 Building block view — target `src/` tree this scaffold pre-creates.
- [[../sad.md]] §7 Deployment view — bundle + assets ≤ ~2–3 MB budget.
- [[../PRD.md]] §6 NFR — initial load ≤ 3 s on broadband.
- Data delta: none — scaffolding only, no `GameState` fields touched (contract lives in [[../data-model.md]], introduced in T-02).

## Acceptance criteria

**AC-T01-1 (dev run)**
Given a fresh clone with dependencies installed
When the developer runs `npm run dev`
Then the browser shows a canvas sized to the window (DPR-aware backing store) rendering an empty frame without console errors.

**AC-T01-2 (build)**
Given the scaffold
When the developer runs `npm run build`
Then Vite emits a static bundle that opens from a static host and stays within the §7 size budget.

## Atomic checklist

- [ ] Step 1: `npm create vite` (vanilla-ts), strict `tsconfig`, ESLint config.
- [ ] Step 2: `index.html` + `src/main.ts` mounting a full-window `<canvas>`; DPR-aware sizing on load and on window resize.
- [ ] Step 3: empty `requestAnimationFrame` render stub (placeholder for the T-03 loop) clearing the canvas each frame.
- [ ] Step 4: pre-create the §5 folder tree (`core/ entities/ systems/ input/ render/ assets/`) with empty index modules; npm scripts + run notes in README.

## Edge cases

| Case | Expected |
|---|---|
| HiDPI display (DPR 2) | canvas backing store scaled by DPR, no blur |
| Window resize mid-session | canvas re-sized, no distortion |

## DoD

- `npm run dev` and `npm run build` both green; blank canvas renders without errors on DPR 1 and 2.
- Folder tree matches [[../sad.md]] §5; PR ≤ 500 LOC.
