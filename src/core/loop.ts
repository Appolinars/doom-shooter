// Fixed-timestep accumulator loop (ADR-0002) — logic advances in fixed STEP_MS
// increments, render is decoupled. This is the clock every system consumes; no
// system reads wall-clock (SAD §8 Time/step row). Render interpolation is
// deliberately NOT implemented (ADR-0002 neutral consequence, accepted debt SAD §11).

/** Fixed logic step (~60 Hz). Every `update` receives exactly this dt. */
export const STEP_MS = 1000 / 60;

/**
 * Max fixed steps executed per animation frame — the spiral-of-death guard
 * (ADR-0002 negative consequence). Beyond this the backlog is dropped so a long
 * stall recovers on the next frame instead of cascading.
 */
export const MAX_STEPS_PER_FRAME = 5;

/** Unconsumed simulation time carried between frames. */
export interface Accumulator {
  remainderMs: number;
}

export const createAccumulator = (): Accumulator => ({ remainderMs: 0 });

export interface AdvanceParams {
  acc: Accumulator;
  frameDeltaMs: number;
  update: (fixedDtMs: number) => void;
  maxSteps?: number;
  stepMs?: number;
}

/**
 * Drain a wall-clock frame delta into fixed logic steps, calling `update(stepMs)`
 * once per step. Returns the number of steps executed.
 *
 * If the accumulated backlog would exceed `maxSteps` (a stall / backgrounded tab),
 * the steps are capped and the leftover backlog is discarded — the loop recovers
 * next frame rather than bursting a cascade of catch-up steps.
 */
export const advance = ({
  acc,
  frameDeltaMs,
  update,
  maxSteps = MAX_STEPS_PER_FRAME,
  stepMs = STEP_MS,
}: AdvanceParams): number => {
  acc.remainderMs += frameDeltaMs;

  let steps = 0;
  while (acc.remainderMs >= stepMs && steps < maxSteps) {
    update(stepMs);
    acc.remainderMs -= stepMs;
    steps++;
  }

  if (acc.remainderMs >= stepMs) {
    acc.remainderMs = 0;
  }

  return steps;
};

export interface LoopHandle {
  stop: () => void;
}

export interface StartLoopParams {
  /** Advance game logic by one fixed step. */
  update: (fixedDtMs: number) => void;
  /** Draw the current state. Called once per frame, decoupled from step count. */
  render: () => void;
  now?: () => number;
  schedule?: (cb: FrameRequestCallback) => number;
  cancel?: (handle: number) => void;
}

/**
 * Drive the accumulator on `requestAnimationFrame`. The scheduler, clock and
 * canceller are injectable so unit tests can feed synthetic timestamp traces
 * (AC-T03-1 drift, AC-T03-2 stall recovery) without a real rAF.
 */
export const startLoop = ({
  update,
  render,
  now = () => performance.now(),
  schedule = requestAnimationFrame,
  cancel = cancelAnimationFrame,
}: StartLoopParams): LoopHandle => {
  const acc = createAccumulator();
  let lastMs = now();
  let rafId = 0;
  let running = true;

  const frame = (): void => {
    if (!running) {
      return;
    }
    const currentMs = now();
    advance({ acc, frameDeltaMs: currentMs - lastMs, update });
    lastMs = currentMs;
    render();
    rafId = schedule(frame);
  };

  rafId = schedule(frame);

  return {
    stop: (): void => {
      running = false;
      cancel(rafId);
    },
  };
};
