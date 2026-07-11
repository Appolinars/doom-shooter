// Event → feedback wiring + retry (game-feel T-09, SAD §6 flows 1-3). The fixed step
// stays event-free (ADR-0004): systems only mutate GameState, and this module observes
// the mutations once per rendered frame — a new Shot means a fire happened, a new demon
// id means a spawn — and triggers the paired SFX (T-05) + effect (T-06). Extracted from
// main.ts so the 6/6 action→feedback contract and the retry reset are unit-testable;
// main.ts owns only the DOM (canvas, gesture target, the try-again button).

import type { GameState } from './core/state.ts';
import { createInitialGameState } from './core/state.ts';
import { DEMON_TYPES_BY_ID } from './core/config.ts';
import { createSpawnCursor, type SpawnCursor } from './systems/spawn.ts';
import { SFX_KEYS, type SfxKey } from './audio/sfx.ts';
import type { EffectsStore } from './render/effects.ts';

/**
 * `demon-fast-hurt` is not an authored key (1 HP — a fast demon never survives a hit),
 * so demon SFX keys are built by template and guarded against the 9-key contract.
 */
const asSfxKey = (candidate: string): SfxKey | null =>
  (SFX_KEYS as readonly string[]).includes(candidate) ? (candidate as SfxKey) : null;

export interface CreateFeedbackWiringParams {
  state: GameState;
  effects: EffectsStore;
  playSfx: (key: SfxKey) => void;
  /** Fired once per `running → ended` transition (T-11: starts the finale music). */
  onRoundEnd?: () => void;
}

export interface FeedbackWiring {
  /**
   * Diffs the state against the previous frame and emits SFX + effects for every new
   * shot (shoot → splat/death by outcome) and newly spawned demon. Call once per frame,
   * before effects are pruned.
   */
  syncFrame: () => void;
  /** Forgets everything seen — retry restarts demon ids, so stale sets must not leak. */
  reset: () => void;
}

export const createFeedbackWiring = ({ state, effects, playSfx, onRoundEnd }: CreateFeedbackWiringParams): FeedbackWiring => {
  // Shots carry no id and are pruned by age — object identity is the stable handle.
  let processedShots = new WeakSet<object>();
  let knownDemonIds = new Set<number>();
  let roundEndSeen = false;

  const playDemonSfx = ({ typeId, event }: { typeId: number; event: 'spawn' | 'hurt' | 'death' }): void => {
    const name = DEMON_TYPES_BY_ID[typeId]?.name;
    if (!name) {
      return;
    }
    const key = asSfxKey(`demon-${name}-${event}`);
    if (key) {
      playSfx(key);
    }
  };

  const processShot = (shot: GameState['shots'][number]): void => {
    playSfx('shoot');
    effects.onFire();
    if (shot.outcome === 'miss' || !shot.target) {
      return;
    }
    const { typeId, x, y, z } = shot.target;
    effects.spawnSplat({ x, y, z });
    if (shot.outcome === 'kill') {
      effects.spawnDeath({ typeId, x, y, z });
      playDemonSfx({ typeId, event: 'death' });
    } else {
      playDemonSfx({ typeId, event: 'hurt' });
    }
  };

  const syncFrame = (): void => {
    for (const shot of state.shots) {
      if (!processedShots.has(shot)) {
        processedShots.add(shot);
        processShot(shot);
      }
    }
    for (const demon of state.demons) {
      if (!knownDemonIds.has(demon.id)) {
        knownDemonIds.add(demon.id);
        playDemonSfx({ typeId: demon.typeId, event: 'spawn' });
      }
    }
    if (state.round.status === 'ended' && !roundEndSeen) {
      roundEndSeen = true;
      onRoundEnd?.();
    }
  };

  const reset = (): void => {
    processedShots = new WeakSet<object>();
    knownDemonIds = new Set<number>();
    roundEndSeen = false;
  };

  return { syncFrame, reset };
};

export interface RestartRoundParams {
  state: GameState;
  cursor: SpawnCursor;
  effects: EffectsStore;
  wiring: FeedbackWiring;
  /** T-07 backdrop reroll; returns the new round's backdrop (or null → black). */
  pickBackdrop: () => CanvasImageSource | null;
  /** T-11: silences the looping finale so it never plays into the new round. */
  stopFinale?: () => void;
}

/**
 * "Try again" (PRD AC-10, SAD §6 flow 3): rebuilds the round via `createInitialGameState`,
 * restarts the spawn schedule, clears every render-side effect mid-animation or not
 * (AC-09), forgets seen ids, and rerolls the backdrop. Mutates `state`/`cursor` in place
 * so every closure holding them (loop, input, debug API) sees the fresh round. Idempotent —
 * a second fast click just rebuilds the same fresh state again.
 */
export const restartRound = ({
  state,
  cursor,
  effects,
  wiring,
  pickBackdrop,
  stopFinale,
}: RestartRoundParams): CanvasImageSource | null => {
  Object.assign(state, createInitialGameState());
  Object.assign(cursor, createSpawnCursor());
  effects.clear();
  wiring.reset();
  stopFinale?.();
  return pickBackdrop();
};
