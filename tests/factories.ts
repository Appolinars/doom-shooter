// Test fixtures — data-model.md §Test fixtures. Factories live in TEST code only,
// never in config/state modules. Each call returns a fresh, contract-valid default;
// per-test overrides apply with no shared global state between tests.

import type { Demon, GameState, Round, Shot, Weapon, FireIntent } from '../src/core/state.ts';
import { DEMON_TYPES_BY_ID, ROUND_DURATION_MS, WAVE_SCHEDULE } from '../src/core/config.ts';

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
    status: 'ready',
    pumpRemainingMs: 0,
    ...overrides,
  };
}

export function makeDemon(overrides: Partial<Demon> = {}): Demon {
  const typeId = overrides.typeId ?? 1;
  return {
    id: 1,
    typeId,
    pathId: 1,
    hp: DEMON_TYPES_BY_ID[typeId]?.maxHp ?? 1,
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
