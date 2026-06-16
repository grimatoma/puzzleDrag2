# Engine integration — rendering baked seasonal art on the Phaser board

How the willow was hooked in, the exact extension points, how to generalize it to any subject, and how
to verify in-game. This is the second half of the pipeline (the first is generating + QA'ing the art).

## How the board renders tiles (the facts you need)

- Tiles are **procedural canvas textures**, not sprites-with-frames. `paintTileCanvas(ctx, res, selected,
  w, h, season, t?)` in `src/textures.ts` paints one tile (card chrome + icon). The icon resolves in
  priority order: concept-anim → seasonal-anim → seasonal-draw → `drawTileIcon`.
- **Season is derived, not stored:** `seasonIndexInSession(turnsUsed, turnBudget)` (`src/features/zones/
  data.ts`) → 0..3 = Spring/Summer/Autumn/Winter, exposed as `currentSeasonName(scene)` in `textures.ts`.
  Driven by registry `turnsUsed` + `turnBudget`. A run ends at Winter.
- The per-frame loop `GameScene._animateSeasonalTiles(tSec)` (~20fps) re-bakes the shared `tile_<key>`
  texture of any on-board tile that has a seasonal animation — this is what makes a tile move.
- **Texture key is double-prefixed:** `tile_${res.key}` where `res.key` already starts with `tile_` →
  e.g. `tile_tile_tree_willow`. The seasonal registry / your code keys on `res.key` (`tile_tree_willow`).
- Tile sprites get an angle **sway** from `TileObj.ambient()`; disable it for baked-art tiles (the motion
  is in the frames and the pad must not rotate).

## The willow controller pattern (`src/textures/seasonal/willowArt.ts`)

Self-contained (imports only the season-name types — no cycle back to `textures.ts`). Loads the 7
transparent spritesheets from `public/seasonal-tiles/willow/` via `fetch` + `createImageBitmap`. State is
module-level because every willow tile shares one texture and animates in lockstep.

- `preloadWillowArt()` — loads sheets; resolves true once the idle loops are present.
- `paintWillow(ctx, season, tSec)` — draws the right frame. `tSec <= 0` = static snap to the season's idle
  rest frame; `tSec > 0` drives the loop and, on an adjacent **forward** season change, plays that
  transition once before resuming the new idle. Season changes are **self-detected** from the `season`
  passed each call — no separate season-change wiring needed.
- `willowLoaded()` / `BAKED_SEASONAL_KEYS` (the set TileObj checks to skip sway).

Hook points (≈ the whole integration):
1. `paintTileCanvas` (textures.ts): `if (res.key === KEY && willowLoaded()) paintWillow(ctx, season, t ?? 0)`
   before the existing chain. Falls back to the procedural icon until loaded.
2. `GameScene.create()`: `preloadWillowArt().then(ok => ok && this._rebakeWillowStatic())`.
3. `GameScene._animateSeasonalTiles`: include the key in the reps scan when loaded (so the loop repaints it).
4. `GameScene.refreshSeasonTint`: `if (!this._motionEnabled()) this._rebakeWillowStatic()` (reduced-motion
   season flips). `_rebakeWillowStatic()` bakes the current-season rest frame once.
5. `TileObj.ambient()`: early-return for `BAKED_SEASONAL_KEYS` so the sprite doesn't rotate.

## Generalizing to ANY subject (recommended evolution)

`willowArt.ts` is willow-only. To onboard more subjects without copy-paste, refactor it into a registry,
e.g. `seasonalTileArt.ts`:

- A `register({ key, dir, seasons, transitions })` table: tile `res.key` → spritesheet folder under
  `public/seasonal-tiles/<subject>/` + which clips exist (so produce/animal subjects without a bare-mound
  just omit it). Animals/minerals are constant-subject so the same controller works — only the art differs.
- `paintSeasonal(ctx, key, season, t)` / `seasonalLoaded(key)` keyed by tile. `BAKED_SEASONAL_KEYS` becomes
  the registry's keyset. The five hook points above key on "is this tile registered" instead of "=== willow".
- Preload all registered subjects in `create()`.

Then onboarding a new subject = drop its sheets in `public/seasonal-tiles/<subject>/` + add one registry
entry. Keep the per-tile playback (idle vs periodic) configurable per the category (foliage can run
continuous; produce/animals/objects are better periodic — most tiles rest, life ripples through).

## Verify in-game (no screenshots — they time out)

The GameScene is reachable from any scene; the season is registry-driven; so you can drive it directly and
**pixel-sample** the rendered texture (WebGL canvas screenshots time out in this preview).

```js
// preview_eval — pull a 4-season montage of the actual in-game tile texture
(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  let gs = null;
  for (let i = 0; i < 44; i++) {                 // wait out the cold Vite boot
    try { gs = window.__phaserScene.game.scene.getScene('GameScene'); } catch { gs = null; }
    if (gs && gs.game.textures.exists('tile_tile_<key>') && gs._rebakeWillowStatic) break;
    gs = null; await sleep(500);
  }
  if (!gs) return 'not-ready';
  await sleep(2500);                              // let the sheets fetch
  const reg = gs.registry; reg.set('turnBudget', 20);
  const src = gs.game.textures.get('tile_tile_<key>').getSourceImage();
  const S = 96, m = document.createElement('canvas'); m.width = S*4; m.height = S;
  const mc = m.getContext('2d'); mc.imageSmoothingEnabled = false;
  mc.fillStyle = '#cfe0b8'; mc.fillRect(0,0,m.width,m.height);
  [['Spring',0],['Summer',7],['Autumn',12],['Winter',18]].forEach(([n,tu],i) => {
    reg.set('turnsUsed', tu); gs._rebakeWillowStatic(); mc.drawImage(src, i*S, 0, S, S);
  });
  reg.set('turnsUsed', 0); reg.set('turnBudget', null);
  return m.toDataURL();                           // saved to a file; decode with decode_dataurl.py
})()
```

The returned `data:` URL is too large for the tool result and gets saved to a file — decode it to a PNG
with `python tools/pixellab/decode_dataurl.py <saved-file> <out.png>` and Read it. The **per-season canopy
colour must differ** (the procedural fallback is season-identical, so four distinct season-correct colours
prove both the load path and the season pick). `seasonIndexInSession` with `turnBudget=20`: turnsUsed
0/7/12/18 → Spring/Summer/Autumn/Winter.
