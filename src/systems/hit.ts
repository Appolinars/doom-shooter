// Hit system (US-01, AC-01/AC-06, SAD §6 Critical flow 1) — resolves one fired shot to
// the front-most demon under the crosshair by z, removes the kill, hands scoring to
// score.ts, and leaves a transient Shot for the T-09 feedback cue. This is the T-07
// FireResolver that weapon.ts drains per valid fire (its `onFire` seam), in FIFO order.
//
// "Front-most" = nearest the player = smallest z (ADR-0001: z runs far(1)→near(0)); ties
// break on the lower id so overlapping same-depth demons resolve deterministically.
// Shots are appended only — pruning them after the visual cue is the renderer's job
// (T-09); no cue-duration constant is invented here.

import type { Demon } from '../core/state.ts';
import type { FireResolver } from './weapon.ts';
import { DEMON_HIT_RADIUS } from '../core/config.ts';
import { applyKill } from './score.ts';

const isUnderCrosshair = ({ demon, aimX, aimY }: { demon: Demon; aimX: number; aimY: number }): boolean => {
  const dx = demon.x - aimX;
  const dy = demon.y - aimY;
  return dx * dx + dy * dy <= DEMON_HIT_RADIUS * DEMON_HIT_RADIUS;
};

/** Nearer (smaller z) wins; equal depth breaks on the lower id (AC-T07 tie-break). */
const isFrontMost = ({ candidate, incumbent }: { candidate: Demon; incumbent: Demon }): boolean =>
  candidate.z !== incumbent.z ? candidate.z < incumbent.z : candidate.id < incumbent.id;

/**
 * Front-most demon under the crosshair, or null on a clean miss. Linear scan over the
 * live demons (data-model "hit-test" access pattern — O(n) at ≤ 30 demons beats keeping
 * a sorted structure every step).
 */
export const findFrontMostHit = ({
  demons,
  aimX,
  aimY,
}: {
  demons: readonly Demon[];
  aimX: number;
  aimY: number;
}): Demon | null => {
  let best: Demon | null = null;
  for (const demon of demons) {
    if (!isUnderCrosshair({ demon, aimX, aimY })) {
      continue;
    }
    if (best === null || isFrontMost({ candidate: demon, incumbent: best })) {
      best = demon;
    }
  }
  return best;
};

/**
 * Resolve one fired shot (weapon.ts's `onFire` contract):
 *   hit  → remove the front-most demon, bump resolvedCount, add its points (score.ts);
 *   miss → nothing removed, score untouched.
 * Either way a transient Shot records the outcome for the T-09 feedback cue.
 */
export const resolveFire: FireResolver = ({ state, fire }) => {
  const target = findFrontMostHit({ demons: state.demons, aimX: fire.aimX, aimY: fire.aimY });

  if (target !== null) {
    state.demons = state.demons.filter((demon) => demon.id !== target.id);
    state.round.resolvedCount += 1;
    applyKill({ round: state.round, demonTypeId: target.typeId });
  }

  state.shots.push({
    firedAtMs: fire.atMs,
    aimX: fire.aimX,
    aimY: fire.aimY,
    outcome: target !== null ? 'hit' : 'miss',
  });
};
