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
  `master`/`children[]` keyframe (`{ id, prompt, selected, candidates }`) or an `animations[]` row
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
  candidate PNGs). Pass these as visual context so your asset inherits the family's
  silhouette / palette / detail density and stays continuous.
- **(Animation only) the filled storyboard** — `storyboards/<id>.md` (from
  `assets/storyboard.template.md`), which has **passed its Gate-3 critique** and was written
  **against the already-generated keyframe still** (it cites real pixel coordinates). It is your
  shot list: frame count `N`, fps, per-frame force + easing + the concrete pixel-level change. You
  execute it; you do not re-improvise the motion.
- **Your asset kind + id** — `keyframe` (master or child) / `idle` / `transition`, and the id (the
  on-disk filename stem, unique and stable within the item).

## What you produce (by kind)

Route by kind. **Stills** may be generated or hand-authored; **all animation is Aseprite**
(`references/aseprite-execution.md`) — never procedural Pillow.

### Keyframe still → the candidate PNG(s) (`items/<itemId>/<id>/NN.png`)
1. Build the effective prompt: `basePrompt + ", " + keyframe.prompt` (the keyframe may restate
   base fields to countermand them). Bake the style spec into it — canvas size, the palette
   ramps, light direction, outline rule, shadow, perspective. A **child** keyframe is conditioned
   on its item's already-**approved** `master` (derive from it, don't reinvent the silhouette).
2. Generate `settings.candidates` seed(s):
   - **PixelLab** — the **pixellab** skill or `scripts/pixellab.mjs` (`create --desc … --out …`):
     async create → poll → download; **check credits first** (`pixellab.mjs balance`). Pass the
     priors for continuity. Each seed is one candidate `idx` → `NN.png`.
   - **Aseprite** — author/edit the still directly with the Aseprite draw primitives.
3. Lift it onto the family look with the conformance helpers in `aseprite-execution.md`:
   `quantize_palette` (snap to the locked ramps — the #1 cohesion failure is palette drift),
   `apply_shading` / `apply_auto_shading` (one-light form shading, not flat fills),
   `suggest_antialiasing` + `apply_outline` (the spec's `outline.rule`). Respect the safe-area
   inset; keep the background transparent.
4. Save the cleaned candidate still to its `NN.png` (the orchestrator records it inline in
   `pipeline.json`; the human/LLM gate picks which `idx` is approved).

### Idle / transition → `frames/<id>/NN.png` + `previews/<id>.gif` (+ assembled `<key>.tres`)

**Default method: the additive-overlay technique (parallel-safe + stateless).** Build motion as
**explicit pixels added per frame**, never by selecting and moving a region. This is the default
because it is what lets the orchestrator fan **one builder per gap animation out in parallel** (see
SKILL "Running agents concurrently"): every call is stateless — addressed by an explicit
`frame_number` + `layer_name`, so no hidden cursor/selection carries between calls.

1. Follow the **frame-assembly recipe** in `references/aseprite-execution.md` exactly:
   `create_canvas` → `save_as` to a stable `_work/<id>.aseprite` path (your own file — never shared
   with a sibling builder) → `add_frame`×(N−1) with `duration_ms = round(1000/fps)`.
2. **Import the approved base still onto a `tree` (base) layer at every frame** (`import_image`,
   reusing one `layer_name`, explicit `frame_number` per frame). This is the static foundation.
3. **Draw the motion as additive pixels on a separate `fx` layer**, per the **storyboard's
   pixel-level column** — `import_image` (a pre-rendered cel), `draw_pixels`, or `fill_area`, each
   with an explicit `frame_number`. **Never** `select_rectangle` / `move_selection` / `copy` /
   `cut` / `paste` — those depend on a hidden selection state and break parallel-safety (and slide
   regions instead of re-forming them).
4. `set_frame_duration` for endpoint/extreme holds → `create_tag` over `1…N` forward, named the
   spec's `animation.idleAnimationName` (`"idle"`).
5. Export: `export_sprite` png per frame (`frame_number: i`, two-digit names) →
   `frames/<id>/NN.png` (`00.png`, `01.png`, …); then `export_sprite` gif `frame_number: 0`
   (all frames) → `previews/<id>.gif`.
6. **Assemble the `.tres`** via `scripts/integrate.mjs` (it imports, verifies the `.png.import`
   sidecars, packs via `assemble_tres.gd`, and verifies via `verify_sf.gd` — one command). See
   `references/godot-integration.md`. If the Godot binary or `--import` is blocked in your sandbox,
   **stop at the frames + GIF**, say so, and hand back — the orchestrator runs `integrate.mjs`.

**The subtle-idle tradeoff.** A static imported base means the silhouette itself never breathes — the
overlay does all the moving. That's perfect for a falling leaf / glint / drifting snow over a still
tree, but a *whole-canopy sway* can read flat. For livelier idles, opt into the **flexing-base
recipe**: pre-render **2–3 base poses** (e.g. canopy leaned left / neutral / right) as extra base
cels and **cycle them** across frames so the silhouette breathes, then add the overlay on top. It's
still additive (each pose is imported to an explicit `frame_number`; no selection ops), so it stays
parallel-safe. See `references/aseprite-execution.md`.

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
- **Decisions** — for a still: generator used (PixelLab / Aseprite), candidate count, palette ramps
  you snapped to, any prompt adjustments. For animation: frame count + fps, base method
  (static-base vs flexing-base), the dominant forces you staged, what re-forms vs holds, and the
  montage observation.
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
- **Execute the storyboard; don't re-improvise motion.** The storyboard passed Gate-3; deviate
  only to *fix* a flaw you can name, and say so.
- **Aseprite is the only animator.** No procedural Pillow frame generation, ever. Pillow is
  review glue (`montage.py`) only.
- **Additive overlay, never selection ops.** Build motion by adding explicit pixels per
  `frame_number` on an `fx` layer over the imported base. **No `select_rectangle` /
  `move_selection` / `copy` / `cut` / `paste`** — they break parallel-safety and slide regions
  instead of re-forming them. (Flexing-base poses are imported per-frame; still no selection ops.)
- **Never fake the output.** If you can't generate the still or build the frames, hand back
  `blocked` with the reason — do not ship a placeholder or a slid crossfade as if it were real
  motion.
- **Verify motion by reading the montage**, not by assuming the export worked.
