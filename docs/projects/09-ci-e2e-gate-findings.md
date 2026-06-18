# 09 — CI e2e/visual gate: findings & spec-rot inventory

> Companion to [09-ci-e2e-visual-gate.md](09-ci-e2e-visual-gate.md). Records what the **first-ever CI run** of the e2e suite revealed, and the de-rot work needed before the `e2e` job can flip from informational to **gating**.

## TL;DR

The infra from brief 09 landed in **PR #1229** (the `e2e`, `visual-smoke`, `visual-rebaseline` jobs + the Phaser `Texture key already in use` console-error allowlist). But the brief's premise — *"all 20 e2e specs pass on the CI runner"* — turned out to be **false**. The suite had **never run in CI**, so it bit-rotted against `main`:

- **CI result (PR #1229, run 27737992260): `32 passed / 31 failed`** (63 tests, chromium/Linux).
- **Reproduced identically on the local Windows host** (via a `node_modules` junction → parent), so this is **deterministic rot, not CI flakiness and not a regression from PR #1229** — the only files PR #1229 changed in the e2e path were the console-error collectors (`helpers.ts`, `smoke.spec.ts`, `error-boundary.spec.ts`), none of which touch the state bridge / fixtures the failures stem from.

Because of this, **both `e2e` and `visual-smoke` land `continue-on-error: true`** (informational). The gating checks remain `lint / typecheck / typecheck-tests / typecheck-test-files / test / build`.

This is exactly the failure mode brief 09 exists to *prevent going forward*: an ungated test layer silently rotting while the reducer churns. The gate now exists; the existing specs need a one-time repair.

## Why the failures are NOT from PR #1229

- The dominant error is `waitForState timed out after 5000ms. Final state.view=board modal=null`, thrown from `tests/e2e/helpers.ts` `waitForState` — a function PR #1229 did **not** touch.
- The `error-boundary.spec.ts:36` "Boot completes without console.error leaks" test (which PR #1229 *did* edit to use the allowlist) **passes** on CI — confirming the allowlist works and that the texture-key error is no longer a false-fail surface.
- `smoke.spec.ts:36` (edited by PR #1229) passes; `smoke.spec.ts:4`/`:27` (also edited) fail on *content* assertions (starting coins, season-bar text), not on the console guard.

## The 31 failing specs, grouped by root cause

### A. Biome-entry gating drift — `biomes.spec.ts` (4)
- `:11` SWITCH_BIOME farm→mine, `:25` farm→fish, `:36` FISH/FORCE_TIDE_FLIP, `:48` SET_BIOME invalid key.
- **Cause:** the reducer (`src/state.ts:659`) still accepts the spec's `{ type:'SWITCH_BIOME', key:'mine' }` shape (`action.key ?? action.payload?.biome`), but the switch is now blocked by `canEnterBiome(state, key)` — biome unlock moved to **zone-tier / cartography** state, so the spec's `gotoFresh({ level: 5, coins: 2000 })` seed no longer satisfies entry. The dispatch returns `state` with a "can't enter" bubble; `state.biome` never flips.
- **Fix direction:** seed the unlock the current reducer requires (founded zone / built quarry / zone-tier), or drive entry through the real cartography path. Cross-check the green unit tests `src/__tests__/biome-sync.test.ts` + `board-regen-nonce.test.ts` for the current canonical entry shape.

### B. Bottom-nav selectors + boot content — `navigation.spec.ts` (6), `smoke.spec.ts` (2)
- nav `:6` Town, `:14` Crafting, `:20` Inventory, `:26` Quests, `:32` Map, `:47` season-summary modal; smoke `:4` initial load (coins `150`), `:27` board SeasonBar `10 turns`.
- **Cause:** UI-click tests time out at ~32s (element not found/clickable) — the bottom-nav labels/emoji (e.g. `🗺️ Map`) and/or HUD copy ("Hearthwood Vale") and starting balances (`150`) drifted. mobile-landscape 844×390 layout may also hide/relayout nav items.
- **Fix direction:** re-derive the current nav button accessible-names + starting-coin constant; prefer stable `data-testid`s over emoji-label `getByRole` where they exist.

### C. Crafting / Workshop / tools routing — `crafting.spec.ts` (4), `tools.spec.ts` (2), `cuj-tools.spec.ts` (4)
- crafting `:31` bakery bread, `:49` water_pump→tools, `:69` explosives→tools, `:98` no-station reject; tools `:66` CRAFT_TOOL workshop, `:81` no-workshop reject; all four cuj-tools hotbar journeys.
- **Cause:** station-build prerequisites + recipe→`state.tools` routing changed; the fixtures don't establish the station/inputs the current reducer requires, and the cuj UI journeys hit moved selectors.
- **Fix direction:** seed the built station + inputs per current `RECIPES`/`WORKSHOP_RECIPES`; refresh the cuj hotbar selectors.

### D. Reducer/fixture drift — chain/economy/orders/save/misc (the rest, 9)
- `chain.spec.ts:6`, `:77`; `economy.spec.ts:9` BUY_RESOURCE; `orders-quests.spec.ts:28` TURN_IN_ORDER; `save.spec.ts:6` persists-across-reload; `full-year.spec.ts:16`; `dialog-draft.spec.ts:4`; `menu.spec.ts:19` boss dev trigger; `error-boundary.spec.ts:22` missing-payload.
- **Cause:** assorted — stale starting inventory/coins, `getReactState` fiber-walk returning `null` under the current component tree (note `:22` and `:48` fail on `Cannot read properties of null`), and changed reducer preconditions. `save.spec.ts` likely interacts with the new save-migration ladder (brief 08).
- **Fix direction:** triage individually; consider hardening the fiber bridge (`getReactState`/`dispatchAction`) which is the shared fragility, then re-fixture each.

> The 32 **passing** specs (boss, hazards, hidpi, settings, town-buildings, tile-collection, most tools, economy SELL, both error-boundary console tests, etc.) already give the gate real teeth on the React→registry→GameScene path — they just can't be the *whole* gate until the rotted half is repaired.

## Path to flip `e2e` → gating

1. De-rot the 31 specs above (groups A–D). Reproduce locally without CI: junction the worktree `node_modules` to the parent, then `npx playwright test tests/e2e/<spec> --workers=1` (the `webServer` boots its own Vite from the worktree once `./node_modules/vite/bin/vite.js` resolves via the junction).
2. When `npm run test:e2e` is green on a PR, remove `continue-on-error: true` from the `e2e` job in `.github/workflows/ci.yml` and add `e2e` to the branch-protection required checks.
3. (Independently) re-baseline the visual goldens on CI (`gh workflow run ci.yml -f update_goldens=true`), commit, then flip `visual-smoke` the same way.
