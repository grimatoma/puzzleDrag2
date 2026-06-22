---
name: tileset-scene-design
description: >-
  Design or fix a top-down TILE-MAP SCENE so terrains read as one cohesive world instead of blocky
  programmer-art. The central craft: never let two materials butt edge-to-edge as flat fills — bridge
  every boundary with TRANSITION TILES (a road→dirt tile between road and dirt, a sand→grass shore, a
  cliff edge) chosen automatically by an AUTOTILER from each cell's neighbours. Use this whenever the
  user is building, generating, or improving a tilemap / tileset scene and the ground looks blocky,
  harsh, hard-edged, "like a checkerboard", or "unfinished"; whenever they add or connect a terrain
  (road, path, dirt, sand, water, grass, snow, lava, plaza) to a tile map; whenever they mention
  autotiling, Wang tiles, blob tiles, terrain transitions, edge/corner tiles, tile seams, or "make the
  map cohesive"; and whenever they ask why a tilemap looks bad or how to lay out roads/paths/water on a
  grid. Covers BOTH using transition tiles already in a tileset (inspect → mask → autotile → verify) AND
  generating the missing ones. Anchored in puzzleDrag2's Phaser TownScene + Tuxemon tileset, but the
  principles transfer to any engine. For pure single-tile pixel art use pixel-art-craft; for animating a
  tile use pixel-art-animation; this skill is about composing many tiles into a coherent SCENE.
---

# Tileset Scene Design

Make a grid of tiles read as a place. The difference between "shipped game" and "programmer art" is
almost never the individual tiles — it is whether the **boundaries between terrains** are handled. This
skill is about those boundaries. (For the puzzleDrag2 town specifically, the ground is drawn from SDFs
with smooth computed transitions and reusable road **materials**, and the props are reusable Canvas-2D
VECTOR tiles, not an autotiled pixel tileset — see `vector-tileset`.)

## The one idea everything follows from

**Two terrains must never touch as flat fills.** A rectangle of road tiles slammed against a rectangle of
dirt tiles produces a hard, pixel-staircase seam — the single biggest "this is unfinished" tell. Between
any two materials you place a ring of **transition tiles**: the upper material's *fill*, plus its *edge*
tiles (where it fades to the lower material on one side), its *outer-corner* tiles (fades on two
adjacent sides), and its *inner-corner* tiles (fades only on the diagonal). Laid correctly, the boundary
reads as an organic, anti-aliased border instead of a staircase.

The user's example is exactly this: between **road** and **dirt** you need a **road→dirt transition
tile**, not road butted against dirt. And critically — transitions are **per ordered pair of terrains**.
A road→grass transition will look wrong where road meets *dirt*; that adjacency needs its own
road→dirt set.

Two things make it work:
1. **Transition tiles** (the art) — fill + 4 edges + 4 outer corners + 4 inner corners for the pair.
2. **An autotiler** (the code) — for each cell, look at which neighbours are the same terrain, pack that
   into a bitmask, and look up the matching tile. The border tiles fall out automatically; you never
   hand-place a corner.

## Mental model: a scene is layered terrain masks

Don't think "what tile goes here?" Think **layers**. Each terrain is a boolean **mask** over the grid.
Terrains have a fixed **paint priority** (which sits on top): e.g. `grass < dirt < road < water`. Paint
back-to-front; each layer fills its interior and draws its **border against everything beneath it** using
*that layer's* transition tiles. A cell shows the topmost terrain present.

This reframes authoring: the map author / generator describes **where** each terrain goes (road
centre-lines + width, a lake polygon, a plaza ellipse) → rasterise to masks → autotile picks **which**
tile per cell → paint. The semantic "where" layer never knows about corner tiles; the autotiler never
knows about gameplay. Clean seam, and every map that feeds the same masks gets fixed at once.

## The autotiler in one paragraph

For each cell, look at its neighbours, pack their state into a bitmask, and look that up in a small tile
table. **If your engine has a terrain/autotile system, use it** — Godot TileMap *terrains*, Tiled
*Terrain Sets*, Unity *Rule Tiles*. Hand-roll the lookup only for a raw tilemap (like Phaser, this
project). Pick the scheme by what the terrain *is* — the formal names (Boris the Brave's S-E2 / S-V2 /
S-V2E2 taxonomy) and full lookup tables are in **`references/autotiling.md`**:

- **Lines → an edge / "Wang" set (16 tiles).** Reads N/E/S/W = "is the neighbour the same line":
  roads, paths, fences, walls, rivers-as-lines. Gives straights, corners, T-junctions, a cross, end-caps.
- **Filled areas → a corner set (16, usually via the *dual-grid* half-tile offset) or the *blob* (47).**
  These read corners/diagonals so they can place **inner-corner** tiles. A *4-edge set on an area fill
  cannot tell an inner corner from an outer one* — that limitation is exactly why corner/blob schemes
  exist. Use them for grass/sand/water/plaza/biome fills.

A trap worth stating up front: an **area scheme can't render a 1-tile-wide line** — a 1-wide road becomes
two half-edge tiles with no interior and looks broken. Give lines an edge set, and a **minimum width of 2
tiles** if you ever fill them. (This is the exact failure that produces a "floating box" at a naive junction.)

## Workflow

### 1 · Inventory the tileset — you can't autotile what you can't see
Run `scripts/tileset_montage.py` to slice the sheet into a labelled, upscaled montage and read off
indices. Identify, for each terrain: its **fill**, and whether a **transition set** (edges + outer +
inner corners) exists against each terrain it will touch. Most tilesets ship transition blobs that the
renderer never uses — find them first.

```bash
python scripts/tileset_montage.py SHEET.png --tile 32 --cols 24 --margin 1 --spacing 2 --rows 0-9
```

Watch for **extrusion**: many sheets have `margin`/`spacing` (the Tuxemon set is `margin=1, spacing=2`).
Get these wrong and every tile slices half a pixel off and looks subtly smeared.

### 2 · Plan the terrain stack — the priority overlay
Give each material a **priority** (`grass < sand < dirt < road < water`). The canonical multi-terrain
method (RedBlobGames) is *not* to author every pair — it's a **priority overlay**: a cell matches a
neighbour for terrain T when the neighbour's priority is **≥ T**, and you paint terrains **back-to-front
by priority**, each drawing its own 2-terrain transition over *the union of everything below it*. So road
draws **one** transition over "whatever is lower," never a separate road↔grass *and* road↔sand. Levers on
top of that:
- **Neutral intermediate (art trick)** — a thin **dirt shoulder** around roads so road only ever borders
  dirt; then one road↔dirt set + dirt's own transition covers road-on-anything, and it reads as
  intentional. This is the cohesive, low-art-cost answer to the road/dirt example.
- Confirm each boundary that actually occurs has a transition set, or plan to make one (step 6).

See `references/autotiling.md` §5.

### 3 · Build masks
One boolean mask per terrain, rasterised from the semantic data. Roads: stamp the polyline at its width.
Water: fill the polygon. Plaza: fill the ellipse. Keep masks separate from the final tile grid.

### 4 · Autotile
For each terrain, top priority last: fill interior cells, then for border cells compute the neighbour
bitmask and write the transition tile from the lookup table. See `references/autotiling.md`.

### 5 · Verify by eye, from real tiles
Compose a small **before/after** straight from the tileset and look at it: a straight run, an outer
corner, an **inner corner**, a T-junction, a 4-way, and an end-cap. The failure modes are visual —
mismatched corners, a hard seam that slipped through, a junction with a hole. Inner corners and junctions
are where naive mappings break, so always include them in the check.

### 6 · Generate the missing transition tiles
If a needed pair has no transition set, make it — don't fall back to butting fills.
- Identify the *exact* missing slots (which edges/corners) from step 1.
- **Author the minimum, not 47.** Draw a **16-tile corner set** (for a dual-grid) or a handful of
  **quarter-tiles** — ½×½ sub-tiles, the RPG-Maker method — and let a generator *precompose* them into
  the full blob (Tilesetter, TileGen). **Symmetry** cuts it further: rotate/mirror a 5–6-piece base
  (clone the sprite before rotating). See `references/autotiling.md` §3–4.
- Hand-author with **pixel-art-craft**, or generate an autotile/Wang set with **pixellab**
  (`create_topdown_tileset` or a Wang tileset; it's async — poll then download).
- A transition tile = the upper fill with a feathered, anti-aliased band of the lower material on the
  relevant side(s); corners blend two sides; inner corners blend only the diagonal.
- Match **light direction and palette** to the fills, or the border reads as a pasted-on sticker. Cool
  shadows / warm highlights consistent with the rest of the sheet.

## Common pitfalls (most "bad tilemap" reports are one of these)
- **Butting two fills** with no transition — the core sin. Everything above prevents this.
- **One transition set for all pairs** — road→grass tiles used where road meets dirt. Transitions are
  per pair; respect the priority stack or add the missing set.
- **Area blob on a 1-wide line** — half-edges, no interior. Min width 2, or use a connectivity set.
- **Missing inner corners** — concave junctions show holes/wrong fill. The 8-bit blob exists for these.
- **Wrong material reused everywhere** — roads, plaza, fields, and board beds all painted with one tan
  tile so they melt together. Give each civic surface its own material and a clear border.
- **Mismatched light/palette** on a generated transition tile — it floats above the ground.
- **Extrusion ignored** when slicing — `margin`/`spacing` off by a pixel smears every tile.

## puzzleDrag2 specifics
This game's settlement view is a Phaser tilemap where the grass↔sand autotiler above is now **shipped**
for the hand-authored zone maps (`src/ui/town/roadAutotile.ts` + `townMaps.ts`) — so extend it, don't
rebuild it. The procedural fallback (`TownScene.paintRoads/paintPlaza/paintFields` for zones with no
authored map) is the remaining flat-fill path. The autotiler's API + role→index map, the live tileset
indices (note `26`/`35` are NOT flat fills — use `125`/`173`), the transition blobs in the sheet, and how
to extend it to a new terrain or zone are in **`references/puzzledrag2.md`**. Read it before touching the
town map.
