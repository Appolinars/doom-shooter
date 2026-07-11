// Shot entity — data-model.md §Entities.Shot. Transient: kept for hit/miss feedback
// rendering, then pruned after the visual cue.

/**
 * 'hit' = connected but the demon survived (hurt); 'kill' = connected and the demon's
 * last HP was removed (game-feel T-02). T-08/T-09 show a splat on 'hit'/'kill' and a
 * death visual only on 'kill'.
 */
export type ShotOutcome = 'hit' | 'kill' | 'miss';

/** What the shot connected with, captured at resolve time (the demon may be despawned). */
export interface ShotTarget {
  typeId: number;
  x: number;
  y: number;
  z: number;
}

/** A resolved shot, retained only long enough to render its feedback cue. */
export interface Shot {
  /** Round-relative timestamp; the input→shot latency NFR measurement point. */
  firedAtMs: number;
  /** DPR-corrected world coordinates (SAD §8 DPR mapping). */
  aimX: number;
  aimY: number;
  outcome: ShotOutcome;
  /** Present unless outcome is 'miss' — feeds the T-08/T-09 splat + death cues. */
  target?: ShotTarget;
}
