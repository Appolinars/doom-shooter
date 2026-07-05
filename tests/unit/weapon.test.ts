import { describe, it, expect, vi } from 'vitest';
import { stepWeapon, type FireResolver } from '../../src/systems/weapon.ts';
import { RELOAD_DURATION_MS, SHELL_CAPACITY } from '../../src/core/config.ts';
import { STEP_MS } from '../../src/core/loop.ts';
import { makeGameState, makeWeapon, makeFireIntent } from '../factories.ts';
import type { GameState } from '../../src/core/state.ts';

/** Drive `stepWeapon` over `steps` empty fixed steps (no new intents), advancing reload. */
const idle = ({ state, steps }: { state: GameState; steps: number }): void => {
  for (let i = 0; i < steps; i++) {
    stepWeapon({ state, fixedDtMs: STEP_MS });
  }
};

describe('AC-T06-1 — fire while reloading is blocked (PRD AC-02)', () => {
  it('blocks the shot, consumes no shell, and never calls the fire resolver', () => {
    const state = makeGameState({
      weapon: makeWeapon({ status: 'reloading', shellsLoaded: 0, reloadRemainingMs: RELOAD_DURATION_MS }),
      fireIntents: [makeFireIntent()],
    });
    const onFire = vi.fn();

    stepWeapon({ state, fixedDtMs: STEP_MS, onFire });

    expect(state.weapon.shellsLoaded).toBe(0);
    expect(state.weapon.status).toBe('reloading');
    expect(onFire).not.toHaveBeenCalled();
  });
});

describe('AC-T06-2 — reload cycle (SAD Flow 5)', () => {
  it('consumes the last shell, starts the reload, then refills to capacity on completion', () => {
    const state = makeGameState({
      weapon: makeWeapon({ shellsLoaded: 1 }),
      fireIntents: [makeFireIntent()],
    });
    const onFire = vi.fn();

    stepWeapon({ state, fixedDtMs: STEP_MS, onFire });

    expect(onFire).toHaveBeenCalledTimes(1);
    expect(state.weapon.shellsLoaded).toBe(0);
    expect(state.weapon.status).toBe('reloading');
    expect(state.weapon.reloadRemainingMs).toBe(RELOAD_DURATION_MS);

    const stepsToFinish = Math.ceil(RELOAD_DURATION_MS / STEP_MS);
    idle({ state, steps: stepsToFinish });

    expect(state.weapon.status).toBe('ready');
    expect(state.weapon.shellsLoaded).toBe(SHELL_CAPACITY);
    expect(state.weapon.reloadRemainingMs).toBe(0);
  });

  it('stays reloading one step before the timer elapses', () => {
    const state = makeGameState({
      weapon: makeWeapon({ status: 'reloading', shellsLoaded: 0, reloadRemainingMs: RELOAD_DURATION_MS }),
    });

    const stepsToFinish = Math.ceil(RELOAD_DURATION_MS / STEP_MS);
    idle({ state, steps: stepsToFinish - 1 });

    expect(state.weapon.status).toBe('reloading');
    expect(state.weapon.shellsLoaded).toBe(0);
  });
});

describe('AC-T06-2 edge — fire on the exact step the reload completes', () => {
  it('resolves the reload first, then fires the queued intent', () => {
    // One fixed step of reload left, and a fire queued for that same step.
    const state = makeGameState({
      weapon: makeWeapon({ status: 'reloading', shellsLoaded: 0, reloadRemainingMs: STEP_MS }),
      fireIntents: [makeFireIntent()],
    });
    const onFire = vi.fn();

    stepWeapon({ state, fixedDtMs: STEP_MS, onFire });

    expect(state.weapon.status).toBe('ready');
    expect(onFire).toHaveBeenCalledTimes(1);
    // refilled to capacity, then the shot spent one shell.
    expect(state.weapon.shellsLoaded).toBe(SHELL_CAPACITY - 1);
  });
});

describe('multiple intents in one step', () => {
  it('fires in order until out of shells, then blocks the rest (no negative shells)', () => {
    const state = makeGameState({
      weapon: makeWeapon({ shellsLoaded: 2 }),
      fireIntents: [makeFireIntent({ atMs: 1 }), makeFireIntent({ atMs: 2 }), makeFireIntent({ atMs: 3 })],
    });
    const fired: number[] = [];
    const onFire: FireResolver = ({ fire }) => fired.push(fire.atMs);

    stepWeapon({ state, fixedDtMs: STEP_MS, onFire });

    expect(fired).toEqual([1, 2]);
    expect(state.weapon.shellsLoaded).toBe(0);
    expect(state.weapon.status).toBe('reloading');
    expect(state.weapon.reloadRemainingMs).toBe(RELOAD_DURATION_MS);
  });
});

describe('intent queue drain', () => {
  it('empties fireIntents every step, whether fired or blocked', () => {
    const fired = makeGameState({ weapon: makeWeapon({ shellsLoaded: 5 }), fireIntents: [makeFireIntent()] });
    stepWeapon({ state: fired, fixedDtMs: STEP_MS });
    expect(fired.fireIntents).toHaveLength(0);

    const blocked = makeGameState({
      weapon: makeWeapon({ status: 'reloading', shellsLoaded: 0, reloadRemainingMs: RELOAD_DURATION_MS }),
      fireIntents: [makeFireIntent()],
    });
    stepWeapon({ state: blocked, fixedDtMs: STEP_MS });
    expect(blocked.fireIntents).toHaveLength(0);
  });
});

describe('ready weapon with shells to spare', () => {
  it('fires without starting a reload and leaves the shell count decremented', () => {
    const state = makeGameState({ weapon: makeWeapon({ shellsLoaded: SHELL_CAPACITY }), fireIntents: [makeFireIntent()] });

    stepWeapon({ state, fixedDtMs: STEP_MS });

    expect(state.weapon.status).toBe('ready');
    expect(state.weapon.shellsLoaded).toBe(SHELL_CAPACITY - 1);
    expect(state.weapon.reloadRemainingMs).toBe(0);
  });
});
