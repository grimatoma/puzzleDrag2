# Seasonal vector tiles — animation preview

A standalone, self-contained preview of the all-vector seasonal tiles (13 of
them, across tree / fruit / grain / veg / flower / livestock) — four per-season
redraws, subtle idle loops, and forward season→season transition morphs. It runs
the **actual** tile-drawing code from `src/`, so it's a faithful "before
integration" sign-off surface for the motion.

Each tile is one parameterized `paint()` with a per-season parameter set; the
season stills are `paint(seasonParams)`, the idle adds a rest-anchored bob, and
the transitions are an eased lerp of those params — which keeps the subject's
identity constant across seasons and makes every morph start/end exactly on the
neighbouring season still (no snap at the idle hand-off). To regenerate the
bundle, point the esbuild entry below at all the per-tile modules under
`src/textures/seasonal/**` and re-run it.

Open `index.html` directly in a browser — no dev server needed.

## Regenerating the bundle

`tiles.bundle.js` is the three art modules bundled with esbuild (their only
imports are `import type`, so the bundle is dependency-free). Regenerate after
editing the art:

```bash
printf '%s\n' \
  'import { VARIANTS as OAK, TRANSITIONS as OAK_T } from "../../src/textures/seasonal/tree/oak.ts";' \
  'import { VARIANTS as PANSY, TRANSITIONS as PANSY_T } from "../../src/textures/seasonal/flower/pansy.ts";' \
  'import { VARIANTS as APPLE, TRANSITIONS as APPLE_T } from "../../src/textures/seasonal/fruit/apple.ts";' \
  'window.SEASONAL_DEMO = { tiles: [' \
  '  { key: "tile_tree_oak", label: "Oak", family: "tree", V: OAK, T: OAK_T },' \
  '  { key: "tile_flower_pansy", label: "Pansy", family: "flower", V: PANSY, T: PANSY_T },' \
  '  { key: "tile_fruit_apple", label: "Apple", family: "fruit", V: APPLE, T: APPLE_T },' \
  '] };' > docs/seasonal-vector-tiles/_entry.ts
npx esbuild docs/seasonal-vector-tiles/_entry.ts --bundle --format=iife --target=es2020 \
  --outfile=docs/seasonal-vector-tiles/tiles.bundle.js
rm docs/seasonal-vector-tiles/_entry.ts
```
