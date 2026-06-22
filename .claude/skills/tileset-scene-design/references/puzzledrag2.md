# puzzleDrag2 anchor — TownScene + Tuxemon tileset

The settlement view (the `#/town` route) is where this skill applies today. It is a Phaser tilemap that
currently violates the core rule: **roads are one flat tile, no autotiling, hard seams everywhere.**
The full diagnosis + design lives in `reference/docs/road-system-proposal.html` — read it for the before/after.

## The renderer
- **`src/ui/town/TownScene.ts`** — Phaser scene. Grid is **40×30 @ 32px** (1280×960 design space).
  - `paintRoads()` walks road polylines → `paintBand()` stamps a rectangle of `T.DIRT`.
  - `paintPlaza()`, `paintFields()`, `drawBoards()` also stamp `T.DIRT` (flat).
  - `T = { GRASS:26, GRASS_ALT:[50,51,76,77,98,99], GRASS_FLOWER:[120,121], DIRT:35, WATER:250 }`.
  - When `plan.groundTiles` is present it paints straight from an authored grid and skips the procedural
    passes (`paintGroundTiles()`).
- **`src/ui/town/townMaps.ts`** — hand-authored tier maps (home Hamlet/Village/City, quarry rungs).
  Roads drawn with `roadH()`/`roadV()` writing flat `DIRT` bands into a `number[][]` grid.
- **`src/townLayout.ts`** — procedural `buildTownPlan()`. Already emits road **centre-lines + width**
  (`roads: {points, width, kind}`), plaza ellipse, water polygons, bridges where roads cross the river.
  Good semantic data that gets flattened too early.
- **`src/ui/TownPhaserCanvas.tsx`** — React host that boots the scene.

Both render paths (authored grid + procedural plan) end at the same flat-`DIRT` stamp, so an autotiler
inserted at the paint step fixes **every** settlement at once.

## The tileset
`public/town/tileset.png` — **Tuxemon sample tileset**, CC-BY-SA 4.0 (credited in
`public/town/CREDITS.md`). 816×1020, **24 cols × 30 rows**, 32px, **extruded `margin=1, spacing=2`**.
Index → `col=i%24, row=i//24`; pixel `sx=1+col*34, sy=1+row*34`.

Inspect it: `python .claude/skills/tileset-scene-design/scripts/tileset_montage.py public/town/tileset.png --tile 32 --cols 24 --margin 1 --spacing 2 --rows 0-9`

### Transition sets already in the sheet (all unused today)
- **grass ↔ sand rounded blob** (flat, soft, the right fit for paths):
  fill `173` · edges `149`(top) `197`(bottom) `172`(left) `174`(right) ·
  outer corners `148` `150` `196` `198` · inner corners `170` `171` `194` `195` · flower decals `151/175/199`.
  These produced the "after" in the proposal — a soft 3-wide road + a rounded plaza, zero new art.
- **grass ↔ dirt CLIFF** (cols 0–7, rows 0–4): brown organic edges with a light top-lip + grey stair
  tiles. This is an **elevation/ledge** set — reads as a cliff face, NOT flat ground. Don't use it for
  roads; it implies a drop.
- **bridges** `219–223` (blue plank + rail) and **logs** `218` — wire at the river crossings
  `buildTownPlan()` already computes.
- **water** `250`; tree recipes (pine `168/192`), rocks `224/225`, fountain block `272…322`.

## Wiring plan (matches reference/docs/road-system-proposal.html)
1. New `src/ui/town/roadAutotile.ts`: build masks from `plan.roads`/`plaza`/`fields`, run the 4-bit
   line autotiler (roads) + blob (plaza/fields) using `references/autotiling.md`.
2. `TownScene`: replace the flat-`DIRT` stamps in `paintRoads/paintPlaza/paintFields` with
   "rasterise into mask → autotile". `townMaps.ts` `roadH/roadV` write the mask instead of the grid.
3. Bump widths in `buildTownPlan`: `STREET` → 2 tiles (64px), `AVENUE` → 3 (96px) so a 2-sided border
   fits and the avenue hierarchy returns.
4. Phase 0 uses the sand-blob indices above (no art). Phases 1–2 swap in a bespoke dirt/gravel/cobble
   family + material-by-tier (see proposal). `src/ui/town/config.ts` already has per-theme
   `road/roadLine/dirtTint` to drive material palette.

## Gotchas specific here
- **Pixel-art crispness**: the town game boots Phaser with `render.pixelArt:true`. Keep tiles aligned to
  the 32-grid; don't introduce sub-pixel road widths (snap to 16/32 — `townLayout` already snaps).
- **Goldens**: this is deterministic; a road change shifts many visual goldens. Run `npm run test:visual`
  and re-baseline intentionally (note: Windows host may not be the canonical golden host).
- **The brown cliff trap**: it's tempting to use the brown blob (cols 0–7) for dirt roads because it's
  brown — but it reads as a cliff edge. Use the sand blob (flat) for paths.
- **1-wide roads**: today's `STREET≈30px` ≈ 1 tile can't carry a 2-sided soft border — hence the width
  bump. An area-blob on a 1-wide road shows two half-edges and a hole at junctions.
