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
- **pixellab** — an **optional** async AI generator used only at **Stage 2** as **one keyframe source**:
  master review-pack stills + derived object **states**. Swappable / omittable (see "Keyframe sources").

> **The split (read this first).** **Keyframes are stills; animation is hand-built in Aseprite.**
> Stage 2 produces keyframe stills from a source you choose — **hand-authored in Aseprite (the
> home-grown default) and/or PixelLab**, competing in one critique pool. Stage 4 motion — every idle
> and every transition — is then authored frame-by-frame in Aseprite
> (`references/aseprite-execution.md`). The pipeline does **not** use PixelLab's `animate`/v3 for
> shipped motion, and it can run **entirely without PixelLab**.

## The consistency contract (consistent keyframes → a hand-built tween can be cohesive)

Two requirements, where the first is what makes the second *possible*:

1. **Keyframes of a family must be a real family — each variant DERIVED from the same anchor image,
   not re-rolled from scratch.** A child (season/damage/growth variant) must keep the master's size,
   position, silhouette, and identity, changing only what the variant names. There are **two ways to
   get a derived child** (the pipeline is agnostic — see "Keyframe sources" below):
   - **Hand (home-grown, default):** in Aseprite, `import_image` the approved **master PNG** and edit
     it into the variant (recolor, add frost/snow, wither, damage). The master pixels are literally
     the starting point, so size/silhouette/anchor are preserved by construction.
   - **PixelLab (optional accelerator):** `state` on the master's `objectId` — an image-conditioned
     AI edit. Same guarantee, AI-driven.
   Either way: **never a fresh from-scratch generation of the child** (that's the size-jump/stem-flip
   defect).
2. **Aseprite animates between those consistent keyframes, by hand.** Because the `from` and `to`
   keyframes share a size/silhouette/anchor, a hand-built tween has matching endpoints to work
   between — so it can be a *real* staggered, arced motion instead of a fade.

This is *why the earlier failures happened, and why they're now fixable ourselves*:

- The winter pumpkin was a smaller body with the stem flipped — a **keyframe** defect (the child was
  generated from scratch, not derived). Fixed by deriving the winter keyframe FROM the autumn master
  (by hand in Aseprite, or via PixelLab `state`). ✔
- The birch autumn→winter "just went top-down, not cohesive" — an **animation** defect. The original
  Aseprite tween was incoherent **because its endpoints were two structurally different trees**, so
  the only safe motion was a uniform top-down fade. Once the winter keyframe is derived from the
  autumn master (shared trunk + canopy envelope), Aseprite stages a genuine leaf-clump-by-clump fall
  that reveals the matching branch skeleton underneath. ✔

So: **derive keyframes from a shared anchor (any source), then animate by hand in Aseprite.** Do not
generate a child from scratch (breaks half 1); do not outsource the motion to PixelLab v3 (half 2 is
hand-built Aseprite).

## Keyframe sources — PixelLab is optional; hand-authored is the home-grown default

Stage 2 is **source-pluggable**, and it's the one place the pipeline touches PixelLab — so it's the
swap point. A keyframe accumulates a **single candidate pool**, and each candidate is tagged
`source: hand | pixellab`:

- **`hand` (home-grown):** authored/edited in Aseprite — a master drawn from scratch (or traced from
  a sibling), a child edited from the approved master PNG. No AI, no credits. **The pipeline runs
  fully without PixelLab on hand candidates alone.**
- **`pixellab` (optional):** the `create-object` review pack (masters) / `state` (children) flow.
  An accelerator for getting on-style seeds fast; never required.

**Both sources compete in the same pool at the G2 gate** — montage them together and pick the best
regardless of origin (e.g. author 2 hand candidates, generate 2 PixelLab candidates, choose the
strongest of the four). The only PixelLab-specific bookkeeping is `objectId`/`reviewObjectId` on a
`pixellab` candidate (the handle a PixelLab `state` child derives from); a `hand` keyframe has no
`objectId` and derives its children by hand. Record a candidate's origin with
`pipeline-patch.mjs record-candidate … --source hand|pixellab`.

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
Stage 1 gap-fill.

**The interview ASKS — it never silently assumes the defining parameters.** Explicitly ask the user
(batched `AskUserQuestion`, 2–4 per call, parallel calls fine) for, at minimum: **resolution / canvas
size** (e.g. 32×32 — do not silently default to 32), **frame rate (fps)**, **which keyframes** (the
master + exactly which children/variants — seasons? damage states? growth stages? — enumerated, not
assumed), **which animations** (which keyframes get a looping idle, which pairs get a transition),
**candidates per step** (1/2/4), and **human-gated vs autonomous**. A "default if unanswered" is a
*fallback only when the user declines*, not the assumed-silent path.

**Offer reusable presets so the user skips re-specifying.** At the start of intake run
`pipeline-patch.mjs preset-list`; if a saved preset fits, offer "reuse preset `<name>`?" (→
`preset-apply <name>`) so they don't re-answer canvas/fps/candidates each time. After configuring a new
family, offer to `preset-save <name>` the chosen settings for next time. Presets are an opt-in
convenience — they do **not** license silently assuming settings (still ASK per the paragraph above).

**When to read:** `references/intake.md` — the (asking) interview questions, the preset offer, how to
write the `items[]` entry, building the proposal, and the approval gate.

## The four stages

The pixel pipeline **ends at the produced frames + preview GIF** (Stage 4). Pushing those into the
Godot project is a **separate, on-demand step that is not part of the pipeline** — see
"Updating Godot is a separate step" below.

```
                 G1                       G2          G3                       G4
 references → 0 ──┐         ┌─ 2 ─────────┐   3 ──────┐         ┌─ 4 ──────────┐
 manifest   → 1 ─ critique  │ KEYFRAMES   │ critique  │ critique│ ANIMATE      │ critique → frames + GIF
                  prompt    │ hand (Asep) │  still    │ storybd │ (Aseprite,   │ montage    (pipeline ends)
                            │  and/or     │ (compare  │         │  hand-built, │
                            │ PixelLab    │  sources, │         │  per-frame;  │
                            │ → 1 pool,   │  pick 1)  │         │  endpoints = │
                            │ pick best   │           │         │  keyframes)  │
                            └─────────────┘           └─────────┘──────────────┘
                                                                       ┊ separate, on-demand step ┊
                                                                       └→ node tools/update-godot-tiles.mjs
                                                                          → v2 .tres + in-engine verify
```

| # | Stage | What happens | Tool |
|---|-------|--------------|------|
| **0** | Extract style spec | Read references; pull canvas + palette ramps + hue-shift; transcribe light/outline/perspective/fps. | Aseprite `analyze_reference` / `get_palette` / `analyze_palette_harmonies` |
| **1** | Plan the set | Diff `pipeline.json`'s items (master/children/animations) by **shape** against themselves + files on disk; **only the gaps proceed**. Gather sibling priors. (`build_viewer.mjs --plan` prints the action list.) | — (read `pipeline.json`) |
| **2** | Generate keyframes (**source-pluggable**) | Build a candidate **pool** per keyframe from either/both sources, then G2 picks the best. **Hand (home-grown):** author a master in Aseprite (draw, or trace a sibling); derive a child by `import_image`-ing the approved master PNG and editing it. **PixelLab (optional):** `create-object` review pack → `select-frames`; child via `state` on the master's `objectId`. Record each with `pipeline-patch.mjs record-candidate … --source hand\|pixellab`. **Runs without PixelLab.** | **Aseprite** (hand) and/or **PixelLab** (`scripts/pixellab.mjs`) |
| **3** | Storyboard | For each idle/transition, fill `assets/storyboard.template.md` **against the approved keyframe(s)**, citing real pixel coords: frame count, fps, per-frame force + easing + the concrete pixel-level change. For a transition, f0 = the `from` keyframe and fN = the `to` keyframe exactly. | pixel-art-animation skill |
| **4** | Animate (**Aseprite, by hand**) | Author every frame in Aseprite per the storyboard — additive-overlay / flexing-base recipe, the two real keyframes locked as the transition endpoints. **No PixelLab v3.** Export `frames/<id>/NN.png` + `previews/<id>.gif`. **The pipeline ends here. Labor-intensive.** | **Aseprite** (`references/aseprite-execution.md`) |

### Publishing to the game is a separate MANUAL session (the pipeline never does it)

**The pixel pipeline ends at the produced frames + preview GIF. It never renders into the game.**
Getting the produced frames into the engine — pack frames → v2 `.tres`, import, verify in-engine — is
a **deliberate, out-of-scope step the USER runs by hand in a separate session**, **never automatically
by a pipeline run, and never as a side effect of the `npm` build**. This is by design, not a TODO the
pipeline should close: a run hands back frames + GIF and stops. Do **not** invoke
`npm run godot:update-tiles` (or `integrate.mjs`) as part of a pipeline run — leave in-game publishing
to the user. The how-to below (and `references/godot-integration.md`) is the reference for when the
**user** chooses to publish; the pipeline itself never triggers it.

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
3. **Optional human-approval gate (the viewer-driven closed loop).** When `settings.humanApproval` is
   true (and `autonomous` false), the orchestrator **blocks on `pipeline-patch.mjs await-review`** while
   the human reviews in the **pixelGen viewer**. The human drives the *whole* gate from the browser —
   approve/select a candidate, "Reject all", comment, edit a prompt, reject/comment an animation — then
   clicks **"Done reviewing — resume run"**, which unblocks `await-review`. **The human no longer types
   anything in chat.** The full handshake is in §"The viewer-driven human gate" below. The control
   server writes each decision back across the split: `selected` + `selectedPath` to `pipeline.json`,
   the candidate's `status: "approved"` to `pipeline.history.json`. When `settings.autonomous` is true
   the gate is skipped and the LLM verdict decides what to approve. In the autonomous path, **record the
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

### The viewer-driven human gate (the closed loop — no chat needed)

At a human-approval checkpoint the orchestrator runs a **closed loop driven entirely from the
browser**. The human never has to switch to chat and type "I approved, continue" — the pixelGen viewer
is the *whole* gate surface, and a single blocking CLI call (`await-review`) waits for the human to
finish. The protocol:

1. **Broadcast progress as you go.** Before each gated spend, set the viewer's run-state banner so the
   human sees what's happening:
   ```bash
   pipeline-patch.mjs run-state running "Stage 2: generating tile_corn candidates (2/4)"
   ```
   (`run-state` is `idle | running | waiting | done` + an optional free-text detail.)
2. **At the gate, mark `waiting` and BLOCK on `await-review`.**
   ```bash
   pipeline-patch.mjs run-state waiting "review 3 keyframes"
   pipeline-patch.mjs await-review            # ← blocks until the human resumes
   ```
   `await-review` flips `settings.reviewState = "reviewing"`, polls both data files (narrating each
   decision as it lands), and **does not return** until the viewer sets `reviewState = "resume"`. The
   human reviews in pixelGen — approving/selecting candidates, "Reject all" on a bad pool, commenting,
   editing a prompt, rejecting/commenting an animation — then clicks **"Done reviewing — resume run"**
   (the sticky resume bar POSTs `/api/resume`). `await-review` then unblocks and prints a
   machine-readable diff on the `AWAIT_REVIEW_RESULT <json>` line:
   `{ approved, rejectedAll, failedCandidates, comments, animations, promptEdits }`.
   (Defaults: timeout 3600 s, poll 2 s; on timeout it prints the partial diff and exits 3.)
3. **Consume the `AWAIT_REVIEW_RESULT` diff:**
   - **`approved`** keyframes → proceed (their `selected`/`selectedPath` are already written).
   - **`rejectedAll`** keyframes and **rejected `animations`** → re-run gap-fill. `build_viewer.mjs
     --plan` re-emits a rejected animation as `{ action: "animate", redo: true }` and re-seeds the
     `failed` candidates of a reject-all'd pool, so regenerate against the plan.
   - **`comments`** (keyframe or animation) → **act on the feedback, then clear it** so the viewer's
     "feedback pending" chip clears. This is the comment-consume contract — **read → act → clear**:
     ```bash
     pipeline-patch.mjs clear-comment <item> <keyframeId>          # a keyframe comment
     pipeline-patch.mjs clear-comment <item> <for>__idle          # an idle's comment (selector)
     pipeline-patch.mjs clear-comment <item> <from>__to__<to>     # a transition's comment (selector)
     ```
   - **`promptEdits`** → the new prompt is already in `pipeline.json`; regenerate that keyframe against
     it (no extra step to read it — just re-generate).
4. **Resume the run.** Broadcast `run-state running …` again and continue to the next gated event. At
   the very end, `pipeline-patch.mjs run-state done`.

So the gate is: `run-state waiting` → `await-review` (blocks) → human clicks **resume** in the browser
→ consume the diff (regenerate rejects, act-then-`clear-comment` feedback) → `run-state running`.
Nothing in chat.

### Master → children hierarchy

The `items[]` nesting **is** the derivation graph: each item has **one `master`** keyframe and its
**`children`** (variants derived from the approved master). There is **no `master:true` flag and no
`derivesFrom` pointer** — a `child` derives from the item's `master` purely by position. A child is
only eligible to generate once its master's `selected` is non-null (approved — `selected !== null` is
the approval signal) **and** its `objectId` is recorded (that's what `state` derives from); gap-fill
reads candidate counts from the merged history view and enforces this structurally. See
`references/manifest-schema.md` §"Gap-fill is structural".

**`objectId` is the keyframe-derivation handle.** Approving a candidate records its PixelLab object
id onto the keyframe (`pipeline-patch.mjs approve` denormalizes it from the candidate, exactly like
`selectedPath`). Child `state` calls take that id (it's how a winter variant is derived from the
autumn master). PixelLab objects persist (unlike 8-hour map objects), so an approved family can keep
deriving new keyframes **months later** without regenerating the master — protect the ids; losing
one means re-promoting a master. (Animation does **not** use `objectId` — Aseprite animates from the
approved keyframe **PNGs**, not the PixelLab object.)

### Storyboard comes *after* the still

Write the storyboard (Stage 3) **against the approved keyframe(s)**, not before them — fill
`assets/storyboard.template.md`: `get_pixels` (or Read) the real keyframe and **cite real
coordinates** in the per-frame plan (citing a coordinate that turns out transparent bit us once on a
winter-glint pixel). Name the **forces and the order things change** ("leaf clumps detach edge-first,
flutter down on arcs; branches reveal; snow accumulates last"). For a **transition**, the storyboard
locks **f0 = the `from` keyframe and the final frame = the `to` keyframe** (both imported as real
cels), and plans only the inbetweens. This is why Stage 3 sits *after* Stage 2 in the flow.

## Tool routing (what executes what)

> **Pre-flight: prefer `scripts/pixellab.mjs` over raw MCP calls.** The CLI wraps the whole async
> create → poll → download loop in one command, reads/writes image files directly (so **base64
> frames never pass through the LLM** — hand-emitted base64 corrupts), and prints a JSON result
> line. If you do need a raw MCP call, the tools are almost always **deferred** — bulk-load schemas
> first with `ToolSearch "aseprite"` / `ToolSearch "pixellab"`, or the call fails with
> `InputValidationError`. A param cheat-sheet for the common Aseprite tools is in
> `references/aseprite-execution.md`.

**Keyframes (Stage 2) — pick a source per candidate; both feed one G2 pool:**
- **Hand (home-grown, no PixelLab) — masters:** author in Aseprite — `create_canvas` and draw with
  the primitives + conformance helpers (`quantize_palette` to the locked ramps, `apply_shading`,
  `apply_outline`), or `import_image` a sibling tile and edit it. Export to the keyframe dir, then
  `pipeline-patch.mjs record-candidate … --source hand`.
- **Hand — children:** `import_image` the **approved master PNG** onto a layer and edit it into the
  variant (recolor, add frost/snow, wither). Same size/anchor by construction. Record `--source hand`.
- **PixelLab (optional) — masters:** `pixellab.mjs create-object` (review pack; `--style` = prior
  PNGs ≤256px for image conditioning) → `select-frames` → record `--source pixellab --object …`.
  Check credits first (`pixellab.mjs balance`).
- **PixelLab (optional) — children:** `pixellab.mjs state --object <master objectId>` (needs a
  PixelLab master). **Never a from-scratch text generation of a child** — that's the
  size-jump/stem-flip regression.
- **Either way, G2 compares the whole pool and approves one** (`pipeline-patch.mjs approve`), which
  records the winner's `source` on the keyframe.

**Animation (Stage 4) — Aseprite, by hand:**
- **Idles AND transitions** — authored frame-by-frame in Aseprite via
  `mcp__plugin_pixel-plugin_aseprite__*`, following the additive-overlay / flexing-base recipe in
  `references/aseprite-execution.md`. **Aseprite is the only animator — no PixelLab v3, no
  procedural Pillow frame generation, ever.** A transition imports its two approved keyframes as the
  locked first/last cels and hand-builds the inbetweens between them.
- **Pillow** — review glue **only**: `scripts/montage.py` (G2/G4 review sheets) and `scripts/gif.py`
  (assemble the preview GIF from the exported frames, if you don't use Aseprite's own gif export).
  Pillow never generates art or motion.
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

> **Start the control server FIRST, at the top of a run — not at the end.** Before any spend, launch it
> in the background with **`npm run pixelgen:serve`** (the alias for
> `node scripts/serve_viewer.mjs`; siblings: `pixelgen:build`, `pixelgen:plan`, `pixelgen:show`) and
> point the human at **http://localhost:8100/pixelGen/**. Its `build_viewer.mjs --watch` child re-emits
> `data.json` whenever `pipeline.json` changes, so as you record progress through `pipeline-patch.mjs`
> (candidates generated → approved → animations done) the page **updates live** and the human watches
> the family fill in. Running it only at the end defeats the purpose — the viewer is a *progress
> monitor*, not just a final report. (Leave it running the whole session; it also serves the intake
> proposal and the await-review human gate.)

> **Health-check before you rely on a running server (the stale-server trap).** A server left running
> from another worktree/checkout serves the **wrong** `pipeline.json` and holds port 8100, so a new run
> can't bind it. Before trusting it, hit the liveness probe:
> ```bash
> curl -s localhost:8100/api/health     # → {"ok":true,"pipelinePath":"…","port":8100,"startedAt":"…"}
> ```
> If `pipelinePath` is **not** this worktree's `godot/assets/tiles/v2/pipeline.json`, the server is
> stale — kill the old node process and restart with `npm run pixelgen:serve`.

The review **viewer** (built by `scripts/build_viewer.mjs` into `pixelGen/`, served at
**http://localhost:8100/pixelGen/** via `npm run pixelgen:serve` / `scripts/serve_viewer.mjs`) renders
the set's keyframes, candidate seeds, idle GIFs, and transitions on one page so you can eyeball
cohesion across the whole family and confirm the idles/transitions read right in context — the
human-facing end of the G4 montage check **and the await-review human gate**. The control server
(`serve_viewer.mjs`) accepts the viewer's decisions over POST `/api/{select, approve, regen, comment,
reject-all, prompt, resume, anim-reject, anim-comment}` (+ `GET /api/health`) and **patches the
three-file model in place**, splitting each patch by what it owns: `select`/`comment`/`prompt`/the
preference half of `approve`/`reject-all`'s selection-clear/`resume`/`anim-*` write `pipeline.json`;
`regen` and the record half of `approve`/`reject-all` write `pipeline.history.json` (candidate
`status`/`reason`). Its spawned `build_viewer.mjs --watch` child re-emits `data.json` so the page
re-polls live. It doubles as the **intake proposal surface** (all-pending before a run; the same cards
fill with art after).

**What the viewer can now do (the gate is the whole browser surface):**
- **One-click Approve / Select** on each candidate (writes `selected`/`selectedPath` + history).
- **"Reject all"** on a keyframe — every candidate → `failed` (re-seeded by gap-fill), selection
  cleared.
- **Animation Reject + comment** controls (an `anim-reject` flips the GIF to `rejected` → gap-fill
  re-animates it `redo:true`).
- **Comment round-trip** on keyframes and animations, with a **"feedback pending"** chip that clears
  once the orchestrator `clear-comment`s the consumed note.
- **Editable keyframe prompt** in place (no hand-editing `pipeline.json`).
- **Frame scrubber** on each animation, and a **click-to-zoom overlay** with a **3×3 board tiling** so
  you can judge a tile in context.
- A **priors strip** per item (the family/cohesion references).
- **Needs-you highlighting + float-to-top** so the keyframes awaiting your decision surface first.
- A **run-state banner** (the orchestrator's progress) and a sticky **"Done reviewing — resume run"**
  bar that POSTs `/api/resume` to unblock `await-review`.
- **Read-only mode:** if no control server is reachable (e.g. a published static snapshot), the page
  says so calmly — *"Read-only — no control server. Decisions and comments won't be saved."* — and
  hides the write affordances rather than silently dropping clicks.

Iterate: **build → montage (G4) → viewer → tune storyboard/params → re-animate** until the family reads
as one set.

## Bundled files — when to read each

| File | When to read |
|------|--------------|
| `references/intake.md` | **Intake** — the interview (which **asks** canvas/fps/keyframes/animations/candidates/gate, never silently assumes them; offers reusable presets) that turns "make me N tiles" into a `pipeline.json` `items[]` entry + the pixelGen proposal, before any spend. |
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
| `scripts/build_viewer.mjs` | Reads + schema-validates `pipeline.json` **and** `pipeline.history.json` via `manifest.mjs` (REFUSES on invalid data; missing sidecar → degraded mode, approved art from `selectedPath`), emits `pixelGen/data.json` + copies the `viewer/` template (the review viewer / intake proposal). Also surfaces the orchestrator's `runState` + the `reviewState`-derived `awaitingHuman` flag the viewer's banner/resume-bar read. `--watch` re-emits `data.json` on change (watches both data files); `--plan` (alias `npm run pixelgen:plan`) prints the structural gap-fill action list off the merged view as JSON without building — `generate-master` / `generate-child` / `animate` (a viewer-rejected animation re-emits as `{ action: "animate", redo: true }`) / `reseed` (re-seeds the `failed` candidates a "Reject all" left behind). |
| `scripts/serve_viewer.mjs` | The pixelGen **control server** (`npm run pixelgen:serve`): static-serves the viewer + the v2 asset tree, and on POST `/api/<action>` — `select` / `approve` / `regen` / `comment` / `reject-all` / `prompt` / `resume` / `anim-reject` / `anim-comment` — validates then **patches the three-file model in place**, writing only the file(s) the action owns (preference/comment/prompt/resume/anim-* → `pipeline.json`; `regen` → `pipeline.history.json`; `approve`/`reject-all` → both, history first). `GET /api/health` → `{ok, pipelinePath, port, startedAt}` (the stale-server check). All load/validate/write via `manifest.mjs`. Spawns `build_viewer.mjs --watch` so patches rebuild `data.json`. Default port 8100 (`$PORT`). |
| `scripts/pipeline-patch.mjs` | **Three-file bookkeeping CLI** for the orchestrator (the headless counterpart to the viewer's buttons) — `record-candidate` / `approve` / `reject "<reason>"` / `reject-all "<reason>"` / `animate-done <selector> <gif> [storyboard]` / `set-mode autonomous\|gated` / `run-state <status> ["detail"]` / `clear-comment <item> <keyOrSelector>` / `await-review [--timeout N] [--interval N]` / `preset-save\|preset-list\|preset-show\|preset-apply` / `show`. `run-state` + `await-review` drive the **viewer human gate** (broadcast progress, then BLOCK until the human clicks resume, printing `AWAIT_REVIEW_RESULT <json>`); `clear-comment` consumes acted-on feedback; the `preset-*` commands manage reusable generation-setting bundles for intake. Writes the same split as the control server via `manifest.mjs` (candidate records → `pipeline.history.json`; `selected`/`selectedPath`, animation status/gif/storyboard, mode, run-state, presets → `pipeline.json`), atomic temp+rename. Use it instead of hand-editing the JSON in an autonomous run (a dropped comma silently breaks the pipeline). |
| `scripts/integrate.mjs` | The **Godot update engine** (a separate step, **not** a pipeline stage; exposed as `tools/update-godot-tiles.mjs` / `npm run godot:update-tiles`, which imports its `main`). Loads + schema-validates `pipeline.json` via `manifest.mjs` (REFUSES on invalid data; needs only the spec, not history) → `--import` → verify every frame PNG got a `.png.import` sidecar (**re-import once** if any missing) → `git checkout godot/project.godot` → `assemble_tres.gd` per idle → `verify_sf.gd`. Work list from `pipeline.json` (idles whose keyframe is approved via `selected !== null` + `status: generated`) or explicit `<framesDir> <outTres>` pairs; `--list` dry-runs the work list as JSON with no Godot binary. |
| `scripts/pixellab.mjs` | The PixelLab **keyframe** client + importable module (Stage 2 only — keyframes; **not** animation). `balance` checks credits. **Object flow:** `create-object` (review pack of candidate seeds; `--style a.png,b.png` = image conditioning on priors; downloads every `cand_NN.png`) → `select-frames --indices` (promote audited picks; each becomes a persistent object) → `state --object <id>` (derive a child keyframe from a master, identity/size-preserving) → `fetch-frames` (resume/re-download) → `object --id` (raw `get_object`, debug). Legacy `create` (text-only map-object still) remains for one-offs. All image payloads are read/written as files — base64 never passes through the LLM. Token from `$PIXELLAB_TOKEN` or `~/.claude.json` (never logged). **Escape hatch (NOT the pipeline path):** an `animate`/`fetch-anim` v3 path exists for prototyping only — **the pipeline animates in Aseprite**; do not use it to produce shipped motion. |
| `scripts/pixels.mjs` | PNG **opaque-pixel feature map** helper — read a still's non-transparent pixels / diff two stills, so the storyboard can cite real coordinates (which pixels exist, what changed). |
| `scripts/montage.py` | G2/G4 review glue (**Pillow only**): upscale a still (`--scale`) or montage a `frames/<id>/` folder or a GIF for Read-and-judge. |
| `scripts/gif.py` | Preview-GIF assembly (**Pillow, review glue**): `frames/<id>/ --out previews/<id>.gif --fps 10` — a convenience if you're not using Aseprite's own `export_sprite` gif. The exported frames stay the shipped artifact. |
| `scripts/assemble_tres.gd` | Pack `frames/<id>/NN.png` (sorted) into a v2 SpriteFrames `.tres` — one looping `idle` animation at the project fps. Copied into `godot/tools/` and run as `res://tools/assemble_tres.gd`. |
| `godot/tools/verify_sf.gd` | Verify a built `.tres` satisfies the v2 tile contract (one looping `idle` with N frames). Invoked by `integrate.mjs` as `res://tools/verify_sf.gd`. |

## Status

**The split is locked: keyframes = source-pluggable stills (hand-authored Aseprite and/or PixelLab,
compared in one G2 pool); animation = Aseprite (hand-built).** The pipeline **runs fully without
PixelLab** — PixelLab is one optional keyframe source, swappable at Stage 2 (the only place it's
touched). Each candidate carries `source: hand|pixellab`; the winner's source is recorded on the
keyframe. Stage 4 animates **only in Aseprite** per `references/aseprite-execution.md` — every idle
and transition authored frame-by-frame, with a transition's two approved keyframes locked as its
first/last cels (PixelLab's `animate`/v3 is an out-of-pipeline escape hatch, not used for shipped
motion). Supporting pieces: intake, the builder/critique gate prompts, the `build_viewer.mjs` viewer
+ `viewer/` template + `serve_viewer.mjs` control server, the shared `manifest.mjs` seam, the
`pipeline-patch.mjs` bookkeeping CLI (records `source`/`objectId`), and the **separate** Godot update
step — `tools/update-godot-tiles.mjs` (`npm run godot:update-tiles`) over `integrate.mjs`
(`assemble_tres.gd` + `verify_sf.gd`). Committed inputs: `godot/assets/tiles/v2/_style-spec.json` +
the three-file pipeline (`pipeline.json` / `pipeline.history.json` / `pipeline.schema.json`) with the
`birch_tree` and `pumpkin` items. Reference output: **size/identity-consistent keyframes** (winter
derived from the autumn master) with **Aseprite-built idles + transitions** whose endpoints are the
two keyframes (so idle→transition→idle chains seamlessly). A fresh **first run on a new family**:
intake (or Stage 1 gap-fill — `build_viewer.mjs --plan`), then author/generate keyframe candidates
from your chosen source(s), pick the best at G2, and animate in Aseprite.
