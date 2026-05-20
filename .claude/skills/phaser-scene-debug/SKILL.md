---
name: phaser-scene-debug
description: Diagnose bugs that span the React reducer ↔ Phaser registry ↔ GameScene ↔ TileObj boundary. Use when state in the React store doesn't match what's on the canvas, when a tile sprite is stale or unkeyed, when textures appear blurry or missing, or when board layout/origin (boardX, boardY, tileSize) drifts after resize. Catches the "I dispatched but the scene didn't react" and "texture not in cache at scene init" classes of bug.
---

# phaser-scene-debug

The expensive bugs in this repo cluster on the React↔Phaser seam. The React reducer is canonical state; `GameScene` reads from `this.registry` (Phaser's built-in `DataManager`) plus the singleton in `src/phaserBridge.js`; sprites are owned by `TileObj`; textures are baked once at scene init by `src/textures.js`. A bug at any seam looks like "feature dead" but the dispatch fired correctly — the canvas just didn't see it.

## Inputs

- A symptom: "tile didn't change", "board origin offset wrong after resize", "texture is blurry", "scene shows stale grid after Travel", "icon missing for new resource", etc.
- Optionally an action type that should have triggered the visual change.

## Procedure

1. **Locate the boundary that failed.** Pick exactly one:
   - **A. Reducer → Registry sync.** React state changed but `this.registry.get("<key>")` in `GameScene.js` returns the old value, or vice versa. Grep `registry.set("<key>"` and `registry.get("<key>"` to find both sides. The setter usually lives in `prototype.jsx` or a hook that subscribes to the reducer.
   - **B. Registry → Scene render.** Registry has the right value but the scene didn't re-read it. Check whether the relevant code path is gated by a registry event (`this.registry.events.on(...)`) or only sampled once at `create()`. The collected listeners are torn down in the `shutdown` block around `registryListeners` in `GameScene.js`.
   - **C. Scene → TileObj sprite.** The scene knows the new tile type but the sprite still shows the old texture. `TileObj` swaps textures via `setTexture(key)`; confirm the key string matches `iconKey(category, tier)` (see `src/textures/iconRegistry.js`).
   - **D. Texture cache.** Sprite is asking for a key that was never baked. Open `src/textures.js`; the texture must be registered in `bakeTextures()` (or via a category module under `src/textures/categories/`) before `GameScene.create()` runs. A missing bake produces the green/magenta Phaser default — that's the tell.
   - **E. Layout/origin.** `tileSize`, `boardX`, `boardY` are recomputed every layout pass (search `boardX = Math.round((vw - COLS * this.tileSize) / 2)`). If a sprite is positioned with stale values, it landed during a `resize` race; check that the positioning code reads `this.boardX` at call time, not a captured copy.

2. **Confirm the dispatch isn't silently dead.** If the symptom started with a dispatch, run the `check-slice-action` skill on that action type first. A pure-slice action missing from `SLICE_PRIMARY_ACTIONS` produces "scene didn't react" with the registry never being updated.

3. **Reproduce in the smoke harness if possible.** `src/smokeTests.js` (`SMOKE_INVARIANTS`) is invokable from the browser console via `runSelfTests()`. If the bug touches board invariants (grid shape, tile keys, season state), add an invariant there before fixing.

4. **For texture issues specifically:**
   - Check that the category module under `src/textures/categories/` registers all tiers (per-resource `UPGRADE_THRESHOLDS` in `src/constants.js` tells you how many tiers exist).
   - Check `bakeScale` — it's recomputed when `dpr` or `tileSize` crosses a threshold (`computeBakeScale`). A blurry icon usually means a sprite is rendering at higher scale than the baked texture.
   - The `resource-add` skill walks through the full pipeline when adding a new resource; missing rows there are the most common cause of `+undefined◉`-class bugs.

5. **Fix at the boundary you identified, not the symptom.** If the registry isn't being updated, fix the React→registry sync; don't paper over by force-resyncing in `GameScene.update()`.

6. **Verify** by running `npm test -- --run` and, for visual bugs, `npm run dev` and confirm the change in the browser. State "I confirmed in the browser" or "I could not verify in the browser" explicitly — type-checks alone are not enough for canvas behavior.

## Output format

```
Symptom: <one line>
Boundary: <A|B|C|D|E>
Evidence:
  - <file>:<line>  <observation>
  - <file>:<line>  <observation>
Root cause: <one sentence>
Fix site: <file>:<line>
Verification: <test name | "browser walkthrough" | "could not verify">
```

## Common pitfalls

- The `phaserBridge.js` module is a 3-line scene-holder, not a state sync system. The actual bridge is `Phaser.Registry` (`scene.registry`). Don't look for sync logic inside `phaserBridge.js`.
- `GameScene.create()` runs **once**. Anything sampled there is stale after the first dispatch unless wired through `this.registry.events.on(...)`.
- `boardRestoreGrid` is the registry handoff for restoring saved boards. If a saved game restores to the wrong grid, the bug is in whoever sets `boardRestoreGrid`, not in `fillBoard`.
- `effectiveThresholds` and `effectivePoolWeights` are *computed by the scene and pushed back into the registry* (around `GameScene.js:270`). React readers should treat those keys as scene-owned outputs, not inputs.
- A tile that pulses on selection but doesn't change texture on swap is a `TileObj.setTexture` problem; a tile that doesn't pulse is a selection/input problem in `GameScene.js`'s pointer handler.
- Texture keys are case-sensitive and tier-indexed; `iconKey("grass_hay", 2)` and `iconKey("grass_hay", "2")` are different strings.

## When to invoke

- The user reports a visual bug that doesn't match the reducer state.
- A new resource was added but its tile shows blank or default.
- Resize/orientation change breaks board centering.
- An action dispatched correctly (verified via React DevTools or `check-slice-action`) but the canvas doesn't update.
- During code review when a PR touches both `src/state.js` and `src/GameScene.js`.
