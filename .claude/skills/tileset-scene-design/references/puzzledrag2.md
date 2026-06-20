# puzzleDrag2 anchor — TownScene + Tuxemon tileset

The settlement view (the `#/town` route) is a Phaser tilemap. The grass↔sand autotiler this skill
describes is **already shipped** for the hand-authored zone maps — `src/ui/town/roadAutotile.ts` +
`src/ui/town/townMaps.ts`. So use this doc to **extend** it (a new terrain pair, a new zone, the
still-flat procedural fallback), not to rebuild it. Background + before/after: `docs/road-system-proposal.html`.

## The autotiler — already built, reuse it
`src/ui/town/roadAutotile.ts` is the grass↔sand area autotiler:
- `SAND` role→index map (verified against the sheet): **fill/iso `173`** · edges `149`(N) `197`(S)
  `172`(W) `174`(E) · outer corners `148/150/196/198` · inner corners `170/171/194/195`.
- `sandTileFor(mask, x, y)` classifies a cell's 8 neighbours → tile; `paintSandPaths(grid, mask)` overlays
  the result. Mask stamps: `blankMask`, `maskRect`, `maskBandH`, `maskBandV`, `maskDisc`.

`src/ui/town/townMaps.ts` authors the tier maps (home + quarry, **6 rungs each** — Camp→Manor /
mine-themed). `homeGround`/`quarryGround` describe streets/plaza/yard as a sand MASK, then `paintSandPaths`
autotiles it into the 30×40 `groundTiles`. Lot indices are stable-additive across rungs (test-enforced).

- **Add a path/zone:** stamp a mask (`maskBandV`/`maskDisc`/…), call `paintSandPaths(grid, mask)`, done.
- **Add a NEW transition pair** (e.g. grass↔water shore): give it its own role→index map + classifier and a
  second overlay pass, painting lower-priority terrain first (see `references/autotiling.md` §5).

## The renderer
- **`src/ui/town/TownScene.ts`** — Phaser scene, 40×30 @ 32px (1280×960). `paintGroundTiles()` paints the
  authored `groundTiles` straight through — this is the autotiled path.
  - Clean flat fills are **`GRASS:125`** and **`DIRT:173`** (the sand-blob centre).
    `T = { GRASS:125, GRASS_ALT:[126,189], GRASS_FLOWER:[120,121], DIRT:173, WATER:250 }`.
  - ⚠️ **`26`/`35` and the `50/51/76/77/98/99` "variants" are NOT flat** — each carries a baked dark fleck
    / sand patch (they are themselves transition tiles). Used as a flat fill they tile into a regular grid
    of smudges. This bit the first pass; use `125`/`173`. (See the `T` comment in TownScene.ts.)
- **Still flat — the open extension point:** the PROCEDURAL fallback (zones with no authored map).
  `paintRoads()/paintPlaza()/paintFields()/paintBridges()` + `drawBoards()` still stamp flat `T.DIRT`
  bands — no transitions. `src/townLayout.ts buildTownPlan()` already emits road centre-lines+width, plaza
  ellipse, water polygons. To finish: rasterise those into a mask and run `paintSandPaths` instead of the
  flat stamps (and bump STREET/AVENUE widths to ≥2) — one change fixes every procedural settlement.
- **`src/ui/TownPhaserCanvas.tsx`** — React host that boots the scene. NB it's a SEPARATE Phaser game from
  the puzzle `GameScene`; it is **not** `window.__phaserScene`.

## The tileset
`public/town/tileset.png` — Tuxemon sample tileset, CC-BY-SA 4.0 (`public/town/CREDITS.md`). 816×1020,
**24 cols × 30 rows**, 32px, extruded `margin=1, spacing=2`. Index → `col=i%24, row=i//24`; pixel
`sx=1+col*34, sy=1+row*34`.

Inspect it: `python .claude/skills/tileset-scene-design/scripts/tileset_montage.py public/town/tileset.png --tile 32 --cols 24 --margin 1 --spacing 2 --rows 0-9`

### Transition sets in the sheet
- **grass ↔ sand rounded blob** (what the autotiler uses): centre `173` · edges `149/197/172/174` · outer
  corners `148/150/196/198` · inner corners `170/171/194/195` · flower decals `151/175/199`.
- **grass ↔ dirt CLIFF** (cols 0–7, rows 0–4): brown organic edges + grey stairs — an **elevation/ledge**
  set, reads as a cliff face, NOT flat ground. The "brown cliff trap": don't use it for roads.
- **bridges** `219–223` + **logs** `218` — for the river crossings `buildTownPlan()` computes (still unused).
- **water** `250`; pine `168/192`, rocks `224/225`, fountain block `272…322`.

## Gotchas specific here
- **Pixel-art crispness**: Phaser boots with `render.pixelArt:true`. Keep tiles on the 32-grid; no
  sub-pixel widths.
- **Min width 2**: an area blob on a 1-wide road shows two half-edges + a hole at junctions. Authored maps
  already keep streets ≥2 wide; the procedural widths still need a bump if you autotile that path.
- **Goldens**: a ground change shifts the home/quarry settlement goldens (`town-home-*`, `shell-town-fresh`,
  `town-mine-settlement`). Re-baseline intentionally on the canonical host (a Windows dev host often isn't it).
- **Verify the town without pixels**: the settlement canvas is a separate Phaser game (not
  `window.__phaserScene`) and is often `0×0`/hidden under a modal, so reading its pixels gives a stale fill.
  Read back the DATA instead — in the running app,
  `(await import('/puzzleDrag2/src/ui/town/townMaps.ts')).getTownMap('home',0).groundTiles` and tally the
  indices. An offline PIL render that composites the real sheet (same `sx=1+col*34` math the scene uses) is
  a pixel-faithful preview for design work.
