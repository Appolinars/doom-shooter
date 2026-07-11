// Static config — data-model.md §Static config (lookup-data analog). Immutable typed
// module constants referenced by id. Values are DATA only; scoring/spawn/movement RULES
// live in systems/* (.claude/rules/migrations.md: "config objects hold values only").
//
// NOTE: the numeric values below (speeds, path coordinates, schedule slots) are
// placeholder tuning values — the concrete-slot-values TBD in data-model.md is accepted
// debt (SAD §11), tuned in T-05 (spawn) and T-09 (renderer). Their SHAPE is locked here.

/**
 * World space (ADR-0001): demon paths, waypoints and fire-intent aim coords all live
 * in this virtual 1000×1000 space. The renderer (T-09) maps it to the canvas and
 * input/pointer.ts (T-04) maps pointer clicks back into it — sharing this constant is
 * what keeps aim, hit-test and draw in one coordinate system.
 */
export const VIRTUAL_WIDTH = 1000;
export const VIRTUAL_HEIGHT = 1000;

/**
 * Pump duration after every shot (game-feel ADR-0002): the only weapon gate — no
 * magazine, unlimited ammo (PRD §1 amendment). Decremented by the fixed step, never
 * wall-clock. Tunable; 350 ms resolved in the game-feel PRD §8 OQ.
 */
export const PUMP_DURATION_MS = 350;

/**
 * Visual lifetime of a hit splat on the render layer (game-feel ADR-0004, PRD AC-01).
 * Aged by the rAF frame delta in the effects store, never the fixed step.
 */
export const SHOT_SPLAT_MS = 250;

/**
 * Death-animation length on the render layer (game-feel ADR-0004, PRD AC-04): the demon
 * despawns from GameState on the fixed step; the effects store holds the dying visual
 * this long. ~1 s per the PRD; the renderer (T-08) slices per-demon frames over it.
 */
export const DEATH_ANIM_MS = 1000;

/**
 * World-space crosshair hit radius (T-07): a demon is "under the crosshair" when its
 * cached (x, y) is within this distance of the aim point. Constant across depth in the
 * MVP — z-scaling the hitbox to match rendered sprite size is deferred with the 2.5D
 * layer (ADR-0001). Placeholder tuning value — shape locked here.
 */
export const DEMON_HIT_RADIUS = 60;

/** Round length before the timer end-branch fires (ADR-0004). */
export const ROUND_DURATION_MS = 60_000;

export type DemonName = 'fast' | 'brute' | 'baron';

export interface DemonType {
  id: number;
  name: DemonName;
  /** Path progress gained per second (0..1 space). Higher = crosses the range faster. */
  speed: number;
  /** AC-03 flat points awarded on kill. */
  pointValue: number;
  /** Shots to kill (game-feel ADR-0001): demons spawn with hp = maxHp. */
  maxHp: number;
  /** Key into the sprite atlas (T-10). */
  spriteKey: string;
}

export interface Waypoint {
  x: number;
  y: number;
  /** Depth (ADR-0001): 1 = far/small, 0 = near/large. */
  z: number;
}

export interface Path {
  id: number;
  /** Named spawn point (CONTEXT.md); the first waypoint. */
  spawnPointRef: string;
  /** Ordered (x, y, z) list — at least the spawn point plus one destination. */
  waypoints: Waypoint[];
}

/** One scheduled spawn: at `atMs` from round start, spawn `demonTypeId` on `pathId`. */
export interface SpawnSlot {
  atMs: number;
  demonTypeId: number;
  pathId: number;
}

/**
 * HP tiers: fast=3 (T-13 rebalance — the PRD §8 default was 1; raised so its remapped
 * hurt frames are reachable), brute=2, baron=4. Baron pointValue and speed are
 * placeholders — TODO tuning (game-feel PRD §8 OQ "HP-tier balance").
 */
export const DEMON_TYPES: readonly DemonType[] = [
  { id: 1, name: 'fast', speed: 0.25, pointValue: 10, maxHp: 3, spriteKey: 'demon-fast' },
  { id: 2, name: 'brute', speed: 0.125, pointValue: 25, maxHp: 2, spriteKey: 'demon-brute' },
  { id: 3, name: 'baron', speed: 0.09, pointValue: 60, maxHp: 4, spriteKey: 'demon-baron' },
];

/**
 * Fixed paths (US-05). Coordinates are in a 1000×1000 virtual space, mapped to the
 * canvas by the renderer (T-09); z runs far(1)→near(0) as `progress` runs 0→1.
 */
export const PATHS: readonly Path[] = [
  {
    id: 1,
    spawnPointRef: 'left-gate',
    waypoints: [
      { x: 150, y: 300, z: 1 },
      { x: 400, y: 650, z: 0 },
    ],
  },
  {
    id: 2,
    spawnPointRef: 'right-gate',
    waypoints: [
      { x: 850, y: 300, z: 1 },
      { x: 600, y: 650, z: 0 },
    ],
  },
];

/** One round = one schedule in MVP. Kept unsorted here; `buildWaveSchedule` sorts by atMs. */
const RAW_WAVE_SCHEDULE: readonly SpawnSlot[] = [
  { atMs: 500, demonTypeId: 1, pathId: 1 },
  { atMs: 2_000, demonTypeId: 1, pathId: 2 },
  { atMs: 4_000, demonTypeId: 2, pathId: 1 },
  { atMs: 6_500, demonTypeId: 1, pathId: 2 },
  { atMs: 9_000, demonTypeId: 2, pathId: 2 },
  { atMs: 12_000, demonTypeId: 1, pathId: 1 },
  { atMs: 14_000, demonTypeId: 3, pathId: 2 },
  { atMs: 15_000, demonTypeId: 2, pathId: 1 },
  { atMs: 18_500, demonTypeId: 1, pathId: 2 },
  { atMs: 22_000, demonTypeId: 2, pathId: 2 },
  { atMs: 24_000, demonTypeId: 3, pathId: 1 },
  { atMs: 26_000, demonTypeId: 1, pathId: 1 },
];

function buildLookup<T extends { id: number }>(items: readonly T[], kind: string): Record<number, T> {
  const byId: Record<number, T> = {};
  for (const item of items) {
    if (byId[item.id]) {
      throw new Error(`Duplicate ${kind} id: ${item.id}`);
    }
    byId[item.id] = item;
  }
  return byId;
}

/** FK-index analog: every typeId dereference is O(1). */
export const DEMON_TYPES_BY_ID: Record<number, DemonType> = buildLookup(DEMON_TYPES, 'DemonType');

/** FK-index analog: every pathId dereference is O(1). */
export const PATHS_BY_ID: Record<number, Path> = buildLookup(PATHS, 'Path');

/** Time-sorted wave schedule — spawn system advances a cursor over it (amortized O(1)/step). */
export const WAVE_SCHEDULE: readonly SpawnSlot[] = [...RAW_WAVE_SCHEDULE].sort((a, b) => a.atMs - b.atMs);

/**
 * Boot-time integrity check: every schedule slot must reference an existing demon type
 * and path (data-model edge case: unknown typeId/pathId handled at boot validation).
 * This is config integrity, not game logic — no state is mutated.
 */
export function validateStaticConfig(): void {
  for (const slot of WAVE_SCHEDULE) {
    if (!DEMON_TYPES_BY_ID[slot.demonTypeId]) {
      throw new Error(`WAVE_SCHEDULE slot at ${slot.atMs}ms references unknown demonTypeId ${slot.demonTypeId}`);
    }
    if (!PATHS_BY_ID[slot.pathId]) {
      throw new Error(`WAVE_SCHEDULE slot at ${slot.atMs}ms references unknown pathId ${slot.pathId}`);
    }
  }
}
