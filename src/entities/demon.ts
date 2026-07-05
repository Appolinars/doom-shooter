// Demon entity — data-model.md §Entities.Demon. Live demons only; resolved ones
// are removed from GameState.demons (hard-delete analog), outcome recorded on Round.

/** A live demon moving along a fixed path. */
export interface Demon {
  /** Unique per round, in-memory incremental (SAD §8) — no UUIDs client-side. */
  id: number;
  /** Must exist in DEMON_TYPES; resolved via keyed map, O(1). */
  typeId: number;
  /** Must exist in PATHS; fixed for the demon's life, never re-assigned (US-05). */
  pathId: number;
  /** 0..1 along the path; reaching 1.0 un-killed → despawn + miss (AC-05). */
  progress: number;
  /** Screen position derived from the path at `progress`; cached for render + hit-test. */
  x: number;
  y: number;
  /** Depth: drives sprite scale, draw order and hit priority (ADR-0001). Present from day one. */
  z: number;
}
