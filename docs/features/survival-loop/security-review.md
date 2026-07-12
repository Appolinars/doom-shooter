---
status: Accepted
owner: "Maksym Vakulenko"
reviewers: ["Tech Lead"]
updated_at: "2026-07-13"
feature_size: M
stage: "17"
ticket: "N/A (personal pet-project)"
---

# Security review — survival-loop

**Verdict: no security-relevant surface — review formally waived**, per the analysis
already recorded in [PRD §6.1](./PRD.md) and confirmed against the finished SAD/data-model.

## Basis

- **Attack surface:** client-only static page; no server, no accounts, no network calls
  (nothing is sent anywhere — SSRF/injection/spam not applicable).
- **Data:** the sole persisted datum is a per-mode best score (two non-negative integers)
  in the player's own browser under `doom-shooter.v1`. No PII by construction
  (`.claude/rules/migrations.md` active contract).
- **Untrusted input:** exactly one — the localStorage payload. Covered structurally:
  ADR-0003 defensive parse in the single touchpoint `src/storage/records.ts`, malformed
  data degrades to session-only defaults, never evaluated/rendered as code
  (AC-10 + test-plan fault-injection rows).
- **Tampering:** record editing via devtools is accepted — personal, never shared
  (unchanged base stance).
- **AuthZ analog:** run-state input gating (AC-12) — a gameplay concern, tested in the
  test plan, not a security boundary.
- **Assets:** license-clean sources only (process rule, enforced at the asset task's DoD
  via CREDITS.md — same as game-feel).

## Revisit trigger

A shared/server leaderboard (PRD Non-goal N2, migrations.md trigger #2) or ANY network
surface → full security review before design lock (threat model, input validation at the
boundary, transport, abuse/rate limits).
