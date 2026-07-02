---
id: T-10
epic: basic-shooting-range
project: doom-shooter
wave: 4
priority: P2
estimate: S
blocks: [T-11]
blocked_by: [T-01]
status: todo
context_budget: 4500
created: 2026-07-02
owner: Maksim Vakulenko
---

# T-10 — Sprites & asset pipeline (closes SAD §11 open question)

## Goal

`src/assets/sprites.ts` + the actual art: license-clean sprites for the 2 demon types (+ crosshair/HUD art if needed), a loader with a ready-signal, `spriteKey` mapping, and a fail-soft fallback to placeholder shapes.

**DoR (blocking):** the SAD §11 open question "asset/sprite source + sizing" must be decided first (default per PRD §8: own pixel art). Record the decision by resolving the §11 row.

## Linked artifacts

- [[../sad.md]] §11 — the open question this task resolves (owner Maksim, due before implementation); §2 Regulatory — license-clean assets only; §8 — fail-soft error handling.
- [[../PRD.md]] §6.1 — asset-licensing abuse case; §6 NFR — initial load ≤ 3 s (assets inside the ~2–3 MB §7 budget).
- [[../data-model.md]] `DemonType.spriteKey` — **data delta: none on runtime state; populates the static config's `spriteKey` values.**

## Acceptance criteria

**AC-T10-1 (license + budget)**
Given the built bundle
When assets are audited
Then every sprite is license-clean (documented source/license note in the repo) and bundle + assets stay ≤ ~2–3 MB.

**AC-T10-2 (fail-soft)**
Given a sprite fails to load
When the game starts
Then it runs with placeholder shapes instead of crashing (SAD §8 fail-soft), logging the failure.

## Atomic checklist

- [ ] Step 1: decide + record the sprite source (resolve SAD §11 OQ row); produce/collect 2 demon sprites.
- [ ] Step 2: loader — image loading with a ready promise, keyed by `spriteKey`.
- [ ] Step 3: fail-soft fallback path + license note (`assets/LICENSES.md` or README section).
- [ ] Step 4: renderer integration — swap placeholder shapes for sprites behind the loader's ready state.

## Edge cases

| Case | Expected |
|---|---|
| Slow host: sprites arrive after round start | frames render placeholders until ready, then swap without restart |
| Missing `spriteKey` in config | boot-time validation error, not a mid-round crash |

## DoD

- SAD §11 OQ row resolved; license note committed; load-time check keeps the ≤ 3 s NFR.
