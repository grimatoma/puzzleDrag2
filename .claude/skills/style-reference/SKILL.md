---
name: style-reference
description: >-
  Use when you need to build/define the STYLE REFERENCE that the sprite-pipeline scores against —
  turning a few user-provided sample assets into the cohesion anchor. Triggers: "build/define a
  style reference", "make a style guide / style sheet from these sprites", "extract a palette / a
  style spec from these tiles", "establish or lock the art style for the sprite pipeline", "ingest a
  sprite sheet of keyframes/animations to define the look", or "where is the base style defined / how
  is icon style kept consistent". Reach for it whenever the deliverable is the reusable look contract
  (a reference sheet image + prose style doc + machine-readable `_style-spec.json`) distilled from 2-4
  hero exemplars, not the sprites themselves.
---

# Style reference — turn sample art into the sprite-pipeline's cohesion anchor

**This is where the base style is *defined*.** The [`sprite-pipeline`](../sprite-pipeline/SKILL.md)
mass-produces a cohesive family of game tiles; its single source of truth for "what does on-style
look like" is a small set of **style-reference artifacts** that live beside the assets. This skill is
the **front door** that builds them from a handful of samples the user provides once.

You hand it **2–4 "hero" exemplars** (+ optional animation sheets and a locked palette + a short
art-direction note); it produces the **three durable artifacts** the pipeline consumes:

| Artifact | What it is | Who reads it |
|----------|------------|--------------|
| `<assets>/_style-reference.png` | the consolidated **reference sheet** — exemplars + a palette swatch row + labels, in one image | a human, at a glance |
| `<assets>/_style-reference.md` | the **prose style doc** — the look in words (palette ramps, light, outline, shadow, perspective, fps) | onboarding + review |
| `<assets>/_style-spec.json` | the **machine contract** — every field the gates score against | the pipeline (generation + G1/G2 critique) |

For this game, `<assets>` = `godot/assets/tiles/v2/`.

> **How is the icon style kept consistent? (the question this skill answers.)** Consistency is
> **enforced downstream, anchored here.** Every generated still and animation is scored field-by-field
> against `_style-spec.json` at the sprite-pipeline's **G1/G2** gates (palette adherence, light
> direction, outline rule, silhouette, frame count, fps). A miss on a locked field — off-palette
> color, wrong light — is a *reject*, not a style choice. And each new family is seeded with `priors`
> (the closest shipped siblings) so it inherits the look by construction. The **locked palette ramps
> are the #1 cohesion lever**: one shared ramp set makes disparate subjects read as one set even when
> their silhouettes differ.

## Inputs — what the user provides

Only the exemplars + palette + art-direction note are needed to bootstrap; the animation sheet and a
good/bad pair sharpen the defaults and the critique. The **full field list and how each is extracted**
lives in the sprite-pipeline's
[`references/reference-assets-spec.md`](../sprite-pipeline/references/reference-assets-spec.md) — read
that rather than re-deriving it; this skill is just the build step.

| # | Input | How to provide it |
|---|-------|-------------------|
| 1 | **2–4 hero exemplars** at target resolution, ordered **simple → detailed** | individual transparent `.png`s, OR a sprite **sheet** (one PNG, a grid of frames) with its `frame:[w,h]` + `grid:[cols,rows]` |
| 2 | **A locked palette** | a `.gpl`/`.hex` file, **or** `"auto"` to quantize the ramps straight out of the exemplars |
| 3 | *(optional)* **≥1 animation exemplar** | a sprite sheet of frames, or a folder/strip of `NN.png` frames — laid out as one motion row so the cadence reads |
| 4 | **Art-direction note** — light dir, outline rule, shadow, perspective, dither, mood | one or two sentences (the `--notes` / manifest `notes`); captures what a palette **can't** encode |
| 5 | *(optional)* one **on-style + one off-style** pair | sharpens the gate's reject decisions; record it in the prose doc |

**Why simple → detailed matters:** the simplest exemplar sets the detail *floor* the set tolerates;
the most detailed sets the *ceiling*. Generated art that drifts below the floor (too plain) or above
the ceiling (busier than the family) is what the critique flags.

**For an existing game, you provide nothing new** — the shipped tiles *are* the reference set. Point
the manifest at 2–4 of the strongest existing tiles and extract the palette from them.

## Process

1. **Collect exemplars.** Gather the hero PNGs and any animation samples. If a sample is a sprite
   **sheet** (a grid of frames in one PNG), you don't slice it by hand — the build script does, given
   the cell `frame` and `grid`.
2. **Write a manifest.** Copy `assets/manifest.template.json` and fill it in: a `title`, a one-line
   `notes` (the art-direction statement), a `palette` (`"auto"` or a path), and the `exemplars` list
   (single images, sheets, and/or frame strips). `assets/manifest.hearth.json` is the worked example
   for this repo.
3. **Build the reference sheet.** Run the script (below). It composites the exemplars over a checker
   board, lays animation frames in a row, adds the palette swatch row + labels + a footer, and writes
   one PNG. **`Read` the produced PNG** to confirm it's legible (exemplars, labels, swatches) before
   moving on.
4. **Extract / confirm the palette + canvas.** If you used `"auto"`, the swatch row shows the
   quantized dominant colors; promote those into **named, locked ramps** in `_style-spec.json`
   `palette.ramps[]` (use the Aseprite MCP `analyze_palette_harmonies` / `get_palette` to group them
   and read the hue-shift). Confirm the canvas size + safe area.
5. **Transcribe the art-direction note** into the spec fields a palette can't encode — `light.*`,
   `outline.*`, `shadow.*`, `perspective`, `dither.*`, `animation.*`.
6. **Write the spec + prose doc.** Fill/update `_style-spec.json` (the schema is documented in
   `reference-assets-spec.md`) and write `_style-reference.md` as a plain-English reading of the spec
   — **transcribe the spec's numbers, never invent them.**
7. **Hand off to the sprite-pipeline.** The pipeline points at the spec via `pipeline.json`
   `settings.styleSpec`. From here the [`sprite-pipeline`](../sprite-pipeline/SKILL.md) skill takes
   over (Stage 0 reads exactly these artifacts).

## Build the reference sheet

`scripts/build_reference_sheet.py` (Pillow-only, deterministic, no AI/network) builds the
consolidated `_style-reference.png` from a manifest:

```bash
# from a manifest (recommended)
python scripts/build_reference_sheet.py \
  --manifest assets/manifest.hearth.json \
  --out godot/assets/tiles/v2/_style-reference.png

# quick ad-hoc sheet from positional images (auto labels, auto palette)
python scripts/build_reference_sheet.py a.png b.png c.png --out sheet.png --title "ad-hoc"
```

Useful flags: `--palette auto|<path.gpl/.hex>` (swatch row source; overrides the manifest),
`--title` / `--notes` (override the manifest text), `--scale N` (integer upscale per cell; default
auto-picks so a cell lands ~112 px). Run `--help` for the full list, and see the **module docstring**
for the manifest format with inline examples.

A **manifest entry** is one of:
- **single image** — `{ "src": "tile.png", "label": "..." }`
- **sheet** — `{ "src": "sheet.png", "label": "...", "frame": [w,h], "grid": [cols,rows], "cells": [..] }`
  (`cells` is optional 0-based row-major indices to thin a long strip)
- **frame strip** — `{ "frames": ["00.png","04.png","07.png"], "label": "..." }` (laid out as one row)

Paths in a manifest resolve **relative to the manifest file**. Missing files, a too-big grid, or bad
JSON each fail with a clear stderr message (exit 2).

## Outputs

Written under `<assets>/` (= `godot/assets/tiles/v2/` for this game):

- `_style-reference.png` — the sheet (built by the script).
- `_style-reference.md` — the prose style doc (written by hand from the spec).
- `_style-spec.json` — the machine contract (the schema lives in `reference-assets-spec.md`).

These are **committed deliverables** — this directory is **not** gitignored (only `pixelGen/` is).
Confirm with `git check-ignore <path>` returning nothing before treating them as throwaway.

## How it enforces consistency (longer answer)

- **The locked palette ramps are the strongest single lever.** A shared, hue-shifted ramp set
  (cool-shifted shadows, warm-shifted highlights) makes a tree, a crop, and a rock read as one family.
  Prefer named ramps in `palette.ramps[]` over an ad-hoc swatch dump.
- **The sheet + spec are the single contract.** Generation targets the spec's canvas/ramps/light/
  outline/perspective; the G1/G2 gates score each still against the same fields. One source of truth,
  two consumers.
- **New materials extend the palette, they don't break it.** When a new subject needs a hue the locked
  ramps don't cover, use the **sanctioned ramp-extension move**: sample the closest shipped sibling's
  midtone, hue-shift the dark/light steps by the spec's shift degrees, **append the new named ramp to
  `palette.ramps[]`, and lock it** before generating. (The `pumpkin-orange` ramp was added this way.)
  Full recipe: `reference-assets-spec.md` §"Extending the palette".

## Related skills

- **[`sprite-pipeline`](../sprite-pipeline/SKILL.md)** — consumes these artifacts; this skill is its
  Stage 0 front door. Its `references/reference-assets-spec.md` is the authoritative field reference.
- **[`pixel-art-craft`](../pixel-art-craft/SKILL.md)** — the still-image rubric (palette, hue-shifted
  ramps, light, anti-aliasing, outlines) behind the spec fields and the G1/G2 critique.

## When to read (bundled files)

| File | Read it when |
|------|--------------|
| `scripts/build_reference_sheet.py` (module docstring) | building the sheet — the manifest format + every flag, with inline examples |
| `assets/manifest.template.json` | starting a new project — copy and fill in (shows single-image, sheet, and frame-strip entries) |
| `assets/manifest.hearth.json` | the worked example — the live Hearth reference set that generated `godot/assets/tiles/v2/_style-reference.png` |
| `../sprite-pipeline/references/reference-assets-spec.md` | the **authoritative** spec field list + extraction tools + the ramp-extension move — don't duplicate it here |
