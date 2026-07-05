// Sprite loading + fail-soft (SAD §11 OQ, closed in T-10). Rasterizes the own pixel art in
// demon-art.ts into drawable images behind a ready-promise, keyed by `spriteKey`. A key that
// fails to rasterize is logged and omitted — the renderer then falls back to placeholder
// shapes (SAD §8 fail-soft, AC-T10-2), so a bad asset never crashes a round.

import { DEMON_TYPES, type DemonType } from '../core/config.ts';
import { DEMON_ART, type PixelArt } from './demon-art.ts';

/** Anything `CanvasRenderingContext2D.drawImage` accepts; rasterized art is an HTMLCanvasElement. */
export type SpriteImage = CanvasImageSource;

export interface SpriteAtlas {
  /** The drawable for a `spriteKey`, or null when it never loaded (→ placeholder). */
  get(spriteKey: string): SpriteImage | null;
  /** True once every sprite load has settled (resolved or failed). */
  readonly ready: boolean;
}

export interface SpriteLoad {
  /** Live atlas — `get` returns null until a sprite settles, then swaps in without restart. */
  atlas: SpriteAtlas;
  /** Resolves when all sprite loads have settled; failures are already logged, not thrown. */
  loaded: Promise<void>;
}

/** One art cell in CSS px on the rasterized canvas — art is scaled again to depth size at draw. */
const PIXEL_SCALE = 8;

/**
 * Rasterizes a char-grid `PixelArt` onto an offscreen canvas. Async so the loader's
 * ready-promise models a real (slow-host) asset pipeline; rejects if the 2D context is
 * unavailable so the caller can fall back. DOM-dependent — tests inject a fake rasterizer.
 */
export const rasterizePixelArt = async (art: PixelArt): Promise<SpriteImage> => {
  const height = art.rows.length;
  const width = art.rows[0]?.length ?? 0;
  const canvas = document.createElement('canvas');
  canvas.width = width * PIXEL_SCALE;
  canvas.height = height * PIXEL_SCALE;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D context unavailable for sprite rasterization');
  }

  for (let y = 0; y < height; y++) {
    const row = art.rows[y]!;
    for (let x = 0; x < row.length; x++) {
      const color = art.palette[row[x]!];
      if (!color) {
        continue; // transparent cell
      }
      ctx.fillStyle = color;
      ctx.fillRect(x * PIXEL_SCALE, y * PIXEL_SCALE, PIXEL_SCALE, PIXEL_SCALE);
    }
  }
  return canvas;
};

type Rasterizer = (art: PixelArt) => Promise<SpriteImage>;

export interface LoadSpritesOptions {
  art?: Readonly<Record<string, PixelArt>>;
  /** Injectable for tests; defaults to the DOM canvas rasterizer. */
  rasterize?: Rasterizer;
}

/**
 * Kicks off loading every sprite in `art` and returns the live atlas immediately plus a
 * `loaded` promise. The renderer reads `atlas.get` every frame, so sprites that arrive after
 * a round starts swap in on the next frame with no restart (T-10 edge case).
 */
export const loadSprites = ({
  art = DEMON_ART,
  rasterize = rasterizePixelArt,
}: LoadSpritesOptions = {}): SpriteLoad => {
  const images = new Map<string, SpriteImage>();
  let ready = false;

  const atlas: SpriteAtlas = {
    get: (spriteKey) => images.get(spriteKey) ?? null,
    get ready() {
      return ready;
    },
  };

  const loaded = Promise.all(
    Object.entries(art).map(async ([spriteKey, pixels]) => {
      try {
        images.set(spriteKey, await rasterize(pixels));
      } catch (err) {
        console.error(`[sprites] failed to load "${spriteKey}", using placeholder`, err);
      }
    }),
  ).then(() => {
    ready = true;
  });

  return { atlas, loaded };
};

/**
 * Boot-time integrity check (config-integrity, not game logic): every DemonType.spriteKey
 * must have authored art, so a missing key is a boot error — not a mid-round crash
 * (T-10 edge case). Mirrors config.ts `validateStaticConfig`.
 */
export const validateSpriteKeys = (
  demonTypes: readonly DemonType[] = DEMON_TYPES,
  art: Readonly<Record<string, PixelArt>> = DEMON_ART,
): void => {
  for (const type of demonTypes) {
    if (!art[type.spriteKey]) {
      throw new Error(`DemonType "${type.name}" references unknown spriteKey "${type.spriteKey}"`);
    }
  }
};
