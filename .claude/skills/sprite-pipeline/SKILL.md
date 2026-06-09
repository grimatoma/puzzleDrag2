---
name: sprite-pipeline
description: >-
  Use when generating or animating a cohesive SET of game sprites/tiles from reference assets
  plus a manifest — not a one-off sprite. Triggers: batch/mass-producing on-style pixel art with
  critique gates; building seasonal keyframes + per-keyframe idles + transitions for a tile family
  (the birch-style spring/summer/autumn/winter workflow); growing an existing set by filling only
  the missing variants while keeping the family cohesive; turning reference art into a reusable
  style contract other assets are scored against; or integrating animated tiles into a Godot v2
  SpriteFrames slot. Reach for it whenever the deliverable is a group of sprites that must look
  like one set, gap-filled and quality-gated, rather than a single hand-made image.
---

# Sprite pipeline — generate & animate a cohesive set, gap-filled and gated

A reusable pipeline for producing a **growable family** of game sprites/tiles on a locked look.
You hand it two durable inputs; it generates only what's **missing** and animates it, with **four
cheap critique gates bracketing the two expensive operations** so a bad asset is caught on paper,
not after you've spent generation credits and frame-by-frame effort.

This is the **orchestrator**. The craft and motion knowledge live in sibling skills it calls:
- **pixel-art-craft** — the still-image rubric (palette, hue-shifted ramps, light, anti-aliasing,
  outlines). Powers keyframe art and is the rubric for the **G1/G2** still critiques.
- **pixel-art-animation** — motion craft (arcs, follow-through, staggered release, the physics of
  falling/accumulation/settle). Owns the **storyboard** and the **G3/G4** motion critiques.
- **pixellab** — the async AI base-still generator (job → poll → download) used at **Stage 2**.

## The two inputs

1. **Reference assets → a style spec.** A small set of hero exemplars + a locked palette + an
   art-direction note, distilled once into `<assets>/_style-spec.json` (canvas, ramps, light,
   outline, project FPS). This is the **cohesion anchor**: every still and every animation is
   scored against it. For an existing game, the shipped tiles *are* the references. **When to
   read:** `references/reference-assets-spec.md` — what to provide and every spec field.
2. **A co-located set manifest (JSON).** One `manifest.json` per set, living beside its output,
   declaring the group's `keyframes` + per-keyframe `idles` + `transitions`. It is **idempotent**:
   re-running diffs declared ids against files on disk and builds only the gaps, feeding existing
   siblings in as **priors** so new members stay continuous. **When to read:**
   `references/manifest-schema.md` — the directory layout, gap-fill, and every field.

## The five stages

```
                 G1                    G2          G3                    G4
 references → 0 ──┐         ┌─ 2 ──────┐   3 ──────┐         ┌─ 4 ───────┐
 manifest   → 1 ─ critique  │ GENERATE │ critique  │ critique│ ANIMATE   │ critique → 5 → Godot
                  prompt    │ (PixelLab)│  still    │ storybd │ (Aseprite)│ montage         .tres
                            └──────────┘           └─────────┘           └───────────┘     + verify
```

| # | Stage | What happens | Tool |
|---|-------|--------------|------|
| **0** | Extract style spec | Read references; pull canvas + palette ramps + hue-shift; transcribe light/outline/perspective/fps. | Aseprite `analyze_reference` / `get_palette` / `analyze_palette_harmonies` |
| **1** | Plan the set | Diff manifest's `keyframes`/`idles`/`transitions` against files on disk; **only the gaps proceed**. Gather sibling priors. | — (read `manifest.json`) |
| **2** | Generate keyframe stills | For each missing keyframe, generate the base still; priors = sibling set assets for continuity. **Expensive.** | **PixelLab** (pixellab skill) or hand |
| **3** | Physics storyboard | For each idle/transition, fill `assets/storyboard.template.md`: frame count, fps, per-frame forces + pixel-level change. | pixel-art-animation skill |
| **4** | Animate | Execute the storyboard into per-frame PNGs + a preview GIF. **Expensive.** | **Aseprite only** (`references/aseprite-execution.md`) |
| **5** | Integrate & verify | Pack frames → v2 `.tres`; import; verify in-engine. | `scripts/assemble_tres.gd` + `references/godot-integration.md` |

## The four gates — cheap reviews bracket the expensive work

Generation (Stage 2) and animation (Stage 4) are the costly steps — credits and frame-by-frame
effort. A **critique gate sits on each side of each**, so a reject costs a prompt, not a build:

| Gate | Before/after | Critiques | Rubric from |
|------|--------------|-----------|-------------|
| **G1** | before generate | the **prompt** vs the style spec (subject, framing, palette intent) | pixel-art-craft |
| **G2** | after generate, before animate | the **still** vs the style spec (palette adherence, light dir, outline, silhouette) | pixel-art-craft |
| **G3** | before animate | the **storyboard** (forces named, arcs not slides, staggered, eased, loop closes) | pixel-art-animation |
| **G4** | after animate | a **montage** of the frames (does the shape re-form? tip lag? phases?) | pixel-art-animation |

G2 and G3 bracket the *generation→animation* boundary; G1 and G4 are the outer cheap checks. A miss
on a **locked** spec field (off-palette, wrong light) at G1/G2, or a "slide pretending to be motion"
at G3/G4, is a **reject** — fix and re-run that step only. **When to read** the actual gate prompts:
`assets/builder-prompt.md` (the per-asset build instruction) and `assets/critique-prompt.md` (the
scoring rubric) — *(created by the QA-loop task; see "Status" below)*.

## Tool routing (what executes what)

- **Base stills** — **PixelLab** (async: create → poll `get_*` → download; check credits first; do
  the object review→select step) **or** a hand-drawn/edited still. Never Pillow.
- **All animation** — **Aseprite**, via `mcp__plugin_pixel-plugin_aseprite__*`, following the
  assembly recipe in `references/aseprite-execution.md`. Aseprite is the **only** animation
  executor — no procedural Pillow frame generation, ever.
- **Pillow** — review glue **only**: `scripts/montage.py` upscales a still and lays frames into a
  montage for G2/G4. That is its entire sanctioned role.
- **Godot** — `scripts/assemble_tres.gd` packs frame PNGs into the v2 SpriteFrames.

## The per-asset builder → critique loop (and how to batch)

Each gap asset is produced by a **builder → critique** pair, run per the prompts in
`assets/builder-prompt.md` / `assets/critique-prompt.md`:

1. **Builder** does one step for one asset (generate this still / animate this storyboard) and
   reports what it produced.
2. **Critique** scores that output against the relevant rubric (the gate above) and returns
   **accept** or **reject + reasons**.
3. On reject, re-run the builder with the critique's notes; on accept, advance.

**Batching a set = fan out one builder→critique pair per gap asset.** Because each asset is
independent (its only shared context is the style spec + priors, both on disk), the gaps can be
worked in parallel — one sub-agent pair per missing keyframe/idle/transition — then reconciled.
Run the gates per asset; don't batch a whole set through one gate and lose per-asset rejects.

## The viewer loop (closing the loop)

A static review **viewer** (built by `scripts/build_viewer.mjs` into `viewer/`) renders the set's
keyframes, idle GIFs, and transitions on one page so you can eyeball cohesion across the whole
family and confirm the idles/transitions read right in context — the human-facing end of the G4
montage check. *(Viewer + builder are created by the QA-loop task; see "Status".)* Iterate:
**build → montage (G4) → viewer → tune storyboard/params → re-animate** until the family reads as
one set.

## Bundled files — when to read each

| File | When to read |
|------|--------------|
| `references/reference-assets-spec.md` | Stage 0 — what references to supply; every `_style-spec.json` field + how it's extracted. |
| `references/manifest-schema.md` | Stage 1 — set directory layout, idempotent gap-fill, every manifest field. |
| `references/aseprite-execution.md` | Stage 4 — the concrete Aseprite MCP frame-assembly + export recipe, conformance helpers, Windows/path gotchas. |
| `references/godot-integration.md` | Stage 5 — set layout, frames→`.tres`, the engine-path decision, import/verify gotchas. |
| `assets/style-spec.template.json` | Stage 0 — blank style-spec to copy to `<assets>/_style-spec.json`. |
| `assets/manifest.template.json` | Stage 1 — blank per-set manifest to copy to `<assets>/sets/<set>/manifest.json`. |
| `assets/storyboard.template.md` | **Stage 3 / G3** — copy + fill per idle/transition; critique it before the expensive animate. |
| `assets/builder-prompt.md` | Per-asset builder instruction (the build half of the loop). *(QA-loop task.)* |
| `assets/critique-prompt.md` | The gate scoring rubric (the critique half of the loop). *(QA-loop task.)* |
| `scripts/assemble_tres.gd` | Stage 5 — pack `frames/<id>/NN.png` into a v2 SpriteFrames `.tres`. |
| `scripts/montage.py` | G2/G4 — upscale a still or montage frames for review (Pillow only). |
| `scripts/build_viewer.mjs` | Build the review viewer. *(QA-loop task.)* |
| `viewer/` | The built review page. *(QA-loop task.)* |

## Status (forward references)

`assets/builder-prompt.md`, `assets/critique-prompt.md`, `scripts/build_viewer.mjs`, and `viewer/`
are produced by the **QA-loop task** that follows this one; the paths above are their final
locations and resolve once that task lands. Everything else in the table exists now.
