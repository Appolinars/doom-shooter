---

## status: Draft
owner: "Maksym Vakulenko"
reviewers: ["Tech Lead"]
updated_at: "2026-07-11"
feature_size: S
stage: "asset-manifest (DoR for T-05, T-07)"
ticket: "N/A (personal pet-project)"

# Asset manifest — game-feel

> **Closes:** PRD §8 open question *"Exact asset list to supply"*.
> **Serves as DoR for:** [T-05](./tasks/T-05-sfx-load-play.md) (audio) and [T-07](./tasks/T-07-sprite-backdrop-assets.md) (sprites / backdrops).
> **Inputs:** [PRD](./PRD.md) §4–6, §6.1, §8 · [sad.md](./sad.md) §5, §8 · existing fail-soft atlas `[src/assets/sprites.ts](../../../src/assets/sprites.ts)` · demon config `[src/core/config.ts](../../../src/core/config.ts)`.
> **Scope:** this document defines **file names, logical keys, formats, budgets, and the license-note template only**. It does **not** generate assets (PRD N6 — all art/audio is author-supplied). The author fills the license table as files are collected.



## 1. Locked design inputs (from PRD/SAD, not re-opened here)


| Input       | Value                                                                    | Source                          |
| ----------- | ------------------------------------------------------------------------ | ------------------------------- |
| Demon types | `fast` = 3 HP (T-13; PRD §8 default was 1), `brute` = 2 HP, **+ new 4-HP type** | ADR-0001, PRD §8, T-13    |
| Hurt frames | **per-HP-step** (not one shared)                                         | PRD §8 (resolved), SAD §11      |
| SFX         | `shoot` (incl. pump/cock — **no separate pump sound**); **per-demon** spawn/hurt/death (9 keys, WAV); no reload | amended 2026-07-11 |
| Backdrops   | **≥ 2**, random pick per round + on retry                                | PRD US-06, AC-10, T-07 AC-T07-3 |
| Weapon      | one shotgun viewmodel: idle / pump-1 / pump-2 / pump-3 / flash-1 / flash-2; fire = idle + flash overlay (**no `fire` frame**); **no reload, unlimited ammo** | author decision 2026-07-11 (was PRD US-01/02) |
| Everything  | **fail-soft**: missing file → placeholder / silence / black, never crash | PRD AC-06, SAD §8               |




### 1.1 The new 4-HP demon — proposed identity (config-tunable)

The 4-HP type needs a concrete `name` + `spriteKey` so asset keys can be fixed now. **Proposed:** `baron` (a Doom "Baron of Hell" heavy) → `spriteKey: 'demon-baron'`, extending the `DemonName` union to `'fast' | 'brute' | 'baron'`. The **name is the only thing still tunable** (HP=4 and the point value are settled elsewhere); if you rename it, rename the `demon-baron`* keys in §3.2 in lock-step. All key names below assume `baron`.

## 2. Directory layout & loading contract

Author-supplied **binary** files are static assets served by Vite from `public/`, fetched at runtime by URL (SAD §7: "served as static files alongside the bundle"). This is distinct from the current own-pixel-art path (`src/assets/demon-art.ts`), which is bundled TS — game-feel's art is external files loaded through the **same** `atlas.get → null → placeholder` contract.

```
public/assets/
├── audio/        # T-05 — one .wav per key (shoot + per-demon spawn/hurt/death)
├── sprites/      # T-07 — shotgun viewmodel + per-demon full/hurt/death
└── backdrops/    # T-07 — full-screen round backgrounds
```

**Loading contract (all three groups):**

- Each logical **key** maps to exactly one file. The loader registers the key; `get(key)` returns the decoded resource or `null`.
- A `null` / missing / undecodable file is **logged once** (base `assets.sprite_unavailable` convention, SAD §8 Logging) and the caller falls back — never per-frame spam, never a throw.
- Loads are **non-blocking**: the round starts immediately; a resource that arrives after start swaps in on the next frame / next `play()` (T-07 late-swap edge, current `sprites.ts` behaviour).



## 3. File tables

Legend — **Type:** `frames` = one file per animation frame, keyed `…-<n>` and played in index order by the effects clock (chosen over a packed strip: Doom-sourced frames differ in size and align cleaner as separate files, each centred on the demon anchor) · `sheet` = horizontal frame-strip (renderer slices by frame index) · `single` = one static image · `audio` = decoded buffer · `backdrop` = full-screen image.
**Engine criticality:** every file is **fail-soft-optional** (AC-06) — the engine runs on placeholders without any of them. The separate **Demo priority** column (§5) ranks what the "feels like Doom" payoff actually needs at publish.
Sizes/frame-counts are **recommended defaults** (author may adjust); target weights are per-file ceilings for the §4 budget.

### 3.1 `audio/` — T-05 SFX manifest

Keys are the **exact** `play(key)` **strings** T-05 Step 3 registers. **Amended 2026-07-11:** (a) the shotgun `shoot` sound **already includes the pump/cock**, so there is **no separate `pump` key** — the fire+pump animation plays under the one `shoot` sound; (b) spawn/hurt/death are now **per-demon-type** (was one shared each — PRD AC-04/AC-05 already say *"that demon's"* sound, so this aligns). `reload` remains dropped. Files are **WAV** (Doom sounds export straight to WAV from SLADE; browsers decode WAV natively — no ogg conversion).

| Key                  | File                        | Type  | Notes                                                                              |
| -------------------- | --------------------------- | ----- | ---------------------------------------------------------------------------------- |
| `shoot`              | `audio/shoot.wav`           | audio | Shotgun blast **incl. pump/cock** (single sound; AC-01). **Src:** Freedoom `DSSHOTGN`. |
| `demon-fast-spawn`   | `audio/demon-fast-spawn.wav`   | audio | Fast demon enters (AC-05). **Src:** Freedoom `TROO` sight (`DSBGSIT1/2`).           |
| `demon-fast-death`   | `audio/demon-fast-death.wav`   | audio | Fast demon killed (AC-04). **Src:** Freedoom `TROO` death (`DSBGDTH1/2`).           |
| `demon-brute-spawn`  | `audio/demon-brute-spawn.wav`  | audio | Brute enters (AC-05). **Src:** Freedoom `HEAD` sight (`DSCACSIT`).                  |
| `demon-brute-hurt`   | `audio/demon-brute-hurt.wav`   | audio | Brute takes non-lethal hit (AC-03). **Src:** Freedoom monster pain (`DSDMPAIN`).    |
| `demon-brute-death`  | `audio/demon-brute-death.wav`  | audio | Brute killed (AC-04). **Src:** Freedoom `HEAD` death (`DSCACDTH`).                  |
| `demon-baron-spawn`  | `audio/demon-baron-spawn.wav`  | audio | Baron enters (AC-05). **Src:** Freedoom `SARG` sight (`DSSGTSIT`).                  |
| `demon-baron-hurt`   | `audio/demon-baron-hurt.wav`   | audio | Baron takes non-lethal hit (AC-03). **Src:** Freedoom monster pain (`DSDMPAIN`).    |
| `demon-baron-death`  | `audio/demon-baron-death.wav`  | audio | Baron killed (AC-04). **Src:** Freedoom `SARG` death (`DSSGTDTH`).                  |

`fast` has **no authored hurt sound**: since T-13 it does enter the hurt state (3 HP, hurt sprites), but the audio event stays silent — the wiring key guard drops the unauthored `demon-fast-hurt` key. These 9 keys live in the SFX map (T-05), a separate registry from the sprite atlas — a monster's audio `demon-brute-death` and its sprite `demon-brute-death-1..5` do not collide.

- **Format note:** **WAV**, decoded by `decodeAudioData` in all target browsers (Chrome/Firefox/Safari). Doom `DS*` lumps are tiny (mono ~11 kHz, sub-second) → a few KB each, so WAV's lack of compression is irrelevant here. No conversion step, no extra tooling.
- **Voice cap:** playback is capped by the T-04 voice pool; the manifest imposes no per-key limit.



### 3.2 `sprites/` — T-07 atlas keys (viewmodel + per-demon)

Keys are the **exact atlas keys** T-07 Steps 1–2 register. Per-HP-step naming is `demon-<name>-hurt-<hpRemaining>`, chosen render-side by the demon's current `hp` (ADR-0001). `full` is shown at `hp == maxHp`; `death` is the killing-shot animation at `hp == 0`.

**Weapon viewmodel** (one shotgun, bottom-centre foreground). **No reload/magazine** (author decision 2026-07-11) — unlimited ammo, the pump between shots is the only gate. **No separate `fire` frame:** the shot is shown as the `idle` pose with the muzzle **flash overlaid** on it; then the 3-frame pump plays; then back to `idle`. Sourced from Freedoom `SHTG` (idle + 3 pump poses) + `SHTF` (2-frame flash). Filenames match the atlas keys exactly (`weapon-shotgun-<key>.png`).

Fire→pump→ready cycle on the render clock: `idle`+`flash-1`→`flash-2` (flash brighter on frame 2) at the shot, then `pump-1`→`pump-2`→`pump-3`, then `idle`.

| Key                     | File                              | Type   | Format | Frames | Actual px | Notes                                                                          |
| ----------------------- | --------------------------------- | ------ | ------ | ------ | --------- | ------------------------------------------------------------------------------ |
| `weapon-shotgun-idle`   | `sprites/weapon-shotgun-idle.png` | single | png    | 1      | 67×62     | Ready pose; also the base for the fire moment (flash overlaid). **Src:** Freedoom `SHTGA0`. |
| `weapon-shotgun-pump-1` | `sprites/weapon-shotgun-pump-1.png` | single | png  | 1      | 88×128    | Pump frame 1. **Src:** Freedoom `SHTG` pump pose.                              |
| `weapon-shotgun-pump-2` | `sprites/weapon-shotgun-pump-2.png` | single | png  | 1      | 93×143    | Pump frame 2. **Src:** Freedoom `SHTG` pump pose.                              |
| `weapon-shotgun-pump-3` | `sprites/weapon-shotgun-pump-3.png` | single | png  | 1      | 108×129   | Pump frame 3 (returns toward idle). **Src:** Freedoom `SHTG` pump pose.        |
| `weapon-shotgun-flash-1`| `sprites/weapon-shotgun-flash-1.png`| single | png  | 1      | 36×47     | Muzzle-flash overlay, dimmer. Drawn additively over `idle` at the muzzle. **Src:** Freedoom `SHTFA0`. Fail-soft-optional. |
| `weapon-shotgun-flash-2`| `sprites/weapon-shotgun-flash-2.png`| single | png  | 1      | 58×55     | Muzzle-flash overlay, brighter/larger (2nd frame). **Src:** Freedoom `SHTFB0`. Fail-soft-optional. |


**Demon sprites** (full / hurt / death). **Remapped in T-13 (2026-07-11):** the early death frames read better as wound states, so they moved into the hurt slots and every death animation is a uniform **3 frames**. `fast` (maxHp **3** since T-13) → hurt-2 + hurt-1 (ex death-1/2); `brute` (maxHp 2) → hurt-1 = ex death-2 (the original hurt frame and death-1 were dropped); `baron` (maxHp 4) → hurt-2 (ex death-1) + the original hurt-1, with hp 3 resolving to hurt-2 via nearest-frame. Sprites are Doom-sourced, so pixel sizes vary per frame (see the Freedoom values below) — the renderer anchors each frame **bottom-centre** (not centre) so the collapsing death frames settle in place instead of floating.


Death is authored as **per-frame files** (`demon-<name>-death-<n>`, `n = 1..N`), played back in index order by the render-side effects clock — not a packed strip. Frames may differ in pixel size; the renderer centres each on the demon anchor so size differences don't jitter the animation.

| Key                    | File                               | Type   | Frames | Per-frame px | Target weight | Notes                                                                     |
| ---------------------- | ---------------------------------- | ------ | ------ | ------------ | ------------- | ------------------------------------------------------------------------- |
| `demon-fast`           | `sprites/demon-fast.png`           | single | 1      | 48×60        | ≤ 12 KB       | Full (hp 3). **Replaces** current bundled pixel-art key. **Sourced:** Freedoom `TROO` (imp). |
| `demon-fast-hurt-2`    | `sprites/demon-fast-hurt-2.png`    | single | 1      | ~50×62       | ≤ 12 KB       | Hurt @ hp 2. **T-13:** ex `death-1` (Freedoom `TROO` death frame 1).       |
| `demon-fast-hurt-1`    | `sprites/demon-fast-hurt-1.png`    | single | 1      | ~55×62       | ≤ 12 KB       | Hurt @ hp 1. **T-13:** ex `death-2` (Freedoom `TROO` death frame 2).       |
| `demon-fast-death-{n}` | `sprites/demon-fast-death-{n}.png` | frames | 3      | ~55–65×50→32 | ≤ 12 KB ea.   | Killing-shot animation (hp 0), `n = 1..3`. **T-13:** ex `death-3..5`. Collapses. |
| `demon-brute`          | `sprites/demon-brute.png`          | single | 1      | ~64×64       | ≤ 14 KB       | Full (hp 2). **Sourced:** Freedoom `HEADA1` (BSD-3).                       |
| `demon-brute-hurt-1`   | `sprites/demon-brute-hurt-1.png`   | single | 1      | ~64×64       | ≤ 14 KB       | Hurt @ hp 1. **T-13:** ex `death-2` (Freedoom `HEADI0`); the original `HEADG0` hurt frame and `death-1` (`HEADH0`) were dropped. |
| `demon-brute-death-{n}`| `sprites/demon-brute-death-{n}.png`| frames | 3      | ~64–84×64    | ≤ 14 KB ea.   | Killing-shot animation (hp 0), `n = 1..3`. **T-13:** ex `death-3..5` = `HEADJ0`→`HEADL0` (last frames ~20 px wider). |
| `demon-baron`          | `sprites/demon-baron.png`          | single | 1      | 38×59        | ≤ 16 KB       | Full (hp 4), new 4-HP type.                                               |
| `demon-baron-hurt-2`   | `sprites/demon-baron-hurt-2.png`   | single | 1      | ~40×60       | ≤ 16 KB       | Hurt @ hp 2 — and hp 3 via nearest-frame fallback. **T-13:** ex `death-1`. |
| `demon-baron-hurt-1`   | `sprites/demon-baron-hurt-1.png`   | single | 1      | 38×59        | ≤ 16 KB       | Hurt @ hp 1.                                                               |
| `demon-baron-death-{n}`| `sprites/demon-baron-death-{n}.png`| frames | 3      | ~40–48×60→30 | ≤ 16 KB ea.   | Killing-shot animation (hp 0), `n = 1..3`. **T-13:** ex `death-2..4`. Collapses (height 60→30). |


**Optional FX sprite:**


| Key            | File                    | Type  | Frames | Per-frame px | Target weight | Notes                                                                                                                                                                |
| -------------- | ----------------------- | ----- | ------ | ------------ | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fx-hit-splat` | `sprites/hit-splat.png` | sheet | ~3     | 48×48        | ≤ 24 KB       | Impact splat (AC-01). **Fail-soft-optional beyond the norm:** if absent, `render/effects.ts` draws a procedural burst — this file only upgrades it. Lowest priority. |


> **Per-HP-step fail-soft (T-07 AC-T07-2, SAD §11 debt):** a missing hurt step falls back to the **nearest available** frame, never an error. This is now a *shipped* design choice, not just a safety net: `baron` (4 HP) provides `hurt-2` + `hurt-1`, so the render-side lookup for hp 3 resolves to `hurt-2` via nearest-frame. Authors can likewise ship `full`+`death` first and backfill hurt frames later without blocking.



### 3.3 `backdrops/` — T-07 random round background

`backdrops.ts` loads this list and `pickRandom()`s one per round / retry; zero loaded → **black** (AC-T07-3). Keys are an ordered list; the code does not depend on individual names, only on the registered set — but fixing names now lets the license table (§6) reference them. **Recommend 3** to make the reroll visibly vary (≥ 2 is the hard target).


| Key          | File                     | Type     | Format | Weight | Notes                                                           |
| ------------ | ------------------------ | -------- | ------ | ------ | --------------------------------------------------------------- |
| `backdrop-1` | `backdrops/backdrop-1.webp` | backdrop | webp | 62 KB  | Full-screen; drawn behind gameplay, no collision geometry (N1). Scaled to canvas at draw. |
| `backdrop-2` | `backdrops/backdrop-2.webp` | backdrop | webp | 131 KB | Second backdrop; `pickRandom()` alternates per round/retry.     |

**2 backdrops supplied** — meets the ≥ 2 target (AC-T07-3). A 3rd is optional (more reroll variety); not needed for the demo.


- **Format note:** `webp` for photographic/painted backgrounds (best weight/quality); it is the only place `webp` is used — the hard-edged sprites stay `png`.



## 4. Weight budget vs NFR §6 ("playable ≤ 3 s on broadband")

**The load never gates play.** All three groups load fail-soft and non-blocking (§2), so "playable ≤ 3 s" is satisfied *structurally*: the first frame renders on placeholders/black/silence at t≈0 regardless of asset state; assets swap in as they arrive. The budget below is a **courtesy ceiling** (keeps the demo snappy and the published `dist/` lean), not a blocking gate.


| Group                   | Files  | Sum of target weights |
| ----------------------- | ------ | --------------------- |
| audio/                  | 9      | ~170 KB (WAV, actual) |
| sprites/ (viewmodel)    | 6      | ≤ ~120 KB             |
| sprites/ (demons)       | 19     | ≤ ~120 KB (actual: ~65 KB) |
| sprites/ (fx, optional) | 1      | ≤ 24 KB (not supplied — procedural) |
| backdrops/              | 2      | ~193 KB (actual)      |
| **Total**               | **36** | **~0.65 MB (actual)** |


**Load strategy:**

- **Non-blocking / lazy, none in the critical render path.** Kick off all fetches on boot; the round loop never `await`s them.
- **Rough priority of fetch** (does not block, just orders bandwidth): audio + viewmodel + demon-`full` first (they show/sound on the very first actions), then hurt/death frames, then backdrops (the black fallback is acceptable for the first instant), then the optional `fx-hit-splat`.
- On a typical broadband link (~10+ Mbps) the full ~1.55 MB arrives in well under a second; on a slow link the game is already playable and simply "fills in" — exactly the fail-soft contract.



## 5. Playability vs feel — what can ship later

Two independent axes. **Engine criticality is** `optional` **for every single file** (the engine runs fully on placeholders — code for T-05/T-07/T-08/T-09 can be built and tested against placeholders *in parallel* with asset collection). The **Demo priority** ranks what the "feels like Doom" payoff needs at publish:


| Demo priority                       | Assets                                                                                                                                                  | Rationale                                                                                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **P1 — needed for the payoff**      | `shoot` (audio); `weapon-shotgun-idle` + `pump-1/2/3` + `flash-1/2`; `demon-fast`, `demon-brute`, `demon-baron` (full frames); `demon-*-death` (audio); ≥ 2 backdrops | The core "see + hear the shot", the weapon rhythm, a non-black scene, and readable demons — the KPI is 5/5 action→feedback pairs (PRD §7). |
| **P2 — enhances, safe to backfill** | `demon-*-spawn`, `demon-*-hurt` (audio); all `demon-*-hurt-*` and `demon-*-death-*` frames; the 3rd backdrop                                             | Fail-soft nearest-frame / silence covers gaps; adds consequence-reading polish but the demo already reads as Doom without them.            |
| **P3 — nice-to-have**               | `fx-hit-splat`                                                                                                                                          | Procedural burst already substitutes.                                                                                                      |


> **Parallelism guarantee:** because nothing is engine-critical, T-05/T-07 ship their loaders + fail-soft tests against these keys **before** any file exists; the author drops files into `public/assets/` as they are collected and they light up with no code change (late-swap, §2).



## 6. License note template (PRD §6.1 abuse case)

Publish **only license-clean** assets (PRD §6.1). The author fills one row per file **as it is collected**; this table is committed alongside the assets and gates T-07 AC-T07-4 (no unlicensed art in `dist/`). Suggested home: `public/assets/CREDITS.md` (mirrored/linked from here). Acceptable license values: `CC0`, `CC-BY-4.0` (with attribution kept), `self-authored`, or a named commercial license the author holds.


| File                             | Source (URL / author) | License  | Attribution required? | Modified? | Verified by / date |
| -------------------------------- | --------------------- | -------- | --------------------- | --------- | ------------------ |
| `audio/shoot.wav`                | Freedoom 0.13.0 `DSSHOTGN` | BSD-3-Clause | y (Freedoom credit) | n | Maksym / 2026-07-11 |
| `audio/demon-fast-spawn.wav`     | Freedoom 0.13.0 `TROO` sight | BSD-3-Clause | y (Freedoom credit) | n | Maksym / 2026-07-11 |
| `audio/demon-fast-death.wav`     | Freedoom 0.13.0 `TROO` death | BSD-3-Clause | y (Freedoom credit) | n | Maksym / 2026-07-11 |
| `audio/demon-brute-spawn.wav`    | Freedoom 0.13.0 `DSCACSIT` | BSD-3-Clause | y (Freedoom credit) | n | Maksym / 2026-07-11 |
| `audio/demon-brute-hurt.wav`     | Freedoom 0.13.0 `DSDMPAIN` | BSD-3-Clause | y (Freedoom credit) | n | Maksym / 2026-07-11 |
| `audio/demon-brute-death.wav`    | Freedoom 0.13.0 `DSCACDTH` | BSD-3-Clause | y (Freedoom credit) | n | Maksym / 2026-07-11 |
| `audio/demon-baron-spawn.wav`    | Freedoom 0.13.0 `DSSGTSIT` | BSD-3-Clause | y (Freedoom credit) | n | Maksym / 2026-07-11 |
| `audio/demon-baron-hurt.wav`     | Freedoom 0.13.0 `DSDMPAIN` | BSD-3-Clause | y (Freedoom credit) | n | Maksym / 2026-07-11 |
| `audio/demon-baron-death.wav`    | Freedoom 0.13.0 `DSSGTDTH` | BSD-3-Clause | y (Freedoom credit) | n | Maksym / 2026-07-11 |
| `sprites/weapon-shotgun-idle.png`    | Freedoom 0.13.0 `SHTGA0`   | BSD-3-Clause | y (Freedoom credit) | n | Maksym / 2026-07-11 |
| `sprites/weapon-shotgun-pump-1.png`  | Freedoom 0.13.0 `SHTG` pump | BSD-3-Clause | y (Freedoom credit) | n | Maksym / 2026-07-11 |
| `sprites/weapon-shotgun-pump-2.png`  | Freedoom 0.13.0 `SHTG` pump | BSD-3-Clause | y (Freedoom credit) | n | Maksym / 2026-07-11 |
| `sprites/weapon-shotgun-pump-3.png`  | Freedoom 0.13.0 `SHTG` pump | BSD-3-Clause | y (Freedoom credit) | n | Maksym / 2026-07-11 |
| `sprites/weapon-shotgun-flash-1.png` | Freedoom 0.13.0 `SHTFA0`   | BSD-3-Clause | y (Freedoom credit) | n | Maksym / 2026-07-11 |
| `sprites/weapon-shotgun-flash-2.png` | Freedoom 0.13.0 `SHTFB0`   | BSD-3-Clause | y (Freedoom credit) | n | Maksym / 2026-07-11 |
| `sprites/demon-fast.png`         | Freedoom 0.13.0 `TROO` (imp) | BSD-3-Clause | y (Freedoom credit) | n | Maksym / 2026-07-11 |
| `sprites/demon-fast-hurt-1..2.png` | Freedoom 0.13.0 `TROO` death frames 2/1 (T-13 remap) | BSD-3-Clause | y (Freedoom credit) | y (resized) | Maksym / 2026-07-11 |
| `sprites/demon-fast-death-1..3.png` | Freedoom 0.13.0 `TROO` death frames 3–5 (T-13 remap) | BSD-3-Clause | y (Freedoom credit) | y (resized) | Maksym / 2026-07-11 |
| `sprites/demon-brute.png`        | Freedoom 0.13.0 `HEADA1` | BSD-3-Clause | y (Freedoom credit) | n | Maksym / 2026-07-11 |
| `sprites/demon-brute-hurt-1.png` | Freedoom 0.13.0 `HEADI0` (T-13 remap; ex `HEADG0` dropped) | BSD-3-Clause | y (Freedoom credit) | n | Maksym / 2026-07-11 |
| `sprites/demon-brute-death-1..3.png` | Freedoom 0.13.0 `HEADJ0`→`HEADL0` (T-13 remap) | BSD-3-Clause | y (Freedoom credit) | y (resized) | Maksym / 2026-07-11 |
| `sprites/demon-baron.png`        | Freedoom 0.13.0 `SARG` | BSD-3-Clause | y (Freedoom credit) | n | Maksym / 2026-07-11 |
| `sprites/demon-baron-hurt-1..2.png` | Freedoom 0.13.0 `SARG` (hurt-2 = ex death-1, T-13 remap) | BSD-3-Clause | y (Freedoom credit) | n | Maksym / 2026-07-11 |
| `sprites/demon-baron-death-1..3.png` | Freedoom 0.13.0 `SARG` death frames 2–4 (T-13 remap) | BSD-3-Clause | y (Freedoom credit) | y (resized) | Maksym / 2026-07-11 |
| `sprites/hit-splat.png`          |                       |          |                       |           |                    |
| `backdrops/backdrop-1.webp`      | CC0 — OpenGameArt/itch _(add exact URL)_ | CC0 | n | y (→webp) | Maksym / 2026-07-11 |
| `backdrops/backdrop-2.webp`      | CC0 — OpenGameArt/itch _(add exact URL)_ | CC0 | n | y (→webp) | Maksym / 2026-07-11 |


**Attribution rule:** any `CC-BY`* row must have its credit line copied into `public/assets/CREDITS.md` before publish; a `CC-BY` file with no attribution line is treated as **not license-clean** and must not ship.

## 7. Key contract — must match code (do not drift)

These strings are the shared contract between this manifest, the file names, and the code. Renaming any of them requires editing **all** of manifest key + file name + the consuming module together.

- **T-05** `play(key)` **set (9):** `shoot` (incl. pump/cock) · `demon-fast-spawn` · `demon-fast-death` · `demon-brute-spawn` · `demon-brute-hurt` · `demon-brute-death` · `demon-baron-spawn` · `demon-baron-hurt` · `demon-baron-death`. **No `pump`** (folded into `shoot`), **no `reload`**; `fast` has no authored hurt sound (its T-13 hurt states stay silent).
- **T-07 viewmodel atlas keys:** `weapon-shotgun-idle` · `weapon-shotgun-pump-1` · `weapon-shotgun-pump-2` · `weapon-shotgun-pump-3` · `weapon-shotgun-flash-1` · `weapon-shotgun-flash-2`. **No `fire` frame** (fire = idle + flash overlay); no reload; no ammo/magazine. Filenames = keys (`weapon-shotgun-<key>.png`).
- **T-07 demon atlas keys (T-13 remap):** `demon-fast` · `demon-fast-hurt-{1,2}` · `demon-fast-death-{n}` (`1..3`) · `demon-brute` · `demon-brute-hurt-1` · `demon-brute-death-{n}` (`1..3`) · `demon-baron` · `demon-baron-hurt-{1,2}` · `demon-baron-death-{n}` (`1..3`). Baron hp 3 resolves to `hurt-2` (nearest-frame fallback); fast hurt states are sprite-only (no hurt sound).
- **Demon full-frame keys must equal** `DemonType.spriteKey` in `src/core/config.ts` (`demon-fast`, `demon-brute`, and the new `demon-baron`) — `validateSpriteKeys` (`src/assets/sprites.ts`) asserts this at boot.
- **T-07 optional FX key:** `fx-hit-splat`.
- **Backdrop keys:** registered as a set in `src/assets/backdrops.ts`; code depends on the *set*, not individual names (names exist for the §6 license table).



## Related

- [PRD.md](./PRD.md) §8 (this doc closes the "exact asset list" open question) · §6 / §6.1 (NFR + license abuse case).
- [sad.md](./sad.md) §5 (module map: `audio/`, `assets/sprites.ts`, `assets/backdrops.ts`, `assets/demon-art.ts`) · §8 (fail-soft contract).
- [tasks/T-05-sfx-load-play.md](./tasks/T-05-sfx-load-play.md) (consumes §3.1 + §7 audio keys) · [tasks/T-07-sprite-backdrop-assets.md](./tasks/T-07-sprite-backdrop-assets.md) (consumes §3.2/§3.3 + §7 atlas keys, §6 license note).
- [adr/0001-demon-hp-as-bounded-field-damaged-inline.md](./adr/0001-demon-hp-as-bounded-field-damaged-inline.md) (per-HP-step hurt keying).

