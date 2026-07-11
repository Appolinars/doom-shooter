// Feedback wiring + retry (game-feel T-09): every action pairs SFX with an effect —
// shoot/splat/death by shot outcome, spawn by new demon id — each state change processed
// exactly once across frames, unknown demon-SFX keys guarded (fast has no hurt), and
// restartRound rebuilding a leak-free fresh round (PRD AC-10/AC-09).

import { describe, it, expect, vi } from 'vitest';
import { createFeedbackWiring, restartRound } from '../../src/wiring.ts';
import { createEffectsStore } from '../../src/render/effects.ts';
import { createSpawnCursor } from '../../src/systems/spawn.ts';
import type { SfxKey } from '../../src/audio/sfx.ts';
import { makeGameState, makeDemon, makeShot, makeRound, makeWeapon } from '../factories.ts';

const makeWiring = (state = makeGameState()) => {
  const effects = createEffectsStore();
  const playSfx = vi.fn<(key: SfxKey) => void>();
  const onRoundEnd = vi.fn<() => void>();
  const wiring = createFeedbackWiring({ state, effects, playSfx, onRoundEnd });
  return { state, effects, playSfx, onRoundEnd, wiring };
};

const target = { typeId: 2, x: 400, y: 500, z: 0.4 };

describe('AC-T09-1 — event → SFX + effect pairs', () => {
  it('a kill shot fires shoot SFX, viewmodel clock, splat, death visual and the death SFX', () => {
    const { state, effects, playSfx, wiring } = makeWiring();
    state.shots.push(makeShot({ outcome: 'kill', target }));

    wiring.syncFrame();

    expect(playSfx).toHaveBeenCalledWith('shoot');
    expect(playSfx).toHaveBeenCalledWith('demon-brute-death');
    expect(effects.viewmodelFrame().flash).toBe('flash-1'); // onFire restarted the clock
    expect(effects.splats()).toHaveLength(1);
    expect(effects.splats()[0]).toMatchObject({ x: 400, y: 500, z: 0.4 });
    expect(effects.deathVisuals()).toHaveLength(1);
    expect(effects.deathVisuals()[0]).toMatchObject({ typeId: 2 });
  });

  it('a non-lethal hit fires the hurt SFX + splat, no death visual', () => {
    const { state, effects, playSfx, wiring } = makeWiring();
    state.shots.push(makeShot({ outcome: 'hit', target }));

    wiring.syncFrame();

    expect(playSfx).toHaveBeenCalledWith('demon-brute-hurt');
    expect(effects.splats()).toHaveLength(1);
    expect(effects.deathVisuals()).toHaveLength(0);
  });

  it('a miss fires only the shoot SFX + viewmodel — no splat, no demon SFX', () => {
    const { state, effects, playSfx, wiring } = makeWiring();
    state.shots.push(makeShot({ outcome: 'miss' }));

    wiring.syncFrame();

    expect(playSfx).toHaveBeenCalledOnce();
    expect(playSfx).toHaveBeenCalledWith('shoot');
    expect(effects.splats()).toHaveLength(0);
  });

  it('a new demon plays its spawn SFX; already-seen demons stay silent', () => {
    const { state, playSfx, wiring } = makeWiring();
    state.demons.push(makeDemon({ id: 1, typeId: 1 }));

    wiring.syncFrame();
    wiring.syncFrame();
    expect(playSfx).toHaveBeenCalledOnce();
    expect(playSfx).toHaveBeenCalledWith('demon-fast-spawn');

    state.demons.push(makeDemon({ id: 2, typeId: 3 }));
    wiring.syncFrame();
    expect(playSfx).toHaveBeenCalledWith('demon-baron-spawn');
    expect(playSfx).toHaveBeenCalledTimes(2);
  });

  it('guards non-contract demon keys: a hurt fast demon plays no hurt SFX (1 HP, no key)', () => {
    const { state, playSfx, wiring } = makeWiring();
    state.shots.push(makeShot({ outcome: 'hit', target: { typeId: 1, x: 0, y: 0, z: 0 } }));

    wiring.syncFrame();

    expect(playSfx).toHaveBeenCalledOnce(); // only 'shoot' — no 'demon-fast-hurt' invented
    expect(playSfx).toHaveBeenCalledWith('shoot');
  });

  it('each shot is processed once even as older shots are pruned between frames', () => {
    const { state, playSfx, wiring } = makeWiring();
    const first = makeShot({ outcome: 'miss', firedAtMs: 0 });
    state.shots.push(first);
    wiring.syncFrame();

    state.shots = state.shots.filter((shot) => shot !== first); // main.ts prune
    state.shots.push(makeShot({ outcome: 'miss', firedAtMs: 300 }));
    wiring.syncFrame();
    wiring.syncFrame();

    expect(playSfx).toHaveBeenCalledTimes(2); // one 'shoot' per distinct shot
  });
});

describe('AC-T11-1 / AC-T11-2 — round-end transition fires the finale hook exactly once', () => {
  it('fires onRoundEnd on the first frame that observes ended, then stays quiet', () => {
    const { state, onRoundEnd, wiring } = makeWiring();

    wiring.syncFrame();
    expect(onRoundEnd).not.toHaveBeenCalled();

    state.round.status = 'ended';
    wiring.syncFrame();
    wiring.syncFrame();
    expect(onRoundEnd).toHaveBeenCalledOnce();
  });

  it('reset() re-arms the hook — the next round end fires it again', () => {
    const { state, onRoundEnd, wiring } = makeWiring();
    state.round.status = 'ended';
    wiring.syncFrame();

    wiring.reset();
    state.round.status = 'running';
    wiring.syncFrame();
    expect(onRoundEnd).toHaveBeenCalledOnce();

    state.round.status = 'ended';
    wiring.syncFrame();
    expect(onRoundEnd).toHaveBeenCalledTimes(2);
  });

  it('omitting onRoundEnd keeps syncFrame safe on round end', () => {
    const state = makeGameState({ round: makeRound({ status: 'ended' }) });
    const wiring = createFeedbackWiring({ state, effects: createEffectsStore(), playSfx: vi.fn() });

    expect(() => wiring.syncFrame()).not.toThrow();
  });

  it('restartRound stops the finale via the stopFinale seam', () => {
    const state = makeGameState({ round: makeRound({ status: 'ended' }) });
    const { effects, wiring } = makeWiring(state);
    const stopFinale = vi.fn<() => void>();

    restartRound({ state, cursor: createSpawnCursor(), effects, wiring, pickBackdrop: () => null, stopFinale });

    expect(stopFinale).toHaveBeenCalledOnce();
  });
});

describe('AC-T09-3 / AC-T09-4 — restartRound leaves zero leaked state', () => {
  it('rebuilds state + cursor, clears effects mid-animation, rerolls the backdrop', () => {
    const state = makeGameState({
      round: makeRound({ status: 'ended', score: 120, resolvedCount: 12 }),
      weapon: makeWeapon({ status: 'pumping', pumpRemainingMs: 200 }),
      demons: [makeDemon({ id: 7 })],
      shots: [makeShot({ outcome: 'kill', target })],
    });
    const { effects, playSfx, wiring } = makeWiring(state);
    wiring.syncFrame(); // death visual mid-play at round end (AC-09)
    expect(effects.deathVisuals()).toHaveLength(1);
    const cursor = createSpawnCursor();
    cursor.slotIndex = 12;
    cursor.nextDemonId = 13;
    const freshBackdrop = {} as CanvasImageSource;

    const backdrop = restartRound({ state, cursor, effects, wiring, pickBackdrop: () => freshBackdrop });

    expect(state.round).toMatchObject({ status: 'running', score: 0, resolvedCount: 0 });
    expect(state.weapon).toEqual({ status: 'ready', pumpRemainingMs: 0 });
    expect(state.demons).toHaveLength(0);
    expect(state.shots).toHaveLength(0);
    expect(state.fireIntents).toHaveLength(0);
    expect(cursor).toEqual(createSpawnCursor());
    expect(effects.deathVisuals()).toHaveLength(0);
    expect(effects.splats()).toHaveLength(0);
    expect(backdrop).toBe(freshBackdrop);

    // Seen-ids were forgotten: the restarted schedule re-emits spawn SFX for id 1.
    playSfx.mockClear();
    state.demons.push(makeDemon({ id: 1, typeId: 1 }));
    wiring.syncFrame();
    expect(playSfx).toHaveBeenCalledWith('demon-fast-spawn');
  });

  it('is idempotent — a second fast click rebuilds cleanly again', () => {
    const state = makeGameState({ round: makeRound({ status: 'ended', score: 50 }) });
    const { effects, wiring } = makeWiring(state);
    const cursor = createSpawnCursor();

    restartRound({ state, cursor, effects, wiring, pickBackdrop: () => null });
    const secondBackdrop = restartRound({ state, cursor, effects, wiring, pickBackdrop: () => null });

    expect(state.round.status).toBe('running');
    expect(state.round.score).toBe(0);
    expect(secondBackdrop).toBeNull(); // zero loaded backdrops → black fail-soft
  });

  it('mutates the captured references in place — closures keep seeing the fresh round', () => {
    const state = makeGameState({ round: makeRound({ status: 'ended', score: 9 }) });
    const { effects, wiring } = makeWiring(state);
    const cursor = createSpawnCursor();
    const capturedState = state;
    const capturedCursor = cursor;

    restartRound({ state, cursor, effects, wiring, pickBackdrop: () => null });

    expect(capturedState.round.score).toBe(0);
    expect(capturedCursor.slotIndex).toBe(0);
  });
});
