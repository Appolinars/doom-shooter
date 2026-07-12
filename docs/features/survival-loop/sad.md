---
status: Draft
owner: "Maksym Vakulenko"
reviewers: ["Tech Lead"]
updated_at: "2026-07-12"
feature_size: M
stage: "04-05"
ticket: "N/A (personal pet-project)"
---

# Software Architecture Document — survival-loop

<!-- Stages 04-05 → see sdlc/plugin/skills/architecture-design/SKILL.md -->
<!-- 12 Arc42 sections. Empty sections — <!-- N/A: <one-line reason> -->. -->
<!-- C4 Context (L1) lives inline in §3. C4 Container (L2) lives inline in §5. -->
<!-- Заповнений приклад: див examples/course-lesson-mvp/sad.md у sdlc/ toolkit. -->

## 1. Introduction and goals

<!-- 🎯 Навіщо: стабільна памʼять про «що + три головні якості + хто зацікавлений».     -->
<!--           Через рік ніхто не згадає на словах, ЯКІ ТРИ ЯКОСТІ для системи критичні. -->
<!-- 📋 Що писати: 1 абзац intent + 3 рядки топ-3 якості + таблиця stakeholders.        -->
<!-- 📌 Приклад: «QG-1: швидкість редагування блоку p95 ≤500 мс»                         -->

**Intent.** survival-loop turns the polished shooting gallery into a survival arcade: the player gains HP and a lose condition (game over), two modes — Endless with generated escalating waves and Survive-60s with a timer win — a kill-streak combo multiplier with far-kill bonuses, a D–S rank with stats on the end screen, and a per-mode best score persisted between sessions. Shipped in three independently playable stages (PRD §2, idea-brief §13, Approach C).

**Top-3 quality goals (1-liners; full scenarios in §10):**

1. **Determinism preserved** — waves/combo/fireballs advance only on the fixed step, 0 wall-clock reads; timing drift ≤ 1% between 60 ↔ 144 Hz.
2. **Late-wave performance** — ≥ 30 FPS (frame-time p95 ≤ 33.3 ms) with the ≤ 32 live-entity cap active.
3. **Fail-soft record persistence** — 100% of runs reach their end screen with storage unavailable or corrupt.

Candidate #4 left out deliberately: player-hit feedback latency ≤ 100 ms is inherited from game-feel — the mechanism is already proven, it only extends to the new hit sources.

**Stakeholders.**

| Role | Interest | Sign-off owner? |
|---|---|---|
| player (author-as-player) | real stakes, voluntary "one more try" | No |
| demo guest | replay pull within 1-3 runs, zero onboarding | No |
| author-as-learner | first M-sized feature through the full SDLC pipeline | No |
| Tech Lead | SAD approval | Yes |

## 2. Constraints

<!-- 🎯 Навіщо: §4 (стратегія) працює тільки коли §2 зафіксувала, ЩО ВЖЕ ЗАФІКСОВАНО:    -->
<!--           стек, версії, дедлайн, регуляторні вимоги. Це вхід, не вихід.             -->
<!-- 📋 Що писати: чотири блоки — Технічні / Організаційні / Конвенції / Регуляторні.     -->
<!-- 📌 Приклад: «Postgres 18» (не «Postgres»); «дедлайн Q3 — жорсткий» (не «бажано»).    -->

**Technical.**
- TypeScript 5.7 (ESM), no runtime framework — vanilla Canvas 2D + Web Audio.
- Vite 6 (build/dev), Vitest 2.1 (unit), Playwright 1.49 (E2E), ESLint 9 + typescript-eslint 8.
- Browser-only client, no backend (PRD Non-goal N2).
- Fixed-step core: `STEP_MS = 1000/60`, `MAX_STEPS_PER_FRAME = 5`; systems never read wall-clock (basic-shooting-range ADR-0004).
- One central mutable `GameState`, plain structs, no ECS (basic-shooting-range ADR-0003); system order fixed in `src/core/step.ts`.
- Render/audio decoupled via poll/diff wiring — the fixed step stays event-free (game-feel convention).

**Organisational.**
- Solo dev, personal pet-project — no hard deadline.
- Endless tuning budget: 3 tuning evenings (PRD §8 default); fallback — Survive-60s becomes the primary mode.
- Delivery in 3 stages, each ending green and playable (PRD §2).

**Conventions.**
- `.claude/rules/migrations.md` — storage contract: **this feature fires reopen-trigger #1** → versioned localStorage key `doom-shooter.v<N>`, one JSON document, version bump = migration with a unit test per step, no PII ever.
- `src/core/config.ts` holds data only; invariants live in `src/systems/*`.
- IDs: in-memory incremental integers per entity kind.
- E2E via `?e2e` debug API (`window.__doom`); unit factories in `tests/factories.ts` mirror state defaults.

**Regulatory / external.**
- None. No PII (storage rules); record tampering via devtools accepted (PRD §6.1); license-clean asset sources only.

## 3. Context and scope

<!-- 🎯 Навіщо: малює КОРДОН СИСТЕМИ — хто з нею говорить ззовні, де закінчується зона довіри. -->
<!--           Без §3 §5 і §8 (авторизація) розпливаються — неясно, що «всередині», а що «зовні». -->
<!-- 📋 Що писати: 2-3 речення бізнес-контексту + таблиця зовнішніх систем + Mermaid C4Context. -->
<!-- 📌 Приклад: «зовнішні — нема (свідома відмова від third-party у v1)» — це теж рішення.   -->
<!-- Кордон довіри (trust boundary) — лінія, за якою ти не довіряєш даним без перевірки.       -->

A single-player browser game with no server: survival-loop adds a lose condition, modes, and a record, but barely moves the system boundary. The one new external system is the browser's localStorage — outside the trust boundary: it may be missing, full, or corrupt, and every read is parsed defensively (PRD AC-10). There is no network surface.

<!-- brownfield scan: Explore subagent ran 2026-07-12 — see §2 Technical + §5 for the reported layout. -->

**External systems (in / out):**

| Actor or system | Type | Interaction |
|---|---|---|
| player (author-as-player) | Person | picks a mode, shoots, retries, chases the record |
| demo guest | Person (external) | plays 1-3 runs of the published demo, zero onboarding |
| Browser localStorage | System (external) | holds the per-mode record under a versioned key; fail-soft reads/writes |

**C4 Context (L1):**

```mermaid
C4Context
    title doom-shooter survival-loop — System Context

    Person(player, "player", "author-as-player: picks a mode, fights waves, chases the record")
    Person_Ext(guest, "demo guest", "portfolio visitor: plays 1-3 runs, zero onboarding")

    System(game, "doom-shooter", "Browser game — TypeScript + Canvas 2D + Web Audio, fixed-step core")
    System_Ext(storage, "Browser localStorage", "Per-mode best score under a versioned key; may be missing or corrupt")

    Rel(player, game, "Picks mode, shoots, retries", "mouse + Esc")
    Rel(guest, game, "Plays the published demo", "mouse")
    Rel(game, storage, "Reads/writes the per-mode record, fail-soft", "Web Storage API")
```

## 4. Solution strategy

<!-- 🎯 Навіщо: 3-4 СТРАТЕГІЧНІ СТОВПИ, з яких потім ростуть усі ADR. Без §4 кожен ADR    -->
<!--           виглядає випадковим — нема зонтика. ⭐ Найгустіша секція — тут ADR-gate    -->
<!--           спрацьовує майже завжди (рішення незворотні + мульти-модульні).            -->
<!-- 📋 Що писати: список з 3-4 виборів. На кожен — заголовок + 2-3 речення rationale.    -->
<!-- 📌 Приклад: «Зберігати урок як таблицю блоків» — стовп, з якого виросло ADR-0001.    -->

**Top-5 strategic choices (the seeds for ADRs):**

1. **Extend `Round` into a mode-aware run state (ADR-0001).** The existing one-way freeze, pause, `isRoundActive` gate, and test factories are reused; `mode` (`endless` | `survive60`), `playerHp`, terminal `outcome` (`gameOver` | `won` | `null`), and an `idle` status for the start screen join the same object. One source of truth for the game phase keeps the E2E debug API and the render/wiring observers simple (QG-1 determinism: all transitions happen on the fixed step).
2. **Single parametric wave generator for both modes (ADR-0002).** A pure function `(waveNumber, modeParams) → wave spec`, consumed on the fixed step when the current wave is exhausted, replaces the retired static `WAVE_SCHEDULE`. Endless escalates the parameters; Survive-60s pins the same formulas at high intensity (PRD §8 default) — one code path, one determinism test.
3. **Record behind a fail-soft storage adapter (ADR-0003).** A dedicated module is the only touchpoint with localStorage: one defensive read at boot (garbage/absence → defaults + session-only flag), one write at run end, every error swallowed. Schema `doom-shooter.v1` = `{ endless: number, survive60: number }` per the migrations.md contract; the game loop never touches storage (QG-3 fail-soft by construction).
4. **Fireball as a first-class shootable entity kind (ADR-0004).** `state.fireballs[]` lives beside `demons[]`; hit resolution generalizes to "front-most by depth across all shootable kinds" (AC-15). The fireball inherits nothing demon-specific (no path-walking, HP tiers, or score value — per CONTEXT glossary); the ≤ 32 entity cap counts both lists (QG-2).
5. **Screens follow the existing hybrid convention (ADR-0005).** The start screen and end screens are drawn by the canvas renderer off the run status (like today's round-result overlay); interactive controls (mode select, retry) are DOM buttons toggled by status. The first click on a mode button arms audio (AC-11); gameplay input is gated on `status === 'running'` (AC-12).

**Gameplay defaults locked at this gate (PRD §8 open questions closed, values as data in `config.ts`, invariants in `systems/*`):** player HP = 5, every player hit removes exactly 1; the combo breaks on a taken player hit or an escaped demon — never on a missed shot; far-kill threshold = the demon has not yet crossed the midpoint of its path; ranks D–S come from a fixed table tuned once during implementation. The escalation curve shape stays open as a tuning risk (§11) with the 3-evening budget from §2.

Each tactical decision in later sections should be traceable to one of these strategic seeds. Tactical decisions that *contradict* a strategic choice are red flags — surface them in §11 Risks.

## 5. Building block view

<!-- 🎯 Навіщо: ВНУТРІШНЯ ДЕКОМПОЗИЦІЯ — модулі, контейнери, БД. Статична топологія:   -->
<!--           хто з ким може говорити. Без §5 §6 (сценарії) не має словника учасників. -->
<!-- 📋 Що писати: 1 абзац про стиль (шари/гексагональна/clean/на подіях) +            -->
<!--           дерево папок + Mermaid C4Container.                                       -->
<!-- 📌 Приклад: «web-app, content-api, media-worker, postgres, s3, cdn».                -->

The style is unchanged from the base game: a fixed-step **logic core** (small systems — pure functions mutating one central `GameState`, order fixed in `step.ts`) with **decoupled render/audio** observing state via poll/diff. The feature's new logic lands as five small systems following the existing `systems/*` granularity, one new entity, and one new `storage/` directory for the record adapter (its only localStorage touchpoint, ADR-0003).

**Internal decomposition (feature delta):**

```
src/
├── core/
│   ├── state.ts        ← Run (ex-Round): + mode, playerHp, outcome, 'idle' status; + fireballs[]; + combo
│   ├── config.ts       ← + mode params, escalation params, HP/damage, combo/far-kill, rank table
│   └── step.ts         ← + step order: waves → fireball → damage → run end-conditions
├── systems/
│   ├── waves.ts        NEW — parametric wave generator + entity-cap enforcement (ADR-0002)
│   ├── damage.ts       NEW — player hits (breakthrough demon, landed fireball), game-over trigger
│   ├── combo.ts        NEW — kill-streak multiplier + far-kill bonus
│   ├── fireball.ts     NEW — telegraph, flight, shoot-down resolution (stage 3)
│   ├── rank.ts         NEW — rank D–S, run stats, best-moment line (pure function of the finished run)
│   ├── score.ts        ← multiplied scoring, stays non-decreasing
│   ├── hit.ts          ← front-most by z across demons + fireballs (ADR-0004)
│   ├── round.ts        ← run semantics: hp = 0 → gameOver; survive60 timer → won (ADR-0001)
│   └── spawn.ts        ← consumes generator output instead of WAVE_SCHEDULE
├── entities/fireball.ts NEW — typed struct + derived helpers
├── storage/records.ts   NEW — fail-soft record store (ADR-0003)
├── render/canvas2d.ts   ← start/end screens, HP indicator, wave number, combo HUD, callouts
├── wiring.ts            ← run-end → rank/record trigger; callouts via poll/diff
└── main.ts              ← mode buttons, screen-button visibility (ADR-0005)
```

**C4 Container (L2):**

```mermaid
C4Container
    title doom-shooter — Containers (survival-loop delta)

    Person(player, "player")

    Container_Boundary(game, "doom-shooter (browser, single page)") {
        Container(input, "input + DOM controls", "TS", "fire intents, mode select, retry; run-state gated")
        Container(loop, "core loop + step", "TS", "fixed-step driver, system order")
        Container(systems, "systems/*", "TS", "weapon, hit, score+combo, spawn+waves, damage, fireball, rank, run")
        Container(state, "GameState", "TS plain structs", "run, demons, fireballs, shots, combo")
        Container(renderer, "render/*", "Canvas 2D", "world, HUD, start/end screens, callouts")
        Container(audio, "audio/*", "Web Audio", "SFX bus, music")
        Container(wiring, "wiring.ts", "TS", "poll/diff feedback, retry, record trigger")
        Container(records, "storage/records.ts", "TS", "fail-soft record store")
    }

    System_Ext(storage, "Browser localStorage", "doom-shooter.v1")

    Rel(player, input, "clicks / Esc", "DOM events")
    Rel(input, state, "writes intents / mode")
    Rel(loop, systems, "steps in fixed order")
    Rel(systems, state, "mutate")
    Rel(renderer, state, "reads each rAF")
    Rel(wiring, state, "diffs each frame")
    Rel(wiring, audio, "SFX / music cues")
    Rel(wiring, records, "record read at boot, write at run end")
    Rel(records, storage, "get/setItem, fail-soft", "Web Storage API")
```

## 6. Runtime view

<!-- 🎯 Навіщо: ПОТІК У RUNTIME для 1-2 критичних сценаріїв. Хто з ким коли і у якому     -->
<!--           порядку говорить. Без §6 §5 — лише купа коробок без життя.                  -->
<!-- 📋 Що писати: Mermaid sequenceDiagram. Учасники — імена з §5 (не вигадуй нові!).      -->
<!--           Повідомлення семантичні («складає чорновик»), БЕЗ HTTP-методів/шляхів —     -->
<!--           ендпоінт-рівневі sequence-діаграми зʼявляться у stage 06 (define-api).      -->
<!-- 📌 Приклад: «methodist → web-app: складає чорновик → web-app → content-api: зберегти». -->

Start screen and retry are deliberately not diagrammed — they are trivial status transitions covered by ADR-0001/0005 prose. Full US-by-US coverage is the later `complete-sequence-diagrams` stage.

**Critical flow 1: breakthrough demon → player hit (AC-01)**

```mermaid
sequenceDiagram
    participant loop as core loop
    participant systems as systems/*
    participant state as GameState
    participant wiring as wiring.ts
    participant renderer as render/*
    participant audio as audio/*
    loop->>systems: fixed step
    systems->>state: demon progress reaches 1 (un-killed)
    systems->>state: damage: despawn demon, playerHp -= 1
    wiring->>state: diff (next rendered frame)
    wiring->>audio: player-hit SFX
    wiring->>renderer: strong screen feedback (flash/shake)
    renderer->>state: read HP for HUD indicator
```

**Critical flow 2: same-step final kill + fatal hit (AC-02b, ordering edge)**

```mermaid
sequenceDiagram
    participant loop as core loop
    participant systems as systems/*
    participant state as GameState
    loop->>systems: fixed step (step.ts order)
    systems->>state: hit: killing shot resolves
    systems->>state: score+combo: kill points × multiplier (+ far-kill bonus)
    systems->>state: damage: player hit lands, playerHp hits 0
    systems->>state: run end-condition: outcome = gameOver, one-way freeze
    Note over systems,state: score is written before the freeze — order fixed in step.ts
```

**Critical flow 3: run end → rank + record, fail-soft branch (AC-07/08/10)**

```mermaid
sequenceDiagram
    participant state as GameState
    participant wiring as wiring.ts
    participant rank as systems/rank
    participant records as storage/records.ts
    participant ls as Browser localStorage
    participant renderer as render/*
    wiring->>state: diff sees running → ended
    wiring->>rank: compute rank, stats, best moment
    wiring->>records: submit final score for the mode
    alt storage healthy
        records->>ls: read record, write if beaten
        records-->>wiring: NEW RECORD! / kept
    else storage unavailable or corrupt
        records-->>wiring: session-only record (error swallowed)
    end
    renderer->>state: draw end screen — always shown
```

**Critical flow 4: fireball counterplay (AC-14, stage 3)**

```mermaid
sequenceDiagram
    participant loop as core loop
    participant systems as systems/*
    participant state as GameState
    participant wiring as wiring.ts
    loop->>systems: fixed step
    systems->>state: shooter demon telegraphs, spawns fireball
    alt player shoots it down
        systems->>state: hit: front-most across kinds = fireball
        systems->>state: fireball despawns harmlessly (no points, combo untouched)
    else fireball reaches the player
        systems->>state: damage: player hit, playerHp -= 1
        wiring->>state: diff → strong feedback
    end
```

## 7. Deployment view

<!-- 🎯 Навіщо: ТОПОЛОГІЯ, яку DevOps має знати без читання Helm-чартів — скільки реплік,  -->
<!--           де живе фоновий обробник, ПРИ ЯКИХ ЧИСЛАХ масштабуємось.                     -->
<!-- 📋 Що писати: 2-3 речення про топологію + метрики + алерти + конкретні числа-пороги.   -->
<!-- 📌 Приклад: «500 IC → партиціонування за кварталом» (не «при зростанні подумаємо»).    -->
<!-- 🎯 Можна N/A для XS/S функцій, що переюзають існуюче розгортання без змін.            -->

Topology unchanged: a static Vite build, single page, no server; publishing the demo remains parked (post-feature). The feature adds no deployment unit — everything ships inside the same bundle.

**Monitoring:**
- Frame-time: existing `createFrameTimer` FPS dev overlay (rolling mean + p95) — the measurement source for QG-2.
- No alerts or tracing — client-side game, no ops surface.

**Scaling thresholds:**
- ≤ 32 concurrent live entities (demons + fireballs) at any wave — the single performance guard for late waves; enforced at the generator (ADR-0002), asserted by a stress test.

## 8. Crosscutting concepts

<!-- 🎯 Навіщо: НАСКРІЗНІ ПАТЕРНИ, які перетинають кілька модулів: логування, помилки,    -->
<!--           авторизація, ID strategy, outbox, кеш. ⭐ Друга найгустіша секція.          -->
<!--           Якщо патерн всередині одного модуля — він НЕ сюди. Якщо це конвенція        -->
<!--           проєкту в цілому — у CLAUDE.md.                                              -->
<!-- 📋 Що писати: таблиця концепт / конвенція / де визначено. Один рядок на концепт.      -->
<!-- 📌 Приклад: «UUID v7 (час+випадковий, сортується) у app-layer» — як default з CLAUDE.md. -->

| Concept | Convention | Where defined |
|---|---|---|
| Determinism | systems never read wall-clock; render/effects age by rAF delta | basic-shooting-range ADR-0004, §2 |
| Feedback wiring | poll/diff each rendered frame; the fixed step stays event-free | game-feel, `src/wiring.ts` |
| Error handling | fail-soft: assets and storage degrade silently, play is never blocked | base AC-06 pattern, ADR-0003 |
| ID strategy | in-memory incremental integers per entity kind | storage rules / base SAD §8 |
| Config-as-data | values in `src/core/config.ts`, invariants in `src/systems/*` | `.claude/rules/migrations.md` |
| Input gating | gameplay input only while `status === 'running'` (extends focus/scope gating) | AC-12, ADR-0001 |
| Audio | single bus, first-gesture arming, 8-voice steal-oldest, `musicGain` seam | game-feel |
| Persistence | versioned key `doom-shooter.v<N>`, no PII, version bump = migration + unit test | `.claude/rules/migrations.md` |
| Internationalisation | N/A — English only | — |

## 9. Architecture decisions

<!-- 🎯 Навіщо: ЗВОРОТНИЙ ІНДЕКС на папку adr/. `ls adr/` дає файли, §9 дає семантику —    -->
<!--           чому вони існують, до якого зрізу SAD привʼязані, у якому статусі.           -->
<!-- 📋 Що писати: таблиця з 4 колонками. Один рядок на ADR. Mixed status — це OK.         -->
<!-- 📌 Приклад: «0001 | Зберігати урок як таблицю блоків | Accepted | §4».                -->

| # | Title | Status | Section |
|---|---|---|---|
| <NNNN> | <imperative — e.g. "Use sliding window for rate limiting"> | Accepted | §<N> |
| <NNNN> | <imperative — e.g. "Co-locate outbox worker in API process"> | Accepted | §<N> |

ADR files live under `docs/features/<slug>/adr/NNNN-<title>.md`.

## 10. Quality requirements

<!-- 🎯 Навіщо: ДЕРЕВО ЯКОСТЕЙ (Quality Tree) — беремо мету з §1 і розкладаємо на          -->
<!--           конкретні листя: тести, метрики, конфіги, drill-и. ⭐ Без §10 §1 — це       -->
<!--           маніфест. З §10 кожна декларація мапиться на щось, ЩО МОЖНА ДОВЕСТИ.        -->
<!-- 📋 Що писати: на кожну якість з §1 — When / Then / How verify. Числа з PRD §6 NFR     -->
<!--           ДОСЛІВНО (не округлюй p95 ≤250мс до ≤300мс — це F6-помилка критика).        -->
<!-- 📌 Приклад: «p95 ≤500 мс на UPDATE блоку, перевіримо k6 load test 100 req/s».        -->

Each top-3 goal from §1 expanded into a full scenario:

**QG-1. <quality attribute>**
- **When:** <trigger condition>
- **Then:** <expected behavior with numbers from PRD NFR>
- **How verify:** <test / chaos drill / load test / observability>

**QG-2. <quality attribute>**
- **When:** <trigger>
- **Then:** <expected>
- **How verify:** <how>

**QG-3. <quality attribute>**
- **When:** <trigger>
- **Then:** <expected>
- **How verify:** <how>

## 11. Risks and technical debt

<!-- 🎯 Навіщо: ⭐ збирає ВСЕ, що може зламатись — і не лише технічне. Без §11 ризики   -->
<!--           обговорюються на стендапах і губляться; борг лишається у голові того,    -->
<!--           хто його прийняв.                                                          -->
<!-- 📋 Що писати: таблиця ризик/борг — серйозність — мітигація — власник. Технічний    -->
<!--           борг окремою секцією.                                                      -->
<!-- 📌 Приклад: «EM не пушить — member не оновлює дані | High | …». Перший ризик —      -->
<!--           часто продуктовий, не технічний. Це нормально.                            -->

<!-- Severity column literals: Low / Medium / High for regular risks; "Open question" for rows
     created by Step-7 `Save as Open Question` resolutions (see references/socratic-loop.md). -->

| Risk / debt | Severity | Mitigation | Owner |
|---|---|---|---|
| <e.g. Outbox lag may reach hours during downstream outage> | Medium | <Alert >10 min, on-call playbook, retry backoff> | <DevOps> |
| <e.g. No event schema versioning in v1> | Medium | <ADR-NNNN planned for v2, graceful handling of unknown fields> | <Backend> |
| Open architectural decision: <decision-headline> | Open question | Resolve before <stage trigger or YYYY-MM-DD>; <inline rationale from Step-7 Save-as-OQ> | <owner> |

**Accepted debt (acceptable in v1, plan to fix later):**
- <e.g. Goal entity is not versioned (immutable) — OK for v1, may need audit versioning in v2>

## 12. Glossary

<!-- 🎯 Навіщо: ⭐ СЛОВНИК ДОМЕНУ, який припиняє суперечки через рік («checkpoint —      -->
<!--           weekly чи biweekly? Quarter — календарний чи фіскальний?»).                -->
<!-- 📋 Що писати: таблиця термін / значення. Бізнес-терміни + технічні вперемішку.       -->
<!--           Один термін може мати дві мови у заголовку: «Goal (Обʼєктив)».              -->
<!-- 📌 Приклад: «Lesson | урок усередині курсу, що складається з блоків (text, video)». -->

| Term | Meaning |
|---|---|
| <e.g. Goal> | <quarterly intent in statement form> |
| <e.g. KR> | <Key Result — measurable target linked to a Goal> |
| <e.g. Checkpoint> | <bi-weekly progress update on a KR> |
