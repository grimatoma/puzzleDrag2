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
   outline, FPS). This is the **cohesion anchor**: every still and every animation is scored
   against it. For an existing game, the shipped tiles *are* the references. **When to read:**
   `references/reference-assets-spec.md` — what to provide and every spec field.
2. **One pipeline config (JSON).** A single `godot/assets/tiles/v2/pipeline.json` is the **durable
   source of truth** for the whole set — global `settings` (style-spec path, default `canvas`/`fps`,
   `candidates`, `humanApproval`/`autonomous`) plus a flat list of hierarchical **items**, each a
   `master` keyframe + its derived `children` + the `animations` over them, with every generated
   candidate (including failures) recorded **inline**. It replaces the old per-set
   `sets/<set>/manifest.json` model — there is no longer a manifest beside each output directory. It
   is **idempotent**: re-running diffs the file against itself **by shape** (and against files on
   disk) and builds only the gaps, feeding shipped siblings in via item `priors` so new members stay
   continuous. **When to read:** `references/manifest-schema.md` — the top-level shape, gap-fill, and
   every field.

## Starting a run — list tiles → proposal → run (intake)

The front door. When the user names sprites they want made ("5 new crop tiles: wheat, corn, …")
and no `items[]` entry in `pipeline.json` covers it yet, **interview them, write the config, and
rebuild the pixelGen viewer as the proposal** — every requested asset shows as a *pending
placeholder* with its prompt. **No art is generated and no credits are spent** until they review and
say "run it". This authoring step sits **before Stage 1** (which then diffs the `pipeline.json` you
wrote against itself + disk). Skip it when an item already covers the request — go straight to
Stage 1 gap-fill. **When to read:** `references/intake.md` — the interview questions, how to write
the `items[]` entry, building the proposal, and the approval gate.

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
| **1** | Plan the set | Diff `pipeline.json`'s items (master/children/animations) by **shape** against themselves + files on disk; **only the gaps proceed**. Gather sibling priors. (`build_viewer.mjs --plan` prints the action list.) | — (read `pipeline.json`) |
| **2** | Generate keyframe stills | Generate `settings.candidates` seeds per missing master, then derive each child from the **approved** master; priors = sibling set assets for continuity. **Expensive.** | **PixelLab** (pixellab skill / `scripts/pixellab.mjs`) or hand |
| **3** | Physics storyboard | For each idle/transition, fill `assets/storyboard.template.md` **against the generated still**: frame count, fps, per-frame forces + pixel-level change. | pixel-art-animation skill |
| **4** | Animate | Execute the storyboard into per-frame PNGs + a preview GIF. **Expensive.** | **Aseprite only** (`references/aseprite-execution.md`) |
| **5** | Integrate & verify | Pack frames → v2 `.tres`; import; verify in-engine — one command. | `scripts/integrate.mjs` + `references/godot-integration.md` |

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
scoring rubric).

### Cost-gated control flow (per keyframe / animation)

Spend is gated **before every major cost event** — the master batch, each derived-state batch, and
the animate stage — so a bad asset never burns the next batch of credits. The loop per keyframe:

1. **Generate N candidates.** Generate `settings.candidates` (`1 | 2 | 4`) seeds for the keyframe in
   one batch — the master first; a child only once its master is approved (it's conditioned on the
   approved master).
2. **LLM self-audit scores the whole seed group in ONE call.** Montage the N candidates into a
   single sheet (`scripts/montage.py`), **Read it once**, and return a per-candidate verdict (the
   `llm: pass | fail` field). This scores the **whole group** in one Read, not one Read per seed.
   Regenerate **only the failed subset** (gap-fill rule 4 re-seeds just those `idx`s) — passing
   candidates are kept.
3. **Optional human-approval gate.** When `settings.humanApproval` is true (and `autonomous` false),
   pause for sign-off in the **pixelGen viewer** — the human picks/approves a candidate, which the
   control server writes back to `pipeline.json` (`selected` + candidate `status: "approved"`). When
   `settings.autonomous` is true the gate is skipped and the LLM verdict decides what to approve.
4. **Proceed** to the next gated event (derive the children, then animate the idles/transitions).

Each gated event is its own batch with its own audit + (optional) human approval, so the next spend
only happens against assets that already passed.

### Master → children hierarchy

The `items[]` nesting **is** the derivation graph: each item has **one `master`** keyframe and its
**`children`** (variants derived from the approved master). There is **no `master:true` flag and no
`derivesFrom` pointer** — a `child` derives from the item's `master` purely by position. A child is
only eligible to generate once its master's `selected` is non-null (approved); gap-fill enforces
this structurally. See `references/manifest-schema.md` §"Gap-fill is structural".

### Storyboard comes *after* the still

Write the physics storyboard (Stage 3) **against the generated still**, not before it. The builder
should `get_pixels` the real approved keyframe first and **cite real coordinates** in the per-frame
plan — the storyboard directs motion over pixels that actually exist. (Citing a coordinate that
turns out transparent bit us once on a winter-glint pixel.) This is why Stage 3 sits *after* Stage 2
in the flow, even though both bracket the same generate→animate boundary.

## Tool routing (what executes what)

- **Base stills** — **PixelLab** (async: create → poll `get_*` → download; check credits first; do
  the object review→select step) **or** a hand-drawn/edited still. Never Pillow.
- **All animation** — **Aseprite**, via `mcp__plugin_pixel-plugin_aseprite__*`, following the
  assembly recipe in `references/aseprite-execution.md`. Aseprite is the **only** animation
  executor — no procedural Pillow frame generation, ever.
- **Pillow** — review glue **only**: `scripts/montage.py` upscales a still and lays frames into a
  montage for G2/G4. That is its entire sanctioned role.
- **Godot** — `scripts/integrate.mjs` drives the whole frames→`.tres`+verify step (it calls
  `tools/assemble_tres.gd` to pack and `tools/verify_sf.gd` to verify). See
  `references/godot-integration.md`.

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

### Running agents concurrently

The pipeline is built to fan builders out wide:

- **Stills fan out per candidate seed.** Each requested seed is an independent generation; fan one
  builder per candidate (and per missing keyframe) and reconcile when they land.
- **Animations fan out ONE builder per gap animation, in parallel.** This is safe because the
  **additive-overlay** animation technique (see `assets/builder-prompt.md`) makes every Aseprite
  call **stateless**: each frame is addressed by an explicit `frame_number` + `layer_name`, with
  **no selection ops** (no `select_rectangle` / `move_selection` / `copy` / `cut` / `paste`) whose
  result depends on a hidden cursor/selection. Each builder also owns its **own `.aseprite` file**
  (`_work/<id>.aseprite`), so parallel builders never touch the same sprite.
- **Gates run as parallel critique agents** — one critique per asset, scoring its own artifact.
- **Concurrency cap ~10–16 agents.** Beyond that, reconciliation and rate limits dominate; keep a
  batch within that range.
- **Parallel builders MUST NOT each `git commit`.** Concurrent commits race the git index. Builders
  write files and hand back; the **orchestrator commits** once after reconciling the batch.

## The viewer loop (closing the loop)

A static review **viewer** (built by `scripts/build_viewer.mjs` into `pixelGen/`, served at
**http://localhost:8100/pixelGen/** via the `pixelGen` launch config / `scripts/serve_viewer.mjs`)
renders the set's keyframes, candidate seeds, idle GIFs, and transitions on one page so you can
eyeball cohesion across the whole family and confirm the idles/transitions read right in context —
the human-facing end of the G4 montage check **and the human-approval gate**. The control server
(`serve_viewer.mjs`) accepts the viewer's select/approve/regen/comment decisions and **patches
`pipeline.json` in place**; its spawned `build_viewer.mjs --watch` child re-emits `data.json` so the
page re-polls live. It doubles as the **intake proposal surface** (all-pending before a run; the same
cards fill with art after). Iterate: **build → montage (G4) → viewer → tune storyboard/params →
re-animate** until the family reads as one set.

## Bundled files — when to read each

| File | When to read |
|------|--------------|
| `references/intake.md` | **Intake** — the interview that turns "make me N tiles" into a `pipeline.json` `items[]` entry + the pixelGen proposal, before any spend. |
| `references/reference-assets-spec.md` | Stage 0 — what references to supply; every `_style-spec.json` field + how it's extracted. |
| `references/manifest-schema.md` | Stage 1 — the single `pipeline.json` model (settings + items: master/children/animations + inline candidates), structural gap-fill, every field. |
| `references/aseprite-execution.md` | Stage 4 — the concrete Aseprite MCP frame-assembly + export recipe (additive-overlay + flexing-base), conformance helpers, Windows/path gotchas. |
| `references/godot-integration.md` | Stage 5 — set layout, frames→`.tres` via `integrate.mjs`, the engine-path decision, import/verify gotchas. |
| `assets/style-spec.template.json` | Stage 0 — blank style-spec to copy to `<assets>/_style-spec.json`. |
| `assets/manifest.template.json` | Superseded by the single `pipeline.json` model — pointer only; see `references/manifest-schema.md`. |
| `assets/storyboard.template.md` | **Stage 3 / G3** — copy + fill per idle/transition (against the generated still); critique it before the expensive animate. |
| `assets/builder-prompt.md` | Per-asset builder instruction (the build half of the loop) — incl. the additive-overlay technique. |
| `assets/critique-prompt.md` | The gate scoring rubric (the critique half of the loop). |
| `viewer/` | The review-page template (index.html + css + js) `build_viewer.mjs` copies into `pixelGen/`. |

### Scripts quick-reference

| Script | What it does |
|--------|--------------|
| `scripts/build_viewer.mjs` | Reads `pipeline.json`, emits `pixelGen/data.json` + copies the `viewer/` template (the review viewer / intake proposal). `--watch` re-emits `data.json` on change; `--plan` prints the structural gap-fill action list (generate-master / generate-child / animate / reseed) as JSON without building. |
| `scripts/serve_viewer.mjs` | The pixelGen **control server**: static-serves the viewer + the v2 asset tree, and on POST `/api/<action>` (select / approve / regen / comment) **patches `pipeline.json` in place** (atomic temp+rename). Spawns `build_viewer.mjs --watch` so patches rebuild `data.json`. Default port 8100 (`$PORT`). |
| `scripts/integrate.mjs` | One-command Godot integration: `--import` → verify every frame PNG got a `.png.import` sidecar (**re-import once** if any missing) → `git checkout godot/project.godot` → `assemble_tres.gd` per idle → `verify_sf.gd`. Work list from `pipeline.json` (approved+generated idles) or explicit `<framesDir> <outTres>` pairs. |
| `scripts/pixellab.mjs` | PixelLab still client + importable module: `balance` checks credits; `create` runs the async **create → poll → download** loop and saves a PNG. Token from `$PIXELLAB_TOKEN` or `~/.claude.json` (never logged). |
| `scripts/pixels.mjs` | PNG **opaque-pixel feature map** helper — read a still's non-transparent pixels / diff two stills, so the storyboard can cite real coordinates (which pixels exist, what changed). |
| `scripts/montage.py` | G2/G4 review glue (**Pillow only**): upscale a still (`--scale`) or montage a `frames/<id>/` folder or a GIF for Read-and-judge. |
| `scripts/assemble_tres.gd` | Pack `frames/<id>/NN.png` (sorted) into a v2 SpriteFrames `.tres` — one looping `idle` animation at the project fps. Copied into `godot/tools/` and run as `res://tools/assemble_tres.gd`. |
| `godot/tools/verify_sf.gd` | Verify a built `.tres` satisfies the v2 tile contract (one looping `idle` with N frames). Invoked by `integrate.mjs` as `res://tools/verify_sf.gd`. |

## Status

The redesigned pipeline is in place — intake, the builder/critique gate prompts, the
`build_viewer.mjs` viewer + its `viewer/` template + the `serve_viewer.mjs` control server, the
`pixellab.mjs` still client, and the `integrate.mjs` Godot path (which calls `assemble_tres.gd` +
`verify_sf.gd`). This game's committed inputs are `godot/assets/tiles/v2/_style-spec.json` and the
single `godot/assets/tiles/v2/pipeline.json` (the migrated `birch_tree` item). The birch keyframes +
previews are committed; a fresh **first run on a new family** (which spends PixelLab credits +
Aseprite ops) is user-initiated: start with intake (or, for an existing item, jump to Stage 1
gap-fill — `build_viewer.mjs --plan` shows what's pending) and approve the pixelGen proposal before
the spend.
