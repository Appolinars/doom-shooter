# T-10 results — NFR + AC walkthrough (game-feel)

> Verification pass recorded 2026-07-12 on the wired build (T-09 + wave-5 T-11/T-12/T-13).
> Suites: **195 unit** (vitest) + **8 E2E** (Playwright, built bundle via `vite preview`) — all green.
> New evidence added by this task: `tests/unit/determinism-juice.test.ts`, `tests/e2e/game-feel.spec.ts`,
> and the `?e2e` latency instrumentation in `src/main.ts` (sfx log + effects snapshot, never installed
> on a normal page load).

## 1. AC matrix (AC-T10-1)

| PRD AC | Covered by | Kind |
|---|---|---|
| AC-01 shot feedback | `wiring.test.ts` AC-T09-1 (shoot SFX + viewmodel + splat), `effects.test.ts` AC-T06-4, `render.test.ts` T-08 viewmodel pass; E2E QG-1 `shoot` 16.0 ms | unit + E2E |
| AC-02 pump gates fire | `weapon.test.ts` AC-T03-1 (shot dropped, no state change); visible not-ready = pump frames (`render.test.ts` T-08 viewmodel); E2E QG-1 `pump` 16.0 ms | unit + E2E |
| AC-03 one HP per shot, score on 0 | `hit.test.ts` AC-T02-1 (alive + unscored), AC-T02-3 (non-decreasing, once per kill) | unit |
| AC-04 death anim + sound, score once | `wiring.test.ts` (kill → death SFX + visual), `effects.test.ts` AC-T06-3, `hit.test.ts` AC-T07-2; E2E QG-1 `death` 17.0 ms | unit + E2E |
| AC-05 spawn sound | `wiring.test.ts` (new demon id → spawn SFX), `spawn.test.ts` AC-T05-1; E2E QG-1 `spawn` 2.3 ms | unit + E2E |
| AC-06 fail-soft assets | `sprites.test.ts`, `sfx.test.ts`, `music.test.ts`, `backdrops.test.ts` fail-soft suites, `render.test.ts` placeholder fallbacks; E2E QG-3 (all assets blocked → full round + retry, 0 page errors) | unit + E2E |
| AC-07 first-gesture arm + render-only juice | `audio.test.ts` AC-T04-1 (armed exactly once), `effects.test.ts` AC-T06-1 (no GameState/system imports), `render.test.ts` AC-T08-1 (read-only); `determinism-juice.test.ts` (0-mutation + aim, §3) | unit |
| AC-08 hurt escape = normal miss | `hit.test.ts` AC-T02-4, `spawn.test.ts` AC-T05-2 | unit |
| AC-09 death anim across round-end freeze | `effects.test.ts` AC-T06-3 (plays on advanced time alone), `round.test.ts` one-way freeze, `step.test.ts` (frozen round mutates nothing) | unit |
| AC-10 retry resets everything | `wiring.test.ts` restartRound suite (zero leaked state, backdrop reroll, idempotent, finale stopped); E2E QG-1 `retry` 0.7 ms + QG-3 retry-with-no-assets | unit + E2E |

10/10 AC have green automated coverage — no manual-walkthrough gaps.

## 2. QG-1 — action → feedback latency ≤ 100 ms (AC-T10-2)

In-page probe (`game-feel.spec.ts`): delta from event injection to the SFX `play()` trigger
**and** the paired visual appearing in the effects store, measured inside the page (no
Playwright round-trips in the window). 6/6 actions paired:

| Action | Latency | Feedback pair |
|---|---|---|
| shoot | 16.0 ms | shoot SFX + muzzle flash/viewmodel |
| pump | 16.0 ms | weapon gate closed + viewmodel leaves idle |
| spawn | 2.3 ms | spawn SFX on next observed frame |
| hurt | 17.1 ms | hurt SFX + hit splat |
| death | 17.0 ms | death SFX + death visual |
| retry | 0.7 ms | fresh zeroed round rendered |

All ≤ 100 ms — the worst case is one fixed step + one frame, as designed (ADR-0004).
Note: pump has no authored SFX (assets-manifest §3.1 dropped it); its pair is gate + animation.

## 3. QG-2 — determinism + FPS with juice (AC-T10-3)

- **Stress-wave frame time:** 30 demons + continuous fire (viewmodel + splats + overlapping
  death visuals) + backdrop for 4 s → **60 FPS, frame p95 18 ms** (target ≤ 33.3 ms). Base
  NFR re-run: 30-demon wave without scripted fire → 60 FPS, p95 18.1 ms.
- **0-mutation proof (`determinism-juice.test.ts`):** a full 30 s scripted round produces a
  **deep-equal GameState with juice on and off** (wiring diff + effects clock riding the
  render callback exactly as `main.ts` wires them), while the juiced run demonstrably fired
  shoot/spawn/death SFX and scored.
- **Drift with juice:** 60↔144 Hz logic-time drift ≤ 1% with the juice pipeline active
  (base AC-T03-1 re-run) — green.
- **Aim with juice:** crosshair→world mapping bit-identical before/after a full render with
  backdrop + splat + death + mid-pump viewmodel active, ≤ 2 px across resize (base AC-T04-2
  re-run) — green.

## 4. QG-3 — fail-soft + voice cap + load (AC-T10-4)

- **Assets blocked E2E:** every `/assets/{sprites,audio,backdrops}/` request aborted →
  page boots with 0 errors, wave spawns, a 3-shot kill resolves on placeholders + silence,
  round ends, retry rebuilds a fresh round. Green.
- **Voice cap:** `VOICE_CAP` steal-oldest policy audited at unit level under bursts
  (`audio.test.ts` AC-T04-3, `sfx.test.ts` rapid-play cap) — count never exceeds the cap,
  finished voices release slots; finale music bypasses the pool (`music.test.ts`).
  E2E stress run (QG-2 burst) completes with no page errors.
- **Initial load:** 150 ms to `loadEventEnd` on the built bundle (target ≤ 3000 ms) —
  round playable while assets stream in fail-soft.

## 5. Regressions caught by this pass

The T-13 fast-demon rebalance (1 → 3 HP) had silently broken two base E2E tests that
assumed a one-shot kill; both are updated to the current contract:

- `nfr.spec.ts` input→hit now polls the first resolved hit `Shot` (24 ms recorded) instead
  of the score.
- `play-round.spec.ts` clicks the demon's live position through the pump gate until the
  kill lands.

## Verdict

All four AC-T10 criteria met; QG-1/2/3 numbers recorded above. **Feature ready for the
ship stage.**
