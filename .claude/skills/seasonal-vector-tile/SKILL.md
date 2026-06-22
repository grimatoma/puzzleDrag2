---
name: seasonal-vector-tile
description: >-
  Author all-vector animated seasonal board tiles for puzzleDrag2 — pure
  Canvas-2D vector art (NOT the PixelLab pixel/PNG pipeline) with four per-season
  redraws, a subtle idle loop, and forward season→season transition morphs, then
  wire them into the engine. Use this whenever the user wants to make / add /
  redo / animate one or more seasonal tiles the VECTOR way (e.g. "make a vector
  corn tile", "animate the apple's seasons", "add 10 more seasonal tiles",
  "give the sheep a winter coat transition", "the tile snaps at the end of the
  season morph", "the subject disappears in winter"), or to fix / extend the
  showcase set in src/textures/seasonal/**. Covers the parameterized-paint
  contract that keeps a subject's identity constant across seasons and makes the
  morphs seamless, the wave-dispatch workflow for batches, the registry wiring +
  tile-key validation gotchas, and montage / preview-doc verification. For the
  PixelLab PNG spritesheet route use seasonal-tile-pipeline instead; this skill
  is the hand-drawn vector alternative.
---

# Seasonal vector tile

Author board tiles whose seasonal art is drawn **entirely with Canvas-2D vector
paths** (no images, no spritesheets) — the hand-drawn alternative to the baked
PixelLab PNG route (`seasonal-tile-pipeline`). Each tile ships four per-season
stills, a subtle per-season idle loop, and three forward season→season
transition morphs, and renders live on the Phaser board.

This skill exists because two things are easy to get wrong and were learned the
hard way:

1. **A tile must stay the SAME recognizable subject in every season** — only its
   surface colour, frost/snow, and the pad's seasonal dressing change. (corn is a
   cob in all four seasons, never a bare stalk; a pepper is always a bell.)
2. **A season→season morph must not jerk at the end** — it has to start and end
   *exactly* on the neighbouring season still, then hand off to the idle at rest.

Both fall out for free from ONE architectural decision (the parameterized paint),
so the bulk of this skill is making sure every tile uses it.

## The contract (read this first)

The full per-tile authoring contract — the `paint(ctx, params, bob)` pattern,
the season-filter palette, framing, per-category notes (tree / fruit / veg /
grass / flower / animal / aquatic / mineral), idle and safety rules — lives in
**`references/paint-contract.md`**. Read it in full before authoring any tile,
and hand it to any subagent you delegate a tile to (point them at its absolute
path). The one-paragraph essence:

> Each tile is a single `paint(ctx, p, bob)` driven by an `interface P` of
> tweenable params (colours as `[r,g,b]`, amounts in 0..1). `SP[season]` holds
> the four param sets. `draw(season) = paint(SP[season], 0)`. `anim` adds a
> rest-anchored bob (`bobAt(0)===0`, seamless). Transitions are
> `paint(lerpP(SP[from], SP[from+1], smoother(p)), 0)`. Because a transition is
> just an eased lerp of the season params, `transition(0)≡draw(from)` and
> `transition(1)≡draw(to)` automatically — identity is preserved and the morph
> never snaps.

## What each subject should look like

`docs/tile-season-art-grid.md` is the project art catalog: per-subject Spring /
Summer / Autumn / Winter descriptors plus the global framing (the ground pad,
camera, light) and the **identity rule** verbatim. Find your subject's row there
and translate its four cells into the four `SP` param sets. Per-subject identity
and palette-lock strings also live in `tools/pixellab/subjects/<name>.mjs`.

A clean, current example to mirror: **`src/textures/seasonal/veg/pepper.ts`**.
Type contract: `src/textures/seasonal/types.ts`.

## Workflow

### 1. Pick the subject(s) and confirm the tile KEY
The board renders a tile by its **icon-registry key**, and the key does NOT
always match the source folder. Always confirm the real key against
`src/types/catalog/itemKeys.ts` before wiring:

```bash
grep -E '"tile_<something>"' src/types/catalog/itemKeys.ts
```

Known traps (verify, don't assume): heather's key is `tile_grass_heather` (not
`tile_flower_heather`); clover is `tile_bird_clover`; the "meadow" art is
`tile_grass_meadow` and its subject file is `grass.mjs`. A tile registered to a
non-existent key silently never renders — this happened and shipped once. The
folder a tile's `.ts` lives in is just where the art is authored; the key on the
right-hand side of the registry is what the board uses.

### 2. Author the module(s)
Create `src/textures/seasonal/<category>/<name>.ts` following
`references/paint-contract.md`. Export `VARIANTS` and `TRANSITIONS`.

For a **batch** (e.g. "make 50 more"), dispatch in **waves of ~10 parallel
subagents** grouped by category (so each wave montages coherently). Give each
subagent: the absolute path to `references/paint-contract.md`, the reference
example (`pepper.ts`), the target file path + tile key + category, and the
subject's four-season spec from the catalog. Have each verify its own file with
`npx tsc --noEmit -p tsconfig.json 2>&1 | grep -i '<file-subpath>'`. See the
`dispatching-parallel-agents` skill for the mechanics.

### 3. Wire into the registry
Two files, additive:
- `src/textures/seasonal/showcaseTiles.ts` — import each module's `VARIANTS` /
  `TRANSITIONS` and add `tile_<key>: VARS` to `SHOWCASE_TILES` and
  `SHOWCASE_TRANSITIONS`.
- `src/textures/seasonal/vectorPreferKeys.ts` — add each tile key to
  `VECTOR_PREFER_KEYS`. This is what gives the vector art precedence over any
  baked PNG anchor of the same key (the PNGs stay on disk for the pixel-sprite
  A/B toggle; they're just filtered out of the default baked manifest).

Keep both lists in sync — every key in one must be in the other. Add the same
keys to `SHOWCASE_KEYS` in `src/__tests__/seasonal-tiles.test.ts` (which
exercises every season + transition for runtime safety and checks the
transition lookups).

### 4. Verify
```bash
npx tsc --noEmit -p tsconfig.json          # clean
npx eslint src/textures/seasonal           # clean (watch for unused vars)
npx vitest run src/__tests__/seasonal-tiles.test.ts
npm test && npm run build                  # before a PR
```

### 5. Montage — SEE the art
Type-clean ≠ good-looking. Render every new tile × 4 seasons + 3 transition
mid-frames through the REAL code and look at it. The procedure (esbuild-bundle
the modules — they only `import type`, so they're dependency-free — then
screenshot a grid via Playwright) is in `references/montage-and-preview.md`.
Check: subject identity holds in all four seasons, winter isn't a white-out,
transitions read as sensible interpolations. Give the simpler procedural
subjects an extra look — the current dodo / goose / donkey / warthog set is on
the param model and reads cleanly, but a freshly-authored animal is the most
likely to need a polish pass, so flag any that don't hold up.

### 6. Update the preview doc
`docs/seasonal-vector-tiles/` is the standalone, no-server preview the user
reviews before integration. Regenerate its bundle to include the new tiles and
bump the `?v=` cache-buster in `index.html` (see `references/montage-and-preview.md`).

### 7. PR
Run the `pre-pr-check` skill. Note in the body that `visual-smoke` is a **known
non-blocking advisory** CI job (`continue-on-error: true`, already red on `main`
because its goldens were never re-baselined) — a board-rendering change will make
it diff, but it does NOT gate merge. The gating checks are lint / typecheck(×3) /
build / test / e2e.

## Gotchas (all observed in practice)
- **Key ≠ folder.** Validate every key against `itemKeys.ts` (§1). A bad key is a
  silent no-render.
- **Don't let winter erase the subject.** Frost/snow dust the upward surfaces; the
  subject stays clearly visible in its own colour. No white burst, no full ice
  coating. (Trees are the one exception — foliage may go bare; the trunk keeps
  identity.) The pansy was the last holdout — its original winter withered to a
  bare snow-covered stub (it predated this rule) and has since been refactored to
  the param model so winter is a frost-dusted, greyed-violet bloom with a light
  snow cap; mirror that, never the stub.
- **Idle must start at rest.** `bobAt(0)===0` with zero velocity, so the morph→idle
  hand-off has no positional jump. The engine restarts the idle clock at each
  settle (`seasonalVectorAdvance` returns `idleSec` from the last settle).
- **Transitions are forward-only** (Spring→Summer→Autumn→Winter). There is no
  Winter→Spring; a new run snaps back to Spring. `TRANSITIONS` keys are the
  from-season index `0|1|2`.
- **Montage/preview scripts are scratch.** Build them in the repo root (so Node
  resolves `playwright`), then delete them before committing — don't leave
  `_montage*.{html,mjs,png}` in the tree.
- **visual-smoke noise.** Expect it red on every PR that touches tile rendering;
  it's advisory. Don't regenerate goldens unless asked (that's a human-run
  `visual-rebaseline` job).
