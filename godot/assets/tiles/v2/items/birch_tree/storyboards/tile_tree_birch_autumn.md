# Storyboard — tile_tree_birch_autumn (idle, Aseprite)

- **Kind:** idle (loop) · **frames:** 8 · **fps:** 10 (100 ms) · canvas 32×32 RGB
- **Technique:** **flexing-base** canopy sway (the silhouette breathes) + the trunk/grass held rigid.
- **Source:** `items/birch_tree/tile_tree_birch_autumn/03.png`.

## Structure
- Gold canopy ~x5–25 y2–18. Trunk x13–16 y19–30. Grass tuft x10–21 y27–30 (rigid).

## Layers
1. `base` — the canopy, swayed. Import the keyframe on every frame, then on frames 2–8 nudge the canopy's **left and right outer columns** by ±1px (erase the outer edge column, redraw it shifted) so the canopy leans. Keep the trunk (x13–16) and grass (y27–30) pixels untouched on every frame.
2. `fx` — one occasional falling gold leaf (optional, subtle): a 1–2px gold fleck that detaches near a canopy edge and falls on ~2 frames, once per loop.

## Per-frame sway (canopy outer ~3 columns each side: x5–8 and x22–25, rows y4–17)
- f1 neutral (== keyframe) · f2 lean right (+1px x on the canopy mass edges) · f3 peak right · f4 ease back · f5 neutral · f6 lean left · f7 peak left · f8 ease back → loop.
- Implement the lean by re-forming the edge columns (erase outer edge, redraw 1px inward/outward) — a gentle cantilever, tips (top of canopy) lead slightly more than the base of the canopy. **Re-form, don't translate the whole blob.**
- Optional leaf: f3 spawn a gold fleck at ~(24,12), f4 at ~(25,16), gone f5.

**Constants:** trunk, grass tuft, ground shadow, palette/brightness. **Loop:** f8→f1 seamless. Export `frames/tile_tree_birch_autumn/NN.png` (00–07) + GIF; tag `idle` forward 1–8.

> If the flexing-base sway proves fiddly, fall back to a **static base + a single drifting falling-leaf fx** (canopy held rigid) — a subtle but clean loop is better than a janky sway.
