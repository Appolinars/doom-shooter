// Audio bus (game-feel T-04, ADR-0003): graph shape, arm-on-first-gesture idempotency,
// voice-pool cap with the steal-oldest policy, and fail-soft degradation when Web Audio
// is unavailable — which is the natural default in this node test environment.

import { describe, it, expect, vi } from 'vitest';
import { createAudioBus, VOICE_CAP, type Voice } from '../../src/audio/audio.ts';

class StubGainNode {
  connectedTo: unknown[] = [];
  connect(node: unknown): void {
    this.connectedTo.push(node);
  }
}

class StubAudioContext {
  state = 'suspended';
  destination = { kind: 'destination' };
  resumeCalls = 0;
  createdGains: StubGainNode[] = [];
  private resolveResume = (): void => {};
  private rejectResume = (): void => {};

  createGain(): StubGainNode {
    const gain = new StubGainNode();
    this.createdGains.push(gain);
    return gain;
  }

  resume(): Promise<void> {
    this.resumeCalls++;
    return new Promise<void>((resolve, reject) => {
      this.resolveResume = resolve;
      this.rejectResume = reject;
    });
  }

  finishResume(): Promise<void> {
    this.state = 'running';
    this.resolveResume();
    return Promise.resolve();
  }

  failResume(): Promise<void> {
    this.rejectResume();
    return Promise.resolve();
  }
}

const makeBus = () => {
  const context = new StubAudioContext();
  const bus = createAudioBus({ createContext: () => context as unknown as AudioContext });
  return { bus, context };
};

const makeVoice = (): Voice => ({ stop: vi.fn() });

const gesture = (target: EventTarget): void => {
  target.dispatchEvent(new Event('pointerdown'));
};

describe('AC-T04-4 — graph shape: masterGain → sfxGain + reserved musicGain', () => {
  it('routes masterGain to the destination and both buses into masterGain', () => {
    const { bus, context } = makeBus();

    expect(bus.graph).not.toBeNull();
    const { masterGain, sfxGain, musicGain } = bus.graph!;
    expect((masterGain as unknown as StubGainNode).connectedTo).toEqual([context.destination]);
    expect((sfxGain as unknown as StubGainNode).connectedTo).toEqual([masterGain]);
    expect((musicGain as unknown as StubGainNode).connectedTo).toEqual([masterGain]);
  });

  it('reserves musicGain with no source feeding it (nothing else connects into the graph)', () => {
    const { context } = makeBus();

    // Only the three bus gains exist — no source node was created or connected anywhere.
    expect(context.createdGains).toHaveLength(3);
  });
});

describe('AC-T04-1 — armed exactly once on the first gesture', () => {
  it('resumes on the first gesture and reports armed once the resume resolves', async () => {
    const { bus, context } = makeBus();
    const target = new EventTarget();
    bus.armOnFirstGesture(target);

    expect(bus.isArmed()).toBe(false);

    gesture(target);
    expect(context.resumeCalls).toBe(1);
    expect(bus.isArmed()).toBe(false);

    await context.finishResume();
    expect(bus.isArmed()).toBe(true);
  });

  it('a second gesture never re-arms — including while the first resume is still pending', async () => {
    const { bus, context } = makeBus();
    const target = new EventTarget();
    bus.armOnFirstGesture(target);

    gesture(target);
    gesture(target);
    expect(context.resumeCalls).toBe(1);

    await context.finishResume();
    gesture(target);
    target.dispatchEvent(new Event('click'));
    expect(context.resumeCalls).toBe(1);
  });

  it('attaching the gesture hook twice does not duplicate listeners', () => {
    const { bus, context } = makeBus();
    const target = new EventTarget();
    bus.armOnFirstGesture(target);
    bus.armOnFirstGesture(target);

    gesture(target);
    expect(context.resumeCalls).toBe(1);
  });

  it('a failed resume stays un-armed and the next gesture retries', async () => {
    const { bus, context } = makeBus();
    const target = new EventTarget();
    bus.armOnFirstGesture(target);

    gesture(target);
    await context.failResume();
    expect(bus.isArmed()).toBe(false);

    gesture(target);
    expect(context.resumeCalls).toBe(2);
    await context.finishResume();
    expect(bus.isArmed()).toBe(true);
  });
});

describe('AC-T04-3 — voice pool cap with steal-oldest drop policy', () => {
  it('never exceeds VOICE_CAP: the oldest voice is stopped to make room', () => {
    const { bus } = makeBus();
    const voices = Array.from({ length: VOICE_CAP + 3 }, makeVoice);

    for (const voice of voices) {
      bus.claimVoice(voice);
    }

    expect(bus.activeVoiceCount()).toBe(VOICE_CAP);
    for (const stolen of voices.slice(0, 3)) {
      expect(stolen.stop).toHaveBeenCalledTimes(1);
    }
    for (const alive of voices.slice(3)) {
      expect(alive.stop).not.toHaveBeenCalled();
    }
  });

  it('releasing a finished voice frees its slot without a steal', () => {
    const { bus } = makeBus();
    const first = makeVoice();
    const second = makeVoice();
    bus.claimVoice(first);
    bus.claimVoice(second);
    for (let i = 2; i < VOICE_CAP; i++) {
      bus.claimVoice(makeVoice());
    }

    bus.releaseVoice(first);
    expect(bus.activeVoiceCount()).toBe(VOICE_CAP - 1);

    bus.claimVoice(makeVoice());
    expect(bus.activeVoiceCount()).toBe(VOICE_CAP);
    expect(second.stop).not.toHaveBeenCalled();
  });

  it('releasing an unknown voice is a no-op', () => {
    const { bus } = makeBus();
    bus.claimVoice(makeVoice());

    bus.releaseVoice(makeVoice());
    expect(bus.activeVoiceCount()).toBe(1);
  });
});

describe('AC-T04-2 / AC-06 — fail-soft when Web Audio is unavailable', () => {
  it('degrades to silent no-ops when the context constructor throws', () => {
    const bus = createAudioBus({
      createContext: () => {
        throw new Error('no Web Audio here');
      },
    });

    expect(bus.graph).toBeNull();
    expect(bus.isArmed()).toBe(false);
    expect(() => {
      bus.armOnFirstGesture(new EventTarget());
      bus.claimVoice(makeVoice());
      bus.releaseVoice(makeVoice());
    }).not.toThrow();
    expect(bus.activeVoiceCount()).toBe(0);
  });

  it('degrades the same way with the default constructor in a Web-Audio-less environment', () => {
    // This node test env has no AudioContext global — the production default path itself
    // must fail soft (edge case "browser without Web Audio").
    const bus = createAudioBus();

    expect(bus.graph).toBeNull();
    expect(() => bus.claimVoice(makeVoice())).not.toThrow();
  });
});
