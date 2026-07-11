---
id: T-04
epic: game-feel
project: doom-shooter
wave: 2
priority: P1
estimate: M
blocks: [T-05]
blocked_by: []
status: done
context_budget: 4500
created: 2026-07-06
owner: Maksym Vakulenko
---

# T-04 — Web Audio graph, armed on the first gesture

## Goal

Stand up the new `src/audio/audio.ts` module (ADR-0003): one `AudioContext` with a `masterGain → sfxGain` graph and a **reserved but unconnected `musicGain` seam** for a future streamed track. The context is created suspended and **armed (`resume()`) on the first user gesture**; before arming, any play request is a **silent no-op** (never throws — AC-07). A voice-pool cap constant bounds concurrent SFX voices so overlapping deaths + rapid fire never distort (PRD §6). This task builds the graph + arming + voice accounting only; buffer loading and `play(key)` are T-05.

## Linked artifacts

- [[../adr/0003-web-audio-graph-armed-on-first-gesture.md]] — single `AudioContext`, `masterGain→sfxGain` now, `musicGain` reserved; arm on first gesture.
- [[../PRD.md]] AC-07 (first gesture arms audio; pre-gesture is silent, never errors), §6 NFR "Audio overlap safety" (voice pool cap).
- [[../sad.md]] §5 (`audio/audio.ts ● AudioContext, masterGain→sfxGain(+ reserved musicGain), voice cap`), §8 (Audio arming + Voice-pool cap crosscutting rows), §11 accepted debt (music seam only, no track).

## Acceptance criteria

**AC-T04-1 (arm on first gesture, PRD AC-07)**
Given the page has loaded and no gesture has occurred
When `armOnFirstGesture()` receives the first user gesture
Then the `AudioContext` resumes exactly once and subsequent play requests are audible; a second gesture does not re-arm or duplicate the graph.

**AC-T04-2 (pre-arm silent no-op, PRD AC-06/AC-07)**
Given audio is not yet armed
When a play request arrives
Then it is a silent no-op — no exception, no queue that later floods.

**AC-T04-3 (voice cap, PRD §6)**
Given the voice-pool cap is `N`
When more than `N` SFX are requested concurrently
Then at most `N` voices sound at once (oldest/lowest-priority dropped per the chosen policy) — no unbounded node growth.

**AC-T04-4 (music seam reserved, ADR-0003)**
Given the graph is built
Then a `musicGain` node exists under `masterGain` with no source connected, and adding a future `HTMLMediaElement` source needs no change to the SFX path.

## Atomic checklist

- [x] Step 1: `audio.ts` — create suspended `AudioContext`; build `masterGain → sfxGain`; create reserved `musicGain → masterGain` (no source).
- [x] Step 2: `armOnFirstGesture()` — idempotent `resume()` on the first `pointerdown`/`click`; expose `isArmed()`.
- [x] Step 3: voice-pool accounting — cap constant + active-voice tracking + drop policy (documented: steal-oldest, `VOICE_CAP = 8`).
- [x] Step 4: fail-soft guards — if `AudioContext` is unavailable, the module degrades to all-silent no-ops (never throws).
- [x] Step 5: unit tests — arm-once idempotency; pre-arm play = no-op/no-throw; voice cap under a burst; `musicGain` present + unconnected. (Mock/stub Web Audio nodes.)

## Edge cases

| Case | Expected |
|---|---|
| Browser without Web Audio | module loads, every call is a silent no-op (fail-soft, AC-06) |
| Gesture fires while `resume()` promise pending | second call is a no-op; no double-arm |

## DoD

- Graph + arm-on-gesture + voice cap + reserved music seam implemented; unit tests green with a stubbed audio context; no `play(key)` yet (T-05); the wiring of the gesture listener into `main.ts` is deferred to T-09.
