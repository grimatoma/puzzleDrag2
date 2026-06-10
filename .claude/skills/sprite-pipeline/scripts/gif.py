#!/usr/bin/env python3
"""Assemble a frames folder into a looping preview GIF (review glue, like montage.py).

The pipeline's shipped artifact is the FRAMES (frames/<id>/NN.png — what the .tres packs);
the GIF is the human-facing preview the viewer shows. PixelLab animations come back as
per-frame PNGs, so something has to assemble the loop — this script, never hand-rolled
Pillow in a builder.

  python gif.py frames/tile_veg_pumpkin_autumn/ --out previews/tile_veg_pumpkin_autumn.gif [--fps 10]

Frames are taken in sorted filename order (00.png, 01.png, ...). Transparency is preserved
via a reserved palette index (PixelLab sprites have hard alpha edges, so 1-bit GIF
transparency is clean — no fringe). Dependency: Pillow.
"""
import argparse
import os

from PIL import Image


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("frames_dir", help="folder of NN.png frames")
    ap.add_argument("--out", required=True, help="output .gif path")
    ap.add_argument("--fps", type=float, default=10.0, help="playback rate (default 10)")
    args = ap.parse_args()

    names = sorted(n for n in os.listdir(args.frames_dir) if n.lower().endswith(".png"))
    if not names:
        raise SystemExit(f"no .png frames in {args.frames_dir}")
    frames = [Image.open(os.path.join(args.frames_dir, n)).convert("RGBA") for n in names]

    quantized = []
    for f in frames:
        q = f.convert("RGB").quantize(colors=255)  # leave index 255 for transparency
        mask = f.getchannel("A").point(lambda a: 255 if a < 128 else 0)
        q.paste(255, mask)
        quantized.append(q)

    os.makedirs(os.path.dirname(os.path.abspath(args.out)) or ".", exist_ok=True)
    quantized[0].save(
        args.out,
        save_all=True,
        append_images=quantized[1:],
        duration=int(round(1000 / args.fps)),
        loop=0,
        transparency=255,
        disposal=2,
    )
    print(f"{len(quantized)} frame(s) @ {args.fps}fps -> {args.out}")


if __name__ == "__main__":
    main()
