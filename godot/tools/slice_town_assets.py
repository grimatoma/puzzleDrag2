#!/usr/bin/env python3
"""Slice the curated Stardew-style village sprites out of the downloaded asset packs.

Phase 0 of the top-down village plan (godot/assets/town/stock/). The three packs
are NOT committed to the repo — only the curated slices this script cuts are.
Re-running the script is the reproducible path from raw packs to committed PNGs:

    python godot/tools/slice_town_assets.py --packs-dir "%TEMP%/town-packs/extracted"

Expected packs-dir layout (each pack unzipped into its own folder):
    kenney/Tilemap/tilemap_packed.png                  (Kenney Tiny Town, CC0)
    serene/SERENE_VILLAGE_REVAMPED/Serene_Village_16x16.png
    serene/SERENE_VILLAGE_REVAMPED/Construct 3/Autotiles_no_inner_corners_16x16.png
                                                       (Serene Village Revamped, CC-BY 4.0)
    ninja/Ninja Adventure - Asset Pack/...             (Ninja Adventure, CC0)

Sources:
    Serene Village Revamped by LimeZu — https://limezu.itch.io/serenevillagerevamped (CC-BY 4.0)
    Ninja Adventure by Pixel-boy & AAA — https://pixel-boy.itch.io/ninja-adventure-asset-pack (CC0)
    Tiny Town by Kenney — https://kenney.nl/assets/tiny-town (CC0)

Outputs PNGs under godot/assets/town/stock/{ground,buildings,characters,decor}/
plus godot/assets/town/manifest.json (id -> file/w/h/anchor/footprint/kind/license/source).
TownArtConfig.gd parses the manifest at runtime (it is whitelisted in
export_presets.cfg include_filter so the Web export ships it); the headless gate
test (godot/tests/run_town_assets_tests.gd) asserts every entry loads.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

from PIL import Image

REPO_GODOT = Path(__file__).resolve().parent.parent
OUT_ROOT = REPO_GODOT / "assets" / "town"

# Pack-relative sheet paths.
SHEETS = {
    "serene": "serene/SERENE_VILLAGE_REVAMPED/Serene_Village_16x16.png",
    "serene_auto": "serene/SERENE_VILLAGE_REVAMPED/Construct 3/Autotiles_no_inner_corners_16x16.png",
    "kenney": "kenney/Tilemap/tilemap_packed.png",
}
NINJA_ROOT = "ninja/Ninja Adventure - Asset Pack"

LIC_SERENE = {"license": "CC-BY 4.0", "source": "Serene Village Revamped by LimeZu (limezu.itch.io/serenevillagerevamped)"}
LIC_KENNEY = {"license": "CC0", "source": "Tiny Town by Kenney (kenney.nl/assets/tiny-town)"}
LIC_NINJA = {"license": "CC0", "source": "Ninja Adventure by Pixel-boy & AAA (pixel-boy.itch.io/ninja-adventure-asset-pack)"}

# ── Slice tables ───────────────────────────────────────────────────────────────
# Each entry: id -> (sheet, box(l,t,r,b) in source px, out subdir, footprint tiles, lic)
# Boxes were mapped by visual inspection of the sheets (see PR notes).

GROUND = {
    # 16x16 ground paint tiles (one TileSetAtlasSource each in TownArtConfig.build_tileset()).
    "ground_grass":  ("serene", (48, 0, 64, 16), LIC_SERENE),
    # The seamless full-dirt FILL tile from the main sheet. (The autotile sheet's
    # dirt block at (16,0) is a grass-TRANSITION edge tile — tiled, it repeats a
    # grass blob along every tile's right edge.)
    "ground_path":   ("serene", (160, 32, 176, 48), LIC_SERENE),
    "ground_plaza":  ("serene", (272, 64, 288, 80), LIC_SERENE),
    "ground_water":  ("serene", (192, 16, 208, 32), LIC_SERENE),
    "ground_pad":    ("kenney", (16, 32, 32, 48), LIC_KENNEY),
}
# Grass variant: Serene grass tile + the small white-flower decal composited on top
# (keeps the ground palette 100% Serene instead of mixing Kenney's hue).
GRASS_FLOWER_DECAL = ("serene", (32, 222, 48, 238))

# Serene house sheet: 24 houses, 8 silhouettes x 3 roof colors. Boxes from
# connected-component detection over the sheet (exact sprite bounds).
_RED = {
    "small_a": (2, 344, 45, 395), "small_b": (50, 344, 93, 395),
    "gable": (99, 336, 155, 395), "wide": (166, 336, 235, 395),
    "big_a": (7, 405, 74, 459), "big_b": (87, 405, 154, 459),
    "tall_a": (165, 400, 203, 460), "tall_b": (213, 400, 245, 460),
}
_GREEN = {
    "small_a": (2, 472, 45, 523), "small_b": (50, 472, 93, 523),
    "gable": (99, 464, 155, 523), "wide": (166, 464, 235, 523),
    "big_a": (7, 533, 74, 587), "big_b": (87, 533, 154, 587),
    "tall_a": (165, 528, 203, 588), "tall_b": (213, 528, 245, 588),
}
_BLUE = {
    "small_a": (2, 600, 45, 651), "small_b": (50, 600, 93, 651),
    "gable": (99, 592, 155, 651), "wide": (166, 592, 235, 651),
    "big_a": (7, 661, 74, 715), "big_b": (87, 661, 154, 715),
    "tall_a": (165, 656, 203, 716), "tall_b": (213, 656, 245, 716),
}

# Building art id (= BuildingConfig shape family) -> Serene house sprite.
# Every distinct BuildingConfig.shape_of() value gets its own visually distinct
# house (silhouette x color); "house" doubles as the generic fallback.
BUILDINGS = {
    "house":       _RED["small_a"],
    "cottage":     _RED["small_b"],
    "cookhouse":   _RED["gable"],
    "barn":        _RED["wide"],
    "workshop":    _RED["big_a"],
    "forge":       _RED["big_b"],
    "mill":        _RED["tall_a"],
    "smokehut":    _RED["tall_b"],
    "coop":        _GREEN["small_a"],
    "garden":      _GREEN["small_b"],
    "rotunda":     _GREEN["gable"],
    "stable":      _GREEN["wide"],
    "lumber":      _GREEN["big_a"],
    "sawmill":     _GREEN["big_b"],
    "silo":        _GREEN["tall_a"],
    "cellar":      _GREEN["tall_b"],
    "hut":         _BLUE["small_a"],
    "skep":        _BLUE["small_b"],
    "chapel":      _BLUE["gable"],
    "observatory": _BLUE["tall_b"],
    "bunker":      _BLUE["tall_a"],
    "mine":        _BLUE["big_b"],
}

# Decor: trees / fences / sign / flowers / bush / rocks, all Serene (the lamp
# is emitted separately from the Ninja pack below). The two big trees are the
# ISOLATED single-tree sprites in the row at y 202 — the earlier crops from the
# overlapping tree rows (y 245/293) dragged in the neighbour tree's tan trunk.
# The sign crop starts at y 208 so the 1-px gray base sliver of the sprite
# above it (sheet rows 206-207) stays out.
DECOR = {
    "tree_green":     (176, 202, 208, 240),
    "tree_teal":      (208, 202, 240, 240),
    "tree_small":     (272, 210, 302, 240),
    "bush":           (112, 192, 128, 208),
    "flowers_red":    (32, 192, 48, 208),
    "flowers_blue":   (48, 192, 64, 208),
    "flowers_yellow": (64, 192, 80, 208),
    "fence_h":        (80, 272, 96, 288),
    "fence_post":     (64, 226, 80, 242),
    "mailbox":        (112, 254, 128, 272),
    "sign":           (112, 208, 128, 224),
    "rock_small":     (16, 238, 32, 254),
    "rock_tall":      (48, 224, 64, 254),
}

# Street lamp: Ninja Adventure's standing paper lantern (TilesetElement.png).
# Neither the Serene Village sheet nor Kenney Tiny Town ships a lamp prop, so
# the village lamp post comes from the third pack. Box excludes the wall ring
# above it (rows <= 47) and the unrelated props left/right of it.
LAMP_SHEET = "Backgrounds/Tilesets/TilesetElement.png"
LAMP_BOX = (97, 48, 111, 77)

# Ninja Adventure villagers: SeparateAnim/Walk.png is a 64x64 sheet of 16x16
# frames — columns = facing (down, up, left, right), rows = the 4 walk frames.
CHARACTERS = {
    "villager_a": "Actor/Character/Villager/SeparateAnim/Walk.png",
    "villager_b": "Actor/Character/Villager2/SeparateAnim/Walk.png",
    "villager_c": "Actor/Character/Villager3/SeparateAnim/Walk.png",
    "villager_d": "Actor/Character/Villager4/SeparateAnim/Walk.png",
    "villager_e": "Actor/Character/Woman/SeparateAnim/Walk.png",
    "villager_f": "Actor/Character/OldMan/SeparateAnim/Walk.png",
}


def footprint_for(kind: str, w: int, h: int) -> list[int]:
    """Ground tiles blocked by the sprite, in 16px cells."""
    if kind == "ground":
        return [1, 1]
    if kind == "building":
        return [max(1, round(w / 16)), 2]
    if kind == "character":
        return [1, 1]
    return [1, 1]  # decor


def anchor_for(kind: str, w: int, h: int) -> list[int]:
    """Floor-center-bottom point in texture px (renderer sets Sprite2D.offset = -anchor)."""
    if kind == "ground":
        return [8, 16]
    if kind == "character":
        return [8, 15]  # per 16x16 frame
    # Houses/trees keep a ~2px grass fringe below the wall line.
    return [w // 2, h - 2]


def fill_enclosed_transparency(im: Image.Image, fill=(28, 22, 36, 255)) -> Image.Image:
    """Flood-fill transparency reachable from the border; any remaining fully
    transparent pixels are ENCLOSED (e.g. the dark doorway inside the Kenney
    arch) and get painted `fill` so the mine entrance reads as a dark opening."""
    im = im.copy()
    px = im.load()
    w, h = im.size
    outside = set()
    stack = [(x, y) for x in range(w) for y in (0, h - 1)] + [(x, y) for y in range(h) for x in (0, w - 1)]
    stack = [p for p in stack if px[p[0], p[1]][3] == 0]
    outside.update(stack)
    while stack:
        cx, cy = stack.pop()
        for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
            if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in outside and px[nx, ny][3] == 0:
                outside.add((nx, ny))
                stack.append((nx, ny))
    for y in range(h):
        for x in range(w):
            if px[x, y][3] == 0 and (x, y) not in outside:
                px[x, y] = fill
    return im


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--packs-dir", default=os.path.join(os.environ.get("TEMP", "/tmp"), "town-packs", "extracted"),
                    help="Directory holding the unzipped packs (kenney/, serene/, ninja/)")
    args = ap.parse_args()
    packs = Path(os.path.expandvars(args.packs_dir))
    if not packs.is_dir():
        print(f"packs dir not found: {packs}", file=sys.stderr)
        return 1

    sheets = {k: Image.open(packs / v).convert("RGBA") for k, v in SHEETS.items()}
    manifest: dict[str, dict] = {}

    def emit(art_id: str, im: Image.Image, subdir: str, kind: str, lic: dict, extra: dict | None = None) -> None:
        out_dir = OUT_ROOT / "stock" / subdir
        out_dir.mkdir(parents=True, exist_ok=True)
        fname = f"{art_id}.png"
        im.save(out_dir / fname)
        entry = {
            "file": f"stock/{subdir}/{fname}",
            "w": im.width,
            "h": im.height,
            "anchor": anchor_for(kind, im.width, im.height),
            "footprint": footprint_for(kind, im.width, im.height),
            "kind": kind,
            **lic,
        }
        if extra:
            entry.update(extra)
        manifest[art_id] = entry

    # Ground tiles.
    for art_id, (sheet, box, lic) in GROUND.items():
        emit(art_id, sheets[sheet].crop(box), "ground", "ground", lic)
    # Grass + flower decal variant.
    grass = sheets[GROUND["ground_grass"][0]].crop(GROUND["ground_grass"][1]).copy()
    decal = sheets[GRASS_FLOWER_DECAL[0]].crop(GRASS_FLOWER_DECAL[1])
    grass.alpha_composite(decal)
    emit("ground_grass_flowers", grass, "ground", "ground", LIC_SERENE)

    # Buildings (Serene houses).
    for art_id, box in BUILDINGS.items():
        emit(art_id, sheets["serene"].crop(box), "buildings", "building", LIC_SERENE)

    # Board landmarks (kind "landmark": the farm / mine / fish-dock board entrances).
    emit("board_farm", sheets["kenney"].crop((0, 16, 48, 64)), "buildings", "landmark", LIC_KENNEY,
         {"footprint": [3, 3], "anchor": [24, 46]})
    arch = fill_enclosed_transparency(sheets["kenney"].crop((48, 144, 80, 176)))
    emit("board_mine", arch, "buildings", "landmark", LIC_KENNEY,
         {"footprint": [2, 2], "anchor": [16, 31]})
    boat = Image.open(packs / NINJA_ROOT / "Backgrounds/Vehicles/Boat.png").convert("RGBA")
    emit("board_fish", boat, "buildings", "landmark", LIC_NINJA,
         {"footprint": [5, 2], "anchor": [40, 30]})

    # Villager walk sheets (4 dirs x 4 frames of 16x16).
    for art_id, rel in CHARACTERS.items():
        sheet = Image.open(packs / NINJA_ROOT / rel).convert("RGBA")
        emit(art_id, sheet, "characters", "character", LIC_NINJA,
             {"frame_w": 16, "frame_h": 16, "columns": "down,up,left,right", "rows": "walk frames 0-3"})

    # Decor.
    for art_id, box in DECOR.items():
        emit(art_id, sheets["serene"].crop(box), "decor", "decor", LIC_SERENE)
    # The street lamp (Ninja Adventure — see LAMP_SHEET note above).
    element = Image.open(packs / NINJA_ROOT / LAMP_SHEET).convert("RGBA")
    emit("lamp", element.crop(LAMP_BOX), "decor", "decor", LIC_NINJA)

    OUT_ROOT.mkdir(parents=True, exist_ok=True)
    with open(OUT_ROOT / "manifest.json", "w", encoding="utf-8", newline="\n") as f:
        json.dump({
            "tile": 16,
            # BLESSED deviation from the Phase-0 spec's literal (w/2, h): see
            # anchor_for() — buildings/decor anchor at (w//2, h-2) so the
            # sprite's ~2px grass fringe sits below the floor line.
            "anchor_convention": (
                "Floor-center-bottom in texture px. Buildings/decor use (w//2, h-2) — "
                "2px above the sprite's bottom edge, keeping the baked-in grass fringe "
                "below the wall line — not the spec's literal (w/2, h). Ground tiles "
                "anchor at (8,16); characters at (8,15) per 16x16 frame."
            ),
            "entries": manifest,
        }, f, indent=2, sort_keys=True)
        f.write("\n")
    total = sum((OUT_ROOT / e["file"]).stat().st_size for e in manifest.values())
    print(f"wrote {len(manifest)} slices, {total} bytes of PNG, manifest at {OUT_ROOT / 'manifest.json'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
