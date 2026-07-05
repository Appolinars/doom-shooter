import { describe, it, expect } from 'vitest';
import {
  createSpawnCursor,
  pathPointAt,
  stepSpawn,
  type SpawnCursor,
} from '../../src/systems/spawn.ts';
import { PATHS_BY_ID, WAVE_SCHEDULE } from '../../src/core/config.ts';
import { makeGameState, makeDemon } from '../factories.ts';
import type { GameState } from '../../src/core/state.ts';

/** Drive `stepSpawn` over a fixed-step trace, mutating the shared cursor + state. */
const run = ({
  state,
  cursor,
  steps,
  fixedDtMs,
}: {
  state: GameState;
  cursor: SpawnCursor;
  steps: number;
  fixedDtMs: number;
}): void => {
  for (let i = 0; i < steps; i++) {
    stepSpawn({ state, cursor, fixedDtMs });
  }
};

describe('pathPointAt — interpolation across waypoints', () => {
  const path = PATHS_BY_ID[1]!;

  it('sits at the first waypoint at progress 0', () => {
    expect(pathPointAt(path, 0)).toEqual(path.waypoints[0]);
  });

  it('sits at the last waypoint at progress 1', () => {
    expect(pathPointAt(path, 1)).toEqual(path.waypoints[path.waypoints.length - 1]);
  });

  it('lerps x/y/z at the midpoint of a two-waypoint path', () => {
    const a = path.waypoints[0]!;
    const b = path.waypoints[1]!;
    const mid = pathPointAt(path, 0.5);
    expect(mid.x).toBeCloseTo((a.x + b.x) / 2, 6);
    expect(mid.y).toBeCloseTo((a.y + b.y) / 2, 6);
    expect(mid.z).toBeCloseTo((a.z + b.z) / 2, 6);
  });

  it('clamps out-of-range progress to the endpoints', () => {
    expect(pathPointAt(path, -1)).toEqual(path.waypoints[0]);
    expect(pathPointAt(path, 2)).toEqual(path.waypoints[path.waypoints.length - 1]);
  });
});

describe('AC-T05-1 — spawn at a due slot', () => {
  it('creates a demon of the slot type at the path start when the clock reaches atMs', () => {
    const state = makeGameState();
    const cursor = createSpawnCursor();
    const firstSlot = WAVE_SCHEDULE[0]!;

    stepSpawn({ state, cursor, fixedDtMs: firstSlot.atMs });

    expect(state.demons).toHaveLength(1);
    const demon = state.demons[0]!;
    const start = PATHS_BY_ID[firstSlot.pathId]!.waypoints[0]!;
    expect(demon).toMatchObject({
      typeId: firstSlot.demonTypeId,
      pathId: firstSlot.pathId,
      progress: 0,
      x: start.x,
      y: start.y,
      z: start.z,
    });
  });

  it('does not spawn before the first slot is due', () => {
    const state = makeGameState();
    const cursor = createSpawnCursor();

    stepSpawn({ state, cursor, fixedDtMs: WAVE_SCHEDULE[0]!.atMs - 1 });

    expect(state.demons).toHaveLength(0);
    expect(cursor.slotIndex).toBe(0);
  });

  it('mints unique incremental ids across spawns', () => {
    const state = makeGameState();
    const cursor = createSpawnCursor();

    stepSpawn({ state, cursor, fixedDtMs: WAVE_SCHEDULE[1]!.atMs });

    const ids = state.demons.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('AC-T05-1 edge — two slots due in one step (stall recovery)', () => {
  it('spawns both, in schedule order', () => {
    const state = makeGameState();
    const cursor = createSpawnCursor();

    stepSpawn({ state, cursor, fixedDtMs: WAVE_SCHEDULE[1]!.atMs });

    expect(state.demons).toHaveLength(2);
    expect(state.demons.map((d) => d.pathId)).toEqual([
      WAVE_SCHEDULE[0]!.pathId,
      WAVE_SCHEDULE[1]!.pathId,
    ]);
    expect(cursor.slotIndex).toBe(2);
  });
});

describe('AC-T05-2 — escape records a miss (PRD AC-05)', () => {
  it('despawns the demon and increments misses + resolvedCount', () => {
    // dt kept under the first spawn slot (500 ms) so no new demon confuses the count.
    const state = makeGameState({ demons: [makeDemon({ progress: 0.9999 })] });
    const cursor = createSpawnCursor();

    stepSpawn({ state, cursor, fixedDtMs: 16 });

    expect(state.demons).toHaveLength(0);
    expect(state.round.misses).toBe(1);
    expect(state.round.resolvedCount).toBe(1);
  });

  it('leaves an un-escaped demon live and the counters untouched', () => {
    const state = makeGameState({ demons: [makeDemon({ progress: 0 })] });
    const cursor = createSpawnCursor();

    stepSpawn({ state, cursor, fixedDtMs: 16 });

    expect(state.demons).toHaveLength(1);
    expect(state.round.misses).toBe(0);
    expect(state.round.resolvedCount).toBe(0);
  });
});

describe('AC-T05-3 — path fidelity under fixed steps', () => {
  it('advances progress by speed × dt and never re-assigns the path', () => {
    const state = makeGameState({ demons: [makeDemon({ typeId: 1, pathId: 1, progress: 0 })] });
    const cursor = createSpawnCursor();
    const stepMs = 1000 / 60;

    run({ state, cursor, steps: 60, fixedDtMs: stepMs });

    const demon = state.demons[0]!;
    expect(demon.pathId).toBe(1);
    // fast type: speed 0.25 progress/s → ~0.25 after one simulated second.
    expect(demon.progress).toBeCloseTo(0.25, 2);
    const expected = pathPointAt(PATHS_BY_ID[1]!, demon.progress);
    expect(demon.x).toBeCloseTo(expected.x, 6);
    expect(demon.y).toBeCloseTo(expected.y, 6);
    expect(demon.z).toBeCloseTo(expected.z, 6);
  });

  it('a demon spawned this step does not move until the next step', () => {
    const state = makeGameState();
    const cursor = createSpawnCursor();

    stepSpawn({ state, cursor, fixedDtMs: WAVE_SCHEDULE[0]!.atMs });

    expect(state.demons[0]!.progress).toBe(0);
  });
});
