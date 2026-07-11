// Spawn system (US-05, AC-05, SAD §6 Flow 6 + Critical flow 3) — advances the wave
// schedule on the fixed step, moves demons along their fixed paths, and resolves
// escapes as misses. No rendering (T-09) and no scoring/round-freeze (T-07/T-08):
// this module only creates/removes demons and records misses + resolvedCount.

import type { Demon, GameState } from '../core/state.ts';
import type { Path, Waypoint } from '../core/config.ts';
import { DEMON_TYPES_BY_ID, PATHS_BY_ID, WAVE_SCHEDULE } from '../core/config.ts';

/**
 * Per-round spawn runner state, carried between fixed steps (same pattern as the
 * loop's Accumulator). Holds the round clock, the schedule cursor (amortized O(1)
 * per step — data-model "due spawn slots" access pattern) and the demon id counter
 * (in-memory incremental, SAD §8).
 */
export interface SpawnCursor {
  elapsedMs: number;
  slotIndex: number;
  nextDemonId: number;
}

export const createSpawnCursor = (): SpawnCursor => ({
  elapsedMs: 0,
  slotIndex: 0,
  nextDemonId: 1,
});

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/**
 * Position along a fixed path at `progress` (0..1), interpolated across the
 * waypoint segments. Progress is distributed evenly over the `n - 1` segments;
 * with the MVP's two-waypoint paths this is a straight lerp. Never re-assigns the
 * path (US-05) — it only reads it.
 */
export const pathPointAt = (path: Path, progress: number): Waypoint => {
  const waypoints = path.waypoints;
  const clamped = Math.max(0, Math.min(1, progress));
  const segmentCount = waypoints.length - 1;
  if (segmentCount <= 0) {
    return { ...waypoints[0]! };
  }
  const scaled = clamped * segmentCount;
  const segmentIndex = Math.min(Math.floor(scaled), segmentCount - 1);
  const t = scaled - segmentIndex;
  const from = waypoints[segmentIndex]!;
  const to = waypoints[segmentIndex + 1]!;
  return {
    x: lerp(from.x, to.x, t),
    y: lerp(from.y, to.y, t),
    z: lerp(from.z, to.z, t),
  };
};

// Config-map dereferences below are `!`-asserted: every slot/demon typeId & pathId is
// guaranteed to exist by `validateStaticConfig` at boot (data-model "config lookup by id").
const spawnDemon = ({ cursor, pathId, typeId }: { cursor: SpawnCursor; pathId: number; typeId: number }): Demon => {
  const start = pathPointAt(PATHS_BY_ID[pathId]!, 0);
  return {
    id: cursor.nextDemonId++,
    typeId,
    pathId,
    hp: DEMON_TYPES_BY_ID[typeId]!.maxHp,
    progress: 0,
    x: start.x,
    y: start.y,
    z: start.z,
  };
};

/**
 * Move a demon along its path by one fixed step. `speed` is progress-per-second,
 * so the per-step delta is `speed × fixedDt`. Recomputes cached x/y/z (AC-T05-3).
 */
const advanceDemon = ({ demon, fixedDtMs }: { demon: Demon; fixedDtMs: number }): void => {
  const speed = DEMON_TYPES_BY_ID[demon.typeId]!.speed;
  demon.progress += speed * (fixedDtMs / 1000);
  const point = pathPointAt(PATHS_BY_ID[demon.pathId]!, demon.progress);
  demon.x = point.x;
  demon.y = point.y;
  demon.z = point.z;
};

export interface StepSpawnParams {
  state: GameState;
  cursor: SpawnCursor;
  fixedDtMs: number;
}

/**
 * One fixed step of the spawn system:
 *   1. advance every live demon along its path,
 *   2. resolve escapes (progress ≥ 1) — despawn + record miss (AC-T05-2),
 *   3. spawn any schedule slots now due (AC-T05-1).
 *
 * Movement runs before spawning so a freshly created demon sits exactly at its
 * path start (progress 0) on its spawn step and cannot escape the same step.
 * Multiple slots due in one step all spawn, in schedule order (stall recovery).
 */
export const stepSpawn = ({ state, cursor, fixedDtMs }: StepSpawnParams): void => {
  cursor.elapsedMs += fixedDtMs;

  for (const demon of state.demons) {
    advanceDemon({ demon, fixedDtMs });
  }

  const survivors: Demon[] = [];
  for (const demon of state.demons) {
    if (demon.progress >= 1) {
      state.round.misses += 1;
      state.round.resolvedCount += 1;
    } else {
      survivors.push(demon);
    }
  }
  state.demons = survivors;

  while (cursor.slotIndex < WAVE_SCHEDULE.length && WAVE_SCHEDULE[cursor.slotIndex]!.atMs <= cursor.elapsedMs) {
    const slot = WAVE_SCHEDULE[cursor.slotIndex]!;
    state.demons.push(spawnDemon({ cursor, pathId: slot.pathId, typeId: slot.demonTypeId }));
    cursor.slotIndex += 1;
  }
};
