#!/usr/bin/env python3
"""Upscale a pixel-art still, or montage every frame of a GIF, for visual review.

You cannot judge tiny pixel art — or whether motion is organic vs a slide — from the raw
file. This upscales nearest-neighbor (pixels stay crisp) so you can actually SEE it:

  python preview_frames.py sprite.gif              # frame-grid montage  -> review the MOTION
  python preview_frames.py sprite.png --scale 10   # upscale a still     -> review the ART
  python preview_frames.py sprite.gif --cols 8 --scale 4 --out montage.png

The montage lays every frame in a grid: scanning the row shows whether the shape RE-FORMS
(alive) or just slid (mechanical), whether the tip lags, and whether neighbors are out of
phase. Always montage-review before calling an animation done.

It prints the output PNG path — open it, or `Read` it if you're an agent.
Pillow only:  pip install Pillow
"""
import argparse, math, os, tempfile
from PIL import Image, ImageSequence


def _hex(h):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def _compose(fr, scale, bg):
    """Flatten one RGBA frame onto a solid bg (so transparency reads), then upscale."""
    base = Image.new("RGB", fr.size, bg)
    base.paste(fr, (0, 0), fr)
    return base.resize((fr.width * scale, fr.height * scale), Image.NEAREST)


def main():
    ap = argparse.ArgumentParser(description="Upscale / montage pixel-art for review.")
    ap.add_argument("input", help="path to a .gif (montage) or .png/.gif still (upscale)")
    ap.add_argument("--scale", type=int, default=0,
                    help="upscale factor (default 4 for a gif montage, 8 for a still)")
    ap.add_argument("--cols", type=int, default=8, help="columns in the montage grid")
    ap.add_argument("--bg", default="#5f5f64", help="bg color behind transparency (#rrggbb)")
    ap.add_argument("--out", default="", help="output PNG path (default: temp dir)")
    a = ap.parse_args()

    im = Image.open(a.input)
    frames = [f.convert("RGBA") for f in ImageSequence.Iterator(im)]
    n = len(frames)
    bg = _hex(a.bg)

    if n <= 1:
        out = _compose(frames[0], a.scale or 8, bg)
    else:
        scale = a.scale or 4
        cw, ch = frames[0].width * scale, frames[0].height * scale
        cols = min(a.cols, n)
        rows = math.ceil(n / cols)
        out = Image.new("RGB", (cw * cols, ch * rows), bg)
        for i, fr in enumerate(frames):
            out.paste(_compose(fr, scale, bg), ((i % cols) * cw, (i // cols) * ch))

    path = a.out or os.path.join(
        tempfile.gettempdir(),
        os.path.splitext(os.path.basename(a.input))[0] + ".review.png")
    out.save(path)
    print(f"{n} frame(s) -> {path}  ({out.width}x{out.height})")


if __name__ == "__main__":
    main()
