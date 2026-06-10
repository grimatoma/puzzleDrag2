# Storyboard — `<asset-or-set-id>`

> **Copy this file, fill it in, and critique it BEFORE you build the animation.** This is the
> cheap gate (the pipeline's "critique the storyboard before the expensive frame-by-frame
> build"): directing the motion on paper catches "it's just a sliding crossfade" before you've
> spent the effort authoring cels in Aseprite. Replace every `<…>` and delete the example block
> at the bottom (or keep it as a guide).
>
> **Write this storyboard AGAINST the already-generated keyframe still — not before it.** The
> still exists by the time you storyboard (Stage 3 runs after Stage 2). **`get_pixels` the real
> approved keyframe first** and cite **real coordinates** in the per-frame plan — only reference
> pixels that actually exist. (A storyboard that named a winter-glint coordinate which turned out
> transparent bit us once: the glint had nothing to land on.) `scripts/pixels.mjs`
> gives the opaque-pixel feature map so you can confirm a coordinate is non-transparent before you
> cite it.

## Header
- **Asset / set id:** `<id>` (e.g. `birch`)
- **Kind:** `<idle>` **or** `<transition: from → to>` (e.g. `transition: autumn → winter`)
- **Frame count:** `<N>`  ·  **fps:** `<fps>`  ·  **cadence:** `<on-twos | on-ones>`
- **Loop:** `<yes (seamless) | no (one-way, holds final frame)>`
- **One-line physics summary:** `<what physically happens, in one sentence>`
- **Dominant force(s):** `<strongest first — e.g. gravity + air-drag (terminal velocity); monotonic accumulation>`

## Per-frame plan

| Frame # | Dominant force | What enters / moves / exits | Easing | Pixel-level change (concrete) |
|---|---|---|---|---|
| 0 | `<force>` | `<what's on screen / starts moving>` | `<slow-in \| slow-out \| linear \| accel \| held>` | `<exact pixels: which cluster moves where, what color appears/vanishes>` |
| 1 | | | | |
| 2 | | | | |
| … | | | | |
| N−1 | | | | |

**Column guide**
- **Dominant force** — name the real-world force driving *this* frame (gravity, air-drag/terminal
  velocity, wind gust, momentum, buoyant convection, surface tension, monotonic deposition…).
  It can change from frame to frame (e.g. fall → impact → settle).
- **What enters / moves / exits** — the silhouette-level action: which part re-forms, what new
  element spawns, what leaves the frame or gets buried/covered.
- **Easing** — the speed profile across *this* frame relative to neighbors: **slow-in**
  (accelerating from rest), **slow-out** (decelerating to rest), **linear**, **accel** (e.g. a
  heavy fall — frames spread apart), or **held** (a repeated pose / beat to register weight).
- **Pixel-level change** — concrete, not vague. "Advance the leaf cluster `y` +1, `x` +sin
  wobble; swap to edge-on cel" — **not** "leaf falls a bit." At 32–64px you must know the exact
  move. Round half-up on any sub-pixel position.

## Self-critique (do this before building — tick each)
- [ ] **Forces named first.** Each frame's motion traces to a real force, strongest one first.
- [ ] **Right speed profile.** Falling-light = constant (terminal velocity); falling-heavy =
  accelerating; gust = build→peak→release; accumulation/growth/melt = monotonic one-way.
- [ ] **Arcs, not slides.** Moving parts curve (x *and* y change together); nothing translates
  rigidly sideways pretending to be motion.
- [ ] **Staggered / out of phase.** Multiple elements (leaves, flakes, blades) release/react on
  *different* frames, not in lockstep. Snow = dense stagger; leaves = irregular release.
- [ ] **Overlap between beats.** Phases blend (e.g. snow starts before the last leaf lands), so
  it reads as one continuous event, not spliced clips.
- [ ] **Accumulation is bottom-up & surface-first.** Snow/sand seeds on horizontal/upward faces,
  grows upward and back-to-front, never floats; covers what was there before.
- [ ] **Impacts squash & settle.** A dropped/landed body squashes, overshoots, and settles
  (decaying) — it doesn't stop dead; resting objects bob, they don't swing.
- [ ] **Eased, not linear.** Extremes are eased (slow-in/out); no constant-velocity "metronome"
  motion. Constant sine reads robotic.
- [ ] **Rigid stays rigid.** Only soft/light parts move; planted/heavy parts (trunk, cob, rock)
  hold (see `pixel-art-animation/SKILL.md`, "what moves vs stays rigid").
- [ ] **Loop closes** (if looping): frame N flows into frame 0; everything driven so it repeats
  seamlessly.

## How to fill this

1. Read **`pixel-art-animation/references/physics-of-motion.md`** — it catalogs each force
   (falling/flutter, accumulation, gusts, momentum/settle, growth/melt/wither, fire/ember/smoke,
   water/ripple/drip) with a **frame-by-frame staging recipe**. Find your motion there and copy
   its staging into the table above. The **birch autumn→winter** worked example in that file is a
   filled storyboard you can pattern-match.
2. Verify your plan against the **12 principles** — `pixel-art-animation/references/animation-
   principles.md` (anticipation, squash & stretch, follow-through/overlap, slow-in/out, arcs,
   timing, secondary action, exaggeration, staging). The checklist above is the short form.
3. For the **math** of a specific move (cantilever bend, articulation, traveling wave, pulse,
   overlay), see `pixel-art-animation/references/motion-patterns.md`.
4. Match the project's **style spec** (`<assets>/_style-spec.json`): canvas size, palette ramps,
   fps, cadence, loop default — your frame count and fps should agree with it.

---

## Filled mini-example — a falling leaf overlay (6 frames, idle loop)

A tiny example so the format is obvious: one autumn leaf drifting down across a tile, looping.

**Header**
- **Asset / set id:** `falling-leaf`
- **Kind:** `idle` (a looping ambient overlay)
- **Frame count:** 6 · **fps:** 8 · **cadence:** on-twos
- **Loop:** yes (seamless — leaf recycles to the top)
- **One-line physics summary:** a light leaf falls at slow terminal velocity, wobbling side-to-
  side and tumbling, then recycles.
- **Dominant force(s):** gravity vs air-drag (slow terminal velocity); unstable airflow → flutter.

| Frame # | Dominant force | What enters / moves / exits | Easing | Pixel-level change (concrete) |
|---|---|---|---|---|
| 0 | gravity/drag (terminal) | Leaf at top-right, face-on. | linear (constant fall) | 3px leaf cluster at `(22, 4)`, face-on cel. |
| 1 | + unstable airflow | Leaf drifts down-left, starts to turn. | linear + eased wobble | `y +1`, `x −1` (`sin` phase); swap toward edge-on (2px). |
| 2 | airflow stall | Leaf slips left (edge-on catches air). | held-ish (slight stall) | `y +1`, `x −1`; **edge-on** 1px sliver — the sideways slip. |
| 3 | gravity/drag | Leaf rights itself, drifts back right. | linear | `y +1`, `x +1`; back to face-on (3px). |
| 4 | + unstable airflow | Leaf wobbles right, descending. | eased wobble | `y +1`, `x +1`; tilt toward edge-on again. |
| 5 | gravity/drag | Leaf near bottom; about to recycle. | linear | `y +1`, `x −1`; face-on. Next frame → reset to `(22, 4)` (loop seam). |

Note how even this 6-frame loop applies the catalog: **constant** downward step (terminal
velocity, not accelerating), a **±wobble** in x (not a straight diagonal), a **tumble** (face-on
↔ edge-on cel swap) with the **edge-on frames** doing the sideways slip, and a **seamless reset**
at the loop seam. That's a falling leaf — not a pixel cluster sliding diagonally.
