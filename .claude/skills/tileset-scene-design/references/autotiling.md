# Autotiling reference — schemes, bitmasks, and how the pros lay tiles out

This is the established theory (with sources at the bottom), distilled to what you need to build or fix a
scene. **First instinct: if your engine ships a terrain/autotile system, use it** (Godot TileMap
terrains, Tiled "Terrain Sets", Unity Rule Tiles). Hand-roll the lookup only when it doesn't — e.g. a
raw Phaser tilemap (this project).

## The taxonomy (Boris the Brave's classification)

Autotile families are classified by **what carries the terrain identity** — the cell's *edges*, its
*corners (vertices)*, or *both* — and how many neighbours that means you read. Names you'll see in the
wild map onto it like this:

| Practical name | Formal (Boris) | Tiles | Identity on | Reads | Best for |
|---|---|---|---|---|---|
| Edge / Wang set | S-E2 | 16 | 4 edges | N E S W | **lines**: roads, paths, fences, walls, pipes, rivers-as-lines |
| Marching-squares / Corner set | S-V2 | 16 | 4 corners | 4 corner-cells | **area fills** (esp. via dual-grid); smooth swooping borders |
| Blob | S-V2E2 | 47 | edges **and** corners | 8 | **area fills** with maximum, RPG-detailed borders |

Two things this clears up that trip people up:
- **"16-tile" is ambiguous** — there are *two* different 16-tile schemes. An **edge set** matches on
  sides (use for roads). A **corner/marching-squares set** matches on corners (use for area fills). They
  are not interchangeable.
- **A 4-edge set on an area fill cannot tell an inner corner from an outer corner** — that's the whole
  reason the blob (which adds corners) and the corner/dual-grid schemes exist. So: lines → edge set;
  filled areas → corner set or blob.

---

## 1 · Edge / Wang set (16) — for roads & lines

A cell connects to a neighbour when that neighbour is the **same line terrain**.
`bits = (N?1:0)|(E?2:0)|(S?4:0)|(W?8:0)` → 0–15. (Bit order is a convention — any consistent order works,
as long as it matches your sheet's layout.)

| bits | shape | | bits | shape |
|---:|:--|---|---:|:--|
| 0 | • isolated | | 8 | ╴ end-cap (opens W) |
| 1 | ╵ end-cap (opens N) | | 9 | ┘ corner |
| 2 | ╶ end-cap (opens E) | | 10 | ─ straight H |
| 3 | └ corner | | 11 | ┴ T-junction |
| 4 | ╷ end-cap (opens S) | | 12 | ┐ corner |
| 5 | │ straight V | | 13 | ┤ T-junction |
| 6 | ┌ corner | | 14 | ┬ T-junction |
| 7 | ├ T-junction | | 15 | ┼ 4-way cross |

```js
function autotileLine(mask, byMask, put) {       // mask: boolean[rows][cols] = "is road here"
  const at = (x,y) => x>=0 && y>=0 && x<W && y<H && mask[y][x];
  for (let y=0;y<H;y++) for (let x=0;x<W;x++) if (mask[y][x]) {
    const bits = (at(x,y-1)?1:0)|(at(x+1,y)?2:0)|(at(x,y+1)?4:0)|(at(x-1,y)?8:0);
    put(byMask[bits], x, y);
  }
}
```

The grass→road border lives *inside* each of these 16 tiles (road on connected sides, ground on open
sides), so there's no separate border pass.

---

## 2 · Blob (47) — for filled areas, maximum detail

Read all 8 neighbours. The 256 raw combinations collapse to **47** because of the **blob restriction**
(Boris): *if either edge adjacent to a corner is empty, that corner is treated as empty too.* In code,
that's "a diagonal only counts when both its adjacent cardinals are set":

```js
function blobMask(at, x, y) {
  const N=at(x,y-1), E=at(x+1,y), S=at(x,y+1), Wn=at(x-1,y);
  let NE=at(x+1,y-1), SE=at(x+1,y+1), SW=at(x-1,y+1), NW=at(x-1,y-1);
  NE = NE && N && E;  SE = SE && S && E;  SW = SW && S && Wn;  NW = NW && N && Wn;   // blob restriction
  return (N?1:0)|(NE?2:0)|(E?4:0)|(SE?8:0)|(S?16:0)|(SW?32:0)|(Wn?64:0)|(NW?128:0);
}
```

Mask→tile: most 47-blob sheets (and Godot's "full" terrain mode, Tiled's "Mixed" set) ship a documented
ordering — copy it. The classic layout is RPG-Maker-style: a **48-slot sheet** (6×8) holding the 47
unique shapes, organised as a *convex* block (fill + 4 edges + 4 outer corners) and a *concave* block
(the 4 inner corners). You need the concave block or junctions show holes.

---

## 3 · Corner set / marching-squares (16) & the dual-grid

A **corner set** stores terrain at the 4 corners of a cell; `2^4 = 16` tiles cover every smooth border
including inner *and* outer corners. The catch: corner data naturally lives on the grid *vertices*, half
a tile off from the cells. The **dual-grid** technique (Oskar Stålberg) resolves this elegantly:

- Offset the **display** tilemap by half a tile, so each rendered tile straddles a 2×2 cluster of **data**
  cells and is chosen by those 4 corners.
- Boundaries then pass through tile *centres*, so corners are smooth and there are **no ambiguous tiles**.
- Needs **16 tiles** — or as few as **5–6** if you rotate/mirror a base set.
- One dual-grid layer = **two terrains** (A vs not-A). More terrains = more layers (see §5).

```js
// corner bits TL=1, TR=2, BR=4, BL=8 -> 0..15 -> tileIndex
function dualGrid(isA, byCorner, put) {
  for (let y=0;y<=H;y++) for (let x=0;x<=W;x++) {
    const m=(isA(x-1,y-1)?1:0)|(isA(x,y-1)?2:0)|(isA(x,y)?4:0)|(isA(x-1,y)?8:0);
    if (m) put(byCorner[m], x, y);   // display (x,y) sits over data (x-0.5, y-0.5)
  }
}
```

Pitfalls: the display grid must be **one tile larger** than the data grid to cover the edges; if you
rotate a shared tile sprite, **clone it first** or you rotate every instance.

---

## 4 · Quarter-tile (sub-tile) authoring — draw few pieces, get the whole blob

This is how RPG Maker autotiles work and the cheapest way to *author* transition art. Split each tile
into **4 quarter-tiles** (½×½). Each quarter is chosen by its own cell + its **2 adjacent cardinals + 1
diagonal**. You only draw **~5 (with rotation) to ~20** quarter pieces, then **precompose** them into the
full 47/48-tile blob ahead of time (tools: Tilesetter, TileGen, Tilesetter-style generators), so the
engine treats them as ordinary tiles.

- Quarter-tiles keep terrain on **cells** (not vertices), so no dual-grid mental offset and no ambiguous
  cases — but they **can't** do large swooping curves the way a corner/marching-squares set can.
- This is the right target when you're *generating* a missing transition set: author the handful of
  quarter pieces (or a 16-corner set for dual-grid), not 47 full tiles.

---

## 5 · Multiple terrains — the priority overlay (the real answer to "road over grass AND sand")

Transitions are fundamentally **per pair** of terrains, so the naive cost is quadratic. The canonical fix
(RedBlobGames) is a **priority overlay**, not authoring every pair:

1. Give every terrain a **priority** (e.g. `grass < sand < dirt < road < water`).
2. A cell "matches" a neighbour for terrain T if the neighbour's terrain has priority **≥ T**.
3. Draw terrains **back-to-front by priority**. Each terrain paints its own 2-terrain transition set
   over *the union of everything below it*. You never author a road↔grass *and* a road↔sand set — road
   just draws its single transition over "everything lower," whatever that happens to be.

Two complementary tricks:
- **Neutral intermediate (art trick):** give roads a thin **dirt shoulder** so road only ever borders
  dirt; then one road↔dirt set + dirt's own transition covers road-on-anything. Reads as intentional.
- **Quarter-tile multi-terrain** is awkward (RPG Maker overlays separate autotilings with transparency,
  or picks the two dominant terrains per quarter and accepts some sharp transitions) — prefer the
  priority overlay for many terrains.

---

## 6 · Don't hand-roll if you don't have to + practical notes
- **Engine built-ins:** Godot TileMap *terrains* (3×3 minimal = 16, or full = 47), Tiled *Terrain Sets*
  (Corner / Edge / Mixed; "Wang" since 1.5), Unity *Rule Tiles*. Define terrains, paint, done.
- **Generators / templates:** Tilesetter, TileGen, the 47-blob template generators (Jaconir, Tilewise),
  cr31's reference sheets. For AI art: PixelLab top-down / Wang tilesets.
- **Symmetry** cuts art: blob 47→16, dual-grid 16→5-6 via rotation/mirror (clone before rotating).
- **Performance:** autotiling is a precompute. Recompute a cell's tile only when it or a neighbour
  changes, and cache the index — it's essentially free at runtime.
- **Always test** an inner corner and a T/4-way junction; that's where every scheme breaks first.

---

## Sources
- Boris the Brave, *Classification of Tilesets* — the V/E/F taxonomy, blob restriction, tile counts.
  https://www.boristhebrave.com/2021/11/14/classification-of-tilesets/
- Boris the Brave, *Quarter-Tile Autotiling* — sub-tile method, RPG Maker, trade-offs.
  https://www.boristhebrave.com/2023/05/31/quarter-tile-autotiling/
- RedBlobGames (Amit Patel), *Autotiling — interactive guide* — 4-bit vs 8-bit blob, the corner rule,
  multi-terrain priority. https://www.redblobgames.com/articles/autotile/
- cr31, *Blob Tileset* / Wang tile articles — the canonical blob reference. https://www.cr31.co.uk/stagecast/wang/blob.html
- Excalibur.js, *Dual Tilemap Autotiling Technique* (Stålberg's dual-grid). https://excaliburjs.com/blog/Dual%20Tilemap%20Autotiling%20Technique/
- Tiled manual, *Using Terrains* (Corner/Edge/Mixed sets). https://doc.mapeditor.org/en/stable/manual/terrain/
