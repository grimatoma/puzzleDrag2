#!/usr/bin/env python3
"""Procedural animated pixel-art grass tiles (32x32).

Why this exists: the first pass animated "sway" by shifting the upper rows of a
static sprite sideways (a rigid shear), which reads as a block sliding, not a
plant. This generator instead models each blade as a flexible cantilever and
RE-RASTERISES every frame as a genuinely re-curved blade:

  * displacement grows toward the tip   ~ s**BEND_EXP   (base stays rooted)
  * the oscillation is phase-delayed by height  wind(t - LAG*s)
    so the bend travels UP the blade -> the tip lags the base (whip / follow-through)
  * each blade has its own phase  -> a gust rolls across the clump (out of phase)
  * a slow breathing envelope makes the gust build and ease
  * slight vertical foreshortening as a blade leans over

Outputs grass-1/2/3 .gif (looping, transparent) + .png (one lively still) next to
this file. 32x32 native; the docs page upscales nearest-neighbour via CSS.
"""
import math, os
from PIL import Image

W = H = 32
GROUND_Y = 27          # soil surface row (blades root here)
N_FRAMES = 16
DUR_MS = 80            # ~1.28 s loop, smooth
BEND_EXP = 1.7         # cantilever amplitude profile along the blade
LAG = 1.15            # phase the tip lags the base (radians) -> follow-through
OUTDIR = os.path.dirname(os.path.abspath(__file__))


def hx(h):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def wind(phase):
    # periodic gust: fundamental + a little 2nd harmonic for a natural asymmetry
    return math.sin(phase) + 0.25 * math.sin(2 * phase + 0.6)


class Buf:
    def __init__(self):
        self.px = [[(0, 0, 0, 0)] * W for _ in range(H)]

    def put(self, x, y, c):
        xi, yi = int(round(x)), int(round(y))
        if 0 <= xi < W and 0 <= yi < H:
            self.px[yi][xi] = (c[0], c[1], c[2], 255)

    def get(self, x, y):
        xi, yi = int(round(x)), int(round(y))
        if 0 <= xi < W and 0 <= yi < H:
            return self.px[yi][xi]
        return (0, 0, 0, 0)

    def image(self):
        im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        flat = [self.px[y][x] for y in range(H) for x in range(W)]
        im.putdata(flat)
        return im


class Blade:
    def __init__(self, bx, height, lean, width_base, phase, amp, ramp,
                 outline=None, flower=None, flower_kind=None):
        self.bx = bx; self.height = height; self.lean = lean
        self.width_base = width_base; self.phase = phase; self.amp = amp
        self.ramp = ramp                  # (dark, mid, hi, bright)
        self.outline = outline            # rgb or None
        self.flower = flower              # rgb tuple list or None  -> drawn at tip
        self.flower_kind = flower_kind    # 'daisy'|'pink'|'bud'

    def tip_disp(self, tphase):
        env = 0.72 + 0.28 * math.sin(tphase - math.pi / 2)
        return self.amp * wind(tphase - LAG + self.phase) * env

    def centerline(self, tphase):
        env = 0.72 + 0.28 * math.sin(tphase - math.pi / 2)
        pts = []
        n = self.height
        td = abs(self.tip_disp(tphase))
        for k in range(n + 1):
            s = k / n if n else 0.0
            rest = self.lean * (s ** 1.4) * self.height * 0.16
            bend = self.amp * (s ** BEND_EXP) * wind(tphase - LAG * s + self.phase) * env
            x = self.bx + rest + bend
            # foreshorten: lose a touch of vertical reach as it leans
            y = GROUND_Y - k * (1.0 - 0.10 * min(1.0, td / max(self.amp, 0.01)) * s)
            half = max(0.0, self.width_base * (1.0 - 0.85 * s))
            pts.append((x, y, half, s))
        return pts

    def draw(self, buf, tphase):
        pts = self.centerline(tphase)
        # walk finely so rows never gap as x moves
        steps = self.height * 4
        for i in range(steps + 1):
            f = i / steps
            kk = f * self.height
            k0 = int(min(self.height, math.floor(kk)))
            k1 = min(self.height, k0 + 1)
            fr = kk - k0
            x0, y0, h0, s0 = pts[k0]; x1, y1, h1, s1 = pts[k1]
            x = x0 + (x1 - x0) * fr; y = y0 + (y1 - y0) * fr
            half = h0 + (h1 - h0) * fr; s = s0 + (s1 - s0) * fr
            dark, mid, hi, bright = self.ramp
            lx = int(round(x - half)); rx = int(round(x + half))
            wide = (rx - lx) >= 2
            for cx in range(lx, rx + 1):
                if rx == lx:                              # single-pixel thin blade
                    col = bright if s > 0.78 else (hi if s > 0.45 else mid)
                elif self.outline and wide and (cx == lx or cx == rx):
                    col = self.outline                    # lineart silhouette edge
                elif self.outline and wide and cx == lx + 1:
                    col = bright if s > 0.72 else hi       # lit edge just inside outline
                elif cx == lx:
                    col = bright if s > 0.72 else hi       # lit (upper-left) edge
                elif cx == rx:
                    col = dark                            # shadowed edge
                else:
                    col = bright if s > 0.8 else mid
                buf.put(cx, y, col)
            # tip cap / outline
            if self.outline and s > 0.93:
                buf.put(x, y - 0.5, self.outline)
        # flower rides the tip transform
        if self.flower:
            tx, ty, _, _ = pts[-1]
            self._draw_flower(buf, tx, ty)

    def _draw_flower(self, buf, tx, ty):
        kind = self.flower_kind
        if kind == "bud":
            buf.put(tx, ty, self.flower[1]); buf.put(tx, ty - 1, self.flower[0])
            return
        if kind == "pink":
            wht, ylw, pink = self.flower
            for dx, dy in [(0, -1), (-1, 0), (1, 0), (0, 1), (0, 0)]:
                buf.put(tx + dx, ty + dy, pink)
            buf.put(tx, ty, ylw)
            buf.put(tx - 1, ty - 1, wht)        # tiny highlight
            return
        # daisy
        wht, ylw = self.flower[0], self.flower[1]
        for dx, dy in [(0, -2), (-1, -1), (1, -1), (-2, 0), (2, 0),
                       (-1, 1), (1, 1), (0, 2)]:
            buf.put(tx + dx, ty + dy, wht)
        buf.put(tx, ty, ylw)


def draw_mound(buf, ramp, outline=None):
    dark, mid, hi = ramp
    cx, rx, ry = 16, 10, 4
    for dy in range(0, ry + 2):
        y = GROUND_Y + dy
        # half width of the soil cap at this row (rounded ellipse, flat-ish bottom)
        t = dy / (ry + 1)
        half = rx * math.sqrt(max(0.0, 1 - (t * 0.95) ** 2))
        lx = int(round(cx - half)); rxc = int(round(cx + half))
        for x in range(lx, rxc + 1):
            if dy == 0:
                col = hi
            elif x == lx or x == rxc:
                col = outline if outline else dark
            elif dy >= ry:
                col = dark
            else:
                col = mid
            buf.put(x, y, col)
    if outline:
        for x in range(int(cx - rx), int(cx + rx) + 1):
            buf.put(x, GROUND_Y - 1 + 0, buf.get(x, GROUND_Y - 1))  # no-op keep


def draw_sparkle(buf, cx, cy, size, color=(255, 255, 255)):
    # 4-point star; size in {0,1,2}
    if size <= 0:
        return
    buf.put(cx, cy, color)
    if size >= 1:
        for dx, dy in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
            buf.put(cx + dx, cy + dy, color)
    if size >= 2:
        for dx, dy in [(2, 0), (-2, 0), (0, 2), (0, -2)]:
            buf.put(cx + dx, cy + dy, (200, 230, 255))


def render_style(style):
    frames = []
    for fi in range(N_FRAMES):
        tphase = 2 * math.pi * fi / N_FRAMES
        buf = Buf()
        draw_mound(buf, style["mound"], style.get("mound_outline"))
        for bl in style["blades"]:
            bl.draw(buf, tphase)
        for sp in style.get("sparkles", []):
            cx, cy, phase = sp
            # twinkle: size oscillates 0..2 with its own phase
            v = math.sin(tphase * 1.0 + phase)
            size = 2 if v > 0.55 else (1 if v > 0.0 else 0)
            draw_sparkle(buf, cx, cy, size)
        frames.append(buf.image())
    return frames


def save_gif(frames, path):
    colors = set()
    for fr in frames:
        for px in fr.getdata():
            if px[3] >= 128:
                colors.add(px[:3])
    colors = sorted(colors)
    transp = (1, 1, 1)
    while transp in colors:
        transp = (transp[0] + 1, transp[1], transp[2])
    palette = [transp] + colors
    idx = {c: i for i, c in enumerate(palette)}
    flat = []
    for c in palette:
        flat += list(c)
    flat += [0] * (256 * 3 - len(flat))
    pframes = []
    for fr in frames:
        p = Image.new("P", (W, H)); p.putpalette(flat)
        data = [0 if px[3] < 128 else idx[px[:3]] for px in fr.getdata()]
        p.putdata(data); pframes.append(p)
    pframes[0].save(path, save_all=True, append_images=pframes[1:], loop=0,
                    duration=DUR_MS, transparency=0, disposal=2, optimize=False)


# ----------------------------- styles -----------------------------
def v1():
    ramp = (hx("#234012"), hx("#5c9c2e"), hx("#8fc23f"), hx("#b6e068"))
    fl = [hx("#fff6df"), hx("#ffd248")]
    bud = [hx("#ffd248"), hx("#8fc23f")]
    bl = [
        Blade(10, 13, -0.7, 0.8, 0.0, 3.1, ramp),
        Blade(12, 18, -0.2, 1.0, 0.7, 3.5, ramp, flower=fl, flower_kind="daisy"),
        Blade(15, 21, 0.05, 1.1, 1.4, 3.7, ramp),
        Blade(18, 16, 0.3, 1.0, 2.1, 3.4, ramp, flower=bud, flower_kind="bud"),
        Blade(21, 19, 0.5, 0.9, 2.8, 3.5, ramp),
        Blade(23, 12, 0.9, 0.7, 3.5, 3.0, ramp),
        Blade(13, 11, -0.5, 0.7, 4.2, 2.9, ramp),
        Blade(16, 14, 0.0, 0.8, 4.9, 3.2, ramp),
    ]
    return dict(blades=bl, mound=(hx("#2a1a0c"), hx("#4a2e16"), hx("#6b4423")))


def v2():
    ramp = (hx("#2f5a16"), hx("#5a9c2e"), hx("#9ad94a"), hx("#9ad94a"))
    out = hx("#16270a")
    bl = [
        Blade(11, 14, -0.4, 2.3, 0.0, 2.5, ramp, outline=out),
        Blade(15, 19, -0.05, 2.7, 0.9, 2.8, ramp, outline=out),
        Blade(18, 21, 0.1, 2.7, 1.8, 3.0, ramp, outline=out),
        Blade(21, 16, 0.45, 2.4, 2.7, 2.6, ramp, outline=out),
        Blade(13, 12, -0.6, 2.1, 3.6, 2.3, ramp, outline=out),
    ]
    return dict(blades=bl, mound=(hx("#3a2410"), hx("#6b4423"), hx("#8a5a2e")),
                mound_outline=out)


def v3():
    ramp = (hx("#2a6010"), hx("#5cb820"), hx("#9ee84a"), hx("#c6ff6e"))
    daisy = [hx("#fffbe6"), hx("#ffd84a")]
    pink = [hx("#fffbe6"), hx("#ffd84a"), hx("#ff86c8")]
    bl = [
        Blade(10, 13, -0.7, 0.8, 0.2, 3.5, ramp),
        Blade(12, 18, -0.2, 1.0, 0.9, 3.8, ramp, flower=daisy, flower_kind="daisy"),
        Blade(15, 21, 0.05, 1.0, 1.7, 3.9, ramp),
        Blade(19, 17, 0.35, 1.0, 2.5, 3.6, ramp, flower=pink, flower_kind="pink"),
        Blade(22, 14, 0.7, 0.8, 3.3, 3.2, ramp),
        Blade(13, 11, -0.5, 0.8, 4.1, 3.0, ramp),
        Blade(17, 13, 0.2, 0.8, 5.0, 3.2, ramp),
    ]
    return dict(blades=bl, mound=(hx("#3a2410"), hx("#6b4423"), hx("#8a5a2e")),
                sparkles=[(13, 8, 0.0), (22, 11, math.pi)])


STYLES = {"grass-1": v1, "grass-2": v2, "grass-3": v3}
STILL_FRAME = {"grass-1": 3, "grass-2": 3, "grass-3": 4}

if __name__ == "__main__":
    for name, fn in STYLES.items():
        frames = render_style(fn())
        save_gif(frames, os.path.join(OUTDIR, name + ".gif"))
        frames[STILL_FRAME[name]].save(os.path.join(OUTDIR, name + ".png"))
        print(name, "ok", len(frames), "frames")
    print("done")
