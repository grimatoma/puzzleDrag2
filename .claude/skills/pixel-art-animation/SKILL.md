---
name: pixel-art-animation
description: >-
  Create animated pixel-art sprites, tiles, or icons whose motion is REAL animation —
  organic bending, articulation, character motion — instead of a rigid pixel-shift that
  just slides a region side to side, AND whose art is designed with professional craft
  (hue-shifted palettes, proper light/shading, anti-aliasing, clean clusters). Use this
  whenever the user wants to animate a sprite/tile/icon, make a looping pixel-art GIF, add
  motion like sway / peck / swim / bob / sparkle / glow / open-close, design or improve
  pixel-art color/shading/palette, asks why an animation "looks like it's just sliding
  around" or "isn't really animated," wants higher-quality / more professional / more
  realistic pixel art, or wants animation that keeps the detail of an existing sprite.
  Covers procedural frame generation (Python + Pillow); the design craft pros use (hue
  shifting, color ramps, light direction / no pillow-shading, anti-aliasing, banding,
  dithering, selective outlining); the 12 animation principles applied to sprites
  (anticipation, squash & stretch, follow-through, easing, arcs, timing); pixel techniques
  (sub-pixel animation, smears, color cycling); a catalog of motion patterns (cantilever
  bend, articulation, pendulum, traveling wave, pulse/glow, overlays); seamless looping;
  the upscale-and-montage review workflow; and the round-half-up / outline /
  GIF-transparency gotchas that silently wreck pixel animation.
---

# Pixel-Art Animation

How to make pixel-art sprites/tiles that genuinely *move* — and why the obvious approach
fails. This skill is the distillation of building dozens of 32–48px looping tile
animations; it exists mostly to save you from the same dead ends.

## The one idea that matters: animate the shape, don't slide it

The tempting (and wrong) way to "animate" a sprite is to take the finished static image
and, each frame, translate or shear a region of it — shift the top rows sideways for a
"sway," slide the head down for a "nod." It reads as **a block of pixels sliding around**,
not as a thing that is alive. This is the #1 complaint you'll get, and it's correct.

Real motion comes from **re-drawing the form in its new pose every frame** — the
silhouette genuinely re-forms — plus four properties that make it read as organic:

1. **Bend, don't translate.** A blade, stalk, tail, or limb is a flexible body anchored at
   one end. Displacement should **grow toward the free end** (e.g. `offset ∝ s^1.7`, with
   `s` going 0 at the anchor to 1 at the tip), so the base barely moves and the shape
   *curves*. A rigid translate keeps the shape and just moves it — that's the slide.
2. **The free end lags the base (follow-through / whip).** Phase-delay the motion by
   distance along the part: `wind(phase − lag·s)`. The bend then *travels up* the part and
   the tip arrives a beat late. This single trick is most of what separates "alive" from
   "stick on a pivot."
3. **Neighbors out of phase.** Give each blade/leaf/element its own phase offset so a gust
   or wave **rolls across** the group instead of everything moving in lockstep.
4. **Ease, don't ping-pong linearly.** Drive with smooth periodic functions and a slow
   "breathing" envelope so the motion swells and relaxes like real wind, not a metronome.

If an animation looks mechanical, it's almost always because one of these is missing —
usually #1 (you translated instead of bent) or #2 (no tip lag).

## Decide what actually moves — and what stays rigid

Before animating, ask: *on this real object, which parts move, and how?* Animate only
those; keep the rest **rigid**. Getting this wrong looks ridiculous:

- A **corn cob** is rigid — only the husk **leaves** rustle. (Bending the whole cob like a
  blade of grass is the classic nonsense result.)
- A **tree trunk** is planted — only the **canopy** rustles and sways as a mass.
- A **carrot root** holds still — only the **fronds** catch the wind.
- A **picked apple** at rest doesn't swing like a pendulum — it **settles** (a tiny bob),
  and its light **leaf** flutters.
- A **gem** doesn't deform at all — the *light* moves across it (glint sweep + glow pulse).

Match the motion to the material: soft/light things (leaves, fronds, husks, fins, petals,
flames, light) move; hard things (cobs, trunks, rock, shells' bodies) don't. The most
"alive" tiles often combine a **rigid body** with one or two **moving soft parts** plus an
**overlay** (a glint, sparkle, bubble, falling leaf, drifting spore).

## Generate frames in code, not by hand

At 32–64px, hand-keying organic bends across a dozen frames is exactly what produces the
mechanical slide — it's too fiddly to get the curve+lag+phase right by eye, frame by
frame. Express the motion as **math** and re-rasterize each frame. **Python + Pillow** is
the right tool: total control over the per-pixel shape, easy GIF export.

`assets/anim_starter.py` is a complete, runnable starter — copy it and adapt. It contains
the drawing helpers (`Buf` with the round-half-up `put`, `disc`, `rect`, `softline`,
`poly`, `outline`), color + shading craft (`ramp()` for a pro hue-shifted palette from one
color, `lit`, `sphere_t`, `dither`), timing helpers (`smooth()` easing, `pulse01()` eased
action pulse), the `cantilever()` bend function, the seamless-loop GIF exporter, and two
worked examples (a swaying tuft = the bend pattern, a bobbing/pecking creature =
articulation + anticipation). Run it: `python anim_starter.py` → writes the looping GIFs.

## Motion patterns (catalog)

Pick the pattern that fits the object. Full code for each is in
**`references/motion-patterns.md`** — read it when you need the recipe.

| Pattern | For | Gist |
|---|---|---|
| **Cantilever bend** | grass, fronds, husks, hair, tails, canopy-as-mass | offset grows `∝ s^1.7`, phase-lagged by `s`, per-element phase |
| **Articulation** | a head pecking, a limb, a mouth/shell opening | draw parts at per-frame offsets; rotate a part about a pivot |
| **Pendulum vs settle** | hanging vs resting objects | hanging → swings from the top; resting → a tiny bob (don't over-swing) |
| **Traveling wave** | fish swim, snakes, banners | sine wave travels along the body; amplitude grows toward the tail |
| **Pulse / glow** | gems, embers, magic, bioluminescence | shift the whole color **ramp** brighter/dimmer over the cycle |
| **Glint sweep** | metal, crystal, glossy fruit | a bright streak moves diagonally across a surface |
| **Overlays** | sparkle, bubbles, spores, falling leaf, dew | small independent elements on their own phase/loop; sell "alive" |
| **Breathing** | flowers, anything idle | a slow scale/spacing oscillation (bloom in/out) |

**Seamless looping:** drive everything with `phase = 2π · frame / N`. Any sum of
integer-harmonic sines repeats exactly after `N` frames, so the loop is seamless for free.
A breathing envelope `0.72 + 0.28·sin(phase − π/2)` makes a sway swell and ease. ~16–18
frames at ~70–80 ms reads smooth.

## Animate like a pro — the principles

The motion patterns are *how*; the **12 animation principles** (Disney, *The Illusion of
Life*) are *why* a motion reads as alive and weighted. On a small sprite a few carry most of
the weight:

- **Anticipation** — a 1–3 frame wind-up *before* the action (crouch before a jump, pull
  back before a strike). The most impactful thing pros add and the most commonly skipped.
- **Squash & stretch** — deform to show weight/impact while preserving volume; even 1px reads.
- **Follow-through / overlap** — loose parts (hair, cape, tail) lag and keep moving after the
  body stops (the bend's tip-lag, applied to articulated parts).
- **Slow in / slow out** — ease; cluster frames at the extremes. Linear motion is the robot
  tell. (`smooth()` / `pulse01()` in the starter.)
- **Arcs, timing, secondary action, exaggeration, staging** — curve the paths, let frame
  count carry weight, add a subordinate motion, push poses past literal, keep one clear read.

Pixel-specific moves worth knowing: **sub-pixel animation** (move the *colors*, not the
sprite, to imply motion smaller than a pixel — essential for smooth small sprites), **smear
frames** (a streaked ghost on the 1–2 fastest frames), and **color cycling** (animate the
palette, not the geometry — water/fire/sparkle). Standard timing is **8–12 FPS** / "on twos."

Full treatment — each principle in pixel terms, key-pose libraries (walk/idle/attack), and a
table mapping every principle to a starter helper — is in
**`references/animation-principles.md`**.

## Design the image first — craft that reads as pro

Motion can't save a weak sprite. Draw a strong **static frame 0** before animating, with the
craft that separates professional pixel art from flat fills:

- **Hue-shift your ramps.** Don't shade one hue dark→light (muddy). Pros rotate the hue —
  **cool/blue shadows, warm/yellow highlights** (~15–25°), saturation peaking in the middle,
  never max-sat at max-value. `ramp(base, n)` in the starter does exactly this from one color.
- **One light source; never pillow-shade.** Hold a single light direction (upper-left) and
  shade the **3D form** — light one side, shadow the opposite. Shading concentrically inward
  from the outline ("pillow shading") is the #1 amateur tell; `sphere_t` gives correct form
  light for rounded shapes.
- **Anti-alias selectively** — smooth long staircase steps, but **not** 45°/straight lines,
  and never so much it blurs. Watch for **banding** (parallel equal-length runs that echo the
  grid as a false line).
- **Clean clusters & chunky pixels.** Monotonic run-lengths (no jaggies/orphan pixels); give
  thin limbs ≥2px of mass so they don't flicker. **Dither** (`dither()`) to imply a shade
  from two colors. Use a **solid outline** for game icons, **selout** for a softer read.
- **Include the real identifying detail** (comb, fins, veins, bark, kernels, petals) and give
  it room: author at **48px** (or 64px), not a cramped 32px, before sacrificing detail.

Full treatment — palettes, light, AA, banding, clusters, dithering, outlining, and a
mistakes→fixes table — is in **`references/pixel-art-craft.md`**. Read it when designing the art.

## Gotchas that silently break pixel animation

- **Round half-up, NOT banker's rounding.** When you shift a filled row by a fractional
  `dx` and place pixels with Python's `round()`, banker's rounding maps two adjacent source
  columns to the same target at ~`x.5` offsets and **skips the one between** — leaving
  every-other-pixel holes inside the row. A silhouette-outline pass then fills those holes
  with dark pixels → a **dashed/speckled line** across your sprite. Use
  `int(math.floor(x + 0.5))` everywhere you place a pixel. (The starter's `Buf.put` already
  does this.)
- **Silhouette outline pass** gives a cohesive "sticker" read: after drawing all opaque
  parts, set any transparent pixel 4-adjacent to an opaque one to a dark outline color. Keep
  the art ≤ `canvas − 2` px so the 1px ring fits.
- **GIF transparency is 1-bit.** No soft shadows. Build a fixed palette from every used
  color plus one reserved transparent index, map `alpha < 128 → index 0`, and save with
  `transparency=0, disposal=2, loop=0` and a per-frame duration. (Recipe is in the starter's
  `save()`.) Ground rooted things with their own base (soil/feet) rather than a floating
  soft shadow — a hard shadow blob plus the outline pass looks wrong.
- **Transparent background**, centered art, consistent anchor across frames (animate around
  a fixed root/pivot, don't let the whole sprite drift unless it's meant to).

## Verify by montage — you cannot judge it from the GIF

You can't tell organic motion from a slide by squinting at a 48px GIF, and `Read` shows it
tiny. Two non-negotiable review steps:

1. **Upscale a frame** nearest-neighbor (8–10×) and `Read` it to judge the *art*.
2. **Montage the whole cycle** — lay every frame in a grid, upscaled, and `Read` it once.
   This is THE tool that reveals the *motion*: scanning the row you can see whether the
   shape **re-forms** (good) or just **slid** (bad), whether the tip **lags**, and whether
   neighbors are **out of phase**. Always montage-review before calling it done.

`scripts/preview_frames.py` does both: `python preview_frames.py sprite.gif` writes an
upscaled frame-grid montage; `python preview_frames.py sprite.png --scale 10` upscales a
still. Cross-platform (Pillow only).

Then iterate: **generate → montage → inspect → tune the motion params → regenerate.** Own
this visual loop yourself — it's hard to delegate blind, and a blind pass is exactly how you
end up shipping the mechanical slide.

## Workflow

1. **Identify the object and its parts.** What's rigid, what's soft, how would each soft
   part really move? Note the source palette/elements to match.
2. **Copy `assets/anim_starter.py`**, set the canvas size (48px is a good default), and
   draw a strong **static frame 0** first — hue-shifted `ramp()`s + one-light `sphere_t`
   shading + the real detail elements (see `references/pixel-art-craft.md`). Make it look
   good *standing still* before animating.
3. **Add motion** using the fitting pattern(s) from the catalog — bend the soft parts,
   articulate moving parts, layer an overlay — and apply the **principles**
   (`references/animation-principles.md`): an anticipation wind-up, eased timing (`smooth()`
   / `pulse01()`), follow-through lag. Keep rigid parts rigid. Drive everything off `phase`
   for a seamless loop.
4. **Export** the looping GIF + a representative still.
5. **Montage-review** with `scripts/preview_frames.py`; tune curve amplitude, lag, phase
   spread, frame count, and timing; regenerate. Repeat until the motion reads as organic.
6. If the art is for a doc/gallery, display GIFs at large size with
   `image-rendering: pixelated` and consider **base64-inlining** them so the page is
   self-contained and never 404s.

## What's in this skill

- `assets/anim_starter.py` — runnable generator: drawing + `ramp()` hue-shift color +
  `smooth()`/`pulse01()` timing + `cantilever()` bend + seamless GIF export + 2 worked
  examples. Start here; copy and adapt.
- `references/pixel-art-craft.md` — **designing the image** like a pro: hue-shifted palettes,
  light/shading (no pillow-shading), anti-aliasing, banding, clusters, dithering, outlining,
  and a mistakes→fixes table. Read it when drawing the art.
- `references/animation-principles.md` — **animating** like a pro: the 12 principles in pixel
  terms, sub-pixel animation / smears / color cycling, key-pose libraries, timing/FPS, and a
  principle→helper map.
- `references/motion-patterns.md` — full code recipes for every motion pattern (bend,
  articulation, pendulum/settle, traveling wave, pulse/glow, glint, overlays, hinge,
  breathing) with the "make it organic" notes.
- `scripts/preview_frames.py` — the upscale + frame-montage review tool. Use it every
  iteration.
