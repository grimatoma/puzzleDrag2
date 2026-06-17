---
name: art-direction-eval
description: >-
  Evaluate, compare, and propose ART-STYLE / VISUAL DIRECTIONS for puzzleDrag2 — and produce the
  concept board that lets a human choose. Use whenever the user wants to pick or judge an art style /
  art direction / "look" for the game, weigh a few candidate aesthetics against each other, ask "which
  style should we go with", "make a version of this style", "a brighter / cheerier / darker / more
  premium version", "another concept like X", "is this readable on mobile", or "suggest more art
  directions". Covers the mobile-first scoring rubric (board glance-parse readability, cohesion with the
  existing 128px seasonal pipeline, production cost/consistency, market differentiation, premium "wow"),
  the hard MOBILE-READABILITY GATE every direction must pass, the apples-to-apples PixelLab test-set
  method (same cottage/villager/tree/barrel across every candidate), how to assemble the comparison board
  (docs/art-style-board/ + docs/art-style-board-r2/), the bright-vs-moody prompt levers, and a catalog of
  directions already explored plus fresh ones to propose. For GENERATING a tile's seasonal art use
  seasonal-tile-pipeline; for static PIXEL CRAFT use pixel-art-craft; for MOTION use pixel-art-animation;
  this skill is about CHOOSING and PITCHING the overall direction.
---

# Art Direction Evaluation

Pick the game's look the way a studio would: define a few honest candidates, render the **same subjects**
in each so the comparison is real, judge them **mobile-first**, and present a board a human can decide
from. puzzleDrag2 is a cozy **drag-puzzle + village builder** played mostly on phones — so "looks amazing
on a 27-inch monitor" is necessary but not sufficient. The deliverable is almost always an HTML concept
board, not a paragraph of opinion.

## The one constraint that outranks the others

**The board must parse in a glance on a phone; the village can be lavish.** The fast-moving puzzle board
needs ~200–400 ms tile recognition under sunlight and OLED auto-dimming; the slow village/menu views
welcome rich detail. So every direction is split into two budgets:

- **Board layer** — strict: silhouette + value + hue redundancy, one outline rule, a raised value floor,
  no bloom/glow/fog over the play area.
- **Village/background layer** — generous: this is where storybook dressing, glow, particles, tilt-shift,
  and painterly texture live.

A direction lives or dies on whether its *board* layer survives the mobile gate below — not on how
gorgeous its hero buildings are.

## The hard gate — mobile readability (a direction that fails any of these is disqualified for the board)

1. **Silhouette-first** — each tile is identifiable as a single flat-filled shape. If the outline alone
   doesn't say what it is, simplify; don't add detail.
2. **Triple-redundant identity** — every tile differs from every other by SHAPE + VALUE + HUE at once,
   never hue alone (survives ~8% colour-blindness, sunlight wash-out, OLED dimming).
3. **One outline rule, never mixed** — a consistent 1px-equivalent dark outline (or one consistent
   selout) so every tile pops off the board identically.
4. **Value-layered with a raised floor** — dark-ish board base → distinct mid-value tile bodies → a small
   set of bright accents; aim **7:1+** contrast on glance-read tiles (well above the 4.5:1 web floor).
5. **Author at 128px, judge at device size** — integer-scale to the cell; review at true on-phone
   footprint and arm's length, NEVER at 800% editor zoom.
6. **Grayscale + deuteranopia squint test** on a real device-size screenshot: if two tiles blur together
   or vanish, push values apart — do not add interior detail.
7. **Quarantine atmosphere** — bloom, glow, fog, particles, tilt-shift, lavish dressing live in the
   village/background ONLY, never over the play area.
8. **Touch + sunlight floor** — targets ≥ 44–48 dp; the held tile and valid drop targets must read
   instantly mid-drag, outdoors at max brightness.

## The scoring rubric (score each candidate 1–5; readability is a gate, not just a score)

| Axis | Weight | 5 = | 1 = |
|---|---|---|---|
| **Mobile board readability** | ×3 (gate) | passes all 8 gate items effortlessly | needs heavy compromise to be legible |
| **Cohesion with what exists** | ×2 | drop-in for the 128px seasonal pipeline & current warm tiles | requires re-authoring the whole library |
| **Production cost / consistency** | ×2 | one disciplined recipe scales the whole game cheaply | every asset is a bespoke painting; drifts easily |
| **Market differentiation** | ×2 | unmistakably not-a-Stardew-clone from the thumbnail | generic cozy-pixel, seen-before |
| **Premium "wow" / store appeal** | ×1 | screenshots sell the game | flat, forgettable |
| **Fit with game pillars (cozy, warm, inviting)** | ×1 | feels like a hug | cold / sad / off-brand |

Weighted total ranks them; but a direction that fails the readability gate is flagged **"board needs a
calmer variant"** regardless of total — it can still win as a *village/hero* style.

## Workflow — evaluating a set of candidate directions

1. **Name the DNA, don't hand-wave.** For each candidate write: light (key direction + colour temp +
   shadow floor), palette, outline rule, shading depth, mood, and the single biggest mobile risk + its
   mitigation. Vague pitches produce vague art.
2. **Generate an apples-to-apples test set with PixelLab.** Same four subjects in every candidate so the
   comparison is honest: **cottage** (building), **villager** (character), **tree** (prop), **barrel**
   (item). Use `create_map_object`, `view: side`, basic mode (needs width/height). Rate limit is **~5
   concurrent creates** — fire in batches of ≤5, poll `get_map_object`, then download the no-auth URL.
   Villager/figure jobs run much slower (~7 min) than buildings/props — front-load them.
3. **VIEW every sprite and QA it yourself** — don't trust a subagent's "looks good"; art judgement needs
   eyes on the pixels. Regenerate duds.
4. **Assemble a board** (see `docs/art-style-board-r2/index.html` for the template): a compare strip, one
   tab per direction with a composed scene + asset chips + palette + pitch + style-spec + a
   **mobile-readability callout** + the PixelLab recipe + reference touchstones, then a shared mobile
   checklist and a "more directions" section. Reference games are **inspiration touchstones only** —
   never reproduce third-party art; link by name.
5. **Run the gate** on the board screenshot (grayscale + squint at device size). Score with the rubric.
6. **Recommend, don't just survey** — name a baseline, an aspirational/hero style, and the bold bet.

## PixelLab prompt levers (the ones that actually move the look)

- **Knobs:** `outline` (single color / selective / lineless) · `shading` (flat→detailed) · `detail`
  (low→high) · `size` (generate at 128 for the modern-pixel fidelity these looks need).
- **Bright / cheery / daytime** = *invert the moody HD-2D default*: prompt "bright midday, clear blue
  sky, high-key, **luminous soft blue-tinted shadows not black**, crisp sharp pixels, in focus" and
  negate "no vignette, no heavy bloom, no night, not gloomy". The biggest single lever is the **raised
  shadow floor** (no true black) — it's the one the model most often ignores.
- **Moody / premium / magical** = "cinematic, atmospheric, warm lantern light, soft bloom, jewel-tone".
- **Glow is a POST-PROCESS, never a prompt word.** Asking the model for "glow/bright/brightness"
  overshoots to a white-out (the repo's documented glint→white-flash gotcha). Generate the sprite
  neutral, add a blurred additive halo in compositing.
- **One baked key light across the whole set** ("lit from upper-left by warm sun, cool shadow lower-right")
  is what makes flat sprites read as one diorama instead of a grid of stickers.

## Directions already explored (don't re-propose as new)

- **Round 1** (`docs/art-style-board/index.html`): Cozy Cottagecore · Storybook HD-2D · Bold Cartoon ·
  Retro 16-Bit · Muted Painterly.
- **Round 2** (`docs/art-style-board-r2/index.html`): Cozy Storybook (★ recommended hybrid) · Cheery
  Storybook · Lush Fantasy HD-2D · Bright HD-2D.

## Fresh directions worth proposing (with mobile-readability notes)

- **Isometric Toy Diorama** — village + board as a tabletop miniature; chunky 32px iso tiles, baked
  contact shadows. *Proof:* Viladia (shipping iOS cozy pixel village). Med risk — keep tiles big.
- **Gouache-Textured Storybook** — clean pixel base + a paper-grain overlay (~30–50% soft-light) + cool
  hue-shifted shadow ramps. Lowest risk; closest to the Cozy/Cheery hybrid. Grain must read as a
  gradient at game size, not noise — add as a post-overlay.
- **Soft "Marshmallow" 3D-Toy** — rounded matte blobby forms, soft AO, pastel-but-contrasty. *Proof:*
  Tiny Glade. Med risk — force value separation so pastels don't go low-contrast.
- **Risograph / Limited-Ink** — the whole game in 2–4 misregistered ink channels + grain; obviously
  not-Stardew from the thumbnail. High distinctiveness-per-effort; composite the channels in post.
- **Cozy-with-an-Edge (folklore dusk)** — a *content + signature time-of-day* hook bolted onto any base;
  cheap differentiation. Keep the dusk in the village; the board keeps its daytime sub-palette.

## Related skills & where things live

- Concept boards: `docs/art-style-board/` (Round 1) · `docs/art-style-board-r2/` (Round 2).
- HTML board craft → **html-docs**. Generating a tile's full seasonal set → **seasonal-tile-pipeline**.
- Static pixel craft (palette/shading/AA) → **pixel-art-craft**. Motion → **pixel-art-animation**.
- Driving PixelLab (async job model, consistency, review/select) → **pixellab**.
- Engine path for baked tiles is `src/textures/seasonal/` + `public/seasonal-tiles/<tileKey>/`; a chosen
  direction isn't "done" until it's wired there and verified in-game.
