# Learning resources — curated pixel-art & animation references

A short, **verified** reading list for the two halves of this skill pair: **static craft**
(palette, light, shading, anti-aliasing, banding, dithering → the **pixel-art-craft** skill) and
**motion** (the 12 principles, frame timing, animating sprites → the **pixel-art-animation**
skill, including `animation-principles.md`, `motion-patterns.md`, and `physics-of-motion.md`).

This is a *curated* list, not a link dump — each entry says who it's by, what it's best for, and
**which of our skills it supports**. Every URL below was checked to resolve to the named resource
(see "Verification" at the bottom). Where a canonical link couldn't be pinned down, the entry says
"search for …" instead of guessing a URL.

> **Books are paid; most web resources are free.** The two books are the canonical theory; the
> web creators are where you learn pixel-specific execution. Lospec aggregates hundreds more
> tutorials if you need a topic not covered here.

---

## Static craft (palette, light, shading, AA, dithering)
*Supports the **pixel-art-craft** skill — get a sprite looking professional standing still.*

### Pedro Medeiros — "Saint11" Pixel Art Tutorials *(free)*
- **By:** Pedro Medeiros (artist on *Celeste*, *TowerFall*).
- **Best for:** 70+ bite-size, single-image tutorials on the fundamentals — outlines, shading,
  color, textures (wood, metal, foliage), selective detail. The fastest "show me the move"
  reference for a specific technique. Includes a pixel-art **glossary**.
- **Supports:** pixel-art-craft (primary); a few cover animation basics.
- **URL:** https://saint11.art/blog/pixel-art-tutorials/ · glossary:
  https://saint11.art/blog/glossary/

### SLYNYRD — Pixelblog *(free)*
- **By:** Raymond Schlitter.
- **Best for:** deep, structured essays on **color palettes** and **light & shadow** — the two
  levers that most decide whether pixel art reads as crafted or flat. Also strong on graphical
  projection (iso/topdown) and tilesets. Longer-form than Saint11; read these to understand
  *why*, not just *how*.
- **Supports:** pixel-art-craft (palette/light/shading); also animation (see below).
- **URL (catalogue):** https://www.slynyrd.com/pixelblog-catalogue ·
  *Pixelblog 1 — Color Palettes:*
  https://www.slynyrd.com/blog/2018/1/10/pixelblog-1-color-palettes ·
  *Pixelblog 6 — Light and Shadow:*
  https://www.slynyrd.com/blog/2018/6/15/pixelblog-6-light-and-shadow

### Pixel Parmesan — craft articles *(free)*
- **By:** Jenna ("Pixel Parmesan").
- **Best for:** clear, opinionated articles on **dithering** and **banding** (when to use them,
  when *not* to) and other craft pitfalls. The dithering article in particular is a go-to for
  understanding transitional vs textural dithering.
- **Supports:** pixel-art-craft (dithering, banding, AA).
- **URL (dithering):** https://pixelparmesan.com/blog/dithering-for-pixel-artists ·
  site: https://pixelparmesan.com/

### Brandon James Greer (BJG) — pixel-art workflow *(free, YouTube)*
- **By:** Brandon James Greer.
- **Best for:** **workflow and design-decision** videos on small canvases — color choices,
  readability/silhouette, top-down style, concept-to-completion timelapses. Excellent for seeing
  *how a pro sequences decisions*, not just the end result.
- **Supports:** pixel-art-craft (primary); his small-sprite animation videos support animation.
- **URL:** https://www.youtube.com/@BJGpixel

---

## Animation (principles, timing, animating sprites)
*Supports the **pixel-art-animation** skill — the 12 principles, frame timing, and motion.*

### Frank Thomas & Ollie Johnston — *The Illusion of Life: Disney Animation* *(book)*
- **By:** Frank Thomas & Ollie Johnston (Disney's "Nine Old Men"), 1981.
- **Best for:** the **origin of the 12 principles of animation** — the canonical source our
  `animation-principles.md` is built on. The definitive *why* behind anticipation, squash &
  stretch, follow-through, slow-in/out, arcs, timing, secondary action, exaggeration, staging.
- **Supports:** pixel-art-animation (foundational theory).
- **Reference:** https://en.wikipedia.org/wiki/Disney_Animation:_The_Illusion_of_Life
  (overview, editions, ISBN). *Search for the book by title to buy; there is no free official
  full text.*

### Richard Williams — *The Animator's Survival Kit* *(book)*
- **By:** Richard Williams (Director of Animation, *Who Framed Roger Rabbit*).
- **Best for:** the working animator's manual — **timing, spacing, easing, arcs, and walk/run
  cycles** taught with hundreds of drawings. The most practical companion to *Illusion of Life*;
  this is where timing-and-spacing intuition comes from.
- **Supports:** pixel-art-animation (timing, spacing, cycles — directly informs §2 of
  `animation-principles.md`).
- **Reference:** https://en.wikipedia.org/wiki/The_Animator%27s_Survival_Kit · official site:
  http://www.theanimatorssurvivalkit.com/ . *Search for the book by title to buy.*

### AdamCYounis — Pixel Art Class *(free, YouTube)*
- **By:** Adam C. Younis.
- **Best for:** long-form lessons and streams covering **both** pixel-art theory and execution,
  with strong episodes on **animation** (e.g. making art worth animating, small-sprite motion).
  Good for watching a whole piece animated end-to-end with reasoning.
- **Supports:** pixel-art-animation (primary) and pixel-art-craft.
- **URL (channel):** https://www.youtube.com/adamcyounis ·
  *Pixel Art Class playlist:*
  https://www.youtube.com/playlist?list=PLLdxW--S_0h4dlWUpl-TzBp-ulqK3NiM_

### SLYNYRD — Pixelblog 8: Intro to Animation *(free)*
- **By:** Raymond Schlitter.
- **Best for:** pixel-specific animation guidance — strong **keyframes**, frame counts (the
  8-frame walk sweet spot), and the key insight our `physics-of-motion.md` leans on: use
  **variable / bouncing motion, not a constant sine wave** (constant sine reads robotic).
- **Supports:** pixel-art-animation (keyframes, timing, easing).
- **URL:** https://www.slynyrd.com/blog/2018/8/19/pixelblog-8-intro-to-animation

### Penusbmic — 12 Principles of Animation Applied to Pixels *(paid, itch.io)*
- **By:** Penusbmic.
- **Best for:** the 12 principles demonstrated **directly on pixel sprites** (staging & arcs,
  pose-to-pose / slow-in-out, squash & stretch, …). The most on-target bridge from Disney theory
  to actual sprite frames; already cited in `animation-principles.md`.
- **Supports:** pixel-art-animation (the principles, in pixels).
- **URL:** https://penusbmic.itch.io/pixel-art-tutorial-12-principles-of-animation-applied-to-pixels

---

## Palettes & tools (aggregators, glossary, palette DB)

### Lospec — palette database + tutorial aggregator *(free)*
- **By:** Lospec (community platform).
- **Best for:** the largest **palette database** (the Palette List — download any palette in
  multiple formats) and the largest **collection of pixel-art tutorials** (500+, searchable by
  topic/author). Your first stop for a ready-made limited palette and for finding a tutorial on
  any niche topic this list doesn't cover. Also has a "Where to start" primer.
- **Supports:** both skills — palettes feed pixel-art-craft; the tutorial index feeds both.
- **URL (home):** https://lospec.com/ · *Palette List:* https://lospec.com/palette-list ·
  *Tutorials:* https://lospec.com/pixel-art-tutorials · *Where to start:*
  https://lospec.com/pixel-art-where-to-start

---

## How to use this list

- **New to pixel art?** Lospec "Where to start" → Saint11 tutorials → BJG videos for workflow.
- **Art looks flat / muddy?** SLYNYRD Pixelblog 1 (palettes) & 6 (light) → Pixel Parmesan
  (dithering/banding). (All pixel-art-craft.)
- **Animation looks mechanical / "just sliding"?** Read this skill's `physics-of-motion.md` and
  `animation-principles.md` first; then *Animator's Survival Kit* (timing/spacing), SLYNYRD
  Pixelblog 8, and Penusbmic (principles on pixels).
- **Need the theory?** *The Illusion of Life* (the 12 principles) + *The Animator's Survival Kit*
  (timing/spacing) are the two canonical books.

---

### Verification

Each link above was checked via web search to confirm it resolves to the named resource by the
named author (June 2026):

- **Confirmed live, exact page:** Saint11 tutorials & glossary; SLYNYRD catalogue, Pixelblog 1,
  6, and 8; Pixel Parmesan dithering article & site; BJG YouTube channel; AdamCYounis channel &
  Pixel Art Class playlist; Penusbmic itch.io tutorial; Lospec home, Palette List, tutorials, and
  "Where to start".
- **Confirmed via reference page (book — no free official full text):** *The Illusion of Life:
  Disney Animation* and *The Animator's Survival Kit* are linked to their Wikipedia / official
  pages for provenance and ISBN; buy via any bookseller (search by title). These are deliberately
  **not** linked to a download — no pirated full-text link is provided.

If any link rots, search the resource name + author rather than trusting a stale URL.
