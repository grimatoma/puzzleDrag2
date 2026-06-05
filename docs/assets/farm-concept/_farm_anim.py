#!/usr/bin/env python3
"""Detailed animated pixel-art concepts for five farm tiles (48x48).

v2 — rebuilt to (a) carry far more detail than the first pass (multi-step
colour ramps + spherical shading + the elements each icon actually has) and
(b) animate each tile in a way that makes physical sense:

  chicken - body bob + a real head PECK to the ground + blink + tail flick
  apple   - sits and gently settles (small bob + 1px sway); the leaf flutters,
            a specular glint travels.  NOT a mid-air pendulum.
  carrot  - root is rigid; only the green fronds bend in the wind (cantilever)
  oak     - trunk rigid; the canopy mass rustles, blobs jiggle, a leaf falls,
            dappled highlights shimmer
  corn    - the COB IS RIGID (a cob doesn't bend); only the husk leaves sway,
            and a shine slides down the kernels

Crisp 48x48 pixel art, transparent bg, seamless loops. Outputs <name>.gif +
<name>.png next to this file. Re-run to tune.
"""
import math, os
from PIL import Image

W = H = 48
N = 18
DUR = 70
OUT = os.path.dirname(os.path.abspath(__file__))

# light direction (upper-left, slightly toward viewer)
_L = (-0.5, -0.5, 0.72)
_ln = math.sqrt(sum(c * c for c in _L))
LX, LY, LZ = (c / _ln for c in _L)


def hx(h):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def wind(p):
    return math.sin(p) + 0.25 * math.sin(2 * p + 0.6)


def envl(p):
    return 0.72 + 0.28 * math.sin(p - math.pi / 2)


def lit(ramp, t):
    return ramp[int(max(0.0, min(0.9999, t)) * len(ramp))]


def sphere_t(nx, ny):
    """diffuse lightness 0..1 for a unit-sphere point (nx,ny)."""
    r2 = nx * nx + ny * ny
    nz = math.sqrt(max(0.0, 1 - r2))
    d = nx * LX + ny * LY + nz * LZ
    return 0.16 + 0.86 * max(0.0, d)


class Buf:
    def __init__(self):
        self.px = [[(0, 0, 0, 0)] * W for _ in range(H)]

    def put(self, x, y, c):
        if c is None:
            return
        xi, yi = int(math.floor(x + 0.5)), int(math.floor(y + 0.5))
        if 0 <= xi < W and 0 <= yi < H:
            self.px[yi][xi] = (c[0], c[1], c[2], 255)

    def get(self, x, y):
        xi, yi = int(math.floor(x + 0.5)), int(math.floor(y + 0.5))
        if 0 <= xi < W and 0 <= yi < H:
            return self.px[yi][xi]
        return (0, 0, 0, 0)

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


def cantilever(s, p, amp, ph, lag=1.1):
    return amp * (s ** 1.6) * wind(p - lag * s + ph) * envl(p)


# ════════════════════════════ chicken ════════════════════════════
CH = dict(
    body=[hx("#6a4a1c"), hx("#9a6e2e"), hx("#c79a52"), hx("#e8cf86"), hx("#fbf0c2"), hx("#fffdf0")],
    wing=[hx("#7a5520"), hx("#b88a40"), hx("#d8b070"), hx("#f0d8a0")],
    comb=[hx("#9a1c0a"), hx("#c8331a"), hx("#ee5630")],
    beak=[hx("#b86810"), hx("#f0a020"), hx("#ffc94a")],
    eye=hx("#241608"), gleam=hx("#fffdf0"), ol=hx("#4a2e10"), leg=hx("#e08820"))


def chicken(b, f):
    p = 2 * math.pi * f / N
    bob = math.sin(p) * 1.3
    pk = max(0.0, math.sin((f - 6) / 5 * math.pi)) if 5 <= f <= 11 else 0.0
    hdx, hdy = -pk * 4, pk * 11                      # head dives down + forward
    tail = -max(0.0, math.sin(p + 1.0)) * 2.5
    blink = f in (15, 16)
    # legs + 3-toe feet (static)
    for lx in (22, 29):
        rect(b, lx, 34, lx, 41, CH["leg"])
        for tx in (-2, 0, 2):
            b.put(lx + tx, 42, CH["leg"])
    by = 28 + bob
    # tail feathers (layered, behind body)
    for i, (ex, ey, sh) in enumerate([(37, 26, 0), (39, 22, 1), (37, 18, 2)]):
        softline(b, 31, by - 2, ex, ey + tail, lit(CH["wing"], 0.2 + i * 0.25))
        softline(b, 31, by - 1, ex - 1, ey + 1 + tail, lit(CH["wing"], 0.5 + i * 0.2))
    # body
    disc(b, 26, by, 9.5, 7.2, lambda nx, ny: lit(CH["body"], sphere_t(nx, ny) - 0.10 * (ny < 0)))
    # belly highlight
    disc(b, 24, by + 2, 5.5, 4.0, lambda nx, ny: lit(CH["body"], 0.8) if ny > -0.1 and nx * nx + ny * ny < 0.6 else None)
    # wing
    disc(b, 28, by + 1, 4.6, 3.6, lambda nx, ny: lit(CH["wing"], sphere_t(nx, ny)))
    for fl in (0, 1, 2):                              # feather lines
        softline(b, 26 + fl, by + 3 + fl, 31 + fl, by + 1 + fl, lit(CH["wing"], 0.1))
    # head
    hx0, hy0 = 16 + hdx, 18 + hdy + bob
    disc(b, hx0, hy0, 5.0, 4.8, lambda nx, ny: lit(CH["body"], sphere_t(nx, ny)))
    # comb (3 bumps)
    for j, cxs in enumerate((-2, 0.5, 3)):
        disc(b, hx0 + cxs, hy0 - 5, 1.7, 2.0, lambda nx, ny: lit(CH["comb"], 0.7 - 0.4 * (nx > 0.2)))
    # beak (2-tone, points left)
    for k in range(4):
        b.put(hx0 - 5 - k, hy0 + 0.3 + k * 0.5, lit(CH["beak"], 0.85 - k * 0.12))
        b.put(hx0 - 5 - k, hy0 + 1.3 + k * 0.5, lit(CH["beak"], 0.45))
    # wattle
    disc(b, hx0 - 3, hy0 + 3, 1.4, 2.0, lambda nx, ny: lit(CH["comb"], 0.55))
    # eye + gleam
    if not blink:
        b.put(hx0 - 0.5, hy0 - 1, CH["eye"]); b.put(hx0 - 1.5, hy0 - 1, CH["eye"])
        b.put(hx0 - 1.5, hy0 - 1.8, CH["gleam"])
    else:
        softline(b, hx0 - 2, hy0 - 0.5, hx0, hy0 - 0.5, CH["ol"])
    outline(b, CH["ol"])


# ════════════════════════════ apple ════════════════════════════
AP = dict(
    body=[hx("#5a0e0a"), hx("#7e160f"), hx("#a82216"), hx("#cf3a22"), hx("#e85a32"),
          hx("#f5874a"), hx("#ffba80"), hx("#ffe0b8")],
    stem=[hx("#241204"), hx("#3a200a"), hx("#5a3614")],
    leaf=[hx("#2e4e12"), hx("#4a7c1e"), hx("#6aa42c"), hx("#9ad24e")],
    spec=hx("#fff3df"), ol=hx("#360606"))


def apple(b, f):
    p = 2 * math.pi * f / N
    bob = math.sin(p) * 0.9
    sway = math.sin(p - 0.6) * 1.0                   # tiny settle, not a pendulum
    cx, cy, a, bb = 24 + sway, 26 + bob, 11.0, 11.0
    for y in range(int(cy - bb - 1), int(cy + bb + 2)):
        ny = (y - cy) / bb
        if abs(ny) > 1:
            continue
        span = a * math.sqrt(max(0.0, 1 - ny * ny))
        for x in range(int(cx - span), int(cx + span) + 1):
            nx = (x - cx) / a
            if ny < -0.66 and abs(nx) < 0.3:         # top dimple
                continue
            t = sphere_t(nx, ny + 0.12)
            b.put(x, y, lit(AP["body"], t))
    # vertical sheen line + freckles
    for fy in (-0.3, 0.1, 0.5):
        b.put(cx - 4, cy + fy * bb, lit(AP["body"], 0.92))
    b.put(cx + 3, cy - 1, lit(AP["body"], 0.25)); b.put(cx - 1, cy + 4, lit(AP["body"], 0.3))
    # specular glint (travels a touch)
    gx = cx - 4 + math.sin(p) * 0.6
    disc(b, gx, cy - 4, 2.2, 2.6, lambda nx, ny: AP["spec"] if nx * nx + ny * ny < 0.7 else None)
    # stem
    for k in range(4):
        b.put(cx + 0.4, cy - bb + 0.5 - k, lit(AP["stem"], 0.4 + 0.2 * (k % 2)))
    # leaf (flutters)
    flut = math.sin(p * 2 + 0.8)
    lx, ly = cx + 3, cy - bb - 1 + flut * 0.8
    disc(b, lx + 1, ly, 3.0, 1.7, lambda nx, ny: lit(AP["leaf"], 0.75 if ny < -0.05 else (0.4 if ny > 0.4 else 0.6)))
    softline(b, lx - 1, ly + 0.4, lx + 3, ly - 0.3, lit(AP["leaf"], 0.2))   # vein
    outline(b, AP["ol"])


# ════════════════════════════ carrot ════════════════════════════
CA = dict(
    root=[hx("#6e2e06"), hx("#9a4408"), hx("#c25e10"), hx("#e07820"), hx("#ff9e44"), hx("#ffc578")],
    ridge=hx("#7a3408"),
    grnd=hx("#2e4e12"), grnm=hx("#4f8420"), grnb=hx("#8fcc3e"), ol=hx("#52260a"))


def carrot(b, f):
    p = 2 * math.pi * f / N
    topx, topy, hgt, halfw = 24, 18, 22, 6.4
    # root (rigid)
    for k in range(hgt + 1):
        s = k / hgt
        y = topy + k
        w = halfw * (1 - s) ** 0.92
        for x in range(int(topx - w), int(topx + w) + 1):
            nx = (x - topx) / max(0.6, w)
            t = 0.62 - 0.42 * nx - 0.30 * s          # lit left, darker toward tip
            b.put(x, y, lit(CA["root"], t))
    for ry in (4, 9, 14):                            # ridge dashes
        s = ry / hgt; w = halfw * (1 - s)
        b.put(topx - w * 0.4, topy + ry, CA["ridge"])
        b.put(topx + w * 0.5, topy + ry + 1, CA["ridge"])
    softline(b, topx - 2, topy + 2, topx - 3, topy + hgt - 4, lit(CA["root"], 0.92))  # sheen
    # fronds (bend; rigid root)
    fronds = [(-5, 13, -0.7, 0.0), (-2.5, 17, -0.25, 0.9), (0, 19, 0.05, 1.8),
              (2.5, 16, 0.3, 2.7), (5, 12, 0.7, 3.6)]
    for bx, fh, lean, ph in fronds:
        rx0, ry0 = topx + bx, topy + 1
        pts = []
        for i in range(fh * 3 + 1):
            s = i / (fh * 3)
            yy = ry0 - s * fh
            xx = rx0 + lean * (s ** 1.3) * fh * 0.16 + cantilever(s, p, 3.6, ph)
            pts.append((xx, yy, s))
            b.put(xx, yy, CA["grnb"] if s > 0.55 else CA["grnm"])
        for i in range(2, len(pts) - 2, max(2, fh // 3)):  # leaflets
            xx, yy, s = pts[i]
            b.put(xx - 1, yy + 0.5, CA["grnd"]); b.put(xx + 1, yy + 0.5, CA["grnm"])
    outline(b, CA["ol"])


# ════════════════════════════ oak ════════════════════════════
OK = dict(
    trunk=[hx("#2a1606"), hx("#3a200a"), hx("#5a3410"), hx("#7a4a18"), hx("#9a6a2a")],
    fol=[hx("#16270a"), hx("#1f3a08"), hx("#2f5212"), hx("#3a6818"), hx("#5a9028"), hx("#8fc23f"), hx("#b6e070")],
    shimmer=hx("#d8eaa0"), leaf=hx("#6a9a28"), ol=hx("#15240a"))


def oak(b, f):
    p = 2 * math.pi * f / N
    # trunk (rigid) + bark
    for y in range(30, 43):
        w = 3.2 - (y - 30) * 0.05
        for x in range(int(24 - w), int(24 + w) + 1):
            nx = (x - 24) / max(0.6, w)
            b.put(x, y, lit(OK["trunk"], 0.6 - 0.4 * nx))
    softline(b, 23, 31, 23, 41, lit(OK["trunk"], 0.15))
    softline(b, 25, 33, 25, 40, lit(OK["trunk"], 0.85))
    trunk_top = 30
    blobs = [(24, 22, 8, 0.0), (15, 19, 6, 0.7), (33, 19, 6, 1.5), (18, 13, 6, 2.2),
             (30, 13, 6, 3.0), (24, 10, 6.5, 3.7), (24, 17, 7, 1.1)]
    for bx, by, r, ph in blobs:
        s = (trunk_top - by) / 22.0
        sway = 2.3 * math.sin(p - 0.5 * s + ph * 0.2) * envl(p) * (0.35 + s)
        jig = math.sin(p * 2 + ph) * 0.5
        disc(b, bx + sway, by + jig, r, r * 0.9,
             lambda nx, ny: lit(OK["fol"], sphere_t(nx, ny) * 0.92 + 0.04))
    # dappled shimmer
    for i, (sx, sy, ph) in enumerate([(17, 12, 0.0), (30, 11, 2.0), (24, 8, 4.0)]):
        if math.sin(p + ph) > 0.35:
            s = (trunk_top - sy) / 22.0
            b.put(sx + 2.3 * math.sin(p) * (0.35 + s), sy, OK["shimmer"])
    # falling leaf (loops)
    g = (f % N) / N
    ly = 14 + g * 26
    lx = 34 - g * 7 + math.sin(g * 6.0) * 2.2
    if ly < 42:
        b.put(lx, ly, OK["leaf"]); b.put(lx + 1, ly + 0.4, lit(OK["fol"], 0.2))
    outline(b, OK["ol"])


# ════════════════════════════ corn ════════════════════════════
CO = dict(
    husk=[hx("#24400e"), hx("#3a5a14"), hx("#5a8420"), hx("#7ca832"), hx("#a8d058"), hx("#cfe88a")],
    cob=[hx("#7a5208"), hx("#a06c10"), hx("#caa028"), hx("#f4c84a"), hx("#ffe98a"), hx("#fff6c4")],
    kern=hx("#9a6e14"), silk=hx("#e8c98a"), spec=hx("#fffdf0"), ol=hx("#33460e"))


def corn(b, f):
    p = 2 * math.pi * f / N
    cx, cy, a, bb = 24, 25, 6.2, 13.5
    base_y = cy + bb
    # husk leaves (SWAY; the cob stays rigid). draw behind + flanking.
    husks = [(-1, 7.5, 16, 0.0, 1.0), (1, 7.5, 16, 1.6, 1.0),
             (-1, 4.0, 19, 0.8, 0.55), (1, 4.0, 19, 2.4, 0.55)]
    for side, spread, fh, ph, amp in husks:
        rootx, rooty = cx + side * 2, base_y - 1
        for i in range(fh * 3 + 1):
            s = i / (fh * 3)
            yy = rooty - s * fh
            base = side * spread * math.sin(min(1.0, s * 1.15) * math.pi) ** 0.7
            xx = rootx + base + cantilever(s, p, 3.4 * amp, ph)
            t = 0.7 if side < 0 else 0.45
            b.put(xx, yy, lit(CO["husk"], t + 0.18 * (s)))
            b.put(xx - side, yy, lit(CO["husk"], (0.5 if side < 0 else 0.3)))
        # vein
        softline(b, rootx, rooty, rootx + side * spread * 0.4 + cantilever(1, p, 3.4 * amp, ph),
                 rooty - fh, lit(CO["husk"], 0.25))
    # cob (RIGID) — rounded, kernel grid
    for y in range(int(cy - bb), int(cy + bb) + 1):
        ny = (y - cy) / bb
        if abs(ny) > 1:
            continue
        span = a * math.sqrt(max(0.0, 1 - ny * ny))
        for x in range(int(cx - span), int(cx + span) + 1):
            nx = (x - cx) / a
            b.put(x, y, lit(CO["cob"], sphere_t(nx, ny * 0.6)))
    for ky in range(int(cy - bb) + 2, int(cy + bb) - 1, 2):  # kernel dimples
        ny = (ky - cy) / bb
        span = a * math.sqrt(max(0.0, 1 - ny * ny))
        off = 0 if (ky % 4 == 0) else 1
        for kx in range(int(cx - span) + 1 + off, int(cx + span), 2):
            nx = (kx - cx) / a
            if abs(nx) < 0.82:
                b.put(kx, ky, CO["kern"])
    # silk tuft at top
    for sxk in (-1, 0, 1):
        b.put(cx + sxk, cy - bb - 1, CO["silk"])
    # shine sliding down kernels
    g = (f % N) / N
    sy = cy - bb + 2 + g * (2 * bb - 4)
    b.put(cx - 2, sy, CO["spec"]); b.put(cx - 1, sy + 0.4, CO["spec"])
    outline(b, CO["ol"])


ENTITIES = [("chicken", chicken, 8), ("apple", apple, 4), ("carrot", carrot, 5),
            ("oak", oak, 6), ("corn", corn, 5)]

if __name__ == "__main__":
    for name, fn, still in ENTITIES:
        frames = []
        for f in range(N):
            bf = Buf(); fn(bf, f); frames.append(bf.image())
        save(frames, name, still)
        print(name, "ok")
    print("done")
