#!/usr/bin/env python3
"""gen_hazard_tiles.py — author the two MISSING v1 hazard tile PNGs (M7a).

Two board hazard tiles ship NO art and so render as flat grey placeholder
squares (scenes/Tile.gd Stage-1 fallback) — the dominant "looks broken" signal:

  rat.png    — FARM rats hazard (Constants.Tile.RAT),    seeded into the farm board
  rubble.png — MINE cave-in hazard (Constants.Tile.RUBBLE), seeded into the mine board

Both are drawn in the SAME visual language as the exported v1 tiles
(godot/assets/tiles/tile_*.png, 90x90): a rounded-square inner panel with a
slightly darker ~7px rounded border, a soft white outer highlight ring + a soft
top highlight band, and a centered, flat-shaded, thin-outlined illustrative
subject. To match the smooth (anti-aliased) vector-illustration look of the
existing PNGs — NOT chunky pixel art — everything is drawn at SS=4x (360x360)
and downsampled to 90x90 with LANCZOS.

  rat:    a green/olive FARM panel (muted vs tile_grass_grass so it reads as a
          hazard) with a centered grey rodent — rounded body, head, round ear,
          dark eye, pink nose, thin curved tail, tiny feet; light-grey body,
          darker belly/back shadow, soft top highlight, thin dark outline.
  rubble: a grey MINE panel (like tile_mine_coal / tile_mine_stone) with a
          centered pile of 5 angular cracked-stone chunks, hue-shifted
          (cooler greys in shadow, warmer grey-brown in light), crack lines,
          a couple of small chips, a soft ground shadow under the pile, thin
          dark outlines — reads as cave-in debris, distinct from the coal gem.

Craft (per .claude/skills/pixel-art-animation/SKILL.md): single light source
upper-left, hue-shifted ramps (cool shadow / warm highlight), selective thin
outline, readable silhouette, no pillow-shading.

Run:  python godot/tools/gen_hazard_tiles.py
Writes godot/assets/tiles/rat.png and godot/assets/tiles/rubble.png (90x90 each).
"""

import math
import os

from PIL import Image, ImageDraw

# ── geometry (final px) ──────────────────────────────────────────────────────
SIZE = 90          # final tile size, matches every other v1 PNG
SS = 4             # supersample factor for smooth (anti-aliased) edges
S = SIZE * SS      # working canvas = 360

MARGIN = 6         # transparent gutter around the panel (px, final)
RADIUS = 18        # panel corner radius (px, final) — matches the exported tiles
BORDER = 7         # darker rounded border thickness (px, final)


def _c(rgb, a=255):
    return (int(rgb[0]), int(rgb[1]), int(rgb[2]), a)


def _shift(rgb, dr, dg, db):
    return (max(0, min(255, rgb[0] + dr)),
            max(0, min(255, rgb[1] + dg)),
            max(0, min(255, rgb[2] + db)))


def _round_rect(draw, box, radius, fill):
    """Rounded rectangle in supersampled space (radius/box already scaled)."""
    draw.rounded_rectangle(box, radius=radius, fill=fill)


def draw_panel(draw, inner_rgb, border_rgb):
    """The shared tile chrome: outer highlight ring, darker rounded border,
    lighter inner panel, soft top-highlight band. Coordinates in SS space."""
    m = MARGIN * SS
    r = RADIUS * SS
    b = BORDER * SS

    # 1) Soft white outer highlight ring (the faint glow the exported tiles have
    #    just outside the border). Two faint passes for a soft falloff.
    _round_rect(draw, (m - 4, m - 4, S - m + 4, S - m + 4), r + 4, (255, 255, 255, 28))
    _round_rect(draw, (m - 2, m - 2, S - m + 2, S - m + 2), r + 2, (255, 255, 255, 70))

    # 2) Darker rounded border (the panel frame).
    _round_rect(draw, (m, m, S - m, S - m), r, _c(border_rgb))

    # 3) Lighter inner panel.
    ir = max(2, r - b)
    _round_rect(draw, (m + b, m + b, S - m - b, S - m - b), ir, _c(inner_rgb))

    # 4) Soft top highlight band inside the panel (gentle top-down lighting).
    hi = _shift(inner_rgb, 18, 16, 16)
    top = m + b
    band_h = (S - 2 * (m + b)) * 0.34
    _round_rect(draw, (m + b, top, S - m - b, int(top + band_h)), ir, _c(hi, 120))


def _ellipse(draw, cx, cy, rx, ry, fill):
    draw.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=fill)


# ── RAT ──────────────────────────────────────────────────────────────────────

def draw_rat():
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # FARM panel, but muted/olive vs tile_grass_grass (=hazard read).
    INNER = (150, 178, 110)   # muted olive-green inner panel
    BORDERC = (110, 138, 74)  # darker olive border
    draw_panel(d, INNER, BORDERC)

    cx, cy = S * 0.50, S * 0.54   # rat sits a touch low-center

    # Rat palette — grey body, hue-shifted: cool shadow, warm-ish highlight.
    OUT = (54, 50, 58, 255)            # thin dark outline (slightly purple-grey)
    BODY = (168, 166, 172)             # mid grey body
    BELLY = (124, 122, 132)            # darker grey belly/back shadow (cool)
    HILITE = (206, 206, 210)           # soft top highlight (warm-neutral)
    EAR_IN = (196, 156, 162)           # inner ear (pinkish)
    NOSE = (214, 132, 146)             # pink nose
    EYE = (32, 28, 34, 255)

    sc = SS  # everything below in final-px units * sc

    def E(x, y, rx, ry, fill):
        _ellipse(d, cx + x * sc, cy + y * sc, rx * sc, ry * sc, fill)

    # --- TAIL (thin curved line, drawn first so body overlaps its root) ---
    tail_pts = []
    for i in range(0, 41):
        t = i / 40.0
        # start at right hip, sweep down-right then curl up
        tx = 16 + 18 * t
        ty = 4 + 12 * math.sin(t * math.pi * 0.9) - 6 * t
        tail_pts.append((cx + tx * sc, cy + ty * sc))
    d.line(tail_pts, fill=OUT, width=int(3.2 * sc), joint="curve")
    inner_tail = []
    for i in range(0, 41):
        t = i / 40.0
        tx = 16 + 18 * t
        ty = 4 + 12 * math.sin(t * math.pi * 0.9) - 6 * t
        inner_tail.append((cx + tx * sc, cy + ty * sc))
    d.line(inner_tail, fill=(150, 122, 128, 255), width=int(1.4 * sc), joint="curve")

    # --- FEET (tiny) ---
    for fx in (-9, -1, 7):
        E(fx, 12.5, 2.6, 2.2, OUT)
        E(fx, 12.0, 1.9, 1.5, BELLY + (255,))

    # --- BODY (big rounded oval, leaning left toward the head) ---
    E(0.5, 3.0, 20.5, 14.5, OUT)        # outline pass
    E(0.5, 3.0, 18.8, 12.9, BODY + (255,))
    # belly / lower-back shadow
    E(2.5, 6.5, 15.5, 8.2, BELLY + (255,))
    # top highlight on the back (upper-left light)
    E(-4.0, -2.0, 11.0, 6.0, HILITE + (170,))

    # --- HEAD (left, slightly up) ---
    hx, hy = -17.5, -3.5
    E(hx, hy, 11.8, 10.4, OUT)
    E(hx, hy, 10.3, 8.9, BODY + (255,))
    E(hx + 1.5, hy + 2.8, 7.2, 5.4, BELLY + (255,))   # cheek/jaw shadow
    E(hx - 2.5, hy - 3.0, 5.2, 3.6, HILITE + (180,))  # forehead highlight

    # --- SNOUT (tapering toward lower-left) ---
    E(hx - 8.0, hy + 3.2, 5.4, 4.2, OUT)
    E(hx - 8.0, hy + 3.2, 4.2, 3.1, BODY + (255,))
    # nose
    E(hx - 11.6, hy + 4.4, 2.4, 2.0, OUT)
    E(hx - 11.6, hy + 4.2, 1.7, 1.4, NOSE + (255,))

    # --- EAR (round, upper head) ---
    ex, ey = hx + 3.5, hy - 8.5
    E(ex, ey, 6.2, 6.4, OUT)
    E(ex, ey, 4.9, 5.1, BODY + (255,))
    E(ex, ey + 0.6, 2.9, 3.1, EAR_IN + (255,))        # pink inner ear

    # --- EYE (small dark) ---
    E(hx - 1.5, hy - 0.5, 2.1, 2.1, EYE)
    E(hx - 2.2, hy - 1.2, 0.8, 0.8, (240, 240, 245, 255))  # catchlight

    # --- WHISKERS (thin, light) ---
    wx, wy = hx - 9.5, hy + 2.5
    for ddy in (-2.0, 0.5, 3.0):
        d.line([(cx + wx * sc, cy + (wy + ddy * 0.3) * sc),
                (cx + (wx - 9) * sc, cy + (wy + ddy) * sc)],
               fill=(70, 66, 72, 200), width=max(1, int(0.9 * sc)))

    return img


# ── RUBBLE ───────────────────────────────────────────────────────────────────

def draw_rubble():
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # MINE panel (grey, like tile_mine_coal / tile_mine_stone).
    INNER = (180, 184, 189)
    BORDERC = (120, 124, 130)
    draw_panel(d, INNER, BORDERC)

    cx, cy = S * 0.50, S * 0.50
    sc = SS

    OUT = (44, 42, 46, 255)            # thin dark outline
    CRACK = (60, 56, 58, 255)          # crack lines

    # Ground shadow blob under the pile (soft, no hard edge).
    _ellipse(d, cx, cy + 17 * sc, 30 * sc, 9 * sc, (40, 38, 42, 70))
    _ellipse(d, cx, cy + 16 * sc, 25 * sc, 6.5 * sc, (40, 38, 42, 60))

    def poly(pts, fill):
        d.polygon([(cx + x * sc, cy + y * sc) for (x, y) in pts], fill=fill)

    def chunk(pts, base, *, light, shadow, cracks=()):
        """Draw one angular rock chunk: outline halo, flat base, a lit facet
        (upper-left) and a shadow facet (lower-right), then crack lines."""
        # outline halo: draw the polygon slightly grown in OUT first
        cxs = sum(p[0] for p in pts) / len(pts)
        cys = sum(p[1] for p in pts) / len(pts)
        grown = []
        for (x, y) in pts:
            vx, vy = x - cxs, y - cys
            ln = math.hypot(vx, vy) or 1.0
            grown.append((x + vx / ln * 1.6, y + vy / ln * 1.6))
        poly(grown, OUT)
        poly(pts, base)
        # lit facet — upper-left half toward the centroid
        lit = [pts[0], pts[1], (cxs, cys)]
        poly(lit, light)
        # shadow facet — lower-right
        shad = [pts[-2], pts[-1], (cxs, cys)]
        poly(shad, shadow)
        for cseg in cracks:
            d.line([(cx + x * sc, cy + y * sc) for (x, y) in cseg],
                   fill=CRACK, width=max(1, int(1.2 * sc)))

    # Hue-shifted greys: cooler (blue) in shadow, warmer (brown) in light.
    # Five chunks, back-to-front so the pile overlaps believably.
    # back-left chunk
    chunk([(-18, -2), (-9, -10), (-1, -4), (-4, 6), (-15, 8)],
          base=(132, 134, 140),
          light=(176, 174, 170),     # warm-ish light facet
          shadow=(96, 100, 110),     # cool shadow facet
          cracks=[[(-12, -6), (-7, 3)]])
    # back-right chunk
    chunk([(2, -6), (12, -11), (20, -3), (16, 7), (5, 5)],
          base=(126, 128, 135),
          light=(170, 168, 163),
          shadow=(90, 94, 106),
          cracks=[[(9, -7), (13, 3)]])
    # top-center chunk (highest, catches most light)
    chunk([(-8, -10), (0, -17), (9, -12), (7, -2), (-5, -3)],
          base=(150, 150, 152),
          light=(192, 188, 180),
          shadow=(110, 112, 122),
          cracks=[[(-2, -13), (2, -5)]])
    # front-left chunk
    chunk([(-20, 6), (-10, 2), (-3, 8), (-7, 16), (-18, 15)],
          base=(120, 122, 129),
          light=(162, 160, 156),
          shadow=(84, 88, 100),
          cracks=[[(-13, 6), (-9, 13)]])
    # front-right chunk (foremost)
    chunk([(0, 7), (10, 4), (19, 9), (15, 17), (3, 16)],
          base=(138, 138, 142),
          light=(178, 174, 168),
          shadow=(98, 100, 110),
          cracks=[[(7, 8), (10, 15)], [(11, 7), (14, 13)]])

    # A few small loose chips for the "debris" read — angular splinters, not
    # round dots, grounded near the base of the pile.
    chips = [
        [(-23, -6), (-19, -9), (-17, -4), (-21, -3)],
        [(20, -11), (24, -10), (23, -6), (19, -7)],
        [(-5, 19), (-1, 17), (1, 20), (-3, 22)],
        [(21, 6), (24, 5), (24, 9), (21, 9)],
    ]
    for ch in chips:
        cxs = sum(p[0] for p in ch) / len(ch)
        cys = sum(p[1] for p in ch) / len(ch)
        grown = []
        for (x, y) in ch:
            vx, vy = x - cxs, y - cys
            ln = math.hypot(vx, vy) or 1.0
            grown.append((x + vx / ln * 1.4, y + vy / ln * 1.4))
        poly(grown, OUT)
        poly(ch, (148, 148, 152, 255))
        poly([ch[0], ch[1], (cxs, cys)], (176, 174, 170, 255))   # lit facet

    return img


def _finish(big):
    return big.resize((SIZE, SIZE), Image.LANCZOS)


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    out_dir = os.path.normpath(os.path.join(here, "..", "assets", "tiles"))
    os.makedirs(out_dir, exist_ok=True)

    rat = _finish(draw_rat())
    rubble = _finish(draw_rubble())

    rat_path = os.path.join(out_dir, "rat.png")
    rubble_path = os.path.join(out_dir, "rubble.png")
    rat.save(rat_path)
    rubble.save(rubble_path)
    print("wrote", rat_path, rat.size)
    print("wrote", rubble_path, rubble.size)


if __name__ == "__main__":
    main()
