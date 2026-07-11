---
status: Accepted
owner: "Maksym Vakulenko"
reviewers: ["Tech Lead"]
updated_at: "2026-07-05"
feature_size: S
stage: "04-05"
ticket: "N/A (personal pet-project)"
---

# 0002 — Gate fire rate with a fixed-step pump state on the weapon

- **Status:** Accepted
- **Date:** 2026-07-05
- **Deciders:** Maksym Vakulenko (author), during the architecture-design Socratic walk

> **Amendment 2026-07-11:** the magazine-**reload** mechanic was removed from the game (unlimited ammo — PRD §1 amendment). The core decision here (pump timer on the fixed step, blocks fire, sprite render-side) is **unchanged and still Accepted**; it is now the weapon's *only* gate. The "mirrors the reload gate" framing and the `'reloading'`/shell/empty-magazine references below are **historical** — read `'ready' ↔ 'pumping'` as the shipped two-state machine.

## Context

PRD US-02/AC-02 makes the between-shots pump (передергивание затвора) briefly gate the next shot. Unlike every other effect in this feature, the pump is **not** presentation-only — a fire attempt during the pump must be blocked and consume no shell, mirroring the existing reload gate (base AC-02). A gameplay gate must be deterministic, so its timer cannot live on the render layer or on a wall-clock timestamp (base ADR-0002: fixed step, never wall-clock).

## Decision drivers

- Determinism: the gate must live on the fixed step so drift ≤ 1% and the base tests stay green (base ADR-0002).
- Consistency: reuse the proven reload-gate shape in `weapon.ts` (block fire, consume no shell).
- Size **S**: minimal new state, no new system.
- The pump *sprite* is pure juice and must stay render-side.

## Considered options

1. **`pumping` added to `WeaponStatus` + `pumpRemainingMs`** — the weapon status enum gains `'pumping'`; `stepWeapon` decrements `pumpRemainingMs` on the fixed step (like `advanceReload`) and blocks fire while pumping, exactly as it already blocks while `reloading`. Sprite is render-side, keyed off status.
2. **Separate `pumpUntilMs` field, status untouched** — a parallel timer field so pump could overlap other states; the fire gate checks two flags instead of one status.
3. **Render-side cooldown only (no gate)** — pump as pure animation, no fire blocking — rejected: contradicts the author-confirmed gameplay change (PRD §1, N8).

## Decision outcome

**Chosen:** Option 1. The weapon already models mutually-exclusive readiness as a single `status` (`ready`/`reloading`); `pumping` is the same kind of state and slots into the existing gate branch with one enum value and one countdown field. Option 2's parallel flag invites `pumping`+`reloading` ambiguity and a two-flag gate for no benefit at this scope; Option 3 doesn't meet the requirement.

## Consequences

**Positive**
- Fire gate stays a single `status` check; the renderer reads `status` to pick idle/firing/pump/reload frames with no new signal.
- Timer advances on the fixed step next to reload → determinism and base drift/aim tests unaffected.
- `PUMP_DURATION_MS` (≈ 350 ms) is one tuning constant in `config.ts`.

**Negative**
- `WeaponStatus` and the `stepWeapon` gate/branch gain a state → weapon unit tests must cover the pump-blocks-fire path and the pump→ready transition.
- Firing now always transitions `ready → pumping → ready`, so the "spend last shell → reload" edge must order correctly against the pump (reload wins when the magazine empties).

**Neutral**
- If the pump should ever be cancellable or overlap reload, the enum can grow; not needed now.

## Links

- PRD: [[../PRD.md]] US-02 / AC-02
- SAD: [[../sad.md]] §4, §6 (Critical flow 1)
- Related ADR: base `basic-shooting-range` ADR-0002 (fixed-step loop) — this decision extends it
