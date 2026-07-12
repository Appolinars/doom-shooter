---
id: T-11
epic: survival-loop
project: doom-shooter
wave: 2
priority: P1
estimate: M
blocks: [T-15]
blocked_by: [T-09, T-10]
status: todo
context_budget: 5000
created: 2026-07-13
owner: Maksym Vakulenko
---

# T-11 — E2E repair + extension (`?e2e` API: record hooks, fast-forward)

## Goal

Stage 2's verification gate and the budgeted E2E repair (SAD §11). The `?e2e` debug API grows from T-09's minimal auto-start param to the full test-plan contract: mode selection, record **seed/read hooks**, and **wave fast-forward** (for the later stress scenario). New Playwright coverage: the full player journey (start screen → mode pick → scripted run → end screen → retry, both modes); record persistence across a real page reload (AC-08); fail-soft runs with localStorage **blocked** (throwing stub via init script) and with a **corrupt value pre-seeded** (AC-10). The existing latency probe re-bases onto the start flow. E2E hygiene per test-plan: fresh page load + explicit `localStorage.clear()` per test — the record is the first state that survives reload.

## Linked artifacts

- [[../test-plan.md]] §E2E environment (the API contract, fault injection, cleanup), AC-01/03/04/08/10/11 E2E rows.
- [[../sad.md]] §11 (E2E-breakage row — the budget lands here), §10 QG-3.
- [[../PRD.md]] AC-08 (reload persistence), AC-10 (fail-soft E2E), AC-04 (retry incl. record retained).
- [[../adr/0003-fail-soft-record-store-behind-versioned-localstorage-key.md]] — what "blocked/corrupt" must look like from outside.

## Acceptance criteria

**AC-T11-1 (journey, both modes)**
Given a fresh page
Then E2E drives: start screen visible → click mode → run plays scripted → end screen with rank/stats → retry → fresh run same mode, record retained — for Endless and Survive-60s.

**AC-T11-2 (reload persistence, PRD AC-08)**
Given a run that beats the record
When the page reloads
Then the persisted record is visible (via the record read hook / end screen) — the score survived the browser round-trip.

**AC-T11-3 (fail-soft, PRD AC-10 / QG-3)**
Given localStorage blocked (init-script throwing stub) and, separately, a pre-seeded corrupt value
Then a full run reaches its end screen in both cases; no console error escapes as a page crash.

**AC-T11-4 (suite health)**
Given the whole Playwright suite (repaired + new)
Then it is green against `vite build && vite preview`, with per-test `localStorage.clear()` cleanup.

## Atomic checklist

- [ ] Step 1: extend `?e2e` / `window.__doom` — mode/auto-start (finalize T-09's minimal param), record seed/read, wave fast-forward.
- [ ] Step 2: journey specs (both modes) + retry-with-record-retained.
- [ ] Step 3: reload-persistence spec; blocked-storage + corrupt-seed specs (Playwright init scripts).
- [ ] Step 4: re-base the input-latency probe onto the start flow; cleanup discipline in all specs.

## Edge cases

| Case | Expected |
|---|---|
| Record seeded equal to the run's final score | no "NEW RECORD!" (strictly-greater rule visible end-to-end) |
| Corrupt seed shapes (garbage string, wrong-shape JSON) | both degrade to defaults + session-only; end screen intact |

## DoD

- Full Playwright suite green; stage 2 playable end-to-end in a real browser; `?e2e` API documented in the spec helper; this closes the SAD §11 E2E-repair debt row.
