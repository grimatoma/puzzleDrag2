# Storyboard — tile_tree_birch_autumn → tile_tree_birch_winter (transition, Aseprite)

- **Kind:** transition (one-shot, hold final) · **frames:** 12 (Aseprite frame 1..12 = f0..f11) · **fps:** 10 (100 ms) · canvas 32×32 RGB
- **Technique:** two-keyframe **erosion/reveal** (`references/aseprite-execution.md` → "Two-keyframe transition"). Gold leaves fall away → snowy winter tree reveals → mound completes.
- **Source PNGs:** from = `items/birch_tree/tile_tree_birch_autumn/03.png`; to = `items/birch_tree/tile_tree_birch_winter/01.png`.

## Verified structure (from get_pixels)
- **Autumn gold canopy** occupies ~x5–25, y2–18 (solid blob). **Trunk** (white bark) ~x13–16, y19–30. **Grass tuft** ~x10–21, y27–30.
- **Winter** is mostly snow: snow-dabbed sparse branches ~y5–18 (within x6–24), snow mound ~x10–22 y26–30, a few loose flecks y5–14. Trunk same column.
- The trunk column **x13–16, y19–30 is shared — NEVER erode it.**

## Layers (bottom→top)
1. `winter` — import `tile_tree_birch_winter/01.png` on **frames 2–11** (f1–f10). Revealed as canopy eropes. (Not on frame 1 so f0 = pure autumn.)
2. `autumn` — import `tile_tree_birch_autumn/03.png` on **frames 1–11**; erode cumulatively per schedule (draw `#00000000` on this layer).
3. `fx` — gold leaf particles (f1–8) + drifting snow flecks (f7–10), drawn with `draw_pixels`.

## Endpoint lock (must be pixel-exact — diff after)
- **Frame 1 (f0):** ONLY `autumn` imported, no erosion, no `winter`, no fx ⇒ equals autumn keyframe.
- **Frame 12 (f11):** ONLY `winter` imported (no `autumn` cel, no fx) ⇒ equals winter keyframe. Hold (set_frame_duration 200 ms).

## Cumulative canopy erosion on `autumn` (gold leaves "leave" edge/top → inward/down). Each frame ADDS to the prior erase (later frames re-import autumn then erase the cumulative set):
| Frame | Cumulative erased canopy region (everything listed so far) | Leaf fx (gold ~#d9a233 / #b9842a, 2px clusters, fall y+2..3 with x±1 arc) | Snow fx |
|---|---|---|---|
| 1 (f0) | none | none | none |
| 2 | top rim y2–4 (x10–21); right outer x23–25 y8–13 | 2 leaves spawn at (12,5)&(24,10), fall | — |
| 3 | + top y2–6; right x21–25 y8–16 | 3 leaves descending (arcs) | — |
| 4 | + top-left x6–10 y8–13; right down to y17 | 4 leaves; lowest near y22 fading | — |
| 5 | + left x5–11 y8–17; top fully (y2–8 all) | 4 leaves; 1 dissipates at base y26 | — |
| 6 | + center upper x11–20 y8–13 (reveal branch tips) | 3 leaves low | — |
| 7 | + center x11–20 y13–17; only lowest gold fringe y17–18 left | 1–2 last leaves | first flecks enter top y2–4, drift |
| 8 | gold fully cleared (whole canopy erased) | — | 3 flecks descending; reveal mound bottom row (winter already drawn) |
| 9 | (autumn cel empty) | — | flecks settling; |
| 10 | (autumn cel empty) | — | loose flecks ease into winter-keyframe spots |
| 11 (f11) | — winter keyframe, exact | — | — |

**Rules:** trunk x13–16 untouched every frame. Erosion fronts are ragged (vary the row edge ±1–2 px per column, NOT a flat horizontal line — that's the wipe we're avoiding). Leaf particles change x AND y each frame (arc). Phases overlap (leaves f1–8, snow f7–10). Export `frames/tile_tree_birch_autumn__to__tile_tree_birch_winter/NN.png` + `previews/<id>.gif`.
