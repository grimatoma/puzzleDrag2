# Config override remediation — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` (recommended) or `executing-plans` to implement task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate (or explicitly gate) every place runtime/UI/BM ignores catalog config, starting with player-visible bugs, then structural single-source-of-truth merges.

**Architecture:** One **canonical data object per domain** (`ITEMS`, `HAZARDS`, `BOSSES`, `QUEST_TEMPLATES`, …) with thin adapters (UI rows, registry sync, BM export). Runtime reads config through shared helpers (`isTapTargetPower`, `normalizeHazardId`, `computeAggregatedAbilities(fullState)`). Phased PRs — each phase ships tests + passes `npm test` / `npm run build`; UI phases run `npm run test:visual` when panels change.

**Tech Stack:** React reducer (`src/state.js`), Phaser (`GameScene.js`), Vitest, Playwright visual matrix, Dev Panel `/b/` balance JSON.

**Prerequisite doc:** `docs/hardcoded-special-cases-audit.md` (expand in Phase 0 with §12–§16 from this plan).

**Historical:** UX audit scope (PRs #406–#422) is complete. Deferred UX items lived in `docs/UX_AUDIT_INVENTORY.md` (removed 2026-05-25). Tool-power consolidation shipped in [PR #634](https://github.com/grimatoma/puzzleDrag2/pull/634); the implementation plan doc was removed the same date.

---

## Coverage verdict

**No — the current audit does not cover everything.** It is strong on tools, hazards, bosses, orders, and UI drift. A deeper pass found additional gaps in story/flags, quests (dual templates), market, fish tides, worker aggregation on canvas, feature-flag defaults, balance JSON key mismatch, tile tags, portal/castle/decorations BM coverage, and achievement fish omission.

**Correction:** Zone `seasonDrops` **are** live on farm fill (`GameScene._pickFromZoneSeasonDrops`). The dead path is `SEASON_POOL_MODS` / `getEffectivePool()`, not zone drops.

---

## Decisions (locked 2026-05-25)

| # | Choice | Implication |
|---|--------|-------------|
| **D1** | **A** — default dialogs **on** | Change `isDialogsDisabled()` to return `false` when no override; update tests + `CLAUDE.md`. |
| **D2** | **C** — keep fire flag, **BM toggle** | Do not hard-enable fire; add Dev Panel / `featureFlags` wiring so designers can flip it. |
| **D3** | **A** — wire rats | Call `rollRatSpawn` / `tickRats` on farm `CHAIN_COLLECTED` (respect caps + `RATS_HAZARD_ENABLED`). |
| **D4** | **A** — boss merge | `triggerBoss` → `spawnBoss`; GameScene reads `modifier.type` + `modifierState`. |
| **D5** | **A** — tile/resource tail **in scope** | Core chain split is done; finish market, tool `_emitClearGains`, drop `CAPPED_TILES` from inventory, update `CLAUDE.md`. |
| **D6** | **Keep one path — `CHAIN_COLLECTED` only** | See [D6 resolution](#d6-resolution-commit_chain-vs-chain_collected) below. |
| **D7** | **All tracks, order A → B → C** | Player-impact → BM/export → UI catalog. |

### D6 resolution: `COMMIT_CHAIN` vs `CHAIN_COLLECTED`

**No — production does not need both.**

| Path | Who dispatches it | Inventory model |
|------|-------------------|-----------------|
| **`CHAIN_COLLECTED`** | `GameScene` + `prototype.jsx` bridge (all live chains) | `resourceProgress` → resource keys (PR 3) |
| **`COMMIT_CHAIN`** | **Nothing in `src/`** — only unit tests + `tests/e2e/hazards.spec.js` (`page.evaluate`) | Legacy: writes **tile keys** straight into `inventory` |

`CHAIN_COLLECTED` already accepts `payload.chain` and runs rat / ore / pearl / fire / hazard spawn logic (`state.js` ~252–451). `COMMIT_CHAIN` duplicates that subset with the old inventory math.

**Plan:** Delete `COMMIT_CHAIN` in PR 3d. Migrate tests and e2e to dispatch `CHAIN_COLLECTED` with the same payloads `GameScene` would send (`chain`, `resourceKey`, etc.). No shared helper needed unless extraction reduces duplication *inside* `CHAIN_COLLECTED` only.

---

## Phase 0 — Audit doc sync (1 PR)

**Files:** `docs/hardcoded-special-cases-audit.md`

- [ ] **0.1** Add §12 Story / flags / chronicle (mine_unlocked vs level gate, `STORY_BUILDING_IDS`, `act3_win` / `festival_announced`).
- [ ] **0.2** Add §13 Quests / market / economy (`constants.js` vs `templates.js` QUEST_TEMPLATES, `MARKET_EVENTS`, almanac XP constants, bond decay).
- [ ] **0.3** Add §14 Fish / cartography (`TIDE_*` pools, `festivals` modal ∉ `KNOWN_MODALS`, map seed nodes).
- [ ] **0.4** Add §15 BM / feature flags (`balance.json` `resources` vs runtime `items`, boons tab no apply, `isDialogsDisabled` default).
- [ ] **0.5** Add §16 Tags / chain (`DEADLY_KEYS` vs `SPECIES_TAGS`, `COMMIT_CHAIN` vs `CHAIN_COLLECTED`, unwired tile tags).
- [ ] **0.6** Fix §2 / §7: note zone season drops **are** wired; `_syncWorkerEffects({ workers })` partial-state bug; remove stale `_workerEffects` on `state.js:818` reference.
- [ ] **0.7** Commit: `docs: expand post-migration audit (story, quests, BM, flags)`.

---

## Phase 1 — Critical player-impact (2–3 PRs)

### PR 1a — Dialog default + feature flags (after D1)

**Files:** `src/featureFlags.js`, `src/__tests__/featureFlags.test.js`, `CLAUDE.md`, optionally `prototype.jsx` (first-run `localStorage`).

- [ ] **1a.1** Implement chosen D1 behavior; update tests.
- [ ] **1a.2** Document QA vs production in `CLAUDE.md`.
- [ ] **1a.3** `npm test` → commit → PR (non-draft, auto-merge).

### PR 1b — Worker/building abilities on board fill (high impact)

**Files:** `src/GameScene.js`, `prototype.jsx`, `src/features/workers/aggregate.js`, tests in `src/__tests__/abilities-tile-aggregation.test.js` + new integration test.

- [ ] **1b.1** Write failing test: hired building with `pool_weight` changes spawn weight when `built` changes (registry `effectivePoolWeights`).
- [ ] **1b.2** Change `_syncWorkerEffects` to accept full state snapshot from registry (`built`, `tileCollectionActive`, `workers`) — mirror fields already synced in `prototype.jsx`.
- [ ] **1b.3** Re-run sync on `changedata-built`, `changedata-tileCollectionActive`, not only `changedata-workers`.
- [ ] **1b.4** `npm test` + manual board QA → commit → PR.

### PR 1c — Biome unlock single rule (after D1/D5)

**Files:** `src/state.js`, `src/ui/Town.jsx`, `src/features/zones/BiomeEntryModal.jsx`, `src/flags.js` / story, tests.

- [ ] **1c.1** Add `canEnterBiome(state, biomeKey)` helper: level gates (mine L2, fish L3) **and** story `unlockedBiomes` / flags where applicable.
- [ ] **1c.2** Use helper in `SWITCH_BIOME`, Town cards, `BiomeEntryModal`.
- [ ] **1c.3** Tests: story unlock without level, level without story, fish L3.
- [ ] **1c.4** Commit → PR.

---

## Phase 2 — Config boundary hygiene (2–3 PRs)

### PR 2a — Hazard IDs + tool clears

**Files:** `src/config/hazardIds.js` (new), `toolPowerRuntime.js`, `balanceManager/shared.jsx`, `features/mine/hazards.js` spawn keys.

- [ ] **2a.1** Canonical hazard id enum + `normalizeHazardId(id)` (maps `cave_in` ↔ `caveIn`, `gas` ↔ `gasVent`).
- [ ] **2a.2** Replace `_clearHazardTarget` if/else with map keyed by normalized id.
- [ ] **2a.3** Tests: clear_hazard with BM ids clears live `state.hazards`.
- [ ] **2a.4** Commit → PR.

### PR 2b — Hazards live loop (after D2, D3)

**Files:** `src/state.js`, `features/farm/rats.js`, `features/farm/hazards.js`, `featureFlags.js`, tests `farm-10.4`.

- [ ] **2b.1** Wire `tickRats` + `rollRatSpawn` on farm `CHAIN_COLLECTED` (respect single-active cap + `RATS_HAZARD_ENABLED`).
- [ ] **2b.2** Wire `FIRE_HAZARD_ENABLED` to BM / tuning draft (D2-C); default stays off until designer enables.
- [ ] **2b.3** Unify `DEADLY_KEYS` with `SPECIES_TAGS` / `deadly_pests` tag reader.
- [ ] **2b.4** Commit → PR.

### PR 2c — Tool drift quick fixes

**Files:** `farm/tools.js`, `state.js`, `GameScene.js` fillBoard, `Tools.jsx`, `puzzleBoard.jsx`.

- [ ] **2c.1** Remove `TAP_TARGET_TOOL_IDS`; disarm/refund uses `toolPendingPower` + `isTapTargetPower` only.
- [ ] **2c.2** `fillBoard` reads `fillBiasTarget` from registry (sync from state in `prototype.jsx`).
- [ ] **2c.3** Shuffle dispatches `USE_TOOL` / `reshuffle_board` only (remove direct `shuffleBoard()`).
- [ ] **2c.4** Commit → PR.

---

## Phase 3 — Structural merges (3–4 PRs)

### PR 3a — Boss pipeline (after D4)

**Files:** `features/boss/slice.js`, `features/bosses/data.js`, `GameScene.js`, boss tests.

- [ ] **3a.1** `triggerBoss` delegates to `spawnBoss(state, id, year, rng)`; store `modifier` + `modifierState` on `state.boss`.
- [ ] **3a.2** GameScene reads `boss.modifier.type` for freeze/rubble/heat/spawnBias (migrate off flat `BOSS_META` flags).
- [ ] **3a.3** Hook `tickModifier` on boss turn tick (or document intentional omission).
- [ ] **3a.4** Trim duplicate `BOSS_META` fields that copy `BOSSES[]`.
- [ ] **3a.5** Tests + visual boss scenarios → PR.

### PR 3b — Pool / season truth

**Files:** `farm/pool.js`, `GameScene.js`, `constants.js`, `prototype.jsx`.

- [ ] **3b.1** Either wire `getEffectivePool` into registry before fill **or** deprecate `SEASON_POOL_MODS` in Wiki/tests with explicit comment.
- [ ] **3b.2** Single function `buildSpawnPool(state)` used by tests and scene.
- [ ] **3b.3** Commit → PR.

### PR 3c — Quest templates + market

**Files:** `constants.js`, `features/quests/slice.js`, `market.js`, `balanceManager`, tests.

- [ ] **3c.1** Remove duplicate `QUEST_TEMPLATES` from `constants.js`; slice imports `templates.js` only.
- [ ] **3c.2** Fix `chain5` hardcoded length → template `minLength`.
- [ ] **3c.3** Fix `iron_rush` market key to `tile_mine_iron_ore` (or config-driven).
- [ ] **3c.4** Optional: `MARKET_EVENTS` BM section (after D7).
- [ ] **3c.5** Commit → PR.

### PR 3d — Remove `COMMIT_CHAIN` (D6)

**Files:** `state.js`, `features/farm/rats.js` (comment), tests, `tests/e2e/hazards.spec.js`.

- [ ] **3d.1** Optional: extract `resolveChainSpecials(state, chainTiles)` used only by `CHAIN_COLLECTED` if it shrinks the case block.
- [ ] **3d.2** Delete `case "COMMIT_CHAIN"` from `coreReducer`.
- [ ] **3d.3** Migrate `farm-10.4`, `farm-10.7`, `mine-9.*`, e2e hazards to `CHAIN_COLLECTED` payloads.
- [ ] **3d.4** Commit → PR.

---

## Phase 4 — UI & BM single source (2–3 PRs)

### PR 4a — `TOOL_CATALOG` from `ITEMS`

**Files:** `ui/toolRegistry.js`, `Tools.jsx`, `puzzleBoard.jsx`, `icon-audit.test.js`, visual scenarios for tools.

- [ ] **4a.1** Generate catalog rows from `ITEMS` tools + `isTapTargetPower`; UI-only fields (`category`) in small overlay map.
- [ ] **4a.2** Add sickle icon texture + registry key.
- [ ] **4a.3** `npm run test:visual` + update goldens → PR.

### PR 4b — Balance export key alignment

**Files:** `config/balance.json`, `balanceManager/ExportTab.jsx`, `balanceManager/diff.js`, `applyOverrides.js`, schema md.

- [ ] **4b.1** Align committed schema: `items` not `resources` (migration script for existing JSON).
- [ ] **4b.2** Export tab writes `items`; test that committed overrides apply to `ITEMS`.
- [ ] **4b.3** Add BM stubs or `apply*BoonOverrides` for boons/castle/market (scope per D7).
- [ ] **4b.4** Commit → PR.

### PR 4c — Router / modals

**Files:** `router.js`, `cartography/slice.js`, feature `viewKey` exports.

- [ ] **4c.1** Add `festivals` to `KNOWN_MODALS` or change node to known modal.
- [ ] **4c.2** Test/codegen: `KNOWN_VIEWS` matches feature `viewKey` exports.
- [ ] **4c.3** Commit → PR.

---

## Phase 5 — Tile vs resource tail (D5-A)

Core PR-3 chain split is **done**. This phase finishes edges that still write or trade tile keys as inventory.

### PR 5a — Tool clears + market

**Files:** `GameScene.js` (`_emitClearGains`), `market.js`, `constants.js` (`MARKET_PRICES`), `state.js` (`BUY_RESOURCE` comment).

- [ ] **5a.1** `_emitClearGains` credits via `resourceKey` / `resourceProgress` (or resource keys directly), not tile keys.
- [ ] **5a.2** Migrate `MARKET_PRICES` / `MARKET_EVENTS` to resource keys; fix `iron_rush` mult key.
- [ ] **5a.3** Tests: market buy/sell, tool scythe-style clear.
- [ ] **5a.4** Commit → PR.

### PR 5b — Caps + docs

**Files:** `constants.js`, `state/helpers.js`, `CLAUDE.md`.

- [ ] **5b.1** Remove `CAPPED_TILES` from inventory cap union once nothing writes tile keys to `inventory`.
- [ ] **5b.2** Update `CLAUDE.md`: PR 3 done; list tail completed here; remove stale `LONG_CHAIN_BONUSES` reference (not in repo).
- [ ] **5b.3** Commit → PR.

## Phase 6 — Lower priority / follow-on

- [ ] `DEFERRED_TOOL_POWERS` (22) — separate product spec.
- [ ] Achievement counters via `CATEGORY_OF` + fish resources.
- [ ] Pig-in-disguise / unwired tile tag behaviors.
- [ ] Fertilizer armed state fully on `toolPendingPower` (remove `fertilizerActive`).
- [ ] `playBoardAnimation` respects `power.ms`; board anim alias map.

---

## Verification matrix (every PR)

| Check | When |
|-------|------|
| `npm test` | Always |
| `npm run lint` | Always |
| `npm run build` | Always |
| `npm run test:visual` | UI / textures / `GameScene` / feature panels |
| Dev Panel Wiki smoke | BM schema / ITEMS changes |
| `pre-pr-check` skill | Before each PR |

---

## Suggested execution order (D7: A → B → C)

```text
Phase 0 (audit doc)

── A: Player impact ──
Phase 1: 1a dialogs → 1b worker effects → 1c biome unlock
Phase 2: 2b rats (+ fire BM toggle) → 2a hazard ids → 2c tool drift

── Structural (supports A, pre-B) ──
Phase 3: 3d drop COMMIT_CHAIN → 3a boss merge → 3b pools → 3c quests/market keys

── B: BM / export ──
Phase 4: 4b balance.json items + boon/market stubs → 4c router/modals

── D5 tail ──
Phase 5: 5a tool clears + market resources → 5b caps + CLAUDE.md

── C: UI ──
Phase 4 (continued): 4a TOOL_CATALOG from ITEMS (+ visual goldens)

── Follow-on ──
Phase 6: deferred powers, tags, fertilizer UX, anim ms
```

**Estimated PR count:** ~16 focused PRs (repo rule: one PR per branch, no post-open commits).

---

## Task index (agent checklist)

| ID | Summary | Phase |
|----|---------|-------|
| 0.x | Expand audit doc | 0 |
| 1a | Dialog / feature-flag default | 1 |
| 1b | Full-state worker effects on canvas | 1 |
| 1c | Unified biome unlock | 1 |
| 2a | Hazard id normalization | 2 |
| 2b | Rats/fire/deadly pests wiring | 2 |
| 2c | Tool TAP_TARGET, fill bias, shuffle | 2 |
| 3a | Boss spawnBoss merge | 3 |
| 3b | Season pool truth | 3 |
| 3c | Quest templates + market keys | 3 |
| 3d | Remove COMMIT_CHAIN | 3 |
| 4b | balance.json items + BM | 4 (B) |
| 4c | Router/modal drift | 4 (B) |
| 5a | Tool clears + market resources | 5 (D5) |
| 5b | Caps + CLAUDE.md | 5 (D5) |
| 4a | TOOL_CATALOG generation | 4 (C) |
| 6.x | Deferred powers, tags, anim | 6 |
