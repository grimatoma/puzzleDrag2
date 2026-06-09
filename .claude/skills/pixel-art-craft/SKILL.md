---
name: pixel-art-craft
description: >-
  Use when designing or improving the STATIC craft of a pixel-art sprite, tile, or icon —
  its color, palette, shading, and edges — independent of any motion. Triggers: making pixel
  art look professional / cleaner / less flat / less amateur, building or hue-shifting a color
  ramp (cool shadows, warm highlights), choosing a light direction, fixing pillow-shading,
  fixing banding, anti-aliasing a jaggy edge, cleaning up clusters / jaggies / orphan pixels,
  dithering to stretch a palette, adding a solid outline or selective outline (selout),
  deciding canvas resolution / how much detail to draw, or diagnosing why a sprite reads as
  muddy, plasticky, flat, noisy, or "off." Use it when drawing a strong static frame before
  animation, or to critique a still. For motion / animation of a sprite, see the
  pixel-art-animation skill instead.
---

# Pixel-Art Craft — designing the still image like a pro

The design-side craft of pixel art: **palette, light, edges, outlines** — the choices that
separate deliberate, professional pixel art from a flat fill. This skill is distilled from
the artists the field actually learns from (Pedro Medeiros/Saint11, SLYNYRD/Raymond
Schlitter, Derek Yu, Pixel Parmesan, 2dwillneverdie). Sources at the bottom.

The single highest-leverage rule: **draw a strong frame 0 first** — palette + light + real
detail — and make it look good standing still before anything moves.

This skill is the **still-craft** half of a pair. For making a sprite genuinely *move*
(organic bends, articulation, the 12 animation principles, looping), see the
**pixel-art-animation** skill. In the **sprite-pipeline** workflow, this craft powers the
base/keyframe art and is the rubric for the still-critique pass; pixel-art-animation owns the
motion-critique pass.

## When to use

- You have (or are about to draw) a static sprite/tile/icon and want it to read as
  professional, not amateur.
- A sprite looks **muddy, plasticky, flat, soft, noisy, or "off"** and you need to diagnose why.
- You're choosing a **palette / ramp**, a **light direction**, or how much **detail** to draw.
- You need to **anti-alias**, kill **banding**, clean up **jaggies/clusters**, **dither**, or
  add an **outline / selout**.
- You're drawing the **strong static frame 0** before animating (then hand off motion to
  pixel-art-animation).

When the work is *motion* (sway, peck, swim, glow-pulse, looping GIFs), that's the
**pixel-art-animation** skill — not this one.

> The `ramp()`, `lit()`, `sphere_t()`, `dither()`, and `outline()` helpers referenced below
> ship in the procedural starter `assets/anim_starter.py` inside the **pixel-art-animation**
> skill. They are a convenient reference implementation of this craft; the principles here are
> tool-agnostic and apply whether you draw by hand, in Aseprite, or in code.

## Contents
1. [Color: build ramps, and hue-shift them](#1-color-build-ramps-and-hue-shift-them)
2. [Value, contrast & silhouette](#2-value-contrast--silhouette)
3. [One light source — and never pillow-shade](#3-one-light-source--and-never-pillow-shade)
4. [Anti-aliasing (manual, selective)](#4-anti-aliasing-manual-selective)
5. [Banding — the AA cousin mistake](#5-banding--the-aa-cousin-mistake)
6. [Clusters, jaggies & pixel-perfect lines](#6-clusters-jaggies--pixel-perfect-lines)
7. [Dithering](#7-dithering)
8. [Outlines & selective outlining (selout)](#8-outlines--selective-outlining-selout)
9. [Resolution & detail discipline](#9-resolution--detail-discipline)
10. [Common mistakes → fixes (quick table)](#10-common-mistakes--fixes)

---

## 1. Color: build ramps, and hue-shift them

A **ramp** is the set of shades for *one material*, darkest shadow → brightest highlight.
You design with ramps, not loose colors. The professional move that instantly lifts amateur
work is **hue shifting**: the hue rotates along the ramp instead of staying fixed.

- **Shadows go cool, highlights go warm.** Push dark steps toward blue/violet and light
  steps toward yellow/orange. This mimics real light (cool ambient fill, warm key) and
  makes the same number of colors look far more luminous than a flat light-to-dark of one
  hue (which reads muddy/plastic). SLYNYRD uses ~**20° of hue shift per step**; ~15–25°
  total across a small ramp is a good target.
- **Value rises** monotonically across the ramp; **don't start at pure black** unless you
  want it.
- **Saturation peaks in the MIDDLE** and eases off at both ends. **Never combine
  max-saturation with max-value** — that's the "eye-burning" neon look. Darks tolerate
  higher saturation than lights, so let the very lightest step desaturate toward white.
- **How many steps:** 3 (shadow/base/highlight) is the floor and is plenty for ~16–32px;
  use **4–5** for a 32px character, **5–7** for 64px. More steps ≠ better — each must be a
  clearly distinct value.
- **Keep the whole palette small and share ramps** between materials (a desaturated copy of
  one ramp covers neutrals/grays). A little color goes a long way.

The pixel-art-animation starter ships **`ramp(base, n)`** which does all of this from a
single mid-tone — cool-shifted shadows, warm-shifted highlights, mid-peaked saturation,
desaturated near white. Prefer a generated ramp over hand-listing hex codes:

```python
GREEN = ramp("#5c9c2e", 5)     # -> 5 hue-shifted steps, cool root .. warm tip
col   = lit(GREEN, t)          # t in [0,1] picks the shade
```

## 2. Value, contrast & silhouette

- **Value (light/dark) does most of the work** — more than hue. A piece reads in grayscale
  or it doesn't read at all.
- **Silhouette first.** The shape must be recognizable as a solid black blob. Design the
  silhouette before any interior detail; if it's unclear in silhouette, fix the shape, not
  the shading.
- **Even, deliberate contrast steps.** If two adjacent colors are too close they "blend
  together and get lost" (Derek Yu) and you wasted a palette slot; if every step is
  max-contrast it reads as noise. Aim for readable, roughly even jumps.

## 3. One light source — and never pillow-shade

- **Pick one light direction and hold it** across the whole sprite (upper-left is the
  convention, and what `sphere_t` in the starter assumes).
- **Shade the FORM, not the outline.** Light hits one side; the opposite side is in shadow.
- **Pillow shading is the #1 beginner tell:** shading concentrically from the outline
  *inward*, as if the viewer's eyeball is the light. It makes everything look flat, soft and
  lifeless. Cure it by thinking of the object as a 3D form lit from one side — for rounded
  forms the starter's `sphere_t` gives correct lambert form-light for free.

## 4. Anti-aliasing (manual, selective)

AA = placing **intermediate-value pixels** along a jaggy edge to smooth the staircase. In
pixel art it's **manual and selective**, never a global blur filter.

- **Match AA length to step length.** "The longer the segment, the longer the AA." A long
  straight run that steps once needs a longer smoothing strip; a 1px halftone dropped beside
  a long step looks worse than nothing.
- **Don't AA 45° diagonals or straight horizontal/vertical lines** — a clean 1px stair *is*
  the correct edge there; smoothing it just blurs it.
- **It depends on the background.** An AA pixel is a blend toward what's *behind* the edge,
  so edge AA only works against a known background; over a busy/variable background, skip it.
- **Each AA pixel must earn its place.** Overdone AA reads as **blur or noise**, not
  smoothness. Use fewer halftones/steps; if a pixel doesn't improve readability, delete it.

## 5. Banding — the AA cousin mistake

**Banding** is when several pixels of a value step line up in a parallel run that **echoes
the grid** and reads as an unintended hard line between two areas — it *interferes* with the
form instead of smoothing it (the opposite of what AA should do).

- **Align the gradient/AA direction to the slope:** a horizontal slope wants horizontal AA,
  a vertical slope wants vertical AA. Rotating the band direction to follow the form both
  kills banding and *is* the correct anti-alias.
- **Compress the bands** (especially on curved/spherical forms) and **vary run lengths** so
  no two equal-length runs sit parallel and adjacent.

## 6. Clusters, jaggies & pixel-perfect lines

How pixels group along an edge decides whether a line reads as clean or rough.

- **Jaggies** = stray single-pixel jutters and inconsistent runs that don't represent the
  intended curve. Build curves from runs whose lengths change **monotonically** (e.g.
  `4,3,2,2,1`), not erratically (`2,1,3,1,2`).
- **No "doubles" / orphan pixels.** Avoid a lone pixel breaking an otherwise clean run, and
  avoid isolated single pixels floating in space (reads as noise/dirt).
- **Avoid tangents** — two forms (or a form and the canvas edge) running exactly parallel and
  just touching; it flattens depth and snags the eye.
- **Chunky-pixel rule:** at small sizes don't draw **1px-thin appendages** (arms, legs,
  twigs, antennae). They look like cardboard cut-outs and flicker/disappear when animated —
  give them at least 2px of mass.

## 7. Dithering

Dithering interleaves **two colors in a pattern** to imply a third shade or a smooth
gradient *without spending a palette slot* — the classic way to stretch a tight palette and
the source of the retro look.

- **Use it for:** large gradient areas (skies, spheres), textures (rust, dirt, stone, dust),
  and the **transition between two ramp steps** so the step doesn't read as a hard line.
- **Keep it ordered/clustered, not random.** Scattered random dither = noise. A Bayer/
  checkerboard pattern reads as a tone. The starter's **`dither(x, y, t)`** is a Bayer-4×4
  test: pick the lighter of two colors when it returns `True` for coverage `t`.
- **Don't over-dither small sprites** — at 32–48px a couple of dithered transition pixels go
  a long way; a fully dithered sprite just looks busy.

## 8. Outlines & selective outlining (selout)

- **Solid outline** (the starter's `outline()` pass: dark pixels around the silhouette)
  gives a cohesive "sticker" read and pops the sprite off any background — great for game
  tiles/icons.
- **Selective outlining ("selout")** is the more refined option: instead of a uniform black
  ring, color each outline pixel as a **darker shade of the interior color it borders**, and
  **break/lighten** the outline where a lit edge meets a light background. The sprite then
  feels integrated and lit rather than stickered.
- **Broken outlines:** simply omitting the outline where a soft edge meets light space reads
  as a softer, more delicate form than a hard line everywhere.

Rule of thumb: solid outline for small game icons/tiles that must read on any background;
selout/broken for larger hero sprites or a softer, more painterly look.

## 9. Resolution & detail discipline

- **Work small and resist over-detailing.** Detail that doesn't survive at 1× is noise.
  Every pixel is a decision; if removing it doesn't hurt readability, it was clutter.
- **Author at a size that fits the detail you need.** 32px is cramped for anything matching a
  ~64–74px source; **48px (or 64px) is a good default** for headroom while staying clearly
  pixel art. Bump the canvas up before you start sacrificing the real, identifying details
  (comb, fins, veins, bark, kernels) — those are what make it readable.

## 10. Common mistakes → fixes

| Mistake | Why it's wrong | Fix |
|---|---|---|
| **Pillow shading** | shaded from outline inward → flat, lifeless | one light direction; shade the 3D form (`sphere_t`) |
| **Flat one-hue ramp** | muddy, plasticky | hue-shift: cool shadows, warm highlights (`ramp()`) |
| **Banding** | parallel equal runs echo the grid as a false line | align AA to the slope, compress/vary the bands |
| **Jaggies / orphan pixels** | erratic runs, lone pixels read as noise | monotonic run-lengths; no doubles or floaters |
| **Over-anti-aliasing** | blurs the sprite | fewer halftones; never AA 45°/straight; each px must earn it |
| **Too many similar colors** | shades blend, palette wasted | fewer colors, clear value steps between them |
| **Naive pure colors** | pure gray/primary looks fake | desaturate + hue-shift toward neighbors |
| **1px cardboard appendages** | thin limbs flicker/vanish, look flat | chunky-pixel rule: ≥2px of mass |
| **Random dithering** | noise | ordered Bayer/checker pattern, used sparingly |

---

### Sources
- SLYNYRD — *Pixelblog 1: Color Palettes* (hue shifting, ramps, ~20°/step):
  https://www.slynyrd.com/blog/2018/1/10/pixelblog-1-color-palettes
- Pedro Medeiros / Saint11 — *Anti-Alias and Banding*:
  https://saint11.art/pixel_art_articles/article5/ ·
  https://medium.com/pixel-grimoire/how-to-start-making-pixel-art-4-ff4bfcd2d085
- Derek Yu — *Pixel Art Tutorial: Common Mistakes* (pillow shading, color, chunky pixels):
  https://www.derekyu.com/makegames/pixelart2.html
- Pixel Parmesan — *Anti-Aliasing Fundamentals for Pixel Artists* (clusters, tangents,
  banding): https://pixelparmesan.com/blog/anti-aliasing-fundamentals-for-pixel-artists
- Pixel-Editor — *Color Theory for Pixel Art*:
  https://www.pixel-editor.com/articles/color-theory-for-pixel-art
