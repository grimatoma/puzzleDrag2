---
name: pixel-art-animation
description: >-
  Use when adding MOTION to a pixel-art sprite, tile, or icon — making it genuinely move
  (organic bending, articulation, character motion) rather than a rigid pixel-shift that
  just slides a region side to side. Triggers: animating a sprite/tile/icon, a looping
  pixel-art GIF, motion like sway / peck / swim / bob / sparkle / glow / open-close, asking
  why an animation "looks like it's just sliding around" / "isn't really animated" / "looks
  mechanical or robotic," wanting motion that keeps an existing sprite's detail, needing a
  seamless loop, or deciding which parts move vs stay rigid.
  Covers "animate the shape, don't slide it," the 12 animation principles on sprites, pixel
  motion techniques (sub-pixel, smears, color cycling), a motion-pattern catalog (bend,
  articulation, pendulum, traveling wave, pulse/glow, overlays), looping, the montage
  motion-review workflow, and the round-half-up / outline / GIF-transparency gotchas. For
  STATIC pixel-art design (palette, shading, anti-aliasing), see the pixel-art-craft skill.
---

# Pixel-Art Animation

How to make pixel-art sprites/tiles that genuinely *move* — and why the obvious approach
fails. This skill is the distillation of building dozens of 32–48px looping tile
animations; it exists mostly to save you from the same dead ends.

This skill is the **motion** half of a pair. For the static-art craft that a sprite needs
*before* it moves — hue-shifted palettes, one-light shading (no pillow-shading),
anti-aliasing, banding, clean clusters, outlines — see the **pixel-art-craft** skill. For
the full production pipeline (style spec → base art → animation → critique loop), see the
**sprite-pipeline** skill, which executes animation in Aseprite and uses this skill's
patterns and principles as the motion direction + the motion-critique rubric.

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

## Think in re-drawn frames, not translated regions

At 32–64px, hand-keying organic bends across a dozen frames is exactly what produces the
mechanical slide — it's too fiddly to get the curve+lag+phase right by eye if you think of
it as "move this region." The fix is conceptual and **tool-agnostic**: express each soft
part's motion as a **curve over distance-along-the-part and over phase** (bend ∝ `s^1.7`,
phase-lagged by `s`), and **re-form the silhouette** each frame from that — whether you draw
the frames by hand, in Aseprite, or generate them procedurally.

> **Production path:** in the **sprite-pipeline** workflow, animation frames are authored in
> **Aseprite** (timeline + onion-skinning), driven by the patterns and principles below.
> Aseprite is the tool of record — not a procedural generator.

`assets/anim_starter.py` is a **reference-only** procedural example (Python + Pillow), **not
the production path**. It's a fully worked illustration of these ideas in code — the drawing
helpers (`Buf` with the round-half-up `put`, `disc`, `rect`, `softline`, `poly`, `outline`),
timing helpers (`smooth()` easing, `pulse01()` eased action pulse), the `cantilever()` bend
function, the seamless-loop GIF exporter, and two worked examples (a swaying tuft = the bend
pattern, a bobbing/pecking creature = articulation + anticipation). Read it (or run `python
anim_starter.py`) to see exactly how curve+lag+phase, easing, and seamless looping turn into
concrete numbers; then apply the same motion in your tool of choice. (It also ships the
static-craft helpers `ramp()`/`lit`/`sphere_t`/`dither` — those belong to the
**pixel-art-craft** skill.)

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

## Design the image first — then animate it

Motion can't save a weak sprite. Draw a strong **static frame 0** before animating: a
hue-shifted palette, one consistent light source (never pillow-shaded), selective
anti-aliasing, clean clusters, and the real identifying detail (comb, fins, veins, bark,
kernels) with room to read — author at **48px (or 64px)**, not a cramped 32px.

All of that still-craft — palettes/ramps, light & shading, AA, banding, clusters, dithering,
outlining, resolution discipline, and a mistakes→fixes table — lives in the
**pixel-art-craft** skill. Get the static frame looking professional with that skill first,
then come back here for the motion.

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
2. **Get a strong static frame 0 first** — a professional still at 48px (or 64px) using the
   **pixel-art-craft** skill (hue-shifted ramps, one-light shading, real detail). Make it
   look good *standing still* before animating.
3. **Add motion** using the fitting pattern(s) from the catalog — bend the soft parts,
   articulate moving parts, layer an overlay — and apply the **principles**
   (`references/animation-principles.md`): an anticipation wind-up, eased timing,
   follow-through lag. Keep rigid parts rigid. Drive everything off `phase` for a seamless
   loop. In the **sprite-pipeline** flow this is authored in Aseprite; `assets/anim_starter.py`
   is a reference example of the same motion expressed in code.
4. **Export** the looping GIF + a representative still.
5. **Montage-review** with `scripts/preview_frames.py`; tune curve amplitude, lag, phase
   spread, frame count, and timing; redo the frames. Repeat until the motion reads as organic.
6. If the art is for a doc/gallery, display GIFs at large size with
   `image-rendering: pixelated` and consider **base64-inlining** them so the page is
   self-contained and never 404s.

## What's in this skill

- `assets/anim_starter.py` — **reference-only** procedural example (Python + Pillow), not
  the production path: drawing helpers + `cantilever()` bend + `smooth()`/`pulse01()` timing
  + seamless GIF export + 2 worked examples. Read it to see curve+lag+phase as concrete
  numbers, then apply the motion in your tool of choice (Aseprite in the sprite-pipeline
  flow). (Its `ramp()`/`lit`/`sphere_t`/`dither` static-craft helpers belong to the
  **pixel-art-craft** skill.)
- `references/animation-principles.md` — **animating** like a pro: the 12 principles in pixel
  terms, sub-pixel animation / smears / color cycling, key-pose libraries, timing/FPS, and a
  principle→helper map.
- `references/motion-patterns.md` — full code recipes for every motion pattern (bend,
  articulation, pendulum/settle, traveling wave, pulse/glow, glint, overlays, hinge,
  breathing) with the "make it organic" notes.
- `scripts/preview_frames.py` — the upscale + frame-montage review tool. Use it every
  iteration.
