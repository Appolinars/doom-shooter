---
status: Draft
owner: "Maksym Vakulenko"
updated_at: "2026-07-13"
stage: "13"
---

# Tracker — survival-loop

Runner state for the stage-13 breakdown. One row per task; update `Status` as each PR lands.
Statuses: `todo` → `in_progress` → `in_review` → `done` (or `blocked`).

| ID | Title | Wave | Estimate | Deps | Status | PR |
|----|-------|------|----------|------|--------|----|
| [T-01](./T-01-run-state-model.md) | Run state model + config scaffold | 1 | S | — | todo | |
| [T-02](./T-02-damage-and-game-over.md) | Damage system + game-over end-condition | 1 | S | T-01 | todo | |
| [T-03](./T-03-wave-generator.md) | Parametric wave generator + entity cap | 1 | M | T-02 | todo | |
| [T-04](./T-04-stage1-presentation.md) | Stage-1 presentation + retry | 1 | M | T-02, T-03 | todo | |
| [T-05](./T-05-combo-and-score.md) | Combo multiplier + multiplied score + far-kill | 2 | M | T-02 | todo | |
| [T-06](./T-06-rank-and-stats.md) | RunStats accumulation + rank | 2 | S | T-05 | todo | |
| [T-07](./T-07-record-store.md) | Fail-soft record store | 2 | S | T-01 | todo | |
| [T-08](./T-08-survive60-mode.md) | Survive-60s mode end-condition | 2 | S | T-02 | todo | |
| [T-09](./T-09-start-screen.md) | Start screen: mode select + gating + audio arm | 2 | M | T-08 | todo | |
| [T-10](./T-10-end-screens.md) | End screens + record celebration + callouts | 2 | M | T-04, T-06, T-07, T-09 | todo | |
| [T-11](./T-11-e2e-repair.md) | E2E repair + extension (`?e2e` API) | 2 | M | T-09, T-10 | todo | |
| [T-12](./T-12-fireball-system.md) | Fireball entity + shooter demon attack | 3 | M | T-03 | todo | |
| [T-13](./T-13-cross-kind-hit.md) | Cross-kind hit resolution + shoot-down | 3 | S | T-12 | todo | |
| [T-14](./T-14-zigzag-and-assets.md) | Zigzag paths + stage-3 assets + render | 3 | M | T-13 | todo | |
| [T-15](./T-15-tuning-timebox.md) | Tuning timebox + kill-criterion checkpoint | 4 | M (timebox) | T-11, T-14 | todo | |
| [T-16](./T-16-final-qg.md) | Final QG: NFR numbers + AC walkthrough | 4 | M | T-15 | todo | |

**Critical path:** T-01 → T-02 → T-03 → T-04 → T-10 → T-11 → T-15 → T-16.
Waves 1/2/3 = PRD delivery stages 1/2/3 — each wave ends green and playable. Wave 3 is
P2/cuttable (PRD §2); it can interleave with wave 2 any time after T-03.

## DoR / DoD (epic-level)

- **DoR (per task):** upstream artifacts Accepted (PRD + SAD + linked ADR + data-model); deps `done`.
- **DoD (per task):** PR ≤ 500 LOC; unit + E2E suites green (base-invariant test amendments deliberate, named in the PR); no fixed-step mutation outside the systems tasks (T-01/02/03/05/06/08/12/13); no localStorage touch outside T-07; no wall-clock reads in `src/systems/*` / `src/core/*`; story checklist complete.
