# Sequence coverage audit — survival-loop (stage 06)

Date: 2026-07-13. Input: PRD §4 (12 user stories), SAD §6 (4 critical flows).

## Coverage before

| US | Title | Status | Notes |
|---|---|---|---|
| US-01 | Take hits from breakthrough demons | Covered | Critical flow 1 (AC-01) |
| US-02 | Reach game over at zero HP | Covered | Critical flow 2 (AC-02b ordering) |
| US-03 | Fight endless escalating waves | Missing | — |
| US-04 | Retry the same mode instantly | Trivial | status transition, ADR-0001/0005 prose |
| US-05 | Build a kill-streak combo | Missing | — |
| US-06 | Earn far-kill bonuses | Missing | mentioned in flow 2 only in passing |
| US-07 | See my run graded | Covered | Critical flow 3 |
| US-08 | Beat my personal record | Covered | Critical flow 3 (AC-08/10 fail-soft) |
| US-09 | Pick a mode on the start screen | Trivial | status transition, ADR-0001/0005 prose; AC-12 gating stays prose |
| US-10 | Win by surviving 60 seconds | Missing | — |
| US-11 | Shoot down fireballs | Covered | Critical flow 4 (AC-14) |
| US-12 | Face zigzag demons | Missing | AC-15 cross-kind depth resolution |

## Added (all user-confirmed `ok` first pass)

- **US-03** — wave N → N+1 escalation with entity-cap clamp branch (ADR-0002).
- **US-05** — combo growth + break reset; score-non-decreasing invariant as a Note.
- **US-06** — far-kill bonus on top of multiplied points, "SNIPED!" callout via wiring diff.
- **US-10** — 60s timer → won with same-moment final kill ordered before the freeze (AC-02b symmetry); game-over alt.
- **US-12** — zigzag path + single-hit resolution to front-most by z across demons + fireballs (ADR-0004).

## Skipped (trivial, user declined promotion)

- US-04 retry, US-09 mode pick — SAD §6 intro documents both as deliberate prose-only (ADR-0001/0005).

## New actors flagged

None — all participants exist in §5 Container view.

## ADR potential

None new — every decision the flows touch is already captured (ADR-0001 run states, ADR-0002 entity cap, ADR-0003 record store, ADR-0004 cross-kind hit, ADR-0005 screen buttons).

## Validation debt

`mmdc --parse-only` not run — mermaid-cli is not installed and the user declined adding it (Chromium-sized devDep). Diagrams reuse the exact syntax subset (participant / alt / opt / Note) of the four existing flows.

## DoD self-check

12/12 US accounted for: 5 previously covered, 5 added this pass, 2 explicitly trivial. All flows sync (client-only game — no async patterns apply).
