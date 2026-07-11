import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  loadSprites,
  validateSpriteKeys,
  type SpriteImage,
} from '../../src/assets/sprites.ts';
import type { PixelArt } from '../../src/assets/demon-art.ts';
import type { DemonType } from '../../src/core/config.ts';

const stubArt: Readonly<Record<string, PixelArt>> = {
  'demon-fast': { palette: { r: '#f00' }, rows: ['r'] },
  'demon-brute': { palette: { g: '#0f0' }, rows: ['g'] },
};

/** A drawable stand-in — the loader only stores and returns it, never inspects it. */
const fakeImage = (key: string): SpriteImage => ({ key }) as unknown as SpriteImage;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('loadSprites — ready-signal (AC-T10 loader)', () => {
  it('starts not-ready and resolves the atlas once loads settle', async () => {
    const rasterize = vi.fn(async (art: PixelArt): Promise<SpriteImage> => {
      void art;
      return fakeImage('x');
    });

    const { atlas, loaded } = loadSprites({ art: stubArt, rasterize });

    expect(atlas.ready).toBe(false);
    expect(atlas.get('demon-fast')).toBeNull();

    await loaded;

    expect(atlas.ready).toBe(true);
    expect(rasterize).toHaveBeenCalledTimes(2);
  });

  it('exposes each rasterized sprite by its key', async () => {
    const rasterize = async (art: PixelArt): Promise<SpriteImage> =>
      fakeImage(Object.keys(art.palette)[0]!);

    const { atlas, loaded } = loadSprites({ art: stubArt, rasterize });
    await loaded;

    expect(atlas.get('demon-fast')).not.toBeNull();
    expect(atlas.get('demon-brute')).not.toBeNull();
    expect(atlas.get('missing')).toBeNull();
  });
});

describe('loadSprites — fail-soft (AC-T10-2)', () => {
  it('logs and omits a sprite that fails to load, keeping the others', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const rasterize = async (art: PixelArt): Promise<SpriteImage> => {
      if (art.palette.r) {
        throw new Error('boom');
      }
      return fakeImage('brute');
    };

    const { atlas, loaded } = loadSprites({ art: stubArt, rasterize });
    await loaded;

    expect(atlas.ready).toBe(true); // never rejects — a bad asset must not crash boot
    expect(atlas.get('demon-fast')).toBeNull(); // failed → placeholder at draw time
    expect(atlas.get('demon-brute')).not.toBeNull();
    expect(consoleError).toHaveBeenCalledOnce();
  });
});

describe('validateSpriteKeys — boot-time integrity (T-10 edge case)', () => {
  const types = (spriteKey: string): DemonType[] => [
    { id: 1, name: 'fast', speed: 0.25, pointValue: 10, maxHp: 1, spriteKey },
  ];

  it('passes when every spriteKey has authored art', () => {
    expect(() => validateSpriteKeys(types('demon-fast'), stubArt)).not.toThrow();
  });

  it('throws on a spriteKey with no art — a boot error, not a mid-round crash', () => {
    expect(() => validateSpriteKeys(types('demon-ghost'), stubArt)).toThrow(/demon-ghost/);
  });

  it('validates the real config against the real art by default', () => {
    expect(() => validateSpriteKeys()).not.toThrow();
  });
});
