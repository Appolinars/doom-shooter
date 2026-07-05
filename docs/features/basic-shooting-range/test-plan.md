---
status: Draft
owner: "Maksym Vakulenko"
reviewers: ["Tech Lead"]
updated_at: "2026-07-05"
feature_size: M
stage: "15"
ticket: "N/A (personal pet-project)"
---

# Test plan — basic-shooting-range

<!-- Stage 15 → see SDLC/plugin/skills/plan-tests/SKILL.md -->

> **Adaptation note.** The stage-15 template targets a server-side service (DB, HTTP API,
> load tests). This feature is a client-only browser game (PRD N2, SAD §3): there is no
> database (→ testcontainers N/A), no API between services (→ contract tests N/A), and no
> throughput NFR (→ classic load tests N/A). The "load" level is replaced by **NFR
> verification** against the PRD §6 table, using the scripted-wave harness from task T-11.
> Simulation systems are pure functions over `GameState` (ADR-0003), so the pyramid is
> unit-heavy by design.

## Levels

| Level | Scope | Tooling |
|---|---|---|
| Unit | Pure system functions over `GameState`: weapon, hit-test, score, round, spawn, loop accumulator, DPR mapping | Vitest (node env — no DOM needed for `src/systems/*` + `src/core/*`) |
| Integration | Several systems on one `GameState` across fixed steps in SAD §5 wiring order (input drain → weapon → hit/score → spawn → round end-check); pointer gating with simulated DOM events | Vitest (jsdom env only where DOM events are involved) |
| Contract | N/A — no server, no inter-service boundary (PRD N2) | — |
| E2E | Real browser: load bundle, play a scripted round, assert score/round-end on screen | Playwright (chromium) — 1-2 smoke flows; full AC walkthrough stays manual per T-11 |
| NFR verification | PRD §6 numbers: FPS, input→hit latency, 60↔144 Hz drift, aim error, initial load | Scripted-wave harness (T-11) + browser profiler + Lighthouse; drift and aim error also covered by automated unit tests (see below) |

## AC coverage

| AC | Test(s) | Level |
|---|---|---|
| AC-01 fire → hit → remove + feedback | `weapon.fire` consumes shell and kills the resolved demon; `hit.resolve` returns the demon under the crosshair; fire-intent → kill across one fixed step (Flow 1); Playwright smoke `play-round.spec` (fire at demon → score changes) | unit + integration + E2E |
| AC-02 fire blocked mid-reload | `weapon.tryFire` while `status='reloading'` → blocked, `shellsLoaded` unchanged; full reload cycle across fixed steps with a fire attempt mid-reload (Flow 5) | unit + integration |
| AC-03 score = flat non-decreasing sum | `score.addKill` adds exactly `DemonType.pointValue`; sequence of kills of both types → score equals plain sum, never decreases | unit |
| AC-04 round end freezes + shows total | `round.checkEnd` on `resolvedCount = scheduledCount` and on `timeLeftMs = 0` → `status='ended'`; post-end fixed steps mutate nothing (freeze) | unit + integration |
| AC-04b final kill counted before freeze | single-step ordering test: kill resolving in the same fixed step as the end-condition → score includes it before `status='ended'` (Flow 4 ordering, wired in T-11) | integration |
| AC-05 escape → despawn + miss | demon at `progress = 1.0` un-killed → removed from `state.demons`, `round.misses` +1, `resolvedCount` +1 | unit |
| AC-06 front-most by z wins | two overlapping demons at different `z` → `hit.resolve` returns nearest by `z` only; the other stays live | unit |
| AC-07 unfocused / out-of-area click ignored | pointer gating: click while tab blurred or pointer outside canvas → no fire intent enqueued, no shell consumed (jsdom events) | integration |

Every PRD AC additionally gets a manual walkthrough pass in T-11 (AC-T11-1) against the SAD §6 flow scripts — that is release evidence, not a substitute for the automated tests above.

## Edge cases / error paths

- Rapid clicks across the reload boundary (last shell + immediate clicks) → exactly one shell consumed, all mid-reload attempts blocked, weapon ready after `RELOAD_MS` (Flow 5, T-11 edge case).
- Fire with no demon under the crosshair → shell consumed, `Shot.outcome='miss'`, score unchanged, `round.misses` unchanged (miss ≠ escape, CONTEXT glossary).
- Two overlapping demons at **equal** `z` → hit resolves deterministically to exactly one demon (tie-break rule locked in the test).
- Kill and path-end in the same fixed step → demon resolves exactly once (killed, not double-counted as escape); `resolvedCount` +1.
- Timer expires with live demons on field → round ends, live demons do not add misses beyond the resolved rule in ADR-0004; `resolvedCount` stops advancing after freeze.
- Empty/exhausted wave schedule → spawn system is a no-op, no crash; round ends by counters or timer.
- Loop accumulator with a huge frame delta (tab back from background) → clamped: no unbounded step burst (ADR-0002).
- Sprite asset fails to load → fail-soft render fallback, no crash (SAD §8 error handling); covered by an integration test with a failing loader stub.
- Refresh mid-round → clean reset, no residue (manual check in T-11; nothing persists by contract).

## Test data

- **Strategy:** code factories per data-model.md §Test fixtures — `makeDemon(overrides?)`, `makeRound(overrides?)`, `makeGameState(overrides?)`, plus `makeWaveSchedule(slots)` for deterministic spawn timing. Factories live in test code, never in `src/`.
- Static config in tests uses small explicit fixtures (2 demon types, 1-2 short paths) rather than the real tuned config — tests must not break when gameplay values are tuned (SAD §11 accepted debt).
- Time is always driven by explicit fixed-step ticks (`advance(state, N_STEPS)` helper) — never wall-clock, never fake timers over `Date` (ADR-0002).
- **Cleanup:** fresh `GameState` from the factory per test; no shared module state. Playwright: fresh page load per test — all state is ephemeral by contract, so reload *is* the cleanup.

## NFR validation

| NFR (PRD §6) | How verified | Automated? |
|---|---|---|
| ≥ 30 FPS under wave (frame-time p95 ≤ 33.3 ms) | scripted-wave harness (~30 demons) + rAF frame-time capture in profiler (T-11 step 3) | manual, numbers recorded in PR |
| Input→shot latency ≤ 50 ms | in-engine timestamp delta `Shot.firedAtMs` → hit resolution, logged by the harness | manual, numbers recorded in PR |
| Timing drift ≤ 1% between 60↔144 Hz | unit test: feed the accumulator synthetic frame sequences at 16.67 ms vs 6.94 ms → identical simulated elapsed time within 1% | **automated (Vitest)** |
| Aim error ≤ 2 px across DPR/resize | unit test: crosshair→world mapping at DPR 1/2 and after resize → error ≤ 2 px | **automated (Vitest)** |
| Initial load ≤ 3 s broadband | Lighthouse run against the built bundle (T-11 step 3) + bundle size budget ≤ ~3 MB checked at build | manual + build-time size check |

## Coverage targets

Critical paths over percentages: every AC row above must stay green — that is the gate.
Guideline: ≥ 80% line coverage in `src/systems/` + `src/core/` (pure logic — cheap to cover); no coverage target for `src/render/` and `src/assets/` (verified via E2E smoke + manual walkthrough).

## E2E environment

- `vite build` + `vite preview` serves the static bundle; Playwright (chromium) runs against it. No docker, no external services.
- Cleanup = page reload (all state ephemeral, PRD §6.1). No fixtures to tear down.
- E2E scope stays at 1-2 smoke flows (load → fire → score visible → round ends); the exhaustive AC walkthrough and NFR measurement pass remain the manual T-11 gate.

## CI

- **Every PR:** `vitest run` (unit + integration) + `tsc --noEmit` + ESLint.
- **PR to master (or pre-release):** Playwright smoke against the built bundle.
- **Release (T-11 DoD):** manual NFR measurement pass; the five PRD §6 numbers recorded in the PR description.

## Related

- [PRD.md](./PRD.md) §5 AC, §6 NFR — the source of every mapping row above.
- [sad.md](./sad.md) §6 flows (integration scripts), §10 quality scenarios (verify methods).
- [data-model.md](./data-model.md) §Test fixtures — factory contract.
- [tasks/T-11-wiring-and-e2e.md](./tasks/T-11-wiring-and-e2e.md) — manual walkthrough + NFR evidence gate.
- Next stage: implementation waves per [tasks/tracker.md](./tasks/tracker.md), tests written against this plan.
