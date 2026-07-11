// SFX loader + player (game-feel T-05): the 9-key manifest contract, playing a decoded
// buffer as one capped voice through sfxGain, and the AC-06 fail-soft paths — missing
// file, decode failure, un-armed audio, and a bus without Web Audio at all.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { createAudioBus, VOICE_CAP } from '../../src/audio/audio.ts';
import { loadSfx, SFX_KEYS, SFX_MANIFEST, type SfxResponse } from '../../src/audio/sfx.ts';

class StubGainNode {
  connect(): void {}
}

class StubBufferSource {
  buffer: unknown = null;
  connectedTo: unknown[] = [];
  startCalls = 0;
  stopCalls = 0;
  private endedListeners: (() => void)[] = [];

  connect(node: unknown): void {
    this.connectedTo.push(node);
  }

  start(): void {
    this.startCalls++;
  }

  stop(): void {
    this.stopCalls++;
  }

  addEventListener(eventName: string, listener: () => void): void {
    if (eventName === 'ended') {
      this.endedListeners.push(listener);
    }
  }

  emitEnded(): void {
    for (const listener of this.endedListeners) {
      listener();
    }
  }
}

class StubAudioContext {
  destination = { kind: 'destination' };
  createdSources: StubBufferSource[] = [];
  decodeFailsFor = new Set<string>();

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
    if (this.decodeFailsFor.has(tag)) {
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

const fetchAllOk = (url: string): Promise<SfxResponse> => Promise.resolve(okResponse(url));

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AC-T05-3 — the 9-key manifest contract (assets-manifest §3.1 / §7)', () => {
  it('covers exactly the 9 contract keys with audio/<key>.wav paths', () => {
    expect(SFX_KEYS).toHaveLength(9);
    expect(Object.keys(SFX_MANIFEST).sort()).toEqual([...SFX_KEYS].sort());
    for (const key of SFX_KEYS) {
      expect(SFX_MANIFEST[key]).toBe(`assets/audio/${key}.wav`);
    }
  });

  it('has no pump, no reload, and no fast-hurt key', () => {
    const keys = SFX_KEYS as readonly string[];
    expect(keys).not.toContain('pump');
    expect(keys).not.toContain('reload');
    expect(keys).not.toContain('demon-fast-hurt');
  });
});

describe('AC-T05-1 — play a loaded SFX through sfxGain under the voice cap', () => {
  it('plays one started bufferSource routed into sfxGain', async () => {
    const { bus, context } = await makeArmedBus();
    const player = loadSfx({ bus, fetchSfx: fetchAllOk });
    await player.loaded;

    player.play('shoot');

    expect(context.createdSources).toHaveLength(1);
    const source = context.createdSources[0]!;
    expect(source.startCalls).toBe(1);
    expect(source.connectedTo).toEqual([bus.graph!.sfxGain]);
    expect(source.buffer).toEqual({ decodedFrom: SFX_MANIFEST.shoot });
    expect(bus.activeVoiceCount()).toBe(1);
  });

  it('rapid repeated play respects the cap: oldest source is stopped, count never exceeds it', async () => {
    const { bus, context } = await makeArmedBus();
    const player = loadSfx({ bus, fetchSfx: fetchAllOk });
    await player.loaded;

    for (let i = 0; i < VOICE_CAP + 2; i++) {
      player.play('shoot');
    }

    expect(bus.activeVoiceCount()).toBe(VOICE_CAP);
    expect(context.createdSources[0]!.stopCalls).toBe(1);
    expect(context.createdSources[1]!.stopCalls).toBe(1);
    expect(context.createdSources[VOICE_CAP + 1]!.stopCalls).toBe(0);
  });

  it('a voice that ends naturally releases its pool slot', async () => {
    const { bus, context } = await makeArmedBus();
    const player = loadSfx({ bus, fetchSfx: fetchAllOk });
    await player.loaded;

    player.play('shoot');
    player.play('demon-brute-death');
    context.createdSources[0]!.emitEnded();

    expect(bus.activeVoiceCount()).toBe(1);
  });
});

describe('AC-T05-2 / AC-06 — missing or un-decodable SFX is a logged-once silent no-op', () => {
  it('a 404 key logs once at load time and play(key) is a silent no-op', async () => {
    const { bus, context } = await makeArmedBus();
    const logError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetchShootMissing = (url: string): Promise<SfxResponse> =>
      Promise.resolve(url === SFX_MANIFEST.shoot ? missingResponse() : okResponse(url));
    const player = loadSfx({ bus, fetchSfx: fetchShootMissing });
    await player.loaded;

    expect(logError).toHaveBeenCalledTimes(1);
    expect(logError.mock.calls[0]![0]).toContain('"shoot"');

    expect(() => player.play('shoot')).not.toThrow();
    expect(() => player.play('shoot')).not.toThrow();
    expect(context.createdSources).toHaveLength(0);
    expect(bus.activeVoiceCount()).toBe(0);
    expect(logError).toHaveBeenCalledTimes(1);

    player.play('demon-fast-death');
    expect(context.createdSources).toHaveLength(1);
  });

  it('a fetch rejection is contained the same way', async () => {
    const { bus, context } = await makeArmedBus();
    const logError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetchShootRejects = (url: string): Promise<SfxResponse> =>
      url === SFX_MANIFEST.shoot ? Promise.reject(new Error('network down')) : Promise.resolve(okResponse(url));
    const player = loadSfx({ bus, fetchSfx: fetchShootRejects });

    await expect(player.loaded).resolves.toBeUndefined();
    expect(logError).toHaveBeenCalledTimes(1);
    expect(() => player.play('shoot')).not.toThrow();
    expect(context.createdSources).toHaveLength(0);
  });

  it('an un-decodable buffer logs once and stays silent', async () => {
    const { bus, context } = await makeArmedBus();
    const logError = vi.spyOn(console, 'error').mockImplementation(() => {});
    context.decodeFailsFor.add(SFX_MANIFEST['demon-baron-hurt']);
    const player = loadSfx({ bus, fetchSfx: fetchAllOk });
    await player.loaded;

    expect(logError).toHaveBeenCalledTimes(1);
    expect(logError.mock.calls[0]![0]).toContain('"demon-baron-hurt"');
    expect(() => player.play('demon-baron-hurt')).not.toThrow();
    expect(context.createdSources).toHaveLength(0);
  });
});

describe('fail-soft edges — pre-arm and no Web Audio', () => {
  it('play() before audio is armed is a silent no-op (T-04 pre-arm contract)', async () => {
    const context = new StubAudioContext();
    const bus = createAudioBus({ createContext: () => context as unknown as AudioContext });
    const player = loadSfx({ bus, fetchSfx: fetchAllOk });
    await player.loaded;

    expect(() => player.play('shoot')).not.toThrow();
    expect(context.createdSources).toHaveLength(0);
    expect(bus.activeVoiceCount()).toBe(0);
  });

  it('a bus without Web Audio never fetches and play never throws', async () => {
    const bus = createAudioBus({
      createContext: () => {
        throw new Error('no Web Audio here');
      },
    });
    const fetchSpy = vi.fn<(url: string) => Promise<SfxResponse>>();
    const player = loadSfx({ bus, fetchSfx: fetchSpy });

    await expect(player.loaded).resolves.toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(() => player.play('shoot')).not.toThrow();
  });

  it('a key played before its load settles is silent, then audible after it settles', async () => {
    const { bus, context } = await makeArmedBus();
    let settleFetches = (): void => {};
    const gate = new Promise<void>((resolve) => {
      settleFetches = resolve;
    });
    const gatedFetch = (url: string): Promise<SfxResponse> => gate.then(() => okResponse(url));
    const player = loadSfx({ bus, fetchSfx: gatedFetch });

    player.play('shoot');
    expect(context.createdSources).toHaveLength(0);

    settleFetches();
    await player.loaded;
    player.play('shoot');
    expect(context.createdSources).toHaveLength(1);
  });
});
