// Backdrops (game-feel T-07, AC-T07-3): random pick per round from the loaded set, black
// (null) fallback when nothing loads, log-once per failed file — the round always plays.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { loadBackdrops, BACKDROP_URLS } from '../../src/assets/backdrops.ts';
import type { SpriteImage } from '../../src/assets/sprites.ts';

const fakeImage = (url: string): SpriteImage => ({ url }) as unknown as SpriteImage;

const loadAllOk = async (url: string): Promise<SpriteImage> => fakeImage(url);

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AC-T07-3 — random backdrop per round', () => {
  it('ships ≥ 2 backdrop URLs (PRD US-06 target)', () => {
    expect(BACKDROP_URLS.length).toBeGreaterThanOrEqual(2);
  });

  it('picks among the loaded backdrops by the injected random', async () => {
    const store = loadBackdrops({
      urls: ['a.webp', 'b.webp'],
      loadImage: loadAllOk,
      random: () => 0,
    });
    await store.loaded;
    expect(store.pickRandom()).toEqual(fakeImage('a.webp'));

    const lastPick = loadBackdrops({
      urls: ['a.webp', 'b.webp'],
      loadImage: loadAllOk,
      random: () => 0.99,
    });
    await lastPick.loaded;
    expect(lastPick.pickRandom()).toEqual(fakeImage('b.webp'));
  });

  it('a single supplied backdrop is always returned — reroll may repeat it', async () => {
    const store = loadBackdrops({ urls: ['only.webp'], loadImage: loadAllOk, random: Math.random });
    await store.loaded;

    expect(store.pickRandom()).toEqual(fakeImage('only.webp'));
    expect(store.pickRandom()).toEqual(fakeImage('only.webp'));
  });
});

describe('AC-T07-1 / AC-06 — fail-soft to black', () => {
  it('returns null before anything has loaded (renderer draws black)', () => {
    let settle = (): void => {};
    const gate = new Promise<void>((resolve) => {
      settle = resolve;
    });
    const store = loadBackdrops({
      urls: ['slow.webp'],
      loadImage: (url) => gate.then(() => fakeImage(url)),
    });

    expect(store.pickRandom()).toBeNull();
    settle();
  });

  it('logs once per failed file, keeps the rest, and never throws', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const store = loadBackdrops({
      urls: ['broken.webp', 'fine.webp'],
      loadImage: async (url) => {
        if (url === 'broken.webp') {
          throw new Error('404');
        }
        return fakeImage(url);
      },
      random: () => 0,
    });
    await store.loaded;

    expect(consoleError).toHaveBeenCalledOnce();
    expect(store.pickRandom()).toEqual(fakeImage('fine.webp'));
  });

  it('with zero loaded backdrops pickRandom stays null and loaded still resolves', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const store = loadBackdrops({
      urls: ['x.webp', 'y.webp'],
      loadImage: async () => {
        throw new Error('offline');
      },
    });

    await expect(store.loaded).resolves.toBeUndefined();
    expect(store.pickRandom()).toBeNull();
  });
});
