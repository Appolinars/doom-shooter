// Renderer (T-09, ADR-0001) — read-only over GameState. Draws demons back→front with
// size derived from `z` (placeholder shapes until T-10 sprites), crosshair, HUD and the
// round-result screen, plus the FPS dev overlay (SAD §7). World space (VIRTUAL_WIDTH ×
// VIRTUAL_HEIGHT, ADR-0001) is mapped to CSS pixels with the exact inverse of
// pointer.ts `screenToWorld`, so aim, hit-test and draw share one coordinate system.

import type { Demon, GameState, Shot } from '../core/state.ts';
import type { WorldPoint } from '../input/pointer.ts';
import type { SpriteAtlas, SpriteImage } from '../assets/sprites.ts';
import {
  VIRTUAL_WIDTH,
  VIRTUAL_HEIGHT,
  DEMON_TYPES_BY_ID,
  type DemonName,
} from '../core/config.ts';

export interface Viewport {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  /** CSS pixel dimensions of the drawing surface (backing store is DPR-scaled). */
  cssWidth: number;
  cssHeight: number;
  dpr: number;
}

/**
 * Sizes the canvas backing store to `cssSize * devicePixelRatio` so drawing is
 * crisp on HiDPI displays, and scales the context so all draw calls use CSS
 * pixel coordinates regardless of DPR.
 */
export function resizeToWindow(view: Viewport): void {
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = window.innerWidth;
  const cssHeight = window.innerHeight;

  view.canvas.width = Math.round(cssWidth * dpr);
  view.canvas.height = Math.round(cssHeight * dpr);

  view.cssWidth = cssWidth;
  view.cssHeight = cssHeight;
  view.dpr = dpr;

  view.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

export function createViewport(canvas: HTMLCanvasElement): Viewport {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }
  const view: Viewport = { canvas, ctx, cssWidth: 0, cssHeight: 0, dpr: 1 };
  resizeToWindow(view);
  return view;
}

/** Placeholder frame — clears the surface. Kept for the pre-wiring boot path (main.ts). */
export function clearFrame(view: Viewport): void {
  view.ctx.clearRect(0, 0, view.cssWidth, view.cssHeight);
}

// --- Depth (ADR-0001): z runs far(1)→near(0). Size and draw order are functions of z. ---

/** Placeholder sprite radius in CSS px at z = 1 (far) and z = 0 (near). Retuned by T-10. */
const DEMON_FAR_RADIUS = 12;
const DEMON_NEAR_RADIUS = 46;

/**
 * On-screen radius as a monotonic-decreasing function of `z`: near (z = 0) draws largest,
 * far (z = 1) smallest. A flat round (all `z` equal) yields identical sizes (QG-2).
 */
export const depthRadius = (z: number): number => {
  const clamped = Math.min(1, Math.max(0, z));
  return DEMON_NEAR_RADIUS + (DEMON_FAR_RADIUS - DEMON_NEAR_RADIUS) * clamped;
};

/**
 * Demons ordered back→front for painter's-algorithm draw: far (high z) first, near (low z)
 * last. `id` is the tiebreaker so equal-`z` demons keep a stable order — no flicker from an
 * unstable sort in a flat round (T-09 edge case). Returns a copy; never mutates the input.
 */
export const depthOrder = (demons: readonly Demon[]): Demon[] =>
  [...demons].sort((a, b) => b.z - a.z || a.id - b.id);

// --- Frame timing (SAD §7 monitoring) — feeds the FPS dev overlay + the NFR check. ---

export interface FrameStats {
  fps: number;
  /** 95th-percentile frame time in ms; the QG-1 NFR is p95 ≤ 33.3 ms. */
  p95Ms: number;
}

export interface FrameTimer {
  record: (frameMs: number) => void;
  stats: () => FrameStats;
}

/** Rolling frame-time window → mean FPS + p95, for the overlay and the perf NFR (AC-T09-3). */
export const createFrameTimer = (sampleSize = 120): FrameTimer => {
  const samples: number[] = [];
  return {
    record: (frameMs: number): void => {
      samples.push(frameMs);
      if (samples.length > sampleSize) {
        samples.shift();
      }
    },
    stats: (): FrameStats => {
      if (samples.length === 0) {
        return { fps: 0, p95Ms: 0 };
      }
      const sorted = [...samples].sort((a, b) => a - b);
      const p95Index = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
      const p95Ms = sorted[p95Index]!;
      const meanMs = samples.reduce((sum, v) => sum + v, 0) / samples.length;
      return { fps: Math.round(1000 / meanMs), p95Ms: Math.round(p95Ms * 10) / 10 };
    },
  };
};

// --- Drawing ---

interface ScreenPoint {
  sx: number;
  sy: number;
}

const worldToScreen = (world: WorldPoint, view: Viewport): ScreenPoint => ({
  sx: (world.x / VIRTUAL_WIDTH) * view.cssWidth,
  sy: (world.y / VIRTUAL_HEIGHT) * view.cssHeight,
});

const DEMON_COLORS: Record<DemonName, string> = {
  fast: '#e5484d',
  brute: '#30a46c',
  baron: '#8e4ec6',
};
const UNKNOWN_DEMON_COLOR = '#8b8b8b';

const demonColor = (typeId: number): string => {
  const name = DEMON_TYPES_BY_ID[typeId]?.name;
  return name ? DEMON_COLORS[name] : UNKNOWN_DEMON_COLOR;
};

const spriteKeyFor = (typeId: number): string | null =>
  DEMON_TYPES_BY_ID[typeId]?.spriteKey ?? null;

const demonSprite = (sprites: SpriteAtlas | null | undefined, typeId: number): SpriteImage | null => {
  const key = spriteKeyFor(typeId);
  return key ? (sprites?.get(key) ?? null) : null;
};

const drawBackground = (view: Viewport): void => {
  const { ctx, cssWidth, cssHeight } = view;
  ctx.fillStyle = '#16161a';
  ctx.fillRect(0, 0, cssWidth, cssHeight);
  ctx.fillStyle = '#20262b';
  ctx.fillRect(0, cssHeight * 0.55, cssWidth, cssHeight * 0.45);
};

const drawDemonPlaceholder = (view: Viewport, demon: Demon, radius: number): void => {
  const { ctx } = view;
  const { sx, sy } = worldToScreen(demon, view);
  ctx.beginPath();
  ctx.arc(sx, sy, radius, 0, Math.PI * 2);
  ctx.fillStyle = demonColor(demon.typeId);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#0b0b0d';
  ctx.stroke();
};

/**
 * Draws demons back→front, using the loaded sprite scaled to `depthRadius(z)` when the atlas
 * has one and falling back to the placeholder circle otherwise (SAD §8 fail-soft). Passing no
 * atlas (or one that isn't ready yet) draws all placeholders — the pre-sprite / late-arrival
 * path (T-10 edge case).
 */
const drawDemons = (
  view: Viewport,
  demons: readonly Demon[],
  sprites?: SpriteAtlas | null,
): void => {
  const { ctx } = view;
  ctx.imageSmoothingEnabled = false; // crisp pixel art, no blur when up-scaled
  for (const demon of depthOrder(demons)) {
    const radius = depthRadius(demon.z);
    const sprite = demonSprite(sprites, demon.typeId);
    if (!sprite) {
      drawDemonPlaceholder(view, demon, radius);
      continue;
    }
    const { sx, sy } = worldToScreen(demon, view);
    const size = radius * 2;
    ctx.drawImage(sprite, sx - size / 2, sy - size / 2, size, size);
  }
};

const drawShots = (view: Viewport, shots: readonly Shot[]): void => {
  const { ctx } = view;
  for (const shot of shots) {
    const { sx, sy } = worldToScreen({ x: shot.aimX, y: shot.aimY }, view);
    if (shot.outcome !== 'miss') {
      ctx.beginPath();
      ctx.arc(sx, sy, 22, 0, Math.PI * 2);
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#f2d024';
      ctx.stroke();
    } else {
      ctx.strokeStyle = '#e5484d';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(sx - 10, sy - 10);
      ctx.lineTo(sx + 10, sy + 10);
      ctx.moveTo(sx + 10, sy - 10);
      ctx.lineTo(sx - 10, sy + 10);
      ctx.stroke();
    }
  }
};

const drawCrosshair = (view: Viewport, crosshair: WorldPoint): void => {
  const { ctx } = view;
  const { sx, sy } = worldToScreen(crosshair, view);
  ctx.strokeStyle = '#f5f5f5';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(sx, sy, 16, 0, Math.PI * 2);
  ctx.moveTo(sx - 24, sy);
  ctx.lineTo(sx - 6, sy);
  ctx.moveTo(sx + 6, sy);
  ctx.lineTo(sx + 24, sy);
  ctx.moveTo(sx, sy - 24);
  ctx.lineTo(sx, sy - 6);
  ctx.moveTo(sx, sy + 6);
  ctx.lineTo(sx, sy + 24);
  ctx.stroke();
};

const formatTime = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

const drawHud = (view: Viewport, state: GameState): void => {
  const { ctx, cssWidth, cssHeight } = view;
  const { round, weapon } = state;

  ctx.textBaseline = 'top';
  ctx.font = '20px monospace';
  ctx.fillStyle = '#f5f5f5';
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${round.score}`, 16, 16);

  ctx.textAlign = 'right';
  ctx.fillText(formatTime(round.timeLeftMs), cssWidth - 16, 16);

  // Interim not-ready cue until the T-08 viewmodel sprite carries the pump visual.
  if (weapon.status === 'pumping') {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f2d024';
    ctx.fillText('PUMPING', cssWidth / 2, cssHeight - 60);
  }
};

const drawRoundResult = (view: Viewport, state: GameState): void => {
  const { ctx, cssWidth, cssHeight } = view;
  ctx.fillStyle = 'rgba(10, 10, 14, 0.72)';
  ctx.fillRect(0, 0, cssWidth, cssHeight);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f5f5f5';
  ctx.font = '48px monospace';
  ctx.fillText('ROUND OVER', cssWidth / 2, cssHeight / 2 - 40);
  ctx.font = '32px monospace';
  ctx.fillText(`Final Score ${state.round.score}`, cssWidth / 2, cssHeight / 2 + 20);
};

const drawFpsOverlay = (view: Viewport, fps: FrameStats): void => {
  const { ctx, cssWidth } = view;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.font = '12px monospace';
  ctx.fillStyle = fps.p95Ms <= 33.3 ? '#30a46c' : '#e5484d';
  ctx.fillText(`${fps.fps} FPS  p95 ${fps.p95Ms}ms`, cssWidth - 16, 44);
};

export interface RenderParams {
  state: GameState;
  view: Viewport;
  /** Last crosshair position in world space (pointer.ts); omitted before first move. */
  crosshair?: WorldPoint | null;
  /** Frame-timer stats for the dev overlay; omitted hides the overlay. */
  fps?: FrameStats | null;
  /** Loaded sprite atlas; omitted or not-yet-ready draws placeholder shapes (T-10). */
  sprites?: SpriteAtlas | null;
}

/**
 * Draw one frame from the current state. Read-only over `GameState` — the renderer never
 * mutates it (data-model access pattern). Draw order: background → demons (back→front) →
 * shot cues → crosshair → HUD → round-result overlay (when ended) → FPS overlay.
 */
export const render = ({ state, view, crosshair, fps, sprites }: RenderParams): void => {
  drawBackground(view);
  drawDemons(view, state.demons, sprites);
  drawShots(view, state.shots);
  if (crosshair) {
    drawCrosshair(view, crosshair);
  }
  drawHud(view, state);
  if (state.round.status === 'ended') {
    drawRoundResult(view, state);
  }
  if (fps) {
    drawFpsOverlay(view, fps);
  }
};
