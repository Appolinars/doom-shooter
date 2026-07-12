---
status: Confirmed
owner: "Maksym Vakulenko"
reviewers: []
updated_at: "2026-07-12"
feature_size:                    # set by sdlc:classify-size, not here
stage: "01"
ticket: "N/A (personal pet-project)"
value_score:
  rice: 1.4
  state: confirmed
  confirmed_at: "2026-07-12"
feasibility_state: confirmed
---

<!-- Stage 01 → see SDLC/plugin/skills/interview/SKILL.md -->

# Idea Brief — survival-loop

## 1. Raw idea

> Turn the shooting gallery into a survival arcade: the player gets HP — a demon that reaches the end of its path hits the player, and at zero HP the round ends with a game over. Instead of the fixed schedule — endless escalating waves; the score gets depth from a combo multiplier and a far-kill bonus, and the best result is saved between sessions. Plus new threats: a shooting demon (with a shoot-downable projectile) and zigzag paths.

*(Author's formulation, captured 2026-07-12; confirmed verbatim in Russian, translated here.)* During the Socratic pass the author added a second selectable mode: **Endless** (escalating waves until death) or **Survive 60 seconds** of heavy waves, chosen on a start screen; retry restarts the same mode.

## 2. Problem

The game is mechanically complete and feels good (game-feel shipped 2026-07-12), but there is nothing to lose and nothing to aim for: an escaped demon is only a statistic, the score disappears on page reload, and the single scripted 60-second round plays identically every time. Author's "excitement / want to replay" self-rating: ~2/5. The single biggest remaining gap between "polished tech demo" and "actual game".

## 3. Users

- **Author-as-player** (primary): wants a run he voluntarily replays on an evening whim.
- **Demo guests** (secondary, ~10-20/quarter after publishing): click a portfolio link, play 1-3 rounds with zero onboarding, should feel the "one more try" pull.
- **Author-as-learner**: needs the first M-sized feature to exercise the full SDLC pipeline (staged delivery, full architecture pass).

## 4. Why now

game-feel just closed (all 13 tasks merged, QG green) — mechanics and juice are a stable base for stakes. Publishing was deliberately deferred until after this feature (author decision, 2026-07-12): no publishing a game with no stakes. The "no lose condition" debt, parked twice since the base feature, lands here.

## 5. Out of scope

- New weapons or weapon switching — parked to backlog (ideation decision).
- Server-side or shared leaderboards — personal best only, in the player's own browser.
- Meta-progression, unlocks, currencies, between-run upgrades.
- Difficulty settings beyond one forgiving default.
- Player movement, map traversal, level geometry (unchanged base non-goals).
- Checkpoint "floors" every N waves — parked (§14).
- Persisting anything beyond the best result (no settings, no run history).

## 6. Competitive analysis

| # | Product · URL | Features | Value (1-5) | Gap vs us |
|---|---|---|---|---|
| 1 | Devil Daggers · en.wikipedia.org/wiki/Devil_Daggers | One-life survival, escalating spawns, personal-best as the whole game, leaderboard + replays | Survival loop 5 · score meta 5 | Proves one-life + personal-best is the genre's retention engine; we have neither. |
| 2 | The House of the Dead · en.wikipedia.org/wiki/The_House_of_the_Dead_(video_game) | Rail shooter; torches = player health, enemy hit removes one, continue screen | Player-HP readability 5 | The canonical "stationary shooter with HP" pattern we adopt; but level-scripted, no endless, no persistence. |
| 3 | Doom Eternal Horde Mode · gamespot.com guide | Wave score-attack in a Doom skin: decaying score multiplier, rank targets | Combo/score depth 4 | Combo-under-time-pressure proven in the exact fantasy we mimic; ours must stay readable without a tutorial. |
| 4 | itch.io wave-shooter field · itch.io/games/tag-wave-shooter | Hundreds of browser wave/endless shooters with high-score hooks | Baseline expectations 3 | Waves+HP+record is the expected genre baseline on our publish platform — its absence reads as "unfinished". |

Footnotes: rows 1-4 researched 2026-07-12 via WebSearch queries "Devil Daggers survival high score mechanics one life leaderboard", "House of the Dead rail shooter player health enemies reach player lose life mechanics", "Doom-style wave survival browser game combo multiplier score", "browser shooting gallery game endless waves survival high score itch.io".

## 7. Strategic approaches

### Approach A — Survive or Die Arcade
- **Thesis**: the fastest path from tech demo to "one more run" is a single ruthless loop — health, waves, death, score, retry.
- **For whom**: author-as-player; guests benefit because the loop explains itself in seconds.
- **Outcome metric**: "want to replay" 2/5 → 4/5, sanity-checked by 3+ natural retries/session.
- **Key trade-off**: tension without variety — no second mode, no combo, no new threats; flat score.
- **Effort signal**: S
- **Recommended?** ◯

### Approach B — Last Pump Standing
- **Thesis**: make the pump the star — combo grows only on on-tempo pumps, and shooting a fireball deflects it back through the crowd; each run a shareable stunt.
- **For whom**: demo guests (spectacle legible in 90 seconds).
- **Outcome metric**: same 2/5 → ≥4/5, proxied by a guest voluntarily retrying twice.
- **Key trade-off**: depth of one signature mechanic over breadth; rhythm window and deflection are unbounded tuning surfaces.
- **Effort signal**: M
- **Recommended?** ◯

### Approach C — Survival Loop, Staged Ascent
- **Thesis**: ship the full confirmed vision in three stages — (1) core loop, (2) the reason to retry (combo, rank, records, both modes), (3) the spice (new threats) — replayable after stage 1, risky tuning last.
- **For whom**: author-as-player first; demo guests once the start screen and rank card make it self-explanatory.
- **Outcome metric**: same 2/5 → ≥4/5, checked at the end of each stage.
- **Key trade-off**: longer calendar than the lean MVP for never cutting confirmed scope; if energy runs out mid-way, a complete arcade game already exists.
- **Effort signal**: M
- **Recommended?** ●

## 8. Multi-perspective feedback

### Engineer
- Player HP + game over = first true terminal state transition; small change, wide test-fixture blast radius ("round always runs 60s" assumptions).
- Wave generator must escalate deterministically (derived, not wall-clock) or replay-style tests break; persisted record = first data surviving a session (versioned contract, corrupt/missing fail-soft).
- B's rhythm combo couples scoring to input timing — determinism trap + the largest tuning surface of any option; deflection adds a projectile changing ownership mid-flight (new collision matrix).
- C's stage boundaries match dependency order (state core → scoring/persistence → new entities); each stage green-and-shippable fits the existing test discipline, at the cost of three QG passes.

### Executive
- Biggest risk for a solo pet project is never shipping; biggest upside is a demo a visitor plays twice.
- Stakes (HP + record) deliver ~80% of replay value; combo/rank/new demons are polish on top of stakes.
- B pays M-effort for uncertain marginal excitement; "needs tuning to feel good" is where no-deadline features go to die.
- C's stage 1 *is* approach A: a publishable demo exists early even if stages 2-3 stall, and the full SDLC learning value of an M feature is preserved — provided a publish-eligible checkpoint after stage 1 stays a hard commitment.

### UX-researcher
- HP + game over is the most universally readable mechanic in games — zero tutorial, provided the HP indicator is visible pre-hit and the hit has strong screen feedback (a stationary player can't otherwise tell they were "reached").
- First-death timing is the single most important tuning variable: escalation tuned for the author kills guests at 30-40s feeling cheated.
- B's rhythm combo is invisible without dedicated UI and punishes trackpad/latency/motor variance — not learnable in 1-3 guest rounds; deflection is discoverable only by accident.
- Kill-streak combo is pre-learned by every arcade player; letter rank gives round two a qualitative goal ("get an A") that flat scoring cannot.
- Two-mode start screen adds one funnel decision (mitigate: default-highlighted mode, one-line descriptions); steal B's callouts and best-moment line — they teach hidden systems post-hoc.

### Synthesis matrix

|         | Engineer | Executive | UX |
|---------|:--------:|:---------:|:--:|
| App. A  | + smallest state surface, cleanly testable | + ships stakes fastest, extras optional later | + instantly readable, lowest friction funnel |
| App. B  | − two coupled novel mechanics, unbounded tuning | − high ceiling, all-or-nothing tuning risk | − depth invisible or punishing in ninety seconds |
| App. C  | + dependency-ordered, each stage independently shippable | + A's safety plus M-sized learning value | + right scope, learnable in shipped order |

## 9. Trade-offs and edge cases

### Trade-offs per approach
| Approach | Pros | Cons |
|---|---|---|
| A | Fastest to stakes; smallest blast radius; safest vs motivation decay | Flat score caps round-3 motivation; mode seam unproven; weakest learning artifact |
| B | Most memorable demo; strongest differentiation | Signature mechanics fail the 90-second guest; monolithic, no mid-point; largest tuning surface |
| C | Full scope, early shippable value; risky content last, cheaply cuttable | Longest calendar; three QG passes; honest M only with cut-line discipline |

### Edge cases
- A kill and a player-hit on the same tick — the final kill must count before game over freezes (mirrors the base same-tick rule).
- Record storage unavailable (private browsing, embedded page) or corrupt — degrade to session-only record, never break the game-over screen.
- Record semantics across two modes — a 60s score "beating" an endless score fires "NEW RECORD!" wrongly.
- Retry pressed while a death animation or the player-death sequence is still playing.
- Long endless runs: entity counts, spawn density, score magnitude must stay bounded.
- Combo-break definition (escaped demon / missed shot / taken hit) — each choice changes optimal play.
- Fireball overlapping a demon under the crosshair — front-most rule now has two entity kinds.
- Pause and tab-unfocus on the new screens (start, mode select, game over).

## 10. Risks

- **Top attack vector (devil's advocate): endless-mode balance is an unbounded design problem disguised as one bullet point.** The shotgun has a hard damage ceiling; the wave curve either crosses it (same-wave death wall, feels cheated) or never does (boring attrition). Tuning "death feels earned" is where solo evening projects die. **Mitigation (locked): staged delivery + an explicit kill criterion — if the endless curve isn't fun within a fixed tuning budget, Survive-60s becomes the primary mode and endless is parked.**
- Unavoidable damage feels cheap: a stationary player mid-pump cannot answer a fireball — it needs a telegraph and an always-shootable window, or deaths read as unfair.
- "NEW RECORD!" firing across modes (§9) — a celebration that reads as broken is worse in a portfolio than none.
- Performance in late waves on average laptops: frame budget was validated only at fixed-round densities.
- Scope drift M → L: six sub-systems in one slug; the §13 stage discipline is the containment.
- The core verb stays "click demon" — if stakes alone don't move the excitement rating, longer exposure won't; the stage-1 self-check catches this early.

## 11. RICE — Claude proposed

- **Reach (R)**: 2 — same audience as game-feel: author + ~10-20 demo players/quarter (§3).
- **Impact (I)**: 3 — closes the core "not a game yet" gap; stakes carry ~80% of replay value (§2, §8 Executive).
- **Confidence (C)**: 0.7 — three open tuning unknowns (wave curve, fireball fairness, rank thresholds) + first persisted data (§15); below game-feel's 0.8.
- **Effort (E)**: 3 person-weeks — low end of M for the full staged scope (§7 signals: S/M/M).
- **RICE = 2 × 3 × 0.7 / 3 = 1.4**
- **State**: confirmed (2026-07-12)

## 12. Feasibility — Claude proposed

- [☑] **Tech**: every piece extends a shipped pattern — wave generator extends the spawn-cursor; projectile is a new entity kind beside demons/shots; start screen reuses the retry/resume button pattern; the browser-record storage contract is pre-committed in the project storage rules (reopen trigger #1).
- [☑] **Skills**: two features shipped end-to-end with the same loop/test/asset discipline (195 unit + 8 E2E incl. determinism proofs); the only new class of work — balance tuning — is priced into C=0.7.
- [☑] **Time**: game-feel (S, 13 tasks) shipped in ~1 week of evenings; M ≈ 3-5 weeks at the same pace, no deadline.
- **State**: confirmed (2026-07-12)

## 13. Recommendation

**Selected: Approach C — Survival Loop, Staged Ascent.** RICE 1.4 (§11) is honest only if the confirmed scope actually ships, and C keeps full scope while capping the top risk (§10, "tuning is where solo features die"): every stage ends shippable and the highest-tuning-risk content lands last, cheapest to cut. Feasibility is 3/3 confirmed (§12), so the M bet is grounded. The synthesis matrix (§8) gives C a clean +/+/+ — the Engineer cell "dependency-ordered, each stage independently shippable" is exactly the containment the risk register asks for. Competitively, Devil Daggers (§6) proves the one-life + personal-best loop is the genre's retention engine — the one thing our game entirely lacks and stage 1 delivers.

**Locked-in pointer** (commitments for write-prd):
1. Staged delivery: stage 1 = player HP + game over + endless waves + retry; stage 2 = combo + far-kill bonus + stats/rank + persisted records + start screen with both modes; stage 3 = fireball demon + zigzag paths. Each stage ends green and playable.
2. Combo is a standard kill-streak multiplier — NOT rhythm/timing-gated (B's variant rejected by all three perspectives).
3. Steal from B into stage 2: on-screen callouts ("SNIPED!") and a "best moment" line on the end screen — they teach hidden scoring without a tutorial.
4. Records are per-mode; storage follows the pre-committed versioned browser-storage contract, fail-soft when unavailable.
5. Endless balance carries an explicit kill criterion (fixed tuning-evening budget, fallback = Survive-60s becomes primary mode).
6. Retry restarts the same mode in one click; mode choice lives on the start screen (which also absorbs the first-gesture audio arming).

## 14. Parked & rejected approaches

| # | Approach | Status | Reason | Revisit trigger |
|---|---|:---:|---|---|
| A | Survive or Die Arcade | parked | Subsumed as C's stage 1; standalone A forfeits confirmed scope | Stage 1 stalls or appetite shrinks — fall back to shipping stage 1 as the feature |
| B | Last Pump Standing | rejected (partially absorbed) | −/−/− matrix: rhythm combo and deflection unreadable for 90-second guests, unbounded tuning; callouts + best-moment line stolen into C stage 2 | Post-publish experiment if guests demonstrably master the base loop |
| - | New weapons / weapon switching | parked | Ideation decision — expensive in assets + balance, orthogonal to stakes | After survival-loop ships, if replay metric holds but variety demand appears |
| - | Checkpoint "floors" every N waves | parked | Extra UI + pacing complexity; endless + 60s modes cover session shapes | If endless sessions prove too long to feel restartable |

## 15. Open questions

- [ ] Player HP count and hit-feedback strength — owner: Maksym, due: write-prd.
- [ ] Fireball counterplay contract (telegraph, always-shootable window, damage) — owner: Maksym, due: architecture gate.
- [ ] Escalation curve shape + concrete kill-criterion budget — owner: Maksym, due: write-prd.
- [ ] Combo-break rule (escaped demon / missed shot / taken hit) and far-kill threshold — owner: Maksym, due: write-prd.
- [ ] Rank thresholds (D-S): fixed table vs derived from personal history — owner: Maksym, due: architecture gate.
- [ ] Survive-60s wave source: retired fixed schedule or generator at high intensity — owner: Maksym, due: architecture gate.

## Related

- [CONTEXT.md](./CONTEXT.md) — new domain glossary (mode, player HP, game over, run, combo, rank, record, fireball, start screen).
- Base features: [basic-shooting-range](../basic-shooting-range/) (PRD, sad.md, CONTEXT.md — round/miss/score invariants this feature amends), [game-feel](../game-feel/) (juice layer, retry, pause).
- Storage rules: `.claude/rules/migrations.md` (reopen trigger #1 activates for the persisted record).
- Next stage: `sdlc:write-prd survival-loop`.

## DoD self-check

- [x] 15 sections present
- [x] No anti-pattern terms (checked: no DB/library names, no p99, no schema/API details in body)
- [x] Length ≤ 5 pages (~2200 words)
- [x] Frontmatter status: Confirmed
- [x] RICE confirmed (state: confirmed)
- [x] Feasibility confirmed (state: confirmed)
- [x] Recommendation cites §6 (Devil Daggers gap) + §8 (Engineer cell) + §11 (RICE 1.4) + §12 (Feasibility 3/3)
