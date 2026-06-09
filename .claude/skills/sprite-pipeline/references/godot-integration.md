# Integrating frames into Godot (the v2 tile slot)

The last stage: the per-frame PNGs Aseprite exported (`references/aseprite-execution.md`) become a
Godot **SpriteFrames `.tres`** that the game's tile system plays as the newest-wins **v2** tier.
This doc covers the per-set directory layout, how frames become a `.tres` (and where Tile.gd looks
for it), the engine-path decision, and the import gotchas that otherwise silently break the asset.

---

## Per-set directory layout

Everything a set produces lives in **one co-located directory**, beside its manifest (the durable
source of truth — see `manifest-schema.md`):

```
<assets>/sets/<set>/
  manifest.json            # the set contract (keyframes + idles + transitions)
  keyframes/<id>.png       # one base still per keyframe (PixelLab / hand)
  storyboards/<id>.md      # per-asset motion plan (filled storyboard.template.md)
  frames/<id>/NN.png       # exploded animation frames Aseprite exported (00.png, 01.png, …)
  previews/<id>.gif        # looping preview GIF per animated id (Gate-4 / viewer)
  <key>.tres               # built SpriteFrames — the idle loop Godot loads (v2 tier)
```

For this Godot game `<assets>` is `godot/assets/tiles`, so a set lands at
`godot/assets/tiles/v2/sets/<set>/`. Keeping outputs beside the manifest is what makes the
idempotent gap-fill safe: the pipeline reads this one directory, sees what exists, and only builds
the gaps.

---

## Frames → SpriteFrames `.tres`

`scripts/assemble_tres.gd` packs a `frames/<id>/` folder into a SpriteFrames with **exactly** the
shape `scenes/Tile.gd` expects for an animated tile:

- a single animation named **`"idle"`** (the style spec's `animation.idleAnimationName`);
- **`loop = true`**;
- **speed = the project FPS** (from `_style-spec.json` `animation.fps`, default 10).

Tile.gd resolves the v2 tier at **`res://assets/tiles/v2/<key>.tres`**, builds an
`AnimatedSprite2D`, and calls `play(&"idle")` (it checks `has_animation(&"idle")`). If the
animation name or loop flag is wrong, the tile silently falls back to its v1 PNG — so those two
fields are load-bearing; `assemble_tres.gd` sets them for you. Run it AFTER the frame PNGs are
imported:

```bash
godot --headless --path godot --script res://addons/sprite-pipeline/assemble_tres.gd -- \
    res://assets/tiles/v2/sets/<set>/frames/<id> \
    res://assets/tiles/v2/sets/<set>/<key>.tres \
    10 idle
```

(The 4th/3rd args default to `idle` / 10, so they're optional; see the script header.)

---

## Engine-path nuance — a decision, not a mandate

Tile.gd resolves v2 art at the **flat** path `res://assets/tiles/v2/<key>.tres`, but the pipeline
builds into a **per-set** subdirectory `…/v2/sets/<set>/<key>.tres`. Two ways to close that gap —
pick one per project; neither is mandated here:

1. **Publish-copy up.** After building, copy (or symlink) the set's `<key>.tres` **and the frame
   PNGs it references** up to `res://assets/tiles/v2/<key>.tres`. Keeps Tile.gd untouched; the
   `sets/` tree stays the editable source and `v2/<key>.tres` is the published artifact. Note a
   `.tres` stores **relative paths** to its frame textures, so the frames must resolve from the
   published location too (copy them alongside, or build the `.tres` with the final paths).
2. **Teach Tile.gd to look in `sets/`.** Extend `_frames_for()` to also try
   `res://assets/tiles/v2/sets/*/<key>.tres` (first match wins). One-time engine change; then the
   per-set directory **is** the live location, no copy step. Costs a directory scan or a small
   manifest of key→path.

Option 1 is the lighter touch and keeps the existing 3-tier loader (`docs/godot-migration-plan.html`
§assets) exactly as-is; option 2 avoids a publish step at the cost of a Tile.gd edit. Decide based
on whether you want to touch engine code.

---

## Import & verification gotchas (hard-won)

Godot can only `load()` a texture that has an **import record**, so building a `.tres` is always
two-phase: write frames → import → pack. The footguns:

- **`--import` rewrites `project.godot`.** Running `godot --headless --path godot --import` to build
  the import records also rewrites `project.godot` and **strips touch/stretch settings** the game
  needs. ALWAYS `git checkout godot/project.godot` immediately after the import step. (Do the
  import, revert project.godot, *then* run `assemble_tres.gd`.)
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
