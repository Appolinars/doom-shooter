// Effects store (game-feel T-06, ADR-0004): splat/death lifecycles aged on the passed rAF
// delta, bounded collections under burst, the fire→pump→idle viewmodel clock as a pure
// function of elapsed time, clear() for retry, and the AC-T06-1 static check that the
// module never reaches the fixed step (no GameState import, no wall clock of its own).

import { describe, it, expect } from 'vitest';
import effectsSource from '../../src/render/effects.ts?raw';
import {
  createEffectsStore,
  viewmodelFrameAt,
  deathProgress,
  MAX_SPLATS,
  MAX_DEATH_VISUALS,
} from '../../src/render/effects.ts';
import { SHOT_SPLAT_MS, DEATH_ANIM_MS, PUMP_DURATION_MS } from '../../src/core/config.ts';

describe('AC-T06-1 — render-only: no GameState, no system calls, no own clock', () => {
  const source = effectsSource;

  it('imports nothing from core/state or systems/*', () => {
    expect(source).not.toMatch(/from '.*core\/state/);
    expect(source).not.toMatch(/from '.*systems\//);
  });

  it('reads no wall clock — time only arrives via advance(dtMs)', () => {
    expect(source).not.toContain('performance.now');
    expect(source).not.toContain('Date.now');
    expect(source).not.toContain('requestAnimationFrame');
  });
});

describe('AC-T06-2 — splat lifecycle (PRD AC-01)', () => {
  it('a splat lives for SHOT_SPLAT_MS of advanced time, then pruneExpired drops it', () => {
    const store = createEffectsStore();
    store.spawnSplat({ x: 400, y: 500, z: 0.5 });

    store.advance(SHOT_SPLAT_MS - 1);
    store.pruneExpired();
    expect(store.splats()).toHaveLength(1);
    expect(store.splats()[0]).toMatchObject({ x: 400, y: 500, z: 0.5, ageMs: SHOT_SPLAT_MS - 1 });

    store.advance(1);
    store.pruneExpired();
    expect(store.splats()).toHaveLength(0);
  });

  it('ages accumulate across many small rAF deltas, not per-call resets', () => {
    const store = createEffectsStore();
    store.spawnSplat({ x: 0, y: 0, z: 0 });

    for (let i = 0; i < 10; i++) {
      store.advance(SHOT_SPLAT_MS / 10);
      store.pruneExpired();
    }
    expect(store.splats()).toHaveLength(0);
  });

  it('stays bounded under a rapid-fire burst: oldest splat dropped at MAX_SPLATS', () => {
    const store = createEffectsStore();
    store.spawnSplat({ x: -1, y: -1, z: 0 });
    store.advance(5);
    for (let i = 0; i < MAX_SPLATS * 3; i++) {
      store.spawnSplat({ x: i, y: i, z: 0 });
    }

    expect(store.splats()).toHaveLength(MAX_SPLATS);
    expect(store.splats().some((splat) => splat.x === -1)).toBe(false);
  });
});

describe('AC-T06-3 — death visual survives the round-end freeze (PRD AC-09)', () => {
  it('plays to completion on advanced time alone — the store knows nothing about rounds', () => {
    const store = createEffectsStore();
    store.spawnDeath({ typeId: 2, x: 300, y: 400, z: 0.3 });

    // "Freeze": nothing else happens between frames; only the rAF delta keeps arriving.
    store.advance(DEATH_ANIM_MS / 2);
    store.pruneExpired();
    expect(store.deathVisuals()).toHaveLength(1);
    expect(deathProgress(store.deathVisuals()[0]!.ageMs)).toBeCloseTo(0.5);

    store.advance(DEATH_ANIM_MS / 2);
    store.pruneExpired();
    expect(store.deathVisuals()).toHaveLength(0);
  });

  it('several concurrent deaths age independently and stay bounded', () => {
    const store = createEffectsStore();
    store.spawnDeath({ typeId: 1, x: 0, y: 0, z: 0 });
    store.advance(DEATH_ANIM_MS - 1);
    store.spawnDeath({ typeId: 3, x: 10, y: 10, z: 1 });

    store.advance(1);
    store.pruneExpired();
    expect(store.deathVisuals()).toHaveLength(1);
    expect(store.deathVisuals()[0]!.typeId).toBe(3);

    for (let i = 0; i < MAX_DEATH_VISUALS * 2; i++) {
      store.spawnDeath({ typeId: 1, x: i, y: i, z: 0 });
    }
    expect(store.deathVisuals()).toHaveLength(MAX_DEATH_VISUALS);
  });

  it('deathProgress clamps to 0..1', () => {
    expect(deathProgress(-5)).toBe(0);
    expect(deathProgress(0)).toBe(0);
    expect(deathProgress(DEATH_ANIM_MS * 2)).toBe(1);
  });
});

describe('AC-T06-4 — viewmodel clock: idle+flash overlay → pump-1/2/3 → idle', () => {
  it('is a pure function of elapsed time covering the whole PUMP_DURATION_MS window', () => {
    expect(viewmodelFrameAt(0)).toEqual({ base: 'idle', flash: 'flash-1' });
    expect(viewmodelFrameAt(44)).toEqual({ base: 'idle', flash: 'flash-1' });
    expect(viewmodelFrameAt(45)).toEqual({ base: 'idle', flash: 'flash-2' });
    expect(viewmodelFrameAt(89)).toEqual({ base: 'idle', flash: 'flash-2' });

    const pumpWindowMs = PUMP_DURATION_MS - 90;
    expect(viewmodelFrameAt(90)).toEqual({ base: 'pump-1', flash: null });
    expect(viewmodelFrameAt(90 + pumpWindowMs / 3)).toEqual({ base: 'pump-2', flash: null });
    expect(viewmodelFrameAt(90 + (2 * pumpWindowMs) / 3)).toEqual({ base: 'pump-3', flash: null });
    expect(viewmodelFrameAt(PUMP_DURATION_MS - 1)).toEqual({ base: 'pump-3', flash: null });

    expect(viewmodelFrameAt(PUMP_DURATION_MS)).toEqual({ base: 'idle', flash: null });
    expect(viewmodelFrameAt(-1)).toEqual({ base: 'idle', flash: null });
  });

  it('the store starts idle, runs the sequence from onFire, and re-fires cleanly', () => {
    const store = createEffectsStore();
    expect(store.viewmodelFrame()).toEqual({ base: 'idle', flash: null });

    store.onFire();
    expect(store.viewmodelFrame()).toEqual({ base: 'idle', flash: 'flash-1' });

    store.advance(100);
    expect(store.viewmodelFrame().base).toBe('pump-1');

    store.advance(PUMP_DURATION_MS);
    expect(store.viewmodelFrame()).toEqual({ base: 'idle', flash: null });

    store.onFire();
    expect(store.viewmodelFrame()).toEqual({ base: 'idle', flash: 'flash-1' });
  });
});

describe('clear() — retry wiring drops all transient state (T-09 edge case)', () => {
  it('empties splats + deaths and resets the viewmodel to idle', () => {
    const store = createEffectsStore();
    store.spawnSplat({ x: 1, y: 2, z: 0 });
    store.spawnDeath({ typeId: 2, x: 3, y: 4, z: 0.5 });
    store.onFire();

    store.clear();

    expect(store.splats()).toHaveLength(0);
    expect(store.deathVisuals()).toHaveLength(0);
    expect(store.viewmodelFrame()).toEqual({ base: 'idle', flash: null });
  });
});
