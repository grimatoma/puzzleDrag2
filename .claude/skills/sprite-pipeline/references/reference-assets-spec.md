# Reference assets & the style spec

The pipeline's look is **not** hard-coded — it is parameterized by a small set of
**reference assets** the user supplies once per project. From those references the pipeline
derives a machine-readable **style spec** (`assets/style-spec.template.json` is the blank
template; the project copy lives at `<assets>/_style-spec.json`). The style spec is the
**cohesion anchor**: every generated still and every animation is scored against it by the
critique gates, so the whole growable set stays on-model.

This doc has two parts:

1. **What reference assets to provide** — the inputs that define a look.
2. **The style spec it produces** — every field, and how it is extracted.

> For an **existing game**, you usually provide nothing new: the **already-shipped tiles are
> the reference set**. Point `references` at 2–4 of the strongest existing tiles, extract the
> palette from them, and the style spec falls out of the art you already have.

---

## 1. What reference assets to provide

These are the durable inputs a user hands the pipeline to lock a target look. Only #1, #2 and
#4 are strictly required to bootstrap; #3 sharpens animation defaults and #5 sharpens critique.

| # | Reference | Why | Format |
|---|-----------|-----|--------|
| 1 | **2–4 "hero" exemplars** at the target resolution, ordered simple → detailed | Anchors detail density, shading approach, silhouette read, and outline treatment — the look the whole set imitates | `.aseprite` / transparent `.png` |
| 2 | **A locked palette** (or extracted from #1) | The **#1 cohesion lever** — one ramp set shared across everything keeps the group unmistakably one family | Lospec `.gpl` / `.hex`, or an `.aseprite` whose palette is the source of truth |
| 3 | **≥1 animation exemplar** — a short loop in the target motion style | Sets the default frame count, FPS, motion amplitude, and easing / "on-twos" cadence | `.gif` / sprite sheet |
| 4 | **Art-direction statement + small spec** — dims, safe area, light direction, outline rule, shadow style, perspective, background, dither policy, mood | Captures the rules a palette **can't** encode (geometry, lighting, framing, vibe) | short `.md` |
| 5 | *(optional)* **one on-style + one off-style pair** | Gives the critique a concrete "good vs bad" contrast, sharpening reject decisions at the gates | two `.png` |

**Ordering #1 simple → detailed matters.** The simplest exemplar shows the floor of detail the
set tolerates; the most detailed shows the ceiling. Generated art that drifts below the floor
(too plain) or above the ceiling (busier than the family) is what the critique flags.

**The palette (#2) is the strongest single lever.** A shared, locked ramp set makes disparate
subjects read as one cohesive set even when silhouettes differ. Prefer hue-shifted ramps —
cool/blue-shifted shadows, warm/yellow-shifted highlights — rather than a fixed-hue value ramp;
that is what reads as crafted rather than plastic. If no palette file is supplied, extract one
from the hero exemplars (see below) and treat the extracted ramps as locked from then on.

**Extending the palette for a new material/hue (the sanctioned move).** A new subject often needs a
hue the locked ramps don't cover — a pumpkin needs ripe orange, a berry needs purple, none of which
may be in the shipped ramp set. **Don't generate off-palette and hope; add the ramp first, then
lock it.** The cohesion-preserving way:
1. Pick the **1–2 shipped sibling tiles** closest in material/hue (they become the item's `priors`
   too) — e.g. for a pumpkin, the shipped squash + carrot tiles.
2. `analyze_reference` / `get_palette` them and read the dominant hue's steps; **anchor the new
   ramp's midtone to a real sampled hex** from a sibling (e.g. pumpkin-orange mid `#c3671d` = the
   shipped carrot's lit step), then build the dark/light steps by the craft rules (cool-shift the
   shadows, warm-shift + desaturate the highlights — see the **pixel-art-craft** skill, §1).
3. **Append the new named ramp to `_style-spec.json` `palette.ramps[]`** and treat it as locked from
   then on. Now the new ramp is part of the contract: generation targets it and G2 scores against it,
   so the new member reads as family rather than a one-off. (This is how the `pumpkin-orange` ramp
   was added — sampled from squash/carrot, hue-shifted, then locked before any generation.)

---

## 2. The style spec it produces

The references above are distilled into `assets/style-spec.template.json`. Each generated asset
conforms to it, and the **critique gates score against it** — so every field below is both a
generation instruction and a review rubric line.

### Extraction tools

Palette and canvas facts are pulled from the references with the **Aseprite MCP** tools (these
are real tools; do not substitute invented ones):

- `analyze_reference` — reads an exemplar and reports its dimensions, palette, and broad style
  characteristics → seeds `canvas.*` and the initial `palette.ramps`.
- `get_palette` — returns the exact indexed palette of a `.aseprite` / palette file → the
  authoritative `palette.ramps` hex values.
- `analyze_palette_harmonies` — groups palette colors into harmonious ramps and surfaces the
  hue relationships → informs ramp grouping and the `shadowHueShiftDeg` / `highlightHueShiftDeg`
  values.

Fields the tools can't infer (light direction, outline rule, perspective, shadow style, dither
policy, mood) come from the **art-direction statement (#4)** and are transcribed into the spec by
hand. Animation fields are seeded from the **animation exemplar (#3)**.

### Field reference

| Field | Meaning | Derived from |
|-------|---------|--------------|
| `canvas.width` / `canvas.height` | The references' native dimensions in px (**90×90** = the game's source art). **Note:** the pipeline's actual output size is `pipeline.json` `settings.canvas` (32px tile), which **supersedes** this field — this records the reference resolution, not the build target. | #1 via `analyze_reference` |
| `canvas.safeArea` | Px inset kept clear of the edge so nothing important is clipped when composited on the board | #4 |
| `canvas.background` | Always `"transparent"` — tiles composite over the board | #4 |
| `palette.source` | Path to the palette file the ramps were taken from (provenance) | #2 |
| `palette.ramps[]` | The **locked color ramps**. Each is `{ name, hexes: [darkest → brightest] }`, one ramp per material. This is the cohesion anchor. | #2 via `get_palette` + `analyze_palette_harmonies` |
| `palette.shadowHueShiftDeg` | Degrees the hue rotates **cool/blue** at the dark end of each ramp (negative). ~−20° reads crafted | #2 via `analyze_palette_harmonies` |
| `palette.highlightHueShiftDeg` | Degrees the hue rotates **warm/yellow** at the bright end (positive). ~+20° | #2 via `analyze_palette_harmonies` |
| `light.direction` | Key-light direction, held across the whole set. Default `"upper-left"` | #4 |
| `light.elevationDeg` | How steep the key light is — affects shadow length and top-face brightness | #4 |
| `light.contrast` | Overall value spread (`low` / `medium` / `high`) | #4 |
| `outline.rule` | `"selective"` (outline only where it reads — the default), `"solid"` (full outline), or `"none"` | #1, #4 |
| `outline.color` | Outline hex when `rule` ≠ `none` (a dark near-black, not pure `#000000`) | #1, #4 |
| `shadow.type` | `"soft-drop"` (a blurred cast shadow) or `"contact"` (a tight grounding shadow) | #4 |
| `shadow.color` / `shadow.offset` / `shadow.blur` | Shadow tint (with alpha), pixel offset, and blur radius | #4 |
| `perspective` | Camera framing: `"flat"`, `"three-quarter-topdown"` (default for this board), or `"side"` | #4 |
| `dither.policy` | `"minimal"` (default), `"none"`, or `"selective"` — how much dithering is allowed for gradients/texture | #1, #4 |
| `animation.fps` | Reference/default playback rate. **Superseded by `pipeline.json` `settings.fps`** (and any per-item `fps` override), which is the actual playback rate the build uses. Default **10** | #3 |
| `animation.framesDefault` | Default frame count for an idle when an `animations[]` entry omits `frames`. Default **8** | #3 |
| `animation.cadence` | Motion pacing, typically `"on-twos"` (hold each drawn frame two display frames) | #3 |
| `animation.loop` | Whether idles loop seamlessly. Default `true` | #3 |
| `animation.idleAnimationName` | The animation/tag name used for the looping idle (default `"idle"`); also the SpriteFrames default tag | #4 |
| `references[]` | Paths back to the hero exemplars (#1) so the spec records what it was derived from and the critique can show them side-by-side | #1 |

### How the spec is used downstream

- **Generation** — keyframe prompts are issued with the spec's canvas size, palette ramps,
  light direction, outline/shadow/perspective rules baked in, so PixelLab output starts on-model.
- **Critique gates** — each generated still/animation is scored field-by-field against the spec
  (palette adherence, light direction, outline rule, silhouette read, frame count, fps). A miss
  on a locked field (e.g. off-palette colors, wrong light direction) is a reject.
- **Animation** — `animation.fps`, `cadence`, and `loop` set the Aseprite tag/timing defaults so
  every idle in the project plays at the same rate and loops cleanly.

The style spec is **per-project and stored alongside the assets** (referenced from the single
`pipeline.json` via `settings.styleSpec` — see `manifest-schema.md`). Edit it in source; it is the
single contract both generation and review agree on.

> **`pipeline.json` settings supersede the style spec for `canvas` + `fps`.** `settings.canvas`
> (the 32px tile size) and `settings.fps` in `pipeline.json` — plus any per-item `canvas`/`fps`
> override — are the pipeline defaults and **win** over the style spec's `canvas` / `animation.fps`.
> The style spec records the *reference* resolution and palette/light/outline contract; the build
> size and playback rate come from `pipeline.json`.
