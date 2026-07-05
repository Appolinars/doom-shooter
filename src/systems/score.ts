// Score system (US-03, AC-03, SAD §6 Critical flow 1) — the single scoring rule:
// a killed demon adds exactly its type's flat pointValue to the round score. The rule
// lives here; the values are data in DEMON_TYPES (.claude/rules/migrations.md). No
// multipliers (PRD N4), so the score is a non-decreasing sum of positive integers —
// the invariant holds by construction, not by a guard.

import type { Round } from '../core/state.ts';
import { DEMON_TYPES_BY_ID } from '../core/config.ts';

/**
 * Apply one kill to the round score: `score += DEMON_TYPES[typeId].pointValue`.
 * `typeId` is guaranteed to resolve — every live demon was spawned from a validated
 * slot (validateStaticConfig at boot). Only ever adds, keeping the AC-03 score
 * invariant (integer, ≥ 0, non-decreasing) intact.
 */
export const applyKill = ({ round, demonTypeId }: { round: Round; demonTypeId: number }): void => {
  round.score += DEMON_TYPES_BY_ID[demonTypeId]!.pointValue;
};
