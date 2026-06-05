# Animation principles — animate like a pro

`motion-patterns.md` is the **how** (recipes for specific motions). This file is the **why**:
the professional principles that decide whether motion feels *alive and weighted* or stiff,
plus the pixel-specific techniques (sub-pixel animation, smears, color cycling, timing) that
working sprite artists rely on. Grounded in Disney's 12 principles (Thomas & Johnston, *The
Illusion of Life*) as adapted for sprites, and in the pixel-animation guides cited below.

The principles predate pixels by decades, but they're about **how the human eye reads
motion**, so they transfer directly. You won't use all twelve on a 48px tile — but knowing
which ones you're skipping is the difference between a stylistic choice and an accident.

## Contents
1. [The principles that matter most for sprites](#1-the-principles-that-matter-most-for-sprites)
2. [Timing & frame rate](#2-timing--frame-rate)
3. [Key-pose libraries (walk, idle, attack)](#3-key-pose-libraries)
4. [Pixel-specific techniques](#4-pixel-specific-techniques)
5. [Mapping principles → this skill's procedural helpers](#5-mapping-principles--this-skills-procedural-helpers)

---

## 1. The principles that matter most for sprites

Roughly in order of impact-per-effort on small game animation:

- **Anticipation** — *the most impactful and most commonly skipped.* Wind up before the
  action: crouch before a jump, pull the arm back before a punch, lift the head before a
  peck. Even **1–3 frames** of opposite-direction motion makes the action land. Skipping it
  is why amateur attacks feel weightless.
- **Squash & stretch** — deform to show weight and impact while **preserving volume** (as one
  axis shrinks the other grows; total area stays ~constant). Squash on landing/impact, stretch
  through fast travel. At pixel scale **even 1px of squash reads** — don't overdo it.
- **Follow-through & overlapping action** — loose appendages (hair, cape, tail, wattle,
  cloth) **lag the body and keep moving after it stops**; different parts start and settle at
  different times. This is the cantilever **tip-lag** idea (motion-patterns §1) applied to
  articulated parts: offset a secondary part by a frame or two behind the primary.
- **Slow in / slow out (easing)** — real motion **accelerates and decelerates**; frames
  bunch up at the extremes where it's slow and spread out through the fast middle. Drive
  values through an eased curve (`smooth()`), never a linear ramp — linear motion is the
  robotic "metronome" tell.
- **Arcs** — limbs, heads, thrown objects travel on **curved paths**, not straight lines.
  Make a peck or a swing trace an arc (move x *and* y together), not a vertical or horizontal
  slide.
- **Timing** — the **number of frames** *is* the weight and speed. Heavy/slow things use more
  frames or longer holds; snappy things use fewer. A **held frame** (a repeated pose) at an
  extreme adds a beat and sells weight or a pause.
- **Secondary action** — a subordinate motion supporting the main one (a blink during a peck,
  a tail flick on a footfall, ears bouncing on a hop). Adds life; keep it **clearly weaker**
  than the primary so it doesn't compete.
- **Exaggeration** — push poses past the literal. Tiny sprites have few pixels to communicate
  with, so **key poses must be exaggerated** to read at all; a "realistic" subtle pose just
  looks like nothing happened.
- **Staging / readability** — present **one clear action at a time** and keep the
  **silhouette legible** all the way through the motion. If the moving part disappears into
  the body's silhouette mid-action, the read is lost (see craft.md §2).
- **Straight-ahead vs pose-to-pose** — two workflows. **Pose-to-pose** (draw the key
  extremes, then the breakdowns between) gives control — use it for characters and any
  deliberate motion. **Straight-ahead** (draw frame after frame in sequence) gives organic
  unpredictability — use it for fire, water, smoke, sparks. Pros default to *pose-to-pose for
  characters, straight-ahead for effects*.
- **Appeal & solid drawing** — the design must be appealing and **hold its volume/perspective
  frame to frame** (don't let the form wobble or change size unintentionally). Appeal is a
  static-craft property too — see `pixel-art-craft.md`.

## 2. Timing & frame rate

- **Pixel-art standard is ~8–12 FPS.** "Animating on **twos**" (≈12fps, each drawing held for
  two 24fps ticks) is the norm — it balances smoothness against the work of drawing every
  frame, and it's what gives pixel animation its characteristic snap. Reserve **ones**
  (smoother, more frames) for fast effects or hero moments.
- **Keep loops short.** Idle **2–6** frames; walk/run **4–8**; attack **4–8** with a strong
  anticipation and a held impact. Fewer, well-chosen frames beat many mushy ones.
- **In this skill's procedural model:** effective FPS ≈ `1000 / DUR`; the loop is `N` frames
  long; loop length = `N * DUR` ms. `N≈16` at `DUR≈70–80ms` (~12–14fps) reads smooth and
  loops cleanly. Lower `N` / raise `DUR` for a snappier on-twos feel.

## 3. Key-pose libraries

Sketch these **extreme poses first** (pose-to-pose), then fill breakdowns.

**Walk cycle — 4 key poses** (then mirror for the opposite leg → 8):
1. **Contact** — legs at full stride, front heel and back toe down; body at mid height.
2. **Down / recoil** — weight-bearing leg compresses, **body at its lowest**; a touch of
   squash. This is where weight registers.
3. **Passing** — moving leg passes under the body, **body rising**; arms swap.
4. **Up / high-point** — push-off leg straightens, **body at its highest**.
Counter-rotate hips and shoulders, bob the head, and let arms swing opposite the legs.

**Idle / breathing — 2–4 frames:** chest/shoulders rise and fall, a **1px vertical bob**,
maybe a blink once per loop. The goal is that even the "still" state **breathes** — a layered
low-amplitude bob under everything (see the critter example in `anim_starter.py`).

**Attack — 4 phases:** **Anticipation** (wind-up, often a brief held frame) → **Action**
(fast, 1–2 frames, often a smear) → **Impact** (squash + a held frame to register the hit) →
**Recovery** (settle back with follow-through). The held frames around impact do the work.

## 4. Pixel-specific techniques

- **Sub-pixel animation (animate the anti-aliasing).** To move a small sprite a *small*
  distance, **don't move the sprite — move its colors.** On a tiny sprite a 1px positional
  jump is a huge, ugly pop; instead shift the **interior shading and edge AA** across frames
  so the motion reads as *less than one pixel* while the silhouette barely changes. Three
  flavors:
  - **Value/color tweening** (most common): blend an edge/interior pixel one step lighter or
    darker per frame to imply it's easing into a new position.
  - **Outline tweening:** bleed the outline into the next row/column over a couple of frames
    so a slow-moving form drifts smoothly instead of snapping.
  - **Smearing:** stretch/streak the moving part across the fast frame, leaving part of it
    behind, to stagger the motion over the gap.
  This is *the* technique that makes small sprites feel smooth and high-end.
- **Smear frames.** On the 1–2 fastest frames of a quick action, draw a **stretched/streaked
  ghost** of the moving part (pixel motion-blur), then snap to the next clean pose. Sells
  speed and impact with very few frames — a staple of attack and dash animations.
- **Color cycling (palette cycling).** Animate by **shifting palette indices, not pixels** —
  flowing water, waterfalls, fire, lava, sparkles, marquee lights, conveyor belts. It's cheap,
  loops perfectly, and is a uniquely pixel-art trick. In this skill's procedural model the
  equivalent is driving the `lit()`/`ramp` index off `phase` (the **pulse/glow** and **glint**
  patterns) instead of moving geometry.
- **Held frames** repeat a pose to add a beat — a pause at an extreme, a moment of impact —
  and are how you put weight and rhythm into a short loop.

## 5. Mapping principles → this skill's procedural helpers

| Principle / technique | Get it procedurally with |
|---|---|
| Anticipation | a small earlier `pulse01()` wind-up before the main action pulse (see `critter`) |
| Slow in / slow out | drive offsets through `smooth()` instead of a linear `t`; `pulse01()` is pre-eased |
| Follow-through / overlap | `cantilever()` tip-lag, or offset a secondary part's phase a beat behind the body |
| Arcs | drive a part's **x and y from the same phase** so its path curves, not slides |
| Squash & stretch | scale a `disc`'s rx/ry **inversely** over the cycle (volume-preserving) |
| Secondary action | layer a small independent overlay (blink, tail flick, sparkle) |
| Timing / on-twos | tune `N` and `DUR` (FPS ≈ 1000/DUR); add held frames by repeating a pose |
| Sub-pixel animation | tween the `lit()` `t` / edge color across frames instead of moving `put()` coords |
| Color cycling | phase-driven `lit()` / `ramp` index (pulse, glow, glint) — no geometry moves |
| Exaggeration | push key-pose amplitudes past literal so they read at 32–48px |

---

### Sources
- The 12 principles, adapted for sprites:
  https://www.sprite-ai.art/guides/animation-principles ·
  Penusbmic — *12 Principles of Animation Applied to Pixels*:
  https://penusbmic.itch.io/pixel-art-tutorial-12-principles-of-animation-applied-to-pixels
- Sprite animation fundamentals (FPS, on-twos, walk cycles, timing):
  https://www.pixel-editor.com/articles/sprite-animation-fundamentals ·
  https://pixnote.net/en/learn/animation/
- Sub-pixel animation:
  https://2dwillneverdie.com/tutorial/give-your-sprites-depth-with-sub-pixel-animation/ ·
  https://tinywarriorgames.com/2019/01/04/game-development-pixel-art-sub-pixel-animation/
