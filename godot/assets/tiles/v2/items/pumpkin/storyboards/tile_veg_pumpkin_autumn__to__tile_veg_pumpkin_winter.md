# Storyboard — tile_veg_pumpkin_autumn → tile_veg_pumpkin_winter (transition, Aseprite)

- **Kind:** transition (one-shot, hold final) · **frames:** 12 (frame 1..12 = f0..f11) · **fps:** 10 (100 ms) · canvas 32×32 RGB
- **Technique:** two-keyframe **erosion/reveal**. The body never moves (same pumpkin both keyframes); only color + overlays change: tendrils wither, frost creeps down the rind, snow cap + base mound build.
- **Source PNGs:** from = `items/pumpkin/tile_veg_pumpkin_autumn/05.png`; to = `items/pumpkin/tile_veg_pumpkin_winter/04.png`.

## Verified structure (from get_pixels)
- **Body** (orange/gold ribs) fills ~x2–29, y7–28 — **identical silhouette/position in both keyframes** (winter just recolors it). Curling tendrils/stem across the top ~y1–6.
- **Winter** of the same body: snow cap (white) over the crown ~y7–17, pale-frost rind (`p`) y14–28, withered gray tendrils on top, snow mound ~x4–26 y26–30, a few residual gold rib flecks.

## Layers (bottom→top)
1. `winter` — import `tile_veg_pumpkin_winter/04.png` on **frames 2–11**. Revealed as the autumn skin erodes.
2. `autumn` — import `tile_veg_pumpkin_autumn/05.png` on **frames 1–11**; erode cumulatively (frost creep + tendril wither).
3. `fx` — sparse drifting snow flecks (white, f6–11) + an optional 1px cold sparkle on the cap.

## Endpoint lock (pixel-exact — diff after)
- **Frame 1 (f0):** only `autumn`, no erosion ⇒ autumn keyframe.
- **Frame 12 (f11):** only `winter` ⇒ winter keyframe. Hold 200 ms.

## Cumulative erosion on `autumn` (reveals the frosted winter beneath; frost front moves crown→down, uneven). Trunk n/a — whole body is the subject.
| Frame | Cumulative erased (reveals winter) | fx |
|---|---|---|
| 1 (f0) | none | — |
| 2 | tendrils: erase green/dark tops x2–6 y2–5 (reveal gray withered) | — |
| 3 | + crown cap zone y7–9 (x9–22) → snow cap starts | — |
| 4 | + crown y7–11 spreading out to x6–25; ragged lower edge | 1 fleck drifting from y3 |
| 5 | + upper rind y11–14 (frost front descends, wavy edge) | 2 flecks |
| 6 | + rind y14–17 (most of upper body now frosted/pale) | 2 flecks; sparkle on cap |
| 7 | + rind y17–20 down the sides first (edges lead, center lags) | 2 flecks |
| 8 | + rind y20–24 | 2–3 flecks; base mound bottom row reveals (winter) |
| 9 | + rind y24–27 + base | flecks; mound grows up to y27 |
| 10 | nearly all autumn erased except a few lower-center rib flecks | flecks settling |
| 11 (f11) | winter keyframe, exact | — |

**Rules:** the frost front is **wavy/uneven** (edges and crown lead, center/bottom lag) — never a flat horizontal wipe. Body outline pixels stay put (only color changes via reveal). Snow flecks fall on arcs (x±1 while y+1..2). Phases overlap (tendril wither f2–4, frost f3–9, snow build f6–11). Export `frames/tile_veg_pumpkin_autumn__to__tile_veg_pumpkin_winter/NN.png` + GIF.
