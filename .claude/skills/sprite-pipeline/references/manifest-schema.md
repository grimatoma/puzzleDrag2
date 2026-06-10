# The pipeline schema — three files: spec, history sidecar, formal definition

The sprite pipeline is driven by **three files that live side-by-side** in
`godot/assets/tiles/v2/`. They split the old single-file `pipeline.json` (which mixed the *spec* with
a growing *attempt log*) into three things that each own one concern:

| File | Owns | Shape (root) |
|------|------|--------------|
| **`pipeline.json`** | the **spec + current state** — what to build and what's been chosen. The file humans/agents edit. | `{ settings, items[] }` |
| **`pipeline.history.json`** | the **candidate/attempt log** sidecar — every seed ever tried (incl. failures), the full audit trail. | `{ "<itemId>": { "<keyframeId>": [candidate…] } }` |
| **`pipeline.schema.json`** | the **formal definition** — a JSON Schema (draft 2020-12) for *both* data files. The machine-readable source of truth. | `{ $defs: { pipelineDoc, historyDoc, … } }` |

`pipeline.schema.json` is the authority on the exact shapes; the tables in this doc are the
human-readable companion. **Every script validates the on-disk files against the schema before doing
anything and REFUSES to proceed on invalid data** (`build_viewer`, `serve_viewer`, and `integrate`
all gate on it). `$defs.pipelineDoc` validates `pipeline.json`; `$defs.historyDoc` validates the
sidecar.

All three are read, written, and validated through one shared seam, **`scripts/manifest.mjs`**
(`loadPipeline` / `loadHistory` / `loadSchema` / `loadMerged` / `mergeInto` / `writePipeline` /
`writeHistory` / `validate` / `validateDoc` / `historyPath` / `schemaPath`). The three files always
live in the same directory; `manifest.mjs` derives the sidecar/schema paths from `pipeline.json`'s
path. Writes are **atomic** (temp file + rename in the same dir), so a reader never sees a
half-written file.

### The merged view (why downstream code still reads `keyframe.candidates`)

Gap-fill and the viewer projection want each keyframe's candidate list right next to the keyframe.
`manifest.loadMerged()` (and the lower-level `mergeInto(pipeline, history)`) reconstructs the
**pre-split in-memory shape**: it splices each keyframe's candidate array back in from history, so
projection/plan code reads `keyframe.candidates` exactly as before. This merged object is **in-memory
only** — it is never written to disk, and it intentionally does **not** pass `validateDoc(…,
"pipelineDoc")` (the strict `keyframe` schema is `additionalProperties: false`, which forbids the
re-added `candidates`). **Always schema-validate the on-disk `pipeline.json` (via `loadPipeline`),
never the merged shape.**

### Degraded mode — viewer without the sidecar

The history sidecar is **optional**. If `pipeline.history.json` is absent, `loadHistory` returns `{}`
(which validates clean) and `build_viewer` still renders each keyframe's approved art — it resolves
the poster image from the keyframe's own **`selectedPath`** instead of from a (now empty) candidate
list. What's lost without the sidecar is candidate-picking review (the seed grid) and gap-fill /
candidate re-seed, both of which **need** the per-candidate records. So: the viewer degrades
gracefully; gap-fill and candidate review do not.

---

## `pipeline.json` — top-level shape

```jsonc
{
  "settings": { … },   // global generation settings (one object)
  "items":    [ … ]    // hierarchical items, one per master + its family
}
```

This is what humans/agents edit and what gap-fill diffs **by shape**. It carries the *spec* (prompts,
hierarchy, animations) and the *current choice* per keyframe (`selected` + `selectedPath`). It does
**not** carry candidates — those live in the history sidecar.

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
| `id` | string | Stable item id (e.g. `birch_tree`). Names the family; with the new layout it's also the `items/<id>/…` output directory stem, and the **first key** in the history sidecar (`history["<id>"]`). |
| `basePrompt` | string | Optional. Prepended to every `master`/`child` `prompt` before generation — the description shared by the whole family (subject, framing, shadow), so each member's `prompt` only states what makes it distinct. By convention the effective prompt is `basePrompt + ", " + prompt`. |
| `priors` | string[] | **Relative paths** (from `pipeline.json`) to already-shipped sibling assets fed in as visual priors for cohesion when generating new members. Usually other tiles in the same family. |
| `canvas` | `{ width, height, safeArea }` | **Optional** per-item override of `settings.canvas`. |
| `fps` | number | **Optional** per-item override of `settings.fps`. |
| `master` | object | The base sprite the family derives from (see below). |
| `children[]` | object[] | Variants generated **from** the approved master (same keyframe shape as `master`: `{ id, prompt, selected, selectedPath }`). |
| `animations[]` | object[] | Idle loops and transition tweens over the master/children (see below). |

A **lone image** with no children and no animations is simply an item that has only a `master` (and
an empty `children` / `animations`). The hierarchy is optional depth, not a requirement.

### `master` / `children[]` keyframe entry

A keyframe in `pipeline.json` holds the **spec + the current choice only** — its candidate array
lives in the history sidecar, not here.

| Field | Type | Meaning |
|-------|------|---------|
| `id` | string | The keyframe id — unique within the item, stable over time. Doubles as the on-disk filename stem for legacy assets and the `.tres` key for the built loop. Also the **second key** in the history sidecar (`history["<itemId>"]["<id>"]`). |
| `prompt` | string | What makes this keyframe distinct. Combined with the item `basePrompt`. |
| `selected` | number \| null | Index (`idx`) of the **approved/selected** candidate. `null` until one is chosen. **`selected !== null` is the keyframe's "approved" signal** every script keys off. |
| `selectedPath` | string \| null | **Relative path** (from `pipeline.json`) of the candidate at idx `selected` — the denormalized approved-art pointer. `null` while `selected` is `null`. **Kept paired with `selected`**: the control server moves them together, so `selectedPath` is always the path of the currently-selected candidate (and the viewer can resolve approved art from it even with no sidecar). |
| `comment` | string | **Optional** free-text review note attached in the viewer. |

> **`candidates` is gone from `pipeline.json`.** The keyframe schema is `additionalProperties: false`,
> so a stray `candidates` key on a keyframe **fails validation**. Candidate records live only in
> `pipeline.history.json`.

### `animations[]` entry

Two kinds, discriminated by `kind`. Unchanged by the split — animations live entirely in
`pipeline.json`.

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

The schema enforces, via `oneOf`, that an animation is either an **idle** (has `for`) **or** a
**transition** (has `from` + `to`) — exactly one shape.

---

## `pipeline.history.json` — the candidate/attempt log (sidecar)

The history sidecar is keyed **itemId → keyframeId → candidate[]**. It records **every seed ever
generated for a keyframe, including failures and rejects** — it is the full audit trail and the
input gap-fill re-seeds from. A **candidate** is a single generated image (one PixelLab seed).

```jsonc
{
  "<itemId>": {
    "<keyframeId>": [ { idx, path, status, llm?, reason? }, … ]
  }
}
```

A brand-new set starts with an **empty history (`{}`)**; entries fill in as candidates are generated.
The sidecar may be **absent entirely** — `loadHistory` then reads it as `{}` (degraded viewer mode,
above).

### Candidate object

| Field | Type | Meaning |
|-------|------|---------|
| `idx` | int | The candidate index — **also the on-disk NN** in the seed filename (`00.png`, `01.png`, …). All matching is by the `idx` **field**, not array position (build_viewer / serve_viewer / the viewer / integrate all key off `idx`). |
| `path` | string | **Relative path** (from `pipeline.json`'s dir, `v2/`) to the candidate PNG. Just a pointer — see "Paths & layout". |
| `status` | `requested \| generated \| failed \| rejected \| approved` | Lifecycle state. `requested` = job dispatched; `generated` = image downloaded; `failed` = generation errored; `rejected` = generated but discarded; `approved` = the chosen one (the keyframe's `selected` points at this `idx`). |
| `llm` | `pass \| fail` | **Optional.** The LLM self-audit verdict on the candidate (style/quality check). |
| `reason` | string | **Optional, on `failed` / `rejected` (and viewer-flagged regen)** — why it failed or was discarded. Carry it so the history explains itself. |

> **Never delete `failed` / `rejected` candidates.** They are kept in the sidecar as the audit trail
> — the *full history of what was tried* — and so gap-fill can re-seed only the slots that need it.
> Nothing is ever removed from history; it only grows.

Example of a keyframe still awaiting approval, with a failed seed kept in history. Note the two
files: the **spec** keyframe in `pipeline.json` (`selected: null`, `selectedPath: null`, no
candidates) and the **candidate records** in `pipeline.history.json`:

`pipeline.json` (the keyframe):

```jsonc
{
  "id": "tile_veg_pumpkin", "prompt": "deep orange ripe pumpkin",
  "selected": null, "selectedPath": null    // nothing chosen yet
}
```

`pipeline.history.json` (its candidates):

```jsonc
{
  "pumpkin": {
    "tile_veg_pumpkin": [
      { "idx": 0, "path": "items/pumpkin/tile_veg_pumpkin/00.png", "status": "generated", "llm": "pass" },
      { "idx": 1, "path": "items/pumpkin/tile_veg_pumpkin/01.png", "status": "failed", "llm": "fail",
        "reason": "off-palette: rind went brown, off the wheat-gold ramp" }
    ]
  }
}
```

---

## Gap-fill is structural

The pipeline reconciles `pipeline.json` against itself **by shape** — the nesting **is** the
derivation, so there is **no `master:true` flag and no `derivesFrom` pointer**. Candidate **counts
and statuses come from the merged history view** (`manifest.loadMerged` splices each keyframe's
`candidates` in from the sidecar) — so the diff reads `keyframe.candidates` even though the array
physically lives in `pipeline.history.json`. A keyframe is **"approved" when `selected !== null`**. On
each run it diffs and acts (`build_viewer.mjs --plan` prints the action list):

1. A **`master`** that is **not yet approved** (`selected` is `null`) and has **fewer than
   `settings.candidates`** non-failed candidates → **generate** the remaining seeds for it
   (`generate-master`). An **approved** master is "full": once a candidate is chosen, accumulation
   stops — which is why the migrated birch (approved master) yields no `generate-master` action.
2. A **`child`** with **no candidates** *and* an **approved master** (master `selected` non-null) →
   **generate** it (`generate-child`), conditioned on the approved master.
3. An **`animation`** whose referenced keyframes are **approved** and whose `status` is `"pending"`
   → **animate** it (`animate`) — build the frames + preview GIF.
4. Any candidate with **`status: "failed"`** → **re-seed just that one** (`reseed` that single
   `idx`), leaving the rest untouched. (Applies to master and child candidates alike, even on an
   approved keyframe — a failed seed left a gap on disk worth regenerating.)

Because everything (including failures) is recorded in the history sidecar, the diff is exact and the
run is a cheap **gap-fill**, not a rebuild: already-approved keyframes and already-generated
animations are skipped. To deliberately regenerate something, flip its candidate(s) to `failed` (the
viewer's *regen* action does this) or flip an animation back to `pending` and re-run.

---

## Paths & layout

Every path in the pipeline — keyframe `selectedPath` (in `pipeline.json`), candidate `path` (in
`pipeline.history.json`), animation `gif`, item `priors`, and `styleSpec` — is **relative to
`pipeline.json`'s own dir**, `godot/assets/tiles/v2/`. The candidate `path` moved into the history
sidecar, but its base is still `v2/` (the sidecar is the sibling of `pipeline.json`). `path` is just a
pointer to a file on disk; the pipeline doesn't care *where* the file sits.

- **Legacy assets** keep their original `sets/<set>/…` paths (the pre-migration birch art lives
  under `sets/birch/keyframes/…`, `sets/birch/previews/…`).
- **New generation** uses an `items/<id>/<key>/NN.png` layout — candidate `idx` `N` → `NN.png` under
  the keyframe's directory. Both work because `path` is only a relative pointer; mixing them in one
  file is fine.

Priors usually point **out** of `v2/` to shipped tiles one directory up — e.g.
`"../tile_tree_oak.png"` resolves to `godot/assets/tiles/tile_tree_oak.png`.

---

## Canonical example — the migrated `birch_tree` item (split shape)

This is the real on-disk pair at `godot/assets/tiles/v2/pipeline.json` +
`godot/assets/tiles/v2/pipeline.history.json` after the birch set was migrated to the three-file
model. One item, `birch_tree`: the **autumn** keyframe is the **master** (the fuller-canopy base),
**winter** is its **child**, and three animations cover both idles plus the autumn→winter transition.
Each keyframe carries `selected: 0` + `selectedPath` (its shipped 32px PNG); the matching candidate
records (a single `approved` seed each) live in the sidecar, so gap-fill sees the family as complete.

`pipeline.json`:

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
        "selectedPath": "sets/birch/keyframes/tile_tree_birch_autumn.png"
      },
      "children": [
        {
          "id": "tile_tree_birch_winter",
          "prompt": "bare branches, snow on limbs",
          "selected": 0,
          "selectedPath": "sets/birch/keyframes/tile_tree_birch_winter.png"
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

`pipeline.history.json`:

```json
{
  "birch_tree": {
    "tile_tree_birch_autumn": [
      { "idx": 0, "path": "sets/birch/keyframes/tile_tree_birch_autumn.png", "status": "approved", "llm": "pass" }
    ],
    "tile_tree_birch_winter": [
      { "idx": 0, "path": "sets/birch/keyframes/tile_tree_birch_winter.png", "status": "approved", "llm": "pass" }
    ]
  }
}
```

Reading it: the `birch_tree` master (autumn) is approved (`selected: 0`), so the winter **child** is
eligible to derive from it; both idles and the transition are already `generated`, so a gap-fill run
does nothing for birch. The `physics` string on the transition is exactly the motion plan the
animator executes (staggered leaf-fall at terminal velocity, snow accumulating bottom-up). To add a
third season, append a child keyframe (`{ id, prompt, selected: null, selectedPath: null }`) to
`pipeline.json` — no `candidates` key on it — and leave the sidecar without an entry for that
keyframe (or `{}` for it); gap-fill then generates just that one from the approved master, keeping
the family cohesive via `priors`, and records the new seeds in `pipeline.history.json`.
