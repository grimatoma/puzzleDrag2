# Storyboard — `tile_veg_pumpkin_autumn__to__tile_veg_pumpkin_winter` (transition)

## Header
- **Asset / set id:** `tile_veg_pumpkin_autumn__to__tile_veg_pumpkin_winter` (item `pumpkin`)
- **Kind:** `transition: autumn → winter`
- **Frame count:** 20 · **fps:** 10 · **cadence:** on-ones
- **Loop:** no (one-way; holds the final winter frame)
- **One-line physics summary:** the green vine tendrils wilt, curl and detach clump-by-clump and fall at terminal velocity (staggered, x-wobble); frost creeps down the rind top-first, paling the orange; and snow drifts down slower than the leaves and accumulates bottom-up — base mound first, then surface-first on the crown — settling into the frosted winter pumpkin.
- **Dominant force(s):** wilting (monotonic droop) → gravity/air-drag (terminal velocity) on detached leaves; monotonic top-down frost paling of the rind (no re-warming); slower terminal velocity + monotonic deposition for snow (mound bottom-up, then crown surface-first). The **pumpkin body never moves** — only its vine, its color, and the accumulating snow change.

## Per-frame plan
Endpoints are the real stills: **f0 = autumn keyframe**, **f19 = winter keyframe** (imported, held). f1–f18 morph between, on layers over a body that stays put. Vine green at left tip `(9–12,5–8)`, right tip `(21–24,4–8)`, stem `(14–18,7–13)` wilts then clears in **staggered clumps**; detached leaves spawn at the clump and fall `y+2` with x±1 wobble. Frost pales the rind **top rows first** (the lit crown band `y=11–16` cools toward winter's paler orange before the lower lobes). Snow flakes enter from `y≈2`, fall `y+1` (slower than leaves), deposit on the **base mound** (bottom-right `x18–26, y29→23`) then **surface-first on the crown** (`x10–20, y15→8`).

| Frame # | Dominant force | What enters / moves / exits | Easing | Pixel-level change (concrete) |
|---|---|---|---|---|
| 0 | — (start) | Full autumn pumpkin + green vine. | held | import autumn keyframe. |
| 1 | wilting | Right tendril droops; tip loses turgor. | slow-in | right tendril tip `(22–24,4–6)` sags `y+1`, green dims toward `#5a5a30`; no detachment yet. |
| 2 | wilting | Left tendril droops; right begins to brown. | linear | left tip `(9–11,5–7)` sags `y+1`; right tendril hue green→gray-brown `#6b5a3a`. |
| 3 | gravity/drag | Right tendril clump **detaches** & falls. | slow-in | clear right tip green `(21–24,4–6)`; spawn falling leaf 2px `#7a6a30` at `(22,7)`; faint frost: lighten crown rim `(13–18,11)` by 1 step. |
| 4 | terminal velocity | First leaf falls; left tendril browns. | linear | leaf → `(22,9)` (x−1 wobble); left tendril → gray-brown; clear stem-top green `(15–17,7)`. |
| 5 | + frost creep | Left clump detaches; frost pales crown band. | linear | clear left tip `(9–12,5–8)`; spawn leaf 2px at `(10,8)`; existing leaf → `(21,11)`; pale rind row `y=11–13` center `(11–20)` toward winter orange `#c3671d→#b56a3c`. |
| 6 | gravity + snow begins | Stem clears; first snow flakes enter. | linear | clear stem green `(14–18,8–12)` → bare; leaves fall `y+2`; spawn 2 snow px `#eaf2fb` at `(12,2),(20,1)`; frost paling reaches `y=15`. |
| 7 | terminal velocity | Leaves landing; snow drifting (slower). | linear | leaf A reaches grass-line `(20,27)` & absorbs; leaf B `(10,12)`; snow `y+1` → `(12,4),(20,3)`; spawn green sprig hint bottom-left `(4,28)` `#3f5a25`. |
| 8 | deposition (base mound) | Bare crown; base snow mound seeds. | slow-in | vine fully gone (only winter gray stub remains at `(14–17,4–9)`); **mound seeds**: 4 white px `#eef4fb` at `(20–23,29)`; snow `y+1`; frost paling reaches `y=18`. |
| 9 | gravity + accumulation | Mound widens; more snow enters. | linear | mound row `(19–24,29)` + `(20–23,28)`; new snow flakes `(14,2),(24,3)`; last leaf B `(9,20)`. |
| 10 | terminal velocity | Last leaf exits; snow steady. | linear | leaf B reaches base `(8,27)` & absorbs; snow `y+1`; mound `(18–25,29)+(20–23,28)`; rind paling now spans full upper body `y≤20`. |
| 11 | deposition (surface) | Snow catches on crown top (surface-first). | slow-in | seed crown cap: white px `#eef4fb` on highest rib tops `(13,11),(15,10),(17,11)`; mound `(18–25,29)+(19–24,28)`; snow `y+1`. |
| 12 | accumulation | Crown cap grows down; mound nearly full. | linear | extend cap `(12–18,11)+(14–16,10)`; mound `(18–26,29)+(19–24,28)+(21–23,27)`; spawn 1 snow `(18,2)`. |
| 13 | deposition (back-to-front) | Cap thickens over the crown band. | linear | cap fills `(11–19,11)+(12–18,12)` (matches winter cap footprint); withered vine fully gray `#43444c`; frost paling reaches lower lobes `y≤24`. |
| 14 | accumulation | Cap + mound near winter rest. | slow-out | cap `(10–20,11)+(11–19,12)+(13–17,13)`; mound `(18–26,28)+(20–24,30)`; last 2 snow flakes `(15,5),(22,7)`. |
| 15 | settle | Snow load settles; faint last flakes. | slow-out | round cap top edge (AA) `(11,10),(19,10)`; mound settles `(18–26,29)`; flakes `(15,9),(22,11)`. |
| 16 | settle | Form ≈ winter; rind fully paled. | slow-out | nudge cap highlights to upper-left light `(11,11)#ffffff`; rind matches winter paler orange across body; last flake `(22,15)` lands on mound. |
| 17 | settle | Converging to winter still. | held-ish | align cap `(10–20,8–15)` and mound `(18–26,23–30)` to within 1px of winter keyframe; green base sprigs `(2–12,24–30)` fade in. |
| 18 | settle | One step from final. | held-ish | final cap/mound/sprite tweaks toward winter keyframe; withered vine droop matches. |
| 19 | — (end) | Winter still (frosted + snow). | held | import winter keyframe (exact); hold. |

## Self-critique (G3)
- [x] **Forces named first** — wilting→gravity/drag on leaves; monotonic top-down frost; slower snow deposition (mound then crown). Named per frame, strongest first.
- [x] **Right speed profile** — leaves fall at terminal velocity (~y+2/frame); snow falls slower (~y+1); frost paling, canopy removal, and snow accumulation are all **monotonic one-way** (no re-greening, no re-warming, no melt-back).
- [x] **Arcs not slides** — leaves wobble x±1 while falling (arc); the vine is **removed in staggered clumps** (re-form by subtraction at the detach point), never cross-slid as a rigid block.
- [x] **Staggered + overlap** — right clump (f3) detaches before left (f5); snow begins (f6) before the last leaf lands (f10) → one continuous event, not spliced.
- [x] **Accumulation bottom-up & surface-first** — base mound seeds at f8 and grows upward (`y29→27`); crown cap seeds at f11 on the **highest** rib tops first, then fills down (back-to-front), matching the winter footprint.
- [x] **Rigid stays rigid** — the pumpkin BODY and ribs never move or deform; only the vine (removed), the rind **hue** (paled in place), and the **added** snow change. Frost is a recolor, not a displacement.
- [x] **Lands + holds** — f19 is the exact winter keyframe, held (transition, no loop); f16–18 converge so the cut to f19 is seamless.
