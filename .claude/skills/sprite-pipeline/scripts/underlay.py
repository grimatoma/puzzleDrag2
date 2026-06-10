#!/usr/bin/env python3
"""Pin a keyframe's static pixels under every animation frame (mechanical conformance fix).

PixelLab v3 routinely DROPS small static base elements (a grass tuft, a ground shadow, a
snow mound) after frame 0 — the loop then pops every cycle. This script underlays the
approved keyframe's pixels, restricted to a row band, beneath each frame:

    out[i] = alpha_composite( keyframe[rows y0..y1] , frame[i] )

so anything the animation actually draws still wins (it sits on top), and the band's static
pixels only show through where the frame went transparent. This is NOT art generation — it
re-applies already-approved keyframe pixels deterministically (same category as montage.py /
gif.py review glue). For surgical per-pixel edits beyond a band underlay, use the Aseprite
polish pass instead.

  python underlay.py frames/tile_tree_birch_autumn/ --base keyframes/autumn.png --rows 24:32
  python underlay.py frames/<id>/ --base <keyframe.png> --rows 24:32 --skip 0

--rows y0:y1   the half-open pixel-row band [y0, y1) to pin (REQUIRED — pin the smallest
               band that contains the dropped element, not the whole canvas).
--skip N       frame indices to leave untouched, comma-separated (default "0" — frame 0 is
               the reference frame and already equals the keyframe).

Frames are edited IN PLACE (they're regenerable pipeline outputs). Prints per-frame px added.
"""
import argparse
import os

from PIL import Image


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("frames_dir", help="folder of NN.png frames (edited in place)")
    ap.add_argument("--base", required=True, help="the approved keyframe PNG to pin from")
    ap.add_argument("--rows", required=True, help="row band y0:y1 (half-open) to pin")
    ap.add_argument("--skip", default="0", help="comma-separated frame indices to skip (default: 0)")
    args = ap.parse_args()

    y0, y1 = (int(v) for v in args.rows.split(":"))
    skip = {int(s) for s in args.skip.split(",") if s.strip() != ""}

    base = Image.open(args.base).convert("RGBA")
    band = Image.new("RGBA", base.size, (0, 0, 0, 0))
    band.paste(base.crop((0, y0, base.width, y1)), (0, y0))

    names = sorted(n for n in os.listdir(args.frames_dir) if n.lower().endswith(".png"))
    if not names:
        raise SystemExit(f"no .png frames in {args.frames_dir}")
    for i, n in enumerate(names):
        if i in skip:
            print(f"{n}: skipped (reference)")
            continue
        p = os.path.join(args.frames_dir, n)
        fr = Image.open(p).convert("RGBA")
        if fr.size != base.size:
            raise SystemExit(f"{n}: size {fr.size} != keyframe {base.size}")
        before = sum(1 for px in fr.getdata() if px[3] > 0)
        out = Image.alpha_composite(band, fr)
        after = sum(1 for px in out.getdata() if px[3] > 0)
        out.save(p)
        print(f"{n}: +{after - before} px pinned")


if __name__ == "__main__":
    main()
