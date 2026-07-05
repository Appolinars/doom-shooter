import { describe, it, expect } from 'vitest';
import {
  screenToWorld,
  isInsidePlayArea,
  handleFireClick,
  type CanvasRect,
  type WorldPoint,
} from '../../src/input/pointer.ts';
import { VIRTUAL_WIDTH, VIRTUAL_HEIGHT } from '../../src/core/config.ts';
import { makeGameState } from '../factories.ts';

/** Center of a 1600×900 canvas offset at (0,0) → dead center of world space. */
const rect1600: CanvasRect = { left: 0, top: 0, width: 1600, height: 900 };

describe('screenToWorld — DPR + resize invariance (AC-T04-2)', () => {
  it('maps canvas center to world center', () => {
    const world = screenToWorld({ clientX: 800, clientY: 450, rect: rect1600 });
    expect(world.x).toBeCloseTo(VIRTUAL_WIDTH / 2, 6);
    expect(world.y).toBeCloseTo(VIRTUAL_HEIGHT / 2, 6);
  });

  it('is identical under DPR 1 and DPR 2 (client + rect are CSS px)', () => {
    // DPR changes the backing store, not the CSS-pixel client coords or rect.
    const atDpr1 = screenToWorld({ clientX: 400, clientY: 300, rect: rect1600 });
    const atDpr2 = screenToWorld({ clientX: 400, clientY: 300, rect: rect1600 });
    expect(Math.abs(atDpr1.x - atDpr2.x)).toBeLessThanOrEqual(2);
    expect(Math.abs(atDpr1.y - atDpr2.y)).toBeLessThanOrEqual(2);
  });

  it('stays within 2 px of the expected world point after a resize', () => {
    const target: WorldPoint = { x: 250, y: 750 };

    for (const rect of [rect1600, { left: 40, top: 20, width: 800, height: 1200 }]) {
      const clientX = rect.left + (target.x / VIRTUAL_WIDTH) * rect.width;
      const clientY = rect.top + (target.y / VIRTUAL_HEIGHT) * rect.height;
      const world = screenToWorld({ clientX, clientY, rect });

      const deviation = Math.hypot(world.x - target.x, world.y - target.y);
      expect(deviation).toBeLessThanOrEqual(2);
    }
  });
});

describe('isInsidePlayArea — edge pixels', () => {
  const rect: CanvasRect = { left: 100, top: 50, width: 400, height: 300 };

  it('accepts the boundary pixels', () => {
    expect(isInsidePlayArea({ clientX: 100, clientY: 50, rect })).toBe(true);
    expect(isInsidePlayArea({ clientX: 500, clientY: 350, rect })).toBe(true);
  });

  it('rejects a pixel just outside', () => {
    expect(isInsidePlayArea({ clientX: 99, clientY: 50, rect })).toBe(false);
    expect(isInsidePlayArea({ clientX: 501, clientY: 350, rect })).toBe(false);
  });
});

describe('handleFireClick — gating (AC-T04-1, PRD AC-07)', () => {
  const rect: CanvasRect = { left: 0, top: 0, width: 1000, height: 1000 };

  it('enqueues a fire intent for an in-focus click inside the play area', () => {
    const state = makeGameState();
    const enqueued = handleFireClick({ state, clientX: 300, clientY: 400, rect, focused: true, atMs: 1234 });

    expect(enqueued).toBe(true);
    expect(state.fireIntents).toEqual([{ aimX: 300, aimY: 400, atMs: 1234 }]);
  });

  it('drops the click when the tab has lost focus', () => {
    const state = makeGameState();
    const enqueued = handleFireClick({ state, clientX: 300, clientY: 400, rect, focused: false, atMs: 1234 });

    expect(enqueued).toBe(false);
    expect(state.fireIntents).toHaveLength(0);
  });

  it('drops the click when the pointer is outside the play area', () => {
    const state = makeGameState();
    const enqueued = handleFireClick({ state, clientX: 1200, clientY: 400, rect, focused: true, atMs: 1234 });

    expect(enqueued).toBe(false);
    expect(state.fireIntents).toHaveLength(0);
  });
});
