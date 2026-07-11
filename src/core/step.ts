// Per-step driver (T-11) — the one place that fixes the order the systems mutate GameState
// on each fixed step (data-model note: "this task fixes the per-step system order"). DOM-free
// so the whole integration is unit-testable; main.ts just hands it the loop's fixed dt.
//
// Order (SAD §6 Flow 4, AC-04b): weapon → spawn → round end-check.
//   - weapon drains the fire intents queued by input since the last step and, via the
//     resolveFire seam, applies hits/score (input-drain → weapon → hit/score in one call);
//   - spawn then advances demons, resolves escapes and spawns due slots;
//   - round runs LAST so a kill's score-add is committed before the end-condition can freeze
//     the round on the same step (AC-04b: round ends mid-shot, the shot still counts).
//
// The weapon+spawn pair is gated by isRoundActive: once the round is `ended` only stepRound
// runs (a no-op freeze), so no shot, spawn or escape mutates a finished round.

import type { GameState } from './state.ts';
import type { SpawnCursor } from '../systems/spawn.ts';
import { stepWeapon } from '../systems/weapon.ts';
import { resolveFire } from '../systems/hit.ts';
import { stepSpawn } from '../systems/spawn.ts';
import { stepRound, isRoundActive } from '../systems/round.ts';

export interface AdvanceGameStepParams {
  state: GameState;
  cursor: SpawnCursor;
  fixedDtMs: number;
}

export const advanceGameStep = ({ state, cursor, fixedDtMs }: AdvanceGameStepParams): void => {
  if (isRoundActive(state.round)) {
    stepWeapon({ state, fixedDtMs, onFire: resolveFire });
    stepSpawn({ state, cursor, fixedDtMs });
  } else {
    // Clicks on a frozen round (paused or the result screen) must never fire on resume
    // (AC-T12-4) — drop the intents the gated weapon step would otherwise drain later.
    state.fireIntents.length = 0;
  }
  stepRound({ state, fixedDtMs });
};
