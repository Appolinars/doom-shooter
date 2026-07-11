import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  loadSprites,
  validateSpriteKeys,
  resolveHurtSprite,
  hurtFrameKey,
  deathFrameKey,
  SPRITE_FILES,
  VIEWMODEL_SPRITE_KEYS,
  DEATH_FRAME_COUNTS,
  type SpriteAtlas,
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

    const { atlas, loaded } = loadSprites({ art: stubArt, rasterize, files: {} });

    expect(atlas.ready).toBe(false);
    expect(atlas.get('demon-fast')).toBeNull();

    await loaded;

    expect(atlas.ready).toBe(true);
    expect(rasterize).toHaveBeenCalledTimes(2);
  });

  it('exposes each rasterized sprite by its key', async () => {
    const rasterize = async (art: PixelArt): Promise<SpriteImage> =>
      fakeImage(Object.keys(art.palette)[0]!);

    const { atlas, loaded } = loadSprites({ art: stubArt, rasterize, files: {} });
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

    const { atlas, loaded } = loadSprites({ art: stubArt, rasterize, files: {} });
    await loaded;

    expect(atlas.ready).toBe(true); // never rejects — a bad asset must not crash boot
    expect(atlas.get('demon-fast')).toBeNull(); // failed → placeholder at draw time
    expect(atlas.get('demon-brute')).not.toBeNull();
    expect(consoleError).toHaveBeenCalledOnce();
  });
});

describe('T-07 — external sprite files through the same atlas (AC-T07-1)', () => {
  const rasterize = async (art: PixelArt): Promise<SpriteImage> =>
    fakeImage(`art:${Object.keys(art.palette)[0]!}`);

  it('loads a file key and exposes it via atlas.get', async () => {
    const loadImage = vi.fn(async (url: string): Promise<SpriteImage> => fakeImage(url));
    const { atlas, loaded } = loadSprites({
      art: stubArt,
      rasterize,
      files: { 'weapon-shotgun-idle': 'assets/sprites/weapon-shotgun-idle.png' },
      loadImage,
    });
    await loaded;

    expect(atlas.get('weapon-shotgun-idle')).toEqual(fakeImage('assets/sprites/weapon-shotgun-idle.png'));
    expect(loadImage).toHaveBeenCalledOnce();
  });

  it('a loaded file wins over the bundled pixel art for the same key', async () => {
    const { atlas, loaded } = loadSprites({
      art: stubArt,
      rasterize,
      files: { 'demon-fast': 'assets/sprites/demon-fast.png' },
      loadImage: async (url) => fakeImage(`file:${url}`),
    });
    await loaded;

    expect(atlas.get('demon-fast')).toEqual(fakeImage('file:assets/sprites/demon-fast.png'));
  });

  it('a missing file logs once and falls back to the pixel art / placeholder path', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { atlas, loaded } = loadSprites({
      art: stubArt,
      rasterize,
      files: {
        'demon-fast': 'assets/sprites/demon-fast.png',
        'weapon-shotgun-idle': 'assets/sprites/weapon-shotgun-idle.png',
      },
      loadImage: async () => {
        throw new Error('404');
      },
    });
    await loaded;

    expect(atlas.ready).toBe(true);
    expect(atlas.get('demon-fast')).toEqual(fakeImage('art:r')); // bundled art still covers it
    expect(atlas.get('weapon-shotgun-idle')).toBeNull(); // no art either → placeholder at draw
    expect(consoleError).toHaveBeenCalledTimes(2); // once per failed file, never per frame
  });

  it('SPRITE_FILES matches the manifest §7 key contract (T-13 remap)', () => {
    const keys = Object.keys(SPRITE_FILES);
    expect(keys).toHaveLength(23);
    for (const key of VIEWMODEL_SPRITE_KEYS) {
      expect(SPRITE_FILES[key]).toBe(`assets/sprites/${key}.png`);
    }
    expect(DEATH_FRAME_COUNTS).toEqual({ fast: 3, brute: 3, baron: 3 });
    expect(keys).toContain('demon-baron-death-3');
    expect(keys).not.toContain('demon-baron-death-4');
    expect(keys).not.toContain('demon-brute-death-4');
    expect(keys).not.toContain('demon-fast-death-4');
    expect(keys).toContain('demon-fast-hurt-1');
    expect(keys).toContain('demon-fast-hurt-2');
    expect(keys).toContain('demon-brute-hurt-1');
    expect(keys).not.toContain('demon-brute-hurt-2');
    expect(keys).toContain('demon-baron-hurt-1');
    expect(keys).toContain('demon-baron-hurt-3');
    expect(keys).not.toContain('demon-baron-hurt-2'); // hp 2 → heavy hurt-1 via fallback
  });
});

describe('T-07 — resolveHurtSprite nearest-step fallback (AC-T07-2)', () => {
  const baron: DemonType = { id: 3, name: 'baron', speed: 0.09, pointValue: 60, maxHp: 4, spriteKey: 'demon-baron' };

  const atlasWith = (images: Record<string, SpriteImage>): SpriteAtlas => ({
    get: (spriteKey) => images[spriteKey] ?? null,
    ready: true,
  });

  it('returns the exact hurt step when authored', () => {
    const atlas = atlasWith({
      [hurtFrameKey({ name: 'baron', hpRemaining: 2 })]: fakeImage('hurt-2'),
      [hurtFrameKey({ name: 'baron', hpRemaining: 1 })]: fakeImage('hurt-1'),
    });
    expect(resolveHurtSprite({ atlas, type: baron, hp: 2 })).toEqual(fakeImage('hurt-2'));
  });

  it('falls back to the nearest lower step for a missing one (baron hp 3 → hurt-1)', () => {
    const atlas = atlasWith({
      [hurtFrameKey({ name: 'baron', hpRemaining: 1 })]: fakeImage('hurt-1'),
    });
    expect(resolveHurtSprite({ atlas, type: baron, hp: 3 })).toEqual(fakeImage('hurt-1'));
  });

  it('baron wound reads light → heavy over the shipped hurt-3/hurt-1 slots (T-13 fix)', () => {
    const atlas = atlasWith({
      [hurtFrameKey({ name: 'baron', hpRemaining: 3 })]: fakeImage('light'),
      [hurtFrameKey({ name: 'baron', hpRemaining: 1 })]: fakeImage('heavy'),
    });

    expect(resolveHurtSprite({ atlas, type: baron, hp: 3 })).toEqual(fakeImage('light'));
    expect(resolveHurtSprite({ atlas, type: baron, hp: 2 })).toEqual(fakeImage('heavy'));
    expect(resolveHurtSprite({ atlas, type: baron, hp: 1 })).toEqual(fakeImage('heavy'));
  });

  it('falls back to the full frame when no hurt step exists, and null when nothing does', () => {
    const atlas = atlasWith({ 'demon-baron': fakeImage('full') });
    expect(resolveHurtSprite({ atlas, type: baron, hp: 2 })).toEqual(fakeImage('full'));

    expect(resolveHurtSprite({ atlas: atlasWith({}), type: baron, hp: 2 })).toBeNull();
  });

  it('deathFrameKey builds the manifest key scheme', () => {
    expect(deathFrameKey({ name: 'fast', frame: 3 })).toBe('demon-fast-death-3');
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
