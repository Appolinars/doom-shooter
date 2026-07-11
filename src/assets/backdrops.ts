// Backdrops (game-feel T-07, PRD US-06/AC-10): loads the full-screen round backgrounds
// from public/assets/backdrops/ and picks one at random per round — the wiring (T-09)
// rerolls on retry by calling pickRandom again. Fail-soft per AC-06: a failed file logs
// once and is omitted; with zero loaded, pickRandom returns null and the renderer (T-08)
// draws black — the round always plays.

import { loadImageElement, type SpriteImage } from './sprites.ts';

/** The supplied set (assets-manifest §3.3); code depends on the set, not the names. */
export const BACKDROP_URLS: readonly string[] = [
  'assets/backdrops/backdrop-1.webp',
  'assets/backdrops/backdrop-2.webp',
];

export interface BackdropStore {
  /** A random loaded backdrop, or null (→ black fallback) while none has loaded (AC-T07-3). */
  pickRandom: () => SpriteImage | null;
  /** Resolves when every backdrop load has settled; failures are logged, not thrown. */
  loaded: Promise<void>;
}

export interface LoadBackdropsOptions {
  urls?: readonly string[];
  /** Injectable for tests; defaults to the DOM Image loader. */
  loadImage?: (url: string) => Promise<SpriteImage>;
  /** Injectable for tests; defaults to Math.random. */
  random?: () => number;
}

export const loadBackdrops = ({
  urls = BACKDROP_URLS,
  loadImage = loadImageElement,
  random = Math.random,
}: LoadBackdropsOptions = {}): BackdropStore => {
  const images: SpriteImage[] = [];

  const loaded = Promise.all(
    urls.map(async (url) => {
      try {
        images.push(await loadImage(url));
      } catch (err) {
        console.error(`[backdrops] failed to load "${url}", falling back to black`, err);
      }
    }),
  ).then(() => {});

  const pickRandom = (): SpriteImage | null => {
    if (images.length === 0) {
      return null;
    }
    return images[Math.floor(random() * images.length)] ?? null;
  };

  return { pickRandom, loaded };
};
