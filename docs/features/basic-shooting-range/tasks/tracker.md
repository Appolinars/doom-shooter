# Tracker — basic-shooting-range (stage 13)

> Flat runner state. Pick the first `todo` story whose `blocked_by` are all `done`.
> Story files: `T-XX-*.md` in this folder. Narrative: [_epic.md](./_epic.md).

| ID | Wave | Story | Status | Blocked by |
|----|------|-------|--------|------------|
| T-01 | 1 | [Project scaffold](./T-01-project-scaffold.md) | done | — |
| T-02 | 1 | [GameState & static config](./T-02-game-state-and-config.md) | done | — |
| T-03 | 2 | [Fixed-timestep loop](./T-03-fixed-timestep-loop.md) | done | T-01, T-02 |
| T-04 | 2 | [Pointer input](./T-04-pointer-input.md) | done | T-01, T-02 |
| T-05 | 3 | [Spawn system](./T-05-spawn-system.md) | done | T-02, T-03 |
| T-06 | 3 | [Weapon system](./T-06-weapon-system.md) | todo | T-02, T-03 |
| T-07 | 3 | [Hit-test & score](./T-07-hit-test-and-score.md) | todo | T-06 |
| T-08 | 3 | [Round system](./T-08-round-system.md) | todo | T-05, T-07 |
| T-09 | 4 | [Renderer](./T-09-renderer.md) | todo | T-01, T-02 |
| T-10 | 4 | [Sprites & assets](./T-10-sprites-and-assets.md) | todo | T-01 (+ §11 OQ resolved) |
| T-11 | 5 | [Wiring & E2E](./T-11-wiring-and-e2e.md) | todo | T-04, T-08, T-09, T-10 |

Status values: `todo` → `in_progress` → `done` (update the row when a story's PR merges).
