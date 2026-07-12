---
status: Draft
owner: "Maksym Vakulenko"
reviewers: ["Tech Lead"]
updated_at: "2026-07-13"
feature_size: M
stage: "15"
ticket: "N/A (personal pet-project)"
---

# Test plan — survival-loop

<!-- Stage 15 → see SDLC/plugin/skills/plan-tests/SKILL.md -->

> **Adaptation note.** Same client-only adaptation as the base plan
> ([basic-shooting-range/test-plan.md](../basic-shooting-range/test-plan.md)): no DB
> (testcontainers N/A — the one persisted datum is localStorage, stubbed in unit tests and
> fault-injected in E2E), no inter-service boundary (contract tests N/A), no throughput NFR
> (classic load tests N/A — "load" = NFR verification against PRD §6). New this feature:
> the plan inherits a working suite (195 unit + 8 E2E) and must both extend it and
> **repair what the start screen breaks** — existing E2E assume the run auto-starts
> (SAD §11 known debt; the `?e2e` debug API gains a mode/auto-start parameter).

## Levels

| Level | Scope | Tooling |
|---|---|---|
| Unit | New pure systems over `GameState`: waves (generator + cap), damage, combo, fireball, rank; amended: hit (cross-kind), score (multiplied), round→run end-conditions; `storage/records.ts` with an injected storage stub | Vitest (node env) |
| Integration | Several systems across fixed steps in the `step.ts` order (waves → fireball → damage → run end-conditions) on one `GameState`; same-step ordering edges; retry reset; DOM mode-buttons + input gating (jsdom) | Vitest (node / jsdom where DOM is involved) |
| Contract | N/A — no server (stage-10 precedent); the localStorage schema contract is covered by `records.ts` unit tests per data-model §Storage | — |
| E2E | Real browser: start screen → mode pick → scripted run → end screen → retry; record persistence across reload; storage-blocked fail-soft run | Playwright (chromium) vs `vite preview` |
| NFR verification | PRD §6 numbers: late-wave FPS, input latency, hit-feedback latency, determinism drift, entity cap, fail-soft, load | in-page probes + stress scenario via `?e2e` API (game-feel T-10 pattern); drift/cap/aim automated in Vitest |

## AC coverage

| AC | Test(s) | Level |
|---|---|---|
| AC-01 breakthrough → despawn + HP−1 + feedback | `damage`: demon at `progress=1.0` un-killed → removed, `playerHp` −1 (no miss); wiring diff emits player-hit SFX/flash cue; E2E: let one demon through → HP indicator drops | unit + integration + E2E |
| AC-02 game over at 0 HP | run end-condition: hit at `playerHp=1` → `status='ended'`, `outcome='gameOver'`; post-end steps mutate nothing (freeze reused) | unit + integration |
| AC-02b same-step final kill counted before freeze | single-step ordering test: killing shot + fatal hit in one fixed step → score includes multiplied kill (+far-kill bonus) before freeze (step.ts order) | integration |
| AC-03 wave N+1 harder + number visible | `waves` generator pure fn: params(N+1) strictly harder than params(N) per escalation rule, for both modes; rollover integration: wave exhausted → N+1 spawns begin; HUD reads `wave.number` (E2E smoke) | unit + integration + E2E |
| AC-04 one-click retry, full reset, record retained | `restartRound` extension: fresh run same mode — HP full, score 0, combo base, wave 1, `demons`/`fireballs`/`shots`/`fireIntents` empty, in-memory record untouched; E2E: end → click retry → fresh run | unit + integration + E2E |
| AC-05 combo break resets multiplier, score untouched | `combo`: streak growth per kill; break on player hit and on escaped demon (NOT on missed shot) → multiplier=base, score unchanged, next kills at base | unit |
| AC-06 far-kill bonus + callout | `combo`/`score`: kill at `progress<0.5` → bonus on top of multiplied points; kill past midpoint → no bonus; wiring emits "SNIPED!" callout cue | unit + integration |
| AC-07 end screen shows rank + stats + best moment | `rank` pure fn: fixed table maps (score, stats) → D..S deterministically; boundary values hit each rank exactly once; best-moment line derived from `run.stats` | unit |
| AC-08 record beaten → NEW RECORD + survives reload | `records`: final > stored → write + beaten-flag; E2E: beat record → reload page → start screen/end screen shows the persisted record | unit + E2E |
| AC-09 records never compare across modes | `records`: survive60 run beats survive60 but not endless → survive60 updated, endless untouched (and vice versa) | unit |
| AC-10 storage unavailable/corrupt → session-only, never blocked | `records` fault injection: getItem throws / returns garbage JSON / setItem throws → defaults + session-only flag, no throw escapes; E2E: run with localStorage blocked AND with a corrupt value pre-seeded → end screen fully shown | unit + E2E |
| AC-11 first click picks mode + arms audio + starts run | jsdom: mode button click → `run.mode` set, `status='running'`, audio-bus arm called (existing arm-on-gesture seam); E2E: fresh page → click Endless → run starts, audio context armed | integration + E2E |
| AC-12 clicks on start/end screens mutate nothing | step gating: fire intents dropped while `status` ∈ {idle, ended} (extends the T-12 inactive-drop test); jsdom: play-area click on start screen → no intent enqueued, no state diff | unit + integration |
| AC-13 60s survived → win screen, final kill counted | run end-condition: `timeLeftMs=0` with `playerHp>0` → `outcome='won'` (not gameOver); same-step kill ordering mirror of AC-02b; endless: `timeLeftMs=null` never triggers the timer branch | unit + integration |
| AC-14 fireball shot down = harmless; landed = player hit | `fireball`: telegraph reaches 0 → fireball spawned; shot-down → despawn, score+0, combo streak unchanged (neither grown nor broken); `progress=1.0` → `playerHp` −1 + despawn | unit |
| AC-15 single hit resolves front-most across kinds | `hit`: demon and fireball overlapping under crosshair at different `z` → nearest-by-z wins regardless of kind; equal `z` → deterministic tie-break locked in the test | unit |

The exhaustive AC walkthrough against SAD §6 flows stays a manual pass in the final QG
task (T-10 pattern) — release evidence, not a substitute for the rows above.

## Edge cases / error paths

- Kill and breakthrough of the SAME demon in one fixed step → resolves exactly once (killed, no HP loss), counters consistent.
- Two fatal sources in one step (breakthrough demon + landed fireball at `playerHp=1`) → HP floors at 0, exactly one game-over transition, no double outcome.
- Entity cap edge: wave slot due while `demons+fireballs = 32` → spawn clamped (both spawn sites use the shared cap helper), no crash, escalation continues on other axes.
- Combo break in the same step as a kill (kill + player hit together) → AC-02b ordering: kill scores at the pre-break multiplier, then the break applies.
- Far-kill exactly AT the midpoint (`progress = 0.5`) → boundary locked in a test (not a far kill, per "not yet crossed the midpoint").
- Fireball shot down in the same step it would land → resolves exactly once (shot down wins per step order), no HP loss.
- Retry clicked twice rapidly / retry during the end-screen fade → idempotent restart (existing restartRound idempotence extends to the new fields).
- Record equal to stored best → NOT a new record (strictly greater), no write.
- localStorage quota exceeded on write (setItem throws) → swallowed, session-only, end screen intact.
- Survive60 at `timeLeftMs=0` AND `playerHp=0` in the same step → exactly one outcome per the step.ts order (locked in a test — the order is the spec).
- Zigzag path demon reaching `progress=1.0` → same breakthrough semantics as straight paths (path shape does not fork logic).
- Tab background → return (huge frame delta) during a run with active fireballs/waves → accumulator clamp holds; no step burst (extends base ADR-0002 test to new systems).

## Test data

- **Strategy:** code factories per data-model.md §Test fixtures — `makeRun(overrides?)`, `makeFireball(overrides?)`, `makeWaveState(overrides?)` added; `makeGameState`/`makeDemon` and every existing factory gain the new `Run` fields (ADR-0001 accepted mechanical diff).
- Small explicit config fixtures: 2-3 wave param sets, a tiny `COMBO_TABLE`, a 2-row `RANK_TABLE`, one shooter demon type — tests must survive gameplay tuning (the real curves are §11 tuning debt).
- `storage/records.ts` tests inject an in-memory storage stub (`getItem`/`setItem` + fault modes) — never real `window.localStorage` in unit tests.
- Time is fixed-step ticks only (`advance(state, N_STEPS)`), never wall-clock (ADR-0002).
- **Cleanup:** fresh `GameState` per test; Playwright — fresh page load per test, plus explicit `localStorage.clear()` in E2E setup (the record is the first state that now SURVIVES reload — reload alone is no longer full cleanup).

## NFR validation

| NFR (PRD §6) | How verified | Automated? |
|---|---|---|
| ≥ 30 FPS late waves (p95 ≤ 33.3 ms) with cap active | E2E stress: `?e2e` API fast-forwards to a late wave at the entity cap, frame-time capture (T-10 QG-2 pattern) | **automated (Playwright)** |
| Input→shot latency ≤ 50 ms | existing `nfr.spec` probe, re-based onto the new start flow | **automated (Playwright)** |
| Player-hit feedback ≤ 100 ms | in-page probe: damage tick → SFX/flash cue timestamp delta (T-10 QG-1 pattern) | **automated (Playwright)** |
| Determinism: drift ≤ 1% at 60↔144 Hz; waves/combo/fireballs fixed-step only, 0 wall-clock | extend the determinism suite: scripted long run → GameState deep-equal across Hz; static scan: no `Date.now`/`performance.now` in `src/systems/*` + `src/core/*` | **automated (Vitest)** |
| Entities ≤ 32 at any moment, any wave | long generated-run unit test (hundreds of waves, both modes) asserting the cap every step | **automated (Vitest)** |
| Record fail-soft: 100% runs reach end screen | E2E with storage blocked + corrupt-value run (AC-10 rows) | **automated (Playwright)** |
| Initial load ≤ 3 s | Lighthouse against the built bundle + bundle-size check at build | manual + build-time check |

## Coverage targets

Critical paths over percentages: every AC row above green = the gate. Guideline: ≥ 80%
lines in `src/systems/`, `src/core/`, `src/storage/`; no target for `src/render/` /
`src/assets/` (E2E smoke + manual walkthrough). The existing 195-unit suite must stay
green throughout — base invariants that the PRD amends (flat score → multiplied,
escape-miss → breakthrough hit) get their tests AMENDED deliberately in the task that
changes them, never silently (the T-10 lesson: 2 base E2E silently broken by fast=3HP).

## E2E environment

- Unchanged: `vite build` + `vite preview`, Playwright chromium. No docker, no services.
- **`?e2e` debug API must gain:** mode selection / auto-start (start screen otherwise
  blocks every existing scripted run — SAD §11), record read/seed hooks, wave
  fast-forward for the stress scenario. Budget for repairing existing E2E lives in
  break-tasks (SAD §11 row).
- Storage fault injection: Playwright init script overrides `localStorage` (throwing
  stub / pre-seeded corrupt JSON) before page load.
- Cleanup: fresh page load + `localStorage.clear()` per test.

## CI

- **Every PR:** `vitest run` + `tsc --noEmit` + ESLint.
- **PR to master / pre-release:** Playwright suite (smoke + record persistence + fail-soft + stress).
- **Release (final QG task):** manual AC walkthrough per SAD §6 flows + Lighthouse load number; PRD §6 numbers recorded in the task results file (T-10-results pattern).

## Related

- [PRD.md](./PRD.md) §5 AC, §6 NFR — source of every mapping row.
- [sad.md](./sad.md) §6 flows (integration scripts), §10 QG scenarios, §11 known-debt rows (E2E repair, tuning).
- [data-model.md](./data-model.md) §Test fixtures, §Storage (records contract under test).
- Next: security-review (stage 17; PRD §6.1 argues N/A — formalize) → break-tasks (stage 13).
