---
status: Confirmed
owner: "Maksym Vakulenko"
reviewers: []
updated_at: "2026-07-05"
feature_size: <XS|S|M|L|XL>     # set by sdlc:classify-size, not here
stage: "01"
ticket: "game-feel"
value_score:
  rice: 2.4
  state: confirmed
  confirmed_at: "2026-07-05"
feasibility_state: confirmed
---

<!-- Stage 01 → see SDLC/plugin/skills/interview/SKILL.md -->

# Idea Brief — game-feel

## 1. Raw idea
Make the completed basic-shooting-range actually *feel like Doom* by adding a juice/atmosphere layer: a visible first-person shotgun sprite with distinct states (idle, firing, between-shots pump / передергивание затвора, and full ammo reload); monster hit-points so demons take 1, 2, or 4 shots (each shot removes 1 HP); PNG sprites for demons including a bleeding/hurt frame when damaged and a short (~1s) death animation that disappears; a set of sounds (shoot, pump, reload, demon spawn, demon dying) that the author will supply as files; atmospheric Doom-style background images (author-supplied, chosen at random each run) instead of the current black screen; and a simple "try again" so a finished round can be replayed. Additional feel ideas (muzzle flash, screen shake, hit splats) are welcome.

## 2. Problem
The basic-shooting-range MVP is mechanically complete and passes all its tests, but it reads as a tech demo, not a game: demons are drawn shapes on a black screen, the weapon is invisible, every action is silent, kills are instant with no consequence shown, and a finished round is a dead-end score with no way to replay. The single most important emotional goal from the original product brief — "feel like Doom" — is entirely unmet, so the game is not yet something the author (or a demo viewer) actually wants to keep playing.

## 3. Users
Primary: the author, as player and as the person publishing a demo to itch.io / GitHub Pages. Secondary: casual demo viewers who click the published link and play one or two rounds. Frequency is per-play-session and bursty (a few rounds at a time). There is no multi-user, account, or organizational dimension — single-player, client-only, same as the base game.

## 4. Why now
The base game just reached a playable, tested, pushed MVP (all 11 stories merged, 90 unit + 5 E2E green). The mechanics are stable enough to decorate without fighting a moving target, and the "feel like Doom" pull was explicitly parked for exactly this moment. Nothing external forces the timing — it is the natural next increment and the emotional payoff the whole project was built toward.

## 5. Out of scope
- Player movement, map traversal, or level geometry (backdrops are pure decoration).
- Networking, multiplayer, accounts, or a server-side leaderboard.
- A lose condition / game-over ("demon reaches player") — still parked from the base game.
- Score or settings persistence across reloads.
- Full 3D, vertical aiming, or a physics engine.
- Procedurally generated or in-app-authored art/audio — all assets are author-supplied files; this feature only wires and sequences them.
- New demon movement patterns or spawn logic beyond what HP tiers require.

## 6. Competitive analysis
References are technique sources, not market competitors — this is a solo learning project, so "competition" means the canonical craft of game-feel.

| # | Product · URL | Features | Value (1-5) | Gap |
|---|---|---|---|---|
| 1 | The Art of Screenshake (J.W. Nijman / Vlambeer) · https://www.youtube.com/watch?v=AJdEqssNZ-U | Screen shake, recoil, muzzle flash, impact frames, sound-per-action | 5 | A talk, not reusable code — techniques must be re-implemented on our own render/audio layer |
| 2 | Doom (1993) · id Software | First-person weapon viewmodel with per-state frames, pump/reload animation, gib/death sprites, ambient dread | 5 | The north-star *look/feel*, but no drop-in assets and no HP-driven hurt frames out of the box |
| 3 | "Game feel on the web" · https://valdemird.com/blog/game-feel-on-the-web/ | Squash/stretch, shake, juice patterns specific to browser/canvas | 4 | Web-specific patterns, but generic (platformer-flavoured), not shooter viewmodel or HP feedback |
| 4 | Game-feel technique catalogs · https://gamedesignskills.com/game-design/game-feel/ · https://gamedevacademy.org/game-feel-tutorial/ | Sub-100ms feedback rule, audio+animation as the two juice domains, "juice on top of working mechanics" | 4 | Principles, not a shooter-specific recipe; no guidance on HP-tier visual feedback |

Footnotes — searched 2026-07-05, query: "game feel juice browser shooter screenshake muzzle flash sound design techniques".

## 7. Strategic approaches

### Approach A — Quick bolt-on effects
- **Thesis**: Add sounds, muzzle flash, screen shake and a "try again" button on top of the existing drawn shapes — the fastest possible feel bump.
- **For whom**: the author, wanting a fast win between evenings.
- **Outcome metric**: perceived "juiciness" — from "silent tech demo" to "reacts to my shots" (self-rated 2→4 of 5).
- **Key trade-off**: skips the visible weapon, PNG demon sprites, hurt/death frames and HP — i.e. leaves out most of what the author explicitly asked for.
- **Effort signal**: S
- **Recommended?** ◯

### Approach B — Full Doom viewmodel polish
- **Thesis**: Build the maximal, most Doom-authentic version up front — richly animated weapon viewmodel, per-HP demon sprite sets, elaborate death sequences, a layered mixed soundscape, and multiple atmospheric scenes.
- **For whom**: the author as a portfolio/demo publisher wanting a definitive result.
- **Outcome metric**: perceived juiciness 2→5 of 5; "looks like a real game" from a fresh viewer.
- **Key trade-off**: heavy investment in polish before the feel loop is validated; long runway, easy to over-engineer animation before the first satisfying shot exists.
- **Effort signal**: L
- **Recommended?** ◯

### Approach C — Structured additive feel-layer
- **Thesis**: Deliver all six requested items as fail-soft, additive modules — an audio manager, feedback effects (flash/shake/splat), a random backdrop, a weapon viewmodel driven by existing weapon states, and demon sprites selected by HP — with HP tiers added as a bounded, config-driven extension of the demon model.
- **For whom**: the author, wanting the whole vision but shipped in safe, testable increments.
- **Outcome metric**: perceived juiciness 2→4.5 of 5; every listed action (shoot, pump, reload, spawn, hurt, death, restart) has visible + audible feedback within a sub-100ms response window.
- **Key trade-off**: the one real gameplay change (HP) touches hit-resolution and scoring invariants and their tests, so this feature is not "presentation-only" — but the change is contained to a single demon field + damage step.
- **Effort signal**: M
- **Recommended?** ●

## 8. Multi-perspective feedback

### Engineer
- HP is the only load-bearing change: it touches front-most-hit resolution and the non-decreasing-score invariant plus their tests — keep it a single `hp` field + a "remove 1, score on 0" step, don't reshape the model.
- All juice must live on the render layer and never on the deterministic fixed step (existing loop rule) — otherwise shake/animation timing corrupts game logic and breaks the drift/aim tests.
- Screen shake must transform the *view*, not the input mapping — the crosshair-to-world coordinate math has to stay shake-independent or aiming breaks.
- The weapon viewmodel is a small state machine that must stay in sync with the existing weapon states (idle/firing/pump/reload); it should read weapon state, never own it.
- Reuse the existing fail-soft asset pattern for every new asset kind (audio, backdrops, gun + demon sprites) so a missing author-supplied file degrades, never crashes.

### Executive
- This is the highest-emotional-return increment available: it directly delivers the original project's stated pull ("feel like Doom") at low cost on a now-stable base.
- Pure learning + demo value; it makes the eventual itch/Pages publish actually worth showing.
- Opportunity cost is modest — the parked lose-condition and demon-tuning debt wait one more increment, which is acceptable.
- Author-supplied assets keep spend near-zero and de-risk the "can we make art" unknown.

### UX-researcher
- Feedback must land under ~100ms of the action or juice reads as lag, not punch — protect responsiveness over richness.
- Audio needs a mute and must respect the browser's first-gesture requirement, or the very first shot is silent and the feature reads as broken.
- Restraint matters: over-strong screen shake causes nausea; offer a reduced-motion path and tune amplitude low.
- Death animation must read clearly as "killed" and be visually distinct from a miss/escape so the player understands consequence.
- "Try again" must be obvious on the end screen; a hidden restart is a dead-end for a casual viewer.

### Synthesis matrix
|         | Engineer | Executive | UX |
|---------|:--------:|:---------:|:--:|
| App. A  | +        | 0         | 0  |
| App. B  | -        | +         | +  |
| App. C  | +        | +         | +  |

Cells: A = trivial but leaves most value unbuilt; B = richest feedback yet over-built before validation; C = full vision, contained change, feedback on every action.

## 9. Trade-offs and edge cases

### Trade-offs per approach
| Approach | Pros | Cons |
|---|---|---|
| A | Fastest; zero invariant risk; instant "reacts to me" bump | Omits weapon, PNG demons, hurt/death, HP — most of the ask |
| B | Most authentic; definitive demo; richest feedback | Long runway; over-polishes before the feel loop is proven; easy to stall |
| C | Delivers all six items; fail-soft + testable; contained gameplay change | Not presentation-only (HP touches invariants + tests); more modules to wire than A |

### Edge cases
- Author-supplied file missing (any audio / backdrop / sprite) → degrade silently or to placeholder, never crash.
- Browser blocks audio before the first user gesture → first shot could be silent; must arm audio on first interaction.
- Many overlapping sounds (rapid fire + multiple deaths) → need voice pooling / overlap limits so audio doesn't distort.
- Death animation still playing when the round-end freeze hits → animation must resolve or freeze cleanly without mutating score.
- A hurt (bleeding) demon escapes its path → counts as a normal miss; hurt state must not change miss accounting.
- Rapid "try again" spamming → each restart must fully reset score, round, and reroll backdrop deterministically with no leaked state.
- Reduced-motion / nausea sensitivity → screen shake needs a low default and an off path.
- New sprites and backdrops must scale to the display density the base game already handles, without blur or misalignment.

## 10. Risks
- **Top (devil's advocate): silent first shot from the browser audio-gesture policy.** If audio isn't armed on the first user interaction, the very first shots play no sound and the whole juice feature reads as broken on load — the worst possible first impression for a demo link. Mitigation: initialise/unlock audio on the first click and treat audio as fail-soft.
- Juice computed inside the deterministic step (instead of the render layer) or screen shake leaking into the aim mapping would corrupt game logic and break the existing drift/aim/hit tests — both must be view-only.
- HP change silently violating the non-decreasing-score or front-most-hit invariants if not covered by updated tests.
- Over-juicing (too much shake / too-loud audio) making the game unpleasant rather than punchy — needs restraint + mute + reduced-motion.
- Author-supplied assets never arriving or looking inconsistent, leaving the game in permanent placeholder mode — the *felt* result depends on real assets.

## 11. RICE — Claude proposed
- **Reach (R)**: 2 — the author plus casual demo viewers if published to itch/Pages (§3 Users); small by nature for a solo learning project.
- **Impact (I)**: 3 (massive) — this is the single stated emotional core of the whole project ("feel like Doom"), and problem severity is high: today it reads as a tech demo, not a game (§2, Executive perspective §8).
- **Confidence (C)**: 0.8 — scope is well-understood and the base is stable, but a few open questions remain (exact asset list, HP balance values, audio browser behaviour) (§15).
- **Effort (E)**: 2 person-weeks — an additive layer of a few evenings; M signal from Approach C (§7).
- **RICE = R × I × C / E = 2 × 3 × 0.8 / 2 = 2.4**
- **State**: confirmed

## 12. Feasibility — Claude proposed
- [☑] **Tech**: The base game already ships a fail-soft sprite loader (`src/assets/`), a render layer, and a fixed-timestep loop; audio, extra sprites, backdrops, and an HP field are the same proven patterns extended.
- [☑] **Skills**: The author shipped the entire 11-story basic-shooting-range solo on this exact stack — same skills apply directly.
- [☑] **Time**: That MVP was completed in evenings; this is a smaller, additive layer, so a comparable or shorter cadence is realistic.
- **State**: confirmed

## 13. Recommendation
**Selected: Approach C — Structured additive feel-layer.** It is the only approach that delivers all six items the author confirmed they want (Q1 selected the entire set) while keeping juice on the render layer as decoration and never load-bearing — the core principle from the screenshake/"juice on top of working mechanics" reference (§6, refs 1 & 4). The multi-perspective matrix scores C `+/+/+` across Engineer, Executive and UX (§8) — uniquely balanced, where A leaves most value unbuilt and B over-invests polish before the feel loop is validated. RICE = 2.4 (§11) reflects massive Impact on a contained Effort, and Feasibility is 3/3 ☑ (§12) because every new asset kind reuses the base game's fail-soft loader and the author has already shipped the whole game. The one gameplay change (HP tiers) is deliberately scoped as a single demon-model field with a bounded damage step so it stays testable.

**Locked-in pointer**: for the write-prd stage, HP is modelled as a per-demon durability field (1/2/4) with each shot removing 1 and scoring on reaching 0; all feedback (audio, muzzle flash, screen shake, hurt/death sprites, backdrop, viewmodel) lives on the render layer and never on the fixed step; every author-supplied asset is optional and fail-soft; and "try again" resets score + round and rerolls the backdrop.

## 14. Parked & rejected approaches
| # | Approach | Status | Reason | Revisit trigger |
|---|---|:---:|---|---|
| A | Quick bolt-on effects | parked | Undershoots confirmed scope (no weapon/PNG demons/hurt/death/HP) | If timeline collapses and only a minimal feel bump is affordable |
| B | Full Doom viewmodel polish | parked | Over-invests polish before the feel loop is validated; long runway | After Approach C ships and the feel loop is proven worth deepening |

## 15. Open questions
- [ ] Exact asset list to supply (which sounds, how many backdrops, weapon + demon sprite sheets) — owner: Maksym, due: before implementation.
- [ ] HP-tier balance: point values and spawn mix for 1/2/4-HP demons — owner: Maksym, due: during implementation (tuning debt).
- [ ] Whether the bleeding/hurt sprite is one shared frame or per-HP-step frames — owner: Maksym, due: architecture/PRD stage.
- [ ] Audio-arming approach for the browser first-gesture policy — owner: Maksym, due: architecture stage.
- [ ] Reduced-motion / shake-intensity control surface (fixed low vs user toggle) — owner: Maksym, due: PRD stage.

## Related
- Base feature: `docs/features/basic-shooting-range/` (PRD, sad.md, data-model.md, tasks/).
- Shared gameplay glossary: `docs/features/basic-shooting-range/CONTEXT.md`; new terms: `docs/features/game-feel/CONTEXT.md`.
- Original "feel like Doom" pull: `docs/features/basic-shooting-range/idea-brief.md` §emotional goal.

## DoD self-check
- [x] 15 sections present
- [x] No anti-pattern terms (Postgres/Redis/etc.)
- [x] Length ≤ 5 pages (~2200 words)
- [x] Frontmatter status: Confirmed
- [x] RICE confirmed (state: confirmed)
- [x] Feasibility confirmed (state: confirmed)
- [x] Recommendation present with rationale citing 4 upstream sections (§6, §8, §11, §12)
