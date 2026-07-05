// Shot entity — data-model.md §Entities.Shot. Transient: kept for hit/miss feedback
// rendering, then pruned after the visual cue.

export type ShotOutcome = 'hit' | 'miss';

/** A resolved shot, retained only long enough to render its feedback cue. */
export interface Shot {
  /** Round-relative timestamp; the input→shot latency NFR measurement point. */
  firedAtMs: number;
  /** DPR-corrected world coordinates (SAD §8 DPR mapping). */
  aimX: number;
  aimY: number;
  outcome: ShotOutcome;
}
