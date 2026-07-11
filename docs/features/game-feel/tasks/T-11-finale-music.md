---
id: T-11
epic: game-feel
project: doom-shooter
wave: 5
priority: P2
estimate: S
blocks: []
blocked_by: [T-09]
status: todo
context_budget: 4000
created: 2026-07-11
owner: Maksym Vakulenko
---

# T-11 — Round-end finale music through the musicGain seam

## Goal

Add `src/audio/music.ts` on top of the T-04 graph: fetch + `decodeAudioData` the single
track `assets/audio/shooting-range-finale.wav` and expose `play()` / `stop()` that drive
one **looping** `AudioBufferSourceNode` through the reserved `musicGain` seam (ADR-0003 —
this task is exactly the "future streamed track" the seam was built for). The track starts
when the round transitions `running → ended` (observed by wiring, ADR-0004 style: no
events on the fixed step) and loops on the result screen until "Try again" stops it.
Same fail-soft contract as SFX: missing/un-decodable file logs once, `play()` stays a
silent no-op, never blocks the round (PRD AC-06).

## Linked artifacts

- [[../adr/0003-web-audio-graph-armed-on-first-gesture.md]] — the source-less `musicGain`
  seam this task fills; music never touches the SFX path or the voice cap.
- [[../adr/0004-render-only-animation.md]] — round-end is detected by observing the state
  transition per frame (wiring.ts diff pattern), not by an event from the fixed step.
- [[../PRD.md]] AC-06 (missing sound → silence, never crash), AC-10 (retry rebuilds the
  round with zero leaked state — the finale must not keep playing into the new round).

## Acceptance criteria

**AC-T11-1 (finale starts on round end)**
Given audio is armed and the finale track is loaded
When the round status transitions `running → ended`
Then exactly one looping source plays through `musicGain` (not `sfxGain`, not the voice pool).

**AC-T11-2 (loops until retry, stops on retry)**
Given the finale is playing on the result screen
When "Try again" restarts the round
Then the source is stopped and the new round starts silent; a later round end starts it again.

**AC-T11-3 (fail-soft, PRD AC-06)**
Given the track is missing, un-decodable, or audio is un-armed/unavailable
When the round ends
Then `play()` is a silent no-op (logged once at load time for asset failures) and never throws.

## Atomic checklist

- [ ] Step 1: `music.ts` — `loadMusic({ bus })`: fetch + decode the finale WAV, log-once
      fail-soft, `loaded` promise (same shape as `loadSfx`).
- [ ] Step 2: `play()` — looping bufferSource → `musicGain`; idempotent while already
      playing; `stop()` stops and forgets the source.
- [ ] Step 3: wiring — `createFeedbackWiring` gets `onRoundEnd`; `syncFrame` fires it once
      per `running → ended` transition; `reset()` re-arms it for the next round.
- [ ] Step 4: retry — `restartRound` stops the finale (new optional `stopFinale` seam).
- [ ] Step 5: unit tests — transition fires once; loop flag + musicGain routing; stop on
      retry; missing-track and un-armed no-op paths.

## Edge cases

| Case | Expected |
|---|---|
| Round ends before the track finished decoding | silent this round-end; audible on the next one (live-swap, same as SFX/sprites) |
| Double `play()` (e.g. two frames observe `ended`) | single source — no doubled track |
| `stop()` when nothing plays | no-op, never throws |

## DoD

- Finale loops through `musicGain` from round end until retry; SFX path and voice cap
  untouched; fail-soft paths tested; wiring transition fires exactly once per round end.
