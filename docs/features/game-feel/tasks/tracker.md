---
status: Draft
owner: "Maksym Vakulenko"
updated_at: "2026-07-06"
stage: "13"
---

# Tracker — game-feel

Runner state for the stage-13 breakdown. One row per task; update `Status` as each PR lands.
Statuses: `todo` → `in_progress` → `in_review` → `done` (or `blocked`).

| ID | Title | Wave | Estimate | Deps | Status | PR |
|----|-------|------|----------|------|--------|----|
| [T-01](./T-01-demon-hp-model.md) | Demon HP model | 1 | S | — | done | local merge |
| [T-02](./T-02-hit-damage.md) | HP damage inline in hit path | 1 | S | T-01 | done | local merge |
| [T-03](./T-03-pump-gate.md) | Pump gate (fixed-step weapon state) | 1 | S | — | done | local merge |
| [T-04](./T-04-web-audio-graph.md) | Web Audio graph, arm-on-gesture | 2 | M | — | done | local merge |
| [T-05](./T-05-sfx-load-play.md) | SFX load/decode + play, fail-soft | 2 | S | T-04 | todo | — |
| [T-06](./T-06-effects-store.md) | Render-side effects store | 3 | M | — | todo | — |
| [T-07](./T-07-sprite-backdrop-assets.md) | Sprite / backdrop / demon-art assets | 3 | S | — | todo | — |
| [T-08](./T-08-renderer-passes.md) | Renderer passes | 3 | M | T-01, T-03, T-06, T-07 | todo | — |
| [T-09](./T-09-wiring-and-retry.md) | Wiring in main.ts + retry | 4 | M | T-02, T-05, T-08 | todo | — |
| [T-10](./T-10-nfr-ac-e2e.md) | NFR + AC walkthrough / E2E | 4 | M | T-09 | todo | — |

**Critical path:** T-01 → T-02 → T-09 → T-10 (and T-07 → T-08 → T-09 → T-10).

## DoR / DoD (epic-level)

- **DoR (per task):** upstream artifacts Accepted (PRD + SAD + linked ADR); deps `done`; product open questions in PRD §8 resolved for the tasks that name them (T-07).
- **DoD (per task):** PR ≤ 500 LOC, tests green, no new fixed-step mutation outside T-01/T-02/T-03, story checklist complete.
