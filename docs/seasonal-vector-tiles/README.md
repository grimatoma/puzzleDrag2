# Seasonal vector tiles — animation preview

A standalone, self-contained preview of the all-vector seasonal tiles (80 of
them, across every board category — tree / fruit / grain / veg / grass / flower /
bird / herd / cattle / mount / fish / mineral / coin / special) — four per-season
redraws, subtle idle loops, and forward season→season transition morphs. It runs
the **actual** tile-drawing code from `src/`, so it's a faithful "before
integration" sign-off surface for the motion.

Each tile is one parameterized `paint()` with a per-season parameter set; the
season stills are `paint(seasonParams)`, the idle adds a rest-anchored bob, and
the transitions are an eased lerp of those params — which keeps the subject's
identity constant across seasons and makes every morph start/end exactly on the
neighbouring season still (no snap at the idle hand-off).

Open `index.html` directly in a browser — no dev server needed.

## Regenerating the bundle

`tiles.bundle.js` is built **straight from the live showcase registry**
(`src/textures/seasonal/showcaseTiles.ts`), so it can never drift from the board
roster — adding a tile to the registry adds it to the preview automatically. The
art modules only `import type`, so the bundle is dependency-free. Regenerate
after editing any tile or adding a new one:

```bash
cat > docs/seasonal-vector-tiles/_entry.ts <<'EOF'
import { SHOWCASE_TILES, SHOWCASE_TRANSITIONS } from "../../src/textures/seasonal/showcaseTiles.ts";
const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
const labelFor = (key: string): string => key.split("_").slice(2).map(cap).join(" ");
const familyFor = (key: string): string => key.split("_")[1] ?? "";
const tiles = Object.keys(SHOWCASE_TILES).map((key) => ({
  key, label: labelFor(key), family: familyFor(key),
  V: SHOWCASE_TILES[key], T: SHOWCASE_TRANSITIONS[key],
}));
(window as unknown as { SEASONAL_DEMO: unknown }).SEASONAL_DEMO = { tiles };
EOF
npx esbuild docs/seasonal-vector-tiles/_entry.ts --bundle --format=iife --target=es2020 \
  --outfile=docs/seasonal-vector-tiles/tiles.bundle.js
rm docs/seasonal-vector-tiles/_entry.ts
```

> The bundle has a stable filename, so `index.html` loads it with a cache-busting
> query (`tiles.bundle.js?v=N`). **After regenerating, bump that `?v=` number in
> `index.html`** — otherwise returning visitors (and the GitHub Pages CDN) may keep
> serving the previously cached bundle and the page will look unchanged.
>
> Then regenerate `preview.png` (a full-page screenshot of the doc) so the GitHub
> thumbnail matches, and update the tile count in the `index.html` prose if the
> set changed.
