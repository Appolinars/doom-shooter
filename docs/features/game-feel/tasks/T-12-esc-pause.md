---
id: T-12
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

# T-12 — Esc pause: freeze the round, PAUSED overlay, Esc/Resume to continue

## Goal

Add a `paused` round status: pressing **Esc** during a `running` round freezes everything —
fixed-step systems, the round timer, render-side effect clocks — and shows a dimmed
**PAUSED** overlay with a **RESUME** button. Esc toggles back to `running`; the button does
the same. Esc on the result screen (`ended`) is a no-op. Pause is not a third one-way
state: `paused` sits between `running` states, `ended` stays the one-way freeze (ADR-0004).

## Linked artifacts

- [[../adr/0004-render-only-animation.md]] — the fixed step stays the only logic clock;
  pausing means the step driver skips mutations, not a second clock.
- [[../sad.md]] §6 Flow 4 — `isRoundActive` is already the freeze gate every system obeys;
  `paused` reuses it (only `running` is active).
- [[../PRD.md]] AC-07 (input scope gating — clicks during pause must not queue shots).

## Acceptance criteria

**AC-T12-1 (Esc pauses a running round)**
Given the round is `running`
When Esc is pressed
Then status becomes `paused`: no demon moves, the timer holds, no shot fires, effect
animations freeze, and the PAUSED overlay + RESUME button appear.

**AC-T12-2 (Esc or RESUME resumes)**
Given the round is `paused`
When Esc is pressed or RESUME is clicked
Then status returns to `running` and the round continues from the exact frozen state —
timer, demons, pump progress all where they were.

**AC-T12-3 (Esc on the result screen is a no-op)**
Given the round is `ended`
When Esc is pressed
Then nothing changes — status stays `ended`, the result screen stays up.

**AC-T12-4 (no shot leaks through the pause)**
Given the round is `paused`
When the player clicks the play area and then resumes
Then no queued fire intent goes off on resume.

## Atomic checklist

- [ ] Step 1: `state.ts` — `RoundStatus` gains `'paused'`; `round.ts` `stepRound` freezes
      (early-return) for any non-`running` status; add `togglePause` (running ⇄ paused,
      `ended` no-op).
- [ ] Step 2: `step.ts` — while the round is inactive, drop queued fire intents so clicks
      during pause (or the result screen) never fire on resume.
- [ ] Step 3: renderer — `PAUSED` dim overlay pass when `status === 'paused'`.
- [ ] Step 4: main.ts — Esc keydown → `togglePause`; `#resume` button (index.html) shown
      only while paused; freeze the render-side clocks (`effects.advance`, shot-cue prune)
      while paused.
- [ ] Step 5: unit tests — toggle transitions incl. `ended` no-op; frozen step (timer,
      weapon, spawn untouched); intent-drop; paused overlay draw.

## Edge cases

| Case | Expected |
|---|---|
| Esc held / repeated fast | each keydown toggles; state is always exactly `running` or `paused` |
| Round timer at 1 step left, pause, resume | round ends on the first resumed step, not during pause |
| Pause mid-pump | `pumpRemainingMs` holds; pump completes after resume |
| Mid-flight death/splat animation at pause | frozen mid-frame, finishes after resume (effects clock stops) |

## DoD

- Esc/RESUME toggle running ⇄ paused; `ended` unaffected; nothing mutates during pause
  (systems, timer, effects, shot cues); no intent leaks; overlay drawn; tests green.
