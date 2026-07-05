// Production initializer (T-11) — createInitialGameState is what main.ts boots from, so it
// must produce a contract-valid fresh round matching the config-derived round-start values.

import { describe, it, expect } from 'vitest';
import { createInitialGameState } from '../../src/core/state.ts';
import { ROUND_DURATION_MS, SHELL_CAPACITY, WAVE_SCHEDULE } from '../../src/core/config.ts';

describe('createInitialGameState', () => {
  it('starts a running round with a full timer, full magazine and empty entity arrays', () => {
    const state = createInitialGameState();

    expect(state.round).toEqual({
      status: 'running',
      score: 0,
      misses: 0,
      timeLeftMs: ROUND_DURATION_MS,
      scheduledCount: WAVE_SCHEDULE.length,
      resolvedCount: 0,
    });
    expect(state.weapon).toEqual({
      shellsLoaded: SHELL_CAPACITY,
      status: 'ready',
      reloadRemainingMs: 0,
    });
    expect(state.demons).toEqual([]);
    expect(state.shots).toEqual([]);
    expect(state.fireIntents).toEqual([]);
  });

  it('returns a fresh, unshared instance each call', () => {
    const a = createInitialGameState();
    const b = createInitialGameState();
    a.demons.push({ id: 1, typeId: 1, pathId: 1, progress: 0, x: 0, y: 0, z: 1 });

    expect(b.demons).toHaveLength(0);
    expect(a.round).not.toBe(b.round);
  });
});
