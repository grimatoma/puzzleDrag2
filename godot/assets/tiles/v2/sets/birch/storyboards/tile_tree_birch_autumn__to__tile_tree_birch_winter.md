# Storyboard — `tile_tree_birch_autumn__to__tile_tree_birch_winter` (transition)

## Header
- **Asset / set id:** `tile_tree_birch_autumn__to__tile_tree_birch_winter` (set `birch`)
- **Kind:** `transition: autumn → winter`
- **Frame count:** 20 · **fps:** 10 · **cadence:** on-ones
- **Loop:** no (one-way; holds the final winter frame)
- **One-line physics summary:** the gold canopy loosens and falls away clump by clump (staggered, terminal velocity), the trunk cools gold→blue-gray, and snow drifts down slower and accumulates bottom-up — base mound first, then surface-first on the bared limbs — settling into the winter still.
- **Dominant force(s):** gravity vs air-drag (terminal velocity) on leaves; monotonic one-way canopy removal (no regrowth); slower terminal velocity + monotonic deposition for snow (bottom-up, surface-first); monotonic hue shift gold→cool on the trunk.

## Per-frame plan
Endpoints are the real stills: **f0 = autumn keyframe**, **f19 = winter keyframe** (imported, held). f1–f18 morph between. Canopy gold cleared in **staggered clumps** (never all at once); leaves spawn at the clump they detach from and fall with x-wobble; snow flakes enter from top, fall slower, and deposit on the base mound then limb tops.

| Frame # | Dominant force | What enters / moves / exits | Easing | Pixel-level change (concrete) |
|---|---|---|---|---|
| 0 | — (start) | Full gold canopy (autumn still). | held | import autumn keyframe. |
| 1 | leaf loosening | Top-right canopy edge loosens. | slow-in | clear ~6 gold px at top-right canopy edge `(22–27,3–6)`; spawn 2 falling leaves at `(24,7)`,`(26,6)`. |
| 2 | gravity/drag | First leaves fall; canopy edge frays. | linear | clear ~6 px upper-left edge `(6–10,4–7)`; leaves →`y+2,x±1`; spawn 1 leaf `(9,8)`. |
| 3 | gravity/drag | Canopy thins top; more leaves mid-air. | linear | clear ~8 px top-center `(13–19,2–5)`; existing leaves `y+2,x±1`; trunk top tints cooler 1 shade. |
| 4 | terminal velocity | Staggered fall continues; right lobe shrinks. | linear | clear ~8 px right lobe `(23–28,8–12)`; spawn 2 leaves; all leaves `y+2,x±1`. |
| 5 | + snow begins | First snow flakes enter top; canopy half-gone right. | linear | clear ~8 px right `(20–27,9–14)`; spawn 3 snow px `#e8eef4` at top `(8,1),(16,0),(24,2)`; leaves `y+2`. |
| 6 | gravity + deposition | Left lobe shrinks; snow drifts down (slower). | linear | clear ~8 px left lobe `(5–11,8–13)`; snow `y+1` (slower than leaves); leaves `y+3` exit low. |
| 7 | terminal velocity | Canopy mostly gone center; leaves landing. | linear | clear ~10 px center `(12–21,6–12)`; bottom leaves reach grass `y=29` & absorb; snow `y+1`. |
| 8 | deposition (base) | Bare branches emerging; base snow mound seeds. | slow-in | clear remaining big clumps `(8–24,5–10)` leaving sparse leaves; **base mound**: draw 4 white px row at `(13–18,30)`; snow `y+1`. |
| 9 | gravity + accumulation | Branch structure visible; mound widens. | linear | clear ~8 px scattered canopy; mound row `(11–20,30)`+`(14–17,29)`; new snow flakes top; trunk mid cools. |
| 10 | terminal velocity | Few leaves left; snow steady. | linear | clear last dense canopy `(9–22,4–9)`→ only branch px remain; leaves `y+2`; snow `y+1`; spawn 2 snow top. |
| 11 | deposition (surface) | Snow starts catching on upper limb tops (surface-first). | slow-in | add white caps on highest limb pixels `(15,9),(18,8),(12,11)`; mound `(10–21,30)`; snow `y+1`. |
| 12 | accumulation | Limb caps grow; last leaves exit. | linear | extend limb caps +1px each `#ffffff`; final 2 leaves reach grass & absorb; mound `(9–22,30)`+`(13–18,29)`. |
| 13 | deposition (back-to-front) | Snow on mid limbs; trunk cooler. | linear | add caps to mid limbs `(20,14),(11,15),(23,16)`; trunk hue gold→`stone-gray` cool over its length. |
| 14 | accumulation | Caps thicken; mound nearly full. | slow-out | thicken existing caps +1px; mound `(8–23,30)`+`(12–19,29)`+`(14–17,28)`. |
| 15 | settle | Snow load settles; faint last flakes. | slow-out | minor cap rounding (AA edges); 2 last snow px land on mound; no leaves remain. |
| 16 | settle | Form ≈ winter; micro-adjust. | slow-out | nudge cap highlights to upper-left light; trunk fully cool. |
| 17 | settle | Converging to winter still. | held-ish | align caps/mound to match winter keyframe within 1px. |
| 18 | settle | One step from final. | held-ish | final cap/mound tweaks toward winter keyframe. |
| 19 | — (end) | Winter still (bare + snow). | held | import winter keyframe (exact); hold. |

## Self-critique
- [x] Forces named first (gravity/drag leaves; monotonic canopy removal; slower snow deposition; trunk hue shift).
- [x] Right speed profile — leaves fall at terminal velocity (~y+2/frame); snow falls slower (~y+1); accumulation & canopy-removal & hue-shift all **monotonic one-way** (no flicker back).
- [x] Arcs not slides — leaves wobble x±1 while falling; canopy *removed in clumps* (re-form by subtraction), not a cross-slide of the whole canopy.
- [x] Staggered + overlap — clumps clear in different corners on different frames; snow (f5) begins before the last leaf lands (f12) → one continuous event, not spliced.
- [x] Accumulation bottom-up & surface-first — base mound seeds at f8 and grows upward; limb caps seed at f11 on the *highest* surfaces first, then mid limbs (back-to-front).
- [x] Rigid stays rigid — trunk + branch skeleton hold; only leaves/snow move; trunk only changes *hue*, not position.
- [x] Lands + holds — f19 is the exact winter keyframe, held (transition, no loop).
