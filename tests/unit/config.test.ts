import { describe, it, expect } from 'vitest';
import {
  DEMON_TYPES,
  DEMON_TYPES_BY_ID,
  PATHS,
  PATHS_BY_ID,
  WAVE_SCHEDULE,
  validateStaticConfig,
} from '../../src/core/config.ts';

describe('static config lookups (AC-T02-2)', () => {
  it('resolves every demon type by id', () => {
    for (const type of DEMON_TYPES) {
      expect(DEMON_TYPES_BY_ID[type.id]).toBe(type);
    }
  });

  it('resolves every path by id', () => {
    for (const path of PATHS) {
      expect(PATHS_BY_ID[path.id]).toBe(path);
    }
  });

  it('returns undefined for an unknown id (handled at boot validation)', () => {
    expect(DEMON_TYPES_BY_ID[999]).toBeUndefined();
    expect(PATHS_BY_ID[999]).toBeUndefined();
  });

  it('ships the three demon types: fast/low-point, brute/high-point, baron/top-point', () => {
    const fast = DEMON_TYPES.find((t) => t.name === 'fast');
    const brute = DEMON_TYPES.find((t) => t.name === 'brute');
    const baron = DEMON_TYPES.find((t) => t.name === 'baron');
    expect(fast).toBeDefined();
    expect(brute).toBeDefined();
    expect(baron).toBeDefined();
    expect(fast!.speed).toBeGreaterThan(brute!.speed);
    expect(brute!.speed).toBeGreaterThan(baron!.speed);
    expect(fast!.pointValue).toBeLessThan(brute!.pointValue);
    expect(brute!.pointValue).toBeLessThan(baron!.pointValue);
  });

  it('assigns the HP tiers fast=3 (T-13 rebalance), brute=2, baron=4 (AC-T01-1)', () => {
    const maxHpByName = Object.fromEntries(DEMON_TYPES.map((t) => [t.name, t.maxHp]));
    expect(maxHpByName).toEqual({ fast: 3, brute: 2, baron: 4 });
  });

  it('keeps maxHp a bounded positive integer on every type (AC-T01-3)', () => {
    for (const type of DEMON_TYPES) {
      expect(Number.isInteger(type.maxHp)).toBe(true);
      expect(type.maxHp).toBeGreaterThan(0);
    }
  });
});

describe('wave schedule', () => {
  it('is sorted by atMs at build time', () => {
    for (let i = 1; i < WAVE_SCHEDULE.length; i++) {
      expect(WAVE_SCHEDULE[i]!.atMs).toBeGreaterThanOrEqual(WAVE_SCHEDULE[i - 1]!.atMs);
    }
  });

  it('references only existing demon types and paths', () => {
    for (const slot of WAVE_SCHEDULE) {
      expect(DEMON_TYPES_BY_ID[slot.demonTypeId]).toBeDefined();
      expect(PATHS_BY_ID[slot.pathId]).toBeDefined();
    }
  });
});

describe('validateStaticConfig', () => {
  it('passes for the shipped config', () => {
    expect(() => validateStaticConfig()).not.toThrow();
  });
});
