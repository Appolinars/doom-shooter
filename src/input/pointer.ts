// Aim mapping + fire gating (AC-07) — maps pointer clicks into world coords and, when
// the input is in-scope (tab focused + inside the play area), enqueues a FireIntent for
// the weapon system to drain on the fixed step. This module ONLY enqueues; shell/weapon
// rules are T-06's contract (SAD §6 Critical flow 1: Input → Game loop leg).

import type { GameState } from '../core/state.ts';
import { VIRTUAL_WIDTH, VIRTUAL_HEIGHT } from '../core/config.ts';

/** Canvas placement + size in CSS pixels (subset of DOMRect, so it's easy to fake in tests). */
export interface CanvasRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface WorldPoint {
  x: number;
  y: number;
}

/** A pointer position in CSS-pixel client coords, plus the canvas rect it lands on. */
export interface PointerOnCanvas {
  clientX: number;
  clientY: number;
  rect: CanvasRect;
}

/**
 * Map a pointer position (CSS-pixel client coords) into world space (VIRTUAL_WIDTH ×
 * VIRTUAL_HEIGHT). Both the client coords and the rect are CSS pixels, so the result is
 * invariant to devicePixelRatio; reading the rect fresh at click time keeps it correct
 * across window resizes (AC-T04-2).
 */
export const screenToWorld = ({ clientX, clientY, rect }: PointerOnCanvas): WorldPoint => {
  const normalizedX = (clientX - rect.left) / rect.width;
  const normalizedY = (clientY - rect.top) / rect.height;
  return {
    x: normalizedX * VIRTUAL_WIDTH,
    y: normalizedY * VIRTUAL_HEIGHT,
  };
};

/** AC-07 play-area scope: a click counts only inside the canvas rect (edges inclusive). */
export const isInsidePlayArea = ({ clientX, clientY, rect }: PointerOnCanvas): boolean =>
  clientX >= rect.left &&
  clientX <= rect.left + rect.width &&
  clientY >= rect.top &&
  clientY <= rect.top + rect.height;

export interface FireClickParams {
  state: GameState;
  clientX: number;
  clientY: number;
  rect: CanvasRect;
  focused: boolean;
  atMs: number;
}

/**
 * Decide + enqueue for one click. Gated by AC-07: dropped unless the tab is focused AND
 * the click is inside the play area. Returns whether an intent was enqueued.
 */
export const handleFireClick = ({
  state,
  clientX,
  clientY,
  rect,
  focused,
  atMs,
}: FireClickParams): boolean => {
  if (!focused || !isInsidePlayArea({ clientX, clientY, rect })) {
    return false;
  }
  const world = screenToWorld({ clientX, clientY, rect });
  state.fireIntents.push({ aimX: world.x, aimY: world.y, atMs });
  return true;
};

export interface PointerInput {
  /** Last crosshair position in world space, for the renderer (T-09) to draw. */
  getCrosshair: () => WorldPoint;
  /** Remove all listeners. */
  dispose: () => void;
}

export interface AttachPointerInputParams {
  canvas: HTMLCanvasElement;
  state: GameState;
  /** Round-relative timestamp stamped on each intent. */
  now?: () => number;
  /** Tab scope predicate — gates fire when the tab is blurred or hidden. */
  isFocused?: () => boolean;
}

/**
 * Wire pointer listeners to the canvas, enqueuing gated fire intents into `state`.
 * `now` and `isFocused` are injectable so gating and timing are unit-testable.
 */
export const attachPointerInput = ({
  canvas,
  state,
  now = () => performance.now(),
  isFocused = () => document.hasFocus() && !document.hidden,
}: AttachPointerInputParams): PointerInput => {
  let crosshair: WorldPoint = { x: 0, y: 0 };

  const onPointerMove = (event: PointerEvent): void => {
    crosshair = screenToWorld({
      clientX: event.clientX,
      clientY: event.clientY,
      rect: canvas.getBoundingClientRect(),
    });
  };

  const onPointerDown = (event: PointerEvent): void => {
    handleFireClick({
      state,
      clientX: event.clientX,
      clientY: event.clientY,
      rect: canvas.getBoundingClientRect(),
      focused: isFocused(),
      atMs: now(),
    });
  };

  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerdown', onPointerDown);

  return {
    getCrosshair: () => crosshair,
    dispose: (): void => {
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerdown', onPointerDown);
    },
  };
};
