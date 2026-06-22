# Montage verification & preview-doc regeneration

Two scratch procedures that turn type-clean tile modules into something you can
actually look at. The tile modules only use `import type`, so they bundle with
esbuild into a dependency-free IIFE with no engine needed.

Build these scripts in the **repo root** (so Node resolves the repo's
`playwright`), and **delete them before committing** — they're scratch.

## A. Quick montage (every tile × seasons + transitions)

Use this to eyeball a wave of new tiles. It renders each tile's 4 season stills +
3 transition mid-frames (p=0.5) into a grid PNG.

1. Write an entry that imports each module and puts them on `window`:

```ts
// /tmp/montage_entry.ts  — one import line + one row per tile
import { VARIANTS as PEPPER, TRANSITIONS as PEPPER_T } from "/abs/path/src/textures/seasonal/veg/pepper.ts";
// ...repeat for each tile...
(window as any).TILES = [
  { label: "Pepper", V: PEPPER, T: PEPPER_T },
  // ...
];
```

2. Bundle:

```bash
npx esbuild /tmp/montage_entry.ts --bundle --format=iife --target=es2020 \
  --outfile=_montage.bundle.js
```

3. `_montage.html` — a canvas that, for each tile row, draws a light tile-cell
   background, then `translate(cellCx, cellCy); scale(CELL/74, CELL/74)` (the art
   is authored in a −24..+24 box inside a 74px design tile) and calls
   `V[season].draw(ctx)` for the four seasons and `T[fromIdx](ctx, 0.5)` for the
   three transitions. Set `window.__ready = true` at the end. Wrap each draw in
   try/catch and print the tile+cell on error.

4. Screenshot with Playwright (script in repo root so `playwright` resolves):

```js
import { chromium } from 'playwright';
import { pathToFileURL } from 'url';
const b = await chromium.launch();
const p = await b.newPage({ deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e=>errs.push(e.message));
p.on('console', m=>{ if (m.type()==='error') errs.push(m.text()); });
await p.goto(pathToFileURL('/abs/path/_montage.html').href, { waitUntil: 'load' });
await p.waitForFunction('window.__ready===true', { timeout: 15000 }).catch(()=>{});
await p.$('#c').then(c=>c.screenshot({ path: '_montage.png' }));
console.log('errors:', errs.length ? errs : 'none');
await b.close();
```

5. Read `_montage.png`. Confirm: no runtime errors; the subject is recognizable
   and the SAME object in all four seasons; winter is frosted, not whited-out;
   transition mid-frames read as plausible interpolations. Then
   `rm _montage.html _montage.bundle.js _montage.png /tmp/montage_entry.ts`.

Common script bug: a double season lookup (`V[S[col.s]]` when `col.s` is already
the season string) — index with `V[col.s]`.

## B. Preview doc (`docs/seasonal-vector-tiles/`)

The standalone, no-server page the user reviews before integration. It loads the
real tile code via `tiles.bundle.js` and animates the full year (idle + morphs)
with play/pause, speed, year-scrub and hold-on-season controls, plus a reference
grid. To add tiles:

1. Regenerate `tiles.bundle.js`. The entry imports `SHOWCASE_TILES` /
   `SHOWCASE_TRANSITIONS` straight from `src/textures/seasonal/showcaseTiles.ts`
   and derives each tile's label/family from its key, so the preview tracks the
   registry automatically — there is no hand-maintained tile list to keep in
   sync (just wire the new tile into `showcaseTiles.ts` as usual). See
   `docs/seasonal-vector-tiles/README.md` for the exact esbuild command.
2. **Bump the cache-buster** in `index.html`: `tiles.bundle.js?v=N` → `?v=N+1`.
   The bundle has a stable filename, so without this the GitHub Pages CDN and
   returning browsers serve the stale bundle and the page looks unchanged.
3. Update the prose count / category list in `index.html` if the set changed.
4. Regenerate `preview.png` (a full-page Playwright screenshot of the doc) so the
   thumbnail on GitHub matches.

The deployed copy lives at
`https://grimatoma.github.io/puzzleDrag2/docs/seasonal-vector-tiles/index.html`
(Pages deploys on push to `main`).
