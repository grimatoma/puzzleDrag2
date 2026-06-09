# `pipeline.json` schema — the single source of truth

The sprite pipeline is driven by **one file**: `godot/assets/tiles/v2/pipeline.json`. It is the
**durable source of truth** for the whole set of game sprites — global generation settings plus a
flat list of hierarchical **items**. (This replaces the old per-set `sets/<set>/manifest.json`
model; there is no longer a manifest beside each output directory.)

`pipeline.json` is the data model every other stage reads: the viewer builder
(`build_viewer.mjs`) renders a projection of it, the control server patches it, and gap-fill diffs
it by **shape** to decide what to generate next. Get the shape right and the rest of the pipeline
follows.

---

## Top-level shape

```jsonc
{
  "settings": { … },   // global generation settings (one object)
  "items":    [ … ]    // hierarchical items, one per master + its family
}
```

A **candidate** is a single generated image (one PixelLab seed). Candidates are stored **inline**
in `pipeline.json` — **all of them, including failures**, each with a `status` and (on failures) a
`reason`. Nothing is deleted; the file is the full history of what was tried.

---

## `settings` (global)

| Field | Type | Meaning |
|-------|------|---------|
| `styleSpec` | string | **Relative path** (from `pipeline.json`) to the project style spec (`_style-spec.json`) every item conforms to — palette ramps, light, outline, perspective, etc. (see `reference-assets-spec.md`). **`settings.fps` / `settings.canvas` here supersede the style spec's `animation.fps` / `canvas` as the pipeline defaults.** |
| `canvas` | `{ width, height, safeArea }` | **Default** sprite dimensions in px. The 32px tile size lives here, **not** in the style spec (whose `canvas` is the game's native 90×90). An item may **override** `canvas` for itself. |
| `fps` | number | **Default** animation playback rate. An item may **override** `fps` for itself. |
| `candidates` | `1 \| 2 \| 4` | Seeds requested per generation step — the target candidate count a `master` or `child` accumulates before it's full (PixelLab batch sizes; `3` is not supported). **Global**, not per-item. |
| `humanApproval` | boolean | Require the human gate at cost events (each spend pauses for sign-off). **Global**. |
| `autonomous` | boolean | `true` → skip the human gate; the LLM self-audit (`llm` verdict) decides what to approve. **Global**. Mutually exclusive in spirit with `humanApproval` — set one. |

**Override scope.** Only `canvas` and `fps` are per-item-overridable. `candidates`,
`humanApproval`, `autonomous`, and `styleSpec` are **always global** — there is no per-item form.

---

## `items[]`

Each item bundles **one master** sprite, its **children** (variants derived from the master), and
the **animations** over them. The nesting **is** the derivation graph — see "Gap-fill is
structural" below.

| Field | Type | Meaning |
|-------|------|---------|
| `id` | string | Stable item id (e.g. `birch_tree`). Names the family; with the new layout it's also the `items/<id>/…` output directory stem. |
| `basePrompt` | string | Optional. Prepended to every `master`/`child` `prompt` before generation — the description shared by the whole family (subject, framing, shadow), so each member's `prompt` only states what makes it distinct. By convention the effective prompt is `basePrompt + ", " + prompt`. |
| `priors` | string[] | **Relative paths** (from `pipeline.json`) to already-shipped sibling assets fed in as visual priors for cohesion when generating new members. Usually other tiles in the same family. |
| `canvas` | `{ width, height, safeArea }` | **Optional** per-item override of `settings.canvas`. |
| `fps` | number | **Optional** per-item override of `settings.fps`. |
| `master` | object | The base sprite the family derives from (see below). |
| `children[]` | object[] | Variants generated **from** the approved master (same shape as a `master`: `{ id, prompt, selected, candidates }`). |
| `animations[]` | object[] | Idle loops and transition tweens over the master/children (see below). |

A **lone image** with no children and no animations is simply an item that has only a `master` (and
an empty `children` / `animations`). The hierarchy is optional depth, not a requirement.

### `master` / `children[]` entry

| Field | Type | Meaning |
|-------|------|---------|
| `id` | string | The keyframe id — unique within the item, stable over time. Doubles as the on-disk filename stem for legacy assets and the `.tres` key for the built loop. |
| `prompt` | string | What makes this keyframe distinct. Combined with the item `basePrompt`. |
| `selected` | number \| null | Index (`idx`) of the **approved** candidate. `null` until one is approved. |
| `candidates[]` | object[] | Every generated seed for this keyframe, kept inline (see below). |

### Candidate object

| Field | Type | Meaning |
|-------|------|---------|
| `idx` | int | The candidate index — **also the on-disk NN** in the seed filename (`00.png`, `01.png`, …). |
| `path` | string | **Relative path** (from `pipeline.json`) to the candidate PNG. Just a pointer — see "Paths & layout". |
| `status` | `requested \| generated \| failed \| rejected \| approved` | Lifecycle state. `requested` = job dispatched; `generated` = image downloaded; `failed` = generation errored; `rejected` = generated but discarded; `approved` = the chosen one (the keyframe's `selected` points at it). |
| `llm` | `pass \| fail` | The LLM self-audit verdict on the candidate (style/quality check). |
| `reason` | string | **On `failed` / `rejected` only** — why it failed or was discarded. Carry it so the history explains itself. |

> **Never delete `failed`/`rejected` candidates.** They are kept inline as the audit trail and so
> gap-fill can re-seed only the slots that need it.

Example of a keyframe still awaiting approval, with a failed seed kept inline (note `selected: null`
and the `reason`):

```jsonc
{
  "id": "tile_veg_pumpkin", "prompt": "deep orange ripe pumpkin",
  "selected": null,                                   // nothing approved yet
  "candidates": [
    { "idx": 0, "path": "items/pumpkin/tile_veg_pumpkin/00.png", "status": "generated", "llm": "pass" },
    { "idx": 1, "path": "items/pumpkin/tile_veg_pumpkin/01.png", "status": "failed", "llm": "fail",
      "reason": "off-palette: rind went brown, off the wheat-gold ramp" }
  ]
}
```

### `animations[]` entry

Two kinds, discriminated by `kind`:

| Field | Type | Applies to | Meaning |
|-------|------|-----------|---------|
| `kind` | `idle \| transition` | both | Idle loop vs. tween between two keyframes. |
| `for` | string | `idle` | The keyframe `id` this idle animates. |
| `from` / `to` | string | `transition` | The start / end keyframe ids of the tween. |
| `frames` | int | both | **Optional** frame count. When omitted, falls back to the style spec's `animation.framesDefault` (default 8). Idles are short; transitions are usually longer. |
| `motion` | string | `idle` | Plain-language idle-motion brief (e.g. `"sway + occasional falling leaf"`). Drives the animator. |
| `physics` | string | `transition` | Plain-language brief of the **physical** change driving the tween — what moves/melts/falls/fades and in what order. The motion plan the animator executes. |
| `status` | `pending \| generated` | both | `pending` = not animated yet (gap-fill will animate once its keys are approved); `generated` = the GIF/frames exist. |
| `gif` | string | both | **Relative path** (from `pipeline.json`) to the looping preview GIF, once generated. |

---

## Gap-fill is structural

The pipeline reconciles `pipeline.json` against itself by **shape** — the nesting **is** the
derivation, so there is **no `master:true` flag and no `derivesFrom` pointer**. On each run it
diffs and acts:

1. A **`master`** that is **not yet approved** (`selected` is `null`) and has **fewer than
   `settings.candidates`** non-failed candidates → **generate** the remaining seeds for it. An
   **approved** keyframe is "full" — accumulation stops once a candidate is chosen.
2. A **`child`** with **no candidates** *and* an **approved master** (master `selected` is non-null)
   → **generate** it, conditioned on the approved master.
3. An **`animation`** whose referenced keyframes are **approved** and whose `status` is `"pending"`
   → **animate** it (build the frames + preview GIF).
4. Any candidate with **`status: "failed"`** → **re-seed just that one** (regenerate that single
   `idx`), leaving the rest untouched.

Because everything (including failures) is recorded inline, the diff is exact and the run is a cheap
**gap-fill**, not a rebuild: already-approved keyframes and already-generated animations are
skipped. To deliberately regenerate something, drop its candidates / flip an animation back to
`pending` and re-run.

---

## Paths & layout

Every path in `pipeline.json` — candidate `path`, animation `gif`, item `priors`, and `styleSpec` —
is **relative to `pipeline.json`**, which lives at `godot/assets/tiles/v2/`. `path` is just a
pointer to a file on disk; the pipeline doesn't care *where* the file sits.

- **Legacy assets** keep their original `sets/<set>/…` paths (the pre-migration birch art lives
  under `sets/birch/keyframes/…`, `sets/birch/previews/…`).
- **New generation** uses an `items/<id>/<key>/NN.png` layout — candidate `idx` `N` → `NN.png` under
  the keyframe's directory. Both work because `path` is only a relative pointer; mixing them in one
  file is fine.

Priors usually point **out** of `v2/` to shipped tiles one directory up — e.g.
`"../tile_tree_oak.png"` resolves to `godot/assets/tiles/tile_tree_oak.png`.

---

## Canonical example — the migrated `birch_tree` item

This is the real `pipeline.json` at `godot/assets/tiles/v2/pipeline.json` after the birch set was
migrated off its old per-set manifest. One item, `birch_tree`: the **autumn** keyframe is the
**master** (the fuller-canopy base), **winter** is its **child**, and three animations cover both
idles plus the autumn→winter transition. Each keyframe carries a single **approved** candidate (its
shipped 32px PNG), so gap-fill sees the family as complete.

```json
{
  "settings": {
    "styleSpec": "_style-spec.json",
    "canvas": { "width": 32, "height": 32, "safeArea": 2 },
    "fps": 10,
    "candidates": 4,
    "humanApproval": true,
    "autonomous": false
  },
  "items": [
    {
      "id": "birch_tree",
      "basePrompt": "deciduous birch tree tile, white bark, matches reference set, three-quarter top-down, soft drop shadow",
      "priors": ["../tile_tree_oak.png", "../tile_tree_fir.png"],
      "master": {
        "id": "tile_tree_birch_autumn",
        "prompt": "gold/amber canopy",
        "selected": 0,
        "candidates": [
          { "idx": 0, "path": "sets/birch/keyframes/tile_tree_birch_autumn.png", "status": "approved", "llm": "pass" }
        ]
      },
      "children": [
        {
          "id": "tile_tree_birch_winter",
          "prompt": "bare branches, snow on limbs",
          "selected": 0,
          "candidates": [
            { "idx": 0, "path": "sets/birch/keyframes/tile_tree_birch_winter.png", "status": "approved", "llm": "pass" }
          ]
        }
      ],
      "animations": [
        { "kind": "idle", "for": "tile_tree_birch_autumn", "frames": 8, "motion": "sway + occasional falling leaf", "status": "generated", "gif": "sets/birch/previews/tile_tree_birch_autumn.gif" },
        { "kind": "idle", "for": "tile_tree_birch_winter", "frames": 6, "motion": "bare-branch sway + snow glint", "status": "generated", "gif": "sets/birch/previews/tile_tree_birch_winter.gif" },
        { "kind": "transition", "from": "tile_tree_birch_autumn", "to": "tile_tree_birch_winter", "frames": 20, "physics": "leaves fall+flutter (staggered, terminal velocity); snow falls slower; accumulates bottom-up on branches then ground", "status": "generated", "gif": "sets/birch/previews/tile_tree_birch_autumn__to__tile_tree_birch_winter.gif" }
      ]
    }
  ]
}
```

Reading it: the `birch_tree` master (autumn) is approved, so the winter **child** is eligible to
derive from it; both idles and the transition are already `generated`, so a gap-fill run does
nothing for birch. The `physics` string on the transition is exactly the motion plan the animator
executes (staggered leaf-fall at terminal velocity, snow accumulating bottom-up). To add a third
season, append a child with its prompt and an empty `candidates` array — gap-fill then generates
just that one from the approved master, keeping the family cohesive via `priors`.
