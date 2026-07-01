---
status: Living
updated_at: "2026-07-01"
---

# Domain Context

<!--
CONTEXT.md = domain glossary, not SPEC and not a scratch pad. NO implementation details
(no Redis vs Postgres, no library names, no API contracts) — only domain words
and the boundaries between them. The rest lives in SPEC.md, architecture-brief.md, ADR.

Terms resolving during interview/brainstorm/decide go here inline,
not batched "I'll consolidate later". MP rule: empty H2 — delete before commit;
in CONTEXT.md keep only sections that have real content.
-->

## Glossary

<!-- term · 1-sentence canonical definition · 1-sentence boundary (what it is NOT / what it gets confused with). -->
- demon — a target creature the player shoots at. NOT enemy in the general sense (non-demonic enemies may appear in the future and are not automatically demons).
- reload — the delayed shotgun-reloading process that blocks firing while it lasts. NOT weapon switch (reloading refills the current weapon, it does not change the weapon).
- score — the total number of points accumulated during one round. NOT combo/multiplier (score is the final flat number, without any multiplier logic).
- spawn point — a specific fixed screen coordinate where a demon appears. NOT spawn zone (a spawn point is a single fixed coordinate, not an area).
- wave — a group of demons appearing within a single round/run. NOT level/location (a wave is about enemies, not about the map).
