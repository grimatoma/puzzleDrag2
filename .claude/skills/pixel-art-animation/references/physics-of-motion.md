# Physics of motion — stage real-world forces across frames

`animation-principles.md` is the **why** (the 12 principles that make motion read as alive).
`motion-patterns.md` is the **math how** (cantilever bend, articulation, wave, pulse — the
curve+lag+phase recipes). **This file is the bridge between them and the world:** it turns
*"what really happens physically"* into *"where each pixel appears, moves, and vanishes across
N frames."* It is **tool-agnostic direction** — you fill a storyboard from it, then execute the
frames in Aseprite (or wherever). It does not re-derive the principles or re-list the patterns;
it **names which ones a given force invokes** and tells you how to *stage* it.

## The principle of this file: force first, then stage

The recurring failure this skill fights is animation that "doesn't follow physics and the
world" — a leaf that slides sideways instead of fluttering down, snow that appears everywhere
at once instead of piling bottom-up, a dropped fruit that floats to rest instead of bouncing.
The fix is a discipline, applied **before** you draw a single frame:

1. **Name the dominant real-world force(s).** Gravity? Air resistance? Wind? Buoyancy?
   Momentum? Heat convection? Surface tension? Write them down, strongest first. Most motions
   are *one* force fighting *one* resistance (gravity vs air drag = terminal velocity; momentum
   vs friction = settle).
2. **Read the force's signature** — its *time-shape*. Does it **accelerate** (free fall),
   **hold a constant speed** (terminal velocity), **build → peak → release** (a gust, a flame
   lick), **expand and fade** (a ripple, smoke), or **accumulate monotonically** (snow piling,
   a bud opening)? The time-shape is what you distribute across frames.
3. **Map the time-shape onto frames** with the right easing (cross-reference **slow-in/out**),
   the right **arc**, the right **stagger** between elements (cross-reference **overlap** and
   the bend's per-element phase), and the right **order of appearance** (what enters first,
   what's left behind). This is the *staging recipe*.
4. **Decide which parts are subject to the force and which aren't** (cross-reference SKILL.md
   "what moves vs stays rigid"): only loose/light things flutter; planted/heavy things don't.

Everything below is a catalog of forces with their time-shape and a concrete frame-by-frame
staging recipe. Each entry lists **(a)** the real behavior/forces, **(b)** which principles &
patterns apply, and **(c)** the staging recipe (spawn stagger, easing curve, terminal velocity,
accumulation order, where pixels appear/move/vanish).

> **Pixel-aware throughout.** You have *few frames* (often 8–20) and *low resolution* (32–64px).
> "Terminal velocity" means "a leaf descends ~1px/frame, a rock ~3–4px/frame" — the *ratio* is
> the realism, not real m/s. "Stagger" means "release on frames 0, 2, 5, 9," not a continuous
> distribution. Round half-up when you place a sub-pixel position (SKILL.md gotcha).

---

## Contents
1. [Falling & flutter](#1-falling--flutter) — leaves vs snow vs rock
2. [Accumulation / piling](#2-accumulation--piling) — snow, sand, settling bottom-up
3. [Wind & gusts](#3-wind--gusts) — the gust envelope, out-of-phase elements
4. [Momentum & settle](#4-momentum--settle) — overshoot, squash on impact, follow-through
5. [Growth / melt / wither](#5-growth--melt--wither) — directional change over time
6. [Fire / ember / smoke](#6-fire--ember--smoke) — flicker, rise, expand-and-dissipate
7. [Water / ripple / drip](#7-water--ripple--drip) — expanding rings, bob, swell→fall→impact
8. [Quick force → staging table](#8-quick-reference-force--staging)
9. [Worked example: birch autumn→winter (~20 frames)](#9-worked-example-birch-autumnwinter-20-frames)

---

## 1. Falling & flutter

The single most-requested transition motion, and the one most often done wrong (as a sideways
slide). Three materials fall in three completely different ways. **The difference is the ratio
of air-drag to weight**, and it changes both the *path* and the *vertical speed profile*.

### (a) Real behavior / forces
- **Gravity** pulls everything down at the same acceleration, but **air resistance** rises with
  speed and with surface-area-to-mass ratio. A body accelerates only until drag balances
  gravity — then it falls at constant **terminal velocity** (it stops speeding up). Light,
  broad things reach a *slow* terminal velocity almost immediately; dense, compact things reach
  a *fast* one (or never plateau over a short drop).
- **A leaf** has huge area and tiny mass → terminal velocity is reached at once and is *slow*;
  the leaf also **tumbles, rotates, and slips side-to-side** because airflow over the broad
  face is unstable (it stalls, slides, catches again). Path = a wandering, fluttering zig-zag.
- **Snow** (a flake/clump) is light but small-area → near-**straight, slow** descent with only
  a *slight* drift; many flakes fall **densely and independently**, each on its own slow line.
- **A rock / heavy fruit** is dense → drag is negligible over a tile-height drop, so it
  **accelerates the whole way**: fast, straight, speeding up frame to frame.

### (b) Principles & patterns
- **Arcs** (leaf path curves; never a straight diagonal) · **slow-in** *inverted* for the
  heavy case (it slow-*outs* into acceleration — frames spread apart as it speeds up) ·
  **overlap / staggered release** (leaves don't all let go at once) · **secondary action**
  (rotation riding on the fall). Pattern: the **falling-leaf overlay** (`motion-patterns.md`
  §9) is the base; this section is its *physics calibration* (which speed, which stagger).

### (c) Staging recipe

**Leaf (flutter-fall).** Per leaf, over its lifetime `g = 0..1`:
- **Vertical:** constant terminal velocity → `y` advances a **fixed ~1px per frame** (do *not*
  accelerate — that's the whole point of terminal velocity). A broad leaf might even pause a
  beat mid-fall when it stalls.
- **Horizontal:** a slow sine wobble, **amplitude 2–4px**, ~1–1.5 cycles over the descent:
  `x = startx + drift·g + sin(g·6)·3`. The side-to-side is what sells "leaf," not "pebble."
- **Rotation:** flip/rotate the 2–3px leaf sprite every 2–4 frames (swap a "face-on" cel for an
  "edge-on" 1px sliver and back) so it tumbles. Edge-on frames are where it slips sideways.
- **Stagger release:** don't release all leaves on frame 0. Spawn them on frames `0, 2, 5, 9,
  13…` (irregular gaps read natural; even gaps read mechanical). Each then runs its own `g`.
- **Vanish:** the leaf lands (joins the ground litter, §2) or fades on the last 1–2 frames.

**Snow (dense slow fall).** Many independent flakes:
- **Vertical:** terminal velocity, **slower than leaves** (~0.5–1px/frame; on twos this can be
  "every other frame it drops 1px"). Constant — no acceleration.
- **Horizontal:** *slight* drift only, amplitude **≤1px**, long slow period. Near-straight.
- **Density & stagger:** spawn many, on a **dense, tight stagger** (a new flake almost every
  frame) at random `x`. Independence is the realism — never move them as a sheet.
- **Vanish:** each flake lands and **becomes accumulation** (§2) — it doesn't disappear, it
  *adds a pixel to the pile*. Recycle off-screen flakes to the top to keep the field full in a
  loop.

**Rock / heavy (accelerating fall).** Usually a single body:
- **Vertical:** **accelerate** — `dy` grows each frame (`1, 2, 3, 4…` px), the opposite of the
  leaf. Frames near the top are close together (slow start), frames near the bottom spread far
  apart (fast) — this is **slow-out** with no slow-in.
- **Horizontal:** essentially **straight**; gravity dominates, drag/flutter is nil.
- **Smear:** on the fastest 1–2 frames before impact, draw a **smear** (`animation-principles.md`
  §4) — a 2–3px vertical streak — so the eye tracks the speed across the gap.
- **Impact:** hands off to **Momentum & settle** (§4) — squash + dust, don't just stop.

> **The tell:** if your "falling leaf" advances the *same* number of pixels down per frame **and**
> drifts in a *straight* diagonal, you built a sliding pebble. Leaf = constant-down **+ wobbling-
> across + tumbling**. Rock = accelerating-down + straight. Snow = slow-constant-down + barely-
> drifting + dense.

---

## 2. Accumulation / piling

Snow on a branch, sand in a corner, dust settling, leaf litter building. The realism is the
**order** material arrives and where it can rest — get the order wrong and snow looks painted-on.

### (a) Real behavior / forces
- Falling material **comes to rest where gravity can't pull it further**: on **upward-facing /
  horizontal surfaces first** (branch *tops*, ledges, the ground), not on vertical faces or
  undersides. A pile grows **from the bottom up** and **from existing material outward**.
- Early on, a dusting is **thin and broken** (individual flakes, gaps); as more lands, it
  **merges into a continuous layer**, then **deepens**, and its top edge **rounds and softens**
  (snow slumps; sand finds its angle of repose). Sharp corners of a pile fill in last.
- Depth builds **back-to-front** on a surface with thickness: the far lip catches first, then
  the layer creeps toward the viewer.

### (b) Principles & patterns
- **Timing** (the pile *grows over many frames*, monotonically — it never un-piles in a one-way
  transition) · **staging / readability** (the layer must read as sitting *on* the surface — put
  its highlight on top, a cool shadow line under its front edge) · **solid drawing** (the
  silhouette of the object *gains* a rounded white cap; keep it believable). No single
  `motion-patterns` recipe — this is an **additive overlay that only grows**.

### (c) Staging recipe
Stage accumulation as a **monotonic, bottom-up, surface-first deposition** synced to the fall:

1. **Seed (first ~1/4 of frames):** place **single pixels** of the settle color on the
   **topmost row of each horizontal surface** (branch tops, the ground line). Sparse, broken,
   slightly random x. This is "a few flakes have stuck."
2. **Merge (next ~1/4):** fill the gaps along those top rows into a **continuous 1px line**.
   Add the first pixels to *wider* ledges first (they catch more).
3. **Deepen (next ~1/4):** grow the layer **upward by 1–2px** on the widest surfaces; let it
   **creep toward the viewer** (add a front row) on surfaces with depth. The ground layer
   thickens fastest.
4. **Round (last ~1/4):** **soften the top edge** — round the corners, add a lighter highlight
   pixel on the crest, drop a 1px cool shadow under the front lip so it reads as a 3-D cap.
   Cover anything that was lying there earlier (e.g. fallen leaves on the ground get buried —
   overwrite their pixels with snow).

**Pixel rules:** never add a pile pixel with nothing beneath it (no floating snow) — each new
pixel rests **on the surface or on already-placed pile**. Bias new pixels toward existing
clusters so the pile **spreads from where it started**, not as scattered noise. In a *looping*
idle (steady snowfall), cap the depth and recycle; in a *one-way transition*, let it grow to a
final thickness and hold.

---

## 3. Wind & gusts

Rustle, sway, a gust rolling through grass or a canopy, a banner snapping. The realism is the
**envelope** (wind isn't constant — it swells and dies) and **phase** (it arrives across the
scene over time, and lighter things react more and sooner).

### (a) Real behavior / forces
- Wind is **aerodynamic pressure** on a surface; a **gust** is a *pulse* of it with a clear
  **build → peak → release** envelope (it ramps up, holds briefly, trails off). Between gusts,
  air is near-still (or a low ambient breeze).
- A gust is a **traveling front**: the upwind edge of the scene feels it first; it crosses to
  the downwind edge a beat later. So elements are **out of phase** — they bend in sequence, not
  in unison.
- **Lighter / higher-area things move more and sooner** (a leaf tip vs a thick branch; tall
  grass vs a fence post). Each part's response also **lags** the force (inertia) and
  **overshoots / springs back** when the gust releases.

### (b) Principles & patterns
- **Slow-in/out** (the envelope — never a square on/off) · **follow-through / overlap** (parts
  spring back and settle after the gust passes; tips lag) · **secondary action** (a few leaves
  detach at the gust peak — hand to §1). Pattern: **cantilever bend** (`motion-patterns.md` §1)
  is the executor; this section supplies the **envelope and phase-across-the-scene** that drives
  its `amp`/`phase`.

### (c) Staging recipe
Drive the bend's amplitude with a **gust envelope**, not a steady oscillation:

1. **Rest (frames before the gust):** ambient micro-sway only — amplitude ~0.5px, slow. The
   scene is "calm but alive."
2. **Build (2–4 frames):** ramp the bend amplitude up with an **ease-in** (slow-in): the
   force grows. Lighter elements (leaf tips, tall blades) start bending **first** and **most**;
   stiff/heavy parts barely move and start late.
3. **Peak (1–2 frames):** maximum bend, held a beat (a **held frame** registers the gust's
   force). This is when loose elements **detach** (a leaf or two lets go — §1) and a banner
   **snaps taut**.
4. **Release & overshoot (2–4 frames):** the force drops with an **ease-out**; parts **spring
   back past neutral** (follow-through) and **settle** with a small decaying wobble — the tip
   wobbles a frame longer than the base.
5. **Phase across the scene:** offset each element's envelope start by its x-position
   (`phase ∝ x`) so the gust **rolls across** left-to-right rather than hitting everything at
   once. (Per-element phase is exactly the bend pattern's `ph`.)

> Constant-amplitude sway = "metronome in a fan." A gust **envelope + phase offset + spring-back**
> is what reads as real wind. (SLYNYRD makes the same point for character motion: bounce/variable
> motion, not a constant sine — see `learning-resources.md`.)

---

## 4. Momentum & settle

A dropped fruit, a placed block, a landing creature, a slammed lid. The realism is **conservation
of momentum at impact**: a moving mass can't stop dead — it **overshoots, squashes, and settles**.

### (a) Real behavior / forces
- A falling/moving body carries **momentum** (mass × velocity). At impact the surface decelerates
  it abruptly; the energy goes into **deformation** (squash) and a small **bounce**. It then
  **overshoots** the rest position once or twice with **decaying amplitude** before settling
  (damped oscillation). **Loose parts keep going** after the body stops (follow-through).
- Heavier/faster → bigger squash, more dust, fewer/shorter bounces (energy absorbed). Lighter/
  springier → more, livelier bounces.

### (b) Principles & patterns
- **Squash & stretch** (stretch through fall, squash on impact, **preserve volume**) ·
  **anticipation** (if the object *initiates* the move — a 1–2px crouch before a hop) ·
  **follow-through / overlap** (a leaf/tail/cloth lags and settles late) · **slow-in** into rest
  (the settle decays). Pattern: **pendulum vs settle** (`motion-patterns.md` §5) — *resting*
  objects settle, they don't swing; over-swinging is the classic nonsense result.

### (c) Staging recipe
Stage the **impact and the decay**, not just the stop:

1. **Approach (last fall frames):** the body **stretches** slightly along the motion axis
   (1–2px taller if falling) — momentum reads as elongation. Optional **smear** on the fastest
   frame.
2. **Impact frame:** **squash** — widen and flatten the body (e.g. −2px height, +2px width),
   **conserving area**. Spawn a 1–2px **dust/impact puff** at the contact line and a tiny
   shadow spread. Hold this frame a beat (held frame = the hit registers).
3. **Overshoot 1 (1–2 frames):** rebound — the body **stretches back up past** its rest height
   (a smaller bounce), lifting a pixel or two off the surface.
4. **Settle (1–2 frames):** a **smaller** squash, then rest at neutral. Amplitude **decays each
   bounce** (e.g. squash 2px → 1px → 0). Two bounces max at this scale; more looks rubbery.
5. **Follow-through:** any loose appendage (a leaf on the fruit, a tail) **keeps moving a frame
   after the body stops**, then settles — offset its motion 1–2 frames behind the body.

> A resting object that **swings like a pendulum** is the #1 tell. Dropped things **bob and
> settle** (tiny, decaying); only *hanging* things swing from a pivot (§5 of motion-patterns).

---

## 5. Growth / melt / wither

Slow, **directional, one-way** change over time: a bud opening, snow melting, a leaf withering,
fruit ripening. Unlike a loop, the start and end states differ — the staging is about the
**direction** and **front** of the change, not a cycle.

### (a) Real behavior / forces
- **Growth** is driven from the **base/source outward** and usually **upward** (phototropism —
  buds and shoots open *toward the light*, petals unfurl from the center). It's **monotonic**
  and **eases**: slow start, a faster middle, slow settle into the final form.
- **Melt** is driven by **heat from above/ambient**: snow/ice recedes **top-down and edge-in**,
  thinning where it's most exposed; meltwater **beads, swells, and drips** (gravity + surface
  tension) and the **drip points recede** as the source shrinks. Thin extremities go first.
- **Wither** is loss of turgor: a leaf **droops** (curls/sags under its own weight as it
  softens), **color-shifts** (green → yellow → brown — a palette ramp change, not a geometry
  change), then **loosens** and is ready to fall.

### (b) Principles & patterns
- **Slow-in/out** (eased, monotonic progress) · **timing** (a *slow* change — many frames, small
  per-frame deltas) · **arcs** (a petal opens along a curve; a droop sags on a curve). Patterns:
  **breathing/bloom** (`motion-patterns.md` §11) for opening; **color cycling /
  pulse** (`animation-principles.md` §4, motion-patterns §7) for the **color-shift** — *move the
  ramp, not the pixels*; **drip** (§7 below) for meltwater.

### (c) Staging recipe

**Bud / bloom open (one-way, ~8–14 frames):**
- Start closed (compact silhouette). Progress `t = frame/N` through an **ease-in-out**.
- **Unfurl from the center/base outward and upward:** petal tips swing out along **arcs**
  (radius grows with `t`); the form **gains height** first, then **width**. New petal pixels
  **appear at the growing edge**, never pop in fully-formed elsewhere.
- Settle into the open form on the last 1–2 frames (slow-out); optionally a tiny breathing
  over-open-then-relax.

**Snow melt (one-way, ~10–16 frames):**
- Begin with a full cap (from §2). **Recede top-down and edge-in:** each step, **remove the
  topmost / most-exposed pixels first**; thin the layer where it's thinnest. Extremities (a
  branch-tip dusting) clear before the thick ground pile.
- **Drips:** at the melting underside/front lip, occasionally **swell a bead** (1px → 2px), then
  it **detaches and falls** (a 1px drop, §7) and the **bead point moves** as the edge retreats.
- End on bare surface (or a wet/dark residue pixel that then fades). Leaves/ground revealed
  underneath **reappear** as the snow that buried them (§2) is removed — reverse the burial order.

**Wither (one-way, ~8–12 frames):**
- **Color-shift first:** over the early frames, walk the foliage ramp from green → yellow →
  brown by **reindexing colors** (color cycling), geometry unchanged.
- **Droop next:** the leaf/blade **sags on an arc** under its own weight — apply a downward
  **cantilever bend** whose amplitude *grows monotonically* (not oscillating) as turgor is lost;
  the tip curls most.
- **Loosen last:** on the final frames the attachment weakens — a 1px gap opens at the stem; the
  leaf is now a candidate for **release** (hand to §1 falling).

---

## 6. Fire / ember / smoke

A campfire, torch, ember shower, chimney smoke. These are **chaotic, straight-ahead** effects
(`animation-principles.md`: draw frame-after-frame for fire/smoke, don't pose-to-pose). The
realism is **buoyant convection** (hot gas rises) plus **irregularity** — anything too regular
reads as fake.

### (a) Real behavior / forces
- **Flame:** hot gas is buoyant → it **rises**, narrowing to a flickering tip. The base is
  wide, bright, and steady; the tip is thin, dimmer, and **darts irregularly** (turbulence). The
  whole flame **licks** upward with a slight side-to-side wander, never a clean sine.
- **Embers / sparks:** tiny hot particles **rise** (carried by the thermal) while **cooling** —
  they **fade from white→orange→red→gone**, drift sideways a little, and **wink out** at the
  top. They're **sparse and staggered**.
- **Smoke:** cooler particulate that **rises, expands (spreads wider), slows, and dissipates**
  (turbulent diffusion). It **accelerates away from the source then decelerates** as it cools,
  and **fades to transparent** as it thins.

### (b) Principles & patterns
- **Straight-ahead** (the only correct workflow for fire/smoke) · **color cycling** (animate the
  fire by **cycling the flame ramp**, not by moving geometry — `animation-principles.md` §4) ·
  **timing/irregularity** (vary the flicker; no two frames identical) · **slow-out then slow-in**
  for smoke (speeds up off the source, slows as it expands). Patterns: **pulse/glow**
  (motion-patterns §7) for the ember/flame brightness; **overlay** (§9) for ember particles.

### (c) Staging recipe

**Flame (looping, ~6–10 frames):**
- Keep a **stable bright base**; animate the **upper 2/3** straight-ahead. Each frame, **redraw
  the flame outline** with a different irregular tip (lean the peak left/right by 1px, vary the
  height by 1–2px). **Upward bias:** licks always travel up, never down.
- **Color-cycle** the interior ramp (white core → yellow → orange → dark-red edge) **upward**
  over frames to imply rising gas without moving the silhouette.
- Loop by making frame N flow into frame 0 (no hard reset); irregularity hides the seam.

**Embers (overlay, staggered):**
- Spawn sparse particles at the flame top on an **irregular stagger**. Each **rises** (`y`
  decreases) while **drifting** ±1px and **cooling**: step its color white→orange→red over its
  life, then **vanish** at the top. Lighter embers rise faster/higher.

**Smoke (rising plume, ~8–12 frames):**
- Emit a puff at the source; each puff **rises**, **expands** (radius grows 1px every couple of
  frames), **slows** (`dy` shrinks as it climbs), and **fades** (step toward transparent). Puffs
  **stagger** so the column is continuous. Drift the whole column slightly downwind if there's
  ambient wind (§3).

---

## 7. Water / ripple / drip

Pond ripples, a water surface, a dripping eave, a droplet impact. The realism is **wave
propagation** (rings expand and fade) and the **drip life-cycle** (swell → fall → impact →
ring).

### (a) Real behavior / forces
- **Ripples:** a disturbance sends **concentric rings outward** at roughly constant speed; each
  ring **grows in radius and fades in amplitude** as energy spreads over a longer circumference.
  Multiple rings coexist (newer inside, older/fainter outside).
- **Surface bob:** a floating object **rises and falls gently** with the surface — a small, slow
  vertical oscillation (and a tiny tilt), not a swim.
- **Drip:** at an eave/leaf-tip, surface tension **holds a bead that swells** until its weight
  beats tension → it **detaches and falls** (accelerating, §1 heavy-ish but tiny), **impacts** a
  surface with a 1px **splash/crown**, then a **ring expands** from the impact (ripple).

### (b) Principles & patterns
- **Color cycling** (animate water surface/ripples by **shifting the ramp**, classic technique —
  `animation-principles.md` §4) · **slow-out** (ripple fades as it expands) · **anticipation**
  (the bead **swells** before it drops — a built-in wind-up) · **squash/stretch** (the droplet
  **stretches** as it falls, **squashes** into the splash). Patterns: **overlay** (drip particle,
  motion-patterns §9); **pulse** for the surface shimmer.

### (c) Staging recipe

**Ripple (looping or one-shot, ~6–10 frames):**
- Draw rings as **expanding ellipses** (flattened for a top-down water plane). Each frame: **grow
  the radius** by ~1px and **dim/thin** the ring (drop it one ramp step, then to transparent).
  Spawn a **new ring every 2–3 frames** at the center so several coexist (newest brightest,
  innermost). The outermost rings vanish as they reach the edge.
- For an idle water surface, prefer **color cycling** a horizontal band ramp left-to-right over
  moving any pixels — cheap and seamless.

**Drip (one-shot life-cycle, ~6–10 frames):**
1. **Swell (2–3 frames):** the bead grows 1px → 2px at the tip (this is **anticipation**; ease-in).
2. **Detach & fall (2–3 frames):** the droplet releases and **falls, stretching** vertically
   (1–2px taller), **accelerating** slightly (it's small and dense-ish). A faint trail/smear
   helps on the fast frame.
3. **Impact (1 frame):** **squash** into a flat 1px splash; spawn a 2-pixel **crown** (one px
   left, one right) and hold a beat.
4. **Ring (1–2 frames):** a single small **ripple ring expands and fades** from the impact point
   (hand to the ripple recipe), then clear.

---

## 8. Quick reference: force → staging

| Force / phenomenon | Time-shape (speed profile) | Path | Stagger | Key principle(s) | Pattern executor |
|---|---|---|---|---|---|
| Leaf fall | constant (terminal, slow) | wandering zig-zag + tumble | irregular release | arcs, overlap, secondary | falling-leaf overlay |
| Snow fall | constant (terminal, slower) | near-straight, ≤1px drift | dense, tight | overlap | overlay (many) |
| Rock fall | **accelerating** | straight | single | slow-out (no slow-in), smear | (gravity) + impact |
| Accumulation | **monotonic growth** | bottom-up, surface-first, back-to-front | tied to fall | timing, staging, solid drawing | additive overlay |
| Gust | **build→peak→release** envelope | bend curves, springs back | phase ∝ x | slow-in/out, follow-through | cantilever bend |
| Drop & settle | stretch→squash→**decaying bounce** | down, then tiny bobs | loose parts lag | squash&stretch, follow-through | pendulum/**settle** |
| Bloom/growth | eased **one-way** | unfurl center-out, upward | — | slow-in/out, arcs | breathing/bloom |
| Melt | eased **one-way** recession | top-down, edge-in; drips fall | drips staggered | timing, slow-in/out | (recede) + drip |
| Wither | **one-way**: color→droop→loosen | sag on an arc | — | timing, arcs | color-cycle + bend |
| Flame | irregular flicker, **upward** | licks up, wanders ±1px | — | straight-ahead, color cycling | pulse + redraw tip |
| Ember | **rise + cool + fade** | up, drift ±1px, wink out | sparse, irregular | color cycling | overlay |
| Smoke | **rise, expand, slow, fade** | up, spreads, drifts downwind | staggered puffs | straight-ahead, slow-out | expanding overlay |
| Ripple | **expand + fade** | concentric rings outward | new ring every 2–3f | slow-out, color cycling | pulse / expanding ring |
| Drip | swell→fall(accel)→squash→ring | down, then ring | — | anticipation, squash&stretch | overlay + ripple |

---

## 9. Worked example: birch autumn→winter (~20 frames)

The proof. This is the transition the user hand-directed and the reason this reference exists:
a birch tree changing from full autumn foliage to a bare, snow-dusted winter silhouette. The
naive version ("crossfade green leaves to snow") looks wrong; **directing every force** makes it
read. We storyboard it frame-by-frame from the catalog above. (Format mirrors
`sprite-pipeline/assets/storyboard.template.md` — fill that, then build in Aseprite.)

**Header**
- **Asset:** `birch` · **kind:** transition `autumn → winter` · **frames:** 20 · **fps:** ~8–10
  (on-twos) · **loop:** no (one-way; holds on the final winter frame).
- **Physics summary:** loosened autumn leaves **flutter-fall** to the ground (constant terminal
  velocity + wobble + tumble, **staggered release**) while, overlapping, **snow begins** —
  falling **slower** than the leaves, **accumulating** on branch-tops first then the ground, and
  **burying** the fallen leaves.
- **Dominant forces:** gravity + air-drag (terminal velocity, two different ratios for leaf vs
  snow) · monotonic accumulation · a one-way wither color-shift up front.

**Staging in four overlapping beats** (the leaf-fall and snow-fall **overlap** in the middle —
that overlap is what makes it feel like a real seasonal turn, not two clips spliced):

| Frames | Beat | Dominant force | What enters / moves / exits | Easing | Pixel-level change |
|---|---|---|---|---|---|
| 0–2 | **Wither + first release** | turgor loss; gravity | Canopy color-shifts (already yellow-brown from autumn → deepening). 1–2 edge leaves **loosen** (1px gap at stem). Ambient micro-sway. | slow-in | Reindex a few canopy pixels one ramp step browner (color cycling, no geometry move). Open a 1px stem gap on 2 tip leaves. |
| 2–9 | **Leaf flutter-fall (staggered)** | gravity vs air-drag → **slow terminal velocity** | Leaves detach on an **irregular stagger** (frames 2, 4, 7, 9…) and **flutter down**: constant ~1px/frame descent, **±3px sine wobble**, **tumbling** (face-on↔edge-on cel swap every ~3 frames). Canopy visibly **thins** as leaves leave. | constant fall; eased wobble | Each leaf = a 2–3px colored cluster; advance `y` +1/frame, `x = start + drift·g + sin(g·6)·3`. Remove the leaf's pixels from the canopy when it releases. Edge-on frames = 1px sliver shifted sideways. |
| 6–9 | **Snow begins (overlap)** | gravity vs air-drag → **slower terminal velocity** | While leaves are still falling, the **first flakes** appear at the top, descending **slower** (~0.5–1px/frame) and **straighter** (≤1px drift) than the leaves. **Dense, tight stagger** (a flake most frames), random x. | constant (slow) | 1px white flakes; advance `y` slowly; near-zero horizontal. Several on screen at once, independent lines. Snow is clearly *slower* than the co-falling leaves — the speed contrast sells the two materials. |
| 9–15 | **Branch-top accumulation** | monotonic deposition | Bare **branch tops** (now exposed by the thinned canopy) **catch snow first**: a broken dusting → a continuous 1px line → a 1–2px cap on the thickest branches. Leaves continue landing on the **ground**, building litter. | monotonic (one-way) | Seed single white pixels on the **topmost row of each branch**, sparse→merged; thicken widest branches. Each landed leaf adds to a **ground litter** row. No floating snow — every pixel rests on a branch or pile. |
| 13–18 | **Ground pile + bury leaves** | monotonic deposition | The **ground** layer (snow) thickens fastest and **creeps toward the viewer**; it begins **covering the fallen leaves** (litter). Last few flakes land. | monotonic | Grow the ground snow **upward 1–2px** and add a front row (back-to-front). **Overwrite** litter-leaf pixels with snow as the layer reaches them — the leaves disappear *under* the snow, not by fading. |
| 18–20 | **Settle / round-off (hold)** | — (steady state) | Snowfall tapers to a flake or two. Branch caps and ground layer **round and soften**; a **cool shadow line** under each cap and the front of the ground layer makes the snow read as 3-D. Final bare-birch-in-snow silhouette **holds**. | slow-out to rest | Round cap corners; add a light highlight pixel on each crest and a 1px cool-shadow pixel under front edges. Stop spawning flakes; hold the last frame. |

**Why each catalog rule earns its place here:**
- **Two terminal velocities** (§1): leaves fall *visibly faster* than snow. If both fell at the
  same rate the materials would blur together — the **speed contrast is the readability**.
- **Staggered vs dense release** (§1): leaves let go a few at a time (irregular); snow is a dense
  continuous field. Same force, opposite stagger — that's how you tell them apart at a glance.
- **Overlap of the two falls** (frames 6–9, principle: **overlap/secondary action**): the turn
  reads as *one continuous season change* because snow starts **before** the last leaves land,
  rather than "leaves clip" then "snow clip."
- **Surface-first, bottom-up accumulation** (§2): snow on **branch tops and ground**, never on
  vertical trunk faces; grows **upward** and **toward the viewer**; **buries** the litter by
  overwriting it. Painting snow uniformly over the whole tree is the exact failure this avoids.
- **Wither color-shift via reindexing** (§5): the early browning **moves the ramp, not the
  pixels** (color cycling) — cheap, and it doesn't disturb the silhouette before the leaves fall.

Build it: fill the storyboard template with the per-frame rows above, **critique the storyboard
against the 12 principles** (is the fall **arced** and **staggered**? does snow **accumulate
bottom-up**? do the two falls **overlap**? is the settle **eased**?) — *then* author the 20 cels
in Aseprite. That storyboard critique is the cheap gate that catches "it's just a crossfade"
**before** the expensive frame-by-frame build.

**Land the transition exactly — converge, then verify endpoint identity.** A one-way transition
**holds the target still** on its last frame, so two things must be true or the loop-end "pops":
1. **The final frame *is* the target still, pixel-for-pixel.** Author it by **importing the target
   keyframe PNG** onto the last frame, not by hand-finishing the penultimate cel "close enough." Then
   **diff them** to prove it (the sprite-pipeline's `scripts/pixels.mjs diff <lastFrame> <targetStill>`
   should report **0 changed pixels**). If it's non-zero, your "winter" frame isn't the winter tile.
2. **The penultimate frames *converge* to it.** Drive the accumulation/recolor so the second-to-last
   authored frame is already within a handful of pixels of the target (diff it: a few px, not dozens).
   If frame N−1 is far from the target, the cut to the held final frame jumps — the eye sees a snap.
   Stage the settle (§ frames 18–20) so the form *eases into* the target rather than arriving late.
This converge-then-verify step is cheap (two `pixels.mjs diff`s) and it's the difference between a
transition that resolves cleanly and one that twitches on the last frame.

---

### Sources & grounding
The **physics** here is standard mechanics (gravity, terminal velocity = drag balancing weight,
buoyant convection, damped oscillation, wave propagation, angle of repose) — observable, not
cited from any single page. The **staging-it-as-animation** craft is grounded in the same
references this skill already uses; see **`learning-resources.md`** for the verified reading list.
Two points above lean on specific published craft guidance:
- "Drive sway with a **bounce/envelope**, not a constant sine — constant sine reads robotic" —
  SLYNYRD, *Pixelblog 8: Intro to Animation*
  (https://www.slynyrd.com/blog/2018/8/19/pixelblog-8-intro-to-animation).
- The **12 principles** invoked by name throughout are Thomas & Johnston's, as adapted for
  sprites in **`animation-principles.md`** (don't re-read them here — that file is canonical).
