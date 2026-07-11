// SFX load + play (game-feel T-05, ADR-0003): fetch + decodeAudioData one WAV buffer per
// manifest key on top of the T-04 audio bus, then `play(key)` fires a bufferSource through
// sfxGain under the voice cap. Fail-soft per PRD AC-06: a missing or un-decodable file is
// logged once at load time and every later `play` of that key is a silent no-op — a bad
// asset never blocks the round. Wiring `play` into game events is T-09.

import type { AudioBus, Voice } from './audio.ts';

/**
 * The 9-key SFX contract (assets-manifest §3.1 / §7): `shoot` covers the blast incl.
 * pump/cock (no separate `pump`, no `reload`); `fast` has no authored hurt sound — since
 * T-13 it can be hurt (3 HP), but the event stays silent by the wiring's key guard.
 */
export const SFX_KEYS = [
  'shoot',
  'demon-fast-spawn',
  'demon-fast-death',
  'demon-brute-spawn',
  'demon-brute-hurt',
  'demon-brute-death',
  'demon-baron-spawn',
  'demon-baron-hurt',
  'demon-baron-death',
] as const;

export type SfxKey = (typeof SFX_KEYS)[number];

export type SfxManifest = Readonly<Record<SfxKey, string>>;

/** Key → URL of the WAV served from `public/assets/audio/` (assets-manifest §3.1). */
export const SFX_MANIFEST: SfxManifest = Object.fromEntries(
  SFX_KEYS.map((key) => [key, `assets/audio/${key}.wav`]),
) as Record<SfxKey, string>;

export interface SfxPlayer {
  /** Plays one capped voice for a loaded key; unloaded key or un-armed audio → silent no-op. */
  play: (key: SfxKey) => void;
  /** Resolves when every manifest fetch+decode has settled; failures are logged, not thrown. */
  loaded: Promise<void>;
}

/** The subset of `Response` the loader needs — lets tests stub fetch without a full Response. */
export interface SfxResponse {
  ok: boolean;
  status: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
}

type FetchSfx = (url: string) => Promise<SfxResponse>;

const defaultFetchSfx: FetchSfx = (url) => fetch(url);

export interface LoadSfxOptions {
  bus: AudioBus;
  manifest?: SfxManifest;
  /** Injectable for tests; defaults to global fetch. */
  fetchSfx?: FetchSfx;
}

/**
 * Kicks off fetch+decode for every manifest key and returns the player immediately plus a
 * `loaded` promise (same live-swap contract as `loadSprites`): a key that settles after the
 * round starts becomes audible on its next `play` with no restart.
 */
export const loadSfx = ({
  bus,
  manifest = SFX_MANIFEST,
  fetchSfx = defaultFetchSfx,
}: LoadSfxOptions): SfxPlayer => {
  const graph = bus.graph;
  const buffers = new Map<SfxKey, AudioBuffer>();

  const loadOneKey = async ({
    context,
    key,
    url,
  }: {
    context: BaseAudioContext;
    key: SfxKey;
    url: string;
  }): Promise<void> => {
    try {
      const response = await fetchSfx(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const bytes = await response.arrayBuffer();
      buffers.set(key, await context.decodeAudioData(bytes));
    } catch (err) {
      console.error(`[sfx] failed to load "${key}", staying silent`, err);
    }
  };

  const loaded =
    graph === null
      ? Promise.resolve()
      : Promise.all(
          (Object.entries(manifest) as [SfxKey, string][]).map(([key, url]) =>
            loadOneKey({ context: graph.context, key, url }),
          ),
        ).then(() => {});

  const play = (key: SfxKey): void => {
    if (graph === null || !bus.isArmed()) {
      return;
    }
    const buffer = buffers.get(key);
    if (!buffer) {
      return;
    }

    const source = graph.context.createBufferSource();
    source.buffer = buffer;
    source.connect(graph.sfxGain);

    const voice: Voice = {
      stop: () => {
        try {
          source.stop();
        } catch {
          // Already stopped or never started — stealing a settled voice stays a no-op.
        }
      },
    };
    source.addEventListener('ended', () => bus.releaseVoice(voice));

    bus.claimVoice(voice);
    source.start();
  };

  return { play, loaded };
};
