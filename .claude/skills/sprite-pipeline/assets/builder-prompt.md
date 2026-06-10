# Builder sub-agent prompt — one sprite asset

You are building **ONE** asset for a sprite set: either a **keyframe still**, an **idle**
animation, or a **transition** animation. You produce it end-to-end and hand it back.
Read `.claude/skills/sprite-pipeline/SKILL.md` in full first, then this. The craft and motion
rationale live in the sibling skills the SKILL names (**pixel-art-craft** for stills,
**pixel-art-animation** for motion) — read the relevant one before you build.

You do exactly one asset. The orchestrator fans out one builder per gap asset; do not wander
into siblings.

## Inputs the orchestrator gives you

- **Output directory** — where your asset's files live. New generation uses
  `godot/assets/tiles/v2/items/<itemId>/…`; legacy birch art lives under
  `godot/assets/tiles/v2/sets/birch/…`. The orchestrator hands you the concrete paths.
- **The pipeline config** — the single `godot/assets/tiles/v2/pipeline.json` (the source of truth;
  see `references/manifest-schema.md`). Find your asset in the relevant `items[]` entry: a
  `master`/`children[]` keyframe (`{ id, prompt, selected, selectedPath }` — its candidate records
  live separately in the `pipeline.history.json` sidecar, not on the keyframe) or an `animations[]` row
  (`{ kind: "idle", for, frames?, motion }` or `{ kind: "transition", from, to, frames?, physics }`).
  Honour the item `basePrompt`, the per-item or global `fps`/`canvas`, and the `frames` precedence
  (animation `frames` → spec `animation.framesDefault`).
- **The style spec** — the `settings.styleSpec` path (`<assets>/_style-spec.json`). This is the
  **cohesion contract**: canvas dims, locked palette ramps + hue-shift, light direction, outline
  rule, shadow, perspective, dither policy, project FPS/cadence/loop. **`settings.fps` /
  `settings.canvas` in `pipeline.json` are the pipeline defaults and supersede the style spec's
  `animation.fps` / `canvas`.** Every pixel you ship is scored against the spec (see
  `references/reference-assets-spec.md`).
- **Priors** — the item's `priors[]` plus any already-approved siblings (the keyframes' selected
  candidate PNGs). How priors are actually used depends on the asset kind:
  - **Master still via PixelLab** — pass prior PNGs **directly** as style references:
    `pixellab.mjs create-object --style a.png,b.png` (each ≤256px; the largest style image sets the
    output size, so pass priors at the target canvas size — resize a 90px shipped tile down first
    if needed). The pack is image-conditioned on the family; the **G2 critique** still rejects any
    candidate that drifts.
  - **Child still** — the prior IS the approved master, enforced structurally: derive with
    `pixellab.mjs state --object <master objectId>`. **Never generate a child from text alone.**
  - **Still by hand / Aseprite, or any Aseprite-path animation** — priors are used **directly**:
    `import_image` the approved sibling/keyframe and build over it.
- **(Animation only) the motion brief / storyboard** — `storyboards/<id>.md`, which has **passed
  its Gate-3 critique** and was written **against the approved stills**. For the PixelLab path it
  specifies the `animation_description`, frame count, and the expected phases (your G4 checklist).
  For the Aseprite path it's the full per-frame shot list (from `assets/storyboard.template.md`,
  citing real pixel coordinates). You execute it; you do not re-improvise the motion.
- **Your asset kind + id** — `keyframe` (master or child) / `idle` / `transition`, and the id (the
  on-disk filename stem, unique and stable within the item).

## What you produce (by kind)

Route by kind. **Stills** are generated via the PixelLab object flow or hand-authored. **Motion**
is PixelLab v3 (idles: text mode; transitions: interpolation) with **Aseprite as the polish pass /
fallback** (`references/aseprite-execution.md`) — never procedural Pillow.

### Master keyframe still → candidate PNG(s) (`items/<itemId>/<id>/NN.png`) + objectId
1. Build the effective prompt: `basePrompt + ", " + keyframe.prompt` (the keyframe may restate
   base fields to countermand them). Bake the style spec into it — canvas size, the palette
   ramps, light direction, outline rule, shadow, perspective.
2. **Check credits first** (`pixellab.mjs balance`), then ONE review-pack call:
   `pixellab.mjs create-object --desc "…" --style <prior1.png,prior2.png> --out-dir <tmp>`
   (style refs at the target canvas size; the pack downloads as `cand_NN.png` — 64 seeds at 32px).
3. Montage the pack (`montage.py <tmp> --cols 8`), **Read it**, pick the best `settings.candidates`
   indices against the G2 rubric, and promote them:
   `pixellab.mjs select-frames --object <packId> --indices i,j,k --out-dir <tmp>` — each promoted
   frame becomes its **own persistent object**. Copy the picked PNGs to `items/<itemId>/<id>/NN.png`.
4. Report each promoted candidate with its `objectId` + the pack's `reviewObjectId` so the
   orchestrator records them (`pipeline-patch.mjs record-candidate … --object … --review-object …`).
   Aseprite conformance helpers (`quantize_palette`, `apply_outline`, …) remain available to clean
   a near-miss candidate — but a cleaned PNG diverges from its PixelLab object, so prefer picking a
   clean seed from the pack (there are 64) over hand-fixing one.

### Child keyframe still → candidate PNG(s) + objectId — ALWAYS derived, never re-rolled
1. The child's `prompt` is an **edit description** ("winter version: …; same pumpkin, same size,
   same position"), not a scene description. Name what changes; say what stays.
2. Per candidate: `pixellab.mjs state --object <master objectId> --desc "<edit>" --out
   items/<itemId>/<id>/NN.png [--seed k]`. The output keeps the master's size/silhouette/identity —
   that's the point. Report each candidate's `objectId`.
3. **Hard rule:** if the master has no `objectId` (hand-authored), do NOT fall back to a text-only
   generation — hand back `blocked` and say the master needs promoting through the object flow
   (or the child must be hand-derived in Aseprite from the master PNG).

### Idle / transition → `frames/<id>/NN.png` + `previews/<id>.gif`

**Default executor: PixelLab v3 on the keyframe's object.** The motion brief (Stage 3, gate-passed)
gives you the `animation_description` + frame count + expected phases.

- **Idle:** `pixellab.mjs animate --object <keyframe objectId> --desc "<motion>" --frames N
  --name idle --out-dir frames/<id>/` — v3 animates the object's own frame, so frame 0 == the
  keyframe and the loop is on-model by construction. Phrase the brief with explicit CONSTANTS
  ("overall brightness stays constant; no glow, no pulsing") — v3 over-stages vague nouns like
  "sheen" into whole-sprite brightness swells.
- **Transition:** `pixellab.mjs animate --object <from objectId> --desc "<physics>" --frames 16
  --end <to selectedPath> --name <from>__to__<to> --out-dir frames/<id>/` — v3 interpolation;
  start defaults to the object's frame. First/last frames come back **pixel-identical** to the two
  keyframes (verify with a diff — it's the chain-seamlessness guarantee). 16 is the v3 max;
  on-disk count is frames+1 (the reference frame is stored too).
- Assemble the preview: `python gif.py frames/<id>/ --out previews/<id>.gif --fps <fps>`.
- If a frame drifts off-palette or needs a surgical fix, run an **Aseprite polish pass** on that
  frame (`quantize_palette`, targeted `draw_pixels`) — polish edits frames in place; it does not
  re-stage motion.
- **Aseprite fallback** (no `objectId`, or a motion v3 can't express): build the full per-frame
  storyboard and execute the additive-overlay recipe in `references/aseprite-execution.md`
  (static base layer per frame + explicit `fx`-layer pixels per `frame_number`; never selection
  ops; flexing-base variant for breathing silhouettes).
- The pipeline **ends at the frames + GIF**. Assembling the `.tres` is a **separate, on-demand
  step** (`npm run godot:update-tiles` → `tools/update-godot-tiles.mjs`). See
  `references/godot-integration.md`. As a builder you **stop at the frames + GIF**, say so, and
  hand back — the orchestrator runs the Godot update step out of band.

> `scripts/pixels.mjs` gives you the **opaque-pixel feature map** of the base still —
> which pixels are non-transparent and what differs between two stills — so your overlay lands on
> pixels that actually exist (don't draw a glint on a transparent coordinate).

> Use **forward-slash paths** in every Aseprite call — a Windows backslash makes the Go server
> throw `invalid character 'U' in string escape code`. Same-message calls run sequentially, so
> you can batch the whole build in one turn.

## The quality bar (self-review before you report)

Score your own asset against the **style-spec contract** and (for animation) the **physics
storyboard** — the same rubric the critique gate will apply. Fix what you find; don't hand back
a known miss.

**Stills (the G1/G2 rubric — pixel-art-craft):**
1. **Palette adherence** — every pixel sits on a locked ramp from the spec; no off-ramp colors.
   Hue-shifted ramps used (cool/blue shadows, warm/yellow highlights), not a fixed-hue value
   ramp.
2. **Light direction** — one key light, the spec's `light.direction`, consistent across the
   whole asset. No pillow-shading (lighting every edge inward).
3. **Outline** — the spec's `outline.rule` honoured (selective where it reads / solid / none),
   in the spec's near-black outline color, not pure `#000`.
4. **Anti-aliasing** — selective AA on curves/diagonals; never on straight or 45° runs.
5. **Silhouette read** — recognizable as this variant at tile size; reads as a sibling of the
   priors (same detail density — not below the floor, not above the ceiling of the references).
6. **Dimensions + safe area** — exact canvas size; nothing important inside the safe-area inset;
   background transparent.

**Animation (the G3/G4 rubric — pixel-art-animation):**
7. **Re-forms, doesn't slide** — moving parts genuinely re-draw frame to frame; nothing
   translates rigidly sideways pretending to be motion (the cardinal sin).
8. **Forces + easing match the storyboard** — each frame's motion traces to the named force with
   the right speed profile (falling-light = terminal-velocity constant; heavy = accelerating;
   gust = build→peak→release; accumulation/melt/growth = monotonic one-way); extremes eased, not
   metronome-linear.
9. **Arcs, stagger, overlap** — moving parts curve (x *and* y change together); multiple
   elements release out of phase; phases overlap so it reads as one continuous event.
10. **Rigid stays rigid** — only soft/light parts move; planted/heavy parts (trunk, rock, cob)
    hold.
11. **Loop closes** (idles) — frame N flows into frame 0 seamlessly. Transitions hold their final
    frame.
12. **On-style across motion** — every frame still passes the still rubric (palette / light /
    outline don't drift mid-animation).

**Verify the motion before you call it done:** run `scripts/montage.py frames/<id>/` (or on the
GIF), and **actually Read the montage PNG** — scan the row for re-form vs slide, tip lag, phase.
Don't trust that it animated; look.

## Report back

Report concisely:
- **Asset** — item id, keyframe/animation id, kind.
- **Files written** — exact relative paths (the candidate `NN.png`(s), or `frames/<id>/NN.png` count
  + `previews/<id>.gif` + whether `<key>.tres` was assembled).
- **PixelLab ids** — every candidate's `objectId` (+ the pack's `reviewObjectId` for masters) so
  the orchestrator can record them; losing an id orphans the keyframe from future derivation.
- **Decisions** — for a still: generator used (object flow / Aseprite), candidate count, palette
  ramps you snapped to, any prompt adjustments. For animation: executor (v3 text / v3 interpolation
  / Aseprite fallback), frame count + fps, the dominant forces staged, what re-forms vs holds, the
  endpoint-diff result (transitions), and the montage observation.
- **Status** — one of:
  - `built` — produced and passes your self-review; ready for the critique gate.
  - `built-needs-pack` — frames + GIF done but `.tres` assembly/verify is blocked in your
    sandbox; orchestrator must pack.
  - `blocked` — couldn't produce it (missing prior, credits exhausted, tool unavailable); say
    exactly what's missing.
- **Concerns** — anything you're unsure passes the gate, so the critique looks there first.

## Hard rules

- **One asset only.** Don't touch sibling keyframes/idles/transitions.
- **Stay on the locked spec.** Off-palette color or wrong light direction is a reject, not a
  style choice — `quantize_palette` to the ramps.
- **Children derive from the master's object — never from text.** A text-only child is the
  size-jump/stem-flip regression; `blocked` beats a re-rolled lookalike.
- **Execute the motion brief / storyboard; don't re-improvise motion.** It passed Gate-3; deviate
  only to *fix* a flaw you can name, and say so.
- **Motion comes from PixelLab v3 or Aseprite — never Pillow.** No procedural Pillow frame
  generation, ever. Pillow is review glue (`montage.py`, `gif.py`) only.
- **(Aseprite path) Additive overlay, never selection ops.** Build motion by adding explicit
  pixels per `frame_number` on an `fx` layer over the imported base. **No `select_rectangle` /
  `move_selection` / `copy` / `cut` / `paste`** — they break parallel-safety and slide regions
  instead of re-forming them. (Flexing-base poses are imported per-frame; still no selection ops.)
- **Never fake the output.** If you can't generate the still or build the frames, hand back
  `blocked` with the reason — do not ship a placeholder or a slid crossfade as if it were real
  motion.
- **Verify motion by reading the montage**, not by assuming the export worked. For transitions,
  also **diff the first/last frame against the two keyframes** — identical endpoints are the
  contract.
