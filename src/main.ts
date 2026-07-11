// Bootstrap (T-11) — mounts the canvas, validates static config + sprite keys, wires input →
// loop → step driver → renderer into one playable round (SAD §5 topology), and starts sprite
// loading. The fixed-step logic runs through core/step.ts; the frame draws the current state
// with a decoupled render (ADR-0002). A query-param-gated debug API (?e2e) exposes the live
// state + a few hooks for the Playwright smoke suite and the NFR perf pass — it is never
// installed for a normal page load, so the published demo carries no test surface.
//
// game-feel T-09 layers the juice on top: audio armed on the first gesture (ADR-0003),
// event → SFX + effects wiring observed per frame (wiring.ts), a random backdrop per round,
// and the "try again" button that rebuilds the round with zero leaked state (PRD AC-10).

import { createViewport, resizeToWindow, render, createFrameTimer, type FrameStats } from './render/canvas2d.ts';
import { startLoop, STEP_MS } from './core/loop.ts';
import { createInitialGameState, type GameState } from './core/state.ts';
import { validateStaticConfig, PATHS, DEMON_TYPES } from './core/config.ts';
import { advanceGameStep } from './core/step.ts';
import { attachPointerInput, type AttachPointerInputParams } from './input/pointer.ts';
import { createSpawnCursor, pathPointAt } from './systems/spawn.ts';
import { loadSprites, validateSpriteKeys, type SpriteImage } from './assets/sprites.ts';
import { loadBackdrops } from './assets/backdrops.ts';
import { createAudioBus } from './audio/audio.ts';
import { loadSfx } from './audio/sfx.ts';
import { createEffectsStore } from './render/effects.ts';
import { createFeedbackWiring, restartRound } from './wiring.ts';

/** Visual lifetime of a hit/miss feedback cue before it is pruned (T-11 integration gap). */
const SHOT_CUE_MS = 250;

/** Drop feedback cues older than SHOT_CUE_MS so they don't accumulate across the round. */
const pruneExpiredShots = (state: GameState, nowMs: number): void => {
  state.shots = state.shots.filter((shot) => nowMs - shot.firedAtMs < SHOT_CUE_MS);
};

interface DoomDebugApi {
  state: GameState;
  frameStats: () => FrameStats;
  /** Enqueue a fire intent directly in world coords — bypasses AC-07 gating for scripted runs. */
  fireWorld: (x: number, y: number) => void;
  /** Populate the range with `count` demons across the paths for the FPS-under-load NFR check. */
  spawnStress: (count: number) => void;
  /** Wind the round clock down to one step so the end screen appears without a 26 s wait. */
  endRoundSoon: () => void;
}

const installDebugApi = ({ state, frameStats }: { state: GameState; frameStats: () => FrameStats }): void => {
  const spawnStress = (count: number): void => {
    for (let i = 0; i < count; i++) {
      const path = PATHS[i % PATHS.length]!;
      const type = DEMON_TYPES[i % DEMON_TYPES.length]!;
      const progress = (i % 10) / 10;
      const point = pathPointAt(path, progress);
      state.demons.push({ id: 100_000 + i, typeId: type.id, pathId: path.id, hp: type.maxHp, progress, x: point.x, y: point.y, z: point.z });
    }
  };

  const api: DoomDebugApi = {
    state,
    frameStats,
    fireWorld: (x, y) => state.fireIntents.push({ aimX: x, aimY: y, atMs: performance.now() }),
    spawnStress,
    endRoundSoon: () => {
      state.round.timeLeftMs = STEP_MS;
    },
  };
  (window as unknown as { __doom: DoomDebugApi }).__doom = api;
};

const bootstrap = (): void => {
  validateStaticConfig();
  validateSpriteKeys();

  const canvas = document.getElementById('game');
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error('#game canvas element not found');
  }

  const view = createViewport(canvas);
  window.addEventListener('resize', () => resizeToWindow(view));

  const state = createInitialGameState();
  const cursor = createSpawnCursor();
  const frameTimer = createFrameTimer();
  const spriteLoad = loadSprites();

  const audioBus = createAudioBus();
  audioBus.armOnFirstGesture(window);
  const sfx = loadSfx({ bus: audioBus });

  const effects = createEffectsStore();
  const wiring = createFeedbackWiring({ state, effects, playSfx: sfx.play });

  const backdrops = loadBackdrops();
  let backdrop: SpriteImage | null = null;
  void backdrops.loaded.then(() => {
    backdrop ??= backdrops.pickRandom();
  });

  const retryButton = document.getElementById('retry');
  retryButton?.addEventListener('click', () => {
    backdrop = restartRound({ state, cursor, effects, wiring, pickBackdrop: backdrops.pickRandom });
  });

  const e2eMode = new URLSearchParams(window.location.search).has('e2e');

  // In scripted (?e2e) runs, tab focus is environmental and would flake the AC-07 gate — force
  // it on so the real pointer → world → weapon → hit path is exercised deterministically. Focus
  // gating itself is covered by the pointer integration test, not the smoke run.
  const pointerParams: AttachPointerInputParams = e2eMode
    ? { canvas, state, isFocused: () => true }
    : { canvas, state };
  const input = attachPointerInput(pointerParams);

  let lastFrameMs = performance.now();

  startLoop({
    update: (fixedDtMs) => advanceGameStep({ state, cursor, fixedDtMs }),
    render: () => {
      const nowMs = performance.now();
      const frameDtMs = nowMs - lastFrameMs;
      frameTimer.record(frameDtMs);
      lastFrameMs = nowMs;

      wiring.syncFrame();
      effects.advance(frameDtMs);
      effects.pruneExpired();
      pruneExpiredShots(state, nowMs);
      if (retryButton) {
        retryButton.style.display = state.round.status === 'ended' ? 'block' : 'none';
      }

      render({
        state,
        view,
        crosshair: input.getCrosshair(),
        fps: frameTimer.stats(),
        sprites: spriteLoad.atlas,
        effects,
        backdrop,
      });
    },
  });

  if (e2eMode) {
    installDebugApi({ state, frameStats: () => frameTimer.stats() });
  }
};

bootstrap();
