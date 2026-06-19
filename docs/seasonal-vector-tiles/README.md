# Seasonal vector tiles — animation preview

A standalone, self-contained preview of the all-vector seasonal tiles
(`tile_tree_oak`, `tile_flower_pansy`, `tile_fruit_apple`) — four per-season
redraws, subtle idle loops, and forward season→season transition morphs. It runs
the **actual** tile-drawing code from `src/`, so it's a faithful "before
integration" sign-off surface for the motion.

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
