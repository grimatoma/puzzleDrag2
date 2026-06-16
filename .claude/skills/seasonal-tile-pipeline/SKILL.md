---
name: seasonal-tile-pipeline
description: >-
  Generate the COMPLETE seasonal art set for one board tile in puzzleDrag2 and wire it into the game:
  the four season stills (spring/summer/autumn/winter), the three forward transition animations, and
  the per-season idle loops — all anchored to a shared style, QA-gated, packed into game spritesheets,
  and optionally hooked into the running Phaser board. Use this whenever the user wants to make, add,
  regenerate, or integrate the seasonal art for ANY tile / crop / produce / tree / flower / animal /
  resource subject — e.g. "make the seasonal sprites for the chicken", "add a new tile with all four
  seasons", "generate corn's spring/summer/autumn/winter + transitions", "build the season set + idle
  for the strawberry", "hook the willow into the game", "do this subject at 64px". Triggers on any
  request to produce a tile's seasonal stills, season lifecycle, season transition animations, idle
  loops, or to integrate seasonal tile art into the board. This is THE orchestration skill for the raw
  PixelLab v2 REST pipeline (it SUPERSEDES the old PixelLab-MCP-object approach). For pure static-art
  craft use pixel-art-craft; for motion craft use pixel-art-animation.
---

# Seasonal Tile Pipeline

Produce every seasonal asset for one board tile in one consistent style, validate it at each gate, pack
it for the game, and wire it into the Phaser board. This is the workflow that was built and validated
end-to-end on **willow, grass, eggplant** (+ the willow live in-game).

**Source of truth:** `docs/seasonal-tile-system/index.html` — the comprehensive design doc (decisions,
exact API schemas, the meta-prompt model + per-category playbooks, the validated results, gotchas). Read
it (or its relevant tab) before authoring prompts for a new subject; this skill is the procedure, the doc
is the reference.

## The core idea (read first)

A tile is a **constant subject in a constant pad**, re-*dressed* per season — never a lifecycle morph
(that was the old approach's root cause of drift). Identity (silhouette, pad, footprint, position) holds
across all four seasons; the season lives in **color, the ground pad, the light, and overlays** (blossom,
fallen leaves, frost, snow). Generate peak **Summer** as the style anchor, then derive the other seasons
as registered **edits** on the summer PNG. Consistency comes from the anchor image **plus a fully-quantified
prompt on every call** — each edit must carry the full framing geometry, the complete season dressing, and an
explicit identity/footprint + palette lock. **Thin one-line deltas were a primary cause of drift:** an
under-specified call lets the subject move, resize, and recolour between seasons. These prompts are **composed
from meta-prompt layers** (next section), never hand-written per state.

Two halves:
1. **Art generation** — PixelLab raw v2 REST (`tools/pixellab/pixellab.mjs`), config-driven via
   `run_subject.mjs`, gated and QA'd.
2. **Engine integration** — render the baked art on the Phaser board, season-aware, with idle + transition
   playback. See `references/engine-integration.md`.

Why gates: every generation costs credits + 30s–5min, and everything downstream inherits from the summer
anchor — a wrong anchor or off-model season is cheap to catch by eye and expensive to discover after the
next batch. **Stop and show the user at each ⟂ gate.**

## Prompt composition (the meta-prompt layers)

Prompts are **composed, not hand-written.** A thin subject config carries only identity + locks + per-subject
overrides; the composer (`tools/pixellab/prompts/`) layers the shared metas under it to emit a fully-quantified
prompt for **every** object state (summer generate, each season edit, each transition, each idle):

- `framing.mjs` — L0 style words + L1 framing geometry + the footprint lock (carried on every call).
- `seasons.mjs` — L2 the four season dressings (light / pad / palette / overlays), in full.
- `categories.mjs` — L3+L4 the 12 category playbooks (per-season delta, idle, transition, the deciduous
  bare-mound hinge + envelope lock, and the **constant-subject pixel-lock** for animals/minerals/objects).
- `compose.mjs` — `buildPlan(cfg)` → the plan; `renderPlanMarkdown` → a reviewable per-subject sheet.

**Authoring a subject = a thin config** (`subjects/<name>.mjs`):
`{ subject, category, size:128, decimateTo:64, identity, overrides, paletteLock, seeds }`. Tokens like
`{foliage}`/`{autumnColor}`/`{trunkNote}` in a playbook are filled from the subject's `overrides`. **Dump and
review the composed prompts before spending any credits** (the first ⟂ gate) — see Workflow step 0.

## Per-category playbook (how a subject moves through the year)

Pick the subject's category and follow its lifecycle. Full table + per-subject summer bases live in the
doc's "All tiles" tab; the essentials:

- **Deciduous tree** (oak/birch/willow): blossom-green → lush → gold+thinning+leaf-mound-begins → bare +
  snow-covered mound. Two-segment autumn→winter (autumn → **bare-mound** hinge → snow). **Bare-state
  envelope lock:** when stripping foliage, lock the bare crown to the summer canopy's outline/height/width
  and derive bare-mound from the *leafy autumn* — otherwise the bare branches sprawl past the envelope.
- **Evergreen tree** (fir/cypress/palm): keeps foliage; season in pad+light+snow-load; winter = snow-laden
  boughs, NO shed/mound.
- **Grass/groundcover**: fresh+flowers → lush+seedheads → golden-dry → flattened+frost/snow.
- **Grain**: green shoots → ripe golden heads → dry/bowed → cut stubble under snow.
- **Produce (veg/fruit)**: ripeness in **color/surface, footprint constant**: young+blossom → glossy peak →
  overripe/dull+fallen-leaves → frost-touched+snow pad.
- **Flower**: bud → full open → fading+seed → dormant under snow.
- **Animal** (bird/herd/cattle/mount): the creature is **CONSTANT** — season is pad+light+small accents
  (spring petals, autumn leaves, winter snow pad + a touch of fluff). Transitions are a ground/light
  cross-fade + a small settle (no body morph). Idle is **periodic** (peck/head-bob/tail-flick), kept subtle.
  **Lock the creature's own palette explicitly in the edit** ("keep the animal's colours unchanged, do NOT
  tint the bird") and apply the season light to the **ground/scene only** — otherwise the warm/cool season
  light recolours the whole animal (autumn turned a white chicken fully orange). Same for minerals/objects.
- **Mineral/ore**: rock is CONSTANT — season is entirely the pad+light (mossy/damp → dry → a leaf → snow-
  dusted+icy). Idle minimal (a faint gem glint).
- **Fish/aquatic**: season on the water pad + light (fresh → bright → leaves floating → icy/partly-frozen).

## Setup

- **Auth:** the PixelLab Bearer token is read at runtime from `~/.claude.json` (the `pixellab` http-MCP
  entry). Never print or commit it. `tools/pixellab/pixellab.mjs` handles this.
- **Canonical style anchors (use both):** `docs/seasonal-tile-system/assets/willow-summer.png` +
  `eggplant-summer.png` — passed together as `style_images` so a new subject inherits the set's look. They
  span the two dominant archetypes (organic mass + hero object).
- **Resolution:** ALWAYS generate at **128px**, then **decimate to 64px** for the small tiles (set
  `size:128, decimateTo:64`). Native-64 generation drifts badly in base size/orientation and lets the season
  light recolour constant subjects; the 128 set stays consistent — so generate big and downscale. (Output
  size = the `image_size` you request; style refs can be a different size.)
- **Output convention:** stills at `docs/seasonal-tile-system/assets/<subject>-<season>.png`; animation
  frames at `.../assets/anim/<subject>-<clip>/frame_NN.png`; game sheets at
  `public/seasonal-tiles/<subject>/`.

## Workflow

Author a **thin** subject config (copy `tools/pixellab/subjects/chicken.mjs` — identity + category + overrides
+ locks, **not** per-state prompts), then run it phase by phase, gating between phases.

### 0 — Compose & review prompts  ⟂ GATE
```
node tools/pixellab/run_subject.mjs tools/pixellab/subjects/<subject>.mjs prompts
```
Dumps the fully-composed prompt for every state to `docs/seasonal-tile-system/prompts/<subject>.md` (no API
calls). **Read it and show the user** before generating — this is where an under-specified or off-model prompt
is caught for free. Tune the config (or the shared layers in `prompts/`) and re-dump until the set is right.

### 1 — Summer anchor  ⟂ GATE
```
node tools/pixellab/run_subject.mjs tools/pixellab/subjects/<subject>.mjs summer
```
`generate-with-style-v2` returns several candidates (`<subject>-summer_cand_N.png`) — about **4 at 128px,
~16 at 64px** (smaller = more candidates). Montage them (e.g. a quick grid) and **show the user, and stop.**
Prefer a clean, neutral, **prop-free** pose for the anchor — a candidate holding a flower / wearing a hat /
sitting on an egg will fight every downstream seasonal edit. On the pick, copy it to `<subject>-summer.png`
(the canonical anchor everything inherits). 0-based indexing — say "candidate 0/1/2…" and confirm.

### 2 — The other three seasons  ⟂ GATE
```
node tools/pixellab/run_subject.mjs .../subjects/<subject>.mjs seasons
```
Each season is an `edit-images-v2` edit off the season named by its `from` (usually summer; deciduous
winter chains summer→autumn→bare-mound→winter). Prompts are the seasonal *delta* + an identity-lock prefix
("same <subject>, same pad, same size and position; …"). Then **QA the stills** (below) and present the
four together — seeing the set is where an off-model season gets caught.

### 3 — Forward transitions  ⟂ GATE
```
node tools/pixellab/run_subject.mjs .../subjects/<subject>.mjs transitions
```
Forward only — spring→summer, summer→autumn, autumn→winter (NO winter→spring; a run ends at winter).
`animate-with-text-v3` interpolates start→end. **Stage** the action text ("first… then…") so effects don't
co-occur and mush (the snow-vs-leaves lesson). For complex morphs use a **two-segment** transition via a
midpoint keyframe (the tree's bare-mound). Glow/overshoot artifacts are **seed-dependent** — re-roll the
`seed` and pick clean (willow autumn→bare was clean at seed 42).

### 4 — Idle loops  ⟂ GATE
```
node tools/pixellab/run_subject.mjs .../subjects/<subject>.mjs idles
```
A seamless micro-loop per season: `first_frame == last_frame ==` the season still, so it returns to rest
and can play continuously OR periodically (an engine choice, not baked in). Keep motion subtle. **Idle
loops frequently get a bright overshoot frame** (usually frame_07) — always run the glow check.

### 5 — Pack game sheets
```
python tools/pixellab/pack_sheets.py <subject>
# deciduous two-segment: --concat autumn-baremound+baremound-winter=trans-autumn-winter
```
Transparent horizontal strips → `public/seasonal-tiles/<subject>/{idle-<season>.png, trans-<from>-<to>.png}`.

**Pad centering is automatic here (don't skip it).** The engine (`drawFrame` in
`src/textures/seasonal/seasonalArt.ts`) blits each native frame **centered** in the tile cell, so where a
tile sits in its cell is decided by where its pixels sit in the frame. The element that must be consistent
is the **ground pad** — the small round patch every tile shares — so every season and every tile rests on
the **same centered base** and the land never jumps. `pack_sheets.py` shifts each sheet so its rest frame's
**pad** (bottom-rim center) lands on frame-center, and prints the shift (`center dx=…`). Center on the
**pad, not the content bbox**: a slanted/asymmetric subject's reach (the carrot's feathery top sprawls
up-right) would drag the bbox — and thus the pad — off-center, making the base poke out to one side. The
subject may lean within the cell (**slant is fine**); the pad stays put. For a symmetric subject (willow,
chicken) pad-center == frame-center, so `dx≈0` (no-op). This is the **carrot lesson**: its spring pad had
drifted +4px and every season's body leaned right — centering the pad fixed the base across all four seasons
while keeping the slant. `--no-center` opts out. **Re-pack (don't hand-edit) the sheets** so it stays
reproducible.

### 6 — Engine integration (optional)
Wire the subject onto the board. See `references/engine-integration.md` for the willow pattern and how to
generalize it to a registry so any subject registers declaratively. Then **verify in-game** (step 7 there).

### 7 — Refresh the doc gallery
```
node tools/pixellab/gen_gallery.mjs
```
Regenerates the **Subject gallery** in `docs/seasonal-tile-system/index.html` (the `<!-- AUTOGALLERY -->`
region) directly from the assets on disk — every generated subject's stills + transition/idle GIFs, with an
`in-game` chip for registered subjects. **Never hand-edit the gallery**; add/regenerate a subject and re-run
this. (Hand-authored prose lives in the adjacent `#learnings` section, which the generator does not touch.)
Note: a season packed as a **static** idle should have its review GIF rebuilt from the still (replace that
idle's frames with the season still, then `assemble_gifs.py`) so the gallery shows what actually ships.

## Validation gates (run these, don't skip)

| Check | Command | Catches |
|---|---|---|
| Pad alignment | `python tools/pixellab/check_pad.py --ref <subject>-summer.png --check <subject>-{spring,autumn,winter}.png [--fix]` | pad drift *between seasons* (SHIFT auto-fixes; REJECT = regenerate). Measures the bottom `--band` rim only, so base props don't skew it. Also prints the ref's `body_lean` (how far the subject leans off its pad — informational; a slant is fine). NOTE: this aligns seasons to each other; `pack_sheets.py` then centers the **pad in the frame** so the base sits at cell-center. The "land base must be centered + consistent across all seasons" rule is enforced by **both**, on the pad — never the content bbox. |
| Envelope | `python tools/pixellab/check_envelope.py <subject>` | a season that grew/shrank/sprawled vs summer (numeric; pair with the montage) |
| Glow | `python tools/pixellab/check_glow.py .../anim/<subject>-idle-<season>` | the bright overshoot frame in an idle/transition |
| Fix glow | `python tools/pixellab/drop_glow_frame.py <dir> <index>` then re-pack | — |
| Visual review | `python tools/pixellab/assemble_gifs.py <subject>` | builds loop GIFs + frame strips + a **gridline stills montage** — the real consistency/envelope eyeball. **Read these.** |
| In-game | browser eval, see `references/engine-integration.md` | per-season render correct (pixel-sample, since WebGL screenshots time out here) |

After QA: rejected candidates + intermediates go to the **out-of-VC archive**
(`…\aiDev\puzzleDrag2-art-archive\seasonal-tiles\`), never committed. Review montages/strips go to a
`_review/` dir (gitignore it). Only the canonical stills + final GIFs + sheets stay in the repo.

## Scripts (`tools/pixellab/`)

- `pixellab.mjs` — the raw v2 wrapper: `generateWithStyle` / `editWithText` / `animateTransition` + poll +
  save. Token from `~/.claude.json`.
- `prompts/` — the meta-prompt composition layer (`framing` / `seasons` / `categories` / `compose`). Edit
  these to tune the shared metas; `buildPlan(cfg)` emits the full per-state prompts.
- `run_subject.mjs` — driver; `node run_subject.mjs <config.mjs> <prompts|summer|seasons|transitions|idles>`.
- `subjects/<subject>.mjs` — one **thin** config per subject (identity + category + overrides + locks). Copy `chicken.mjs`.
- `check_pad.py` / `check_envelope.py` / `check_glow.py` / `drop_glow_frame.py` — QA gates.
- `pack_sheets.py` — frames → game spritesheets (`--decimate N` to ship at N px, `--static-idle <seasons>` for
  no-motion idles). `assemble_gifs.py` — review GIFs/strips/montage. `_reroll.mjs` — re-roll ONE clip.
- `gen_gallery.mjs` — regenerate the doc's Subject gallery from the assets on disk (step 7).

Throwaway one-offs are named `_*` and gitignored; the above are the durable pipeline.

## Gotchas

- **The engine blits each native frame CENTERED in the cell — so the GROUND PAD must be centered in the
  frame, and identically across every season, or the tile renders off to one side / the base jumps.** This is
  enforced at pack time (`pack_sheets.py` centers the pad; default on). Center on the **pad (bottom rim)**,
  never the content bounding box — a slanted/asymmetric subject (the carrot's feathery top sprawls up-right)
  drags the bbox off-center and pulls the pad with it. The subject is allowed to lean (slant is fine); the
  *base* is the thing that must be centered + consistent. The carrot shipped off-center because (a) its
  spring still's pad had drifted +4px and never got `check_pad --fix`, and (b) nothing centered the pad in
  the frame at all — both now closed.
- Windows console is cp1252 — keep script output ASCII (a stray `Δ` crashes Python).
- `convert` on PATH is the Windows disk tool, NOT ImageMagick — use Python/Pillow for GIFs.
- Big edits can exceed a 240s poll; the wrapper's timeout is 540s — re-poll a job by id rather than
  regenerating if a wrapper call times out.
- WebGL-canvas **screenshots time out** in the preview here — verify in-game by pixel-sampling the tile
  texture via `window.__phaserScene`, not screenshots (see the reference).
- A `data:` URL returned from `preview_eval` is too big for the tool result; it's saved to a file — decode
  it with `tools/pixellab/_decode.py` (or base64-decode the `base64,` tail).
- Texture keys are double-prefixed in this game: `tile_${res.key}` where `res.key` already starts with
  `tile_` → e.g. `tile_tile_tree_willow`.
