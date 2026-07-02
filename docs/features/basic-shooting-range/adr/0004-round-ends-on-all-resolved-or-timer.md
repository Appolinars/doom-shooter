---
status: Accepted
owner: "Maksim Vakulenko"
reviewers: ["Tech Lead"]
updated_at: "2026-07-02"
feature_size: M
stage: "04-05"
ticket: "N/A (personal pet-project)"
---

# 0004 — End a round on all-resolved OR timer, with no hard game-over

- **Status:** Accepted
- **Date:** 2026-07-02
- **Deciders:** Maksim Vakulenko (Architect + author)

## Context

SAD §3 makes the round a self-contained client loop with no server and ephemeral state. PRD §8 open question #1 left the exact round end and any lose condition to the architecture gate. The question: what ends a round, and is there a hard game-over in MVP?

## Decision drivers

- §2 constraint — no server; round state is ephemeral, the round is a single client loop.
- PRD US-04 / AC-04 — the round must end and show a final total score.
- PRD US-06 / AC-05 — a demon that escapes un-killed counts as a miss.
- §2 organisational constraint — solo dev, ≤ 2-evening playable target.

## Considered options

1. **All-resolved OR timer, no game-over** — round ends when every wave demon is killed or has escaped, or a fixed timer expires; escape = miss.
2. **Timer-only** — round runs a fixed duration regardless of demons resolved.
3. **Lose-on-reach** — a demon completing its path triggers a hard game-over.

## Decision outcome

**Chosen:** Option 1. It satisfies AC-04 (a definite end + final score) and AC-05 (escape = miss) with the least mechanism, and keeps the MVP a low-stakes scoreable demo consistent with the ≤ 2-evening budget. A hard lose condition (Option 3) is deferred — it only becomes meaningful once the depth layer makes "a demon reaches you" spatially legible (tracked in SAD §11 as an open question).

## Consequences

**Positive**
- Deterministic, testable end condition covering both the timed and the cleared-wave case.
- Escape-as-miss gives the round stakes without a game-over screen.

**Negative**
- No fail state may make the MVP round feel low-tension until the depth layer lands.

**Neutral**
- The round controller can gain a lose-condition branch later without changing the score or spawn contracts.

## Links

- PRD: [[../PRD.md]] — US-04 / AC-04 (round result), US-06 / AC-05 (miss), §8 OQ #1
- SAD: [[../sad.md]] §4 (strategic pillar 4), §6 (runtime view), §11 (deferred lose-condition)
- Related ADR: —
