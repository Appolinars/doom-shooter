# Storage & migration rules — doom-shooter

> Adapted from the SDLC course baseline (`generate-data-model` skill). The course baseline
> assumes a server-side Postgres + migration runner; this project is a client-only browser
> game with **no database in the MVP** (PRD §6.1: all state is ephemeral). The rules below
> state the current storage contract and pre-commit the defaults that activate if
> persistence ever appears.

## Current contract

- **One persisted datum (since survival-loop, 2026-07-13): the per-mode best score** under the versioned localStorage key `doom-shooter.v1` — see "localStorage contract (ACTIVE)" below. Everything else stays in-memory for the duration of a run; a page reload resets all state except the record.
- **Source of truth for the data shape:** TypeScript types in `src/core/state.ts` (`GameState` + entity types, ADR-0003) as designed in `docs/features/<slug>/data-model.md`.
- **IDs:** in-memory incremental integers per entity kind (SAD §8) — no UUIDs while nothing leaves the browser.
- **Static config is data, not logic:** demon types, paths, wave schedules live as typed module constants; business rules about them live in `src/systems/*`.
- **No storage-side business logic** — the "DB as dumb storage" course rule maps to: config objects hold values only; invariants (score non-decreasing, reload gating, end-condition) are enforced in systems code.

## Triggers that reopen this file

Any of these requires updating this file and `data-model.md` **before** implementation:

1. ~~**Best score / settings survive reload** → localStorage with a versioned key.~~ **FIRED (survival-loop, 2026-07-13)** — contract below is now active.
2. **Server-side leaderboard** (currently PRD Non-goal N7) → real database + the Postgres defaults below.

## localStorage contract (ACTIVE since survival-loop)

- Single namespaced versioned key: `doom-shooter.v<N>` holding one JSON document. Current: **`doom-shooter.v1` = `{ "endless": number, "survive60": number }`** (per-mode best scores; ADR-0003, `docs/features/survival-loop/data-model.md` §Storage).
- Sole touchpoint: `src/storage/records.ts` — fail-soft (read error ⇒ defaults + session-only, write error swallowed); read once at boot, write on run end.
- Schema version bump = migration: on load, read `v<N-1>`, transform, write `v<N>`, delete old key. Migration functions live in code next to the type, with a unit test per version step.
- No PII ever (PRD §6.1) — scores and settings only.

## If a real database appears

Course defaults apply as written in the SDLC baseline:

- Migration files: `YYYYMMDDhhmmss_<verb>_<entity>.up.sql` + matching `.down.sql`; timestamp naming, never sequential.
- `CREATE TABLE IF NOT EXISTS` / `ON CONFLICT DO NOTHING`; `CREATE INDEX CONCURRENTLY` on existing tables (single-statement file).
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()` only — no `updated_at` (immutable-first).
- Hard delete + separate audit table if history is needed; no `deleted_at`.
- PK: UUID v7 generated app-side.
- Bounded `VARCHAR(N)` from validation rules; `JSONB` only for opaque payloads with justification.
- Forbidden: `CHECK` on business invariants, `TRIGGER`, business-value `DEFAULT`, sequence PKs.
- Breaking changes: expand → backfill → contract, three migrations / three deploys.
- Seeds: deterministic UUIDs for bootstrap, `ON CONFLICT DO NOTHING` for lookup data, test fixtures as code factories (never in migrations), no real-looking PII (`admin@example.test` style only).
