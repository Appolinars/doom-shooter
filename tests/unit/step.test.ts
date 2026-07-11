// Per-step driver integration (T-11) — proves the weapon → spawn → round order over one
// fixed step, especially the AC-04b ordering (a kill's score lands before the round can
// freeze) and the freeze gate (an `ended` round mutates nothing).

import { describe, it, expect } from 'vitest';
import { advanceGameStep } from '../../src/core/step.ts';
import { createSpawnCursor } from '../../src/systems/spawn.ts';
import { STEP_MS } from '../../src/core/loop.ts';
import { DEMON_TYPES_BY_ID } from '../../src/core/config.ts';
import { makeGameState, makeRound, makeDemon, makeFireIntent } from '../factories.ts';

const step = (state: Parameters<typeof advanceGameStep>[0]['state'], fixedDtMs = STEP_MS): void => {
  advanceGameStep({ state, cursor: createSpawnCursor(), fixedDtMs });
};

describe('advanceGameStep', () => {
  it('drains a fire intent onto the demon under the crosshair: kill + score in one step', () => {
    const demon = makeDemon({ id: 7, typeId: 1, hp: 1, x: 500, y: 500, z: 0.5 });
    const state = makeGameState({
      demons: [demon],
      fireIntents: [makeFireIntent({ aimX: 500, aimY: 500 })],
    });

    step(state);

    expect(state.demons).toHaveLength(0);
    expect(state.round.score).toBe(DEMON_TYPES_BY_ID[1]!.pointValue);
    expect(state.round.resolvedCount).toBe(1);
    expect(state.shots.at(-1)?.outcome).toBe('kill');
    expect(state.fireIntents).toHaveLength(0);
  });

  it('AC-04b: a kill on the same step the round resolves still counts before the freeze', () => {
    // hp 1: already-hurt brute, so this single shot is the killing one (T-02).
    const demon = makeDemon({ id: 1, typeId: 2, hp: 1, x: 500, y: 500, z: 0.5 });
    // Last outstanding demon + a fire on it: killing it makes resolvedCount reach scheduledCount,
    // so the round ends this same step — but the score-add must already be committed.
    const state = makeGameState({
      round: makeRound({ scheduledCount: 1, resolvedCount: 0 }),
      demons: [demon],
      fireIntents: [makeFireIntent({ aimX: 500, aimY: 500 })],
    });

    step(state);

    expect(state.round.status).toBe('ended');
    expect(state.round.score).toBe(DEMON_TYPES_BY_ID[2]!.pointValue);
  });

  it('freezes: an ended round drops queued fire intents and never mutates (AC-T12-4)', () => {
    const demon = makeDemon({ id: 3, x: 500, y: 500 });
    const state = makeGameState({
      round: makeRound({ status: 'ended', score: 40, resolvedCount: 5 }),
      demons: [demon],
      fireIntents: [makeFireIntent({ aimX: 500, aimY: 500 })],
    });

    step(state);

    expect(state.round.score).toBe(40);
    expect(state.demons).toHaveLength(1);
    expect(state.fireIntents).toHaveLength(0);
  });

  it('AC-T12-1/4: a paused round mutates nothing and clicks during pause never fire on resume', () => {
    const demon = makeDemon({ id: 5, typeId: 1, x: 500, y: 500, z: 0.5, progress: 0.3 });
    const state = makeGameState({
      round: makeRound({ status: 'paused', timeLeftMs: 4321, score: 10 }),
      demons: [demon],
      fireIntents: [makeFireIntent({ aimX: 500, aimY: 500 })],
    });

    step(state);
    expect(state.round).toMatchObject({ status: 'paused', timeLeftMs: 4321, score: 10 });
    expect(state.demons[0]).toMatchObject({ progress: 0.3, x: 500, y: 500 });
    expect(state.fireIntents).toHaveLength(0);

    state.round.status = 'running';
    step(state);
    expect(state.shots).toHaveLength(0); // the paused-away click never fired
    expect(state.demons).toHaveLength(1);
  });

  it('ends the round when the timer runs out, leaving live demons as-is (escape ≠ timer-end)', () => {
    const state = makeGameState({
      round: makeRound({ timeLeftMs: STEP_MS, resolvedCount: 0, scheduledCount: 10 }),
      demons: [makeDemon({ id: 9, progress: 0.2 })],
    });

    step(state);

    expect(state.round.status).toBe('ended');
    expect(state.round.misses).toBe(0);
  });
});
