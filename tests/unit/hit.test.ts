import { describe, it, expect } from 'vitest';
import { findFrontMostHit, resolveFire } from '../../src/systems/hit.ts';
import { applyKill } from '../../src/systems/score.ts';
import { DEMON_HIT_RADIUS, DEMON_TYPES_BY_ID } from '../../src/core/config.ts';
import { makeGameState, makeDemon, makeRound, makeFireIntent } from '../factories.ts';

const AIM = { aimX: 500, aimY: 500 };
const at = (overrides = {}) => makeDemon({ x: AIM.aimX, y: AIM.aimY, ...overrides });

describe('findFrontMostHit — front-most by z (PRD AC-06)', () => {
  it('picks the nearest (smallest z) of two demons overlapping under the crosshair', () => {
    const far = at({ id: 1, z: 0.9 });
    const near = at({ id: 2, z: 0.1 });

    const hit = findFrontMostHit({ demons: [far, near], aimX: AIM.aimX, aimY: AIM.aimY });

    expect(hit).toBe(near);
  });

  it('breaks a z tie on the lower id (deterministic)', () => {
    const a = at({ id: 7, z: 0.5 });
    const b = at({ id: 3, z: 0.5 });

    const hit = findFrontMostHit({ demons: [a, b], aimX: AIM.aimX, aimY: AIM.aimY });

    expect(hit).toBe(b);
  });

  it('ignores demons outside the hit radius', () => {
    const outside = at({ id: 1, x: AIM.aimX + DEMON_HIT_RADIUS + 1 });

    const hit = findFrontMostHit({ demons: [outside], aimX: AIM.aimX, aimY: AIM.aimY });

    expect(hit).toBeNull();
  });

  it('counts a demon exactly on the radius boundary as a hit', () => {
    const onEdge = at({ id: 1, x: AIM.aimX + DEMON_HIT_RADIUS, y: AIM.aimY });

    const hit = findFrontMostHit({ demons: [onEdge], aimX: AIM.aimX, aimY: AIM.aimY });

    expect(hit).toBe(onEdge);
  });

  it('returns null when nothing is under the crosshair', () => {
    expect(findFrontMostHit({ demons: [], aimX: AIM.aimX, aimY: AIM.aimY })).toBeNull();
  });
});

describe('AC-T07-1 — resolveFire kills only the front-most demon', () => {
  it('removes the nearest demon and leaves the one behind it live', () => {
    const far = at({ id: 1, z: 0.9 });
    const near = at({ id: 2, z: 0.1 });
    const state = makeGameState({ demons: [far, near] });

    resolveFire({ state, fire: makeFireIntent(AIM) });

    expect(state.demons).toEqual([far]);
    expect(state.round.resolvedCount).toBe(1);
  });
});

describe('AC-T07-2 — score adds exactly the killed type value (PRD AC-03)', () => {
  it('adds the fast type pointValue on a fast kill', () => {
    const state = makeGameState({ demons: [at({ typeId: 1 })] });

    resolveFire({ state, fire: makeFireIntent(AIM) });

    expect(state.round.score).toBe(DEMON_TYPES_BY_ID[1]!.pointValue);
  });

  it('adds the brute type pointValue on a brute kill', () => {
    const state = makeGameState({ demons: [at({ typeId: 2 })] });

    resolveFire({ state, fire: makeFireIntent(AIM) });

    expect(state.round.score).toBe(DEMON_TYPES_BY_ID[2]!.pointValue);
  });

  it('applyKill only ever increases the score (non-decreasing over a random kill sequence)', () => {
    const round = makeRound();
    const typeIds = [1, 2];
    let previous = round.score;

    for (let i = 0; i < 200; i++) {
      const typeId = typeIds[Math.floor(Math.random() * typeIds.length)]!;
      applyKill({ round, demonTypeId: typeId });
      expect(round.score).toBeGreaterThan(previous);
      expect(Number.isInteger(round.score)).toBe(true);
      previous = round.score;
    }
  });
});

describe('AC-T07-3 — clean miss', () => {
  it('records a miss Shot, removes no demon and leaves the score unchanged', () => {
    const state = makeGameState({ demons: [at({ id: 1 })] });
    const miss = makeFireIntent({ aimX: 0, aimY: 0, atMs: 42 });

    resolveFire({ state, fire: miss });

    expect(state.demons).toHaveLength(1);
    expect(state.round.score).toBe(0);
    expect(state.round.resolvedCount).toBe(0);
    expect(state.shots).toEqual([{ firedAtMs: 42, aimX: 0, aimY: 0, outcome: 'miss' }]);
  });
});

describe('resolveFire — Shot feedback cue', () => {
  it('appends a hit Shot at the fired coordinates on a kill', () => {
    const state = makeGameState({ demons: [at({ id: 1 })] });

    resolveFire({ state, fire: makeFireIntent({ ...AIM, atMs: 100 }) });

    expect(state.shots).toEqual([{ firedAtMs: 100, aimX: AIM.aimX, aimY: AIM.aimY, outcome: 'hit' }]);
  });
});
