// Round system (US-04, AC-04/AC-04b, ADR-0004, SAD §6 Critical flow 4) — runs the round
// clock on the fixed step and ends the round when every scheduled demon is resolved OR
// the timer expires, whichever comes first. Ending is a one-way freeze: `isRoundActive`
// is the gate the step driver (T-11) reads to skip weapon/spawn/hit mutations once ended.
//
// This module never scans demons or the schedule — the end-condition compares the two
// O(1) counters `resolvedCount` vs `scheduledCount` (data-model Round access pattern).
// Timer-end does NOT convert the live demons into misses: escape ≠ timer-end (ADR-0004,
// AC-T08-3); only spawn.ts records misses, and only on an actual escape.

import type { GameState, Round } from '../core/state.ts';

/**
 * The freeze gate the step driver checks before running weapon/spawn/hit each step
 * (Step 2). A `running` round is live; an `ended` one is frozen — no system mutates it.
 */
export const isRoundActive = (round: Round): boolean => round.status === 'running';

/** All scheduled demons killed or escaped — the AC-04 all-resolved branch. */
const allResolved = (round: Round): boolean => round.resolvedCount >= round.scheduledCount;

/**
 * The end-of-step round update, called last in a fixed step so the final kill's
 * score-add (weapon → hit → score) is already applied before the freeze — this ordering
 * is what guarantees AC-04b (SAD §6 Flow 4: score-add precedes end-condition). A no-op
 * once `ended` (idempotent freeze).
 *
 * Order within the step: decrement the clock, then read it in the end-check so a step
 * that exhausts the timer ends the round on the same step (AC-T08-3).
 */
export const stepRound = ({ state, fixedDtMs }: { state: GameState; fixedDtMs: number }): void => {
  const round = state.round;
  if (round.status === 'ended') {
    return;
  }

  round.timeLeftMs = Math.max(0, round.timeLeftMs - fixedDtMs);

  if (allResolved(round) || round.timeLeftMs <= 0) {
    round.status = 'ended';
  }
};
