# Storyboard — `tile_veg_pumpkin_winter` (idle)

## Header
- **Asset / set id:** `tile_veg_pumpkin_winter` (item `pumpkin`)
- **Kind:** `idle`
- **Frame count:** 6 · **fps:** 10 · **cadence:** on-twos
- **Loop:** yes (seamless)
- **One-line physics summary:** everything is frozen and planted — the pumpkin, its snow crown, the base mound and withered vine all hold rigid — while a few light snow flecks drift down at slow terminal velocity and a cold specular twinkle pulses on the snow cap, out of phase with the flecks.
- **Dominant force(s):** gravity vs air-drag (slow terminal velocity) on the falling flecks; specular twinkle (light glinting off frozen snow — a pulse, not motion); everything else rigid (frozen/heavy).

## Per-frame plan
Base = the approved winter still, **STATIC every frame** (the static-base case — pumpkin, paled rind, snow crown `(10–20, 8–15)`, base mound `(18–26, 23–30)`, withered gray vine, green sprigs: all frozen, none move). All motion is on the `fx` layer: **2 snow flecks** `#eaf2fb` falling `y+1`/frame with a ±1px wobble, entering top and recycling at the seam; plus a **2px cold twinkle** `#ffffff` pulsing on the snow-cap surface, peaking once mid-loop. Flecks are pure additive over the base (they pass in front of the rigid pumpkin); the twinkle brightens existing cap pixels.

| Frame # | Dominant force | What enters / moves / exits | Easing | Pixel-level change (concrete) |
|---|---|---|---|---|
| 0 | terminal velocity | Two flecks high; cap dark (pre-twinkle). | linear | fx fleck A `(11,3)`, fleck B `(23,6)`; no twinkle. |
| 1 | terminal velocity | Flecks fall; twinkle seeds on cap. | linear | A `(10,5)` (x−1 wobble), B `(24,8)` (x+1); twinkle 1px `#dff0ff` at cap `(14,10)`. |
| 2 | terminal velocity + glint peak | Flecks mid-air; twinkle brightest. | slow-out | A `(11,7)` (x+1), B `(23,10)` (x−1); twinkle 2px **`#ffffff`** `(14,10),(15,11)` — peak. |
| 3 | terminal velocity | Flecks low; twinkle fading. | linear | A `(10,9)`, B `(24,12)`; twinkle dims to 1px `#dff0ff` `(15,11)`. |
| 4 | terminal velocity | Flecks near mound; twinkle gone. | linear | A `(11,11)` then absorbs into cap line `y=12`; B `(23,14)`; no twinkle; seed faint twinkle hint `(18,10)`. |
| 5 | deposition / recycle | Flecks reach surfaces & recycle to top. | linear | A lands on crown `(12,12)` & vanishes; B lands on mound `(22,24)` & vanishes; **respawn** A `(11,2)`, B `(23,5)` (one step above f0 positions → seamless loop). |

## Self-critique (G3)
- [x] **Forces named first** — terminal-velocity fall on flecks; specular twinkle; everything else frozen-rigid. Named per frame.
- [x] **Right speed profile** — flecks fall at **constant** ~y+2/frame (light = terminal velocity, not accelerating); twinkle is a single eased pulse (slow-out at peak f2), not a strobe.
- [x] **Arcs not slides** — each fleck changes x (±1 wobble) AND y together, so it drifts on an arc, not a vertical rail; the two flecks wobble opposite phase.
- [x] **Staggered / out of phase** — fleck A and B enter at different heights and wobble oppositely; the cap twinkle peaks at f2 while flecks are mid-fall (overlap, not lockstep).
- [x] **Accumulation is honest** — flecks *land on* existing surfaces (crown line y=12, mound top y=24) and vanish into them; they never float or pile new geometry (the mound is already at winter rest).
- [x] **Rigid stays rigid** — the entire winter still (body, cap, mound, vine, sprigs) is imported unchanged; only the 2 transient flecks + the brightness twinkle differ between frames.
- [x] **Loop closes** — f5 respawns the flecks one step above their f0 positions and the twinkle is back to dark, so f5→f0 is seamless.
