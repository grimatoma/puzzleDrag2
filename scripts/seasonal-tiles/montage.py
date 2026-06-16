#!/usr/bin/env python
"""Build an upscaled side-by-side comparison montage of pixel-art candidates.

Usage:
    python montage.py OUT.png SCALE "label1=path1.png" "label2=path2.png" ...

Each candidate is nearest-neighbour upscaled by SCALE, drawn on a checkerboard
so transparency is visible, and captioned with its label. Used to review
seasonal board-tile candidates at a size where outline/shading/pad shape read.
"""
import sys
from PIL import Image, ImageDraw, ImageFont


def checkerboard(w, h, cell=8, a=(210, 210, 214, 255), b=(180, 180, 186, 255)):
    img = Image.new("RGBA", (w, h), a)
    d = ImageDraw.Draw(img)
    for y in range(0, h, cell):
        for x in range(0, w, cell):
            if (x // cell + y // cell) % 2:
                d.rectangle([x, y, x + cell - 1, y + cell - 1], fill=b)
    return img


def main():
    out = sys.argv[1]
    scale = int(sys.argv[2])
    pairs = [arg.split("=", 1) for arg in sys.argv[3:]]

    try:
        font = ImageFont.truetype("arial.ttf", 14)
    except Exception:
        font = ImageFont.load_default()

    pad = 16
    cap_h = 40
    tiles = []
    for label, path in pairs:
        src = Image.open(path).convert("RGBA")
        big = src.resize((src.width * scale, src.height * scale), Image.NEAREST)
        bg = checkerboard(big.width, big.height)
        bg.alpha_composite(big)
        tiles.append((label, bg))

    tw = max(t.width for _, t in tiles)
    th = max(t.height for _, t in tiles)
    cols = len(tiles)
    W = pad + cols * (tw + pad)
    H = pad + th + cap_h
    canvas = Image.new("RGBA", (W, H), (28, 30, 34, 255))
    d = ImageDraw.Draw(canvas)
    x = pad
    for label, t in tiles:
        canvas.alpha_composite(t, (x, pad))
        lines = [ln.strip() for ln in label.split(",")]
        ty = pad + th + 4
        for ln in lines:
            d.text((x, ty), ln, fill=(235, 235, 235, 255), font=font)
            ty += 14
        x += tw + pad
    canvas.convert("RGB").save(out)
    print("wrote", out, canvas.size)


if __name__ == "__main__":
    main()
