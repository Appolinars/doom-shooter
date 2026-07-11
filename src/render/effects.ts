// Render-side effects store (game-feel T-06, ADR-0004): all transient juice — hit splats,
// death visuals, the viewmodel fire→pump→idle clock — lives here, aged by the rAF frame
// delta passed to `advance(dtMs)`. It imports zero `GameState` and calls no system: the
// killing shot despawns the demon on the fixed step (score committed there, AC-04b) and
// only *emits* a visual into this store, so a round-end freeze can keep playing a death
// animation without ever touching the finalized score (AC-09). The renderer (T-08)
// consumes the read API; wiring spawns + `clear()` on retry is T-09.

import { DEATH_ANIM_MS, PUMP_DURATION_MS, SHOT_SPLAT_MS } from '../core/config.ts';

/** A hit splat at its world-space impact point; `ageMs` accumulates rAF deltas. */
export interface SplatEffect {
  x: number;
  y: number;
  z: number;
  ageMs: number;
}

/** A dying demon's visual, keyed by its type for frame lookup; position frozen at death. */
export interface DeathEffect {
  typeId: number;
  x: number;
  y: number;
  z: number;
  ageMs: number;
}

/** 0 at spawn → 1 at the end of the animation; T-08 maps it to a per-demon frame index. */
export const deathProgress = (ageMs: number): number => Math.min(1, Math.max(0, ageMs / DEATH_ANIM_MS));

// --- Viewmodel clock (AC-T06-4) ---
// The shot draws `idle` with flash-1→flash-2 overlaid at the muzzle, then pump-1→2→3,
// then idle (no `fire` frame, no reload — assets-manifest §7). The sequence spans exactly
// PUMP_DURATION_MS so the visual lands back on idle the moment the fixed-step gate reopens.

export type ViewmodelBase = 'idle' | 'pump-1' | 'pump-2' | 'pump-3';
export type ViewmodelFlash = 'flash-1' | 'flash-2';

export interface ViewmodelFrame {
  base: ViewmodelBase;
  /** Muzzle-flash overlay drawn additively over `base`; null outside the flash window. */
  flash: ViewmodelFlash | null;
}

const FLASH_FRAME_MS = 45;
const FLASH_TOTAL_MS = FLASH_FRAME_MS * 2;
const PUMP_FRAME_MS = (PUMP_DURATION_MS - FLASH_TOTAL_MS) / 3;

const IDLE_FRAME: ViewmodelFrame = { base: 'idle', flash: null };

/** Pure frame selection from time since the last shot — testable without a store. */
export const viewmodelFrameAt = (sinceFireMs: number): ViewmodelFrame => {
  if (sinceFireMs < 0 || sinceFireMs >= PUMP_DURATION_MS) {
    return IDLE_FRAME;
  }
  if (sinceFireMs < FLASH_FRAME_MS) {
    return { base: 'idle', flash: 'flash-1' };
  }
  if (sinceFireMs < FLASH_TOTAL_MS) {
    return { base: 'idle', flash: 'flash-2' };
  }
  const pumpIndex = Math.min(3, Math.floor((sinceFireMs - FLASH_TOTAL_MS) / PUMP_FRAME_MS) + 1);
  return { base: `pump-${pumpIndex}` as ViewmodelBase, flash: null };
};

// --- Store ---

/** Bounds under burst spawning (AC-T06-2): at the cap the oldest effect is dropped. */
export const MAX_SPLATS = 32;
export const MAX_DEATH_VISUALS = 16;

export interface SpawnSplatParams {
  x: number;
  y: number;
  z: number;
}

export interface SpawnDeathParams {
  typeId: number;
  x: number;
  y: number;
  z: number;
}

export interface EffectsStore {
  spawnSplat: (at: SpawnSplatParams) => void;
  spawnDeath: (params: SpawnDeathParams) => void;
  /** Restarts the viewmodel clock at the moment of a shot. */
  onFire: () => void;
  /** Ages every effect by the rAF frame delta — the store's only clock. */
  advance: (dtMs: number) => void;
  /** Drops splats past SHOT_SPLAT_MS and death visuals past DEATH_ANIM_MS. */
  pruneExpired: () => void;
  splats: () => readonly SplatEffect[];
  deathVisuals: () => readonly DeathEffect[];
  viewmodelFrame: () => ViewmodelFrame;
  /** Drops all transient state — retry wiring (T-09) calls this on round restart. */
  clear: () => void;
}

export const createEffectsStore = (): EffectsStore => {
  let splats: SplatEffect[] = [];
  let deathVisuals: DeathEffect[] = [];
  // Starts past the sequence so a fresh store shows idle until the first shot.
  let sinceFireMs = PUMP_DURATION_MS;

  const spawnSplat = ({ x, y, z }: SpawnSplatParams): void => {
    if (splats.length >= MAX_SPLATS) {
      splats.shift();
    }
    splats.push({ x, y, z, ageMs: 0 });
  };

  const spawnDeath = ({ typeId, x, y, z }: SpawnDeathParams): void => {
    if (deathVisuals.length >= MAX_DEATH_VISUALS) {
      deathVisuals.shift();
    }
    deathVisuals.push({ typeId, x, y, z, ageMs: 0 });
  };

  const onFire = (): void => {
    sinceFireMs = 0;
  };

  const advance = (dtMs: number): void => {
    for (const splat of splats) {
      splat.ageMs += dtMs;
    }
    for (const death of deathVisuals) {
      death.ageMs += dtMs;
    }
    sinceFireMs += dtMs;
  };

  const pruneExpired = (): void => {
    splats = splats.filter((splat) => splat.ageMs < SHOT_SPLAT_MS);
    deathVisuals = deathVisuals.filter((death) => death.ageMs < DEATH_ANIM_MS);
  };

  const clear = (): void => {
    splats = [];
    deathVisuals = [];
    sinceFireMs = PUMP_DURATION_MS;
  };

  return {
    spawnSplat,
    spawnDeath,
    onFire,
    advance,
    pruneExpired,
    splats: () => splats,
    deathVisuals: () => deathVisuals,
    viewmodelFrame: () => viewmodelFrameAt(sinceFireMs),
    clear,
  };
};
