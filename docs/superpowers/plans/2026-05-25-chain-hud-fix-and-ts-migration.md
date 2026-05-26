# Chaining-panel bug fix + Full TypeScript migration

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Visual-bug investigations should also consult `superpowers:phaser-scene-debug` since the trigger bug lives at the Phaser-scene → React event boundary.

**Goal:** Fix the CHAINING panel's top-bar icon (show the produced resource, not the tile) and use that fix as the trigger for migrating the codebase to TypeScript with `Tile` / `Resource` / `Tool` as distinct types so this class of bug becomes a compile error.

**Architecture:** Six phases, each its own PR-batch. Phase 0 (audit visual goldens) and Phase 1 (the bug fix itself) ship first. Phases 2–5 split `ITEMS` into separate maps (`TILES` / `RESOURCES` / `TOOLS`), set up `tsconfig.json` + `tsc --noEmit`, then convert files folder-by-folder until everything is `.ts`/`.tsx` under strict mode. The runtime guards (`assertResource`) remain only as belt-and-braces; the real safety comes from compile-time branded keys (`TileKey`, `ResourceKey`, `ToolKey` as nominal types) carried by separate `Tile` / `Resource` / `Tool` interfaces that share no parent.

**Tech Stack:** Existing — Phaser 3, React 18 + JSX, Vite 6, Vitest 4, Playwright (visual + e2e), ESLint, Tailwind. Added in Phase 2 — TypeScript 5.6, `@typescript-eslint/*`, `@types/react`, `@types/react-dom`, `@types/node`. No new build tool, no new test runner — Vite and Vitest handle `.ts`/`.tsx` natively.

---

## Context

**Direct trigger.** The CHAINING panel's top-left progress bar shows the wrong icon. For an oak chain it shows an oak tile; for a carrot chain it shows a carrot. The user's intent: the top bar shows **the resource the chain produces** (plank / soup / honey / etc., overridable per-tile via Dev Panel → Powers → "Produces resource"). The lower "UPGRADE TO" bar already correctly shows the upgrade tile that will spawn — that one stays as-is.

**Root cause.** `src/GameScene.js:1749` `_emitChainUpdate()` emits `resourceKey: res?.key` where `res` is the head **tile**, so the field named `resourceKey` actually holds a tile key. The exported `producedResource(tile)` helper at `src/GameScene.js:48` already returns the right resource key (respects per-tile override → family default via `TILE_FAMILY_RESOURCE`). It just isn't being called by the HUD emitter.

**Why the type system didn't catch it.** `src/types/items.js` declares branded `TileKey` / `ResourceKey` types and `src/types/guards.js` exports runtime `assertResource` — but `jsconfig.json` sets `checkJs:false` and files opt in via `// @ts-check`. Neither `GameScene.js` nor `ui/puzzleBoard.jsx` is opted in. The user's call: stop papering over with runtime asserts and **migrate to TypeScript** with `Tile` separated from `Resource`/`Tool` so the bug class is impossible at compile time. CLAUDE.md acknowledges the same conflation as in-flight migration work.

**Branch strategy (override).** All work for Phases 0–6 happens on a single long-lived feature branch off `main`:

- **Integration branch:** `feature/ts-migration` (suggested name; rename if preferred). Created once, off the current `main` HEAD, before any Phase 0 work.
- Every phase's PRs target `feature/ts-migration` as the base, **not** `main`.
- Each phase still gets its own PR for reviewability, but those PRs merge into the feature branch — never into `main` mid-migration.
- At the very end (after Phase 6 is green), a single final PR opens `feature/ts-migration` → `main`. That's the PR the user uses to compare the full diff of main against the completed work.
- The current session branch `claude/zealous-hawking-hJnRG` is **not** used for migration work — it was assigned for this conversation's session, but the migration explicitly lives on `feature/ts-migration` per the user's directive.

**PR policy for this migration (override).** This repo's default is "auto-merge on, every PR ships its first commit." For the duration of the TS migration, that policy is **suspended** for PRs that target `feature/ts-migration`:
- Auto-merge **disabled** on every per-phase PR into `feature/ts-migration` (via `mcp__github__disable_pr_auto_merge` after opening, or simply by not enabling it). These are review-and-iterate PRs.
- Iterative pushes and review rounds are explicitly allowed on the same per-phase branch before that phase's PR merges into `feature/ts-migration`.
- The **final** PR — `feature/ts-migration` → `main` — gets the full standard treatment: lint+test+build+visual all green before opening, and auto-merge enabled per repo default. This is the only PR that touches `main`, and it does so as a single large merge.
- After that final merge, the default auto-merge policy is fully restored for all subsequent unrelated PRs.

Phase 1's bug-fix PR is the same as the others — it goes into `feature/ts-migration` first. The user explicitly asked for the comparison to land in one place, so even small fixes route through the feature branch.

---

## Phase −1 — Create the integration branch *(one-time setup)*

A single long-lived branch carries all phases. Created once, before Phase 0.

- [ ] **Step 1: Fetch latest main.** `git fetch origin main`
- [ ] **Step 2: Create the integration branch off main.** `git checkout -b feature/ts-migration origin/main`
- [ ] **Step 3: Push to set up the remote.** `git push -u origin feature/ts-migration`
- [ ] **Step 4: Verify branch exists on origin.** `mcp__github__list_branches` and confirm `feature/ts-migration` appears.
- [ ] **Step 5: Open a tracking PR (optional but recommended).** `feature/ts-migration` → `main` as a **draft** PR — but keep in mind: this repo enables auto-merge on PR creation, so the tracking PR must be opened **as draft** and immediately have auto-merge disabled to prevent it from accidentally landing an empty diff. Alternative: skip the tracking PR entirely and open the final PR only at the end of Phase 6, when the diff is real and ready to ship.

Going forward, every "open PR" instruction in this plan means **base = `feature/ts-migration`** unless otherwise stated.

---

## Phase 0 — Safety net: audit goldens + add characterization tests *(before any code change)*

**Why this is Phase 0.** Two distinct safety-net jobs, both essential before any refactor:

1. **Audit visual goldens.** Goldens are the baseline for every later phase's "behavior preserved" claim. If a golden was captured against the buggy chain-HUD (tile icon instead of resource icon), then refreshing it after the fix would lock in a tautology — "the bug-free output matches the bug-free golden because I just regenerated it." Worse, **other** goldens may have been captured against latent bugs; without an audit pass, every subsequent visual diff is suspect.

2. **Add characterization tests for current-correct behavior at the conflation sites.** The TS migration (Phases 2–6) will split `ITEMS` into three maps and touch most files. CLAUDE.md flags several sites as "Known conflation (in-flight migration)" — these are exactly the places where behavior could silently shift during conversion. Lock the **current, working** behavior into tests now so any regression during the migration trips a red light, not a release.

The two halves are independent and can be done in either order; the audit is read-only, the tests are write-only-to-`tests/` (no `src/` edits).

**Files involved.**
- Read-only for audit: `src/visualTesting/matrix.js`, `playwright.config.js`, the Playwright snapshot directory.
- Created for safety-net tests: new `*.test.js` files under `src/__tests__/` covering tile-family helpers, conflation sites, save/load round-trip, and slice action-handling for actions whose dispatch path is currently untested. **No `src/` edits** in Phase 0.

### Task 0.A1: Inventory the golden corpus

**Files:**
- Read-only: `src/visualTesting/matrix.js`, `playwright.config.*`, golden snapshot directory.

- [ ] **Step 1: Locate the goldens directory.** Run `find . -path ./node_modules -prune -o -type d \( -name "*snapshot*" -o -name "*golden*" -o -name "*screenshots*" \) -print`. Expected: one or two directories under `tests/` or `src/visualTesting/`.
- [ ] **Step 2: List all scenario ids.** Open `src/visualTesting/matrix.js`, capture every entry's `id` and `route` into a working note. Count them.
- [ ] **Step 3: Cross-reference.** For each scenario id, check there's a corresponding golden file. Note any orphans (scenario without golden, golden without scenario).
- [ ] **Step 4: Commit the inventory.** No code yet — just a working note (kept locally; not committed unless the team wants it in `docs/`).

### Task 0.A2: Run the suite to surface live diffs

- [ ] **Step 1: Run all visual tests against current main.** `npm run test:visual:all`. Expected: PASS across the matrix (otherwise main is already broken — stop and surface that first).
- [ ] **Step 2: Review the Playwright HTML report.** `npx playwright show-report`. Confirm every test produced a screenshot and there are no skipped/flaky entries.

### Task 0.A3: Spot-audit suspect goldens for encoded bugs

Focus the audit on goldens covering the chain HUD and any UI that displays a tile-or-resource icon, because those are where the conflation could hide.

- [ ] **Step 1: Identify chain-related scenarios.** From the matrix, list any id containing `chain`, `chaining`, `board-farm`, `board-mine`, `board-fish` with a held chain. Likely: `board-farm-chain-7`, similar mine/fish variants, any `?visual=…` URL pinned in matrix entries with a `holdChain` action.
- [ ] **Step 2: Compare each chain-scenario golden against intent.** For each: open the golden image. Per the user's clarified intent, the right-side icon by the top progress bar should be the **produced resource** (plank for an oak chain, soup for a vegetable chain, etc.). Today, every one of these goldens will likely show the **tile** icon — that's the bug, locked into the baseline.
- [ ] **Step 3: Tag affected goldens.** Maintain a short list in the PR description (e.g., `board-farm-chain-7`, `board-mine-chain-5`, …) — these are the ones Phase 1 will intentionally update; reviewers should expect the diff.
- [ ] **Step 4: Look for non-chain goldens with the same conflation.** Anywhere a tooltip / inventory row / quest objective might display `tile.label` where it should display the produced resource. Likely few — note any. Same tag treatment.

### Task 0.A4: Decide on outdated-golden disposition

- [ ] **Step 1: For goldens that show today's buggy state but Phase 1 will fix:** leave them. Phase 1 refreshes them, with the refresh justified by the audit list from Task 0.A3.
- [ ] **Step 2: For goldens that look wrong but are *not* caused by the Phase 1 fix:** open a separate issue per distinct bug. Do not bundle into Phase 1. Each gets its own fix PR.
- [ ] **Step 3: For goldens captured on a different OS:** CLAUDE.md flags platform sensitivity. If any look subtly off on the current machine (kerning, font hinting) but are otherwise correct, note in the PR description and refresh in Phase 1's PR.

### Task 0.B1: Coverage gap scan at conflation sites

Use the existing `coverage-gaps` skill — its purpose is exactly this. Run coverage, then narrow on the files most exposed to the upcoming TS migration.

- [ ] **Step 1: Run coverage.** `npm run test:coverage`. Save the report.
- [ ] **Step 2: Open the coverage HTML/JSON output.** Identify uncovered or thinly-covered branches in: `src/constants.js` (esp. `tileFamily`, `tileFamilyResource`, `RESOURCE_TO_THRESHOLD`, `CAPPED_RESOURCES`, `BIOMES[*].resources`, `RECIPES`), `src/state/helpers.js` (`makeOrder`), `src/state/persistence.js` (save/load round-trip), `src/state.js` (`SLICE_PRIMARY_ACTIONS`, `ALWAYS_RUN_SLICES`).
- [ ] **Step 3: Produce a gap list.** A short table (file → uncovered branch → proposed test). This drives Tasks 0.B2–0.B5. If a site already has solid coverage, skip it.

### Task 0.B2: Lock down tile-family + producedResource behavior

Characterization tests so the migration can't silently change which tile produces which resource.

**File:** Create `src/__tests__/tileFamily.characterization.test.js`

- [ ] **Step 1: Enumerate every tile key in `ITEMS`.** Iterate all entries with `kind === "tile"`; for each, assert the current return values of `tileFamily(key)`, `tileFamilyResource(key)`, and `producedResource({ key })`. Snapshot the output as a single fixture object so the diff on regression is one block.

```js
import { describe, it, expect } from "vitest";
import { ITEMS, tileFamily, tileFamilyResource } from "../constants.js";
import { producedResource } from "../GameScene.js";

describe("tile-family helpers — characterization", () => {
  it("snapshot of family + producedResource for every tile in ITEMS", () => {
    const snapshot = {};
    for (const [key, def] of Object.entries(ITEMS)) {
      if (def?.kind !== "tile") continue;
      snapshot[key] = {
        family: tileFamily(key),
        familyResource: tileFamilyResource(key),
        produced: producedResource({ key }),
      };
    }
    expect(snapshot).toMatchSnapshot();
  });
});
```

- [ ] **Step 2: Run, accept the snapshot.** `npm test -- src/__tests__/tileFamily.characterization.test.js`. Expected: PASS, snapshot generated.
- [ ] **Step 3: Commit the snapshot.** `git add src/__tests__/tileFamily.characterization.test.js src/__tests__/__snapshots__/`

### Task 0.B3: Lock down conflation-site behavior

For each "Known conflation" site in CLAUDE.md, write a test that records *current behavior* (even if conceptually wrong). The TS migration will fix the conflations in Phase 3f — at that point these tests get **updated**, not removed, to record the new (correct) behavior. The point is to make every change at those sites visible.

**File:** Create `src/__tests__/conflation.characterization.test.js`

- [ ] **Step 1: BIOMES[*].resources snapshot.**

```js
import { BIOMES } from "../constants.js";
it("BIOMES.resources lists today", () => {
  const out = {};
  for (const [biome, def] of Object.entries(BIOMES)) {
    out[biome] = [...(def.resources ?? [])].sort();
  }
  expect(out).toMatchSnapshot();
});
```

- [ ] **Step 2: CAPPED_RESOURCES snapshot.** Lock in which keys (tiles + resources mixed today) live under the inventory cap.
- [ ] **Step 3: RECIPES input/output snapshot.** For each recipe, snapshot the `inputs` map keys and the `item` produced. Phase 3f will convert tile-key inputs to resource-key inputs; this snapshot makes those swaps visible.
- [ ] **Step 4: BUILDING costs snapshot.** Same idea for `BUILDINGS[].cost` keys.
- [ ] **Step 5: makeOrder draw-pool snapshot.** Call `makeOrder` with a deterministic RNG seed for each biome and snapshot the resulting order shape (tile keys vs resource keys). When Phase 3f changes the pool to resource-only, this snapshot updates and reviewers see the change clearly.
- [ ] **Step 6: Run + commit.** `npm test -- conflation && git add src/__tests__/conflation.characterization.test.js src/__tests__/__snapshots__/`

### Task 0.B4: Save/load round-trip safety net

The migration will likely change `SAVE_SCHEMA_VERSION` (Tile no longer carries `next`, ITEMS structure changes). The reducer currently *discards* mismatched saves. Lock down round-trip behavior on the current schema first; the schema bump in Phase 3 then has a tested before/after.

**File:** Create `src/__tests__/save.roundtrip.test.js`

- [ ] **Step 1: Build a representative state.** Use `src/visualTesting/stateBuilders.js` to assemble a state with: a mid-run farm board, some inventory (tiles + resources mixed if applicable), an active boss, an in-progress chain, a few completed quests.
- [ ] **Step 2: Serialize via `src/state/persistence.js`.** Then deserialize. Assert deep equality of the round-trip.
- [ ] **Step 3: Test the version-mismatch path.** Persist with the current version, mutate the version string in the stored payload, and confirm the reducer drops the save and returns `initialState`.
- [ ] **Step 4: Commit.**

### Task 0.B5: Slice-action coverage for SLICE_PRIMARY_ACTIONS

CLAUDE.md flags this as a footgun (`check-slice-action` skill exists for it). The TS migration will type the action union — but type errors don't catch a missing registration in `SLICE_PRIMARY_ACTIONS`. Lock down current behavior.

**File:** Create `src/__tests__/slicePrimaryActions.test.js`

- [ ] **Step 1: For each action listed in `SLICE_PRIMARY_ACTIONS` and `ALWAYS_RUN_SLICES`:** dispatch a representative payload against `initialState`; assert the resulting state is **not** reference-equal to `initialState` (i.e., the slice actually mutated something). A reference-equal result means the registration is dead.
- [ ] **Step 2: Run + commit.**

### Task 0.C: Open Phase-0 PR

- [ ] **Step 1: Branch off the integration branch.** `git checkout feature/ts-migration && git pull && git checkout -b ts-migration/phase-0-safety-net`. All Phase 0 changes are in `tests/`-only files plus the snapshot directory.
- [ ] **Step 2: Push and open PR.** `git push -u origin ts-migration/phase-0-safety-net`. Open PR with **base = `feature/ts-migration`**, auto-merge disabled. Title: `test: safety net before TS migration — golden audit + characterization tests`. Body summarizes the Task 0.A3 golden audit findings (the list of chain-HUD goldens Phase 1 will refresh) and lists each characterization test added with its purpose.
- [ ] **Step 3: Merge after review.** Merge method: merge commit (preserves history). Phase 1 starts from the updated `feature/ts-migration`.

---

## Phase 1 — Chain-HUD bug fix *(small PR, ships immediately)*

**Files:**
- Modify: `src/GameScene.js` (around line 1749, function `_emitChainUpdate`)
- No edit needed in `src/ui/puzzleBoard.jsx` — `ChainView` already reads the right field names
- Test: add `src/__tests__/chainEmitUpdate.test.js`
- Goldens: refresh affected chain-scenario goldens identified in Task 0.A3

### Task 1.1: Failing test for the emitter payload

**Files:** Create `src/__tests__/chainEmitUpdate.test.js`

- [ ] **Step 1: Write the failing test.**

```js
// src/__tests__/chainEmitUpdate.test.js
import { describe, it, expect } from "vitest";
import { producedResource } from "../GameScene.js";
import { ITEMS } from "../constants.js";

describe("producedResource (chain HUD source)", () => {
  it("returns family default for a vegetable tile", () => {
    const carrot = { key: "tile_veg_carrot" };
    expect(producedResource(carrot)).toBe("soup");
  });

  it("returns family default for an oak tile", () => {
    const oak = { key: "tile_grass_oak" };
    // tree family → plank
    expect(producedResource(oak)).toBe("plank");
  });

  it("returns null for tiles with custom output", () => {
    expect(producedResource({ key: "tile_special_dirt" })).toBeNull();
    expect(producedResource({ key: "tile_special_giant_pearl" })).toBeNull();
  });

  it("respects per-tile producesResource override", () => {
    // Inject an override entry into ITEMS for the duration of this test.
    const target = "tile_veg_carrot";
    const original = ITEMS[target].effects;
    ITEMS[target].effects = { ...(original || {}), producesResource: "bread" };
    try {
      expect(producedResource({ key: target })).toBe("bread");
    } finally {
      if (original) ITEMS[target].effects = original;
      else delete ITEMS[target].effects;
    }
  });
});
```

- [ ] **Step 2: Run to confirm pass on existing behavior.** `npm test -- src/__tests__/chainEmitUpdate.test.js`. Expected: PASS (the helper is already correct; we're locking down the behavior the emitter should be using).

### Task 1.2: Failing test for the actual emit payload

Adds a higher-level test that loads a stub scene-emit path. Since `_emitChainUpdate` is a method on `GameScene` that touches `this.path`, `this.registry`, and `this.events`, we use a thin shim rather than spinning up a real Phaser scene.

- [ ] **Step 1: Extend the test file.** Append:

```js
import { _emitChainUpdateForTest } from "../GameScene.js"; // NEW export, added in Task 1.3

describe("_emitChainUpdate payload", () => {
  function harness(headTileKey, headTileLabel) {
    const calls = [];
    const fakeScene = {
      path: [{ res: { key: headTileKey, label: headTileLabel } }],
      registry: { get: () => undefined },
      events: { emit: (name, payload) => calls.push({ name, payload }) },
      nextUpgradeTile: () => null,
      _effectiveMinChain: () => 3,
    };
    _emitChainUpdateForTest(fakeScene);
    return calls;
  }

  it("emits the produced RESOURCE key, not the tile key", () => {
    const [call] = harness("tile_veg_carrot", "Carrot");
    expect(call.payload.resourceKey).toBe("soup");
    expect(call.payload.tileKey).toBe("tile_veg_carrot");
  });

  it("emits the produced resource label, not the tile label", () => {
    const [call] = harness("tile_veg_carrot", "Carrot");
    expect(call.payload.resourceLabel).toBe(ITEMS.soup.label); // e.g. "Soup"
    expect(call.payload.tileLabel).toBe("Carrot");
  });

  it("falls back to tile key/label for tiles with custom output", () => {
    const [call] = harness("tile_special_dirt", "Dirt");
    expect(call.payload.resourceKey).toBe("tile_special_dirt");
    expect(call.payload.resourceLabel).toBe("Dirt");
  });
});
```

- [ ] **Step 2: Run to confirm it fails.** `npm test -- src/__tests__/chainEmitUpdate.test.js`. Expected: FAIL — `_emitChainUpdateForTest` not exported.

### Task 1.3: Implement the fix

**File:** `src/GameScene.js` — `_emitChainUpdate()` near line 1749.

- [ ] **Step 1: Edit `_emitChainUpdate`.** Replace the existing emit block with a produced-resource-aware emit. Apply this diff:

```diff
   _emitChainUpdate() {
     const n = this.path.length;
     const res = n ? this.path[0].res : null;
     const next = res ? this.nextUpgradeTile(res) : null;
     const effThresh = this.registry.get("effectiveThresholds") ?? UPGRADE_THRESHOLDS;
     const k = next ? upgradeCountForChain(n, res.key, effThresh) : 0;
     const valid = n === 0 || n >= this._effectiveMinChain();
     let nextTileProgress = null;
     if (next && res) {
       const threshold = effThresh[res.key] ?? UPGRADE_THRESHOLDS[res.key] ?? 0;
       if (threshold > 0) {
         nextTileProgress = {
           current: n,
           threshold,
           targetLabel: next.label ?? next.key ?? "",
           targetKey: next.key ?? "",
         };
       }
     }
+    const producedKey = res ? producedResource(res) : null;
+    const producedDef = producedKey ? ITEMS[producedKey] : null;
     this.events.emit(SCENE_EVENTS.CHAIN_UPDATE, {
       count: n,
       upgrades: k,
       valid,
       nextTileProgress,
-      resourceKey: res?.key ?? null,
-      resourceLabel: res?.label ?? null,
+      resourceKey:   producedKey ?? res?.key   ?? null,
+      resourceLabel: producedDef?.label ?? res?.label ?? null,
+      tileKey:       res?.key   ?? null,
+      tileLabel:     res?.label ?? null,
     });
   }
+
+// Test-only export — pure function that drives _emitChainUpdate against an
+// injected scene-shape. Lets us assert payload without a real Phaser scene.
+export function _emitChainUpdateForTest(scene) {
+  return GameScene.prototype._emitChainUpdate.call(scene);
+}
```

- [ ] **Step 2: Run the new tests.** `npm test -- src/__tests__/chainEmitUpdate.test.js`. Expected: PASS for all four cases.
- [ ] **Step 3: Run the full unit suite.** `npm test`. Expected: PASS. If any pre-existing test asserted on the old payload shape, update its expectation in this commit (and call out in the PR body).

### Task 1.4: Browser walkthrough (per phaser-scene-debug skill — explicit verification)

- [ ] **Step 1: `npm run dev` and open `http://localhost:5173/puzzleDrag2/`.**
- [ ] **Step 2: Carrot chain.** Navigate to a Farm board with carrots. Drag a chain of 3+ carrots. Confirm: top-bar icon = soup; header reads "Soup chain"; if inventory already contains soup, the brown "carried" segment appears.
- [ ] **Step 3: Oak chain.** Navigate to a board with oaks. Chain 3+. Confirm: icon = plank; header = "Plank chain".
- [ ] **Step 4: Override.** Open `/b/` Dev Panel → Powers → set carrot tile's "Produces resource" to `bread`. Return to a carrot board. Chain. Confirm: icon = bread; header = "Bread chain". Remove override, confirm icon reverts to soup.
- [ ] **Step 5: Custom-output tile.** If reachable, chain through `tile_special_dirt` and confirm the HUD falls back to the dirt tile icon — no `null` icon, no console error.
- [ ] **Step 6: State your finding.** Per the skill: "I confirmed in the browser" or "I could not verify in the browser." Type-checks alone do not substitute.

### Task 1.5: Refresh affected visual goldens

- [ ] **Step 1: Run the visual suite.** `npm run test:visual`. Expected: diffs on every chain-scenario golden listed in Task 0.A3.
- [ ] **Step 2: Review each diff.** Confirm every diff is exactly the icon swap (and the carried-segment fill if soup/etc. is in inventory in that scenario). Any diff that is *not* one of those two changes → investigate; do not refresh blindly.
- [ ] **Step 3: Refresh.** `npm run test:visual:update`.
- [ ] **Step 4: Re-run to confirm green.** `npm run test:visual`. Expected: clean.

### Task 1.6: Commit and PR

- [ ] **Step 1: Stage.** `git add src/GameScene.js src/__tests__/chainEmitUpdate.test.js <golden-paths>`
- [ ] **Step 2: Commit.**

```bash
git commit -m "$(cat <<'EOF'
fix(chain-hud): show produced resource icon in top progress bar

The CHAINING panel's top-bar icon was emitting the head TILE key as
resourceKey, so the HUD rendered the tile sprite (oak / carrot) instead
of the produced resource (plank / soup). Wire `_emitChainUpdate` through
the existing `producedResource(tile)` helper so per-tile overrides and
family defaults from TILE_FAMILY_RESOURCE both flow through. Tile key
is still emitted separately (tileKey/tileLabel) for any future consumer.
EOF
)"
```

- [ ] **Step 3: Branch off the integration branch.** `git checkout feature/ts-migration && git pull && git checkout -b ts-migration/phase-1-chain-hud-fix`. Push: `git push -u origin ts-migration/phase-1-chain-hud-fix`.
- [ ] **Step 4: Open PR.** Use `mcp__github__create_pull_request` with **base = `feature/ts-migration`**, auto-merge disabled. Title: `fix(chain-hud): show produced resource icon in top progress bar`. Body lists the Task 0.A3 audit findings and the visual diffs. Merge after review.

---

## Phase 2 — TypeScript infrastructure *(setup PR, no behavior change)*

Add `tsconfig.json`, deps, and the typecheck script. Convert the two files that are already JSDoc-clean (`src/types/items.js`, `src/types/guards.js`) to `.ts` to validate the pipeline. Auto-merge **disabled** on this PR per the relaxed policy — reviewers want eyes on the config.

**Files:**
- Create: `tsconfig.json`, `tsconfig.node.json` (for Vite config), updated `eslint.config.js`
- Modify: `package.json` (deps + scripts), `vite.config.js` (none needed — TS works out of the box)
- Convert: `src/types/items.js` → `src/types/items.ts`, `src/types/guards.js` → `src/types/guards.ts`
- Delete: `jsconfig.json` (replaced)

### Task 2.1: Add deps and scripts

- [ ] **Step 1: Install.** `npm install --save-dev typescript@^5.6 @types/react@^18 @types/react-dom@^18 @types/node @typescript-eslint/parser @typescript-eslint/eslint-plugin`
- [ ] **Step 2: Add `typecheck` script to `package.json`.** Insert after `"lint"`: `"typecheck": "tsc --noEmit"`
- [ ] **Step 3: Commit.** `git add package.json package-lock.json && git commit -m "chore(ts): add typescript and type-checking deps"`

### Task 2.2: Replace jsconfig with tsconfig

- [ ] **Step 1: Write `tsconfig.json`.**

```json
{
  "compilerOptions": {
    "target": "es2022",
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "allowJs": true,
    "checkJs": false,
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "skipLibCheck": true,
    "types": ["vite/client", "node"]
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "src/**/*.js", "src/**/*.jsx"],
  "exclude": ["node_modules", "dist", "**/*.test.js", "**/*.test.jsx"]
}
```

- [ ] **Step 2: Delete `jsconfig.json`.** `git rm jsconfig.json`
- [ ] **Step 3: Run `npm run typecheck`.** Expected: clean (no `.ts` callers yet outside the files we'll convert next, and JS is not checked).

### Task 2.3: Convert `src/types/items.js` to `.ts`

- [ ] **Step 1: Rename.** `git mv src/types/items.js src/types/items.ts`
- [ ] **Step 2: Translate JSDoc typedefs to TS syntax.** The branded keys (`TileKey`, `ResourceKey`, `ToolKey`) translate one-to-one. The discriminated union `Item = TileItem | ResourceItem | ToolItem` stays for the duration of Phase 2 only — flagged `@deprecated`. Tile and Resource and Tool interfaces become standalone `export interface` declarations. **Tile's `next` field is removed** — that's the conflated piece, and Phase 1 already proved the chain pipeline doesn't need it on the tile object.
- [ ] **Step 3: Run typecheck.** `npm run typecheck`. Expected: clean.
- [ ] **Step 4: Run unit tests.** `npm test`. Expected: clean (no behavioral change).

### Task 2.4: Convert `src/types/guards.js` to `.ts`

- [ ] **Step 1: Rename.** `git mv src/types/guards.js src/types/guards.ts`
- [ ] **Step 2: Add explicit return types and `key is ResourceKey` predicates.** `isResource(key: string): key is ResourceKey` etc. `assertResource(key: string): asserts key is ResourceKey`.
- [ ] **Step 3: Run typecheck + tests.** `npm run typecheck && npm test`. Expected: clean.

### Task 2.5: Update ESLint

- [ ] **Step 1: Add `@typescript-eslint` to `eslint.config.js`** for `.ts` / `.tsx` files. Keep existing JS rules for `.js`/`.jsx`.
- [ ] **Step 2: Run `npm run lint`.** Expected: clean.

### Task 2.6: Commit + PR

- [ ] **Step 1: Branch off the integration branch.** `git checkout feature/ts-migration && git pull && git checkout -b ts-migration/phase-2-ts-infra`. Stage everything: `git add tsconfig.json src/types/ eslint.config.js package.json package-lock.json && git rm jsconfig.json`
- [ ] **Step 2: Commit.** Message: `chore(ts): introduce tsconfig and convert src/types to TypeScript`
- [ ] **Step 3: Push, open PR with base = `feature/ts-migration` and auto-merge disabled.** Reviewers should validate the config before more files convert.

---

## Phase 3 — Split `ITEMS` into `TILES` / `RESOURCES` / `TOOLS` and convert the core *(architectural payoff)*

This is the load-bearing phase. Touching `src/constants.js` (or rather, splitting it) propagates through nearly every file that imports `ITEMS`. Each commit should be reviewable on its own; the PR may contain many commits per the relaxed PR policy.

**Files (primary):**
- Convert: `src/constants.js` → `src/constants.ts`
- Convert: `src/GameScene.js` → `src/GameScene.ts`
- Convert: `src/ui/puzzleBoard.jsx` → `src/ui/puzzleBoard.tsx`
- Convert: `src/state.js` → `src/state.ts`
- Convert: `src/utils.js` → `src/utils.ts`
- Update: every direct importer of `ITEMS` (grep first; expect ~40–60 files)

**Strategy (within this phase):**

3a. **Add `TILES` / `RESOURCES` / `TOOLS` next to existing `ITEMS`.** First commit: split the data into three maps inside `constants.ts`. Keep `ITEMS` as a generated re-export from the three (`@deprecated`) so no existing caller breaks. Convert `constants.js` → `constants.ts` in the same commit.

3b. **Update `tileFamilyResource`, `producedResource`, `tileFamily` signatures.** They now consume `TileKey` and return `ResourceKey | null` with branded types. `producedResource` moves out of `GameScene.js` into its own pure module `src/core/producedResource.ts` (the JSDoc already says it doesn't need scene context).

3c. **Convert `GameScene.js` → `GameScene.ts`.** This is the file the original bug lived in. Many typing issues will surface — fix or `// @ts-expect-error` with a tracking note per the relaxed policy. The chain emitter now consumes `Tile` and emits `ResourceKey` — the type system enforces it.

3d. **Convert `ui/puzzleBoard.jsx` → `ui/puzzleBoard.tsx`.** `ChainView`'s `chainInfo` prop becomes a typed interface with `resourceKey: ResourceKey | null` and `tileKey: TileKey | null` as distinct fields.

3e. **Convert `state.js` → `state.ts`.** Reducer / action types / slice composition. Action union becomes the source of truth instead of the string-typed `SLICE_PRIMARY_ACTIONS` set.

3f. **Fix the "Known conflation" sites** flagged in CLAUDE.md as part of this phase:
   - `BIOMES[*].resources` — split into `.tiles` and `.resources`.
   - `CAPPED_RESOURCES` — split into `CAPPED_TILES` and `CAPPED_RESOURCES`.
   - Recipe inputs and building costs using `tile_*` keys — convert each to the produced-resource key (the player crafts/builds from resources, never from tiles). May require balance pass; surface each change in the PR description.
   - `makeOrder` in `src/state/helpers.js` — pool now draws from `RESOURCES` only.
   - Use `assertResource` at any remaining cross-boundary write site as belt-and-braces (the type system catches it; the assert documents intent and protects JS callers).

Verification per sub-step: `npm run lint && npm run typecheck && npm test && npm run build`. Visual goldens run at the end of Phase 3 only — they should be identical to Phase 1's refreshed set; any unexplained diff is a regression and blocks the PR.

---

## Phase 4 — Feature slices *(grouped PRs)*

Convert the 32 directories under `src/features/`. Group ~6–8 directories per PR; ~5 PRs total. Order:

- **PR 4a — chain-adjacent:** `farm`, `fish`, `mine`, `inventory`, `crafting`, `zones`. Each slice's `index.jsx` + `slice.js` + any `data.js` convert together. Likely the most type errors per slice.
- **PR 4b — town-adjacent:** `townsfolk`, `quests`, `orders`, `castle`, `workers`, `charter`, `market`.
- **PR 4c — meta-game:** `achievements`, `boss`, `bosses`, `cartography`, `chronicle`, `runSummary`.
- **PR 4d — narrative/cosmetic:** `story`, `boons`, `festivals`, `decorations`, `almanac`, `tileCollection`.
- **PR 4e — utility:** `debug`, `settings`, `tutorial`, `portal`, `npcs`, `wiki`.

Per-PR template (per slice converted):
- [ ] `git mv slice.js slice.ts` and `git mv index.jsx index.tsx`
- [ ] Add a typed `State` interface for the slice's portion of the reducer state
- [ ] Type the action union the slice handles
- [ ] Typecheck + test after each slice
- [ ] Commit once the slice is green

Visual goldens run end-of-PR.

---

## Phase 5 — UI, textures, audio, balance manager, story editor *(grouped PRs)*

- **PR 5a — UI primitives:** `src/ui/*` (HUD, Inventory, Modals, Tools, Tooltip, Town, Icon, etc.).
- **PR 5b — Textures:** `src/textures.js`, `src/textures/categories/*` (16 modules), `src/textures/iconRegistry.js`.
- **PR 5c — Audio + a11y:** `src/audio/*`, `src/a11y.js`.
- **PR 5d — Dev Panel:** `src/balanceManager/*`. Standalone bundle; can't break the game bundle.
- **PR 5e — Story Editor:** `src/storyEditor/*`. Standalone bundle.

Each PR follows the same template as Phase 4.

---

## Phase 6 — Tests, cleanup, final merge into main

- Convert remaining `*.test.js` / `*.test.jsx` under `src/__tests__/` and `tests/` to `.ts`/`.tsx` in grouped commits.
- Remove the `@deprecated` `ITEMS` re-export from `src/constants.ts`. Remove the union `Item = Tile | Resource | Tool` from `src/types/items.ts`.
- Flip `checkJs: true` in `tsconfig.json` for the few remaining `.js` files under `tools/` and `*.mjs` if applicable; otherwise leave those JS as-is (they're build-time, not runtime).
- All Phase 6 sub-PRs still target `feature/ts-migration`.

### Final merge (the comparison the user requested)

Once Phase 6 lands and `feature/ts-migration` is fully green:

- [ ] **Step 1: Sync the integration branch with main.** `git checkout feature/ts-migration && git pull && git fetch origin main`. If main has moved during the migration, merge it in: `git merge origin/main`. Resolve any conflicts, re-run the full verification matrix.
- [ ] **Step 2: Final verification on the integration branch.** `npm run lint && npm run typecheck && npm test && npm run build && npm run test:visual`. All clean.
- [ ] **Step 3: Open the final PR.** `feature/ts-migration` → `main`. **Not draft.** Auto-merge enabled per repo default — this is the policy restoration in action. Title: `feat(ts): migrate codebase to TypeScript with separated Tile/Resource/Tool types`. Body: link to this plan, summarize the per-phase merge history, list any deferred conflations, list the visual diffs accepted in Phase 1.
- [ ] **Step 4: Once merged, the user can compare `main` (before) vs `main` (after) — or compare `feature/ts-migration` against the pre-migration `main` commit — to see the full migration diff in one view.**
- [ ] **Step 5: Restore default PR policy.** No code change needed — auto-merge is already on by default for new PRs. The migration's "auto-merge disabled" policy applied only to PRs targeting `feature/ts-migration`; PRs into `main` resume normal behavior automatically.

---

## Verification matrix

Every PR in this migration must run, in order, before opening:

1. `npm run lint` — clean
2. `npm run typecheck` — clean (added in Phase 2; trivial-clean before that)
3. `npm test` — clean
4. `npm run build` — clean (catches any Vite resolution issue)
5. `npm run test:visual` — clean OR every diff justified and refreshed in the same commit set

After Phase 1's PR, the smoke walkthrough in Task 1.4 is the gold-standard manual check. Later phases' visual goldens cover the same surface.

---

## Self-review (per writing-plans skill)

**Spec coverage.** User's four corrections all addressed:
- "Phase 0 = verify current goldens" → Phase 0.A with four explicit tasks for audit-before-edit.
- "Phase 0 = add any new tests needed before we start to be sure we don't break things" → Phase 0.B with five characterization-testing tasks (tile-family helpers, conflation sites, save round-trip, slice-action coverage), driven by a coverage-gap scan.
- "Change PR rules then restore" → relaxed policy stated in the Context section and restored explicitly in Phase 6.
- "Do all the work on a new feature branch so I can compare main to the completed work" → Phase −1 creates `feature/ts-migration` off main; every phase's PR targets it as base; one final `feature/ts-migration` → `main` PR closes out the migration and produces the single comparable diff.

User's original ask ("the icon should be soup for a carrot chain, IS this correct?") → Phase 1 fixes it with a unit test and a browser walkthrough.

User's "Tiles ARE NOT ITEMS" point → Phase 3 splits `ITEMS` into three maps with no shared parent type at the call boundary; `Tile.next` is removed.

User's strong-typing preference → Phase 2 adds `tsconfig.json` with `strict: true`; Phase 3 lands distinct `Tile`/`Resource`/`Tool` interfaces with branded `TileKey`/`ResourceKey`/`ToolKey` keys; runtime `assertResource` stays as defense-in-depth, not the primary guard.

**Placeholder scan.** No "TBD" / "implement later" / "similar to Task N" patterns. Phase 1 tasks are fully code-complete; Phases 3–6 use strategic-level descriptions because each subsequent phase will produce its own bite-sized plan when its turn comes (a 200-file conversion at this granularity in one document would be unmaintainable).

**Type consistency.** `producedResource` signature consistent across Phases 1 (export from GameScene), 3b (move to `src/core/producedResource.ts`, branded return type). `resourceKey` field name stable across Phase 1 and Phase 3d. `tileKey` introduced in Phase 1 carries into Phase 3 typed as `TileKey`.

## Execution handoff

Plan complete. Two execution options:

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks. Fast iteration; main-thread context stays small.
2. **Inline Execution** — execute tasks in this session using `executing-plans`. Better for Phase 0 (audit, all read-only) since context-sharing helps. Worse for Phase 3 (load-bearing, many files).

Suggested: Phase 0 + Phase 1 inline (one session, ~1 hour). Each subsequent phase its own subagent-driven run.

---

## Remaining migration status (2026-05-26, branch `codex/type-constants-catalogs`)

**Completed on this branch (no further action unless regressions):**

- [x] **Runtime `src/` + `prototype.tsx`** — typed catalogs, action union, ESLint `@typescript-eslint/no-explicit-any` error, CI `typecheck`.
- [x] **Playwright + Vitest harness** — all `tests/e2e/*.spec.js`, `tests/visual/*.spec.js`, and `tests/e2e/helpers.js` renamed to `.ts`; `src/__tests__/setup.js` → `setup.ts`; `tests/playwright-env.d.ts` for `window.__phaserScene` / `__hearthVisual`.
- [x] **`tsconfig.tests.json` + `npm run typecheck:tests`** — typechecks Playwright specs and setup (relaxed `strict` for harness; does not yet include all `src/__tests__/*.test.ts` — those need GameState fixture typing first).
- [x] **CI** — `action-types:check` on `typecheck` job; new `typecheck-tests` job; `tests/phase-12-ci.test.ts` updated.
- [x] **Visual golden paths** — `__goldens__/*desktop-smoke.spec.js` dirs renamed to `.spec.ts` to match Playwright snapshot template.

**Still open / optional:**

- [ ] **Merge** `codex/type-constants-catalogs` → `main` when PR checks are green (user-driven).
- [x] **`tsc` over unit Vitest files** — incremental: `src/testUtils/testState.ts` (`mergeTestState` / `unsafeGameState` / `testAction`) + `docs/engineering/typed-tests.md`; `coverage-round-2.test.ts` migrated as the reference pattern. Widening `tsconfig.tests.json` to all `**/*.test.ts` still ~1.7k errors without migrating each file; do in batches.
- [ ] **Deep `GameState` typing** — narrow `unknown` bags (`boss`, hazards, etc.) incrementally.
- [ ] **E2E smoke** — re-run `npm run test:e2e` locally/CI; fix any flakes unrelated to TS rename if they block merge.

**Quick verify:**

```bash
npm run lint && npm run typecheck && npm run typecheck:tests && npm run action-types:check
npm run build && npm test
npm run test:e2e -- tests/e2e/smoke.spec.ts
```
