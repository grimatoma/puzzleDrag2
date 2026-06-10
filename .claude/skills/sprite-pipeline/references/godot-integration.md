# Integrating frames into Godot (the v2 tile slot)

The last stage: the per-frame PNGs Aseprite exported (`references/aseprite-execution.md`) become a
Godot **SpriteFrames `.tres`** that the game's tile system plays as the newest-wins **v2** tier.
This doc covers the per-set directory layout, how frames become a `.tres` (and where Tile.gd looks
for it), the engine-path decision, and the import gotchas that otherwise silently break the asset.

---

## Directory layout

The **durable source of truth is the single `godot/assets/tiles/v2/pipeline.json`** (settings +
items: master/children/animations + inline candidates — see `manifest-schema.md`); it is **not**
co-located per set. The produced files for an item live under an `items/<itemId>/` tree:

```
<assets>/v2/
  pipeline.json                        # THE source of truth (one file, all items)
  _style-spec.json                     # the style/cohesion contract
  items/<itemId>/
    <keyId>/NN.png                     # candidate seed stills (idx N → NN.png), incl. failures
    storyboards/<id>.md                # per-asset motion plan (filled storyboard.template.md)
    frames/<id>/NN.png                 # exploded animation frames Aseprite exported (00.png, …)
    previews/<id>.gif                  # looping preview GIF per animated id (Gate-4 / viewer)
    <key>.tres                         # built SpriteFrames — the idle loop Godot loads (v2 tier)
  sets/birch/…                         # legacy birch art keeps its pre-migration paths
```

For this Godot game `<assets>` is `godot/assets/tiles`, so output lands under
`godot/assets/tiles/v2/items/<itemId>/`. Paths in `pipeline.json` are only relative pointers, so
legacy birch assets staying under `sets/birch/…` is fine — the gap-fill reads `pipeline.json` (not a
directory scan), sees what exists by shape, and only builds the gaps.

---

## The one-command path — `scripts/integrate.mjs`

`scripts/integrate.mjs` owns the **whole** frames→`.tres`+verify dance, replacing ~5 hand-run steps
and the import-sidecar gotcha. Run it after Aseprite has written the frame PNGs:

```bash
node .claude/skills/sprite-pipeline/scripts/integrate.mjs            # work list from pipeline.json
# or explicit pairs (relative to the v2 dir, or absolute):
node .claude/skills/sprite-pipeline/scripts/integrate.mjs \
    items/<itemId>/frames/<id>  items/<itemId>/<key>.tres
# Godot binary: --godot <path>, else $GODOT_BIN, else `godot` on PATH.
```

In order, it:

1. **resolves a Godot 4.6 binary** (`--godot` | `$GODOT_BIN` | `godot` on PATH);
2. **builds the work list** — every `idle` animation that is `status: "generated"` **and** whose
   `for` keyframe is **approved** in `pipeline.json` (or the explicit `<framesDir> <outTres>` pairs);
   skips any whose `framesDir` is missing on disk;
3. **`godot --headless --path godot --import`**, then **verifies every frame PNG got a
   `NN.png.import` sidecar — re-importing ONCE if any are missing** (the fix; see the root-cause
   below). Aborts if any sidecar is still missing after the second pass;
4. **`git checkout -- godot/project.godot`** (the `--import` strips touch/stretch settings — revert
   it);
5. **packs each work item** via `res://tools/assemble_tres.gd` (res:// paths, fps from
   `settings.fps`, anim `"idle"`);
6. **verifies all built `.tres`** via `res://tools/verify_sf.gd` (idle / loop / frames);
7. prints a summary and exits non-zero on any failure.

It calls **two GDScript tools that must live in `godot/tools/`**: `assemble_tres.gd` (packs) and
`verify_sf.gd` (verifies). `assemble_tres.gd` is the skill's `scripts/assemble_tres.gd` copied into
the project (`cp .claude/skills/sprite-pipeline/scripts/assemble_tres.gd godot/tools/`); both already
live in `godot/tools/` for this game.

### Root-cause: the first `--import` silently skips newly-added nested frame PNGs

The bug `integrate.mjs` fixes: the **first** `godot --headless --path godot --import` against a cold
`.godot/` cache can **silently skip newly-written nested PNGs** (the frame files under
`frames/<id>/`), so they never get a `.png.import` sidecar and then fail to `load()` as textures. A
**second** `--import` pass picks them up and writes the sidecars. `integrate.mjs` detects the missing
sidecars after pass one and re-imports exactly once — so you don't have to know the gotcha.

The sections below are the under-the-hood detail `integrate.mjs` automates; read them to understand
or to run a step by hand.

---

## Frames → SpriteFrames `.tres` (what `integrate.mjs` runs for you)

`scripts/assemble_tres.gd` packs a `frames/<id>/` folder into a SpriteFrames with **exactly** the
shape `scenes/Tile.gd` expects for an animated tile:

- a single animation named **`"idle"`** (the style spec's `animation.idleAnimationName`);
- **`loop = true`**;
- **speed = the project FPS** (`pipeline.json` `settings.fps`, which supersedes the style spec's
  `animation.fps`; default 10 — `integrate.mjs` passes it).

Tile.gd resolves the v2 tier at **`res://assets/tiles/v2/<key>.tres`**, builds an
`AnimatedSprite2D`, and calls `play(&"idle")` (it checks `has_animation(&"idle")`). If the
animation name or loop flag is wrong, the tile silently falls back to its v1 PNG — so those two
fields are load-bearing; `assemble_tres.gd` sets them for you.

**Install step (one-time, copy into the project).** Godot runs `--script` from inside the
project's `res://` tree, so the skill's `scripts/assemble_tres.gd` must first be **copied into the
Godot project** — drop it in `godot/tools/` alongside the existing `make_v2_grass.gd`:

```bash
cp .claude/skills/sprite-pipeline/scripts/assemble_tres.gd godot/tools/assemble_tres.gd
```

(This copy happens at real-generation time; the config-only setup pass does not commit it. For this
game it is already in `godot/tools/`.) Then, AFTER the frame PNGs are imported, invoke the copy at
`res://tools/assemble_tres.gd`:

```bash
godot --headless --path godot --script res://tools/assemble_tres.gd -- \
    res://assets/tiles/v2/items/<itemId>/frames/<id> \
    res://assets/tiles/v2/items/<itemId>/<key>.tres \
    10 idle
```

(The 4th/3rd args default to `idle` / 10, so they're optional; see the script header.
`integrate.mjs` runs this for you, passing `settings.fps`.)

---

## Engine-path nuance — a decision, not a mandate

Tile.gd resolves v2 art at the **flat** path `res://assets/tiles/v2/<key>.tres`, but the pipeline
builds into an `items/<itemId>/<key>.tres` subdirectory. Two ways to close that gap — pick one per
project; neither is mandated here:

1. **Publish-copy up.** After building, copy (or symlink) the item's `<key>.tres` **and the frame
   PNGs it references** up to `res://assets/tiles/v2/<key>.tres`. Keeps Tile.gd untouched; the
   `items/` tree stays the editable source and `v2/<key>.tres` is the published artifact. Note a
   `.tres` stores **relative paths** to its frame textures, so the frames must resolve from the
   published location too (copy them alongside, or build the `.tres` with the final paths).
2. **Teach Tile.gd to look in `items/`.** Extend `_frames_for()` to also try
   `res://assets/tiles/v2/items/*/<key>.tres` (first match wins). One-time engine change; then the
   item directory **is** the live location, no copy step. Costs a directory scan or a small
   key→path map.

Option 1 is the lighter touch and keeps the existing 3-tier loader (`docs/godot-migration-plan.html`
§assets) exactly as-is; option 2 avoids a publish step at the cost of a Tile.gd edit. Decide based
on whether you want to touch engine code.

---

## Import & verification gotchas (hard-won)

Godot can only `load()` a texture that has an **import record**, so building a `.tres` is always
two-phase: write frames → import → pack. `integrate.mjs` handles the first three footguns for you;
they are documented here so a by-hand run (or a sandbox without a Godot binary) gets them right:

- **The first `--import` silently skips newly-added nested frame PNGs** (the root-cause bug above).
  A second `--import` writes the missing `.png.import` sidecars. `integrate.mjs` re-imports once
  automatically; by hand, **run `--import` twice** (or until every `frames/<id>/NN.png` has a
  sibling `NN.png.import`).
- **`--import` rewrites `project.godot`.** Running `godot --headless --path godot --import` to build
  the import records also rewrites `project.godot` and **strips touch/stretch settings** the game
  needs. ALWAYS `git checkout godot/project.godot` immediately after the import step. (Do the
  import, revert project.godot, *then* run `assemble_tres.gd`.) `integrate.mjs` reverts it for you.
- **Commit the `.png.import` sidecars, NOT `.godot/imported/`.** Each frame PNG gets a
  `<NN>.png.import` next to it — commit those (they're the portable import record; the repo already
  commits them for every `assets/tiles/*.png`). The generated binaries under `.godot/imported/` are
  machine-local build cache — never commit them.
- **Verify in-engine, not just on disk.** A `.tres` that loads in isolation can still render wrong
  on the board. Two checks:
  - a **headless screenshot** (`godot --path godot --script res://tools/screenshot.gd -- out.png`,
    run non-headless so the GPU draws) to see the tile actually animate on the board;
  - the **asset test suite**: `godot --headless --path godot --script res://tests/run_assets_tests.gd`,
    which asserts the 3-tier resolution (a tile with a v2 `.tres` renders via `AnimatedSprite2D`; a
    v1-only tile stays static; a tile with neither falls back to the placeholder). Add the new key
    to that suite's expectations when it ships so CI guards it.
- **A missing/misnamed asset is not fatal — it's a silent downgrade.** Tile.gd caches misses too, so
  a wrong path or a `.tres` whose `idle` animation is absent just renders the v1 PNG (or the
  procedural placeholder). If your new tile "isn't animating," check the path, the `idle` name, and
  that the frames imported — the board never goes blank, so the failure is quiet.
