#!/usr/bin/env python3
"""Detailed animated pixel-art concepts for five more base tiles (48x48).

Companion to ../farm-concept/_farm_anim.py — same engine (round-half-up put,
multi-step ramps, spherical shading, silhouette outline), one signature,
physically-sensible motion per tile:

  gem      - faceted cyan crystal: an inner glow PULSE + a glint that sweeps the
             facets + a corner sparkle (+ a slight magical hover)
  mackerel - a swimming fish: a travelling S-wave down the body (tail sweeps
             most) + a flicking tail fin + rising bubbles
  mushroom - red toadstool: a gentle bob while the white spots GLOW-pulse out of
             phase and faint spores drift down
  clam     - a bivalve that OPENS and closes on its hinge, revealing a pearly
             interior + a pearl that glints when open
  pansy    - a purple flower: the petals 'breathe' (bloom in/out) + a soft stem
             sway + a throat sparkle

48x48 pixel art, transparent, seamless loops. Outputs <name>.gif + <name>.png.
"""
import math, os
from PIL import Image

W = H = 48
N = 18
DUR = 70
OUT = os.path.dirname(os.path.abspath(__file__))

_L = (-0.5, -0.5, 0.72)
_ln = math.sqrt(sum(c * c for c in _L))
LX, LY, LZ = (c / _ln for c in _L)


def hx(h):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def lerp(a, b, t):
    return (int(a[0] + (b[0] - a[0]) * t), int(a[1] + (b[1] - a[1]) * t), int(a[2] + (b[2] - a[2]) * t))


def lit(ramp, t):
    return ramp[int(max(0.0, min(0.9999, t)) * len(ramp))]


def sphere_t(nx, ny):
    r2 = nx * nx + ny * ny
    nz = math.sqrt(max(0.0, 1 - r2))
    return 0.16 + 0.86 * max(0.0, nx * LX + ny * LY + nz * LZ)


class Buf:
    def __init__(self):
        self.px = [[(0, 0, 0, 0)] * W for _ in range(H)]

    def put(self, x, y, c):
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


def save(frames, name, still):
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


# ════════════════════════════ gem ════════════════════════════
GEM = [hx("#0e3a4a"), hx("#1686a3"), hx("#2ab0d0"), hx("#58d8f0"), hx("#a8f0ff"), hx("#e8ffff")]
GEM_OL = hx("#06222e"); GEM_SP = hx("#ffffff")


def gem(b, f):
    p = 2 * math.pi * f / N
    pulse = 0.5 + 0.5 * math.sin(p)                  # inner glow 0..1
    hover = math.sin(p) * 0.8
    cx, cy = 24, 25 + hover
    sil = [(cx - 7, cy - 7), (cx + 7, cy - 7), (cx + 10, cy - 2), (cx + 6, cy + 5),
           (cx, cy + 13), (cx - 6, cy + 5), (cx - 10, cy - 2)]

    def facet(x, y):
        # base lightness from facet region + a moving glint sweep + the pulse
        rx, ry = (x - cx) / 11.0, (y - cy) / 12.0
        if y < cy - 2:                               # table / crown (top) — bright
            base = 0.66 - 0.18 * rx
        elif x < cx:                                 # lower-left pavilion — dark
            base = 0.30 - 0.10 * rx
        else:                                        # lower-right pavilion — mid
            base = 0.46 + 0.10 * rx
        glint = 0.55 * math.exp(-((rx - ry) - (1.4 * math.sin(p) )) ** 2 / 0.10)  # diagonal sweep
        return lit(GEM, max(0.05, min(0.99, base + 0.18 * pulse + glint)))

    poly(b, sil, facet)
    # facet seams
    softline(b, cx - 7, cy - 7, cx, cy - 2, lit(GEM, 0.15))
    softline(b, cx + 7, cy - 7, cx, cy - 2, lit(GEM, 0.15))
    softline(b, cx, cy - 2, cx, cy + 13, lit(GEM, 0.18))
    softline(b, cx - 10, cy - 2, cx, cy - 2, lit(GEM, 0.2))
    softline(b, cx + 10, cy - 2, cx, cy - 2, lit(GEM, 0.2))
    # table top highlight
    rect(b, cx - 5, cy - 6, cx + 1, cy - 6, lit(GEM, 0.9))
    # corner sparkle (twinkle)
    sv = math.sin(p * 1.0 + 1.0)
    if sv > 0.2:
        sx, sy = cx + 7, cy - 8
        b.put(sx, sy, GEM_SP)
        if sv > 0.6:
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                b.put(sx + dx, sy + dy, GEM_SP)
    outline(b, GEM_OL)


# ════════════════════════════ mackerel ════════════════════════════
MK = dict(
    body=[hx("#13283a"), hx("#27506e"), hx("#3f7a98"), hx("#6aa6c0"), hx("#a8d2e2"), hx("#dff0f6")],
    back=hx("#0a1420"), fin=hx("#2f5f7e"), finhi=hx("#5a8aa6"),
    eye=hx("#0a1420"), eyehi=hx("#eafaff"), bub=hx("#d8f4ff"), ol=hx("#0a1622"))


def mackerel(b, f):
    p = 2 * math.pi * f / N
    x0, x1 = 9, 36                                   # head(left) .. tail-base(right)
    cy = 25
    L = x1 - x0

    def wave(s):
        return 2.6 * (0.18 + s) * math.sin(2 * math.pi * (0.85 * s) - p)

    # body
    for x in range(x0, x1 + 1):
        s = (x - x0) / L
        h = 7.2 * math.sin(min(1.0, (s + 0.06)) * math.pi) ** 0.62
        if h < 0.5:
            continue
        yc = cy + wave(s)
        for y in range(int(yc - h), int(yc + h) + 1):
            ny = (y - yc) / h
            t = 0.80 - 0.62 * (ny * 0.5 + 0.5)       # belly light, back dark
            b.put(x, y, lit(MK["body"], t))
        if int(s * 9) % 2 == 0 and s < 0.9:          # tiger stripes on back
            b.put(x, yc - h * 0.55, MK["back"])
            b.put(x, yc - h * 0.78, MK["back"])
    # tail fin (forked, sweeps with the wave)
    ty = cy + wave(1.0)
    tdx = wave(1.06) - wave(1.0)
    poly(b, [(x1 - 1, ty - 1), (x1 + 7, ty - 7 + tdx * 2), (x1 + 5, ty + tdx),
             (x1 + 7, ty + 7 + tdx * 2), (x1 - 1, ty + 1)], lambda x, y: MK["fin"])
    # dorsal + pectoral fins
    sd = 0.5
    yd = cy + wave(sd)
    poly(b, [(20, yd - 6), (25, yd - 9), (26, yd - 6)], lambda x, y: MK["finhi"])
    yp = cy + wave(0.32)
    poly(b, [(16, yp + 2), (21, yp + 6), (21, yp + 2)], lambda x, y: MK["fin"])
    # gill + eye + mouth (head end, left)
    hy = cy + wave(0.06)
    softline(b, 13, hy - 4, 13, hy + 4, MK["back"])
    b.put(11, hy - 1, MK["eye"]); b.put(11.8, hy - 1, MK["eye"]); b.put(11, hy - 1.8, MK["eyehi"])
    softline(b, 8.5, hy + 2, 10.5, hy + 2.5, MK["back"])    # mouth
    # rising bubbles (loop)
    g = (f % N) / N
    for k, ph in enumerate((0.0, 0.5)):
        bg = (g + ph) % 1.0
        bx = 6 - k - bg * 2
        by = hy - 2 - bg * 14
        b.put(bx, by, MK["bub"])
        if k == 0:
            b.put(bx + 1, by, MK["bub"])
    outline(b, MK["ol"])


# ════════════════════════════ mushroom ════════════════════════════
MU = dict(
    cap=[hx("#641212"), hx("#9a2420"), hx("#c63a3a"), hx("#df584a"), hx("#f2806a")],
    stem=[hx("#6a5236"), hx("#9a7e54"), hx("#cdb488"), hx("#f0dcb4"), hx("#fff6e4")],
    spot=[hx("#e8c8a8"), hx("#fff2e0"), hx("#ffffff")],
    gill=hx("#caa07a"), glow=hx("#ffcaa0"), spore=hx("#ffe6c8"), ol=hx("#3a0e0e"))


def mushroom(b, f):
    p = 2 * math.pi * f / N
    bob = math.sin(p) * 1.1
    cx = 24
    # stem (rooted; gentle bob shared with cap)
    sy0, sy1 = 24 + bob, 40
    for y in range(int(sy0), int(sy1) + 1):
        s = (y - sy0) / (sy1 - sy0)
        w = 4.2 + 1.6 * s
        for x in range(int(cx - w), int(cx + w) + 1):
            nx = (x - cx) / w
            b.put(x, y, lit(MU["stem"], 0.7 - 0.5 * nx - 0.12 * s))
    # ring
    rect(b, cx - 5, 27 + bob, cx + 5, 27 + bob, lit(MU["stem"], 0.85))
    # gills under cap
    for x in range(int(cx - 9), int(cx + 9) + 1):
        b.put(x, 23 + bob, MU["gill"])
    # cap dome
    cyc = 17 + bob
    for y in range(int(cyc - 9), int(cyc + 6) + 1):
        ny = (y - cyc) / 9.0
        if ny > 0.62:
            continue
        span = 12 * math.sqrt(max(0.0, 1 - ny * ny))
        for x in range(int(cx - span), int(cx + span) + 1):
            nx = (x - cx) / 12.0
            b.put(x, y, lit(MU["cap"], sphere_t(nx, ny)))
    # glowing spots (pulse out of phase)
    spots = [(-7, -3, 0.0), (-1, -6, 1.3), (5, -4, 2.6), (8, 0, 3.9), (-4, 1, 5.0), (2, -1, 0.7)]
    for sx, sy, ph in spots:
        gl = 0.5 + 0.5 * math.sin(p + ph)
        r = 1.7 + 0.5 * gl
        disc(b, cx + sx, cyc + sy, r, r, lambda nx, ny: lit(MU["spot"], 0.4 + 0.6 * gl))
    # faint glow rim + drifting spores
    g = (f % N) / N
    for k, ph in enumerate((0.0, 0.4, 0.75)):
        sg = (g + ph) % 1.0
        sx = cx - 6 + k * 6 + math.sin(sg * 6) * 1.5
        sy = 24 + bob + sg * 12
        if sg > 0.1:
            b.put(sx, sy, MU["spore"])
    outline(b, MU["ol"])


# ════════════════════════════ clam ════════════════════════════
CL = dict(
    shell=[hx("#5a3c20"), hx("#8a6238"), hx("#b88e5c"), hx("#d8b488"), hx("#f0d8b0"), hx("#fff0d8")],
    inner=[hx("#4a3828"), hx("#8a6e7a"), hx("#c0a8c8"), hx("#e8d8f0")],
    pearl=hx("#fff4ff"), pearlhi=hx("#ffffff"), ridge=hx("#6a4a28"), ol=hx("#3a2614"))


def shell_half(b, hinge, rx, ry, ang, up, ramp):
    """draw a ridged half-shell fan rotated by `ang` about hinge; up=-1 upper."""
    hx0, hy0 = hinge
    ca, sa = math.cos(ang * up), math.sin(ang * up)
    pts = []
    steps = 26
    for i in range(steps + 1):
        th = math.pi * i / steps                     # 0..pi across the shell rim
        lx = -rx * math.cos(th)
        ly = up * ry * math.sin(th)
        rxp = hx0 + lx * ca - ly * sa
        ryp = hy0 + lx * sa + ly * ca
        pts.append((rxp, ryp))
    pts.append((hx0, hy0))

    def col(x, y):
        d = math.hypot(x - hx0, y - hy0) / max(rx, ry)
        return lit(ramp, 0.78 - 0.5 * d + 0.12 * ((x - hx0) < 0))
    poly(b, pts, col)
    # ridges (radial)
    for rr in (0.25, 0.5, 0.78):
        for i in range(0, steps + 1, 3):
            th = math.pi * i / steps
            lx = -rx * math.cos(th) * rr; ly = up * ry * math.sin(th) * rr
            b.put(hx0 + lx * ca - ly * sa, hy0 + lx * sa + ly * ca, CL["ridge"])


def clam(b, f):
    p = 2 * math.pi * f / N
    hinge = (24, 33)
    op = max(0.0, math.sin(p))                        # 0 closed .. 1 open .. 0
    ang = op * 0.5
    # interior + pearl (revealed in the gap)
    if op > 0.06:
        disc(b, 24, 30 - op * 4, 9 * op + 2, 7 * op + 1,
             lambda nx, ny: lit(CL["inner"], 0.5 + 0.4 * (ny < 0) - 0.3 * (nx * nx + ny * ny)))
        pr = 2.4 + op * 0.6
        disc(b, 24, 30 - op * 3, pr, pr, lambda nx, ny: CL["pearl"] if nx * nx + ny * ny < 0.6 else lit(CL["inner"], 0.6))
        if op > 0.5:
            b.put(23, 29 - op * 3, CL["pearlhi"])
    # lower shell (fixed) then upper shell (opens up)
    shell_half(b, hinge, 12.5, 9.5, 0.0, 1, CL["shell"])
    shell_half(b, hinge, 12.5, 9.5, ang, -1, CL["shell"])
    outline(b, CL["ol"])


# ════════════════════════════ pansy ════════════════════════════
PA = dict(
    petal=[hx("#3c1c54"), hx("#5a2a80"), hx("#7a3aa8"), hx("#9a5ac8"), hx("#c490e8")],
    center=hx("#2a1238"), throat=[hx("#c87a10"), hx("#ffb020"), hx("#ffe06a")],
    stem=hx("#3a6014"), leaf=[hx("#2e4e12"), hx("#4f8420"), hx("#8fcc3e")],
    spark=hx("#fff0ff"), ol=hx("#2a103e"))


def pansy(b, f):
    p = 2 * math.pi * f / N
    sway = math.sin(p) * 1.6
    breathe = 0.5 + 0.5 * math.sin(p)                # petals bloom in/out
    fx, fy = 24 + sway, 16
    # stem (bends a little with the sway)
    for y in range(int(fy + 6), 42):
        s = (y - (fy + 6)) / (42 - (fy + 6))
        b.put(24 + sway * (1 - s), y, lit(PA["leaf"], 0.5) if (y % 6) else PA["stem"])
    # leaves
    for side, ly in ((-1, 30), (1, 34)):
        lsw = sway * (1 - (ly - fy) / 30) * 0.5
        disc(b, 24 + side * 4 + lsw, ly, 3.4, 1.8,
             lambda nx, ny: lit(PA["leaf"], 0.7 if ny < 0 else 0.4))
    # 5 petals around the center (breathe in/out)
    rad = 5.2 + breathe * 1.3
    for i, ang in enumerate((-90, -26, 38, 142, 218)):
        a = math.radians(ang)
        px, py = fx + math.cos(a) * rad, fy + math.sin(a) * rad * 0.9
        rr = 3.6 if i < 3 else 4.1                    # lower petals bigger
        disc(b, px, py, rr, rr * 0.92,
             lambda nx, ny: lit(PA["petal"], 0.42 + 0.5 * (nx * nx + ny * ny) - 0.18 * (ny < -0.2)))
        # dark vein streaks toward center
        softline(b, px, py, fx, fy, lit(PA["petal"], 0.12))
    # center + throat + sparkle
    disc(b, fx, fy, 2.6, 2.6, lambda nx, ny: PA["center"])
    disc(b, fx, fy + 0.5, 1.5, 1.4, lambda nx, ny: lit(PA["throat"], 0.5 + 0.5 * breathe))
    sv = math.sin(p + 0.6)
    if sv > 0.3:
        b.put(fx + 4, fy - 4, PA["spark"])
        if sv > 0.7:
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                b.put(fx + 4 + dx, fy - 4 + dy, PA["spark"])
    outline(b, PA["ol"])


ENTITIES = [("gem", gem, 4), ("mackerel", mackerel, 5), ("mushroom", mushroom, 4),
            ("clam", clam, 5), ("pansy", pansy, 4)]

if __name__ == "__main__":
    for name, fn, still in ENTITIES:
        frames = []
        for f in range(N):
            bf = Buf(); fn(bf, f); frames.append(bf.image())
        save(frames, name, still)
        print(name, "ok")
    print("done")
