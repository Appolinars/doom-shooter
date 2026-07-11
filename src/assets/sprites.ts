// Sprite loading + fail-soft (SAD §11 OQ, closed in T-10). Rasterizes the own pixel art in
// demon-art.ts into drawable images behind a ready-promise, keyed by `spriteKey`. A key that
// fails to rasterize is logged and omitted — the renderer then falls back to placeholder
// shapes (SAD §8 fail-soft, AC-T10-2), so a bad asset never crashes a round.
//
// game-feel T-07 extends the same atlas with author-supplied files from public/assets/
// (viewmodel frames, per-HP-step hurt frames, per-frame death animations — assets-manifest
// §3.2/§7): a loaded file wins over the bundled pixel art for the same key, a missing file
// degrades to that pixel art or the placeholder shape through the same `get → null` contract.

import { DEMON_TYPES, type DemonName, type DemonType } from '../core/config.ts';
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

// --- External sprite files (game-feel T-07, assets-manifest §3.2 / §7 key contract) ---

/** Viewmodel frames: fire = idle + flash overlay, then the pump sequence — no `fire` frame. */
export const VIEWMODEL_SPRITE_KEYS = [
  'weapon-shotgun-idle',
  'weapon-shotgun-pump-1',
  'weapon-shotgun-pump-2',
  'weapon-shotgun-pump-3',
  'weapon-shotgun-flash-1',
  'weapon-shotgun-flash-2',
] as const;

/**
 * Frames per death animation (§3.2, per-frame files); T-08 slices `deathProgress` over
 * these. Uniform 3 since T-13: the early death frames moved into the hurt slots.
 */
export const DEATH_FRAME_COUNTS: Readonly<Record<DemonName, number>> = {
  fast: 3,
  brute: 3,
  baron: 3,
};

/**
 * Hurt steps actually authored per demon (§3.2, remapped in T-13): `fast` (3 HP) and
 * `baron` (4 HP) ship hurt-2 + hurt-1; baron's hp 3 resolves to hurt-2 via the
 * nearest-step fallback.
 */
const AUTHORED_HURT_STEPS: Readonly<Record<DemonName, readonly number[]>> = {
  fast: [1, 2],
  brute: [1],
  baron: [1, 2],
};

export const hurtFrameKey = ({ name, hpRemaining }: { name: DemonName; hpRemaining: number }): string =>
  `demon-${name}-hurt-${hpRemaining}`;

export const deathFrameKey = ({ name, frame }: { name: DemonName; frame: number }): string =>
  `demon-${name}-death-${frame}`;

const buildSpriteFileKeys = (): string[] => {
  const keys: string[] = [...VIEWMODEL_SPRITE_KEYS];
  for (const type of DEMON_TYPES) {
    keys.push(type.spriteKey);
    for (const step of AUTHORED_HURT_STEPS[type.name]) {
      keys.push(hurtFrameKey({ name: type.name, hpRemaining: step }));
    }
    for (let frame = 1; frame <= DEATH_FRAME_COUNTS[type.name]; frame++) {
      keys.push(deathFrameKey({ name: type.name, frame }));
    }
  }
  return keys;
};

/** Atlas key → URL of the author-supplied PNG served from `public/assets/sprites/` (§2). */
export const SPRITE_FILES: Readonly<Record<string, string>> = Object.fromEntries(
  buildSpriteFileKeys().map((key) => [key, `assets/sprites/${key}.png`]),
);

/** Browser file loader; DOM-dependent — tests inject a fake. */
export const loadImageElement = (url: string): Promise<SpriteImage> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`image failed to load: ${url}`));
    image.src = url;
  });

export interface ResolveHurtSpriteParams {
  atlas: SpriteAtlas;
  type: DemonType;
  hp: number;
}

/**
 * Per-HP-step hurt frame with nearest-step fallback (AC-T07-2): exact `hurt-<hp>` first,
 * then lower steps, then the full frame — a gap in authored art degrades, never errors.
 * Callers gate on `hp < maxHp`; an unhurt demon draws its full frame directly.
 */
export const resolveHurtSprite = ({ atlas, type, hp }: ResolveHurtSpriteParams): SpriteImage | null => {
  for (let step = hp; step >= 1; step--) {
    const frame = atlas.get(hurtFrameKey({ name: type.name, hpRemaining: step }));
    if (frame) {
      return frame;
    }
  }
  return atlas.get(type.spriteKey);
};

// --- Loader ---

type Rasterizer = (art: PixelArt) => Promise<SpriteImage>;

type ImageLoader = (url: string) => Promise<SpriteImage>;

export interface LoadSpritesOptions {
  art?: Readonly<Record<string, PixelArt>>;
  /** Injectable for tests; defaults to the DOM canvas rasterizer. */
  rasterize?: Rasterizer;
  /** External sprite files keyed by atlas key (T-07); pass {} to disable file loading. */
  files?: Readonly<Record<string, string>>;
  /** Injectable for tests; defaults to the DOM Image loader. */
  loadImage?: ImageLoader;
}

/**
 * Kicks off loading every sprite in `art` and every external file in `files`, returning the
 * live atlas immediately plus a `loaded` promise. The renderer reads `atlas.get` every frame,
 * so sprites that arrive after a round starts swap in on the next frame with no restart
 * (T-10 edge case). A loaded file always wins over the bundled art for the same key.
 */
export const loadSprites = ({
  art = DEMON_ART,
  rasterize = rasterizePixelArt,
  files = SPRITE_FILES,
  loadImage = loadImageElement,
}: LoadSpritesOptions = {}): SpriteLoad => {
  const rasterized = new Map<string, SpriteImage>();
  const fileImages = new Map<string, SpriteImage>();
  let ready = false;

  const atlas: SpriteAtlas = {
    get: (spriteKey) => fileImages.get(spriteKey) ?? rasterized.get(spriteKey) ?? null,
    get ready() {
      return ready;
    },
  };

  const artLoads = Object.entries(art).map(async ([spriteKey, pixels]) => {
    try {
      rasterized.set(spriteKey, await rasterize(pixels));
    } catch (err) {
      console.error(`[sprites] failed to load "${spriteKey}", using placeholder`, err);
    }
  });

  const fileLoads = Object.entries(files).map(async ([spriteKey, url]) => {
    try {
      fileImages.set(spriteKey, await loadImage(url));
    } catch (err) {
      console.error(`[sprites] failed to load file "${spriteKey}", using fallback`, err);
    }
  });

  const loaded = Promise.all([...artLoads, ...fileLoads]).then(() => {
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
