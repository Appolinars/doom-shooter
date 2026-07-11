---
id: T-13
epic: game-feel
project: doom-shooter
wave: 5
priority: P2
estimate: S
blocks: []
blocked_by: [T-08]
status: done
context_budget: 4000
created: 2026-07-11
owner: Maksym Vakulenko
---

# T-13 — Sprite remap: early death frames become hurt states, fast gets 3 HP

## Goal

Playtest rebalance of the demon art (author decision 2026-07-11): the first death frames
read better as *wound* states than as death, so they move to the hurt slots and every
death animation becomes a uniform **3 frames**. `fast` gains HP so its new hurt frames are
reachable: **maxHp 1 → 3** — this amends the PRD §8 HP-tier default (fast=1) the same way
the earlier baron point-value tuning was accepted as config debt. No new files: pure
rename/remap of the shipped Freedoom art + config/atlas constants.

Per-demon remap (`old file → new key`):

| Demon | Hurt frames after | Death frames after | File moves |
|---|---|---|---|
| `fast` (**hp 3**) | hurt-2 ← death-1, hurt-1 ← death-2 | 3 ← death-3/4/5 | 5 renames |
| `brute` (hp 2) | hurt-1 ← death-2 (old hurt-1 **deleted**) | 3 ← death-3/4/5 | 2 deletes + 4 renames |
| `baron` (hp 4) | hurt-3 ← original hurt (light), hurt-1 ← death-1 (heavy) | 3 ← death-2/3/4 | 5 renames |

> **Post-merge fix (same day):** the first cut put the heavy ex-death-1 frame at `hurt-2`,
> so hp 3 fell back to it and the light frame showed *last* — wounds read heavy → light.
> Reslotted to `hurt-3` (light) + `hurt-1` (heavy, hp 2 via nearest-frame): light → heavy.

## Linked artifacts

- [[../assets-manifest.md]] §3.2 / §6 / §7 — file tables, license rows and the key
  contract change with this task (single source of truth for names).
- [[../adr/0001-demon-hp-as-bounded-field-damaged-inline.md]] — hp stays a bounded field;
  only `maxHp` data changes, no new damage logic.
- [[../PRD.md]] §8 HP-tier OQ — tiers were explicitly left as tuning debt; fast=3 is that
  tuning happening.

## Acceptance criteria

**AC-T13-1 (fast is a 3-shot kill with visible wound progression)**
Given a fresh `fast` demon (hp 3)
When it is shot twice
Then it survives showing hurt-2 after the first hit and hurt-1 after the second, and the
third shot kills it.

**AC-T13-2 (uniform 3-frame death animations)**
Given any demon dies
Then its death visual slices `DEATH_ANIM_MS` over exactly 3 frames and every
`demon-<name>-death-{1..3}` file exists (no dangling `-4`/`-5` keys in the atlas).

**AC-T13-3 (no new audio — fast hurt stays silent by fallback)**
Given a `fast` demon takes a non-lethal hit
Then no SFX plays for the hurt event (the 9-key SFX contract is unchanged; the wiring
guard already drops the unauthored `demon-fast-hurt` key).

## Atomic checklist

- [x] Step 1: rename/delete the PNG files in `public/assets/sprites/` per the remap table.
- [x] Step 2: `config.ts` — fast `maxHp: 3`; `sprites.ts` — `DEATH_FRAME_COUNTS` all 3,
      `AUTHORED_HURT_STEPS` fast `[1,2]` / baron `[1,2]`; stale "fast never hurts"
      comments updated here + sfx.ts + wiring.ts.
- [x] Step 3: assets-manifest §1/§3.2/§6/§7 rows updated to the new names/counts.
- [x] Step 4: tests — config tier assert; SPRITE_FILES contract (23 keys, fast-hurt
      present); hit/step/round tests pin `hp` where a 1-shot kill is meant; render
      death-frame slice indices for 3 frames; new fast wound-progression test.

## Edge cases

| Case | Expected |
|---|---|
| fast at hp 3 (unhurt) | full frame, not a hurt frame (`isDemonHurt` gate unchanged) |
| baron at hp 2 | nearest-step fallback resolves to the heavy **hurt-1** (no hurt-2 authored) |
| Mid-death visual from a pre-remap round | impossible — assets swap at rest, not live |

## DoD

- Files on disk exactly match the §3.2 atlas keys; fast plays 2 wound states + 3-frame
  death; brute/baron deaths 3 frames; typecheck + all tests green; manifest in sync.
