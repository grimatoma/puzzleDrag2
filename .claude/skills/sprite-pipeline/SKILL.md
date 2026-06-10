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
  falling/accumulation/settle). Owns the **motion brief / storyboard** and the **G3/G4** motion critiques.
- **pixellab** — the async AI generator (job → poll → download) used at **Stage 2 AND Stage 4**:
  review-pack stills, derived object **states** (children), and **v3 animation** (on-model idles +
  keyframe-to-keyframe **interpolation** for transitions).

## The consistency contract (why the object flow is not optional)

A family only reads as one family if every member is **derived from the same anchor image**, not
re-rolled from text. The pipeline therefore runs on PixelLab's **object** workflow end-to-end:

1. **Master** → `create-object` review pack (many seeds, one call). The approved pick is a
   **persistent PixelLab object**; its id is recorded as the keyframe's `objectId`.
2. **Child keyframe** (season/damage/growth variant) → `state` on the master's `objectId` — an
   **image-conditioned edit** that keeps the master's size, position, silhouette, and identity and
   changes only what the edit text names. Never a fresh text generation.
3. **Idle** → `animate` (v3 text mode) on that keyframe's `objectId` — frame 0 **is** the keyframe,
   so the loop is on-model by construction.
4. **Transition** → `animate` with `--end <child keyframe png>` (v3 interpolation) — real AI
   inbetweens whose first and last frames are **pixel-identical** to the two keyframes, so
   idle → transition → idle chains seamlessly.

The pre-object pipeline (text-only `create` per child + hand-built Aseprite tween between
unrelated endpoints) produced the canonical failure: a winter pumpkin smaller than its autumn
master with the stem flipped to the other side, and a birch "transition" that was a top-down
reveal wipe of a structurally different tree. **Do not regress to text-only child generation.**

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
                 G1                       G2          G3                       G4
 references → 0 ──┐         ┌─ 2 ─────────┐   3 ──────┐         ┌─ 4 ──────────┐
 manifest   → 1 ─ critique  │ GENERATE    │ critique  │ critique│ ANIMATE      │ critique → frames + GIF
                  prompt    │ master pack │  still    │ motion  │ PixelLab v3  │ montage    (pipeline ends)
                            │ + child     │           │ brief   │ (idle: text; │
                            │ STATES      │           │         │ transition:  │
                            │ (PixelLab   │           │         │ interpolate; │
                            │  objects)   │           │         │ Aseprite =   │
                            └─────────────┘           └─────────┘ polish/fallbk┘
                                                                       ┊ separate, on-demand step ┊
                                                                       └→ node tools/update-godot-tiles.mjs
                                                                          → v2 .tres + in-engine verify
```

| # | Stage | What happens | Tool |
|---|-------|--------------|------|
| **0** | Extract style spec | Read references; pull canvas + palette ramps + hue-shift; transcribe light/outline/perspective/fps. | Aseprite `analyze_reference` / `get_palette` / `analyze_palette_harmonies` |
| **1** | Plan the set | Diff `pipeline.json`'s items (master/children/animations) by **shape** against themselves + files on disk; **only the gaps proceed**. Gather sibling priors. (`build_viewer.mjs --plan` prints the action list.) | — (read `pipeline.json`) |
| **2** | Generate keyframes | **Master:** `create-object` review pack (one call → many seeds; `--style` = prior PNGs for real image conditioning) → G2 audits the pack montage → `select-frames` promotes the pick(s) → approve one, record its `objectId`. **Child:** `state` on the approved master's `objectId` (image-conditioned; identity/size/silhouette preserved) → G2 → approve, record `objectId`. **Expensive.** | **PixelLab object flow** (`scripts/pixellab.mjs create-object` / `select-frames` / `state`) or hand |
| **3** | Motion brief | For each idle/transition, write the **motion brief** (the `animation_description` + frame count + expected phases) against the approved stills; full per-frame storyboard (`assets/storyboard.template.md`) only when Aseprite will execute. | pixel-art-animation skill |
| **4** | Animate | **Idle:** `animate` v3 text mode on the keyframe's `objectId` (frame 0 == keyframe). **Transition:** `animate` v3 interpolation `--end <to-keyframe png>` (endpoints pixel-identical to both keyframes). Aseprite only for polish passes or motions v3 can't express. **The pipeline ends at frames + preview GIF. Expensive.** | **PixelLab v3** (`scripts/pixellab.mjs animate` / `fetch-anim`); Aseprite fallback (`references/aseprite-execution.md`) |

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

Spend is gated **before every major cost event** — the master pack, each derived-state batch, and
the animate stage — so a bad asset never burns the next batch of credits. The loop per keyframe:

1. **Generate candidates.**
   - **Master:** ONE `create-object` call returns a whole **review pack** (candidate count scales
     with canvas size: ≤42px → 64, ≤85px → 16, ≤170px → 4 — a 32px tile gets 64 seeds for ~20
     generations). Pass prior PNGs via `--style` so the pack is image-conditioned on the family.
   - **Child:** `settings.candidates` (`1 | 2 | 4`) separate `state` calls on the approved master's
     `objectId` (each call = one candidate; vary `--seed`). A child is only eligible once its
     master is approved — the derivation needs the master's `objectId`.
2. **LLM self-audit scores the whole seed group in ONE call.** Montage the candidates into a
   single sheet (`scripts/montage.py` — for a master pack, montage the whole `cand_NN.png` grid),
   **Read it once**, and return a per-candidate verdict (the `llm: pass | fail` field). This scores
   the **whole group** in one Read, not one Read per seed. For a master pack, promote only the
   audited pick(s) with `select-frames` (each promoted frame becomes its own persistent object) and
   record those as the history candidates — the unpromoted seeds die with the review pack.
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
the approval signal) **and** its `objectId` is recorded (that's what `state` derives from); gap-fill
reads candidate counts from the merged history view and enforces this structurally. See
`references/manifest-schema.md` §"Gap-fill is structural".

**`objectId` is the derivation handle.** Approving a candidate records its PixelLab object id onto
the keyframe (`pipeline-patch.mjs approve` denormalizes it from the candidate, exactly like
`selectedPath`). Child `state` calls and all `animate` calls take that id. PixelLab objects persist
(unlike 8-hour map objects), so an approved family can keep deriving new members **months later**
without regenerating the master — protect the ids; losing one means re-promoting a master.

### Motion brief comes *after* the still

Write the motion brief (Stage 3) **against the approved stills**, not before them. For a PixelLab
animation the brief is the `animation_description` (+ frame count + the expected phases G4 will
check); name the **forces and the order things change** ("tendrils wither first, frost creeps
top-down, snow settles last") — interpolation follows the description's staging. For an
Aseprite-executed animation, fill the full per-frame storyboard (`assets/storyboard.template.md`):
`get_pixels` the real keyframe and **cite real coordinates** (citing a coordinate that turns out
transparent bit us once on a winter-glint pixel). This is why Stage 3 sits *after* Stage 2 in the
flow, even though both bracket the same generate→animate boundary.

## Tool routing (what executes what)

> **Pre-flight: prefer `scripts/pixellab.mjs` over raw MCP calls.** The CLI wraps the whole async
> create → poll → download loop in one command, reads/writes image files directly (so **base64
> frames never pass through the LLM** — hand-emitted base64 corrupts), and prints a JSON result
> line. If you do need a raw MCP call, the tools are almost always **deferred** — bulk-load schemas
> first with `ToolSearch "aseprite"` / `ToolSearch "pixellab"`, or the call fails with
> `InputValidationError`. A param cheat-sheet for the common Aseprite tools is in
> `references/aseprite-execution.md`.

- **Master stills** — `pixellab.mjs create-object` (review pack; `--style` = prior PNGs ≤256px for
  image conditioning) → G2 → `select-frames` → approve + record `objectId`. Check credits first
  (`pixellab.mjs balance`). Hand-drawn/edited stills remain valid (no `objectId` → that keyframe
  can't derive states or host v3 animations; its children/animations fall back to Aseprite).
- **Child stills** — `pixellab.mjs state --object <master objectId>` per candidate. **Never a fresh
  text-only generation** — that's the size-jump/stem-flip regression.
- **Idles** — `pixellab.mjs animate --object <keyframe objectId> --name idle` (v3 text mode).
- **Transitions** — `pixellab.mjs animate --object <from objectId> --end <to png> --name
  <from>__to__<to>` (v3 interpolation; start defaults to the object's own frame).
- **Aseprite** — the **polish + fallback** layer, via `mcp__plugin_pixel-plugin_aseprite__*`
  (`references/aseprite-execution.md`): palette snap (`quantize_palette`) when a v3 frame drifts
  off-ramp, surgical per-frame fixes, overlay effects v3 can't stage, and full animation assembly
  when there's no `objectId` (hand-authored keyframes) or a motion v3 can't express. No procedural
  Pillow frame generation, ever.
- **Pillow** — review glue + mechanical conformance **only**: `scripts/montage.py` (G2/G4 review
  sheets), `scripts/gif.py` (preview-GIF assembly from downloaded frames), and
  `scripts/underlay.py` (pin an approved keyframe's static row band under every frame — the fix
  for v3 dropping small base elements like a grass tuft; it re-applies approved pixels, it never
  draws new ones). Pillow never generates art or motion.
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
| `scripts/pixellab.mjs` | The PixelLab client + importable module — **the consistency backbone**. `balance` checks credits. **Object flow:** `create-object` (review pack of candidate seeds; `--style a.png,b.png` = image conditioning on priors; downloads every `cand_NN.png`) → `select-frames --indices` (promote audited picks; each becomes a persistent object) → `state --object <id>` (derive a child keyframe from a master, identity-preserving) → `animate --object <id> --name <n>` (v3 motion: text mode for idles; `--start/--end <png>` interpolation for transitions; downloads `NN.png` frames) → `fetch-anim` / `fetch-frames` (resume/re-download without new spend) → `object --id` (raw `get_object`, debug). Legacy `create` (text-only map-object still) remains for one-offs. All image payloads are read/written as files — base64 never passes through the LLM. Token from `$PIXELLAB_TOKEN` or `~/.claude.json` (never logged). |
| `scripts/pixels.mjs` | PNG **opaque-pixel feature map** helper — read a still's non-transparent pixels / diff two stills, so the storyboard can cite real coordinates (which pixels exist, what changed). |
| `scripts/montage.py` | G2/G4 review glue (**Pillow only**): upscale a still (`--scale`) or montage a `frames/<id>/` folder or a GIF for Read-and-judge. |
| `scripts/gif.py` | Preview-GIF assembly (**Pillow, review glue**): `frames/<id>/ --out previews/<id>.gif --fps 10`. PixelLab returns per-frame PNGs; this builds the looping preview the viewer shows. The frames stay the shipped artifact. |
| `scripts/underlay.py` | Mechanical conformance fix (**Pillow, approved pixels only**): `frames/<id>/ --base <keyframe.png> --rows y0:y1 [--skip 0,...]` alpha-composites the keyframe's row band UNDER each frame in place. Use when v3 drops a static base element (grass tuft / ground shadow / mound) after frame 0 — two failed re-rolls means stop re-rolling and pin. Animation pixels stay on top; pin the smallest band that covers the dropped element. |
| `scripts/assemble_tres.gd` | Pack `frames/<id>/NN.png` (sorted) into a v2 SpriteFrames `.tres` — one looping `idle` animation at the project fps. Copied into `godot/tools/` and run as `res://tools/assemble_tres.gd`. |
| `godot/tools/verify_sf.gd` | Verify a built `.tres` satisfies the v2 tile contract (one looping `idle` with N frames). Invoked by `integrate.mjs` as `res://tools/verify_sf.gd`. |

## Status

The pipeline runs on the **PixelLab object flow** (2026-06-09 consistency rework) — intake, the
builder/critique gate prompts, the `build_viewer.mjs` viewer + its `viewer/` template + the
`serve_viewer.mjs` control server, the shared `manifest.mjs` seam, the `pipeline-patch.mjs`
bookkeeping CLI (now recording PixelLab `objectId`s), the `pixellab.mjs` object-flow client
(create-object / select-frames / state / animate / fetch-*), and the **separate** Godot update step
— `tools/update-godot-tiles.mjs` (`npm run godot:update-tiles`) over the `integrate.mjs` engine
(which calls `assemble_tres.gd` + `verify_sf.gd`). This game's committed inputs are
`godot/assets/tiles/v2/_style-spec.json` and the three-file pipeline at `godot/assets/tiles/v2/` —
`pipeline.json` (the `birch_tree` and `pumpkin` items, spec + state), `pipeline.history.json`
(their candidate records), and `pipeline.schema.json` (the formal definition all scripts validate
against). The pumpkin family is the object-flow reference output (state-derived winter, v3 idles,
interpolated transition; endpoints pixel-identical to the keyframes). A fresh **first run on a new
family** (which spends PixelLab credits) is user-initiated: start with intake (or, for an existing
item, jump to Stage 1 gap-fill — `build_viewer.mjs --plan` shows what's pending) and approve the
pixelGen proposal before the spend.
