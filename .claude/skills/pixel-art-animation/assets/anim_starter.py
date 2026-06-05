#!/usr/bin/env python3
"""Starter for procedural animated pixel art (copy me and adapt).

Run:  python anim_starter.py     ->  writes tuft.gif/png and critter.gif/png here.

It ships the whole toolkit you need:
  * Buf      - a 32-bit pixel buffer whose `put` ROUNDS HALF-UP (see the note on it;
               this is the bug that produces dashed-line speckles if you get it wrong)
  * drawing  - disc, rect, softline, poly (scanline polygon fill)
  * color    - ramp(base) builds a PRO hue-shifted dark->light shading ramp from one color
  * shading  - lit(ramp, t) for multi-step ramps, sphere_t for rounded forms, dither()
  * timing   - smooth() easing (slow in/out) + pulse01() once-per-loop eased action
  * outline  - a silhouette outline pass for a cohesive "sticker" read
  * save     - a seamless-looping GIF exporter that handles 1-bit transparency
  * cantilever() - the bend function that makes plants/tails/etc. move organically

Two worked examples below: TUFT shows the cantilever-bend pattern; CRITTER shows the
articulation pattern (a body that bobs + a head that pecks + a blink). The big idea is
that every frame RE-DRAWS the form in its new pose — nothing is translated as a block.

Requires Pillow:  pip install Pillow
"""
import math, os
from PIL import Image

W = H = 48          # canvas size. 48 gives room for detail; 32 is cramped.
N = 16              # frames. ~16-18 reads smooth.
DUR = 80            # ms per frame. N*DUR = loop length.
OUT = os.path.dirname(os.path.abspath(__file__))

# Light direction (upper-left, slightly toward viewer) for sphere_t shading.
_L = (-0.5, -0.5, 0.72)
_ln = math.sqrt(sum(c * c for c in _L))
LX, LY, LZ = (c / _ln for c in _L)


def hx(h):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def wind(p):
    """A gust signal: fundamental + a little 2nd harmonic for natural asymmetry.
    Periodic in p, so any loop built on it is seamless."""
    return math.sin(p) + 0.25 * math.sin(2 * p + 0.6)


def envl(p):
    """Breathing envelope 0.44..1.0 — makes a sway swell and ease, not metronome."""
    return 0.72 + 0.28 * math.sin(p - math.pi / 2)


def cantilever(s, p, amp, phase=0.0, lag=1.1, exp=1.7):
    """Horizontal bend offset for a flexible part anchored at s=0, free tip at s=1.

    The three things that make it look ALIVE rather than like a sliding block:
      - amp * s**exp  : displacement grows toward the tip (the part CURVES; the base
                        barely moves). A plain translate would use a constant here.
      - wind(p - lag*s): the phase is delayed by height, so the bend travels UP the part
                        and the tip LAGS the base (follow-through / whip).
      - phase         : give each blade/leaf its own, so a gust rolls across the group
                        instead of all of them moving in lockstep.
    """
    return amp * (s ** exp) * wind(p - lag * s + phase) * envl(p)


def lit(ramp, t):
    """Pick from a dark->light ramp by lightness t in [0,1]."""
    return ramp[int(max(0.0, min(0.9999, t)) * len(ramp))]


def sphere_t(nx, ny):
    """Diffuse lightness 0..1 for a point (nx,ny) on a unit sphere — smooth round shading."""
    r2 = nx * nx + ny * ny
    nz = math.sqrt(max(0.0, 1 - r2))
    return 0.16 + 0.86 * max(0.0, nx * LX + ny * LY + nz * LZ)


# ───────── color & timing craft (what separates pro pixel art from flat fills) ─────────
def smooth(t):
    """Smoothstep easing — slow in, slow out. Pros time motion on an eased curve, not a
    linear ramp; a value driven through smooth() accelerates and settles like real weight."""
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


def pulse01(f, start, end, power=1.3):
    """A once-per-loop eased action pulse in [0,1] across frames [start,end] (0 outside).
    Use for a peck/blink/twitch/attack so it ACCELERATES in and EASES out instead of
    ping-ponging linearly. Add a tiny earlier pulse for anticipation (a wind-up)."""
    if f < start or f > end or end <= start:
        return 0.0
    return math.sin(math.pi * (f - start) / (end - start)) ** power


def _hue_toward(h, target, amount):
    """Rotate hue h toward target by at most `amount` degrees (shortest way around)."""
    d = ((target - h + 540) % 360) - 180
    return (h + max(-amount, min(amount, d))) % 360


def _rgb_to_hsl(r, g, b):
    r, g, b = r / 255.0, g / 255.0, b / 255.0
    mx, mn = max(r, g, b), min(r, g, b)
    l = (mx + mn) / 2
    if mx == mn:
        return 0.0, 0.0, l
    d = mx - mn
    s = d / (2 - mx - mn) if l > 0.5 else d / (mx + mn)
    if mx == r:
        h = (g - b) / d + (6 if g < b else 0)
    elif mx == g:
        h = (b - r) / d + 2
    else:
        h = (r - g) / d + 4
    return h * 60.0, s, l


def _h2c(p, q, t):
    t %= 1.0
    if t < 1 / 6: return p + (q - p) * 6 * t
    if t < 1 / 2: return q
    if t < 2 / 3: return p + (q - p) * (2 / 3 - t) * 6
    return p


def _hsl_to_rgb(h, s, l):
    h = (h % 360) / 360.0
    if s == 0:
        v = int(math.floor(l * 255 + 0.5)); return (v, v, v)
    q = l * (1 + s) if l < 0.5 else l + s - l * s
    p = 2 * l - q
    return tuple(int(math.floor(_h2c(p, q, h + o) * 255 + 0.5)) for o in (1 / 3, 0, -1 / 3))


def ramp(base, n=5, spread=0.34, hue_shift=22.0):
    """Build an n-step dark->light shading ramp from ONE base color the professional way:
    value rises across the ramp, saturation peaks in the MIDDLE (never max-saturation at
    max-value, which "eye-burns"), and — the key move — the HUE SHIFTS: cool toward
    blue/violet in the shadows, warm toward yellow in the highlights. That hue shift is what
    makes shading read as luminous and rich instead of a muddy one-hue light-to-dark.
    Returns rgb tuples usable directly with lit(). `base` is the mid-tone (#hex or rgb)."""
    h0, s0, l0 = _rgb_to_hsl(*(hx(base) if isinstance(base, str) else base))
    WARM, COOL = 50.0, 255.0
    out = []
    for i in range(n):
        t = i / (n - 1) if n > 1 else 0.5            # 0 darkest .. 1 lightest
        l = max(0.06, min(0.96, l0 - spread + 2 * spread * smooth(t)))
        s = s0 * (0.68 + 0.46 * math.sin(math.pi * t))
        if l > 0.80:                                  # ease saturation off near white
            s *= 1.0 - 0.5 * (l - 0.80) / 0.16
        s = max(0.03, min(0.98, s))
        h = _hue_toward(h0, WARM if t >= 0.5 else COOL, hue_shift * abs(t - 0.5) * 2)
        out.append(_hsl_to_rgb(h, s, l))
    return out


BAYER4 = (0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5)


def dither(x, y, t):
    """Ordered (Bayer 4x4) dither test: True if pixel (x,y) should take the LIGHTER of two
    colors at coverage t in [0,1]. Lets you imply an extra shade or a soft gradient band
    with only two palette colors — the classic way to stretch a tight palette."""
    return t * 16.0 > BAYER4[(int(y) % 4) * 4 + (int(x) % 4)]


class Buf:
    def __init__(self):
        self.px = [[(0, 0, 0, 0)] * W for _ in range(H)]

    def put(self, x, y, c):
        # ROUND HALF-UP, not Python's banker's round(). With round(), shifting a filled
        # row by ~x.5 maps two source columns to the same target and skips the one between
        # -> holes inside the row -> the outline pass fills them dark -> a dashed speckle
        # line across your sprite. floor(x+0.5) increments by exactly 1 per source step.
        if c is None:
            return
        xi, yi = int(math.floor(x + 0.5)), int(math.floor(y + 0.5))
        if 0 <= xi < W and 0 <= yi < H:
            self.px[yi][xi] = (c[0], c[1], c[2], 255)

    def image(self):
        im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        im.putdata([self.px[y][x] for y in range(H) for x in range(W)])
        return im


def disc(buf, cx, cy, rx, ry, colfn):
    """Filled ellipse; colfn(nx,ny)->rgb|None where nx,ny are normalized (-1..1)."""
    for y in range(int(cy - ry - 1), int(cy + ry + 2)):
        for x in range(int(cx - rx - 1), int(cx + rx + 2)):
            nx = (x - cx) / rx if rx else 0
            ny = (y - cy) / ry if ry else 0
            if nx * nx + ny * ny <= 1.0:
                buf.put(x, y, colfn(nx, ny))


def rect(buf, x0, y0, x1, y1, c):
    for y in range(int(y0), int(y1) + 1):
        for x in range(int(x0), int(x1) + 1):
            buf.put(x, y, c)


def softline(buf, x0, y0, x1, y1, c):
    n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
    for i in range(n + 1):
        t = i / n
        buf.put(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, c)


def poly(buf, pts, colfn):
    """Scanline-fill a simple polygon; colfn(x,y)->rgb|None."""
    ys = [p[1] for p in pts]
    for y in range(int(math.floor(min(ys))), int(math.ceil(max(ys))) + 1):
        xs = []
        n = len(pts)
        for i in range(n):
            ax, ay = pts[i]; bx, by = pts[(i + 1) % n]
            if (ay <= y < by) or (by <= y < ay):
                xs.append(ax + (bx - ax) * (y - ay) / (by - ay))
        xs.sort()
        for j in range(0, len(xs) - 1, 2):
            for x in range(int(math.ceil(xs[j])), int(math.floor(xs[j + 1])) + 1):
                buf.put(x, y, colfn(x, y))


def outline(buf, color):
    """Set every transparent pixel 4-adjacent to an opaque one to `color`.
    Run LAST, after all parts are drawn. Keep art <= W-2 so the 1px ring fits."""
    adds = []
    for y in range(H):
        row = buf.px[y]
        for x in range(W):
            if row[x][3] == 0:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < W and 0 <= ny < H and buf.px[ny][nx][3] != 0:
                        adds.append((x, y)); break
    for x, y in adds:
        buf.px[y][x] = (color[0], color[1], color[2], 255)


def save(frames, name, still=0):
    """Write a seamless looping GIF + a still PNG, preserving 1-bit transparency exactly.
    GIF has only on/off alpha, so we reserve one palette index as transparent and map
    every alpha<128 pixel to it."""
    cols = sorted({px[:3] for fr in frames for px in fr.getdata() if px[3] >= 128})
    key = (1, 1, 1)
    while key in cols:
        key = (key[0] + 1, key[1], key[2])
    pal = [key] + cols
    idx = {c: i for i, c in enumerate(pal)}
    flat = []
    for c in pal:
        flat += list(c)
    flat += [0] * (256 * 3 - len(flat))
    ps = []
    for fr in frames:
        p = Image.new("P", (W, H)); p.putpalette(flat)
        p.putdata([0 if px[3] < 128 else idx[px[:3]] for px in fr.getdata()])
        ps.append(p)
    ps[0].save(os.path.join(OUT, name + ".gif"), save_all=True, append_images=ps[1:],
               loop=0, duration=DUR, transparency=0, disposal=2, optimize=False)
    frames[still].save(os.path.join(OUT, name + ".png"))
    print(name, "ok")


# ───────────────────────── EXAMPLE 1: cantilever bend (a grass tuft) ─────────────────────────
GREEN = ramp("#5c9c2e", 5)      # one base color -> hue-shifted 5-step ramp (cool root, warm tip)
SOIL = ramp("#5a3a18", 3)


def tuft(b, f):
    p = 2 * math.pi * f / N
    # soil mound (rigid base) — note: drawn as part of the object, no floating shadow
    for dy in range(0, 5):
        y = 40 + dy
        half = 10 * math.sqrt(max(0.0, 1 - (dy / 5.5) ** 2))
        for x in range(int(24 - half), int(24 + half) + 1):
            b.put(x, y, lit(SOIL, 0.85 if dy == 0 else (0.2 if x in (int(24 - half), int(24 + half)) else 0.55)))
    # blades: each re-drawn as a curved shape this frame, with its own phase (out of sync)
    blades = [(15, 18, -0.7, 0.0), (19, 25, -0.2, 0.9), (24, 28, 0.05, 1.8),
              (29, 23, 0.4, 2.7), (33, 17, 0.8, 3.6), (21, 16, -0.4, 4.5)]
    for bx, fh, lean, ph in blades:
        for i in range(fh * 4 + 1):
            s = i / (fh * 4)
            yy = 40 - s * fh
            xx = bx + lean * (s ** 1.4) * fh * 0.16 + cantilever(s, p, 4.0, ph)
            b.put(xx, yy, lit(GREEN, 0.85 if s > 0.6 else 0.45))
    outline(b, hx("#15240a"))


# ───────────────────────── EXAMPLE 2: articulation (a bobbing, pecking critter) ─────────────────────────
BODY = ramp("#c79a52", 5)       # hue-shifted feather ramp from a single mid-tone
RED = hx("#d83a18"); ORANGE = hx("#f0a020"); EYE = hx("#241608")


def critter(b, f):
    p = 2 * math.pi * f / N
    bob = math.sin(p) * 1.3                                  # whole-body idle bob
    pk = pulse01(f, 4, 10)                                   # eased peck (accel in, ease out)
    wind = pulse01(f, 1, 3) * 1.3                            # ANTICIPATION: small wind-up lift first
    hdx, hdy = -pk * 4, pk * 11 - wind                       # head lifts, then dives down + forward
    blink = f in (13, 14)
    # legs (static)
    for lx in (22, 28):
        rect(b, lx, 34, lx, 41, ORANGE)
    by = 28 + bob
    disc(b, 26, by, 9, 7, lambda nx, ny: lit(BODY, sphere_t(nx, ny)))     # body (re-shaded each frame)
    # head is a SEPARATE part drawn at its own offset — that's articulation, not a slide
    hx0, hy0 = 17 + hdx, 19 + hdy + bob
    disc(b, hx0, hy0, 5, 4.8, lambda nx, ny: lit(BODY, sphere_t(nx, ny)))
    for cxs in (-2, 0.5, 3):                                  # comb
        disc(b, hx0 + cxs, hy0 - 5, 1.6, 1.9, lambda nx, ny: RED)
    for k in range(4):                                       # beak (points left)
        b.put(hx0 - 5 - k, hy0 + 0.3 + k * 0.5, ORANGE)
    if not blink:
        b.put(hx0 - 1, hy0 - 1, EYE); b.put(hx0 - 1, hy0 - 1.8, hx("#fffdf0"))
    outline(b, hx("#4a2e10"))


if __name__ == "__main__":
    for name, fn in (("tuft", tuft), ("critter", critter)):
        frames = []
        for f in range(N):
            bf = Buf(); fn(bf, f); frames.append(bf.image())
        save(frames, name, still=N // 4)
    print("done - now montage-review with ../scripts/preview_frames.py")
