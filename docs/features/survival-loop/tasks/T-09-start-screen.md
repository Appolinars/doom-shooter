---
id: T-09
epic: survival-loop
project: doom-shooter
wave: 2
priority: P1
estimate: M
blocks: [T-10, T-11]
blocked_by: [T-08]
status: todo
context_budget: 5000
created: 2026-07-13
owner: Maksym Vakulenko
---

# T-09 — Start screen: mode select, input gating, audio arming

## Goal

ADR-0005 for the pre-run phase: boot lands in `status = 'idle'` with the start screen drawn on canvas and two DOM mode buttons (Endless / Survive-60s) toggled by status in `main.ts`. The **first click on a mode button** arms the audio bus (existing arm-on-gesture seam) AND starts a run of that mode (AC-11). Gameplay input hardens to `status === 'running'` (AC-12): clicks in the play area while `idle`/`ended` enqueue no fire intent and mutate nothing. Retry keeps the chosen mode.

⚠ This is the task SAD §11 flags as breaking every auto-starting E2E. Its own DoD therefore includes a **minimal** `?e2e` extension — an auto-start/mode parameter — so the existing Playwright suite stays green in this same PR. The full `?e2e` API build-out (record hooks, wave fast-forward) and new E2E coverage is T-11.

## Linked artifacts

- [[../adr/0005-hybrid-canvas-screens-with-dom-controls.md]] — canvas visuals, DOM controls, arming surface.
- [[../PRD.md]] AC-11 (first click = mode + audio + start), AC-12 (input gating); US-09.
- [[../sad.md]] §8 Input-gating row, §11 E2E-breakage risk row.
- [[../adr/0001-extend-round-into-mode-aware-run-state.md]] — `'idle'` status semantics.
- [[../test-plan.md]] AC-11/12 rows (jsdom + E2E); §E2E environment (auto-start parameter).

## Acceptance criteria

**AC-T09-1 (mode pick, PRD AC-11)**
Given a fresh page in `idle`
When a mode button is clicked
Then `run.mode` is set, `status = 'running'`, and the audio-arm seam is invoked by that same gesture — jsdom integration + E2E (fresh page → click Endless → run starts, audio context armed).

**AC-T09-2 (input gating, PRD AC-12)**
Given `status ∈ {idle, ended}`
When the play area is clicked
Then no fire intent is enqueued and no state diff occurs (extends the base inactive-drop test to the new statuses).

**AC-T09-3 (retry keeps mode)**
Given an ended survive60 run
When retry is clicked
Then the fresh run has `mode = 'survive60'` without re-visiting the start screen.

**AC-T09-4 (suite stays green)**
Given the existing Playwright suite
Then it passes in this PR via the minimal `?e2e` auto-start/mode parameter.

## Atomic checklist

- [ ] Step 1: boot in `idle`; renderer start-screen branch (title, mode hints; art via existing manifest, fail-soft).
- [ ] Step 2: `main.ts` — mode buttons (DOM), visibility by status, click → arm audio + start run(mode).
- [ ] Step 3: input gating on `status === 'running'` (fire-intent enqueue + any pointer state writes).
- [ ] Step 4: minimal `?e2e` auto-start/mode param; repair existing specs mechanically.
- [ ] Step 5: jsdom tests (AC-11/12) + E2E smoke (mode pick, gating).

## Edge cases

| Case | Expected |
|---|---|
| Esc pressed on the start screen | no pause toggle — pause is a running-run concept (gating covers it) |
| Both mode buttons double-clicked rapidly | one run starts; second click lands in `running` and is a no-op on the hidden button |

## DoD

- AC-11/12 rows green; full unit + E2E suites green in this PR; zero fixed-step logic added (gating sits at the input boundary).
