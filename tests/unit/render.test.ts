import { describe, it, expect, vi } from 'vitest';
import {
  depthOrder,
  depthRadius,
  createFrameTimer,
  render,
  type Viewport,
} from '../../src/render/canvas2d.ts';
import { makeGameState, makeDemon, makeRound, makeShot } from '../factories.ts';

/**
 * Minimal recording stub of the 2D context — the renderer only issues draw calls and sets
 * style props, so no-op methods plus assignable props are enough to run render() in node.
 */
const makeStubCtx = (): CanvasRenderingContext2D => {
  const noop = (): void => {};
  const ctx = {
    fillRect: noop,
    beginPath: noop,
    arc: noop,
    fill: noop,
    stroke: noop,
    moveTo: noop,
    lineTo: noop,
    fillText: noop,
    drawImage: noop,
    imageSmoothingEnabled: true,
  };
  return ctx as unknown as CanvasRenderingContext2D;
};

const makeStubViewport = (): Viewport =>
  ({
    canvas: {} as HTMLCanvasElement,
    ctx: makeStubCtx(),
    cssWidth: 1600,
    cssHeight: 900,
    dpr: 1,
  }) as Viewport;

describe('depthOrder — back→front draw order (AC-T09-1)', () => {
  it('sorts far (high z) before near (low z)', () => {
    const near = makeDemon({ id: 1, z: 0.1 });
    const far = makeDemon({ id: 2, z: 0.9 });

    const ordered = depthOrder([near, far]);

    expect(ordered.map((d) => d.id)).toEqual([2, 1]);
  });

  it('keeps a stable id-order on equal z — no flicker in a flat round (QG-2)', () => {
    const demons = [
      makeDemon({ id: 3, z: 1 }),
      makeDemon({ id: 1, z: 1 }),
      makeDemon({ id: 2, z: 1 }),
    ];

    const first = depthOrder(demons).map((d) => d.id);
    const second = depthOrder(demons).map((d) => d.id);

    expect(first).toEqual([1, 2, 3]);
    expect(second).toEqual(first);
  });

  it('does not mutate the input array', () => {
    const demons = [makeDemon({ id: 1, z: 0.1 }), makeDemon({ id: 2, z: 0.9 })];

    depthOrder(demons);

    expect(demons.map((d) => d.id)).toEqual([1, 2]);
  });
});

describe('depthRadius — size is a monotonic function of z (AC-T09-1)', () => {
  it('draws near (z=0) larger than far (z=1)', () => {
    expect(depthRadius(0)).toBeGreaterThan(depthRadius(1));
  });

  it('is strictly decreasing across the depth range', () => {
    const samples = [0, 0.25, 0.5, 0.75, 1].map(depthRadius);
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]!).toBeLessThan(samples[i - 1]!);
    }
  });

  it('renders equal-z demons at identical size (flat round)', () => {
    expect(depthRadius(0.5)).toBe(depthRadius(0.5));
  });

  it('clamps out-of-range z to the [near, far] endpoints', () => {
    expect(depthRadius(-1)).toBe(depthRadius(0));
    expect(depthRadius(2)).toBe(depthRadius(1));
  });
});

describe('createFrameTimer — FPS + p95 (AC-T09-3)', () => {
  it('reports zeroes before any sample', () => {
    expect(createFrameTimer().stats()).toEqual({ fps: 0, p95Ms: 0 });
  });

  it('computes mean FPS and p95 from recorded frame times', () => {
    const timer = createFrameTimer();
    for (let i = 0; i < 100; i++) {
      timer.record(16); // steady 16 ms → ~60 FPS
    }

    const stats = timer.stats();

    expect(stats.fps).toBe(63); // round(1000 / 16)
    expect(stats.p95Ms).toBe(16);
  });

  it('surfaces a slow-frame tail in p95', () => {
    const timer = createFrameTimer();
    for (let i = 0; i < 95; i++) {
      timer.record(16);
    }
    for (let i = 0; i < 5; i++) {
      timer.record(50); // occasional stalls land above the 95th percentile
    }

    expect(timer.stats().p95Ms).toBe(50);
  });

  it('drops samples beyond the rolling window', () => {
    const timer = createFrameTimer(10);
    for (let i = 0; i < 10; i++) {
      timer.record(100);
    }
    timer.record(10); // pushes the oldest 100 out
    for (let i = 0; i < 9; i++) {
      timer.record(10);
    }

    expect(timer.stats().fps).toBe(100); // window is all 10 ms frames now
  });
});

describe('render — read-only over GameState (AC-T09-2)', () => {
  it('never mutates the state it draws', () => {
    const state = makeGameState({
      round: makeRound({ score: 30, status: 'running' }),
      demons: [makeDemon({ id: 1, z: 0.2 }), makeDemon({ id: 2, z: 0.8 })],
      shots: [makeShot({ outcome: 'hit' }), makeShot({ outcome: 'miss' })],
    });
    const snapshot = structuredClone(state);

    render({ state, view: makeStubViewport(), crosshair: { x: 500, y: 500 } });

    expect(state).toEqual(snapshot);
  });

  it('draws the ended round-result screen without throwing', () => {
    const state = makeGameState({ round: makeRound({ status: 'ended', score: 120 }) });

    expect(() =>
      render({ state, view: makeStubViewport(), fps: { fps: 60, p95Ms: 16 } }),
    ).not.toThrow();
  });

  it('draws sprites when the atlas has them and falls back to placeholders otherwise (T-10)', () => {
    const view = makeStubViewport();
    const drawImage = vi.fn();
    const arc = vi.fn();
    Object.assign(view.ctx, { drawImage, arc });

    const state = makeGameState({
      demons: [makeDemon({ id: 1, typeId: 1, z: 0.5 }), makeDemon({ id: 2, typeId: 2, z: 0.5 })],
    });
    const sprites = {
      ready: true,
      get: (key: string) =>
        key === 'demon-fast' ? ({} as unknown as CanvasImageSource) : null,
    };

    render({ state, view, sprites });

    expect(drawImage).toHaveBeenCalledTimes(1); // fast → sprite
    expect(arc).toHaveBeenCalled(); // brute → placeholder circle
  });

  it('renders a 30-demon frame (perf-shaped state) without throwing', () => {
    const demons = Array.from({ length: 30 }, (_, i) =>
      makeDemon({ id: i + 1, z: (i % 10) / 10, x: (i * 31) % 1000, y: (i * 53) % 1000 }),
    );
    const state = makeGameState({ demons });

    expect(() => render({ state, view: makeStubViewport() })).not.toThrow();
  });
});
