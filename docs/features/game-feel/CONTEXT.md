---
status: Living
updated_at: "2026-07-05"
---

# Domain Context — game-feel

<!--
Feature-scoped glossary for game-feel. The shared gameplay glossary lives in
docs/features/basic-shooting-range/CONTEXT.md (demon, reload, round, miss, path, depth/z,
fire intent, spawn point, wave, score) — those terms still hold. Below are ONLY the new
domain words this feature introduces. Domain words + boundaries only, no implementation.
-->

## Glossary

<!-- term · 1-sentence canonical definition · 1-sentence boundary (what it is NOT). -->
- juice / game feel — the audiovisual feedback layer (sound, screen shake, muzzle flash, hit splats) added on top of already-working mechanics. NOT gameplay rules (juice never decides an outcome; it only expresses one).
- viewmodel — the first-person shotgun sprite shown on screen, with distinct frames per weapon state (idle / firing / pump / full-reload). NOT the weapon system (viewmodel is the visual; the weapon system owns fire/shell/reload logic).
- pump / rack (передергивание затвора) — the between-shots slide-cocking action and its short animation + sound. NOT reload (a pump cycles one shell within an ongoing round; reload refills spent ammo).
- hit points / HP — a demon's shot-durability tier (1 / 2 / 4); each landed shot removes exactly 1. NOT health regeneration (HP only ever decreases within a demon's life).
- hurt state — the transient bleeding sprite shown while a demon has taken damage but still has HP left. NOT death (hurt means alive-and-damaged; a hurt demon can still escape as a miss).
- death animation — the short (~1s) sprite sequence a demon plays once its last HP is removed, after which it despawns. NOT miss (death is a kill that scores; a miss is an escaped un-killed demon).
- backdrop / scene — the atmospheric background image drawn behind gameplay, chosen at random per round. NOT level/map (a backdrop is pure decoration with no gameplay geometry or collision).
- retry / try again — a restart that resets score to zero, rebuilds a fresh round, and rerolls a new random backdrop. NOT resume (retry starts a brand-new round; it never continues a frozen one).
