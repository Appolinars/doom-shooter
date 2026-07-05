// Weapon system (US-01/02, AC-02, SAD §6 Critical flow 2 + Flow 5) — drains the fire
// intents queued this fixed step, gates them on reload state, consumes shells, and
// runs the reload timer to completion on the fixed step (ADR-0002: never wall-clock).
// Hit resolution / scoring / feedback Shots are NOT here: a valid fire is handed to
// the injected `onFire` resolver (T-07's contract, stubbed to a no-op for this PR).
//
// Not-ready cue (Step 4): there is no separate flag — `weapon.status === 'reloading'`
// IS the not-ready state the renderer (T-09) reads. A `ready` weapon always holds at
// least one shell (spending the last one starts the reload below), so `status` alone
// tells the renderer whether a fire attempt would be blocked (AC-02).

import type { FireIntent, GameState, Weapon } from '../core/state.ts';
import { RELOAD_DURATION_MS, SHELL_CAPACITY } from '../core/config.ts';

/**
 * The T-07 seam. The weapon owns shells, reload and gating only; what a fired shot
 * *hits* (front-most demon by z, AC-06), the score it adds and the transient `Shot`
 * it leaves behind are T-07's contract. Called once per valid fire, in FIFO order.
 */
export type FireResolver = (params: { state: GameState; fire: FireIntent }) => void;

const noopResolver: FireResolver = () => {};

/**
 * Advance an in-progress reload by one fixed step. On (or past) completion the timer
 * lands on 0, shells refill to capacity, and the weapon returns to `ready` (Flow 5).
 * A no-op while `ready` — nothing to advance.
 */
const advanceReload = ({ weapon, fixedDtMs }: { weapon: Weapon; fixedDtMs: number }): void => {
  if (weapon.status !== 'reloading') {
    return;
  }
  weapon.reloadRemainingMs -= fixedDtMs;
  if (weapon.reloadRemainingMs <= 0) {
    weapon.shellsLoaded = SHELL_CAPACITY;
    weapon.status = 'ready';
    weapon.reloadRemainingMs = 0;
  }
};

export interface StepWeaponParams {
  state: GameState;
  fixedDtMs: number;
  onFire?: FireResolver;
}

/**
 * One fixed step of the weapon system:
 *   1. advance any in-progress reload — so a fire on the exact completion step fires
 *      (reload resolves before intents; T-06 edge case),
 *   2. drain the fire intents in FIFO order: a `reloading` weapon blocks the shot with
 *      no shell consumed (AC-02); a `ready` weapon spends one shell and resolves the
 *      fire, and spending the last shell immediately starts the reload — so any later
 *      intents this step are blocked (out of shells).
 *
 * The intent queue is fully drained each step whether fired or blocked (data-model
 * "drained once per fixed step").
 */
export const stepWeapon = ({ state, fixedDtMs, onFire = noopResolver }: StepWeaponParams): void => {
  const weapon = state.weapon;

  advanceReload({ weapon, fixedDtMs });

  for (const fire of state.fireIntents) {
    if (weapon.status === 'reloading') {
      continue;
    }
    weapon.shellsLoaded -= 1;
    onFire({ state, fire });
    if (weapon.shellsLoaded === 0) {
      weapon.status = 'reloading';
      weapon.reloadRemainingMs = RELOAD_DURATION_MS;
    }
  }

  state.fireIntents = [];
};
