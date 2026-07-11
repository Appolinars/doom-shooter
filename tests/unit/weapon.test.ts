// Weapon = two-state pump gate (game-feel T-03, ADR-0002): unlimited ammo, every shot
// enters `pumping`, and the pump timer is the only fire gate — on the fixed step only.
// These tests replaced the base game's reload/shell suite when the magazine was removed
// (PRD §1 amendment).

import { describe, it, expect, vi } from 'vitest';
import { stepWeapon, type FireResolver } from '../../src/systems/weapon.ts';
import { PUMP_DURATION_MS } from '../../src/core/config.ts';
import { STEP_MS } from '../../src/core/loop.ts';
import { makeGameState, makeWeapon, makeFireIntent } from '../factories.ts';
import type { GameState } from '../../src/core/state.ts';

/** Drive `stepWeapon` over `steps` empty fixed steps (no new intents), advancing the pump. */
const idle = ({ state, steps }: { state: GameState; steps: number }): void => {
  for (let i = 0; i < steps; i++) {
    stepWeapon({ state, fixedDtMs: STEP_MS });
  }
};

describe('AC-T03-1 — fire while pumping is blocked and dropped (PRD AC-02)', () => {
  it('blocks the shot with no state change and never calls the fire resolver', () => {
    const state = makeGameState({
      weapon: makeWeapon({ status: 'pumping', pumpRemainingMs: PUMP_DURATION_MS }),
      fireIntents: [makeFireIntent()],
    });
    const onFire = vi.fn();

    stepWeapon({ state, fixedDtMs: STEP_MS, onFire });

    expect(state.weapon.status).toBe('pumping');
    expect(onFire).not.toHaveBeenCalled();
    expect(state.fireIntents).toHaveLength(0);
  });
});

describe('AC-T03-2 — a ready fire always succeeds, then enters the pump', () => {
  it('resolves the shot this step and starts the full pump timer (no ammo concept)', () => {
    const state = makeGameState({ fireIntents: [makeFireIntent()] });
    const onFire = vi.fn();

    stepWeapon({ state, fixedDtMs: STEP_MS, onFire });

    expect(onFire).toHaveBeenCalledTimes(1);
    expect(state.weapon.status).toBe('pumping');
    expect(state.weapon.pumpRemainingMs).toBe(PUMP_DURATION_MS);
  });

  it('never runs out: every pump cycle ends in another successful fire (rapid-fire spam)', () => {
    const state = makeGameState();
    const onFire = vi.fn();
    const stepsPerPump = Math.ceil(PUMP_DURATION_MS / STEP_MS);

    for (let volley = 0; volley < 20; volley++) {
      state.fireIntents.push(makeFireIntent({ atMs: volley }));
      stepWeapon({ state, fixedDtMs: STEP_MS, onFire });
      idle({ state, steps: stepsPerPump });
    }

    expect(onFire).toHaveBeenCalledTimes(20);
  });
});

describe('AC-T03-3 — deterministic pump timer on the fixed step', () => {
  it('counts down by exactly the fixed-step delta and returns to ready at ≤ 0', () => {
    const state = makeGameState({
      weapon: makeWeapon({ status: 'pumping', pumpRemainingMs: PUMP_DURATION_MS }),
    });

    stepWeapon({ state, fixedDtMs: STEP_MS });
    expect(state.weapon.pumpRemainingMs).toBe(PUMP_DURATION_MS - STEP_MS);

    const stepsToFinish = Math.ceil((PUMP_DURATION_MS - STEP_MS) / STEP_MS);
    idle({ state, steps: stepsToFinish });

    expect(state.weapon.status).toBe('ready');
    expect(state.weapon.pumpRemainingMs).toBe(0);
  });

  it('stays pumping one step before the timer elapses', () => {
    const state = makeGameState({
      weapon: makeWeapon({ status: 'pumping', pumpRemainingMs: PUMP_DURATION_MS }),
    });

    const stepsToFinish = Math.ceil(PUMP_DURATION_MS / STEP_MS);
    idle({ state, steps: stepsToFinish - 1 });

    expect(state.weapon.status).toBe('pumping');
  });
});

describe('T-03 edge — fire on the exact step the pump completes', () => {
  it('resolves the pump first, then fires the queued intent (deterministic ordering)', () => {
    const state = makeGameState({
      weapon: makeWeapon({ status: 'pumping', pumpRemainingMs: STEP_MS }),
      fireIntents: [makeFireIntent()],
    });
    const onFire = vi.fn();

    stepWeapon({ state, fixedDtMs: STEP_MS, onFire });

    expect(onFire).toHaveBeenCalledTimes(1);
    expect(state.weapon.status).toBe('pumping');
    expect(state.weapon.pumpRemainingMs).toBe(PUMP_DURATION_MS);
  });
});

describe('multiple intents in one step', () => {
  it('fires the first, then the fresh pump blocks the rest', () => {
    const state = makeGameState({
      fireIntents: [makeFireIntent({ atMs: 1 }), makeFireIntent({ atMs: 2 }), makeFireIntent({ atMs: 3 })],
    });
    const fired: number[] = [];
    const onFire: FireResolver = ({ fire }) => fired.push(fire.atMs);

    stepWeapon({ state, fixedDtMs: STEP_MS, onFire });

    expect(fired).toEqual([1]);
    expect(state.weapon.status).toBe('pumping');
  });
});

describe('intent queue drain', () => {
  it('empties fireIntents every step, whether fired or blocked', () => {
    const fired = makeGameState({ fireIntents: [makeFireIntent()] });
    stepWeapon({ state: fired, fixedDtMs: STEP_MS });
    expect(fired.fireIntents).toHaveLength(0);

    const blocked = makeGameState({
      weapon: makeWeapon({ status: 'pumping', pumpRemainingMs: PUMP_DURATION_MS }),
      fireIntents: [makeFireIntent()],
    });
    stepWeapon({ state: blocked, fixedDtMs: STEP_MS });
    expect(blocked.fireIntents).toHaveLength(0);
  });
});
