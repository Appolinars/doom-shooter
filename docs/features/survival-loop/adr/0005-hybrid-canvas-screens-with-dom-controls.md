---
status: Accepted
owner: "Maksym Vakulenko"
reviewers: ["Tech Lead"]
updated_at: "2026-07-12"
feature_size: M
stage: "04-05"
ticket: "N/A (personal pet-project)"
---

# 0005 — Build start/end screens as canvas visuals with DOM controls

- **Status:** Accepted
- **Date:** 2026-07-12
- **Deciders:** Maksym Vakulenko (Architect) + Claude (Socratic walk)

## Context

survival-loop adds a start screen with mode selection (US-09) and richer end screens (game over / win with score, stats, rank, record celebration). The shipped game already renders the round-result overlay on canvas while `main.ts` toggles DOM buttons (retry, resume) by status. The question is whether the new screens follow that hybrid or move to full DOM overlays.

## Decision drivers

- AC-11: the first click picks a mode AND arms audio — a real DOM gesture is the reliable arming surface.
- AC-12: gameplay input is gated on run state — screens must not leak clicks into the play area.
- §2 Conventions: no runtime framework; existing hybrid pattern is proven and test-covered.

## Considered options

1. **Hybrid per existing convention** — the canvas renderer draws screen visuals off `run.status`; interactive controls (mode buttons, retry) are DOM elements toggled by status in `main.ts`.
2. **Full DOM overlays** — screens as HTML/CSS layered over the canvas.

## Decision outcome

**Chosen:** Option 1. Zero new patterns: the renderer already branches on status for the round-result and pause overlays, and DOM buttons already arm audio and drive retry. Option 2 buys easier typography at the cost of a second visual world and synchronization between DOM layout and the render cycle — rejected as a convention break with no NFR behind it.

## Consequences

**Positive**
- Mode buttons are ordinary DOM: the first click naturally satisfies the autoplay-policy arming (AC-11).
- Input gating stays where it is today: pointer input only mutates state when `status === 'running'` (AC-12).

**Negative**
- Button visibility state lives in the `main.ts` observer rather than the renderer — two places express one screen.

**Neutral**
- New screen art (backdrop, rank glyphs) enters via the existing asset manifest pipeline.

## Links

- PRD: [[../PRD.md]] US-04, US-07, US-09; AC-04, AC-07, AC-11, AC-12
- SAD: [[../sad.md]] §4 pillar 5
- Related ADR: [[0001-extend-round-into-mode-aware-run-state]]
