// Audio bus (game-feel T-04, ADR-0003): one AudioContext with a masterGain → destination
// graph, SFX routed through sfxGain and a **reserved, source-less musicGain** seam for a
// future streamed track — adding music later touches only the music bus, never the SFX
// path. The context starts suspended (browser autoplay policy) and is armed by
// `resume()` on the first user gesture (PRD AC-07); until then every audio call is a
// silent no-op that never throws (AC-06 fail-soft). Buffer loading and `play(key)` are
// T-05; wiring `armOnFirstGesture` into main.ts is T-09.

/**
 * Max concurrently sounding SFX voices (PRD §6 "Audio overlap safety"). Drop policy:
 * **steal-oldest** — when the pool is full the oldest playing voice is stopped to make
 * room, because the newest sound is the feedback for the most recent player action and
 * the oldest is the closest to finishing anyway.
 */
export const VOICE_CAP = 8;

export interface AudioGraph {
  context: AudioContext;
  masterGain: GainNode;
  sfxGain: GainNode;
  /** Reserved music seam (ADR-0003): connected under masterGain, no source until the music feature lands. */
  musicGain: GainNode;
}

/** One playing SFX voice as the pool sees it — T-05 wraps an AudioBufferSourceNode into this. */
export interface Voice {
  /** Stops the underlying source immediately; invoked when the voice is stolen at the cap. */
  stop: () => void;
}

export interface AudioBus {
  /** `null` when Web Audio is unavailable — every method degrades to a silent no-op. */
  graph: AudioGraph | null;
  isArmed: () => boolean;
  armOnFirstGesture: (target: EventTarget) => void;
  claimVoice: (voice: Voice) => void;
  releaseVoice: (voice: Voice) => void;
  activeVoiceCount: () => number;
}

const createDefaultContext = (): AudioContext => new AudioContext();

const buildGraph = (createContext: () => AudioContext): AudioGraph | null => {
  try {
    const context = createContext();
    const masterGain = context.createGain();
    masterGain.connect(context.destination);
    const sfxGain = context.createGain();
    sfxGain.connect(masterGain);
    const musicGain = context.createGain();
    musicGain.connect(masterGain);
    return { context, masterGain, sfxGain, musicGain };
  } catch {
    return null;
  }
};

const GESTURE_EVENTS = ['pointerdown', 'click'] as const;

export interface CreateAudioBusParams {
  /** Test seam: substitute a stub context. Production callers omit it. */
  createContext?: () => AudioContext;
}

export const createAudioBus = ({ createContext = createDefaultContext }: CreateAudioBusParams = {}): AudioBus => {
  const graph = buildGraph(createContext);
  const activeVoices: Voice[] = [];
  let armed = false;
  let armInFlight = false;
  let listenersAttached = false;

  const isArmed = (): boolean => armed;

  const handleFirstGesture = (): void => {
    if (graph === null || armed || armInFlight) {
      return;
    }
    armInFlight = true;
    graph.context.resume().then(
      () => {
        armed = true;
      },
      () => {
        // Failed resume stays un-armed but re-armable: the next gesture retries (AC-06).
        armInFlight = false;
      },
    );
  };

  const armOnFirstGesture = (target: EventTarget): void => {
    if (graph === null || listenersAttached) {
      return;
    }
    listenersAttached = true;
    for (const eventName of GESTURE_EVENTS) {
      target.addEventListener(eventName, handleFirstGesture);
    }
  };

  const claimVoice = (voice: Voice): void => {
    if (graph === null) {
      return;
    }
    while (activeVoices.length >= VOICE_CAP) {
      activeVoices.shift()?.stop();
    }
    activeVoices.push(voice);
  };

  const releaseVoice = (voice: Voice): void => {
    const index = activeVoices.indexOf(voice);
    if (index !== -1) {
      activeVoices.splice(index, 1);
    }
  };

  const activeVoiceCount = (): number => activeVoices.length;

  return { graph, isArmed, armOnFirstGesture, claimVoice, releaseVoice, activeVoiceCount };
};
