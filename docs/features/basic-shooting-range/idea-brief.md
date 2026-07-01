---
status: Confirmed
owner: "Maksim Vakulenko"
reviewers: []
updated_at: "2026-07-01"
feature_size:                    # set by sdlc:classify-size, not here
stage: "01"
ticket: "N/A (personal pet-project)"
value_score:
  rice: 6
  state: confirmed
  confirmed_at: "2026-07-01"
feasibility_state: confirmed
---

<!-- Stage 01 → see SDLC/plugin/skills/interview/SKILL.md -->
<!-- Why: capture the idea before it's forgotten or retold incorrectly -->

# Idea Brief — Basic Shooting Range

## 1. Raw idea
A simple browser Doom-style shooting gallery (2D/pseudo-3D, no player movement). Demons appear by fixed movement patterns, the player aims with the mouse and fires a shotgun with a reload delay, different demons give different points, and a round ends with a total score. The technology (canvas 2D / raycasting / other) is NOT chosen yet — that is decided at the architecture stage.

## 2. Problem
The author is going through an SDLC course and wants to cement it on a real, finished project rather than an abstract example. At the same time there is a personal interest in how classic retro shooters create a sense of depth and a "meaty" shot. There is no finished playable artifact on which to both practice the process and learn these rendering techniques.

## 3. Users
- **Author-as-player** (primary): wants a genuinely fun mini-game they can play a round of.
- **Author-as-learner**: going through the SDLC course, needs an end-to-end artifact that demonstrates the process.
- **The public** (secondary, ≈10-20 players/quarter): after the demo is released (itch.io / GitHub Pages) — friends and random players judging the "fun" within the first few seconds.

## 4. Why now
Trigger — going through the SDLC course right now: a concrete project is needed to run the pipeline end-to-end (ideation → PRD → architecture → tasks → implementation). There is no deadline, but the course sets a natural window.

## 5. Out of scope
- Player movement across a map (the player is stationary — aiming only).
- Multiplayer, networking code, server side.
- Multiple levels/locations and between-round progression.
- Combo/multiplier system on top of score (score stays a flat number).
- A full 3D engine with real wall geometry and vertical aiming.
- Public release as an MVP goal (publishing is secondary, after the playable core).

## 6. Competitive analysis
| # | Product · URL | Features (Doom-atmo / gameplay-loop / simplicity) | Value (1-5) | Gap |
|---|---|---|---|---|
| 1 | RayCast.js Engine · undefbehav.itch.io/raycast-js | Pseudo-3D render, Doom assets, tech-demo without gameplay | 4 / 1 / 2 | No gameplay loop: no score, no round, no shooting-as-a-game |
| 2 | Doom-Nukem-CSS · github.com/yurkagon/Doom-Nukem-CSS | Pseudo-3D, movement, shotgun, enemies, menu | 4 / 3 / 2 | Requires player movement → larger scope; not a stationary gallery |
| 3 | Shoot The Balloons · github.com/rajivnayanc/Shoot_the_Balloons_HTML5_canvas | Mouse aim, click-to-fire, score | 1 / 4 / 5 | Flat 2D with no Doom atmosphere; no depth/shotgun |
| 4 | Shooting Range Simulator · gameforge.com/.../shooting-range-simulator | Browser shooting range, realistic shooting | 1 / 3 / 4 | Realistic aesthetic, not Doom; no pseudo-3D demons |
| 5 | RaycastingDemo · github.com/Krashner/RaycastingDemo | Simple Doom-style raycasting demo | 4 / 1 / 3 | Render demo only; no shooting-gallery gameplay (reload, score) |

Footnotes (date · query): all rows — WebSearch, 2026-07-01. #1,#2,#5 — "browser Doom-style raycasting shooting gallery game JavaScript demo". #3,#4 — "online browser shooting range target shooter game HTML5 no download".

**Key gap:** nobody combines a Doom pseudo-3D aesthetic with a stationary shooting-gallery loop (patterned demons + shotgun with reload + score per round). Raycasting projects deliver atmosphere without a gameplay loop; target shooters deliver a loop without atmosphere.

## 7. Strategic approaches

### Approach A — Flat 2D Carnival Shooting
- **Thesis**: A static Doom-themed backdrop with flat pixel demon sprites popping in on fixed paths, shot down with a mouse crosshair and a reload-gated shotgun, ending in a final score.
- **For whom**: The author-as-learner who wants a finished round on screen the very first evening, and the SDLC reviewer who values a demonstrably shippable MVP.
- **Outcome metric**: Time-to-first-playable-round: baseline (no demo) → a clickable, scoreable round in ≤2 evenings.
- **Key trade-off**: Drops true pseudo-3D depth; atmosphere is carried by sprites and a backdrop instead of real 3D.
- **Effort signal**: S
- **Recommended?** ◯

### Approach B — Corridor Dread, Point-Blank Punch
- **Thesis**: Sell an unmistakable Doom feel through a pseudo-3D corridor with depth-fog, flickering light, and chunky pixel demons lunging from darkness into a bone-rattling shotgun blast.
- **For whom**: The author and anyone who grew up on Doom — players chasing the tactile, atmospheric "boomer-shooter" thrill rather than arcade minimalism.
- **Outcome metric**: "Feels like Doom" gut-check from playtesters: baseline ~40% → 85%+ affirmative on first play.
- **Key trade-off**: Depth/light/feedback polish eats time a flat gallery would spend on demon variety and modes; atmosphere is prioritized over breadth.
- **Effort signal**: M
- **Recommended?** ◯

### Approach C — Layered 2.5D Shooting Gallery
- **Thesis**: Ship a playable stationary-shotgun round on flat 2D first, then layer sprite scaling and a backdrop so demons "approach" from depth — Doom atmosphere without a 3D engine.
- **For whom**: The author-as-player who wants both a genuinely fun mini-game AND a visible SDLC artifact demonstrating staged, incremental delivery.
- **Outcome metric**: "Feels like Doom" self-rating after a playtest: baseline 2/5 (flat targets) → target 4/5 (scaled demons + backdrop + shotgun feedback).
- **Key trade-off**: The pseudo-depth layer (sprite scaling, spawn-from-horizon, recoil/flash) adds one enhancement cycle over the flat MVP but stops short of true 3D — far-field perspective and vertical aiming are sacrificed.
- **Effort signal**: M
- **Recommended?** ●

## 8. Multi-perspective feedback

### Engineer
- **A**: Smallest integration surface, forgiving loop timing; the main risk is input (crosshair mapping, reload gating, hitboxes). But the flat design boxes you in: adding depth later = rewriting the render and hit-test.
- **B**: Highest render complexity (projection, fog, light, hit-test in projected space), effects sensitive to timing (elapsed-time, not frames), heavy asset pipeline. The most that can break before anything is playable.
- **C**: Best risk sequencing (the flat round is a real checkpoint, depth is additive), but requires a disciplined seam from day one; otherwise a refactor. Main hazard: scope creep at the layer.

### Executive
- **A**: Highest certainty of a finished artifact, but weakest portfolio differentiation and high opportunity cost on learning (it sidesteps the most instructive part — pseudo-3D).
- **B**: Highest learning/portfolio ceiling, but the highest abandonment risk directly attacks the primary value ("finish"); poor fit for the incremental SDLC narrative.
- **C**: Best fit for the context: A's guaranteed round + B's depth as a second stage; the staged plan itself is the course artifact; worst case degrades to A, not to nothing.

### UX-researcher
- **A**: Instant "point-and-shoot" readability, but weakest atmosphere (carnival, not Doom); reload risks feeling like downtime without juice; fixed paths are predictable.
- **B**: Highest atmosphere payoff and "Doom dread", the point-blank shot is the core feel moment; but darkness/fog threaten crosshair and reload-state legibility; higher onboarding barrier.
- **C**: Best-managed feel risk; "approach from depth" gives threat legibility and a natural ramp/tutorial; hazard is "neither arcade nor horror", needs one coherent tone.

### Synthesis matrix
|         | Engineer | Executive | UX |
|---------|:--------:|:---------:|:--:|
| App. A  | +        | 0         | 0  |
| App. B  | −        | −         | +  |
| App. C  | +        | +         | +  |

- A/Eng: simplest loop, but a flat dead-end.
- A/Exec: safe floor, low learning ceiling.
- A/UX: instant onboarding, weakest Doom atmosphere.
- B/Eng: highest complexity, risk before playable.
- B/Exec: abandonment risk attacks "finish".
- B/UX: best atmosphere, but legibility risk.
- C/Eng: best sequencing, if the seam holds.
- C/Exec: hedges finishing, keeps valuable learning.
- C/UX: natural ramp, mid-tone positioning risk.

## 9. Trade-offs and edge cases

### Trade-offs per approach
| Approach | Pros | Cons |
|---|---|---|
| A | Fastest to playable; almost no throwaway work; budget goes to juice | Weak Doom atmosphere; low learning ceiling; adding depth later = rewrite |
| B | Maximum atmosphere and "wow"; highest learning ceiling | Risk of never reaching playable; complexity up front; poor for the incremental narrative |
| C | Guaranteed playable checkpoint + depth as 2nd stage; degrades to A | Needs seam discipline (z from day one); mid-tone risk; scope creep on the layers |

### Edge cases
- Firing during reload — blocked, no shell consumed incorrectly.
- Two demons overlapping under the crosshair — the hit resolves to the nearest/front one; scaled hitboxes must not register transparent corners.
- Demon completes its whole path un-killed — despawn: an explicit miss or a penalty (needs to be defined).
- Click spam — a fire-rate limit beyond reload.
- Tab loses focus / pause — the game loop runs on elapsed-time, with no "fast-forward" and no 144 Hz speed-up.
- Window resize / different aspect ratios / HiDPI — the "crosshair → world" mapping stays accurate.
- Round ends while a shot/animation is in flight — correct score-finalization timing.
- Cursor leaves the canvas / right-click context menu — crosshair state and pointer capture.

## 10. Risks
- **[Top, devil's advocate #1] The 2.5D layer is a rewrite, not a layer.** If the flat round stores demon positions as (x, y) and paths as 2D points, depth needs a `z` that drives scale, screen position, draw order and hit priority — none of which exists in the 2D build. Manifests as: the "second stage" balloons, the playable-2D momentum stalls for weeks. **Mitigation:** bake a depth/`z` field into the demon data model from stage 1 (locked-in pointer §13).
- **Motivation death at the 2.5D wall** (#2): a pet-project with no deadline — commits go quiet after "phase 1 complete". Mitigation: C's staging yields a finished demo already after phase 1.
- **Aim mismatch** (DPR / CSS-scale / pointer-lock, #6): "I clearly hit it and missed" — the most trust-destroying bug in a shooter.
- **Frame-rate coupling** (#7): movement/reload counted in frames → breaks at 144 Hz.
- **No lose/round-end condition** (#9): without stakes the score feels arbitrary — what ends a round must be defined.
- **"Dead" shotgun** (#4): without flash/recoil/sound, shooting feels like clicking a spreadsheet — the features are there, the "fun" is not.

## 11. RICE — Claude proposed
- **Reach (R)**: 15 — §3 Users: the author decided to publish the demo (≈10-20 players/quarter).
- **Impact (I)**: 2 — §2 + Executive (§8): directly delivers the SDLC learning + a finished playable artifact.
- **Confidence (C)**: 0.8 — §15: few TBDs; the main unknown (technology choice) is deferred to the architecture gate, and the "layer = rewrite" risk is known and manageable.
- **Effort (E)**: 4 person-weeks — the Effort signal M of Approach C (§7): phase 1 (flat playable) + phase 2 (sprite-scaling depth).
- **RICE = R × I × C / E = 15 × 2 × 0.8 / 4 = 6**
- **State**: confirmed

## 12. Feasibility — Claude proposed
- [☑] **Tech**: A client-side browser game with a 2D renderer and a game loop is standard, well-documented territory, low tech risk; the repo is greenfield (no adjacent features), but the problem class is forgiving.
- [☐] **Skills**: Basic gameplay (shooting, score, game loop) is within reach; pseudo-3D depth/atmosphere is new. ☐ is set deliberately: learning these techniques IS the project's learning goal, and C's staging isolates that gap in the second phase.
- [☑] **Time**: A few evenings/week, no deadline; at Effort ≈4 person-weeks time is generous. The real time risk is not the schedule but motivation (§10).
- **State**: confirmed

## 13. Recommendation
**Selected: Approach C — Layered 2.5D Shooting Gallery** — C is the only approach with a "+" from all three roles in the §8 matrix; the **C/Executive** cell ("hedges finishing, keeps valuable learning") captures the essence of the context: a pet-project with no deadline where the priority is a completed learning outcome. C hits the **competitive gap of §6** — raycasting demos give atmosphere without a gameplay loop, target shooters give a loop without Doom atmosphere, and C combines both in stages. At **RICE = 6 (§11)** and **Feasibility Tech ☑ / Time ☑ / Skills ☐ (§12)**, it is precisely C's staging that lets the Skills gap (pseudo-3D) be closed in the second phase without betting the whole project, and in the worst case degrade to a finished flat demo (Approach A) rather than to nothing. This best fits the confirmed answers: Doom atmosphere (away from flat A) + a fast playable demo (away from all-in B) + a beginner in depth rendering.

**Locked-in pointer**: from stage 1 the demon data model carries a depth/`z` field (driving scale, screen position, draw order and hit priority) so the sprite-scaling layer is additive, not a rewrite. Round-end/lose-condition is defined in the PRD. The specific rendering technology choice stays at the architecture gate.

## 14. Parked & rejected approaches
| # | Approach | Status | Reason | Revisit trigger |
|---|---|:---:|---|---|
| A | Flat 2D Carnival Shooting | parked | Weak Doom atmosphere, low learning ceiling | If time/motivation runs out — C degrades exactly into A as a safe fallback |
| B | Corridor Dread, Point-Blank Punch | parked | Risk of never reaching playable; all complexity up front | If C's phase 2 goes smoothly and appetite grows for a full pseudo-3D atmosphere |

## 15. Open questions
- [ ] What exactly ends a round and is there a lose condition (timer / all demons / a demon reaches the player)? — owner: Maksim, due: PRD stage
- [ ] Rendering technology (flat-2D approach vs pseudo-3D scaling) and its concrete implementation — owner: Maksim, due: architecture gate
- [ ] Source of demon sprites (license-clean assets vs own pixel art), given publishing — owner: Maksim, due: PRD stage
- [ ] How many demon types and their contribution to the score for the MVP round — owner: Maksim, due: PRD stage

## Related
- [CONTEXT.md](./CONTEXT.md) — domain glossary (demon, wave, spawn point, reload, score).
- Next stage: `sdlc:write-prd basic-shooting-range`.

## DoD self-check
- [x] 15 sections present
- [x] No anti-pattern terms (Postgres/Redis/etc.)
- [x] Length ≤ 5 pages (~2200 words)
- [x] Frontmatter status: Confirmed
- [x] RICE confirmed (state: confirmed)
- [x] Feasibility confirmed (state: confirmed)
- [x] Recommendation present with rationale citing 4 upstream sections (§6, §8, §11, §12)
