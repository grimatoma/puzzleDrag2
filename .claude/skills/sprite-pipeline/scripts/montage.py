#!/usr/bin/env python3
"""Upscale a pixel-art still, or montage a frame sequence, for visual review.

This is the sprite-pipeline's ONE sanctioned use of Pillow: review glue, never the
animation executor (all motion is built in Aseprite — see references/aseprite-execution.md).
You cannot judge tiny pixel art — or whether motion is organic vs a rigid slide — from the
raw files; this upscales nearest-neighbor (pixels stay crisp) so you can actually SEE it.

Three input shapes, auto-detected:

  python montage.py frames/tile_tree_birch_autumn/   # a FOLDER of NN.png frames -> montage
  python montage.py previews/tile_tree_birch_autumn.gif  # a GIF (its frames)    -> montage
  python montage.py keyframes/tile_tree_birch_autumn.png --scale 10  # a single PNG -> upscale

A folder is sorted by filename (so 00.png, 01.png, … land in order — the on-disk frame layout
the pipeline writes). The montage lays every frame in a grid: scanning the row shows whether the
shape RE-FORMS (alive) or just slid (mechanical), whether a tip lags, and whether neighbours are
out of phase. This is the Gate-4 montage review — always run it before calling an animation done.

  python montage.py frames/<id>/ --cols 8 --scale 4 --out review.png

It prints the output PNG path — open it, or `Read` it if you're an agent.
Dependency-light: Pillow only (>=10 for Image.Resampling).  pip install Pillow
"""
import argparse
import math
import os
import tempfile

from PIL import Image, ImageSequence

# Frame files a folder montage will pick up, in sorted order.
_FRAME_EXTS = (".png", ".gif", ".bmp", ".webp")


def _hex(h):
    """'#rrggbb' (or 'rrggbb') -> (r, g, b)."""
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def _compose(fr, scale, bg):
    """Flatten one RGBA frame onto a solid bg (so transparency reads), then upscale N x."""
    base = Image.new("RGB", fr.size, bg)
    base.paste(fr, (0, 0), fr)
    return base.resize((fr.width * scale, fr.height * scale), Image.Resampling.NEAREST)


def _load_frames(path):
    """Return [RGBA frame, ...] for a single still, an animated GIF, or a folder of PNGs."""
    if os.path.isdir(path):
        names = sorted(
            n for n in os.listdir(path) if n.lower().endswith(_FRAME_EXTS)
        )
        if not names:
            raise SystemExit(f"no frame images ({', '.join(_FRAME_EXTS)}) found in {path}")
        return [Image.open(os.path.join(path, n)).convert("RGBA") for n in names]
    im = Image.open(path)
    return [f.convert("RGBA") for f in ImageSequence.Iterator(im)]


def _montage(frames, scale, cols, bg):
    """Lay frames into an upscaled grid (cols wide), left-to-right, top-to-bottom."""
    cw, ch = frames[0].width * scale, frames[0].height * scale
    cols = min(cols, len(frames))
    rows = math.ceil(len(frames) / cols)
    out = Image.new("RGB", (cw * cols, ch * rows), bg)
    for i, fr in enumerate(frames):
        out.paste(_compose(fr, scale, bg), ((i % cols) * cw, (i // cols) * ch))
    return out


def main():
    ap = argparse.ArgumentParser(
        description="Upscale a still or montage a frame sequence (folder/GIF) for pixel-art review."
    )
    ap.add_argument(
        "input",
        help="a single .png/.gif still (upscale), an animated .gif (montage), "
        "or a folder of NN.png frames (montage)",
    )
    ap.add_argument(
        "--scale",
        type=int,
        default=0,
        help="upscale factor (default: 4 for a montage, 8 for a single still)",
    )
    ap.add_argument("--cols", type=int, default=8, help="columns in the montage grid (default 8)")
    ap.add_argument(
        "--bg", default="#5f5f64", help="bg color behind transparency, #rrggbb (default #5f5f64)"
    )
    ap.add_argument("--out", default="", help="output PNG path (default: a temp-dir file)")
    a = ap.parse_args()

    frames = _load_frames(a.input)
    n = len(frames)
    bg = _hex(a.bg)

    if n <= 1:
        out = _compose(frames[0], a.scale or 8, bg)
    else:
        out = _montage(frames, a.scale or 4, a.cols, bg)

    stem = os.path.basename(os.path.normpath(a.input))
    stem = os.path.splitext(stem)[0] or "montage"
    path = a.out or os.path.join(tempfile.gettempdir(), stem + ".review.png")
    out.save(path)
    print(f"{n} frame(s) -> {path}  ({out.width}x{out.height})")


if __name__ == "__main__":
    main()
