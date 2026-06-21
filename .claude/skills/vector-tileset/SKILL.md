---
name: vector-tileset
description: >-
  Build and place the puzzleDrag2 town's REUSABLE VECTOR tileset — the trees, bushes, rocks, fences,
  lamps, market stalls, construction clutter and water-edge decor that dress the settlement — by reusing
  the game's Canvas-2D icon draws (src/textures/categories/*) baked into the Phaser TownScene, instead of
  the old third-party Tuxemon pixel recipes. Use whenever the user wants to make the town map richer /
  higher-quality / more "AAA" / more like the reference, add or vary town props / nature / decor, replace
  the pixel trees-rocks-bushes with vector art, author a new ground ROAD MATERIAL (cobble / flagstone /
  stone-block / gravel / brick) or a per-tier paving progression, add ambient town ANIMATION (flowing
  water, tree sway, lamp glow), or wire a new reusable tile into the town. For terrain transition tiles
  use tileset-scene-design; for the settlement LAYOUT/growth use growing-settlement-layout; for the raw
  pixel-art craft of a single sprite use pixel-art-craft.
---

# Vector tileset for the town

The town map (`src/ui/town/`) is built from THREE reusable, code-drawn layers — no
third-party pixel tileset, no per-tile PNGs:

1. **Ground** — `proceduralGround.ts` paints the whole terrain from SDFs (grass,
   river/pond with smooth shores, paved roads, plaza, bridges, farm soil). Roads
   carry a reusable **material** and transitions are computed, not authored.
2. **Props/nature** — a **vector tileset**: Canvas-2D `(ctx) => void` draws reused
   straight from the shared icon catalog (`src/textures/categories/*`) plus a few
   town-specific ones (`src/ui/town/tiles/townProps.ts`), baked into Phaser
   textures keyed `tt_<name>` and placed depth-sorted.
3. **Buildings** — painted SVG components (`src/ui/buildings/*`) baked via
   `bakeSvgTexture`.

This skill is about layers 1 and 2: the reusable tileset and the road materials.

## The one idea

**Don't draw new pixel art and don't add PNGs — reuse the Canvas-2D draws the rest
of the game already uses, baked into the town scene.** `src/textures/categories/`
holds 50+ files of ground-anchored, painterly vector draws (trees, nature, flowers,
ores, cozy decor, furniture, animals…). They share one centred convention: origin
at `(0,0)`, ground-contact at `y≈22`, gradients + selective dark outline + a
highlight dab. The town bakes them at 3× and places them as sprites. One art
codebase serves the board AND the town.

## Add or place a prop (the loop)

1. **Pick a draw.** Search `src/textures/categories/*` for an existing one
   (`cozy_fountain`, `tile_tree_oak`, `nature_cattail`, `tile_flower_water_lily`…).
   Only author a new draw in `src/ui/town/tiles/townProps.ts` if nothing fits —
   match the centred convention and the shared `shadow()` helper (ground at y≈22).
2. **Register it** in `src/ui/town/tiles/manifest.ts` → `TOWN_TILES`: `{ draw, box,
   groundY }`. `box` is the square texture size (icon units; draws live in ≈[-34,30]);
   `groundY` is the contact Y so the sprite anchors correctly. Use the `tree(...)`
   / `prop(...)` helpers. The texture key is `tt_<name>` (see `ttKey`).
3. **Bake** — `TownScene.bakeTownTiles()` already loops `TOWN_TILES`; nothing to do
   unless you need a new size.
4. **Place it** — author it into `src/ui/town/townMaps.ts` as a `prop`/`tree`
   (`homeProps(tier)`, `homeTrees(tier)`). `TownScene.drawProps`/`drawTrees` map the
   authored `kind`/`species` to the tile and call `placeTownTile(name, x, y, boxH)`,
   which sets the ground-anchored origin (`ttOriginY`) + depth = Y. **The vector
   draws carry their own shadow — never add another** (`addShadow`).
5. **Verify** with a dev-server screenshot (see below).

`drawProps` keeps the old Tuxemon recipe as a *fallback* (`placeTownTile` returns
null until a texture bakes), so zones without authored vector props still render.

## Add a road material (multi-material paved streets)

Materials live in `proceduralGround.ts`:

- Add a palette pair (+ grout for block pavers) to `C`, a name to the
  `GroundMaterial` union and to `MAT_ORDER`, and a `case` in `materialColor()`.
  Block pavers (flagstone/stone_block/brick/sandstone) go through `blockPaver()` —
  tune `cell`, `grout` width (small = crisp), `cellW`, `stagger` (brick bond),
  `bevel`. **Crisp paving = a narrow grout band + strong top-left bevel** (unlike
  the soft jittered `cobble`).
- Tag a road in `townMaps.ts` with `material:` (default `"dirt"`); the plaza
  `cobble` ellipses take a `material` too. Transitions stay smooth automatically
  (distance feather) — never author transition tiles for this.
- **Per-tier paving progression** (the streets "pave over" as the town grows): see
  `homeRoadMaterial(role, tier)` — dirt → packed_dirt → cobble → stone_block.

## Ambient animation

Mirror `src/textures/smoke.ts` (baked texture + tweens + an `update` loop that
pauses with the scene — zero off-screen cost):

- **Flowing water** — `src/ui/town/water.ts`: a seamless caustic `TileSprite`
  masked to the river/pond, scrolled downstream each frame, with sparkle motes that
  drift along the river centre-line and an alpha breathe for the pond. Built in
  `create()` from `plan.groundSpec`, advanced in `update()`, torn down on
  `SHUTDOWN` (its geometry-mask graphics isn't on the display list).
- **Props** — `TownScene.addSway` (trees/bushes/cattails bend about their base) and
  `addPropGlow` (lamps/lanterns pulse a warm additive glow). Stagger phases.

## Gotchas

- **Don't double the shadow** — every catalog/townProp draw bakes its own.
- **Centre on the bake** — `bakeTownTiles` translates to `(box/2, box/2)`; keep your
  draw centred at `(0,0)` or it renders off-anchor.
- **Place in safe zones** — keep props off lots / road centres / boards / water
  (water decor like rowboat/lily belongs ON the water). Verify by screenshot.
- **Keep counts bounded** (< ~400 objects/tier) — sprites are cheap baked textures,
  but the tween/anim load adds up.
- **Backward-compat** — quarry/mirefen still use the Tuxemon recipe fallback; don't
  delete `bakeRecipe`/`PINE`/`TREE2`/`BUSH`/etc.

## Verify (dev server screenshot)

```
npm run dev            # serves the game at /
```
Drive a headless browser (Playwright is a dev dep) to the town, seed
`settlements.home.tier` to view each rung, and screenshot the largest `<canvas>`.
Check: props match the painted buildings, nothing floats off-ground or clashes with
lots/roads, roads pave-progress dirt→cobble→stone-block, and the river visibly flows
(grab two frames a moment apart — `window.__townScene.waterOverlay`). Then
`npm run lint && npm run typecheck && npm test`, and `npm run test:visual` (justify
the town golden diffs).
