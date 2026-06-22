#!/usr/bin/env python3
"""Build review artifacts for the animated CANVAS icons from captured frames.

Reads reference/docs/canvas-tile-review/frames/<key>/f##.png and writes under
reference/docs/canvas-tile-review/:
  montages/<key>.png    hero (frame0, full res) + grid of all frames on checker
  gifs/<key>.gif        looping preview on parchment bg (see motion)
  category/<cat>.png     every hero in a module-category, side by side (cohesion)
  contact-sheet.png      all heroes grouped by category (global cohesion glance)
  metrics.json           per-icon: motion score, off-center, fill, frame size, blank?
"""
from __future__ import annotations
import glob, json, os, re
from PIL import Image, ImageDraw, ImageFont

FRAMES = "reference/docs/canvas-tile-review/frames"
OUT = "reference/docs/canvas-tile-review"
PARCH = (243, 239, 230, 255)
INK, SUB = (236, 238, 242), (150, 154, 162)
BG_A, BG_B = (60, 62, 68), (44, 46, 52)
PAD = 14

# module-category -> ordered key prefixes (so agents/sheets group like the source)
MODULES = {
    "arcane": ["arcane_"], "buildings": ["bld_"], "celestial": ["astral_"],
    "cozyDecor": ["cozy_"], "critters": ["bug_"], "crops": ["crop_"],
    "drinks": ["drink_"], "festive": ["festive_"], "furniture": ["furn_"],
    "gems": ["gem_"], "dishes": ["dish_"], "instruments": ["instr_"],
    "nature": ["nature_"], "ores": ["ore_"], "pets": ["pet_"], "reef": ["reef_"],
    "spells": ["spell_"], "treasure": ["treasure_"], "weapons": ["weapon_"],
    "weather": ["weather_"], "workshopTools": ["wtool_"],
}


def font(sz):
    for n in ("arial.ttf", "DejaVuSans.ttf"):
        try:
            return ImageFont.truetype(n, sz)
        except Exception:
            pass
    try:
        return ImageFont.load_default(size=sz)
    except TypeError:
        return ImageFont.load_default()


F_LBL, F_HDR, F_IDX, F_SM = font(22), font(30), font(16), font(17)


def checker(w, h, cell=14):
    bg = Image.new("RGBA", (w, h), BG_A)
    d = ImageDraw.Draw(bg)
    for y in range(0, h, cell):
        for x in range(0, w, cell):
            if ((x // cell) + (y // cell)) & 1:
                d.rectangle([x, y, x + cell, y + cell], fill=BG_B)
    return bg


def load_frames(key):
    fs = sorted(glob.glob(f"{FRAMES}/{key}/f*.png"))
    return [Image.open(f).convert("RGBA") for f in fs]


def on_bg(im, bg):
    c = Image.new("RGBA", im.size, bg)
    c.alpha_composite(im)
    return c


def bbox_metrics(fr):
    bb = fr.split()[3].point(lambda v: 255 if v > 16 else 0).getbbox()
    w, h = fr.size
    if not bb:
        return {"fill": 0.0, "off_x": 0.0, "off_y": 0.0, "blank": True}
    bw, bh = bb[2] - bb[0], bb[3] - bb[1]
    cx, cy = (bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2
    scale = w / 64.0  # design box 64 -> canvas px
    return {
        "fill": round((bw * bh) / (w * h), 3),
        "off_x": round((cx - w / 2) / scale, 1),
        "off_y": round((cy - h / 2) / scale, 1),
        "subj_w": round(bw / scale, 1), "subj_h": round(bh / scale, 1),
        "blank": (bw * bh) < 16,
    }


def motion_score(frames):
    """Mean per-pixel RGBA delta between consecutive frames incl. loop wrap,
    normalized to 0..~ (higher = more motion). ~0 means effectively static."""
    if len(frames) < 2:
        return 0.0
    small = [f.resize((128, 128), Image.BILINEAR) for f in frames]
    import itertools
    px = [s.load() for s in small]
    total = 0
    n = len(small)
    for i in range(n):
        a, b = px[i], px[(i + 1) % n]
        s = 0
        for y in range(0, 128, 2):
            for x in range(0, 128, 2):
                pa, pb = a[x, y], b[x, y]
                s += abs(pa[0] - pb[0]) + abs(pa[1] - pb[1]) + abs(pa[2] - pb[2]) + abs(pa[3] - pb[3])
        total += s
    return round(total / (n * 64 * 64), 2)


def hero_cell(key, hero, sz=220):
    hh = 28
    c = Image.new("RGBA", (sz + 8, sz + hh + 8), (28, 30, 34, 255))
    d = ImageDraw.Draw(c)
    d.text((4, 5), key.split("_", 1)[-1][:20], font=F_SM, fill=INK)
    cell = checker(sz, sz)
    cell.alpha_composite(hero.resize((sz, sz), Image.LANCZOS))
    c.paste(cell, (4, hh), cell)
    d.rectangle([4, hh, 4 + sz - 1, hh + sz - 1], outline=(90, 94, 102))
    return c


def grid_of(frames, thumb, cols, label, hero=None):
    gap, hh = 8, 38
    cells = frames
    rows = (len(cells) + cols - 1) // cols
    hero_h = (hero.height if hero else 0)
    W = max(cols * thumb + (cols + 1) * gap, (hero.width if hero else 0) + 2 * gap)
    H = hh + (hero_h + gap if hero else 0) + rows * (thumb + 20) + (rows + 1) * gap
    canvas = Image.new("RGBA", (W, H), (28, 30, 34, 255))
    d = ImageDraw.Draw(canvas)
    d.text((gap, 9), label, font=F_LBL, fill=INK)
    y0 = hh
    if hero is not None:
        cell = checker(hero.width, hero.height)
        cell.alpha_composite(hero)
        canvas.paste(cell, (gap, y0), cell)
        d.rectangle([gap, y0, gap + hero.width - 1, y0 + hero.height - 1], outline=(90, 94, 102))
        y0 += hero.height + gap
    for i, fr in enumerate(cells):
        r, c = divmod(i, cols)
        x = gap + c * (thumb + gap)
        y = y0 + gap + r * (thumb + 20 + gap)
        t = fr.resize((thumb, thumb), Image.LANCZOS)
        cell = checker(thumb, thumb)
        cell.alpha_composite(t)
        canvas.paste(cell, (x, y), cell)
        d.rectangle([x, y, x + thumb - 1, y + thumb - 1], outline=(80, 84, 92))
        d.text((x + 3, y + thumb + 2), f"{i}", font=F_IDX, fill=SUB)
    return canvas


def main():
    for sub in ("montages", "gifs", "category"):
        os.makedirs(f"{OUT}/{sub}", exist_ok=True)
    keys = sorted(os.path.basename(p) for p in glob.glob(f"{FRAMES}/*") if os.path.isdir(p))
    metrics, heroes = {}, {}

    for key in keys:
        frames = load_frames(key)
        if not frames:
            continue
        hero = frames[0]
        heroes[key] = hero
        # montage
        grid_of(frames, 200, 8, f"{key}   ({len(frames)} frames @ ~250ms sample)", hero=hero).save(f"{OUT}/montages/{key}.png")
        # gif on parchment
        gframes = [on_bg(f, PARCH).convert("P", palette=Image.ADAPTIVE, colors=255) for f in frames]
        gframes[0].save(f"{OUT}/gifs/{key}.gif", save_all=True, append_images=gframes[1:],
                        duration=110, loop=0, disposal=2)
        # metrics
        m = bbox_metrics(hero)
        m["motion"] = motion_score(frames)
        m["frames"] = len(frames)
        metrics[key] = m

    # category strips (by source module) + agent grouping file
    groups = {}
    for cat, prefixes in MODULES.items():
        ks = [k for k in keys if any(k.startswith(p) for p in prefixes)]
        if not ks:
            continue
        groups[cat] = ks
        strips = [hero_cell(k, heroes[k]) for k in ks]
        W = sum(s.width for s in strips) + PAD * (len(strips) + 1)
        Hc = max(s.height for s in strips) + PAD * 2 + 38
        canvas = Image.new("RGBA", (W, Hc), (20, 21, 24, 255))
        ImageDraw.Draw(canvas).text((PAD, 8), f"CATEGORY: {cat}  ({len(ks)})", font=F_HDR, fill=INK)
        x = PAD
        for s in strips:
            canvas.paste(s, (x, 46), s); x += s.width + PAD
        canvas.save(f"{OUT}/category/{cat}.png")

    # global contact sheet grouped by category
    cols, cell = 11, 150
    rowblocks = [(c, groups[c]) for c in MODULES if c in groups]
    H = sum(((len(ks) + cols - 1) // cols) * (cell + 22) + 40 for _, ks in rowblocks) + PAD * 2
    W = cols * cell + PAD * 2
    sheet = Image.new("RGBA", (W, H), (16, 17, 20, 255))
    d = ImageDraw.Draw(sheet)
    y = PAD
    for cat, ks in rowblocks:
        d.text((PAD, y), f"{cat}  ({len(ks)})", font=F_HDR, fill=INK); y += 38
        for i, k in enumerate(ks):
            r, c = divmod(i, cols)
            x = PAD + c * cell
            yy = y + r * (cell + 22)
            thumb = on_bg(heroes[k], PARCH).resize((cell - 10, cell - 10), Image.LANCZOS)
            sheet.paste(thumb, (x, yy))
            d.text((x, yy + cell - 9), k.split("_", 1)[-1][:18], font=F_SM, fill=SUB)
        y += ((len(ks) + cols - 1) // cols) * (cell + 22) + 6
    sheet.save(f"{OUT}/contact-sheet.png")

    json.dump({"groups": groups, "metrics": metrics}, open(f"{OUT}/metrics.json", "w"), indent=2)
    # console summary
    print(f"icons: {len(metrics)}")
    blanks = [k for k, m in metrics.items() if m.get("blank")]
    print("BLANK/empty hero:", blanks or "none")
    low = sorted(((m["motion"], k) for k, m in metrics.items()))[:12]
    print("LOWEST motion (near-static):", [f'{k}={v}' for v, k in low])
    off = sorted(((abs(m["off_x"]) + abs(m["off_y"]), k) for k, m in metrics.items()), reverse=True)[:10]
    print("MOST off-center (design units):", [f'{k}={round(v,1)}' for v, k in off])


if __name__ == "__main__":
    main()
