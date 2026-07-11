// Weapon system (US-01, AC-02, SAD §6 Critical flow 1) — drains the fire intents
// queued this fixed step and gates them on the pump state (game-feel ADR-0002): every
// shot enters `pumping`, and the pump timer runs to completion on the fixed step
// (ADR-0002: never wall-clock). Ammo is unlimited — the pump is the only gate (PRD §1
// amendment). Hit resolution / scoring / feedback Shots are NOT here: a valid fire is
// handed to the injected `onFire` resolver (hit.ts's contract).
//
// Not-ready cue: there is no separate flag — `weapon.status === 'pumping'` IS the
// not-ready state the renderer (T-08) reads, so `status` alone tells the renderer
// whether a fire attempt would be blocked (AC-02).

import type { FireIntent, GameState, Weapon } from '../core/state.ts';
import { PUMP_DURATION_MS } from '../core/config.ts';

/**
 * The hit-resolution seam. The weapon owns the pump gate only; what a fired shot
 * *hits* (front-most demon by z, AC-06), the score it adds and the transient `Shot`
 * it leaves behind are hit.ts's contract. Called once per valid fire, in FIFO order.
 */
export type FireResolver = (params: { state: GameState; fire: FireIntent }) => void;

const noopResolver: FireResolver = () => {};

/**
 * Advance an in-progress pump by one fixed step. On (or past) completion the timer
 * lands on 0 and the weapon returns to `ready`. A no-op while `ready`.
 */
const advancePump = ({ weapon, fixedDtMs }: { weapon: Weapon; fixedDtMs: number }): void => {
  if (weapon.status !== 'pumping') {
    return;
  }
  weapon.pumpRemainingMs -= fixedDtMs;
  if (weapon.pumpRemainingMs <= 0) {
    weapon.status = 'ready';
    weapon.pumpRemainingMs = 0;
  }
};

export interface StepWeaponParams {
  state: GameState;
  fixedDtMs: number;
  onFire?: FireResolver;
}

/**
 * One fixed step of the weapon system:
 *   1. advance any in-progress pump — so a fire on the exact completion step fires
 *      (pump resolves before intents; deterministic ordering, T-03 edge case),
 *   2. drain the fire intents in FIFO order: a `pumping` weapon blocks the shot,
 *      dropped with no state change (AC-02); a `ready` weapon resolves the fire and
 *      immediately enters `pumping` — so any later intents this step are blocked.
 *
 * The intent queue is fully drained each step whether fired or blocked (data-model
 * "drained once per fixed step").
 */
export const stepWeapon = ({ state, fixedDtMs, onFire = noopResolver }: StepWeaponParams): void => {
  const weapon = state.weapon;

  advancePump({ weapon, fixedDtMs });

  for (const fire of state.fireIntents) {
    if (weapon.status === 'pumping') {
      continue;
    }
    onFire({ state, fire });
    weapon.status = 'pumping';
    weapon.pumpRemainingMs = PUMP_DURATION_MS;
  }

  state.fireIntents = [];
};
