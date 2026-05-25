# Config Override Remediation — Agent Execution Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` (`.claude/skills/subagent-driven-development/SKILL.md`) to implement **one PR branch at a time**. Use `verification-before-completion` before claiming any PR is done. Use `pre-pr-check` before opening each PR. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make runtime, UI, Dev Panel, and docs honor catalog/config data — fix player-visible bugs first, then structural single-source-of-truth merges, then BM/UI polish.

**Architecture:** One canonical object per domain (`ITEMS`, `HAZARDS`, `BOSSES`, `QUEST_TEMPLATES`, `BUILDINGS`, …) with thin adapters (registry sync, UI rows, BM export). Shared helpers: `isTapTargetPower`, `normalizeHazardId`, `computeAggregatedAbilities(fullState)`, `canEnterBiome`. Live board path is **`CHAIN_COLLECTED` only** — delete legacy chain actions.

**Tech stack:** React `useReducer` (`prototype.jsx` → `src/state.js`), Phaser (`src/GameScene.js`), Vitest (`npm test`), Playwright visual (`npm run test:visual`), Dev Panel `/b/`, balance JSON `src/config/balance.json`.

**Companion docs:**
- Inventory (read-only reference): `docs/hardcoded-special-cases-audit.md`
- Roadmap summary: `docs/superpowers/plans/2026-05-25-config-override-remediation.md`

**Historical (do not re-implement):**
- Tool-power consolidation: [PR #634](https://github.com/grimatoma/puzzleDrag2/pull/634) — shipped
- UX audit scope: PRs #406–#422 — shipped
- Removed plans: `docs/tool-power-animation-consolidation-plan.md`, `docs/UX_AUDIT_INVENTORY.md`

---

## 0. Agent onboarding (read before coding)

- [ ] **0.0.1** Read `CLAUDE.md` / `AGENTS.md` — commands, PR freeze rule, merge commits, visual goldens.
- [ ] **0.0.2** Read `.cursor/rules/cursor-superpowers.mdc` — load skills via **Read** on `.claude/skills/<name>/SKILL.md` when relevant.
- [ ] **0.0.3** Skim `docs/hardcoded-special-cases-audit.md` for full finding list.
- [ ] **0.0.4** Confirm `main` is current: `git fetch origin main && git checkout main && git pull origin main`.

### Repo rules (non-negotiable)

| Rule | Detail |
|------|--------|
| **Branch prefix** | `cursor/<descriptive-name>-3f3e` (lowercase) |
| **One PR per branch** | Stage everything, test, commit, push, **then** open PR. **Never push** to a branch after its PR exists (auto-merge orphans commits). |
| **PRs** | Non-draft; enable auto-merge; merge with **merge commit** (not squash). |
| **Visual tests** | Run `npm run test:visual` (+ `test:visual:update` if intentional UI change) for edits under `src/features/`, `src/ui/`, `src/textures/`, `src/GameScene.js`. |
| **Verification** | Every PR: `npm test`, `npm run lint`, `npm run build`. |
| **No production fakes** | No mocks in `src/` — tests only under `tests/` and `src/__tests__/`. |

### Verification commands (copy per PR)

```bash
npm test
npm run lint
npm run build
# If UI/canvas affected:
npm run test:visual
```

---

## 1. Locked product decisions (2026-05-25)

Do not change without human approval.

| ID | Decision |
|----|----------|
| **D1-A** | `isDialogsDisabled()` defaults **`false`** (dialogs on for normal play). |
| **D2-C** | Keep `FIRE_HAZARD_ENABLED`; wire toggle via Dev Panel / balance draft — do not hard-enable in code. |
| **D3-A** | Wire `rollRatSpawn` + `tickRats` on farm `CHAIN_COLLECTED`. |
| **D4-A** | `triggerBoss` → `spawnBoss`; GameScene uses `modifier` + `modifierState`. |
| **D5-A** | Tile/resource **tail** in scope (market, tool clears, caps) — core chain→`resourceProgress` already shipped. |
| **D6** | **`CHAIN_COLLECTED` only** — delete `COMMIT_CHAIN`, `CHAIN_COMMIT`, `USE_TOOL_BOMB`. |
| **D7** | Execute tracks **A → B → C** (player impact → BM/export → UI catalog). |

### Chain actions (D6 detail)

| Action | Production? | Action |
|--------|-------------|--------|
| `CHAIN_COLLECTED` | **Yes** — `GameScene` + `prototype.jsx` | Keep; sole chain path |
| `COMMIT_CHAIN` | No — tests + `tests/e2e/hazards.spec.js` only | Delete; migrate tests |
| `CHAIN_COMMIT` | No — species/power-hook tests only | Delete; logic lives in `applyTileCollectionChainEffects` on live path |
| `USE_TOOL_BOMB` | No dispatchers | Delete `case` in `state.js` |

### Tile vs resource (already done vs tail)

**Done (live drag chains):** `GameScene.collectPath` → `resourceKey` → `state.resourceProgress` → inventory resource keys; board upgrades via `nextUpgradeTile` / zone `upgradeMap`.

**Tail (this plan):** `_emitClearGains` (tools), `MARKET_PRICES`/`MARKET_EVENTS` tile keys, `CAPPED_TILES` in cap union, stale `CLAUDE.md` symbols (`MINE_ENTRY_TIERS`, `LONG_CHAIN_BONUSES`, winter minChain 5, fish “no tide”).

### Doc ghosts to fix in `CLAUDE.md` (PR 5b)

| Doc claim | Reality |
|-----------|---------|
| `MINE_ENTRY_TIERS` | Symbol **absent** — use `ZONES[].entryCost` + `EXPEDITION/DEPART` |
| `LONG_CHAIN_BONUSES` | File **absent** |
| Winter min chain 5 | Removed with calendar; boss min only in `GameScene._effectiveMinChain` |
| Fish “no tide/pearl yet” | `fish/slice.js` tides + pearl in `CHAIN_COLLECTED` |

---

## 2. Execution order (follow this sequence)

```text
PR-00  Expand audit doc (docs only)
── Track A: player impact ──
PR-01a Dialogs default on
PR-01d HUD XP bar + almanac extraTurn/goldSeal
PR-01b Worker/building/tile abilities on fill
PR-01c Unified biome unlock + story flags
PR-02b Rats spawn/tick + fire BM toggle + deadly tags
PR-02a Hazard id normalization
PR-02c Tool TAP_TARGET, fill bias, shuffle path
PR-04d Fairground / festivals modal
── Structural ──
PR-03d Remove COMMIT_CHAIN, CHAIN_COMMIT, USE_TOOL_BOMB
PR-03a Boss spawnBoss pipeline
PR-03b Season pool truth (SEASON_POOL_MODS vs fill)
PR-03c Quest templates + market keys
PR-02d Building abilities (granary) + phantom mining_camp/pier
── Track B: BM / export ──
PR-04b balance.json `items` key + optional boon/market BM
PR-04c Router KNOWN_VIEWS / modals
── Track D5: tile/resource tail ──
PR-05a Tool clears + market resource keys
PR-05b Caps + CLAUDE.md cleanup
── Track C: UI ──
PR-04a TOOL_CATALOG from ITEMS + sickle icon + visual goldens
── Follow-on (optional separate program) ──
PR-06   Phase 6 backlog (deferred tool powers, anim ms, fertilizer flag, …)
```

**~18 PRs.** Each PR = new branch from latest `main` after previous merges (or parallel only when files do not overlap — prefer sequential for safety).

---

## 3. Priority matrix (what hurts players first)

| Priority | Issue | PR |
|----------|-------|-----|
| P0 | Dialogs off by default | 01a |
| P0 | HUD XP bar uses wrong curve (`xpForLevel` vs `XP_PER_LEVEL=150`) | 01d |
| P0 | Building pool weights ignored on canvas | 01b |
| P0 | Fairground sets `modal: 'festivals'` — no component | 04d |
| P1 | Rats enabled but never spawn/tick | 02b |
| P1 | `iron_rush` market event dead key | 03c / 05a |
| P1 | Tool clears credit tile keys | 05a |
| P1 | Biome unlock inconsistent (fish L3, story mine) | 01c |
| P1 | Almanac `extraTurn` / `goldSeal` claimed but inert | 01d |
| P2 | Boss dual pipeline | 03a |
| P2 | `COMMIT_CHAIN` legacy inventory | 03d |
| P2 | Granary +1 turn / cap 500 hardcoded | 02d |
| P3 | BM `resources` vs `items` | 04b |
| P3 | `TOOL_CATALOG` drift | 04a |

---

## PR-00 — Expand audit document

**Branch:** `cursor/audit-doc-expand-3f3e`  
**Files:** `docs/hardcoded-special-cases-audit.md` only

- [ ] **00.1** Add §12 Story/flags (`mine_unlocked` vs level, `unlockedBiomes`, `flagReads.js` drift).
- [ ] **00.2** Add §13 Quests/market (dual `QUEST_TEMPLATES`, `iron_rush`, almanac XP amounts).
- [ ] **00.3** Add §14 Fish/cartography (tide pools, `festivals` modal).
- [ ] **00.4** Add §15 BM/flags (`balance.json` items key, dialog default).
- [ ] **00.5** Add §16 Tags/chain (`DEADLY_KEYS`, delete `CHAIN_COMMIT`).
- [ ] **00.6** Add §17 Building abilities vs hardcode (granary, mining_camp, pier).
- [ ] **00.7** Add §18 Almanac/HUD (`xpForLevel`, structural rewards).
- [ ] **00.8** Add §19 Deprecated doc symbols.
- [ ] **00.9** Fix §7 — remove wrong `state.js:818` `_workerEffects` reference; document `_syncWorkerEffects` partial state.
- [ ] **00.10** `git commit -m "docs: expand post-migration config override audit"` → PR → merge.

---

## PR-01a — Dialogs default on (D1-A)

**Branch:** `cursor/dialogs-default-on-3f3e`  
**Files:**
- Modify: `src/featureFlags.js`
- Modify: `src/__tests__/featureFlags.test.js`
- Modify: `CLAUDE.md` (Testing a specific UI — clarify opt-out vs opt-in)

- [ ] **01a.1** In `isDialogsDisabled()`, change final `return true` to `return false` (after localStorage / `__HEARTH_DISABLE_DIALOGS__` checks).
- [ ] **01a.2** Update `featureFlags.test.js`: default test expects `false`; `localStorage '1'` → `true`; `'0'` still forces off when explicitly set.
- [ ] **01a.3** Update `CLAUDE.md` to say production shows dialogs unless `hearth.disableDialogs=1` or test global.
- [ ] **01a.4** Run `npm test -- src/__tests__/featureFlags.test.js`.
- [ ] **01a.5** Commit, push, PR, merge.

---

## PR-01d — HUD XP + almanac structural rewards

**Branch:** `cursor/hud-almanac-rewards-3f3e`  
**Files:**
- Modify: `src/ui/Hud.jsx`
- Modify: `src/features/zones/data.js` (`turnBudgetForZone`, `turnBudgetAdditiveBonusForZone`)
- Modify: `src/state/helpers.js` or order payout path for `goldSeal`
- Modify: `src/features/almanac/data.js` (comments only if needed)
- Test: new or extend `src/__tests__/almanac-7.2.test.js`, `src/__tests__/turn-budget-and-keeper-trials.test.js`

**Problem:** HUD uses `xpForLevel(level)` (`50 + l*80`) but leveling uses `XP_PER_LEVEL = 150` in `awardXp`. Tier 8 `extraTurn` sets `tools.extraTurn` but `turnBudgetForZone` never reads it. Tier 7 `goldSeal` has no order payout hook.

- [ ] **01d.1** Write failing test: at `almanac.xp = 75`, `level = 1`, HUD progress denominator should be 150 (not `xpForLevel(1)=130`).
- [ ] **01d.2** Change `Hud.jsx` to compute progress within level:
  - `const xpInLevel = (state.almanac?.xp ?? state.xp ?? 0) % XP_PER_LEVEL` (import `XP_PER_LEVEL` from `features/almanac/data.js`)
  - `const xpNeed = XP_PER_LEVEL`
  - Use `state.almanac?.level ?? state.level` for display level
- [ ] **01d.3** In `turnBudgetAdditiveBonusForZone`, add `if (state.tools?.extraTurn) bonus += 1` (or read from almanac claimed tier — prefer `tools.extraTurn` flag already set on claim).
- [ ] **01d.4** Write test: state with `tools.extraTurn: true` → `turnBudgetForZone` +1 vs baseline.
- [ ] **01d.5** Wire `goldSeal`: in order turn-in path (`state.js` `TURN_IN_ORDER` or helper), if `state.tools?.goldSeal`, multiply coin reward by `1.1` (floor). Add test in order or almanac test file.
- [ ] **01d.6** Fix `DEV/ADD_LEVEL` (`state.js` ~1486) to use `applyAlmanacXp` or sync `state.almanac` when mutating level.
- [ ] **01d.7** `npm test` → commit → PR → merge.

---

## PR-01b — Full-state worker effects on board fill

**Branch:** `cursor/worker-effects-fill-3f3e`  
**Files:**
- Modify: `src/GameScene.js` (`_syncWorkerEffects`, registry listeners in `create`)
- Modify: `prototype.jsx` (ensure registry fields exist before sync — `built`, `tileCollectionActive`, `workers`)
- Test: `src/__tests__/abilities-tile-aggregation.test.js` + new test file e.g. `src/__tests__/scene-worker-effects-sync.test.js`

- [ ] **01b.1** Write failing test: after syncing registry with `built: { home: { granary: true } }` and a granary `pool_weight` ability on `BUILDINGS`, `effectivePoolWeights` in registry reflects boost (may require exporting test hook or testing via `computeAggregatedAbilities` mirror).
- [ ] **01b.2** Replace `computeWorkerEffects({ workers })` with `computeAggregatedAbilities` from `features/workers/aggregate.js` using snapshot:
  ```js
  const snapshot = {
    workers: this.registry.get("workers") ?? { hired: {} },
    built: this.registry.get("built") ?? {},
    tileCollection: this.registry.get("tileCollectionActive") ? { activeByCategory: this.registry.get("tileCollectionActive") } : {},
    // match shape expected by builtBuildingSources / discoveredTileSources
  };
  ```
  Inspect `aggregate.js` for exact state shape — mirror what reducer passes in tests.
- [ ] **01b.3** Register `changedata-built` and `changedata-tileCollectionActive` (or whatever keys `prototype.jsx` sets) to call `_syncWorkerEffects`.
- [ ] **01b.4** `npm test` → manual: Dev Panel ability on building changes farm spawn → commit → PR.

---

## PR-01c — Unified biome unlock

**Branch:** `cursor/biome-unlock-helper-3f3e`  
**Files:**
- Create: `src/state/biomeAccess.js` (or `src/features/zones/biomeAccess.js`)
- Modify: `src/state.js` (`SWITCH_BIOME`, `SET_BIOME` if present, `EXPEDITION/DEPART`)
- Modify: `src/ui/Town.jsx`
- Modify: `src/features/zones/BiomeEntryModal.jsx`
- Test: `src/__tests__/expedition-depart.test.js`, new `src/__tests__/biome-access.test.js`

- [ ] **01c.1** Implement `canEnterBiome(state, biomeKey)`:
  - `mine`: `state.level >= 2` AND (`state.unlockedBiomes?.mine` OR `state.flags?.mine_unlocked` — pick one canonical flag, set story to match)
  - `fish`: `state.level >= 3` AND zone has `hasWater` when entering from expedition
  - `farm`: always true
- [ ] **01c.2** Replace inline checks in `SWITCH_BIOME` (~589) and expedition depart fish gate.
- [ ] **01c.3** Town board cards: use helper for mine **and** fish lock UI.
- [ ] **01c.4** Tests for L1 fish blocked, L2 mine blocked without flag, story unlock path.
- [ ] **01c.5** Update `flagReads.js` or story comments if `mine_unlocked` is wired.
- [ ] **01c.6** Commit → PR → merge.

---

## PR-02b — Rats, fire BM toggle, deadly pests tags

**Branch:** `cursor/hazards-rats-fire-3f3e`  
**Files:**
- Modify: `src/state.js` (farm `CHAIN_COLLECTED` hazard block ~428)
- Modify: `src/features/farm/rats.js`
- Modify: `src/features/farm/hazards.js`, `src/features/farm/deadlyPests.js`
- Modify: `src/featureFlags.js`, `src/balanceManager/tabs/FlagsTab.jsx` or Tuning (D2-C)
- Test: `src/__tests__/farm-10.4.test.js`, `tests/e2e/hazards.spec.js` (later with 03d)

- [ ] **02b.1** Import `rollRatSpawn`, `tickRats` in `state.js`.
- [ ] **02b.2** On farm `CHAIN_COLLECTED` after fire/wolves ticks: call `tickRats`, then `rollRatSpawn` if single-active cap allows (mirror fire/wolves cap logic).
- [ ] **02b.3** Respect `RATS_HAZARD_ENABLED` from `featureFlags.js`.
- [ ] **02b.4** D2-C: expose `FIRE_HAZARD_ENABLED` in Dev Panel flags/tuning JSON → applied at startup or via draft merge (follow pattern used for other flags in `flags.js` / `constants.js` overrides).
- [ ] **02b.5** Replace `DEADLY_KEYS` usage with `hasTag(key, 'deadly_pests')` from `features/tileCollection/tags.js` (or shared helper).
- [ ] **02b.6** `npm test` → commit → PR.

---

## PR-02a — Hazard ID normalization

**Branch:** `cursor/hazard-id-normalize-3f3e`  
**Files:**
- Create: `src/config/hazardIds.js`
- Modify: `src/state/toolPowerRuntime.js`
- Modify: `src/balanceManager/shared.jsx` (`hazardOptions`)
- Test: `src/__tests__/hazard-ids.test.js`

- [ ] **02a.1** Export `normalizeHazardId(id)` mapping `cave_in`↔`caveIn`, `gas_vent`/`gas`↔`gasVent`, etc.
- [ ] **02a.2** Replace `_clearHazardTarget` if/else with map keyed by normalized runtime keys.
- [ ] **02a.3** Test: `clear_hazard` with param `cave_in` clears `state.hazards.caveIn`.
- [ ] **02a.4** Commit → PR.

---

## PR-02c — Tool drift (TAP_TARGET, fill bias, shuffle)

**Branch:** `cursor/tool-drift-fixes-3f3e`  
**Files:**
- Modify: `src/features/farm/tools.js` (remove or stop exporting stale `TAP_TARGET_TOOL_IDS`)
- Modify: `src/state.js` (`disarmAllTools`, remove `TAP_TARGET_TOOL_KEYS` usage)
- Modify: `src/GameScene.js` (`fillBoard` reads `fillBiasTarget` from registry)
- Modify: `prototype.jsx` (sync `fillBiasTarget` from state)
- Modify: `src/ui/Tools.jsx`, `src/ui/puzzleBoard.jsx` (shuffle → dispatch `USE_TOOL`)

- [ ] **02c.1** Remove `TAP_TARGET_TOOL_IDS`; `disarmAllTools` uses only `toolPendingPower` + `isTapTargetPower`.
- [ ] **02c.2** `fillBoard`: when fertilizer/`fillBiasTarget` set, bias spawn list from that resource/tile key list — not hardcoded hay/wheat only.
- [ ] **02c.3** Remove direct `shuffleBoard()` calls; dispatch shuffle tool through reducer.
- [ ] **02c.4** `npm test` → commit → PR.

---

## PR-04d — Fairground / festivals modal

**Branch:** `cursor/festivals-modal-3f3e`  
**Files:**
- Modify: `src/router.js` (`KNOWN_MODALS`)
- Either: create `src/features/festivals/index.jsx` with `modalKey = "festivals"` OR change `cartography/slice.js` `festival` case to route to existing view/modal (e.g. town + bubble)

**Pick one approach (prefer minimal):**
- **A)** Register `festivals` modal component (placeholder UI: "Fairground — coming soon" + Dismiss) so travel does not noop.
- **B)** Change `kind: 'festival'` travel to `view: 'town'` + informative bubble only.

- [ ] **04d.1** Implement chosen approach.
- [ ] **04d.2** Add test or e2e: travel to festival node does not leave `modal` in broken state.
- [ ] **04d.3** Commit → PR.

---

## PR-03d — Delete legacy chain actions (D6)

**Branch:** `cursor/remove-legacy-chain-actions-3f3e`  
**Files:**
- Modify: `src/state.js` (delete cases)
- Modify: tests listed below, `tests/e2e/hazards.spec.js`
- Optional: `src/state/chainSpecials.js` extract from `CHAIN_COLLECTED` only

- [ ] **03d.1** Delete `case "COMMIT_CHAIN":` (~1170–1250).
- [ ] **03d.2** Delete `case "CHAIN_COMMIT":` (~1370).
- [ ] **03d.3** Delete `case "USE_TOOL_BOMB":` (~1272).
- [ ] **03d.4** Migrate tests to `CHAIN_COLLECTED` with `{ chain, resourceKey, gained, ... }` payloads matching `GameScene` emission.
- [ ] **03d.5** Update e2e `hazards.spec.js` to use `CHAIN_COLLECTED` or visual bridge.
- [ ] **03d.6** `npm test` && `npm run test:e2e` (if feasible) → commit → PR.

---

## PR-03a — Boss pipeline merge (D4-A)

**Branch:** `cursor/boss-spawn-pipeline-3f3e`  
**Files:**
- Modify: `src/features/boss/slice.js`
- Modify: `src/features/bosses/data.js`, `modifiers.js`
- Modify: `src/GameScene.js` (read `boss.modifier`, apply freeze/rubble/heat)
- Test: `src/__tests__/boss-8.3.test.js`, `boss-coverage.test.js`, visual boss scenarios

- [ ] **03a.1** `triggerBoss`: call `spawnBoss(state, bossKey, year, rng)`; merge result into `state.boss` including `modifierState`.
- [ ] **03a.2** GameScene: on boss active, apply grid patches from `modifierState` (frozen columns, rubble, heat) using existing modifier helpers.
- [ ] **03a.3** Wire `tickModifier` on boss turn advance (find turn tick in boss slice or `CHAIN_COLLECTED` / `CLOSE_SEASON`).
- [ ] **03a.4** Trim redundant `BOSS_META` fields that duplicate `BOSSES[]` (keep emoji/flavor only if not in BOSSES).
- [ ] **03a.5** `npm test`; `npm run test:visual` if boss UI changes → commit → PR.

---

## PR-03b — Season pool truth

**Branch:** `cursor/spawn-pool-truth-3f3e`  
**Files:**
- Modify: `src/features/farm/pool.js`, `src/GameScene.js`, `prototype.jsx`, `src/constants.js` (comments)

- [ ] **03b.1** Decide: wire `getEffectivePool(state)` into registry before `fillBoard` **OR** mark `SEASON_POOL_MODS` deprecated with Wiki/Dev Panel note and stop claiming seasonal spawn in docs.
- [ ] **03b.2** If wiring: push effective pool keys/weights to registry in bridge; `fillBoard` samples from it.
- [ ] **03b.3** Add test: Spring changes blackberry weight vs Winter hay penalty.
- [ ] **03b.4** Commit → PR.

---

## PR-03c — Quest templates + market keys

**Branch:** `cursor/quests-market-keys-3f3e`  
**Files:**
- Modify: `src/constants.js` (remove duplicate `QUEST_TEMPLATES` export or rename legacy)
- Modify: `src/features/quests/slice.js`
- Modify: `src/market.js`
- Test: `src/__tests__/quests-slice-coverage.test.js`, `src/__tests__/market.test.js`

- [ ] **03c.1** Point `quests/slice.js` at `features/quests/templates.js` only; rename legacy 6-entry list if still needed for daily dice.
- [ ] **03c.2** `chain5` progress: use template `minLength` not hardcoded `5`.
- [ ] **03c.3** Fix `iron_rush` mult to `tile_mine_iron_ore` (verify against `MARKET_PRICES` keys).
- [ ] **03c.4** Commit → PR.

---

## PR-02d — Building abilities vs hardcode

**Branch:** `cursor/building-abilities-granary-3f3e`  
**Files:**
- Modify: `src/constants.js` (`BUILDINGS.granary.abilities`)
- Modify: `src/features/zones/data.js` (`turnBudgetAdditiveBonusForZone`, `expeditionTurnsForFood`)
- Modify: `src/utils.js` (`currentCap`)
- Modify: `src/config/abilitiesAggregate.js` if needed
- Add rows to `BUILDINGS` for `mining_camp` OR change expedition checks to real ids

- [ ] **02d.1** Add abilities to `BUILDINGS.granary`: `turn_budget_bonus: 1`, `inventory_cap_bonus: 300` (500-200) — tune via ability schema used elsewhere.
- [ ] **02d.2** Remove hardcoded `if (built.granary) bonus += 1` and cap 500 branch; use aggregator.
- [ ] **02d.3** Align `mining_camp` / `pier`: either add stub buildings to `BUILDINGS` or map `mining_camp` → existing structure id used in town (`harbor_dock` for pier).
- [ ] **02d.4** Tests for expedition +1 with mining camp built.
- [ ] **02d.5** Commit → PR.

---

## PR-04b — Balance JSON `items` key (Track B)

**Branch:** `cursor/balance-json-items-3f3e`  
**Files:**
- Modify: `src/config/balance.json`, `balance.schema.md`
- Modify: `src/balanceManager/ExportTab.jsx`, `diff.js`, `index.jsx`
- Test: `src/__tests__/bm-config-overrides.test.js`

- [ ] **04b.1** Rename `resources` → `items` in committed `balance.json`; migration note in commit body.
- [ ] **04b.2** Export tab exports `items`; test `applyItemOverrides(ITEMS, overrides.items)` changes a label/value in vitest.
- [ ] **04b.3** Optional: stub BM sections for `marketEvents`, `boons` (read-only OK for v1).
- [ ] **04b.4** Commit → PR.

---

## PR-04c — Router and modals

**Branch:** `cursor/router-modals-sync-3f3e`  
**Files:**
- Modify: `src/router.js`
- Test: `src/__tests__/commandPalette.test.js` or new router test

- [ ] **04c.1** Document in `router.js` comments: `season`, `leaveBoard`, `runSummary` intentionally excluded from `KNOWN_MODALS`.
- [ ] **04c.2** Add test script or vitest: every `export const viewKey` in `src/features/*/index.jsx` is in `KNOWN_VIEWS` (or aliased).
- [ ] **04c.3** Commit → PR.

---

## PR-05a — Tool clears + market resources (D5)

**Branch:** `cursor/tile-resource-tail-market-3f3e`  
**Files:**
- Modify: `src/GameScene.js` (`_emitClearGains`)
- Modify: `src/constants.js` (`MARKET_PRICES`, document resource-only)
- Modify: `src/market.js` (`MARKET_EVENTS`)

- [ ] **05a.1** `_emitClearGains`: for each cleared tile, map to `resourceKey` via `producedResource(tile)` / `tileFamilyResource`; emit `CHAIN_COLLECTED` with `resourceKey` and `noTurn: true` (or call shared helper that increments `resourceProgress`).
- [ ] **05a.2** Migrate `MARKET_PRICES` keys to resource keys where items are resources; keep tile keys only if market intentionally sells board pieces — prefer resources only.
- [ ] **05a.3** Update `MARKET_EVENTS` mults to use same keys.
- [ ] **05a.4** Tests: scythe-style clear adds `hay_bundle` not `tile_grass_hay`; market event mult applies.
- [ ] **05a.5** Commit → PR.

---

## PR-05b — Caps + CLAUDE cleanup (D5)

**Branch:** `cursor/tile-resource-claude-3f3e`  
**Files:**
- Modify: `src/state/helpers.js`, `src/state.js` (`BUY_RESOURCE` cap check)
- Modify: `CLAUDE.md`

- [ ] **05b.1** Remove `CAPPED_TILES` from inventory cap union in `INVENTORY_CAPPED_KEYS` / `addCappedResourceMut` paths once 05a verified.
- [ ] **05b.2** CLAUDE: remove `MINE_ENTRY_TIERS`, `LONG_CHAIN_BONUSES`, fix winter minChain sentence, fix fish tide/pearl sentence, note PR-3 resourceProgress model.
- [ ] **05b.3** Commit → PR.

---

## PR-04a — TOOL_CATALOG from ITEMS (Track C)

**Branch:** `cursor/tool-catalog-from-items-3f3e`  
**Files:**
- Modify: `src/ui/toolRegistry.js`, `Tools.jsx`, `puzzleBoard.jsx`
- Modify: `src/textures/` (sickle icon)
- Test: `src/__tests__/icon-audit.test.js`, `toolPowersCatalog.test.js`
- Visual: `src/visualTesting/matrix.js`, run `npm run test:visual:update`

- [ ] **04a.1** Generate `TOOL_CATALOG` rows from `ITEMS` where `kind==='tool'`.
- [ ] **04a.2** `isTapTargetTool(key)` → `isTapTargetPower(ITEMS[key]?.power?.id)`.
- [ ] **04a.3** Add sickle texture + `iconRegistry` entry; fix `icon-audit` test.
- [ ] **04a.4** `npm run test:visual` → update goldens → commit → PR.

---

## PR-06 — Follow-on backlog (optional)

Not required to close this program. Open separate PRs if prioritized.

| Item | Files | Notes |
|------|-------|-------|
| `DEFERRED_TOOL_POWERS` (22) | `toolPowers.js` | Product spec required |
| `fertilizerActive` → `toolPendingPower` only | `state.js`, UI | Remove parallel flag |
| `playBoardAnimation` + `power.ms` | `GameScene.js` | Cosmetic |
| Achievement fish in upgrade credit | `achievements/slice.js` | Include `BIOMES.fish.resources` |
| `MAGIC_TOOLS` from `ITEMS` | `portal/data.js` | Dedup catalog |
| Fish tide from config | `fish/slice.js` | Move pools to `BIOMES.fish` |
| `CONVERT_TO_SUPPLY` ratio | `state.js` | Config in expedition tuning |
| Wolf prey from `avoids_wolves` tag | `farm/hazards.js` | Replace `WOLF_BIRD_KEYS` |
| Phase 6 anim alias map | `boardAnimations.js` | Map `chops` etc. |

---

## 4. Per-PR checklist (copy every time)

```markdown
- [ ] Branch from latest origin/main
- [ ] Implement + tests
- [ ] npm test && npm run lint && npm run build
- [ ] Visual tests if UI/canvas (see CLAUDE.md)
- [ ] Read `.claude/skills/pre-pr-check/SKILL.md` → run checks
- [ ] git add -A && git commit && git push -u origin <branch>
- [ ] Open PR (non-draft), enable auto-merge, merge commit
- [ ] Do NOT push further commits to that branch
```

---

## 5. Key file map (quick reference)

| Domain | Canonical data | Runtime consumer | Common bug |
|--------|----------------|------------------|------------|
| Tools | `ITEMS[].power`, `toolPowers.js` | `toolPowerRuntime.js`, `GameScene.applyToolPower` | `TOOL_CATALOG`, `TAP_TARGET_*` |
| Chains | `CHAIN_COLLECTED` payload | `state.js` case ~223 | `COMMIT_CHAIN` legacy |
| Fill pool | `BIOMES.pool`, abilities | `GameScene.fillBoard`, registry weights | `SEASON_POOL_MODS` unwired |
| Hazards | `HAZARDS`, `FARM_HAZARD_META` | `state.js` on chain | rats unwired; id casing |
| Bosses | `BOSSES`, `modifiers.js` | should be `boss/slice` + scene | `BOSS_META` only |
| Orders | `BIOMES.resourceOrderPool`, `RECIPES` | `helpers.makeOrder` | crafted pools hardcoded |
| Biomes | levels, flags, zones | `biomeAccess` (to add) | Town vs modal vs reducer |
| BM | `balance.json` → `BALANCE_OVERRIDES` | `constants.js` apply* | `resources` vs `items` |
| Almanac | `almanac/data.js` | `awardXp`, HUD | `xpForLevel` legacy |

---

## 6. Success criteria (program complete)

- [ ] No production path uses `COMMIT_CHAIN` / `CHAIN_COMMIT` / `USE_TOOL_BOMB`.
- [ ] Fresh player sees story/tutorial modals (`isDialogsDisabled` default false).
- [ ] HUD XP bar matches `XP_PER_LEVEL` progression.
- [ ] Building/tile abilities change spawn weights on live board.
- [ ] Rats can spawn/tick when enabled; fire toggle in BM.
- [ ] `triggerBoss` uses `spawnBoss` + modifier state on grid.
- [ ] Market events and tool clears use resource keys / `resourceProgress`.
- [ ] `balance.json` `items` overrides apply to `ITEMS`.
- [ ] `TOOL_CATALOG` generated from `ITEMS`; visual tests green.
- [ ] `CLAUDE.md` has no references to removed doc symbols or ghost mechanics.
- [ ] `docs/hardcoded-special-cases-audit.md` sections §12–§19 updated.

---

*End of execution plan. Start at PR-00 or PR-01a if audit sections already merged.*
