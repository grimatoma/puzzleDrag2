# Storyboard — `tile_tree_birch_autumn` (idle)

## Header
- **Asset / set id:** `tile_tree_birch_autumn` (set `birch`)
- **Kind:** `idle` (looping ambient)
- **Frame count:** 8 · **fps:** 10 · **cadence:** on-twos
- **Loop:** yes (seamless — sway returns to center, leaf recycles)
- **One-line physics summary:** a light breeze rocks the canopy back and forth on an elastic restoring force while the trunk stays planted; one gold leaf occasionally loosens and drifts down.
- **Dominant force(s):** elastic restoring force (canopy sway, amplitude 1px); gravity vs air-drag (terminal velocity) + unstable airflow (the falling leaf wobble).

## Per-frame plan
Canopy = rows y≈2–18; trunk = rows y≈18–30 (planted, never moves). `dx` = horizontal shift of the **upper canopy block only** (top ~10 rows), tapering to 0 at the canopy/trunk join.

| Frame # | Dominant force | What enters / moves / exits | Easing | Pixel-level change (concrete) |
|---|---|---|---|---|
| 0 | elastic (rest) | Canopy centered. | held | base still; canopy `dx=0`. |
| 1 | elastic → right | Canopy leans right. | slow-in | upper canopy block `dx=+1`. |
| 2 | elastic (peak R) | Canopy at right extreme; a leaf loosens at canopy bottom-right. | slow-out (held) | canopy `dx=+1`; spawn 1px gold leaf `#e3c45a` at `(24,17)`. |
| 3 | restoring + gravity/drag | Canopy returns toward center; leaf begins to fall. | linear | canopy `dx=0`; leaf `(24,17)→(23,19)` (y+2,x−1). |
| 4 | elastic → left + airflow | Canopy leans left; leaf drifts, turns edge-on. | slow-in | canopy `dx=−1`; leaf `→(24,21)` (y+2,x+1), 1px. |
| 5 | elastic (peak L) + drag | Canopy at left extreme; leaf keeps falling. | slow-out (held) | canopy `dx=−1`; leaf `→(23,24)` (y+3,x−1). |
| 6 | restoring + gravity | Canopy returns to center; leaf nears ground. | linear | canopy `dx=0`; leaf `→(24,27)` (y+3,x+1). |
| 7 | elastic (rest) | Canopy centered (→ frame 0 seam); leaf lands in grass & is absorbed. | slow-out | canopy `dx=0`; leaf fades at `(24,29)`; next frame recycles to rest. |

## Self-critique
- [x] Forces named first (elastic sway; gravity/drag on leaf).
- [x] Right speed profile — leaf falls at ~constant terminal velocity (y+2/+2/+3/+3), not accelerating hard; sway eased at extremes.
- [x] Arcs not slides — leaf changes x *and* y each frame (wobble), canopy flexes (block shift tapering to planted trunk), not a rigid whole-tree slide.
- [x] Staggered/overlap — leaf release (f2) overlaps the sway cycle, not in lockstep.
- [x] Rigid stays rigid — trunk + lower canopy join never move.
- [x] Loop closes — f7 canopy `dx=0` → f0 `dx=0`; leaf recycled.
