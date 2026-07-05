// Aggregate root + entity schema — data-model.md §Entities (ADR-0003: plain typed
// structs, one central mutable GameState, no ECS). Systems are plain functions that
// mutate this on the fixed step (ADR-0002). This file IS the storage contract
// (.claude/rules/migrations.md: TS types in core/state.ts are the schema).

import type { Demon } from '../entities/demon.ts';
import type { Shot } from '../entities/shot.ts';

export type { Demon } from '../entities/demon.ts';
export type { Shot, ShotOutcome } from '../entities/shot.ts';

export type RoundStatus = 'running' | 'ended';
export type WeaponStatus = 'ready' | 'reloading';

/** Current round only — no history (Non-goal N7). */
export interface Round {
  status: RoundStatus;
  /** AC-03: flat sum of pointValue; ≥ 0, integer, non-decreasing. No multipliers. */
  score: number;
  /** AC-05: escaped demon = miss; ≥ 0. */
  misses: number;
  /** ADR-0004 timer branch; ≥ 0, decremented by the fixed step. */
  timeLeftMs: number;
  /** = length of the wave schedule; set at round start. */
  scheduledCount: number;
  /** killed + escaped; ≤ scheduledCount. End-condition compares counters, no scans. */
  resolvedCount: number;
}

/** The single shotgun. */
export interface Weapon {
  /** 0..SHELL_CAPACITY; consuming the last shell starts reload (Flow 5). */
  shellsLoaded: number;
  /** try-fire while `reloading` is blocked, no shell consumed (AC-02). */
  status: WeaponStatus;
  /** ≥ 0, decremented by the fixed step — never wall-clock (ADR-0002). */
  reloadRemainingMs: number;
}

/**
 * A gated fire request produced by input/pointer.ts (post AC-07 focus/scope gating)
 * and drained once per fixed step by the weapon system. Resolves the data-model
 * `fireIntents` queue-shape TBD.
 */
export interface FireIntent {
  /** DPR-corrected world coordinates of the crosshair at fire time. */
  aimX: number;
  aimY: number;
  /** Round-relative timestamp captured at the input event. */
  atMs: number;
}

/** Aggregate root — owns all runtime entities; static config is referenced by id. */
export interface GameState {
  round: Round;
  weapon: Weapon;
  /** Only live demons; resolved ones are removed. */
  demons: Demon[];
  /** Transient hit/miss feedback cues, pruned after display. */
  shots: Shot[];
  /** FIFO queue drained once per fixed step. */
  fireIntents: FireIntent[];
}
