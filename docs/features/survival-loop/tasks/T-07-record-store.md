---
id: T-07
epic: survival-loop
project: doom-shooter
wave: 2
priority: P1
estimate: S
blocks: [T-10]
blocked_by: [T-01]
status: todo
context_budget: 4000
created: 2026-07-13
owner: Maksym Vakulenko
---

# T-07 — Fail-soft record store (`storage/records.ts`)

## Goal

ADR-0003 verbatim, the project's first persisted datum: new `src/storage/records.ts` — the **only** localStorage touchpoint in the codebase. Key `doom-shooter.v1` = `{ "endless": number, "survive60": number }`. Read **once at boot** (missing key ⇒ defaults `{ endless: 0, survive60: 0 }`; any read/parse error ⇒ defaults + session-only flag); compared in memory; written at run end only when the finished run's score **strictly** beats its own mode's record; every write error swallowed. Storage is injected (constructor/param), so unit tests use an in-memory stub with fault modes — never real `window.localStorage`. The migrations.md contract applies: the missing-key⇒defaults path is v1's "migration" and gets its own unit test.

Pure module + tests; wiring into the run-end flow is T-10.

## Linked artifacts

- [[../adr/0003-fail-soft-record-store-behind-versioned-localstorage-key.md]] — read-on-boot / write-on-end, fail-soft.
- [[../data-model.md]] §Storage & migrations (key, schema, owner module, fail-soft, cross-mode isolation).
- `.claude/rules/migrations.md` — localStorage contract (ACTIVE since this feature).
- [[../PRD.md]] AC-08 (beaten ⇒ update), AC-09 (per-mode isolation), AC-10 (fail-soft).
- [[../test-plan.md]] AC-08/09/10 unit rows; quota-exceeded edge.

## Acceptance criteria

**AC-T07-1 (beaten record, PRD AC-08)**
Given a stored record and a finished run strictly beating it for its mode
Then the store reports "new record", updates memory, and writes the full document under `doom-shooter.v1`.

**AC-T07-2 (cross-mode isolation, PRD AC-09)**
Given survive60 beaten but endless not (and vice versa)
Then only the finished mode's field updates; the other is byte-identical.

**AC-T07-3 (fail-soft, PRD AC-10)**
Given `getItem` throws / returns garbage JSON / wrong-shape JSON, or `setItem` throws (incl. quota)
Then no exception escapes the module, defaults + session-only flag apply on read errors, writes are swallowed, and in-session compares keep working.

**AC-T07-4 (v1 bootstrap "migration")**
Given no stored key
Then boot yields `{ endless: 0, survive60: 0 }` — its own unit test per the migrations.md one-test-per-version rule.

## Atomic checklist

- [ ] Step 1: `records.ts` — typed `RecordsV1`, injected storage, defensive parse (shape-validate, non-negative integers only).
- [ ] Step 2: API: `load()` (once at boot), `submit(mode, score) → { isNewRecord }`, `get(mode)`, session-only flag exposure.
- [ ] Step 3: unit tests — all fault modes via stub injection; equal-score ⇒ NOT a new record, no write.
- [ ] Step 4: no import of this module anywhere in `systems/*`/`core/*` (lint/review check — the simulation never touches storage).

## Edge cases

| Case | Expected |
|---|---|
| Stored value is valid JSON but wrong shape (`{ endless: "9e9" }`, negatives, extras) | treated as corrupt ⇒ defaults + session-only |
| Score equal to stored best | not a new record (strictly greater), no write |
| Record beaten twice in one session | second submit compares against the updated in-memory value |

## DoD

- AC-08/09/10 unit rows + v1 bootstrap test green; fault-injection suite complete; zero storage imports outside `storage/`.
