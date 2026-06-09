# Set manifest schema

A **set** is a cohesive, growable group of game sprites (e.g. all the variants of one tree, all
the fish, every season of one crop). Each set is declared by a single **co-located manifest** —
a `manifest.json` that lives **beside the output it describes** and is the **durable source of
truth** for that group.

The manifest is **idempotent**: re-running the pipeline against it diffs the declared ids against
the files already on disk and only generates what's **missing**, reusing the group's
already-generated siblings as **priors** so new members stay continuous with the ones already
shipped. You can therefore grow a set incrementally — add a keyframe, re-run, and only the new
asset is produced.

`../../assets/manifest.template.json` is a blank, project-agnostic copy of this schema to start
from. This doc is the reference for what every field means.

---

## Location & directory layout

The manifest lives at:

```
<assets>/sets/<set>/manifest.json
```

Everything the set produces is written into that same per-set directory, so the manifest and its
outputs travel together:

```
<assets>/sets/<set>/
  manifest.json              # this file — the durable source of truth
  keyframes/<id>.png         # one base still per keyframe (PixelLab output)
  storyboards/<id>.md        # per-asset shot notes / motion plan
  frames/<id>/NN.png         # exploded animation frames (00.png, 01.png, …)
  previews/<id>.gif          # a looping preview GIF per animated id
  <key>.tres                 # built SpriteFrames resource (the idle loop Godot loads)
```

- `<set>` is the group name (e.g. `birch`).
- `<id>` is a keyframe id (e.g. `tile_tree_birch_autumn`) — ids double as the on-disk filenames,
  so they must be unique within the set and stable over time.
- `<key>.tres` is the Godot `SpriteFrames` the game consumes; it carries the idle loop and is the
  newest-wins **v2** tier of the game's tile rendering fallback.

Keeping the manifest **beside** its output (rather than in a central registry) is what makes the
set self-describing and the gap-fill safe: the pipeline can look in this one directory, see what
exists, and reconcile it against the declared ids.

---

## Idempotent gap-fill

On every run the pipeline:

1. **Reads** the manifest's declared `keyframes`, `idles`, and `transitions`.
2. **Diffs** them against the files present under the set directory
   (`keyframes/`, `frames/`, `previews/`, the `.tres`).
3. **Generates only the missing artifacts** — an already-rendered keyframe or idle is skipped.
4. **Feeds the existing siblings in as priors** (see `priors` below): when generating a new
   member, the already-generated assets in the group are passed as visual context so the new one
   inherits the set's silhouette, palette, and detail density — preserving cohesion and
   continuity rather than drifting.

This makes re-running cheap and non-destructive: it is a **gap-fill**, not a rebuild. To
regenerate a specific asset deliberately, delete its output files and re-run.

---

## `basePrompt`

`basePrompt` is an **optional set-level string** that is **prepended to each keyframe's `prompt`**
before generation. It carries the description shared by the whole group (subject, family, framing,
shadow) so individual keyframe prompts only need to state what makes that variant distinct. This
keeps the group cohesive **at the prompt level**, complementing the priors (which keep it cohesive
at the pixel level).

A per-keyframe `prompt` can **override** rather than extend the base when a member needs to break
the pattern — by convention, the effective prompt is `basePrompt + ", " + keyframe.prompt`, and a
keyframe is free to restate anything from the base to countermand it.

---

## Fields

| Field | Type | Meaning |
|-------|------|---------|
| `set` | string | The group name. Matches the `<set>` directory. |
| `styleSpec` | string | **Relative path** to the project style spec (`_style-spec.json`) this set conforms to. Defines canvas, palette ramps, light, outline, project FPS, etc. (see `reference-assets-spec.md`). |
| `priors` | string[] | Paths to **already-generated sibling assets** used as visual priors for cohesion/continuity when gap-filling new members. Usually points at other shipped tiles in the same family. |
| `basePrompt` | string | Optional. Prepended to every keyframe `prompt` (see above). |
| `fps` | number \| null | Playback rate for this set's animations. **`null` = inherit the project-wide FPS from the style spec** — the default, so every set matches. Set a number only to deliberately override for this set. |
| `framesDefault` | number | Default frame count for this set's idles/transitions when an item doesn't specify its own `frames`. |
| `keyframes[]` | object[] | The base stills that define each member. Each: `{ id, generator, prompt }`. |
| `keyframes[].id` | string | Unique, stable id — also the on-disk filename stem and (for the rendered loop) the `.tres` key. |
| `keyframes[].group` | string | **Optional.** A label the review viewer **groups keyframes by** (e.g. `"seasons"`). Purely presentational — it buckets cards in `build_viewer.mjs`'s output; it does **not** affect generation, gap-fill, or the `.tres`. Omit it and the keyframe still renders fine (ungrouped). |
| `keyframes[].generator` | `"pixellab"` \| `"aseprite"` | Which executor produces the base still. **PixelLab** generates from a prompt; **Aseprite** is used when the still is authored/edited directly. (Animation is always executed in Aseprite regardless.) |
| `keyframes[].prompt` | string | What makes this variant distinct. Combined with `basePrompt`. |
| `<any row>.approved` | boolean | **Optional**, valid on **any** keyframe / idle / transition row. When `true`, the review viewer surfaces an **"approved"** badge for that asset (sign-off bookkeeping after Gate-4). Defaults to absent/`false`; it never gates generation and a plain manifest with no `approved` keys renders fine. |
| `idles[]` | object[] | The looping idle animation for a keyframe. Each: `{ for, frames?, motion }`. |
| `idles[].for` | string | The keyframe `id` this idle animates. |
| `idles[].frames` | number | Optional. Frame count for this idle; **overrides `framesDefault`**. |
| `idles[].motion` | string | Plain-language description of the idle motion (e.g. `"sway + occasional falling leaf"`). Drives the Aseprite animation. |
| `transitions[]` | object[] | An animated tween from one keyframe to another (e.g. season change). Each: `{ from, to, frames?, physics }`. |
| `transitions[].from` / `.to` | string | The start and end keyframe ids. |
| `transitions[].frames` | number | Optional. Frame count for the tween; **overrides `framesDefault`**. Transitions are usually longer than idles. |
| `transitions[].physics` | string | Plain-language description of the **physical** change driving the tween (what moves, melts, falls, fades, and in what order) — the motion brief the animator follows. |

**`frames` precedence:** a per-item `frames` (on an idle or transition) overrides the set's
`framesDefault`, which in turn falls back to the style spec's `animation.framesDefault`. Likewise
a set `fps` overrides the project FPS only when non-null.

---

## Canonical example

This is the canonical shape of a manifest — the `birch` tree set, living at
`godot/assets/tiles/v2/sets/birch/manifest.json`. It conforms to a style spec two directories up
(`../../_style-spec.json`), uses two already-shipped sibling tiles **three** directories up as
priors (`../../../tile_tree_oak.png` — the tiles sit in `godot/assets/tiles/`, one level **above**
the `v2/` tree, so the relative path climbs out of `sets/<set>/` *and* out of `v2/`), inherits the
project FPS (`fps: null`), tags each keyframe with `"group": "seasons"` so the review viewer buckets
them together, and declares four seasonal keyframes plus the idles and seasonal transitions between
them:

```json
{
  "set": "birch",
  "styleSpec": "../../_style-spec.json",
  "priors": ["../../../tile_tree_oak.png", "../../../tile_tree_fir.png"],
  "basePrompt": "deciduous birch tree tile, white bark, matches reference set, three-quarter top-down, soft drop shadow",
  "fps": null,
  "framesDefault": 8,
  "keyframes": [
    { "id": "tile_tree_birch_spring", "group": "seasons", "generator": "pixellab", "prompt": "fresh green canopy" },
    { "id": "tile_tree_birch_summer", "group": "seasons", "generator": "pixellab", "prompt": "full deep-green canopy" },
    { "id": "tile_tree_birch_autumn", "group": "seasons", "generator": "pixellab", "prompt": "gold/amber canopy" },
    { "id": "tile_tree_birch_winter", "group": "seasons", "generator": "pixellab", "prompt": "bare branches, snow on limbs" }
  ],
  "idles": [
    { "for": "tile_tree_birch_autumn", "frames": 8, "motion": "sway + occasional falling leaf" },
    { "for": "tile_tree_birch_winter", "frames": 6, "motion": "bare-branch sway + snow glint" }
  ],
  "transitions": [
    { "from": "tile_tree_birch_summer", "to": "tile_tree_birch_autumn", "frames": 16, "physics": "chlorophyll fade->gold; first leaves loosen" },
    { "from": "tile_tree_birch_autumn", "to": "tile_tree_birch_winter", "frames": 20, "physics": "leaves fall+flutter (staggered, terminal velocity); snow falls slower; accumulates bottom-up on branches then ground" },
    { "from": "tile_tree_birch_winter", "to": "tile_tree_birch_spring", "frames": 16, "physics": "snow melts top-down (drips); buds->green" }
  ]
}
```

Reading it: only the **missing** seasonal keyframes are generated on a given run; each new one is
conditioned on `tile_tree_oak.png` / `tile_tree_fir.png` (priors) plus the already-generated birch
siblings, so the family stays cohesive. The `autumn → winter` transition is the richest brief
(staggered leaf-fall at terminal velocity, snow accumulating bottom-up) — the `physics` string is
exactly the motion plan the Aseprite animator executes for that tween.

> The generic, copyable starting point for a new set is `assets/manifest.template.json`. Birch
> here is illustrative only.
