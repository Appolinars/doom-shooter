// Test fixtures — data-model.md §Test fixtures. Factories live in TEST code only,
// never in config/state modules. Each call returns a fresh, contract-valid default;
// per-test overrides apply with no shared global state between tests.

import type { Demon, GameState, Round, Shot, Weapon, FireIntent } from '../src/core/state.ts';
import { ROUND_DURATION_MS, SHELL_CAPACITY, WAVE_SCHEDULE } from '../src/core/config.ts';

export function makeRound(overrides: Partial<Round> = {}): Round {
  return {
    status: 'running',
    score: 0,
    misses: 0,
    timeLeftMs: ROUND_DURATION_MS,
    scheduledCount: WAVE_SCHEDULE.length,
    resolvedCount: 0,
    ...overrides,
  };
}

export function makeWeapon(overrides: Partial<Weapon> = {}): Weapon {
  return {
    shellsLoaded: SHELL_CAPACITY,
    status: 'ready',
    reloadRemainingMs: 0,
    ...overrides,
  };
}

export function makeDemon(overrides: Partial<Demon> = {}): Demon {
  return {
    id: 1,
    typeId: 1,
    pathId: 1,
    progress: 0,
    x: 150,
    y: 300,
    z: 1,
    ...overrides,
  };
}

export function makeShot(overrides: Partial<Shot> = {}): Shot {
  return {
    firedAtMs: 0,
    aimX: 0,
    aimY: 0,
    outcome: 'hit',
    ...overrides,
  };
}

export function makeFireIntent(overrides: Partial<FireIntent> = {}): FireIntent {
  return {
    aimX: 0,
    aimY: 0,
    atMs: 0,
    ...overrides,
  };
}

export function makeGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    round: makeRound(),
    weapon: makeWeapon(),
    demons: [],
    shots: [],
    fireIntents: [],
    ...overrides,
  };
}
