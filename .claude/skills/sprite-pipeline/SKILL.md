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
2. **One pipeline config (three files).** The pipeline lives in **three files side-by-side** in
   `godot/assets/tiles/v2/`: **`pipeline.json`** (the **spec + state** — global `settings` plus a flat
   list of hierarchical **items**, each a `master` keyframe + its derived `children` + the
   `animations` over them; each keyframe carries `selected`/`selectedPath`, **not** candidates),
   **`pipeline.history.json`** (the **candidate/attempt-log sidecar**, keyed itemId → keyframeId →
   candidate[] — every seed ever tried, failures included; starts `{}`), and **`pipeline.schema.json`**
   (the **formal JSON Schema** both data files are validated against — every script REFUSES to proceed
   on invalid data). They're loaded/validated/written through the shared `scripts/manifest.mjs` seam.
   This replaces the old per-set `sets/<set>/manifest.json` model — there is no longer a manifest
   beside each output directory. It is **idempotent**: re-running diffs the spec (with candidate counts
   merged in from history) against itself **by shape** and against files on disk, and builds only the
   gaps, feeding shipped siblings in via item `priors` so new members stay continuous. **When to
   read:** `references/manifest-schema.md` — the three-file model, gap-fill, and every field.

## Starting a run — list tiles → proposal → run (intake)

The front door. When the user names sprites they want made ("5 new crop tiles: wheat, corn, …")
and no `items[]` entry in `pipeline.json` covers it yet, **interview them, write the config, and
rebuild the pixelGen viewer as the proposal** — every requested asset shows as a *pending
placeholder* with its prompt. **No art is generated and no credits are spent** until they review and
say "run it". This authoring step sits **before Stage 1** (which then diffs the `pipeline.json` you
wrote against itself + disk). Skip it when an item already covers the request — go straight to
Stage 1 gap-fill. **When to read:** `references/intake.md` — the interview questions, how to write
the `items[]` entry, building the proposal, and the approval gate.

## The four stages

The pixel pipeline **ends at the produced frames + preview GIF** (Stage 4). Pushing those into the
Godot project is a **separate, on-demand step that is not part of the pipeline** — see
"Updating Godot is a separate step" below.

```
                 G1                    G2          G3                    G4
 references → 0 ──┐         ┌─ 2 ──────┐   3 ──────┐         ┌─ 4 ───────┐
 manifest   → 1 ─ critique  │ GENERATE │ critique  │ critique│ ANIMATE   │ critique → frames + GIF
                  prompt    │ (PixelLab)│  still    │ storybd │ (Aseprite)│ montage    (pipeline ends)
                            └──────────┘           └─────────┘           └───────────┘
                                                                       ┊ separate, on-demand step ┊
                                                                       └→ node tools/update-godot-tiles.mjs
                                                                          → v2 .tres + in-engine verify
```

| # | Stage | What happens | Tool |
|---|-------|--------------|------|
| **0** | Extract style spec | Read references; pull canvas + palette ramps + hue-shift; transcribe light/outline/perspective/fps. | Aseprite `analyze_reference` / `get_palette` / `analyze_palette_harmonies` |
| **1** | Plan the set | Diff `pipeline.json`'s items (master/children/animations) by **shape** against themselves + files on disk; **only the gaps proceed**. Gather sibling priors. (`build_viewer.mjs --plan` prints the action list.) | — (read `pipeline.json`) |
| **2** | Generate keyframe stills | Generate `settings.candidates` seeds per missing master, then derive each child from the **approved** master; priors = sibling set assets for continuity. **Expensive.** | **PixelLab** (pixellab skill / `scripts/pixellab.mjs`) or hand |
| **3** | Physics storyboard | For each idle/transition, fill `assets/storyboard.template.md` **against the generated still**: frame count, fps, per-frame forces + pixel-level change. | pixel-art-animation skill |
| **4** | Animate | Execute the storyboard into per-frame PNGs + a preview GIF. **The pipeline ends here. Expensive.** | **Aseprite only** (`references/aseprite-execution.md`) |

### Updating Godot is a separate step (not a pipeline stage)

Getting the produced frames into the engine — pack frames → v2 `.tres`, import, verify in-engine —
is **decoupled from the pixel pipeline** and run on demand, **never as a side effect of the
pipeline or the `npm` build**:

```bash
npm run godot:update-tiles            # work list from pipeline.json (approved + generated idles)
# or directly, with explicit pairs / a Godot binary:
node tools/update-godot-tiles.mjs [--godot <path>] [<framesDir> <outTres> ...]
```

`tools/update-godot-tiles.mjs` is the standalone repo-level entrypoint; it wraps the integration
engine `scripts/integrate.mjs` (which still lives with this skill). The full layout, the
import/verify gotchas, and the engine-path decision are in `references/godot-integration.md`.

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
   control server writes back across the split: `selected` + `selectedPath` to `pipeline.json`, and the
   candidate's `status: "approved"` to `pipeline.history.json`. When `settings.autonomous` is true the
   gate is skipped and the LLM verdict decides what to approve. In the autonomous path, **record the
   verdict with `scripts/pipeline-patch.mjs`** (`record-candidate` for each seed, then
   `approve`/`reject "<reason>"`) rather than hand-editing the JSON — it writes the same split as the
   control server (candidate records to `pipeline.history.json`, `selected`/`selectedPath` to
   `pipeline.json`) via atomic temp+rename, no dropped-comma risk. To run a session full-auto without
   committing a settings change, flip it with `pipeline-patch.mjs set-mode autonomous` and **restore
   `set-mode gated` before you commit** (the committed default should keep the human gate on so the
   *next* run isn't silently un-gated). A `SPRITE_PIPELINE_*` env override is intentionally **not**
   used — the mode lives in `pipeline.json` so the viewer and the headless run always agree on it.
4. **Proceed** to the next gated event (derive the children, then animate the idles/transitions).

Each gated event is its own batch with its own audit + (optional) human approval, so the next spend
only happens against assets that already passed.

### Master → children hierarchy

The `items[]` nesting **is** the derivation graph: each item has **one `master`** keyframe and its
**`children`** (variants derived from the approved master). There is **no `master:true` flag and no
`derivesFrom` pointer** — a `child` derives from the item's `master` purely by position. A child is
only eligible to generate once its master's `selected` is non-null (approved — `selected !== null` is
the approval signal); gap-fill reads candidate counts from the merged history view and enforces this
structurally. See `references/manifest-schema.md` §"Gap-fill is structural".

### Storyboard comes *after* the still

Write the physics storyboard (Stage 3) **against the generated still**, not before it. The builder
should `get_pixels` the real approved keyframe first and **cite real coordinates** in the per-frame
plan — the storyboard directs motion over pixels that actually exist. (Citing a coordinate that
turns out transparent bit us once on a winter-glint pixel.) This is why Stage 3 sits *after* Stage 2
in the flow, even though both bracket the same generate→animate boundary.

## Tool routing (what executes what)

> **Pre-flight (do this once, before the first tool call): load the deferred MCP schemas.** The
> Aseprite (`mcp__plugin_pixel-plugin_aseprite__*`) and PixelLab (`mcp__pixellab__*`) tools are
> almost always **deferred** — their schemas are not in context, so calling one directly fails with
> `InputValidationError` (e.g. guessing `image_path` when the real param is `reference_path`). Bulk-
> load them first with two `ToolSearch` calls — `ToolSearch "aseprite"` and `ToolSearch "pixellab"`
> (keyword search returns the whole toolkit per server in one shot) — then call them normally. A
> param cheat-sheet for the common Aseprite tools is in `references/aseprite-execution.md`.

- **Base stills** — **PixelLab** (async: create → poll `get_*` → download; check credits first; do
  the object review→select step) **or** a hand-drawn/edited still. Never Pillow.
- **All animation** — **Aseprite**, via `mcp__plugin_pixel-plugin_aseprite__*`, following the
  assembly recipe in `references/aseprite-execution.md`. Aseprite is the **only** animation
  executor — no procedural Pillow frame generation, ever.
- **Pillow** — review glue **only**: `scripts/montage.py` upscales a still and lays frames into a
  montage for G2/G4. That is its entire sanctioned role.
- **Godot** — the **separate, post-pipeline** update step (not a pipeline stage). Run
  `npm run godot:update-tiles` (`tools/update-godot-tiles.mjs`), which drives the whole
  frames→`.tres`+verify dance via the engine `scripts/integrate.mjs` (it calls
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

> **Start the control server FIRST, at the top of a run — not at the end.** Before any spend, launch
> `node scripts/serve_viewer.mjs` (background) and point the human at **http://localhost:8100/pixelGen/**.
> Its `build_viewer.mjs --watch` child re-emits `data.json` whenever `pipeline.json` changes, so when
> you record progress through `pipeline-patch.mjs` (candidates generated → approved → animations
> done) the page **updates live** and the human can watch the family fill in as it's built. Running it
> only at the end defeats the purpose — the viewer is a *progress monitor*, not just a final report.
> (Leave it running for the whole session; it also serves the intake proposal and the G4/human gate.)

A static review **viewer** (built by `scripts/build_viewer.mjs` into `pixelGen/`, served at
**http://localhost:8100/pixelGen/** via the `pixelGen` launch config / `scripts/serve_viewer.mjs`)
renders the set's keyframes, candidate seeds, idle GIFs, and transitions on one page so you can
eyeball cohesion across the whole family and confirm the idles/transitions read right in context —
the human-facing end of the G4 montage check **and the human-approval gate**. The control server
(`serve_viewer.mjs`) accepts the viewer's select/approve/regen/comment decisions and **patches the
three-file model in place**, splitting each patch by what it owns: `select`/`comment` and the
preference half of `approve` write `pipeline.json` (`selected`/`selectedPath`/`comment`); `regen` and
the record half of `approve` write `pipeline.history.json` (candidate `status`/`reason`). Its spawned
`build_viewer.mjs --watch` child re-emits `data.json` so the page re-polls live. It doubles as the
**intake proposal surface** (all-pending before a run; the same cards fill with art after). Iterate:
**build → montage (G4) → viewer → tune storyboard/params → re-animate** until the family reads as one
set.

## Bundled files — when to read each

| File | When to read |
|------|--------------|
| `references/intake.md` | **Intake** — the interview that turns "make me N tiles" into a `pipeline.json` `items[]` entry + the pixelGen proposal, before any spend. |
| `references/reference-assets-spec.md` | Stage 0 — what references to supply; every `_style-spec.json` field + how it's extracted. |
| `references/manifest-schema.md` | Stage 1 — the three-file model (`pipeline.json` spec + state / `pipeline.history.json` candidate-log sidecar / `pipeline.schema.json` formal definition), the `manifest.mjs` seam + merged view + degraded mode, structural gap-fill, every field. |
| `references/aseprite-execution.md` | Stage 4 — the concrete Aseprite MCP frame-assembly + export recipe (additive-overlay + flexing-base), conformance helpers, Windows/path gotchas. |
| `references/godot-integration.md` | The **separate, on-demand** Godot update step (not a pipeline stage) — set layout, frames→`.tres` via `npm run godot:update-tiles`, the engine-path decision, import/verify gotchas. |
| `assets/style-spec.template.json` | Stage 0 — blank style-spec to copy to `<assets>/_style-spec.json`. |
| `assets/manifest.template.json` | Superseded by the three-file model — pointer + an illustrative `pipeline.json` items[] shape (new keyframes are `{ id, prompt, selected: null, selectedPath: null }`, no candidates); see `references/manifest-schema.md`. |
| `assets/manifest.history.template.json` | Pointer + starting point for the `pipeline.history.json` sidecar — a new set starts `{}` (or absent); shows the populated itemId → keyframeId → candidate[] shape. |
| `assets/storyboard.template.md` | **Stage 3 / G3** — copy + fill per idle/transition (against the generated still); critique it before the expensive animate. |
| `assets/builder-prompt.md` | Per-asset builder instruction (the build half of the loop) — incl. the additive-overlay technique. |
| `assets/critique-prompt.md` | The gate scoring rubric (the critique half of the loop). |
| `viewer/` | The review-page template (index.html + css + js) `build_viewer.mjs` copies into `pixelGen/`. |

### Scripts quick-reference

| Script | What it does |
|--------|--------------|
| `scripts/manifest.mjs` | The shared three-file seam every other script imports: `loadPipeline`/`loadHistory`/`loadSchema`, `loadMerged`/`mergeInto` (splice candidates back onto keyframes for the projection/plan code), `writePipeline`/`writeHistory` (atomic temp+rename), `validate`/`validateDoc` (against `pipeline.schema.json`), `historyPath`/`schemaPath`. Validate the **on-disk** docs, never the merged shape. |
| `scripts/build_viewer.mjs` | Reads + schema-validates `pipeline.json` **and** `pipeline.history.json` via `manifest.mjs` (REFUSES on invalid data; missing sidecar → degraded mode, approved art from `selectedPath`), emits `pixelGen/data.json` + copies the `viewer/` template (the review viewer / intake proposal). `--watch` re-emits `data.json` on change (watches both data files); `--plan` prints the structural gap-fill action list (generate-master / generate-child / animate / reseed) off the merged view as JSON without building. |
| `scripts/serve_viewer.mjs` | The pixelGen **control server**: static-serves the viewer + the v2 asset tree, and on POST `/api/<action>` (select / approve / regen / comment) validates then **patches the three-file model in place**, writing only the file(s) the action owns (`select`/`comment` → `pipeline.json`; `regen` → `pipeline.history.json`; `approve` → both, history first). All load/validate/write via `manifest.mjs`. Spawns `build_viewer.mjs --watch` so patches rebuild `data.json`. Default port 8100 (`$PORT`). |
| `scripts/pipeline-patch.mjs` | **Three-file bookkeeping CLI** for the orchestrator (the headless counterpart to the viewer's buttons) — `record-candidate` / `approve` / `reject "<reason>"` / `animate-done <selector> <gif> [storyboard]` / `set-mode autonomous\|gated` / `show`. Writes the same split as the control server via `manifest.mjs` (candidate records → `pipeline.history.json`; `selected`/`selectedPath`, animation status/gif/storyboard, mode → `pipeline.json`), atomic temp+rename. Use it instead of hand-editing the JSON in an autonomous run (a dropped comma silently breaks the pipeline). |
| `scripts/integrate.mjs` | The **Godot update engine** (a separate step, **not** a pipeline stage; exposed as `tools/update-godot-tiles.mjs` / `npm run godot:update-tiles`, which imports its `main`). Loads + schema-validates `pipeline.json` via `manifest.mjs` (REFUSES on invalid data; needs only the spec, not history) → `--import` → verify every frame PNG got a `.png.import` sidecar (**re-import once** if any missing) → `git checkout godot/project.godot` → `assemble_tres.gd` per idle → `verify_sf.gd`. Work list from `pipeline.json` (idles whose keyframe is approved via `selected !== null` + `status: generated`) or explicit `<framesDir> <outTres>` pairs; `--list` dry-runs the work list as JSON with no Godot binary. |
| `scripts/pixellab.mjs` | PixelLab still client + importable module: `balance` checks credits; `create` runs the async **create → poll → download** loop and saves a PNG. Token from `$PIXELLAB_TOKEN` or `~/.claude.json` (never logged). |
| `scripts/pixels.mjs` | PNG **opaque-pixel feature map** helper — read a still's non-transparent pixels / diff two stills, so the storyboard can cite real coordinates (which pixels exist, what changed). |
| `scripts/montage.py` | G2/G4 review glue (**Pillow only**): upscale a still (`--scale`) or montage a `frames/<id>/` folder or a GIF for Read-and-judge. |
| `scripts/assemble_tres.gd` | Pack `frames/<id>/NN.png` (sorted) into a v2 SpriteFrames `.tres` — one looping `idle` animation at the project fps. Copied into `godot/tools/` and run as `res://tools/assemble_tres.gd`. |
| `godot/tools/verify_sf.gd` | Verify a built `.tres` satisfies the v2 tile contract (one looping `idle` with N frames). Invoked by `integrate.mjs` as `res://tools/verify_sf.gd`. |

## Status

The redesigned pipeline is in place — intake, the builder/critique gate prompts, the
`build_viewer.mjs` viewer + its `viewer/` template + the `serve_viewer.mjs` control server, the
shared `manifest.mjs` seam, the `pipeline-patch.mjs` bookkeeping CLI, the `pixellab.mjs` still
client, and the **separate** Godot update step — `tools/update-godot-tiles.mjs`
(`npm run godot:update-tiles`) over the `integrate.mjs` engine (which calls `assemble_tres.gd` +
`verify_sf.gd`). This game's committed inputs are `godot/assets/tiles/v2/_style-spec.json` and the
three-file pipeline at `godot/assets/tiles/v2/` — `pipeline.json` (the `birch_tree` and `pumpkin`
items, spec + state), `pipeline.history.json` (their candidate records), and `pipeline.schema.json`
(the formal definition all scripts validate against). The birch + pumpkin keyframes + previews are
committed; a fresh **first run on a new family** (which spends PixelLab credits + Aseprite ops) is
user-initiated: start with intake (or, for an existing item, jump to Stage 1 gap-fill —
`build_viewer.mjs --plan` shows what's pending) and approve the pixelGen proposal before
the spend.
