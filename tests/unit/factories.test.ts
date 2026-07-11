import { describe, it, expect } from 'vitest';
import { makeDemon, makeRound, makeGameState, makeWeapon } from '../factories.ts';
import { WAVE_SCHEDULE } from '../../src/core/config.ts';

describe('test factories (AC-T02-3)', () => {
  it('makeRound returns a contract-valid running default', () => {
    const round = makeRound();
    expect(round.status).toBe('running');
    expect(round.score).toBe(0);
    expect(round.misses).toBe(0);
    expect(round.resolvedCount).toBe(0);
    expect(round.scheduledCount).toBe(WAVE_SCHEDULE.length);
    expect(round.timeLeftMs).toBeGreaterThan(0);
  });

  it('makeWeapon returns a ready, un-pumped weapon', () => {
    const weapon = makeWeapon();
    expect(weapon.status).toBe('ready');
    expect(weapon.pumpRemainingMs).toBe(0);
  });

  it('makeDemon default sits at path start (progress 0, far z)', () => {
    const demon = makeDemon();
    expect(demon.progress).toBe(0);
    expect(demon.z).toBe(1);
  });

  it('applies per-test overrides', () => {
    expect(makeRound({ score: 50 }).score).toBe(50);
    expect(makeDemon({ typeId: 2, z: 0.5 })).toMatchObject({ typeId: 2, z: 0.5 });
  });

  it('shares no mutable state between calls', () => {
    const a = makeGameState();
    a.demons.push(makeDemon());
    a.round.score = 100;
    const b = makeGameState();
    expect(b.demons).toHaveLength(0);
    expect(b.round.score).toBe(0);
  });
});
