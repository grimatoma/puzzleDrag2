# Storyboard — `tile_tree_birch_winter` (idle)

## Header
- **Asset / set id:** `tile_tree_birch_winter` (set `birch`)
- **Kind:** `idle` (looping ambient)
- **Frame count:** 6 · **fps:** 10 · **cadence:** on-twos
- **Loop:** yes (seamless — branch tips return to rest, glint cycles)
- **One-line physics summary:** bare branches flex stiffly in a light wind (small amplitude, tips lag the trunk) while a specular sparkle glints off a snow clump.
- **Dominant force(s):** stiff elastic flex (branch tips, amplitude 1px, base planted); specular glint (light overlay — appears/vanishes, does not translate).

## Per-frame plan
Trunk + main limbs planted. `dx` applies to **branch-tip pixels only** (outermost ~6px of each limb); the trunk core never moves. Glint = a single bright `#c2c6ba`→`#ffffff` pixel toggled on a snow clump (no motion, pure light).

| Frame # | Dominant force | What enters / moves / exits | Easing | Pixel-level change (concrete) |
|---|---|---|---|---|
| 0 | elastic (rest) | Branches at rest. | held | base still; tips `dx=0`; glint off. |
| 1 | stiff flex → right + glint on | Tips lean right; sparkle ignites on the left snow clump. | slow-in | tip pixels `dx=+1`; set `(11,14)` to `#ffffff` (glint). |
| 2 | elastic (peak R) | Tips at right extreme; glint fades. | slow-out (held) | tips `dx=+1`; glint `(11,14)`→ back to snow `#c2c6ba`. |
| 3 | restoring | Tips return through center. | linear | tips `dx=0`. |
| 4 | stiff flex → left + glint on | Tips lean left; sparkle ignites on the right snow clump. | slow-in | tip pixels `dx=−1`; set `(22,17)` to `#ffffff` (glint). |
| 5 | elastic (rest seam) | Tips return to rest (→ frame 0); glint fades. | slow-out | tips `dx=0`; glint `(22,17)`→ snow `#c2c6ba`. |

## Self-critique
- [x] Forces named first (stiff elastic flex; specular glint as light, not motion).
- [x] Right speed profile — small eased flex at extremes; glint is an on/off light cue, correct for a sparkle.
- [x] Arcs not slides — only the soft branch *tips* shift (cantilever), base planted; not a whole-tree slide.
- [x] Staggered — left clump glints (f1) vs right clump (f4): out of phase.
- [x] Rigid stays rigid — trunk + main limbs hold; only tips flex.
- [x] Loop closes — f5 `dx=0` → f0 `dx=0`; glint cycle complete.
