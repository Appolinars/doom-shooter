// Demon entity helpers (game-feel T-01, ADR-0001): hurt is derived from hp < maxHp,
// never stored as a flag on the entity.

import { describe, it, expect } from 'vitest';
import { isDemonHurt } from '../../src/entities/demon.ts';
import { DEMON_TYPES } from '../../src/core/config.ts';
import { makeDemon } from '../factories.ts';

describe('isDemonHurt (AC-T01-2)', () => {
  it('is false for a fresh demon of every type (hp === maxHp)', () => {
    for (const type of DEMON_TYPES) {
      const demon = makeDemon({ typeId: type.id, hp: type.maxHp });
      expect(isDemonHurt(demon)).toBe(false);
    }
  });

  it('is true once hp drops below maxHp', () => {
    const brute = DEMON_TYPES.find((t) => t.name === 'brute')!;
    const demon = makeDemon({ typeId: brute.id, hp: brute.maxHp - 1 });
    expect(isDemonHurt(demon)).toBe(true);
  });

  it('is never true for a 1-HP type while alive', () => {
    const fast = DEMON_TYPES.find((t) => t.name === 'fast')!;
    expect(isDemonHurt(makeDemon({ typeId: fast.id, hp: fast.maxHp }))).toBe(false);
  });
});

describe('makeDemon factory hp default', () => {
  it('derives hp from the overridden typeId so defaults stay contract-valid', () => {
    for (const type of DEMON_TYPES) {
      expect(makeDemon({ typeId: type.id }).hp).toBe(type.maxHp);
    }
  });
});
