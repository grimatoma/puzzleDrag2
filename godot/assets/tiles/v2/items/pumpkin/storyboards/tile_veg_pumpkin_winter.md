# Storyboard — tile_veg_pumpkin_winter (idle, Aseprite)

- **Kind:** idle (loop) · **frames:** 6 · **fps:** 10 (100 ms) · canvas 32×32 RGB
- **Technique:** static base + `fx` particle overlay. Everything frozen; the only motion is a few snow flecks drifting down + a cold sparkle on the cap.
- **Source:** `items/pumpkin/tile_veg_pumpkin_winter/04.png`.

## Layers
1. `base` — import the winter keyframe on **every** frame (1–6). Completely rigid (body, snow cap, mound, withered tendrils all hold).
2. `fx` — snow flecks + sparkle, drawn per frame with `draw_pixels`.

## Per-frame fx (base never changes)
- **2 snow flecks** (white `#eef4fb`, 1px) falling in front of the body, out of phase:
  - fleck A column ~x10: y = 4,7,10,13,16,2 (wraps) across f1–6.
  - fleck B column ~x22: y = 14,17,20,2,5,8 across f1–6 (offset so they don't sync).
  - draw each on `fx` at its (x,y) for that frame only.
- **Cold sparkle** on the snow cap: a single white pixel that brightens then fades — present at ~(15,9) on f2 and ~(19,8) on f4, absent otherwise.

**Constants:** the entire pumpkin + cap + mound + tendrils, every frame. **Loop:** fleck positions chosen so f6→f1 is seamless (continuous fall, wrap at top). Export `frames/tile_veg_pumpkin_winter/NN.png` (00–05) + GIF; tag `idle` forward 1–6.
