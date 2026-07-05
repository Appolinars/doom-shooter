---
status: Accepted
owner: "Maksym Vakulenko"
reviewers: ["Tech Lead"]
updated_at: "2026-07-05"
feature_size: S
stage: "04-05"
ticket: "N/A (personal pet-project)"
---

# 0003 — Run a Web Audio graph armed on the first gesture, SFX bus + reserved music bus

- **Status:** Accepted
- **Date:** 2026-07-05
- **Deciders:** Maksym Vakulenko (author), during the architecture-design Socratic walk

## Context

PRD US-01/US-05/AC-07 require audible feedback for five actions (shoot / pump / reload / spawn / death) within ≤ 100 ms, with a concurrent-voice cap so overlapping deaths + rapid fire never distort (PRD §6), all fail-soft. Browsers block audio until a user gesture (AC-07). The author also intends to add **background music (an mp3)** later — so the audio foundation must extend to a streamed track without rework. This is a new platform subsystem for the project (no audio today).

## Decision drivers

- ≤ 100 ms action→feedback and a hard concurrent-voice cap (PRD §6).
- Browser autoplay policy — must arm on the first gesture (AC-07).
- Fail-soft — a missing sound is silence, never a crash (AC-06).
- **Forward-looking:** a future background-music track must not force a second, unrelated audio subsystem; music + SFX should share one master volume.

## Considered options

1. **Web Audio graph with buses** — one `AudioContext` resumed on first gesture; `masterGain → sfxGain` plays short **decoded buffers** (low latency, natural overlap, capped voice pool) for SFX now; a reserved `masterGain → musicGain` bus later takes a **streamed `HTMLMediaElement`** via `createMediaElementSource`. Separate SFX/music volume from day one.
2. **Simple `HTMLAudioElement` pool** — a pool of `<audio>` elements per SFX key now; add music later as a separate `<audio>`. Simplest today.
3. **Web Audio, music as a decoded buffer too** — stream-free; decode the whole mp3 into an `AudioBuffer`.

## Decision outcome

**Chosen:** Option 1. It gives the low-latency overlapping SFX the feedback window needs **and** a clean seam for future music with shared/master and per-bus volume — the explicit forward-looking goal. Option 2 leaves two unrelated audio paths and no shared volume; Option 3 would hold a multi-minute track as decoded PCM in memory (tens of MB) instead of streaming it. The MVP builds only `AudioContext + masterGain + sfxGain + buffer pool`; `musicGain` is a reserved node, wired later in one branch.

## Consequences

**Positive**
- SFX are decoded buffers → sub-100 ms triggering and natural polyphony under a voice cap.
- Music later streams into the same graph → shared master volume, no rework, no memory blow-up.
- One arm-on-first-gesture point covers all current and future audio.

**Negative**
- Web Audio is more setup than an `<audio>` pool (context lifecycle, decode step, gain nodes).
- Buffer decode is async → SFX are silent until decoded (acceptable, fail-soft).

**Neutral**
- Music, mixing, ducking, and a mute/volume UI (out of scope now, PRD N8) all become incremental additions on the existing graph rather than new subsystems.

## Links

- PRD: [[../PRD.md]] US-01 / US-05 / AC-07 / §6 (voice cap)
- SAD: [[../sad.md]] §4, §8 (Audio arming, Voice-pool cap)
- Related ADR: —
