import { describe, it, expect } from 'vitest';
import { findFrontMostHit, resolveFire } from '../../src/systems/hit.ts';
import { applyKill } from '../../src/systems/score.ts';
import { createSpawnCursor, stepSpawn } from '../../src/systems/spawn.ts';
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
    const far = at({ id: 1, z: 0.9, hp: 1 });
    const near = at({ id: 2, z: 0.1, hp: 1 });
    const state = makeGameState({ demons: [far, near] });

    resolveFire({ state, fire: makeFireIntent(AIM) });

    expect(state.demons).toEqual([far]);
    expect(state.round.resolvedCount).toBe(1);
  });
});

describe('AC-T07-2 — score adds exactly the killed type value (PRD AC-03)', () => {
  it('adds the fast type pointValue on the killing shot', () => {
    const state = makeGameState({ demons: [at({ typeId: 1, hp: 1 })] });

    resolveFire({ state, fire: makeFireIntent(AIM) });

    expect(state.round.score).toBe(DEMON_TYPES_BY_ID[1]!.pointValue);
  });

  it('adds the brute type pointValue once its 2 HP are spent (two shots)', () => {
    const state = makeGameState({ demons: [at({ typeId: 2 })] });

    resolveFire({ state, fire: makeFireIntent(AIM) });
    resolveFire({ state, fire: makeFireIntent(AIM) });

    expect(state.round.score).toBe(DEMON_TYPES_BY_ID[2]!.pointValue);
  });

  it('applyKill only ever increases the score (non-decreasing over a random kill sequence)', () => {
    const round = makeRound();
    const typeIds = [1, 2, 3];
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
  it('appends a kill Shot with the target captured at the fired coordinates', () => {
    const state = makeGameState({ demons: [at({ id: 1, z: 0.5, hp: 1 })] });

    resolveFire({ state, fire: makeFireIntent({ ...AIM, atMs: 100 }) });

    expect(state.shots).toEqual([
      {
        firedAtMs: 100,
        aimX: AIM.aimX,
        aimY: AIM.aimY,
        outcome: 'kill',
        target: { typeId: 1, x: AIM.aimX, y: AIM.aimY, z: 0.5 },
      },
    ]);
  });
});

describe('AC-T02-1 — multi-shot decrement (PRD AC-03)', () => {
  it('removes exactly one HP per landed shot; the demon stays alive and unscored', () => {
    const brute = at({ id: 1, typeId: 2 });
    const state = makeGameState({ demons: [brute] });

    resolveFire({ state, fire: makeFireIntent(AIM) });

    expect(brute.hp).toBe(1);
    expect(state.demons).toEqual([brute]);
    expect(state.round.score).toBe(0);
    expect(state.round.resolvedCount).toBe(0);
    expect(state.shots.at(-1)?.outcome).toBe('hit');
  });

  it('a 3-HP fast survives two hits as wound states, dies on the third (AC-T13-1)', () => {
    const fast = at({ id: 1, typeId: 1 });
    const state = makeGameState({ demons: [fast] });

    resolveFire({ state, fire: makeFireIntent(AIM) });
    expect(fast.hp).toBe(2);
    expect(state.shots.at(-1)?.outcome).toBe('hit');

    resolveFire({ state, fire: makeFireIntent(AIM) });
    expect(fast.hp).toBe(1);
    expect(state.shots.at(-1)?.outcome).toBe('hit');

    resolveFire({ state, fire: makeFireIntent(AIM) });
    expect(state.demons).toHaveLength(0);
    expect(state.shots.at(-1)?.outcome).toBe('kill');
    expect(state.round.score).toBe(DEMON_TYPES_BY_ID[1]!.pointValue);
  });

  it('a 4-HP baron takes four shots to score, never scoring per hit (AC-T02-3)', () => {
    const baron = at({ id: 1, typeId: 3 });
    const state = makeGameState({ demons: [baron] });
    const pointValue = DEMON_TYPES_BY_ID[3]!.pointValue;

    for (let shotNumber = 1; shotNumber <= 3; shotNumber++) {
      resolveFire({ state, fire: makeFireIntent(AIM) });
      expect(state.round.score).toBe(0);
      expect(baron.hp).toBe(4 - shotNumber);
    }
    resolveFire({ state, fire: makeFireIntent(AIM) });

    expect(state.demons).toHaveLength(0);
    expect(state.round.score).toBe(pointValue);
    expect(state.round.resolvedCount).toBe(1);
    expect(state.shots.at(-1)?.outcome).toBe('kill');
  });
});

describe('AC-T02-3 — score is non-decreasing over a random shot sequence', () => {
  it('increases by exactly one pointValue per demon killed, never per hit', () => {
    const typeIds = [1, 2, 3];
    const state = makeGameState({
      demons: Array.from({ length: 30 }, (_, i) => at({ id: i + 1, typeId: typeIds[i % 3]!, z: Math.random() })),
    });
    let previousScore = state.round.score;
    let expectedScore = 0;

    for (let i = 0; i < 200 && state.demons.length > 0; i++) {
      const demonCountBefore = state.demons.length;
      resolveFire({ state, fire: makeFireIntent(AIM) });
      const lastShot = state.shots.at(-1)!;
      if (state.demons.length < demonCountBefore) {
        expectedScore += DEMON_TYPES_BY_ID[lastShot.target!.typeId]!.pointValue;
      }
      expect(state.round.score).toBeGreaterThanOrEqual(previousScore);
      expect(Number.isInteger(state.round.score)).toBe(true);
      previousScore = state.round.score;
    }

    expect(state.demons).toHaveLength(0);
    expect(state.round.score).toBe(expectedScore);
  });
});

describe('AC-T02-4 — hurt demon escaping is a normal miss (PRD AC-08)', () => {
  it('counts one miss and no score when a damaged demon leaves the field', () => {
    const hurtBrute = makeDemon({ id: 1, typeId: 2, hp: 1, pathId: 1, progress: 0.99 });
    const state = makeGameState({ demons: [hurtBrute] });

    // 400 ms: enough to push progress past 1.0, before the first schedule slot (500 ms) is due.
    stepSpawn({ state, cursor: createSpawnCursor(), fixedDtMs: 400 });

    expect(state.demons).toHaveLength(0);
    expect(state.round.misses).toBe(1);
    expect(state.round.resolvedCount).toBe(1);
    expect(state.round.score).toBe(0);
  });
});

describe('T-02 edge — overlapping demons, front one has hp > 1', () => {
  it('damages only the front-most; the rear demon is untouched', () => {
    const front = at({ id: 1, typeId: 2, z: 0.1 });
    const rear = at({ id: 2, typeId: 2, z: 0.9 });
    const state = makeGameState({ demons: [front, rear] });

    resolveFire({ state, fire: makeFireIntent(AIM) });

    expect(front.hp).toBe(1);
    expect(rear.hp).toBe(2);
    expect(state.demons).toEqual([front, rear]);
  });
});
