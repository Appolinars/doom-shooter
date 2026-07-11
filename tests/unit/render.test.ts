import { describe, it, expect, vi } from 'vitest';
import {
  depthOrder,
  depthRadius,
  createFrameTimer,
  render,
  type Viewport,
} from '../../src/render/canvas2d.ts';
import { makeGameState, makeDemon, makeRound, makeShot, makeWeapon } from '../factories.ts';
import { createEffectsStore } from '../../src/render/effects.ts';
import type { SpriteAtlas } from '../../src/assets/sprites.ts';
import { DEATH_ANIM_MS, PUMP_DURATION_MS } from '../../src/core/config.ts';

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

  it('draws the PAUSED overlay only while paused (AC-T12-1)', () => {
    const view = makeStubViewport();
    const fillText = vi.fn();
    Object.assign(view.ctx, { fillText });

    render({ state: makeGameState({ round: makeRound({ status: 'paused' }) }), view });
    expect(fillText.mock.calls.some(([text]) => text === 'PAUSED')).toBe(true);

    fillText.mockClear();
    render({ state: makeGameState({ round: makeRound({ status: 'running' }) }), view });
    expect(fillText.mock.calls.some(([text]) => text === 'PAUSED')).toBe(false);
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

// --- T-08 juice passes (ADR-0004) ---

const fakeSprite = (key: string): CanvasImageSource => ({ key }) as unknown as CanvasImageSource;

/** Records which atlas keys the renderer asked for — frame-selection assertions read this. */
const atlasWith = (keys: readonly string[]): SpriteAtlas & { requested: string[] } => {
  const requested: string[] = [];
  return {
    requested,
    ready: true,
    get: (spriteKey: string) => {
      requested.push(spriteKey);
      return keys.includes(spriteKey) ? fakeSprite(spriteKey) : null;
    },
  };
};

describe('T-08 — backdrop pass (AC-T08-4)', () => {
  it('draws the picked backdrop full-screen before everything else', () => {
    const view = makeStubViewport();
    const drawImage = vi.fn();
    const fillRect = vi.fn();
    Object.assign(view.ctx, { drawImage, fillRect });
    const backdrop = fakeSprite('backdrop-1');

    render({ state: makeGameState(), view, backdrop });

    expect(drawImage).toHaveBeenCalledWith(backdrop, 0, 0, 1600, 900);
    expect(fillRect).not.toHaveBeenCalled(); // backdrop replaces the placeholder scene fills
  });

  it('falls back to the dark placeholder scene when no backdrop loaded (black fail-soft)', () => {
    const view = makeStubViewport();
    const fillRect = vi.fn();
    Object.assign(view.ctx, { fillRect });

    render({ state: makeGameState(), view, backdrop: null });

    expect(fillRect).toHaveBeenCalled();
  });
});

describe('T-08 — hurt frame selection by hp (AC-T08-2)', () => {
  it('an unhurt demon draws its full frame', () => {
    const view = makeStubViewport();
    const sprites = atlasWith(['demon-brute']);
    const state = makeGameState({ demons: [makeDemon({ id: 1, typeId: 2, hp: 2 })] });

    render({ state, view, sprites });

    expect(sprites.requested).toContain('demon-brute');
    expect(sprites.requested).not.toContain('demon-brute-hurt-1');
  });

  it('a hurt demon draws its per-HP-step frame (brute hp 1 → hurt-1)', () => {
    const view = makeStubViewport();
    const drawImage = vi.fn();
    const sprites = atlasWith(['demon-brute', 'demon-brute-hurt-1']);
    Object.assign(view.ctx, { drawImage });
    const state = makeGameState({ demons: [makeDemon({ id: 1, typeId: 2, hp: 1 })] });

    render({ state, view, sprites });

    expect(sprites.requested).toContain('demon-brute-hurt-1');
    expect(drawImage).toHaveBeenCalledWith(fakeSprite('demon-brute-hurt-1'), expect.any(Number), expect.any(Number), expect.any(Number), expect.any(Number));
  });
});

describe('T-08 — death + splat passes from the effects store (AC-T08-2, PRD AC-01/AC-04)', () => {
  it('slices the death animation frame from deathProgress (mid-anim → middle frame)', () => {
    const view = makeStubViewport();
    const sprites = atlasWith(['demon-brute-death-1', 'demon-brute-death-3']);
    const effects = createEffectsStore();
    effects.spawnDeath({ typeId: 2, x: 500, y: 500, z: 0.5 });
    effects.advance(DEATH_ANIM_MS / 2); // progress 0.5 of 5 frames → frame 3

    render({ state: makeGameState(), view, sprites, effects });

    expect(sprites.requested).toContain('demon-brute-death-3');
  });

  it('falls back to the nearest earlier death frame, then a placeholder circle', () => {
    const view = makeStubViewport();
    const arc = vi.fn();
    Object.assign(view.ctx, { arc });
    const sprites = atlasWith(['demon-brute-death-1']);
    const effects = createEffectsStore();
    effects.spawnDeath({ typeId: 2, x: 500, y: 500, z: 0.5 });
    effects.advance(DEATH_ANIM_MS / 2);

    render({ state: makeGameState(), view, sprites, effects });
    expect(sprites.requested).toContain('demon-brute-death-2');
    expect(sprites.requested).toContain('demon-brute-death-1'); // nearest available wins

    const bare = createEffectsStore();
    bare.spawnDeath({ typeId: 2, x: 500, y: 500, z: 0.5 });
    expect(() =>
      render({ state: makeGameState(), view, sprites: atlasWith([]), effects: bare }),
    ).not.toThrow();
    expect(arc).toHaveBeenCalled(); // placeholder fading circle
  });

  it('draws active splats at their impact points', () => {
    const view = makeStubViewport();
    const arc = vi.fn();
    Object.assign(view.ctx, { arc });
    const effects = createEffectsStore();
    effects.spawnSplat({ x: 500, y: 250, z: 0 });

    render({ state: makeGameState(), view, effects });

    // splat center: (500/1000)*1600 = 800, (250/1000)*900 = 225
    expect(arc.mock.calls.some(([sx, sy]) => sx === 800 && sy === 225)).toBe(true);
  });
});

describe('T-08 — viewmodel pass reads weapon status + effects clock (AC-T08-3)', () => {
  it('draws idle when the weapon is ready', () => {
    const view = makeStubViewport();
    const sprites = atlasWith(['weapon-shotgun-idle']);
    const effects = createEffectsStore();
    const state = makeGameState({ weapon: makeWeapon({ status: 'ready' }) });

    render({ state, view, sprites, effects });

    expect(sprites.requested).toContain('weapon-shotgun-idle');
  });

  it('draws idle + flash overlay right after the shot, then the pump frames', () => {
    const view = makeStubViewport();
    const sprites = atlasWith([
      'weapon-shotgun-idle',
      'weapon-shotgun-flash-1',
      'weapon-shotgun-pump-1',
      'weapon-shotgun-pump-2',
      'weapon-shotgun-pump-3',
    ]);
    const effects = createEffectsStore();
    effects.onFire();
    const state = makeGameState({
      weapon: makeWeapon({ status: 'pumping', pumpRemainingMs: PUMP_DURATION_MS }),
    });

    render({ state, view, sprites, effects });
    expect(sprites.requested).toContain('weapon-shotgun-idle');
    expect(sprites.requested).toContain('weapon-shotgun-flash-1');

    effects.advance(120); // past the flash window, into pump-1
    sprites.requested.length = 0;
    render({ state, view, sprites, effects });
    expect(sprites.requested).toContain('weapon-shotgun-pump-1');
    expect(sprites.requested).not.toContain('weapon-shotgun-flash-1');
  });

  it('a missing viewmodel sprite draws no gun and never throws (AC-06)', () => {
    const view = makeStubViewport();
    const effects = createEffectsStore();
    const state = makeGameState({ weapon: makeWeapon({ status: 'pumping', pumpRemainingMs: 100 }) });

    expect(() => render({ state, view, sprites: atlasWith([]), effects })).not.toThrow();
  });
});

describe('T-08 — all passes stay read-only (AC-T08-1)', () => {
  it('never mutates GameState with every pass active', () => {
    const state = makeGameState({
      round: makeRound({ score: 30, status: 'running' }),
      demons: [makeDemon({ id: 1, typeId: 2, hp: 1, z: 0.2 })],
      shots: [makeShot({ outcome: 'kill' })],
      weapon: makeWeapon({ status: 'pumping', pumpRemainingMs: 200 }),
    });
    const effects = createEffectsStore();
    effects.onFire();
    effects.spawnSplat({ x: 100, y: 100, z: 0 });
    effects.spawnDeath({ typeId: 1, x: 200, y: 200, z: 0.5 });
    const snapshot = structuredClone(state);

    render({
      state,
      view: makeStubViewport(),
      sprites: atlasWith(['demon-brute', 'weapon-shotgun-idle']),
      effects,
      backdrop: fakeSprite('backdrop-1'),
      crosshair: { x: 500, y: 500 },
    });

    expect(state).toEqual(snapshot);
    expect(effects.splats()).toHaveLength(1); // render never prunes or spawns effects either
    expect(effects.deathVisuals()).toHaveLength(1);
  });
});
