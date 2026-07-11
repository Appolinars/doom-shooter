// Finale music player (game-feel T-11): the one looping track through the ADR-0003
// musicGain seam — loop routing, idempotent play, stop-on-retry — and the AC-06 fail-soft
// paths shared with sfx.ts: missing file, decode failure, un-armed audio, no Web Audio.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { createAudioBus } from '../../src/audio/audio.ts';
import { loadMusic, FINALE_TRACK_URL } from '../../src/audio/music.ts';
import type { SfxResponse } from '../../src/audio/sfx.ts';

class StubGainNode {
  connect(): void {}
}

class StubBufferSource {
  buffer: unknown = null;
  loop = false;
  connectedTo: unknown[] = [];
  startCalls = 0;
  stopCalls = 0;

  connect(node: unknown): void {
    this.connectedTo.push(node);
  }

  start(): void {
    this.startCalls++;
  }

  stop(): void {
    this.stopCalls++;
  }

  addEventListener(): void {}
}

class StubAudioContext {
  destination = { kind: 'destination' };
  createdSources: StubBufferSource[] = [];
  decodeFails = false;

  createGain(): StubGainNode {
    return new StubGainNode();
  }

  createBufferSource(): StubBufferSource {
    const source = new StubBufferSource();
    this.createdSources.push(source);
    return source;
  }

  resume(): Promise<void> {
    return Promise.resolve();
  }

  decodeAudioData(bytes: ArrayBuffer): Promise<unknown> {
    const tag = new TextDecoder().decode(bytes);
    if (this.decodeFails) {
      return Promise.reject(new Error(`undecodable: ${tag}`));
    }
    return Promise.resolve({ decodedFrom: tag });
  }
}

const okResponse = (tag: string): SfxResponse => ({
  ok: true,
  status: 200,
  arrayBuffer: () => Promise.resolve(new TextEncoder().encode(tag).buffer as ArrayBuffer),
});

const missingResponse = (): SfxResponse => ({
  ok: false,
  status: 404,
  arrayBuffer: () => Promise.reject(new Error('no body')),
});

const fetchOk = (url: string): Promise<SfxResponse> => Promise.resolve(okResponse(url));

const makeArmedBus = async () => {
  const context = new StubAudioContext();
  const bus = createAudioBus({ createContext: () => context as unknown as AudioContext });
  const target = new EventTarget();
  bus.armOnFirstGesture(target);
  target.dispatchEvent(new Event('pointerdown'));
  await Promise.resolve();
  expect(bus.isArmed()).toBe(true);
  return { bus, context };
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AC-T11-1 — the finale plays as one looping source through musicGain', () => {
  it('play() starts a looping bufferSource routed into musicGain, not sfxGain', async () => {
    const { bus, context } = await makeArmedBus();
    const music = loadMusic({ bus, fetchTrack: fetchOk });
    await music.loaded;

    music.play();

    expect(context.createdSources).toHaveLength(1);
    const source = context.createdSources[0]!;
    expect(source.startCalls).toBe(1);
    expect(source.loop).toBe(true);
    expect(source.connectedTo).toEqual([bus.graph!.musicGain]);
    expect(source.buffer).toEqual({ decodedFrom: FINALE_TRACK_URL });
  });

  it('music bypasses the SFX voice pool — the cap counter stays at zero', async () => {
    const { bus } = await makeArmedBus();
    const music = loadMusic({ bus, fetchTrack: fetchOk });
    await music.loaded;

    music.play();

    expect(bus.activeVoiceCount()).toBe(0);
  });

  it('play() while already playing is a no-op — no doubled track', async () => {
    const { bus, context } = await makeArmedBus();
    const music = loadMusic({ bus, fetchTrack: fetchOk });
    await music.loaded;

    music.play();
    music.play();

    expect(context.createdSources).toHaveLength(1);
  });
});

describe('AC-T11-2 — stop() silences the finale; a later round end restarts it', () => {
  it('stop() stops the source and a following play() starts a fresh one', async () => {
    const { bus, context } = await makeArmedBus();
    const music = loadMusic({ bus, fetchTrack: fetchOk });
    await music.loaded;

    music.play();
    music.stop();
    expect(context.createdSources[0]!.stopCalls).toBe(1);

    music.play();
    expect(context.createdSources).toHaveLength(2);
  });

  it('stop() with nothing playing is a no-op that never throws', async () => {
    const { bus } = await makeArmedBus();
    const music = loadMusic({ bus, fetchTrack: fetchOk });
    await music.loaded;

    expect(() => music.stop()).not.toThrow();
    expect(() => music.stop()).not.toThrow();
  });
});

describe('AC-T11-3 / AC-06 — fail-soft: bad asset, un-armed audio, no Web Audio', () => {
  it('a 404 track logs once at load time and play() stays a silent no-op', async () => {
    const { bus, context } = await makeArmedBus();
    const logError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const music = loadMusic({ bus, fetchTrack: () => Promise.resolve(missingResponse()) });
    await music.loaded;

    expect(logError).toHaveBeenCalledTimes(1);
    expect(logError.mock.calls[0]![0]).toContain(`"${FINALE_TRACK_URL}"`);
    expect(() => music.play()).not.toThrow();
    expect(context.createdSources).toHaveLength(0);
    expect(logError).toHaveBeenCalledTimes(1);
  });

  it('an un-decodable track is contained the same way', async () => {
    const { bus, context } = await makeArmedBus();
    const logError = vi.spyOn(console, 'error').mockImplementation(() => {});
    context.decodeFails = true;
    const music = loadMusic({ bus, fetchTrack: fetchOk });
    await music.loaded;

    expect(logError).toHaveBeenCalledTimes(1);
    expect(() => music.play()).not.toThrow();
    expect(context.createdSources).toHaveLength(0);
  });

  it('play() before audio is armed is a silent no-op', async () => {
    const context = new StubAudioContext();
    const bus = createAudioBus({ createContext: () => context as unknown as AudioContext });
    const music = loadMusic({ bus, fetchTrack: fetchOk });
    await music.loaded;

    expect(() => music.play()).not.toThrow();
    expect(context.createdSources).toHaveLength(0);
  });

  it('a bus without Web Audio never fetches and play/stop never throw', async () => {
    const bus = createAudioBus({
      createContext: () => {
        throw new Error('no Web Audio here');
      },
    });
    const fetchSpy = vi.fn<(url: string) => Promise<SfxResponse>>();
    const music = loadMusic({ bus, fetchTrack: fetchSpy });

    await expect(music.loaded).resolves.toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(() => music.play()).not.toThrow();
    expect(() => music.stop()).not.toThrow();
  });

  it('a round that ends before the track decodes is silent; the next end is audible', async () => {
    const { bus, context } = await makeArmedBus();
    let settleFetch = (): void => {};
    const gate = new Promise<void>((resolve) => {
      settleFetch = resolve;
    });
    const music = loadMusic({ bus, fetchTrack: (url) => gate.then(() => okResponse(url)) });

    music.play();
    expect(context.createdSources).toHaveLength(0);

    settleFetch();
    await music.loaded;
    music.play();
    expect(context.createdSources).toHaveLength(1);
  });
});
