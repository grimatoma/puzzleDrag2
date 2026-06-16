#!/usr/bin/env python3
"""
Slice a tileset image into a labelled montage so you can SEE which tiles are
fills, which are terrain-transition tiles (edges / corners / inner-corners),
and what each tile's index is. This is the first move when designing or fixing
a tile scene: you cannot autotile terrain you can't identify.

Why this matters: a tileset usually ships a full grass<->dirt or grass<->path
"blob" (fill + 4 edges + 4 outer corners + 4 inner corners) that the renderer
never uses. Seeing the sheet at index-resolution is how you find them.

Handles the two things that silently corrupt naive slicing:
  - margin  : blank border around the whole sheet (pixels)
  - spacing : gap between tiles (pixels) -- "extruded" tilesets (e.g. the
              Tuxemon set: margin=1, spacing=2) bleed edge pixels into the gap.
Tile index i lives at  col = i % cols,  row = i // cols,
pixel  sx = margin + col*(tile+spacing),  sy = margin + row*(tile+spacing).

Usage:
  python tileset_montage.py SHEET.png --tile 32 --cols 24 --margin 1 --spacing 2
  python tileset_montage.py SHEET.png --tile 32 --cols 24 --rows 0-9        # band
  python tileset_montage.py SHEET.png --tile 16 --crop 40-90 --scale 8 -o out.png

Output: a PNG montage with every tile upscaled (NEAREST, so pixels stay crisp)
and its index printed beneath it. Read it back with your image viewer / Read tool.
"""
import argparse
from PIL import Image, ImageDraw, ImageFont


def load_font(size):
    for name in ("arialbd.ttf", "arial.ttf", "DejaVuSans-Bold.ttf", "DejaVuSans.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except Exception:
            continue
    return ImageFont.load_default()


def parse_range(spec, hi):
    """'5', '5-9' -> (lo, hi) inclusive tile-row or index range."""
    if spec is None:
        return None
    if "-" in spec:
        a, b = spec.split("-", 1)
        return int(a), int(b)
    v = int(spec)
    return v, v


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("sheet")
    ap.add_argument("--tile", type=int, default=32, help="tile size in px")
    ap.add_argument("--cols", type=int, default=0, help="columns (0 = infer from width)")
    ap.add_argument("--margin", type=int, default=0)
    ap.add_argument("--spacing", type=int, default=0)
    ap.add_argument("--scale", type=int, default=4, help="upscale factor for the montage")
    ap.add_argument("--rows", default=None, help="only these tile-rows, e.g. 0-9")
    ap.add_argument("--crop", default=None, help="only these tile-indices, e.g. 40-90")
    ap.add_argument("-o", "--out", default="tileset_montage.png")
    a = ap.parse_args()

    src = Image.open(a.sheet).convert("RGBA")
    W, H = src.size
    pitch = a.tile + a.spacing
    cols = a.cols or max(1, (W - a.margin + a.spacing) // pitch)
    rows = max(1, (H - a.margin + a.spacing) // pitch)

    row_lo, row_hi = parse_range(a.rows, rows) or (0, rows - 1)
    crop = parse_range(a.crop, cols * rows)

    SCALE, LAB = a.scale, max(12, a.tile // 2)
    cell = a.tile * SCALE
    out_cols = cols
    out_rows = row_hi - row_lo + 1
    out = Image.new("RGBA", (out_cols * cell, out_rows * (cell + LAB)), (32, 34, 40, 255))
    d = ImageDraw.Draw(out)
    font = load_font(max(9, a.tile // 3))

    for r in range(row_lo, row_hi + 1):
        for c in range(cols):
            idx = r * cols + c
            if crop and not (crop[0] <= idx <= crop[1]):
                continue
            sx = a.margin + c * pitch
            sy = a.margin + r * pitch
            if sx + a.tile > W or sy + a.tile > H:
                continue
            tile = src.crop((sx, sy, sx + a.tile, sy + a.tile)).resize((cell, cell), Image.NEAREST)
            ox, oy = c * cell, (r - row_lo) * (cell + LAB)
            out.paste((60, 62, 70, 255), (ox, oy, ox + cell, oy + cell))   # checker-ish bg for alpha
            out.alpha_composite(tile, (ox, oy))
            d.rectangle([ox, oy, ox + cell - 1, oy + cell - 1], outline=(96, 98, 108, 255))
            d.text((ox + 2, oy + cell), str(idx), fill=(255, 238, 150, 255), font=font)

    out.convert("RGB").save(a.out)
    print(f"saved {a.out}  ({out.size[0]}x{out.size[1]})  cols={cols} rows={rows}")


if __name__ == "__main__":
    main()
