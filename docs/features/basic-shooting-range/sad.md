---
status: Draft
owner: "Maksim Vakulenko"
reviewers: ["Tech Lead"]
updated_at: "2026-07-02"
feature_size: M
stage: "04-05"
ticket: "N/A (personal pet-project)"
---

# Software Architecture Document — basic-shooting-range

<!-- Stages 04-05 → see sdlc/plugin/skills/architecture-design/SKILL.md -->
<!-- 12 Arc42 sections. Empty sections — <!-- N/A: <one-line reason> -->. -->
<!-- C4 Context (L1) lives inline in §3. C4 Container (L2) lives inline in §5. -->
<!-- Заповнений приклад: див examples/course-lesson-mvp/sad.md у sdlc/ toolkit. -->

## 1. Introduction and goals

<!-- 🎯 Навіщо: стабільна памʼять про «що + три головні якості + хто зацікавлений».     -->
<!--           Через рік ніхто не згадає на словах, ЯКІ ТРИ ЯКОСТІ для системи критичні. -->
<!-- 📋 Що писати: 1 абзац intent + 3 рядки топ-3 якості + таблиця stakeholders.        -->
<!-- 📌 Приклад: «QG-1: швидкість редагування блоку p95 ≤500 мс»                         -->

**Intent.** A client-side browser Doom-style shooting gallery: the player is stationary, aims with the mouse, and fires a reload-gated shotgun at demons that advance along fixed patterns; a round ends with a total score. It exists to be both a genuinely fun playable demo and an end-to-end SDLC artifact. The accepted vector is **Approach C — Layered 2.5D Shooting Gallery** (PRD §1): ship a flat-2D playable round first, then add a sprite-scaling depth layer additively (idea-brief §13).

**Top-3 quality goals (1-liners; full scenarios in §10):**

1. **QG-1 Performance** — sustained rendering under a wave: ≥ 30 FPS, frame-time p95 ≤ 33.3 ms (PRD §6).
2. **QG-2 Depth-readiness (additive extensibility)** — the demon carries a depth/`z` field from stage 1 so the 2.5D sprite-scaling layer is additive, not a rewrite (idea-brief §13 locked-in pointer).
3. **QG-3 Input fidelity** — click→hit ≤ 50 ms, crosshair→world error ≤ 2 px across DPR/resize, timing drift ≤ 1% between 60↔144 Hz (PRD §6).

**Stakeholders.**

| Role | Interest | Sign-off owner? |
|---|---|---|
| Player (author-as-player) | A fun mini-game — aim, shoot, score | No |
| Author-as-learner | An end-to-end SDLC artifact | No |
| Tech Lead (author) | SAD approval | Yes |

## 2. Constraints

<!-- 🎯 Навіщо: §4 (стратегія) працює тільки коли §2 зафіксувала, ЩО ВЖЕ ЗАФІКСОВАНО:    -->
<!--           стек, версії, дедлайн, регуляторні вимоги. Це вхід, не вихід.             -->
<!-- 📋 Що писати: чотири блоки — Технічні / Організаційні / Конвенції / Регуляторні.     -->
<!-- 📌 Приклад: «Postgres 18» (не «Postgres»); «дедлайн Q3 — жорсткий» (не «бажано»).    -->

**Technical.**
- TypeScript 5.x, target ES2022 — type safety for solo maintainability.
- Browser-only runtime, **no server / no backend** (PRD N2, §6.1); published as a static bundle (itch.io / GitHub Pages).
- Rendering surface: HTML5 Canvas 2D context. The pseudo-depth *technique* on top of it is a §4 strategic decision (see ADR-0001).
- Vite as bundler → static build output.

**Organisational.**
- 1 solo developer, a few evenings per week; **no hard deadline** (natural course window — PRD §1).
- Effort target: a clickable, scoreable round within ≤ 2 evenings (PRD §7 KPI).

**Conventions.**
- No CLAUDE.md yet — project conventions are pinned here and in [CONTEXT.md](./CONTEXT.md).
- 🔑 The demon entity carries a depth/`z` field from stage 1 (idea-brief §13 locked-in pointer) — it drives sprite scale, screen position, draw order, and hit priority.
- Code in English; domain vocabulary lives in CONTEXT.md `## Glossary`.

**Regulatory / external.**
- License-clean assets only for public release (PRD §6.1 abuse case).
- No PII / accounts / analytics in MVP → GDPR N/A (PRD §6.1). All state is ephemeral in the browser.

## 3. Context and scope

<!-- 🎯 Навіщо: малює КОРДОН СИСТЕМИ — хто з нею говорить ззовні, де закінчується зона довіри. -->
<!--           Без §3 §5 і §8 (авторизація) розпливаються — неясно, що «всередині», а що «зовні». -->
<!-- 📋 Що писати: 2-3 речення бізнес-контексту + таблиця зовнішніх систем + Mermaid C4Context. -->
<!-- 📌 Приклад: «зовнішні — нема (свідома відмова від third-party у v1)» — це теж рішення.   -->
<!-- Кордон довіри (trust boundary) — лінія, за якою ти не довіряєш даним без перевірки.       -->

<!-- brownfield: N/A — greenfield repo (only docs/ present at stage 04-05, no source files) -->

The game runs entirely in the player's browser. **Deliberate decision: there are no external services at runtime** — no backend, no API, no analytics. The only external actor is the static host, which serves the bundle once at load time; the browser platform provides the render and input APIs. The trust boundary is the browser tab, and all state is ephemeral (PRD N2, §6.1).

**External systems (in / out):**

| Actor or system | Type | Interaction |
|---|---|---|
| Player | Person | Aims / fires with the mouse, reads the score on the canvas |
| Static host (itch.io / GitHub Pages) | System (external) | Serves the static bundle over HTTPS (load-time only) |
| Browser platform (Canvas / rAF / Pointer API) | System (external) | Provides render + input APIs to the runtime |

**C4 Context (L1):**

```mermaid
C4Context
    title basic-shooting-range — System Context

    Person(player, "Player", "aims with mouse, fires shotgun, reads score")
    System(game, "basic-shooting-range", "Client-side browser Doom-style shooting gallery")
    System_Ext(host, "Static host", "itch.io / GitHub Pages — serves the static bundle")
    System_Ext(browser, "Browser platform", "Canvas 2D, requestAnimationFrame, Pointer API")

    Rel(player, game, "Aims / fires / reads score", "mouse + keyboard, in-tab")
    Rel(host, player, "Serves static bundle", "HTTPS, load-time only")
    Rel(game, browser, "Renders frames, reads input", "Canvas 2D / rAF / Pointer")
```

## 4. Solution strategy

<!-- 🎯 Навіщо: 3-4 СТРАТЕГІЧНІ СТОВПИ, з яких потім ростуть усі ADR. Без §4 кожен ADR    -->
<!--           виглядає випадковим — нема зонтика. ⭐ Найгустіша секція — тут ADR-gate    -->
<!--           спрацьовує майже завжди (рішення незворотні + мульти-модульні).            -->
<!-- 📋 Що писати: список з 3-4 виборів. На кожен — заголовок + 2-3 речення rationale.    -->
<!-- 📌 Приклад: «Зберігати урок як таблицю блоків» — стовп, з якого виросло ADR-0001.    -->

**Four strategic pillars (the seeds for ADRs):**

1. **Render on Canvas 2D with per-frame sprite scaling** — the demon's screen scale, position, draw order (back→front) and hit priority (front-most) are all functions of its `z` field. This makes Approach C additive: the flat-2D round is the same code path with equal `z`, and the depth layer only starts varying `z`. Grows from §2 (Canvas 2D surface + the `depth/z` convention locked in from stage 1) and serves QG-2. → **ADR-0001**.
2. **Fixed-timestep game loop with a delta accumulator** — logic updates on a fixed step, rendering is decoupled from refresh rate. Directly satisfies §2/PRD §6 NFR *timing drift ≤ 1% between 60↔144 Hz* and QG-3 frame-rate independence — a variable-`dt` loop would let movement drift between refresh rates. → **ADR-0002**.
3. **Plain typed entities over an ECS** — `Demon` is a small typed struct (`z`, pos, pathId, hp, pointValue) inside a central `GameState`; no entity-component-system. Grows from the §2 organisational constraint (solo dev, playable round in ≤ 2 evenings): with only 2 demon types an ECS is over-engineering that spends the evening budget on framework, not gameplay. → **ADR-0003**.
4. **Round ends on all-resolved OR timer, no hard game-over** — the round ends when every wave demon is resolved (killed or escaped) or a fixed timer expires; an escape counts as a miss; there is no lose condition in MVP. Grows from §2 (no server → round state is ephemeral, the round is a self-contained client loop) and closes PRD §8 open question #1. → **ADR-0004**.

Each tactical decision in later sections should be traceable to one of these strategic seeds. Tactical decisions that *contradict* a strategic choice are red flags — surface them in §11 Risks.

## 5. Building block view

<!-- 🎯 Навіщо: ВНУТРІШНЯ ДЕКОМПОЗИЦІЯ — модулі, контейнери, БД. Статична топологія:   -->
<!--           хто з ким може говорити. Без §5 §6 (сценарії) не має словника учасників. -->
<!-- 📋 Що писати: 1 абзац про стиль (шари/гексагональна/clean/на подіях) +            -->
<!--           дерево папок + Mermaid C4Container.                                       -->
<!-- 📌 Приклад: «web-app, content-api, media-worker, postgres, s3, cdn».                -->

Feature-based modules inside one browser bundle. Simulation systems are plain functions over a central mutable `GameState` (ADR-0003); the game loop (ADR-0002) drives them on a fixed step and hands the state to the renderer (ADR-0001). It is a single-process monolith with one deploy unit.

**Internal decomposition:**

```
src/
├── main.ts              bootstrap: mount canvas, wire modules, start loop
├── core/
│   ├── loop.ts          fixed-timestep accumulator            (ADR-0002)
│   └── state.ts         GameState + entity types              (ADR-0003)
├── entities/
│   ├── demon.ts         Demon (z, pos, pathId, hp, pointValue)
│   └── shot.ts
├── systems/
│   ├── spawn.ts         spawn points + fixed paths            (US-05)
│   ├── weapon.ts        shotgun fire + reload gating          (US-01/02)
│   ├── hit.ts           resolve to front-most demon by z      (AC-06)
│   ├── round.ts         end-condition, timer, misses          (ADR-0004)
│   └── score.ts         score by demon type                   (US-03)
├── input/pointer.ts     aim + fire + focus/scope gating       (AC-07)
├── render/canvas2d.ts   sprite scaling from z                 (ADR-0001)
└── assets/sprites.ts    sprite image loading
```

**C4 Container (L2):**

```mermaid
C4Container
    title basic-shooting-range — Containers

    Person(player, "Player")

    Container_Boundary(app, "basic-shooting-range (browser bundle)") {
        Container(input, "Input", "TS", "pointer/click, focus & scope gating")
        Container(loop, "Game loop", "TS", "fixed-timestep accumulator")
        Container(sim, "Simulation systems", "TS", "spawn, weapon, hit-test, round, score")
        Container(state, "GameState + entities", "TS in-memory", "Demon/Shot structs, z field")
        Container(render, "Renderer", "TS + Canvas 2D", "sprite scaling from z")
        Container(assets, "Asset loader", "TS", "loads sprite images")
    }

    System_Ext(host, "Static host", "serves bundle + assets")
    System_Ext(browser, "Browser platform", "Canvas 2D / rAF / Pointer")

    Rel(player, input, "aims / clicks", "mouse")
    Rel(input, loop, "queued input")
    Rel(loop, sim, "fixed-step update")
    Rel(sim, state, "reads/writes entities")
    Rel(loop, render, "render(state)")
    Rel(render, state, "reads entities + z")
    Rel(render, browser, "draws frame", "Canvas 2D")
    Rel(assets, host, "fetch sprites", "HTTPS, load-time")
    Rel(render, assets, "uses sprites")
```

## 6. Runtime view

<!-- 🎯 Навіщо: ПОТІК У RUNTIME для 1-2 критичних сценаріїв. Хто з ким коли і у якому     -->
<!--           порядку говорить. Без §6 §5 — лише купа коробок без життя.                  -->
<!-- 📋 Що писати: Mermaid sequenceDiagram. Учасники — імена з §5 (не вигадуй нові!).      -->
<!--           Повідомлення семантичні («складає чорновик»), БЕЗ HTTP-методів/шляхів —     -->
<!--           ендпоінт-рівневі sequence-діаграми зʼявляться у stage 06 (define-api).      -->
<!-- 📌 Приклад: «methodist → web-app: складає чорновик → web-app → content-api: зберегти». -->

**Critical flow 1: <flow name>**

```mermaid
sequenceDiagram
    actor User
    participant API
    participant Service
    participant DB
    User->>API: <request>
    API->>Service: <call>
    Service->>DB: <write tx>
    DB-->>Service: ok
    Service-->>API: result
    API-->>User: 201
```

<!-- For XS/S: 1 flow above is enough. For M+: add 2-4 more (e.g. failure-mode flow, async flow). -->

**Critical flow 2: <e.g. async event propagation>** — <if applicable, otherwise N/A>.

## 7. Deployment view

<!-- 🎯 Навіщо: ТОПОЛОГІЯ, яку DevOps має знати без читання Helm-чартів — скільки реплік,  -->
<!--           де живе фоновий обробник, ПРИ ЯКИХ ЧИСЛАХ масштабуємось.                     -->
<!-- 📋 Що писати: 2-3 речення про топологію + метрики + алерти + конкретні числа-пороги.   -->
<!-- 📌 Приклад: «500 IC → партиціонування за кварталом» (не «при зростанні подумаємо»).    -->
<!-- 🎯 Можна N/A для XS/S функцій, що переюзають існуюче розгортання без змін.            -->

<Topology in 2-3 sentences. Where it runs (k8s / VM / serverless), replicas, scaling thresholds.>

**Monitoring:**
- <Metrics — e.g. Prometheus `<metric_name>`>
- <Alerts — e.g. "outbox lag > 10 min → page on-call">
- <Tracing — e.g. OpenTelemetry HTTP spans>

**Scaling thresholds:**
- <e.g. 500 IC × 5 goals × 26 checkpoints/Q = 65k rows/year — comfortable in one table>
- <e.g. partitioning by quarter at >500k rows/year>

<!-- For XS/S that doesn't change deployment: <!-- N/A: feature reuses existing deployment unit -->. -->

## 8. Crosscutting concepts

<!-- 🎯 Навіщо: НАСКРІЗНІ ПАТЕРНИ, які перетинають кілька модулів: логування, помилки,    -->
<!--           авторизація, ID strategy, outbox, кеш. ⭐ Друга найгустіша секція.          -->
<!--           Якщо патерн всередині одного модуля — він НЕ сюди. Якщо це конвенція        -->
<!--           проєкту в цілому — у CLAUDE.md.                                              -->
<!-- 📋 Що писати: таблиця концепт / конвенція / де визначено. Один рядок на концепт.      -->
<!-- 📌 Приклад: «UUID v7 (час+випадковий, сортується) у app-layer» — як default з CLAUDE.md. -->

| Concept | Convention | Where defined |
|---|---|---|
| Logging | <e.g. structured slog, fields `module=<name>`> | <CLAUDE.md §X or here> |
| Authentication | <e.g. JWT via session middleware> | <CLAUDE.md §X> |
| Error handling | <e.g. domain sentinel → ports/errors.go → apperr JSON> | <CLAUDE.md §X> |
| ID strategy | <e.g. UUID v7 in app layer> | <CLAUDE.md §X> |
| Internationalisation | <e.g. N/A, English only> | — |
| Observability | <e.g. OpenTelemetry on HTTP boundaries> | — |
| Outbox / events | <module-specific patterns, if any> | <here> |

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
