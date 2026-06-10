# Storyboard — tile_tree_birch_winter (idle, Aseprite)

- **Kind:** idle (loop) · **frames:** 6 · **fps:** 10 (100 ms) · canvas 32×32 RGB
- **Technique:** static base + `fx` snow. The bare snowy tree is completely rigid; only snow flecks drift down.
- **Source:** `items/birch_tree/tile_tree_birch_winter/01.png`.

## Layers
1. `base` — import the winter keyframe on **every** frame (1–6). Rigid: every branch, the trunk, the snow mound, and the existing snow dabs hold unchanged.
2. `fx` — 2–3 drifting snow flecks, drawn per frame with `draw_pixels`.

## Per-frame fx (base never changes)
- **Fleck A** (white `#eef4fb`) column ~x9: y = 3,6,9,12,15,1 across f1–6.
- **Fleck B** column ~x20: y = 11,14,17,1,4,7 across f1–6 (offset).
- **Fleck C** column ~x15 (lighter, appears half the loop): y = —,5,8,—,2,5 (present f2,f3,f5,f6).
- Each fleck falls straight-ish with a ±1px horizontal wobble; draw only at the per-frame (x,y). Wrap at the top so the fall is continuous across the loop seam.

**Constants:** the entire tree + mound + existing snow, every frame (do NOT let the thin branches flicker — they are part of the rigid base, never redrawn). **Loop:** f6→f1 seamless. Export `frames/tile_tree_birch_winter/NN.png` (00–05) + GIF; tag `idle` forward 1–6.
