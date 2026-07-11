import { describe, it, expect } from 'vitest';
import { stepRound, isRoundActive, togglePause } from '../../src/systems/round.ts';
import { resolveFire } from '../../src/systems/hit.ts';
import { stepWeapon } from '../../src/systems/weapon.ts';
import { STEP_MS } from '../../src/core/loop.ts';
import { DEMON_TYPES_BY_ID } from '../../src/core/config.ts';
import { makeGameState, makeRound, makeDemon, makeFireIntent } from '../factories.ts';

describe('AC-T08-1 — all-resolved end (PRD AC-04)', () => {
  it('ends and freezes the round when resolvedCount reaches scheduledCount', () => {
    const state = makeGameState({
      round: makeRound({ scheduledCount: 3, resolvedCount: 3, score: 40 }),
    });

    stepRound({ state, fixedDtMs: STEP_MS });

    expect(state.round.status).toBe('ended');
    expect(isRoundActive(state.round)).toBe(false);
    expect(state.round.score).toBe(40);
  });

  it('stays running while demons remain unresolved and time is left', () => {
    const state = makeGameState({
      round: makeRound({ scheduledCount: 3, resolvedCount: 1 }),
    });

    stepRound({ state, fixedDtMs: STEP_MS });

    expect(state.round.status).toBe('running');
    expect(isRoundActive(state.round)).toBe(true);
  });
});

describe('AC-T08-3 — timer end', () => {
  it('ends the round when the timer reaches 0 with live demons remaining', () => {
    const state = makeGameState({
      round: makeRound({ scheduledCount: 3, resolvedCount: 1, timeLeftMs: STEP_MS, misses: 0 }),
      demons: [makeDemon({ id: 1 }), makeDemon({ id: 2 })],
    });

    stepRound({ state, fixedDtMs: STEP_MS });

    expect(state.round.timeLeftMs).toBe(0);
    expect(state.round.status).toBe('ended');
  });

  it('does not retroactively count remaining live demons as misses (escape ≠ timer-end)', () => {
    const state = makeGameState({
      round: makeRound({ scheduledCount: 3, resolvedCount: 1, timeLeftMs: STEP_MS, misses: 0 }),
      demons: [makeDemon({ id: 1 }), makeDemon({ id: 2 })],
    });

    stepRound({ state, fixedDtMs: STEP_MS });

    expect(state.round.misses).toBe(0);
    expect(state.round.resolvedCount).toBe(1);
  });

  it('clamps the timer at 0 rather than going negative on an overshooting step', () => {
    const state = makeGameState({
      round: makeRound({ timeLeftMs: 5 }),
    });

    stepRound({ state, fixedDtMs: STEP_MS });

    expect(state.round.timeLeftMs).toBe(0);
  });
});

describe('AC-T08-2 — same-step final kill included before freeze (PRD AC-04b)', () => {
  it('counts the final kill in the score, then ends the round in one step', () => {
    // One scheduled demon, one loaded shell, timer about to expire this step. The step
    // runs in §6 Flow 4 order: weapon (→ hit → score) resolves the kill, THEN stepRound
    // sees resolvedCount === scheduledCount and freezes with the point already added.
    const demon = makeDemon({ id: 1, typeId: 1, x: 100, y: 100 });
    const pointValue = DEMON_TYPES_BY_ID[1]!.pointValue;
    const state = makeGameState({
      round: makeRound({ scheduledCount: 1, resolvedCount: 0, score: 0, timeLeftMs: STEP_MS }),
      demons: [demon],
      fireIntents: [makeFireIntent({ aimX: 100, aimY: 100 })],
    });

    stepWeapon({ state, fixedDtMs: STEP_MS, onFire: resolveFire });
    stepRound({ state, fixedDtMs: STEP_MS });

    expect(state.round.resolvedCount).toBe(1);
    expect(state.round.score).toBe(pointValue);
    expect(state.round.status).toBe('ended');
  });
});

describe('freeze is a one-way, idempotent gate', () => {
  it('is a no-op once ended — never mutates timer or status', () => {
    const state = makeGameState({
      round: makeRound({ status: 'ended', timeLeftMs: 1234, score: 70 }),
    });

    stepRound({ state, fixedDtMs: STEP_MS });

    expect(state.round.timeLeftMs).toBe(1234);
    expect(state.round.status).toBe('ended');
    expect(state.round.score).toBe(70);
  });
});

describe('AC-T12-1/2/3 — togglePause flips running ⇄ paused; ended stays frozen', () => {
  it('pauses a running round and resumes it on the next toggle', () => {
    const round = makeRound({ status: 'running' });

    togglePause(round);
    expect(round.status).toBe('paused');
    expect(isRoundActive(round)).toBe(false);

    togglePause(round);
    expect(round.status).toBe('running');
    expect(isRoundActive(round)).toBe(true);
  });

  it('is a no-op on the result screen — ended never leaves ended', () => {
    const round = makeRound({ status: 'ended', score: 70 });

    togglePause(round);

    expect(round.status).toBe('ended');
    expect(round.score).toBe(70);
  });

  it('a paused round holds the timer — stepRound never decrements it (AC-T12-1)', () => {
    const state = makeGameState({
      round: makeRound({ status: 'paused', timeLeftMs: 1234, resolvedCount: 3, scheduledCount: 3 }),
    });

    stepRound({ state, fixedDtMs: STEP_MS });

    expect(state.round.timeLeftMs).toBe(1234);
    expect(state.round.status).toBe('paused'); // even all-resolved cannot end a paused round
  });

  it('a round at its last step ends on the first resumed step, not during pause', () => {
    const state = makeGameState({ round: makeRound({ status: 'paused', timeLeftMs: STEP_MS }) });

    stepRound({ state, fixedDtMs: STEP_MS });
    expect(state.round.status).toBe('paused');

    togglePause(state.round);
    stepRound({ state, fixedDtMs: STEP_MS });
    expect(state.round.status).toBe('ended');
  });
});
