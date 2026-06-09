#!/usr/bin/env python3
"""Assemble v2 deliverables from frames_v2/ — transparent 64px tiles, GIFs,
spritesheet strips, and upscaled previews. Pixel-identical to an Aseprite export
(hard 1-bit alpha), just produced in one pass."""
import os, glob, shutil
from PIL import Image

OUT = os.path.dirname(os.path.abspath(__file__))
F = os.path.join(OUT, "frames_v2")
O = os.path.join(OUT, "out")
W = H = 64
SEASONS = ["spring", "summer", "autumn", "winter"]
TRANS = ["spring_summer", "summer_autumn", "autumn_winter"]


def load(name):
    fs = sorted(glob.glob(os.path.join(F, f"trans_{name}", "f*.png")))
    return [Image.open(p).convert("RGBA") for p in fs]


def save_gif(frames, path, dur):
    """Transparent GIF via median-cut + magenta key (robust for >255 colours)."""
    KEY = (255, 0, 255)
    opaque = {px[:3] for fr in frames for px in fr.getdata() if px[3] >= 128}
    while KEY in opaque:
        KEY = (KEY[0] - 1, KEY[1], KEY[2] - 1)
    flats = []
    for fr in frames:
        bb = Image.new("RGB", (W, H), KEY); bb.paste(fr, (0, 0), fr); flats.append(bb)
    montage = Image.new("RGB", (W, H * len(flats)))
    for i, ff in enumerate(flats):
        montage.paste(ff, (0, i * H))
    pal_img = montage.quantize(colors=255, method=Image.MEDIANCUT)
    palette = pal_img.getpalette()
    ncol = len(palette) // 3
    ent = [(palette[i], palette[i + 1], palette[i + 2]) for i in range(0, ncol * 3, 3)]
    keyidx = min(range(len(ent)), key=lambda i: sum((ent[i][j] - KEY[j]) ** 2 for j in range(3)))
    ps = []
    for fr, ff in zip(frames, flats):
        q = list(ff.quantize(palette=pal_img, dither=Image.NONE).getdata())
        a = [px[3] for px in fr.getdata()]
        q = [keyidx if a[i] < 128 else q[i] for i in range(len(q))]
        p = Image.new("P", (W, H)); p.putpalette(palette); p.putdata(q); ps.append(p)
    ps[0].save(path, save_all=True, append_images=ps[1:], loop=0,
               duration=dur, transparency=keyidx, disposal=2, optimize=False)


def sheet(frames, path):
    n = len(frames)
    s = Image.new("RGBA", (W * n, H), (0, 0, 0, 0))
    for i, fr in enumerate(frames):
        s.alpha_composite(fr, (i * W, 0))
    s.save(path)


def preview_gif(frames, path, dur, scale=5, bg=(96, 100, 108)):
    out = []
    for fr in frames:
        b = Image.new("RGB", (W, H), bg); b.paste(fr, (0, 0), fr)
        out.append(b.resize((W * scale, H * scale), Image.Resampling.NEAREST).convert("P", palette=Image.ADAPTIVE))
    out[0].save(path, save_all=True, append_images=out[1:], loop=0, duration=dur, disposal=1, optimize=True)


def dur_for(name, n):
    return [450] + [80] * (n - 2) + ([700] if name == "autumn_winter" else [650])


# stills -> 64px tiles
for s in SEASONS:
    shutil.copyfile(os.path.join(F, f"still_{s}.png"), os.path.join(O, f"birch_v2_{s}.png"))

# transitions -> gif + sheet + preview
for name in TRANS:
    frames = load(name)
    d = dur_for(name, len(frames))
    save_gif(frames, os.path.join(O, f"birch_v2_trans_{name}.gif"), d)
    sheet(frames, os.path.join(O, f"birch_v2_trans_{name}_sheet.png"))
    preview_gif(frames, os.path.join(O, f"preview_v2_{name}_5x.gif"), d)
    print(name, len(frames), "frames -> gif+sheet+preview")

# stills strip preview (dark bg, 8x)
sc = 8
strip = Image.new("RGBA", (W * sc * 4 + 30 * 5, H * sc + 60), (34, 36, 40, 255))
x = 30
for s in SEASONS:
    im = Image.open(os.path.join(O, f"birch_v2_{s}.png")).convert("RGBA")
    strip.alpha_composite(im.resize((W * sc, H * sc), Image.Resampling.NEAREST), (x, 30)); x += W * sc + 30
strip.convert("RGB").save(os.path.join(O, "preview_v2_stills_strip.png"))
print("stills strip ok")
