---
id: T-05
epic: game-feel
project: doom-shooter
wave: 2
priority: P1
estimate: S
blocks: [T-09]
blocked_by: [T-04]
status: todo
context_budget: 4000
created: 2026-07-06
owner: Maksym Vakulenko
---

# T-05 — SFX load/decode + `play(key)`, fail-soft

## Goal

Add `src/audio/sfx.ts` on top of the T-04 graph: fetch + `decodeAudioData` one **WAV** buffer per key — the 9 keys in [[../assets-manifest.md]] §3.1 (`shoot` incl. pump/cock; per-demon `demon-<type>-spawn/hurt/death`; **no `pump`**, **no `reload`**) — and expose `play(key)` that fires a capped voice through `sfxGain`. A missing or un-decodable file resolves to a **silent no-op** and logs once — never blocks the round (AC-06), reusing the base fail-soft loader convention (`assets.sprite_unavailable` style, logged once, not per frame).

## Linked artifacts

- [[../adr/0003-web-audio-graph-armed-on-first-gesture.md]] — SFX buffers play through `sfxGain`, capped by the T-04 voice pool.
- [[../PRD.md]] AC-06 (missing sound → silence, never crash), AC-01/AC-04/AC-05 (which actions have a sound), §8 OQ "exact asset list" (default: 1 SFX per action).
- [[../sad.md]] §5 (`audio/sfx.ts ● load+decode SFX buffers, play(key), missing→silent`), §8 (Fail-soft assets + Logging crosscutting rows).
- Base pattern reused: [[../../basic-shooting-range/tasks/T-10-sprites-and-assets.md]] (fail-soft loader, log-once).

## Acceptance criteria

**AC-T05-1 (play a loaded SFX)**
Given audio is armed and `key` is loaded
When `play(key)` is called
Then one voice plays through `sfxGain`, respecting the voice cap.

**AC-T05-2 (missing SFX = silent, PRD AC-06)**
Given `key`'s file is missing or fails to decode
When `play(key)` is called
Then it is a silent no-op, logs once, and never throws.

**AC-T05-3 (per-action keys present)**
Given the 9-key set (`shoot` + per-demon spawn/hurt/death, §3.1)
Then each maps to a load slot; unresolved slots are treated as missing (AC-T05-2), not errors.

## Atomic checklist

- [ ] Step 1: `sfx.ts` — `loadSfx(manifest)`: fetch + `decodeAudioData` each key; store decoded buffers; log-once on failure, keep going.
- [ ] Step 2: `play(key)` — look up buffer; if absent, silent no-op; else create a bufferSource → `sfxGain`, register with the voice pool (T-04 cap).
- [ ] Step 3: define the SFX key manifest (the 9 keys, §3.1); paths per [[../assets-manifest.md]] §3.1 (`audio/<key>.wav`).
- [ ] Step 4: unit tests — loaded key plays one capped voice; missing key = no-op/no-throw + single log; decode-failure path.

## Edge cases

| Case | Expected |
|---|---|
| `play()` before audio armed | inherits T-04 pre-arm silent no-op |
| Rapid repeated `play('shoot')` | each respects the voice cap; oldest dropped per policy — no distortion |

## DoD

- Per-action buffers load fail-soft; `play(key)` honours the voice cap; missing-key silent-no-op + log-once tests green; no coupling to render or `GameState` (called by wiring in T-09).
