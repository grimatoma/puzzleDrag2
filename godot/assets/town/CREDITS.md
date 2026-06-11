# Town art credits

The PNGs under `stock/` are curated slices cut from three third-party asset
packs by `godot/tools/slice_town_assets.py` (the script records the exact
source-sheet coordinates, so re-slicing from the raw packs is reproducible).
The full packs are **not** committed — only the slices below. Per-file
source + license metadata also lives in `manifest.json` (`source` / `license`
fields on every entry).

## Serene Village Revamped — LimeZu (CC-BY 4.0)

- Author: LimeZu
- URL: https://limezu.itch.io/serenevillagerevamped
- License: [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/) — **attribution required** (this file + the in-repo manifest metadata provide it)
- Taken: the 22 house exteriors under `stock/buildings/` (8 silhouettes × 3
  roof colors, one per `BuildingConfig` shape family), most ground tiles
  (`ground_grass`, `ground_grass_flowers`, `ground_path`, `ground_plaza`,
  `ground_water`, plus `ground_water_anim` — the 14-frame 16×16 wave strip
  from `Animated stuff/water_waves_16x16.png`), and all `stock/decor/`
  sprites except the lamp (trees, bush, flowers, fences, sign, mailbox,
  rocks).

## Ninja Adventure — Pixel-boy & AAA (CC0)

- Authors: Pixel-boy (Sébastien Canela) & AAA
- URL: https://pixel-boy.itch.io/ninja-adventure-asset-pack
- License: [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) (public domain, attribution appreciated)
- Taken: the six villager walk spritesheets under `stock/characters/`
  (`villager_a`–`villager_f`: Villager, Villager2, Villager3, Villager4,
  Woman, OldMan — each a 64×64 sheet of 16×16 frames, columns =
  down/up/left/right facing, rows = the 4 walk frames), the fishing boat
  (`board_fish`), and the street lamp (`lamp`, the standing paper lantern
  from `Backgrounds/Tilesets/TilesetElement.png`).

## Tiny Town — Kenney (CC0)

- Author: Kenney (kenney.nl)
- URL: https://kenney.nl/assets/tiny-town
- License: [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) (public domain, attribution appreciated)
- Taken: the tilled-field farm plot (`board_farm`), the stone mine arch
  (`board_mine`, enclosed doorway transparency filled dark by the slicer),
  and the dirt empty-plot pad (`ground_pad`).
