// T-10 (AC-T10-3) — the 0-mutation proof: the base determinism guardrails re-run with the
// full juice pipeline active. The wiring diff (SFX + effects) and the effects clock ride
// the render callback exactly as main.ts wires them; if any juice path mutated the fixed
// step, the juiced GameState would diverge from the bare one, and the 60↔144 Hz drift or
// the crosshair→world mapping would regress. Edge-case escalation per the story: a red
// test here bounces to the offending story — only T-01/T-02/T-03 may touch the fixed step.

import { describe, it, expect } from 'vitest';
import { startLoop } from '../../src/core/loop.ts';
import { createInitialGameState, type GameState } from '../../src/core/state.ts';
import { createSpawnCursor } from '../../src/systems/spawn.ts';
import { advanceGameStep } from '../../src/core/step.ts';
import { createEffectsStore } from '../../src/render/effects.ts';
import { createFeedbackWiring } from '../../src/wiring.ts';
import { screenToWorld, type CanvasRect } from '../../src/input/pointer.ts';
import { render, type Viewport } from '../../src/render/canvas2d.ts';
import { VIRTUAL_WIDTH, VIRTUAL_HEIGHT } from '../../src/core/config.ts';
import { makeGameState, makeDemon, makeShot } from '../factories.ts';

/** Scripted input cadence: one aimed shot per period, wide enough for the pump to reopen. */
const FIRE_PERIOD_MS = 600;

interface RunTraceParams {
  hz: number;
  seconds: number;
  juice: boolean;
}

interface TraceResult {
  state: GameState;
  simMs: number;
  sfxKeys: string[];
}

/**
 * Drive the real per-step pipeline (advanceGameStep) under a synthetic frame clock, with
 * the juice layer (wiring diff + effects clock) optionally riding the render callback the
 * way main.ts wires it. Input is scripted on sim-time marks aimed at the front demon, so
 * two runs enqueue identical intents as long as the fixed step stays deterministic.
 */
const runTrace = ({ hz, seconds, juice }: RunTraceParams): TraceResult => {
  const state = createInitialGameState();
  const cursor = createSpawnCursor();
  const sfxKeys: string[] = [];
  const effects = createEffectsStore();
  const wiring = createFeedbackWiring({ state, effects, playSfx: (key) => sfxKeys.push(key) });

  let clock = 0;
  let simMs = 0;
  let nextFireAtMs = FIRE_PERIOD_MS;
  const frameDeltaMs = 1000 / hz;
  const pending: FrameRequestCallback[] = [];

  startLoop({
    update: (fixedDtMs) => {
      advanceGameStep({ state, cursor, fixedDtMs });
      simMs += fixedDtMs;
    },
    render: () => {
      if (simMs >= nextFireAtMs) {
        nextFireAtMs += FIRE_PERIOD_MS;
        const target = state.demons[0];
        if (target) {
          state.fireIntents.push({ aimX: target.x, aimY: target.y, atMs: simMs });
        }
      }
      if (juice) {
        wiring.syncFrame();
        effects.advance(frameDeltaMs);
        effects.pruneExpired();
      }
    },
    now: () => clock,
    schedule: (cb) => pending.push(cb),
    cancel: () => {},
  });

  const frames = Math.round(hz * seconds);
  for (let i = 0; i < frames; i++) {
    clock += frameDeltaMs;
    pending.shift()?.(0);
  }

  return { state, simMs, sfxKeys };
};

describe('AC-T10-3 — juice adds zero fixed-step mutations', () => {
  it('a full 30 s round plays to an identical GameState with juice on and off', () => {
    const bare = runTrace({ hz: 60, seconds: 30, juice: false });
    const juiced = runTrace({ hz: 60, seconds: 30, juice: true });

    // The juiced run really exercised the layer: shots, kills and spawns all fed it.
    expect(juiced.sfxKeys).toContain('shoot');
    expect(juiced.sfxKeys.some((key) => key.endsWith('-spawn'))).toBe(true);
    expect(juiced.sfxKeys.some((key) => key.endsWith('-death'))).toBe(true);
    expect(juiced.state.round.score).toBeGreaterThan(0);

    expect(juiced.state).toEqual(bare.state);
  });

  it('keeps 60↔144 Hz logic-time drift ≤ 1% with juice enabled (base AC-T03-1 re-run)', () => {
    const at60 = runTrace({ hz: 60, seconds: 60, juice: true });
    const at144 = runTrace({ hz: 144, seconds: 60, juice: true });

    const drift = Math.abs(at60.simMs - at144.simMs) / at144.simMs;
    expect(drift).toBeLessThanOrEqual(0.01);
    expect(at60.state.round.score).toBeGreaterThan(0);
    expect(at144.state.round.score).toBeGreaterThan(0);
  });
});

// --- Aim independence with every juice pass rendering (base AC-T04-2 re-run) ---

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

describe('AC-T10-3 — aim mapping unchanged with all render-layer effects active', () => {
  it('stays within 2 px across resize while backdrop + splat + death + viewmodel render', () => {
    const effects = createEffectsStore();
    effects.onFire();
    effects.spawnSplat({ x: 400, y: 500, z: 0.4 });
    effects.spawnDeath({ typeId: 2, x: 300, y: 400, z: 0.5 });
    effects.advance(100); // mid-pump viewmodel, live splat, mid-flight death animation

    const state = makeGameState({
      demons: [makeDemon({ id: 1, typeId: 1, hp: 1 }), makeDemon({ id: 2, typeId: 3, hp: 2, x: 600 })],
      shots: [makeShot({ outcome: 'hit' })],
    });
    const sprites = { ready: true, get: () => null };
    const backdrop = {} as CanvasImageSource;

    const target = { x: 250, y: 750 };
    const rects: CanvasRect[] = [
      { left: 0, top: 0, width: 1600, height: 900 },
      { left: 40, top: 20, width: 800, height: 1200 },
    ];

    for (const rect of rects) {
      const clientX = rect.left + (target.x / VIRTUAL_WIDTH) * rect.width;
      const clientY = rect.top + (target.y / VIRTUAL_HEIGHT) * rect.height;

      const before = screenToWorld({ clientX, clientY, rect });
      render({
        state,
        view: makeStubViewport(),
        crosshair: before,
        fps: { fps: 60, p95Ms: 16 },
        sprites,
        effects,
        backdrop,
      });
      const after = screenToWorld({ clientX, clientY, rect });

      expect(after).toEqual(before);
      const deviation = Math.hypot(after.x - target.x, after.y - target.y);
      expect(deviation).toBeLessThanOrEqual(2);
    }
  });
});
