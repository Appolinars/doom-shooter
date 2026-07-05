import { describe, it, expect } from 'vitest';
import {
  STEP_MS,
  MAX_STEPS_PER_FRAME,
  createAccumulator,
  advance,
  startLoop,
} from '../../src/core/loop.ts';

/**
 * Drive `startLoop` with a synthetic timestamp trace: no real rAF/clock. Returns
 * total simulated logic time (sum of fixed steps) and the render count.
 */
const runTrace = (frameDeltasMs: readonly number[]): { simMs: number; renders: number } => {
  let clock = 0;
  let simMs = 0;
  let renders = 0;
  const pending: FrameRequestCallback[] = [];

  startLoop({
    update: () => {
      simMs += STEP_MS;
    },
    render: () => {
      renders += 1;
    },
    now: () => clock,
    schedule: (cb) => pending.push(cb),
    cancel: () => {},
  });

  for (const delta of frameDeltasMs) {
    clock += delta;
    const frame = pending.shift();
    if (frame) {
      frame(0);
    }
  }

  return { simMs, renders };
};

const evenTrace = ({ hz, seconds }: { hz: number; seconds: number }): number[] =>
  new Array(Math.round(hz * seconds)).fill(1000 / hz);

describe('advance — fixed-step accumulator', () => {
  it('runs zero steps when the frame is shorter than STEP_MS', () => {
    const acc = createAccumulator();
    let steps = 0;
    const executed = advance({ acc, frameDeltaMs: STEP_MS - 1, update: () => (steps += 1) });
    expect(executed).toBe(0);
    expect(steps).toBe(0);
  });

  it('carries the remainder so sub-step frames eventually produce a step', () => {
    const acc = createAccumulator();
    let steps = 0;
    const half = STEP_MS / 2;
    advance({ acc, frameDeltaMs: half, update: () => (steps += 1) });
    const executed = advance({ acc, frameDeltaMs: half, update: () => (steps += 1) });
    expect(executed).toBe(1);
    expect(steps).toBe(1);
  });
});

describe('AC-T03-1 — drift ≤ 1% between 60 Hz and 144 Hz', () => {
  it('keeps simulated logic time within 1% across the two frame rates', () => {
    const at60 = runTrace(evenTrace({ hz: 60, seconds: 60 }));
    const at144 = runTrace(evenTrace({ hz: 144, seconds: 60 }));

    const drift = Math.abs(at60.simMs - at144.simMs) / at144.simMs;
    expect(drift).toBeLessThanOrEqual(0.01);
  });

  it('renders exactly once per frame regardless of step count', () => {
    const trace = evenTrace({ hz: 144, seconds: 1 });
    const result = runTrace(trace);
    expect(result.renders).toBe(trace.length);
  });
});

describe('AC-T03-2 — spiral-of-death guard', () => {
  it('caps steps and drops the backlog on a 500 ms stall', () => {
    const acc = createAccumulator();
    let steps = 0;
    const executed = advance({ acc, frameDeltaMs: 500, update: () => (steps += 1) });

    expect(executed).toBe(MAX_STEPS_PER_FRAME);
    expect(acc.remainderMs).toBe(0);
  });

  it('recovers on the next normal frame instead of cascading', () => {
    const acc = createAccumulator();
    advance({ acc, frameDeltaMs: 500, update: () => {} });

    let steps = 0;
    const executed = advance({ acc, frameDeltaMs: STEP_MS, update: () => (steps += 1) });
    expect(executed).toBe(1);
    expect(steps).toBe(1);
  });
});
