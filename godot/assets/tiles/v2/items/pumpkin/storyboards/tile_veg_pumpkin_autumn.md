# Storyboard — tile_veg_pumpkin_autumn (idle, Aseprite)

- **Kind:** idle (loop) · **frames:** 8 · **fps:** 10 (100 ms) · canvas 32×32 RGB
- **Technique:** additive overlay, **flexing base on the tendrils only**. The pumpkin body is rigid; only the curling tendrils on top sway in a light breeze.
- **Source:** `items/pumpkin/tile_veg_pumpkin_autumn/05.png`.

## Structure
- Body y7–28 (rigid, imported unchanged every frame). Tendrils/stem across the top ~x2–24, y1–6 (the green curl at x2–6 y2–5 and dark curls x7–22 y1–6).

## Layers
1. `base` — import the autumn keyframe on **every** frame (1–8). Rigid.
2. (no separate fx needed) — do the tendril flex **on the base layer** by erase+redraw (alpha `#00000000` to clear the old tendril-tip pixel, redraw it 1px over): re-form, don't slide.

## Per-frame (tendril tips only; body & shadow untouched)
- Tips to flex: the green curl end ~(3,2)–(5,3) and the right dark tendril tip ~(20,2)–(22,3).
- f1 neutral (== keyframe) · f2 tips +1px right/up · f3 +1px more (peak right) · f4 back toward neutral · f5 neutral · f6 tips +1px left/down · f7 peak left · f8 back to neutral (loop closes into f1).
- Amplitude **1px** — subtle. Re-form each tip (erase old, draw new at the shifted spot in the tendril's color sampled from the keyframe), never translate a block.

**Constants:** body colors, brightness, outline, base shadow — all identical every frame. **Loop:** f8→f1 seamless. Export `frames/tile_veg_pumpkin_autumn/NN.png` (00–07) + GIF; tag `idle` forward 1–8.
