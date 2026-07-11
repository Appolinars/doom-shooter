// Finale music (game-feel T-11, ADR-0003): fills the reserved musicGain seam with the one
// looping round-end track. Same fail-soft contract as sfx.ts (PRD AC-06): a missing or
// un-decodable file is logged once at load time and `play()` stays a silent no-op — a bad
// asset never blocks the result screen. Music bypasses the SFX voice pool by design: one
// track, one source, stopped explicitly on retry (wiring in T-11 step 4).

import type { AudioBus } from './audio.ts';
import type { SfxResponse } from './sfx.ts';

export const FINALE_TRACK_URL = 'assets/audio/shooting-range-finale.wav';

export interface MusicPlayer {
  /** Starts the loaded track looping through musicGain; idempotent while playing; unloaded track or un-armed audio → silent no-op. */
  play: () => void;
  /** Stops and forgets the current source; no-op when nothing plays. */
  stop: () => void;
  /** Resolves when the track fetch+decode has settled; failure is logged, not thrown. */
  loaded: Promise<void>;
}

type FetchTrack = (url: string) => Promise<SfxResponse>;

const defaultFetchTrack: FetchTrack = (url) => fetch(url);

export interface LoadMusicOptions {
  bus: AudioBus;
  url?: string;
  /** Injectable for tests; defaults to global fetch. */
  fetchTrack?: FetchTrack;
}

/**
 * Kicks off fetch+decode for the track and returns the player immediately plus a `loaded`
 * promise (same live-swap contract as `loadSfx`): a track that settles after the round
 * ends becomes audible on the next round end with no restart.
 */
export const loadMusic = ({
  bus,
  url = FINALE_TRACK_URL,
  fetchTrack = defaultFetchTrack,
}: LoadMusicOptions): MusicPlayer => {
  const graph = bus.graph;
  let buffer: AudioBuffer | null = null;
  let playing: AudioBufferSourceNode | null = null;

  const loadTrack = async (context: BaseAudioContext): Promise<void> => {
    try {
      const response = await fetchTrack(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const bytes = await response.arrayBuffer();
      buffer = await context.decodeAudioData(bytes);
    } catch (err) {
      console.error(`[music] failed to load "${url}", staying silent`, err);
    }
  };

  const loaded = graph === null ? Promise.resolve() : loadTrack(graph.context);

  const play = (): void => {
    if (graph === null || !bus.isArmed() || buffer === null || playing !== null) {
      return;
    }
    const source = graph.context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(graph.musicGain);
    source.start();
    playing = source;
  };

  const stop = (): void => {
    if (playing === null) {
      return;
    }
    try {
      playing.stop();
    } catch {
      // Already stopped — stopping a settled source stays a no-op.
    }
    playing = null;
  };

  return { play, stop, loaded };
};
