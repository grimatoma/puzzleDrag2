# Town art asset credits

## Town tileset — `tileset.png`

- **Original art**, generated for this project; covered by the repository
  license. No third-party assets.
- **Generator:** `tools/gen-town-tileset.mjs` — a deterministic, dependency-free
  Node script that authors the 32px ground (grass, the grass↔path autotile blob,
  water) and baked props with one warm storybook palette and a single baked key
  light (sun upper-left). Sheet geometry matches the loader: 816×1020, 24 cols,
  32px tiles, `margin=1`, `spacing=2`; tile indices match the
  `roadAutotile.ts` / `TownScene.ts` contract. Run `node tools/gen-town-tileset.mjs`
  to regenerate (`--preview` also writes `docs/town-tileset-preview.png`).
- Replaces the former Tuxemon placeholder sheet (CC-BY-SA 4.0), which mixed a
  generic RPG palette with the procedural buildings — the cohesion the rebuild
  fixes.

The remaining asset below is **not** covered by this repository's code license;
it retains its original Creative Commons license and is credited as required.

## "Misa" 4-direction walk atlas — `character-atlas.png` / `character-atlas.json`

- **Source:** Tuxemon project character sprite — https://github.com/Tuxemon/Tuxemon
- **License:** CC-BY-SA 4.0 (Attribution-ShareAlike)
- **Via:** https://github.com/remarkablegames/phaser-rpg (`src/assets/atlas/`),
  originally from the Phaser 3 tilemap tutorial above.

Run `node tools/download-town-assets.mjs` to (re)fetch these files from source.
