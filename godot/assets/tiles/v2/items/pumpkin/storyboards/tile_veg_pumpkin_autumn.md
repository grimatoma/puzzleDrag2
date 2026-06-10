# Storyboard — `tile_veg_pumpkin_autumn` (idle)

## Header
- **Asset / set id:** `tile_veg_pumpkin_autumn` (item `pumpkin`)
- **Kind:** `idle`
- **Frame count:** 8 · **fps:** 10 · **cadence:** on-twos
- **Loop:** yes (seamless)
- **One-line physics summary:** the heavy pumpkin body sits planted while its light curling vine tendrils flutter in a soft breeze (tips lagging, follow-through) and a waxy specular sheen drifts left→right across the lit ribs.
- **Dominant force(s):** light breeze → cantilever flex on the flexible tendril tips (tips lag base); rigid body (gravity-planted, no motion); travelling specular highlight (light moving across a curved waxy surface — not geometry moving).

## Per-frame plan
Base = the approved autumn still. **Body, stem base, and all rib geometry are RIGID** — imported unchanged every frame. Only two things move: (a) the **tendril tips** — the outermost green vine pixels left `(9–12, 5–8)` and right `(21–24, 4–8)` — flex ±1px via **3 cycled base poses** (neutral / eased-right+up / eased-left+down), tips lagging their attachment by one pose; (b) an **fx-layer sheen** — a 2–3px warm-white cluster `#f8e9b8` drawn *over* the rib highlights, travelling L→R and recycling. The sheen is pure additive (drawn on `fx` above base; never erases the base) so it reads as light sliding over the rind, not a moved pixel.

| Frame # | Dominant force | What enters / moves / exits | Easing | Pixel-level change (concrete) |
|---|---|---|---|---|
| 0 | breeze (rest) | Vine neutral; sheen at left lobe. | held | base pose **neutral**; fx sheen 3px at left-lobe highlight `(9,17),(10,16),(10,18)`. |
| 1 | breeze build | Tips begin easing right; sheen drifts inward. | slow-in | base pose **R** (tips `→x+1`: left tip `(10–13,5–8)`, right tip `(22–25,4–7)`); sheen → `(12,17),(13,16)`. |
| 2 | breeze peak | Tips at right extreme (lag base by 1); sheen at center crown. | slow-out | base pose **R** held (tip follow-through: right tendril curl `+1px` further than f1); sheen → center lobe `(15,16),(16,16),(15,17)`. |
| 3 | breeze release | Tips relax toward neutral; sheen crosses center. | linear | base pose **neutral**; sheen → `(17,17),(18,18)`. |
| 4 | breeze reverse | Tips ease left; sheen reaches right lobe. | slow-in | base pose **L** (tips `→x−1`: left tip `(8–11,5–8)`, right tip `(20–23,4–7)`); sheen → right-lobe highlight `(21,16),(22,17)`. |
| 5 | breeze peak (L) | Tips at left extreme (lag); sheen fading off right edge. | slow-out | base pose **L** held (left tendril tip droops `+1px` y, follow-through); sheen dims to 1px `#e8c77a` at `(23,18)`. |
| 6 | breeze release | Tips relax to neutral; sheen gone; faint new sheen seeds left. | linear | base pose **neutral**; fx clear right; seed faint 1px `#e8c77a` at `(8,18)`. |
| 7 | rest → loop seam | Vine settled neutral; sheen brightening at left lobe. | slow-out | base pose **neutral**; sheen 2px `#f8e9b8` `(9,17),(10,16)` — flows into f0 (loop closes). |

## Self-critique (G3)
- [x] **Forces named first** — breeze→cantilever flex on tips; travelling specular; body rigid. Each frame traces to one.
- [x] **Right speed profile** — flex is eased (slow-in to extreme, slow-out back), NOT constant sine; sheen drifts at steady read-speed then fades. No metronome.
- [x] **Arcs not slides** — tendril tips move in x AND y (curl), via pose swaps that re-draw the tip, not a rigid sideways shove of the whole vine. Sheen is *light*, not a relocated object.
- [x] **Staggered / out of phase** — tip flutter (period 8) and sheen sweep (period 8 but phase-offset, peaks mid-loop) are out of phase; left tip lags right tip by a pose.
- [x] **Rigid stays rigid** — pumpkin body, ribs, stem base, drop shadow: imported unchanged every frame. Only the flexible vine tips + the non-geometric sheen move (matches "heavy planted body holds").
- [x] **Eased, not linear** — extremes (f2 right, f5 left) are slow-out holds with follow-through; not constant velocity.
- [x] **Loop closes** — f7 vine is neutral and sheen is re-seeding the left lobe exactly where f0 begins; no pop.
