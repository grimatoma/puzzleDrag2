#!/usr/bin/env python3
"""Assemble PixelLab animation frame-PNGs into transparent looping GIFs.

PixelLab returns each animation as a sequence of frame PNGs at public URLs
(.../unknown/{i}.png, i=0..n-1). This downloads them and builds a looping,
transparent GIF suitable for embedding in the concept report, plus an optional
horizontal montage for eyeballing the motion frame-by-frame.

Usage:
  one:       python _assemble.py "<url-template-with-{i}>" <frames> <out-no-ext> [--montage]
  manifest:  python _assemble.py --manifest manifest.json
             manifest = [ {"template": "...{i}...", "frames": 9, "out": "wheat/wheat-summer-128", "montage": true}, ... ]
"""
import sys, io, json, os, urllib.request
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return Image.open(io.BytesIO(r.read())).convert("RGBA")


def build(template, n, out_no_ext, montage=False, duration=110):
    frames = [fetch(template.format(i=i)) for i in range(n)]
    # alpha diagnostic: how many partially-transparent (anti-aliased) pixels?
    partial = 0
    for f in frames:
        partial += sum(1 for p in f.split()[3].getdata() if 0 < p < 255)

    out_gif = os.path.join(HERE, out_no_ext + ".gif")
    os.makedirs(os.path.dirname(out_gif), exist_ok=True)

    conv = []
    for f in frames:
        # hard-threshold alpha so GIF 1-bit transparency is clean (pixel art = crisp edges)
        a = f.split()[3].point(lambda x: 255 if x >= 128 else 0)
        rgb = f.convert("RGB")
        p = rgb.quantize(colors=255, method=Image.MEDIANCUT)  # indices 0..254, leave 255 for transparent
        trans_mask = a.point(lambda x: 255 if x == 0 else 0).convert("1")
        p.paste(255, trans_mask)
        p.info["transparency"] = 255
        conv.append(p)
    conv[0].save(out_gif, save_all=True, append_images=conv[1:],
                 duration=duration, loop=0, transparency=255, disposal=2, optimize=False)

    if montage:
        w, h = frames[0].size
        m = Image.new("RGBA", (w * n, h), (28, 34, 20, 255))
        for i, f in enumerate(frames):
            m.paste(f, (i * w, 0), f)
        m.save(os.path.join(HERE, out_no_ext + "_montage.png"))

    print(f"{out_no_ext}.gif  ({n} frames, {frames[0].size[0]}x{frames[0].size[1]}, partial-alpha px={partial})")
    return partial


if __name__ == "__main__":
    if len(sys.argv) >= 3 and sys.argv[1] == "--manifest":
        man = json.load(open(sys.argv[2]))
        for item in man:
            build(item["template"], int(item["frames"]), item["out"],
                  montage=item.get("montage", False), duration=item.get("duration", 110))
    else:
        template, n, out_no_ext = sys.argv[1], int(sys.argv[2]), sys.argv[3]
        build(template, n, out_no_ext, montage=("--montage" in sys.argv))
