# Town 2D Lighting Layer (dusk glow + lamp pools)

> One-line: "Implementation brief — point a fresh session at this file. Self-contained: goal, plan, success criteria, and how to validate & double-check."

## Goal

The home/quarry town renders as a flat, evenly-lit top-down scene — clean, but lifeless. This project adds a **2D lighting layer** on top of the existing town render: a time-of-day (or per-season) **tint ramp** that warms/cools the whole scene, **warm window glow** on built buildings, and soft **lamp/torch pools** at lamppost props — to give the town the cozy "lantern-lit diorama" mood without changing the projection, the grid, or any tile art.

This was already **decided** in a prior camera study: keep the ¾ top-down view and *add a dynamic 2D lighting layer* (runner-up was cabinet-oblique; camera rotation was rejected). This brief is the build-out of that decision. It ships entirely on the existing `TownScene` and the Tuxemon ground/v2kit building sprites — no new tilesets, no diamond grid, no projection rewrite.

## Background & current state (VERIFIED)

All paths below were opened and verified in this worktree. **Repo-wide doc drift: CLAUDE.md says `.js/.jsx`; the real files are `.ts/.tsx` (e.g. `src/ui/town/TownScene.ts`, `src/ui/Town.tsx`). The React wrapper imports them with `.js`/`.jsx` specifiers (Vite/TS resolution) — e.g. `TownPhaserCanvas.tsx:4` imports `"./town/TownScene.js"`. Trust the code.**

### The prior decision — this is the mandate (VERIFIED)
- `docs/town-camera/data.json` `recommendation` (lines 2–7):
  - `primary` = **"current-34-topdown … enhanced with eastward-lit-topdown (a dynamic 2D lighting layer)"** and optionally a tilt-shift garnish.
  - `runnerUp` = **cabinet-oblique** — "adopt this only if the team wants more dimensionality than lighting alone provides."
  - `rotationVerdict` (line 6) = **"NO — do not build camera rotation."** (Coral Island is the cited clincher: a full-3D cozy game that *deliberately locks* the camera.)
  - `rationale` (line 5): "the highest-value move is NOT to change the projection but to raise its production value cheaply: layer Eastward/Sea-of-Stars-style dynamic 2D lighting (warm lantern pools, glowing windows, dusk gradients) for the cozy-night diorama mood."
- The `eastward-lit-topdown` master variant (`data.json` lines 65–103) spells out the same path: effort **Medium**, "Reuses the entire square grid, drag hit-testing, autotiler and existing seasonal tiles," and the **key gotcha** below.
- **⚠ CRITICAL GOTCHA carried by the decision itself** (`migrationNote` line 7 + `eastward-lit-topdown.cons`): the seasonal/board tiles **already BAKE their own light**, so real-time per-sprite lighting risks **double-lighting**. The cheap mitigation is to keep lighting as a *coarse overlay* (a scene-wide tint + a few additive glow blobs) rather than a true normal-mapped per-sprite light pass — see Approaches. The town buildings are flat-front v2kit SVGs (not the baked-season board tiles), so a gentle multiply/overlay over them reads fine.

### The town renderer — `src/ui/town/TownScene.ts` (VERIFIED, no lighting today)
- `create()` (line 114) runs in order: `bakeSpriteTextures()` → `bakeBuildingTextures()` → `createCharacterAnims()` → **ground** (tilemap `groundLayer`, depth `-1000`, line 125–126; painted procedurally or from `plan.groundTiles`) → **object layer** (`drawBoards` 445, `drawTrees` 365, `drawStreetTrees` 383, `drawProps` 393, `drawFences` 421, `drawLotDecor` 433, `rebuildBuildingsAndPlots` 491) → `spawnVillagers` 556 → **camera** (151–161) → the `town.update_built` listener (163).
- Everything in the object layer is **depth-sorted by baseline Y** (`sprite.setDepth(baseY)` etc.). The ground layer is pinned at depth `-1000`. **A lighting overlay therefore attaches AFTER the object layer**, at a very high depth (e.g. `setDepth(100000)`) so it sits above ground, props, buildings and villagers. `cameras.main.setBackgroundColor("#4e7a39")` (line 158) — the overlay must also cover the grass margins or use a camera-locked full-viewport rect.
- **No day/night, no tint, no lights today.** The only environmental dimming is a *DOM* vignette in `Town.tsx` (line 348–351, `radial-gradient … rgba(0,0,0,0.28)`) rendered as a React div *over* the canvas — not a Phaser layer. There is no `decorLayer` field instantiated despite the declared `decorLayer!: Phaser.GameObjects.Layer` (line 86) — objects are added directly via `this.add.*` and Y-sorted, so the lighting overlay is its own new object, not a member of a container layer.
- **Lamppost props already exist** (`drawProps`, lines 411–417): `p.kind === "lamppost"` draws a brown post + a `0xffe9a8` (warm) lamp circle at `(p.x, p.y - 28)`. These `p.x,p.y` are the **exact anchors for lamp glow pools**. `well`/fountain at `(well.cx, well.cy)`. Built buildings are placed in `rebuildBuildingsAndPlots` at `(l.cx, l.cy + l.h/2)` with origin `(0.5, 1)` — the **window-glow anchor** is roughly `(l.cx, l.cy)` (building body centre, above the base).
- **Blend-mode precedent in this codebase:** `src/features/cartography/MapScene.ts` already uses `setBlendMode(Phaser.BlendModes.MULTIPLY)` for a vignette (line 316) and `ADD`/`SCREEN` for glows (lines 537, 601, 714). So the cheap overlay approach (a MULTIPLY tint + ADD glow blobs) is an **established pattern in this repo's Phaser scenes**, not new ground.

### It is a NESTED, separate Phaser game (VERIFIED — important)
- `src/ui/TownPhaserCanvas.tsx` boots its **own** `new Phaser.Game({ … scene: [TownScene] })` (line 133), distinct from the main board game. `window.__phaserScene` is the **GameScene (board)**, per `src/visualTesting/global.d.ts:30` — **NOT** the TownScene. To reach the town scene at runtime you go through the React-owned game instance: `gameRef.current.scene.scenes[0]` (see `TownPhaserCanvas.tsx:99,172,250`). Implication: a console live-verify must grab the town game, e.g. via a small `window.__townScene` debug hook you add, or by reaching the canvas through the React tree — `window.__phaserScene` will NOT be it.
- The scene is **restarted** (not destroyed) on a zone change or tier-up (`TownPhaserCanvas.tsx:222–242` and the postBoot `scene.restart` at 177). Anything created in `create()` (the lighting overlay included) is rebuilt on restart — good. The `town.update_built` event (TownScene line 163) re-runs `rebuildBuildingsAndPlots()` when React state changes — **window glows must be refreshed there too**, since which buildings are built changes.

### How a clock could drive the tint (VERIFIED — the scene gets NO season today)
- `TownPhaserCanvas` props (lines 19–38): `zoneId, plan, builtLots, buildingsMap, pendingBuilding, active, onReady, onPlaceBuilding, onClickBuilding, onClickBoard`. **There is no season/turn/timeOfDay prop.** `init()` data (TownScene line 98) carries only `plan/builtLots/buildingsMap/pendingBuilding/initialCameraState/zoneId`. So a tint clock must be **added as a new prop threaded TownView → TownPhaserCanvas → scene** (init data + a new `town.update_light` event for live changes), mirroring how `builtLots` is forwarded as restart seed *and* synced via `town.update_built` (TownPhaserCanvas lines 107–114, 231–238).
- The natural season source already exists: `seasonIndexInSession(turnsUsed, turnBudget)` / `seasonNameInSession(...)` in `src/features/zones/data.ts:109,118` (returns 0..3 / `"Spring".."Winter"`). **But in the town view there is no active farm run** — `turnsUsed` is the last-run value (same nuance flagged in doc 07). For an MVP a **single fixed "golden-hour/dusk" tint** (or a slow real-time day/night cycle independent of game turns) is simpler and avoids tying ambient mood to a stale counter. **Recommendation:** ship a fixed dusk tint first (no clock dependency), then optionally key it to season as a follow-up by threading the season prop. `Town.tsx` already computes `tier`/`mapCurrent`/`state` and could compute a season index trivially if desired.

### Reduced-motion + settings (VERIFIED)
- The board honours `window.matchMedia("(prefers-reduced-motion: reduce)")` via `GameScene._motionEnabled()` (`src/GameScene.ts:2005–2014`) — "the correct seasonal STATIC art is still baked when motion is off." Use the **same** check in TownScene: when reduced-motion is on, render the tint + glows **statically** (no flicker/pulse animation), but keep them — they are not motion, they are color. Only any *animated* flicker on lamps must be suppressed.
- No persisted "lighting on/off" setting exists today; lighting is ambient render, not game state — **do not** add a persisted toggle (no `SAVE_SCHEMA_VERSION` bump). If a user setting is wanted later it can live in the existing settings surface; out of scope here.

## Scope

**In scope:**
- A new lighting **overlay** drawn in `TownScene` after the object layer, at a high depth, covering the full town extent + margins.
- A **tint ramp**: a scene-wide color wash (MULTIPLY for a dusk/cool dim; or a soft warm overlay) at a tuned, low alpha. MVP = a single fixed dusk tint; structured so a `lightLevel`/`season` input can drive it later.
- **Warm window glow** on each built building (an ADD/SCREEN soft blob at the building body, refreshed in `rebuildBuildingsAndPlots`).
- **Lamp pools**: a soft additive glow blob at each `lamppost` prop anchor and the fountain/well.
- Threading a new **`timeOfDay`/`lightLevel` prop** (number, e.g. 0=day…1=night) from `TownView` → `TownPhaserCanvas` → scene (init data + a `town.update_light` event), even if the MVP value is a constant — so the ramp is wired end-to-end.
- **Reduced-motion respect**: tint + glows render statically when `prefers-reduced-motion: reduce` (only animated flicker is suppressed).
- Unit tests for any **pure** tint-ramp helper (a `lightLevel → {tint, alpha}` function lives in a plain module vitest can test); manual in-game verify of the canvas layer.

**Out of scope / non-goals (keep tight):**
- **Phaser `Light2D` pipeline / per-sprite normal-mapped lighting** — explicitly a *Phase 2* (see Approaches + the double-lighting gotcha). The MVP is graphics-overlay only.
- New tile/building **art**, normal maps, or flat-lit tile variants.
- **Camera rotation** (rejected by the decision) and any **cabinet-oblique** re-projection (the decision's runner-up, a separate, larger effort).
- A **tilt-shift / DOF** post-process (the decision's optional garnish; `data.json` `tilt-shift-diorama` — own brief if wanted; carries the "town smudge" hi-res-downscale gotcha).
- Tying the tint to **real game turns/season** as the primary driver (MVP = fixed dusk; season-keying is an optional follow-up).
- Any **persisted-state** change → **no `SAVE_SCHEMA_VERSION` bump**.
- Re-baselining **visual goldens** on this host (not possible here; see Validation).

## Approaches (and the recommendation)

**(a) Cheap graphics overlay — RECOMMENDED, this is the MVP.**
A `Phaser.GameObjects.Graphics`/`Image`/`Rectangle` overlay at high depth:
- Full-extent rect with `setBlendMode(MULTIPLY)` and a dusk color (e.g. a deep blue-violet) at low alpha → uniform cool dim.
- Per-light ADD/SCREEN radial-gradient blobs (a pre-baked soft-circle texture, tinted warm) at lamppost/window anchors → they "punch back" the dim with warm pools.
- **Pros:** zero engine change, reuses the square grid + all existing sprites, no per-sprite pipeline opt-in, **no double-lighting** (it's a coarse wash over already-baked art, not a re-light), trivially cheap on mobile (a handful of draw calls), already-proven pattern (`MapScene` blend modes). **Cons:** not physically-lit; glows are placed, not cast (no occlusion). For a cozy mobile farm game this is exactly the genre-correct trade (`data.json` calls it the "cheapest 'premium' upgrade that stays inside a 2D engine").

**(b) Phaser `Light2D` pipeline with point lights — OPTIONAL PHASE 2.**
Enable `this.lights.enable()`, add `this.lights.addLight(x,y,radius,color,intensity)` at lamps/windows, opt each lit sprite into the `Light2D` pipeline (`sprite.setPipeline("Light2D")`). Richer, real attenuation. **Cons (why it's deferred):** every lit sprite needs the pipeline + ideally a **normal map** or it just flat-tints; it **collides with the baked-light seasonal art** (the documented double-lighting gotcha) so it needs flat-lit variants/normal maps — *exactly the per-asset cost the decision says to avoid first*; heavier on mobile GPUs. Pursue only if overlay-first proves insufficient.

**Why (a) first:** mobile perf (a few extra quads vs a deferred-light pass per sprite), **zero art cost** (no normal maps / flat-lit re-bakes), and it satisfies the cozy-night reference the decision actually asked for. Phase 2 is a clean follow-up if more fidelity is wanted.

## Implementation plan

Touch order: pure ramp helper → scene overlay → glow refresh → bridge the prop → reduced-motion → tests.

### 1. Pure tint-ramp helper — new `src/ui/town/townLighting.ts`
A plain, React-free, Phaser-free module (so vitest covers it and TownScene can import it without pulling React):
```ts
export interface TownLight { tintColor: number; tintAlpha: number; glowColor: number; glowAlpha: number; }
// lightLevel: 0 = full day (no dim), 1 = night/dusk (max warm-pool contrast)
export function townLightFor(lightLevel: number): TownLight { /* clamp + interpolate */ }
```
Keep MVP simple: a single dusk preset is `townLightFor(0.6)` or similar. Document the season mapping (`seasonIndexInSession`) in a comment for the follow-up but don't wire it as the primary driver.

### 2. Lighting overlay in `TownScene` — `src/ui/town/TownScene.ts`
- Add fields: `lightLevel = 0;`, `lightOverlay?: Phaser.GameObjects.Graphics;`, `lightGlows: Phaser.GameObjects.Image[] = [];`, and bake a soft-circle glow texture in `bakeSpriteTextures()` (a radial-alpha gradient onto a canvas texture, like `bakeRecipe` does).
- Add `init()` field `lightLevel?: number` and store it (mirror `pendingBuilding`).
- Add `drawLighting()` called at the **end of `create()`** (after `spawnVillagers`) and also at the end of `rebuildBuildingsAndPlots()` (so window glows track built buildings). At the top of `drawLighting()` destroy/clear the previous overlay + glows (mirror `buildingSprites` cleanup).
- Overlay rect: `this.add.rectangle(0,0, plan.width, plan.height, tint).setOrigin(0).setBlendMode(MULTIPLY).setAlpha(tintAlpha).setDepth(100000)` (or a Graphics fill). It must cover the camera bounds; the camera background is `#4e7a39` (line 158) and the town extent is `plan.width/height` (default 1280×960).
- Window glows: for each built lot in `buildingsMap`, add a warm glow `Image(glowTex)` at `(l.cx, l.cy)` with `setBlendMode(ADD)`/`SCREEN`, scaled to the building, depth just under the overlay but above the building. Lamp pools: one glow at each `props` `lamppost` anchor and at `(well.cx, well.cy)`.
- **Honor reduced-motion** (`window.matchMedia("(prefers-reduced-motion: reduce)")`, copy `GameScene._motionEnabled` logic): if motion is off, do not start any flicker tween — the static tint + glows still render.

### 3. Live update event — `TownScene`
- In `create()`'s event block (near line 163) add a `this.events.on("town.update_light", (d:{lightLevel:number}) => { this.lightLevel = d.lightLevel; this.drawLighting(); })`.

### 4. Bridge the prop — `src/ui/TownPhaserCanvas.tsx`
- Add `lightLevel?: number` to `TownPhaserCanvasProps`.
- Forward it in the postBoot `scene.restart({...})` seed (line 177) and the per-zone restart (line 231) — add to both `restart` payloads alongside `builtLots`.
- Add a sync effect mirroring lines 107–114: when `lightLevel` changes, `scene.events.emit("town.update_light", { lightLevel })`. (No ref needed — it's data, not a callback closure.)

### 5. Pass it from `TownView` — `src/ui/Town.tsx`
- Add `lightLevel={DUSK}` (a constant, e.g. `0.6`) to the `<TownPhaserCanvas>` props block (lines 323–343). MVP: a literal. Follow-up: compute from `seasonIndexInSession(state.turnsUsed, state.turnBudget)` or a real-clock day/night value.
- Consider toning down the existing DOM vignette (Town.tsx:348–351) so it doesn't stack with the new in-canvas dim — verify they don't compound into mud.

### 6. Slice / persistence — DECISION: nothing to register, no bump
Lighting is ambient render driven by a prop, not dispatched state. **No new reducer action** (no `SLICE_PRIMARY_ACTIONS`/`ALWAYS_RUN_SLICES` change) and **no `SAVE_SCHEMA_VERSION` bump**. If `lightLevel` is later derived from `state` in `Town.tsx`, it's read-only — still no action.

### 7. Tests + verify (see Validation).

After code changes: `graphify update .`

## Success criteria

- [ ] In the running home town, the scene shows a clear ambient **dusk tint** (the whole town is cooler/dimmer than today) with **warm glow pools** at lampposts and the fountain.
- [ ] Each **built building** has a warm window glow; an **unbuilt plot** has none. Building a building at runtime makes its glow appear (via `town.update_built` → `rebuildBuildingsAndPlots` → `drawLighting`), without a scene restart.
- [ ] The lighting layer sits **above** ground, props, buildings and villagers (correct depth) and does not eat pointer input (overlay is non-interactive; building/board/NPC taps still work).
- [ ] `townLightFor(0)` is effectively no dim (day); higher levels increase the cool wash + warm-pool contrast — covered by a unit test.
- [ ] With `prefers-reduced-motion: reduce`, the tint + glows still render (color is not motion); no flicker animation runs.
- [ ] Changing the `lightLevel` prop live re-tints the scene (sync effect fires `town.update_light`); a zone change / tier-up keeps the lighting (rebuilt in `create`/`rebuildBuildingsAndPlots`).
- [ ] `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` all pass. **No new console errors** (the e2e gate forbids them — watch for a Phaser texture-key reuse on the glow texture; guard `if (this.textures.exists(key)) return` like `bakeRecipe`).
- [ ] `SAVE_SCHEMA_VERSION` unchanged; an existing save still loads; no new reducer action.

## Validation — how to verify

### Gating (must pass before PR)
- `npm run lint` — clean.
- `npm run typecheck` — clean (new prop type, `init` field, `town.update_light` payload, overlay/glow types).
- `npm test` — all vitest green, including a **new** `src/__tests__/town-lighting.test.ts` (node env, no canvas): `townLightFor(0)` ≈ no-dim; `townLightFor(1)` returns a non-zero `tintAlpha` and a warm `glowColor`; monotonic dim as `lightLevel` rises; clamps out-of-range input. (The canvas drawing has **no jsdom coverage** — keep all *logic* in the pure helper; the overlay itself is exercised only by e2e/visual + manual.)
- `npm run build` — production build succeeds.

### Canvas e2e (informational — e2e is in CI but non-blocking today)
- Optional new `tests/e2e/town-lighting.spec.ts`: boot into the home town, reach the town game (`gameRef`/scene-0, NOT `window.__phaserScene`), assert the lighting overlay object exists and that glow count > 0 once a building is built. Assert **zero console errors** (the existing gate; catches a texture-key reuse).

### Manual in-game verify on THIS Windows host (preview_screenshot HANGS — do not use it)
- Spin a worktree Vite on a spare port with the correct base (worktree has no node_modules):
  `node ../../../node_modules/vite/bin/vite.js --port 5192 --base /puzzleDrag2/`
- Navigate to the town. **Reaching the scene:** `window.__phaserScene` is the BOARD (GameScene), not the town. Add a temporary `window.__townScene = this` at the end of `TownScene.create()` (or read it via the React-owned game) to inspect — then `window.__townScene.lightOverlay` should exist and `window.__townScene.lightGlows.length` should grow as buildings are built.
- Drive state via `window.__hearthVisual.dispatch(...)` to grant gold and build a building, then confirm a new window glow appears (assert via the scene object / DOM, **not** a screenshot).
- Confirm input still routes: tap a built building and confirm `town.clickbuilding` still fires (overlay is non-interactive).

### Visual goldens — DO NOT re-baseline here
Adding a tint + glows **will** change every town golden. Per project memory ("Visual goldens host limits"), goldens are **not regenerable on this Windows host** (DOM drifts 3–5%; Phaser WebGL canvas ~38% from host GPU/fonts). Re-baseline on the canonical CI host and justify the diff in the PR; do not regen locally.

## Double-check / adversarial review

- **No double-lighting:** the MVP is a coarse overlay over already-baked art (NOT a per-sprite re-light), so there's no double-lighting — *unless* you mistakenly reach for `Light2D` (Phase 2). Keep it overlay-only and verify the seasonal board tiles (a different scene) are untouched.
- **Depth correctness:** prove the overlay is above buildings/villagers AND below nothing that needs to read through it — set a deliberately high `setDepth` and confirm a villager walking under a building still gets dimmed uniformly.
- **Input integrity:** the overlay must be non-interactive (don't call `setInteractive`); confirm building/board taps and build-placement still work with the overlay present.
- **Restart survival:** trigger a `TIER_UP` / zone change and confirm the lighting reappears (it's built in `create`/`rebuildBuildingsAndPlots`, which re-run on restart) — a common Phaser regression is state that lives only in `create` and is dropped on `scene.restart`.
- **Texture-key reuse:** the soft-circle glow texture is baked once; guard with `if (this.textures.exists(key)) return` (like `bakeRecipe`/`preload`) or `scene.restart` will warn "key already in use" and trip the e2e console-error gate.
- **Margin coverage:** the town is a finite 1280×960 extent inside grass margins (`marginGrass`, Town.tsx:225) with a DOM vignette on top. Make sure the in-canvas tint covers the full `plan.width/height` and doesn't leave a bright unlit band, and that it doesn't compound with the DOM vignette into an over-dark mud.
- **Rollback safety:** no persisted-shape change, no new reducer action — reverting the `townLighting.ts` + TownScene/TownPhaserCanvas/Town.tsx edits fully restores prior behaviour; saves unaffected.

## Risks & gotchas

- **It's a NESTED, separate Phaser game.** `window.__phaserScene` is the board (GameScene), per `global.d.ts:30`; the town scene is `gameRef.current.scene.scenes[0]` inside `TownPhaserCanvas`. Live-verify and any e2e must reach it through the React-owned game, not the global.
- **Double-lighting is the decision's headline gotcha** (`data.json` migrationNote): seasonal/board tiles bake their own light. The overlay MVP sidesteps it; `Light2D` (Phase 2) re-introduces it and needs flat-lit variants/normal maps — that's why Phase 2 is deferred.
- **The scene gets NO season today.** Don't assume a `season` is available — it must be threaded as a new prop. And `turnsUsed` in the town view is the *last-run* value (stale), so don't bind ambient mood to it without thought; a fixed dusk (or real-clock cycle) is the cleaner MVP.
- **Reduced-motion** must be honored for any *animated* flicker (copy `GameScene._motionEnabled`), but the static tint/glow should remain (color isn't motion).
- **No `SAVE_SCHEMA_VERSION` bump** — lighting is render, not state. A bump wipes every save (no migration ladder unless doc 08 has landed).
- **Visual goldens are NOT regenerable on this host** — this change alters every town golden; re-baseline on CI.
- **DOM vignette already exists** (Town.tsx:348) — tune it down so the two dims don't stack into mud.
- **Performance:** keep it to a single overlay rect + a small number of glow quads; do not add a per-tile light or a real-time per-sprite pipeline in the MVP (mobile budget).

## References

- `docs/town-camera/data.json` — the decision: `recommendation` (lines 2–7: `primary`/`runnerUp`/`rotationVerdict`/`migrationNote`); `eastward-lit-topdown` master variant (lines 65–103, the lighting path + double-light gotcha); `normalmapped-topdown` (104–134, the Phase-2 normal-map cost); `tilt-shift-diorama` (the deferred garnish). Rendered board: `docs/town-camera/index.html`.
- `src/ui/town/TownScene.ts` — `create()` order (line 114), ground layer depth `-1000` (125), object layer + Y-sort, `drawProps` lamppost anchors (411–417), `rebuildBuildingsAndPlots` (491, building positions + the `town.update_built` rebuild), `bakeRecipe` (texture-bake + exists-guard, 173). Attach the overlay after `spawnVillagers` (148) and refresh glows in `rebuildBuildingsAndPlots`.
- `src/ui/TownPhaserCanvas.tsx` — separate `new Phaser.Game` (133), `scene.scenes[0]` access, restart seed (177, 231), the `builtLots/buildingsMap` sync effect to copy for `lightLevel` (107–114). Add `lightLevel` prop + `town.update_light` emit.
- `src/ui/Town.tsx` — `TownView` (207); `<TownPhaserCanvas>` props block (323–343, add `lightLevel`); the DOM vignette (348–351, tune down).
- `src/features/cartography/MapScene.ts` — in-repo precedent for `setBlendMode(MULTIPLY/ADD/SCREEN)` (316, 537, 601, 714).
- `src/features/zones/data.ts` — `seasonIndexInSession`/`seasonNameInSession` (109, 118) for the optional season-keyed follow-up.
- `src/GameScene.ts` — `_motionEnabled()` (2005–2014), the reduced-motion pattern to copy.
- `src/visualTesting/global.d.ts:30` — proves `__phaserScene` is GameScene (board), not TownScene.
- Skills: `phaser-scene-debug` (React↔registry↔scene boundary), `pre-pr-check`.
- Memory: "Live game preview verify" (`window.__phaserScene`/`window.__hearthVisual`; preview_screenshot hangs; worktree Vite on a spare port — note the town scene is NOT `__phaserScene`), "Visual goldens host limits", "Town camera decision".
- Companion docs: 07 (living-named-town — same TownScene + bridge-ref pattern; same `turnsUsed`-is-stale-in-town nuance), 08 (save-migration ladder — only relevant if a persisted field is ever added).
