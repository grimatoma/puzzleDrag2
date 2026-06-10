#!/usr/bin/env python3
"""64px seasonal birch — v2: realistic foliage, passive motion, leaf-pile fall.

Changes from v1 (_gen.py):
  * FOLIAGE is a textured leaf-mass, not smooth ball-clusters. The canopy is the
    union of ~140 small leaf puffs; shading is a global light model (top-left key,
    underside shade, rim darkening) + 2-octave value-noise dapple + scattered
    shadow gaps + a ragged leafy silhouette. Reads as real foliage instead of
    cauliflower.
  * MOTION is passive: low amplitude, slow — a gentle settle/sway, not a gust.
  * FALL->WINTER is a real sequence (visual realism is the point):
      1. individual leaves detach (in order) and tumble down,
      2. they accumulate into a PILE at the base that grows bottom-up,
      3. snow then covers the bare branches,
      4. and finally blankets the leaf pile.
    The winter still is the end state: snow-laden bare branches + a snow-covered
    leaf-pile mound.

compose_frame is driven by EXPLICIT state so stills and transitions stay in lock-
step at the seams:
  season_base   canopy colour wheel (0 spring .. 3)
  fallp         0..1 leaf-fall progress (0 full canopy, 1 bare + full pile)
  snow_branch   0..1 snow on branches
  snow_pile     0..1 snow over the leaf pile
  snow_ground   0..1 snow on the ground patch
  gust          breeze amplitude (kept small)

Modes:
  py _gen_v2.py stills   -> _review_stills_v2.png
  py _gen_v2.py frames   -> frames_v2/* (stills + transition sequences) + review sheets
"""
import math, os, sys, random
from PIL import Image

W = H = 64
OUT = os.path.dirname(os.path.abspath(__file__))
FRAMES = os.path.join(OUT, "frames_v2")

N_TRANS = 14          # colour-morph transitions
N_FALL = 22           # autumn->winter (needs room for fall + pile + snow stages)

CX = 32
GROUND_Y = 54
TRUNK_BASE_Y = 57
FORK_Y = 30
CAN_CX, CAN_CY, CAN_RX, CAN_RY = 32, 18, 18, 15   # canopy ellipse
CAN_TOP = CAN_CY - CAN_RY
CAN_BOT = CAN_CY + CAN_RY

_L = (-0.55, -0.62, 0.56)
_ln = math.sqrt(sum(c * c for c in _L))
LX, LY, LZ = (c / _ln for c in _L)


def clamp(v, a=0.0, b=1.0):
    return a if v < a else (b if v > b else v)


def hx(h):
    if not isinstance(h, str):
        return h
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def smooth(t):
    t = clamp(t)
    return t * t * (3 - 2 * t)


def _hue_toward(h, target, amount):
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
    s = clamp(s); l = clamp(l)
    if s == 0:
        v = int(math.floor(l * 255 + 0.5)); return (v, v, v)
    q = l * (1 + s) if l < 0.5 else l + s - l * s
    p = 2 * l - q
    return tuple(int(math.floor(_h2c(p, q, h + o) * 255 + 0.5)) for o in (1 / 3, 0, -1 / 3))


def ramp(base, n=6, spread=0.40, hue_shift=26.0):
    """Light->dark ramp with hue shift (shadows cool, highlights warm)."""
    h0, s0, l0 = _rgb_to_hsl(*hx(base))
    out = []
    for i in range(n):
        t = i / (n - 1) if n > 1 else 0.5
        l = clamp(l0 - spread + 2 * spread * smooth(t), 0.05, 0.97)
        s = s0 * (0.66 + 0.5 * math.sin(math.pi * t))
        if l > 0.80:
            s *= 1.0 - 0.5 * (l - 0.80) / 0.16
        h = _hue_toward(h0, 48.0 if t >= 0.5 else 250.0, hue_shift * abs(t - 0.5) * 2)
        out.append(_hsl_to_rgb(h, clamp(s, 0.03, 0.98), l))
    return out


def lit(rmp, t):
    return rmp[int(clamp(t, 0.0, 0.9999) * len(rmp))]


def lerp(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def shift(rgb, deg, dl=0.0, ds=0.0):
    h, s, l = _rgb_to_hsl(*rgb)
    return _hsl_to_rgb(h + deg, clamp(s + ds), clamp(l + dl))


def mix(a, b, t):
    return tuple(int(math.floor(a[i] + (b[i] - a[i]) * t + 0.5)) for i in range(3))


def dith(x, y, t):
    BAYER4 = (0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5)
    return t * 16.0 > BAYER4[(int(y) % 4) * 4 + (int(x) % 4)]


# ---- hashed value noise (clumpy leaf texture) ----
def _hash01(i, j, seed):
    n = (int(i) * 73856093) ^ (int(j) * 19349663) ^ (seed * 83492791)
    n &= 0x7fffffff
    n = (n * (n * 15731 + 789221) + 1376312589) & 0x7fffffff
    return (n % 100003) / 100003.0


def vnoise(x, y, seed, cell):
    gx, gy = math.floor(x / cell), math.floor(y / cell)
    fx, fy = x / cell - gx, y / cell - gy
    u, v = smooth(fx), smooth(fy)
    a = _hash01(gx, gy, seed); b = _hash01(gx + 1, gy, seed)
    c = _hash01(gx, gy + 1, seed); d = _hash01(gx + 1, gy + 1, seed)
    return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v


class Buf:
    def __init__(self):
        self.px = [[(0, 0, 0, 0)] * W for _ in range(H)]

    def put(self, x, y, c, a=255):
        if c is None:
            return
        xi, yi = int(math.floor(x + 0.5)), int(math.floor(y + 0.5))
        if 0 <= xi < W and 0 <= yi < H:
            self.px[yi][xi] = (c[0], c[1], c[2], a)

    def at(self, x, y):
        xi, yi = int(x), int(y)
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


# ───────────────────────── palettes ─────────────────────────
FOL = [hx("#a6c83f"), hx("#4f9a26"), hx("#dd9a1f"), hx("#9a7a3a")]   # spring/summer/fall/(bare)
GND = [hx("#5fae3a"), hx("#4f922c"), hx("#a98f4c"), hx("#e7edf4")]
BARK = ramp("#ece7db", 6)
BARK_DK = ramp("#cfc7b6", 5)
MARK = hx("#241c12")
SNOW = ramp("#eef3fa", 5)
LITTER = [hx("#c98a2e"), hx("#b5642a"), hx("#9d7a34"), hx("#caa53e"), hx("#8a4f24")]
OUTLINE_FLOOR = hx("#1c150d")


def _wheel(arr, season):
    i = int(math.floor(season)) % 4
    t = smooth(season - math.floor(season))
    return lerp(arr[i], arr[(i + 1) % 4], t)


def foliage_base(season):
    return _wheel(FOL, season)


def ground_base(season):
    return _wheel(GND, season)


# ───────────────────────── tree layout (seeded once) ─────────────────────────
random.seed(11)
TRUNK = dict(lean=-1.0, curve=1.3, bw=5.4, tw=2.1)


def trunk_y(f):
    return TRUNK_BASE_Y - (TRUNK_BASE_Y - FORK_Y) * f


def trunk_x(f, sway=0.0):
    return CX + TRUNK["lean"] * f + TRUNK["curve"] * math.sin(math.pi * f * 0.85) + sway * (f ** 1.7)


MARKS = []
for _ in range(7):
    f = random.uniform(0.10, 0.92)
    MARKS.append(dict(f=f, o=random.uniform(0.18, 0.7), ln=random.choice([2, 3, 3, 4])))
KNOTS = [dict(f=0.30, o=0.30), dict(f=0.58, o=0.62), dict(f=0.78, o=0.34)]

_specs = [
    (0.86, 156, 15, 3), (0.92, 116, 17, 2), (1.00, 92, 18, 1), (0.96, 66, 17, 2),
    (0.88, 24, 15, 3), (0.99, 138, 12, 2), (0.99, 44, 12, 2),
]
BRANCHES = []
for bi, (fo, ang_deg, ln, droop) in enumerate(_specs):
    BRANCHES.append(dict(fo=fo, ang=math.radians(ang_deg), ln=ln, droop=droop,
                         ph=bi * 0.8 + random.uniform(-0.2, 0.2)))


def branch_pt(br, u, sway=0.0):
    ox = br["xb"] + br["ln"] * u * math.cos(br["ang"]) + sway * 1.4 * (u ** 1.3)
    oy = br["oy0"] - br["ln"] * u * math.sin(br["ang"]) + br["droop"] * (u ** 2)
    return ox, oy


for br in BRANCHES:
    br["xb"] = trunk_x(br["fo"])
    br["oy0"] = trunk_y(br["fo"])

# ---- leaf particles (define the canopy mass + the fall) ----
NLEAF = 150
rnd = random.Random(404)
LEAVES = []
while len(LEAVES) < NLEAF:
    x = CAN_CX + rnd.uniform(-CAN_RX, CAN_RX)
    y = CAN_CY + rnd.uniform(-CAN_RY, CAN_RY)
    nx, ny = (x - CAN_CX) / CAN_RX, (y - CAN_CY) / CAN_RY
    lump = 1.0 + 0.12 * (vnoise(x, y, 9, 5.0) - 0.5)
    if nx * nx + ny * ny > lump:
        continue
    LEAVES.append(dict(x=x, y=y, r=rnd.uniform(2.0, 3.6),
                       hue=rnd.uniform(-16, 14), sat=rnd.uniform(-0.05, 0.08),
                       jb=rnd.uniform(0, 6.28)))
# drop order: outer & upper leaves let go a touch earlier, plus randomness
for lf in LEAVES:
    nx, ny = (lf["x"] - CAN_CX) / CAN_RX, (lf["y"] - CAN_CY) / CAN_RY
    expo = clamp(0.5 + 0.5 * (nx * nx + ny * ny) ** 0.5 - 0.25 * (ny + 1) * 0.5)
    lf["drop"] = clamp(0.72 * rnd.random() + 0.28 * expo)
LEAVES.sort(key=lambda l: l["drop"])          # fall sequence
for k, lf in enumerate(LEAVES):
    lf["fall_i"] = k

# ---- pile slots: a mound at the base, filled bottom-up ----
PILE_CX, PILE_BASE_Y, PILE_HW, PILE_H = 32, 56, 13, 9
_slots = []
yy = PILE_BASE_Y + 1
row = 0
while True:
    h_here = PILE_H * (1 - (row * 1.15) / PILE_H) if PILE_H else 0
    if row * 1.15 > PILE_H:
        break
    half = PILE_HW * math.sqrt(max(0.0, 1 - ((PILE_BASE_Y - (PILE_BASE_Y - row * 1.15)) / 1e9)))  # placeholder
    # width of this layer from a semi-ellipse profile on height
    hy = row * 1.15
    half = PILE_HW * math.sqrt(max(0.0, 1 - (hy / PILE_H) ** 2))
    xx = PILE_CX - half
    n = max(1, int(2 * half / 1.25))
    for i in range(n + 1):
        sx = PILE_CX - half + (2 * half) * (i / max(1, n)) + rnd.uniform(-0.4, 0.4)
        sy = PILE_BASE_Y - hy + rnd.uniform(-0.3, 0.3)
        _slots.append((sx, sy))
    row += 1
_slots.sort(key=lambda s: (-s[1], abs(s[0] - PILE_CX)))   # bottom rows first
for k, lf in enumerate(LEAVES):
    s = _slots[k % len(_slots)]
    lf["land_x"], lf["land_y"] = s[0], s[1]
    lf["spin"] = rnd.uniform(0.7, 1.4) * rnd.choice([-1, 1])
    lf["sway"] = rnd.uniform(2.0, 4.0)
    lf["litter"] = rnd.randrange(len(LITTER))


def snow_amt_from_state(snow_ground):
    return snow_ground


# ───────────────────────── drawing ─────────────────────────
def draw_ground(buf, season, snow_ground, gust, t):
    grmp = ramp(ground_base(season), 5)
    sn = snow_ground
    hw0 = 19.0
    sd = sn * 7.2
    for y in range(GROUND_Y - 1, H):
        dy = y - (GROUND_Y - 1)
        half = hw0 * math.sqrt(max(0.0, 1 - (dy / 7.0) ** 2))
        if half < 1:
            continue
        for x in range(int(CX - half), int(CX + half) + 1):
            edge = abs(x - CX) / (half + 1e-6)
            L = clamp(0.62 - 0.34 * edge - 0.12 * (x - CX) / 19.0)
            c = lit(grmp, L)
            if sn > 0.02:
                if dy < sd - 0.5:
                    c = lit(SNOW, clamp(0.93 - 0.22 * edge))
                elif dy < sd + 1.4 and dith(x, y, clamp(sd - dy + 0.6)):
                    c = lit(SNOW, clamp(0.90 - 0.22 * edge))
            buf.put(x, y, c)
    # grass blades, spring/summer only, gentle
    g = clamp(1.0 - max(0.0, season - 1.0)) if season < 2 else 0.0
    if g > 0.12 and sn < 0.2:
        gb = ramp(ground_base(season), 5)
        r2 = random.Random(21)
        for _ in range(int(14 * g)):
            bx = r2.uniform(CX - 16, CX + 16); fh = r2.uniform(2.5, 4.5); ph = r2.uniform(0, 6.28)
            base_y = GROUND_Y + r2.uniform(-1, 3)
            for i in range(int(fh * 2) + 1):
                s = i / (fh * 2); yy = base_y - s * fh
                xx = bx + 1.1 * (s ** 1.5) * math.sin(t * 1.3 + ph) * gust
                buf.put(xx, yy, lit(gb, 0.82 if s > 0.5 else 0.5))


def draw_trunk(buf, snow_branch, sway):
    for y in range(FORK_Y, TRUNK_BASE_Y + 1):
        f = (TRUNK_BASE_Y - y) / (TRUNK_BASE_Y - FORK_Y)
        cx = trunk_x(f, sway)
        hw = TRUNK["bw"] + (TRUNK["tw"] - TRUNK["bw"]) * f
        left = cx - hw
        for x in range(int(math.floor(left + 0.5)), int(math.floor(cx + hw + 0.5)) + 1):
            tt = (x - left) / (2 * hw + 1e-6)
            L = clamp(0.95 - 0.74 * tt)
            buf.put(x, y, lit(BARK, L))
    for m in MARKS:
        f = m["f"]; y = trunk_y(f); cx = trunk_x(f, sway)
        hw = TRUNK["bw"] + (TRUNK["tw"] - TRUNK["bw"]) * f
        mx = cx - hw + m["o"] * 2 * hw
        for k in range(m["ln"]):
            buf.put(mx + k, y, MARK)
    for kn in KNOTS:
        f = kn["f"]; y = trunk_y(f); cx = trunk_x(f, sway)
        hw = TRUNK["bw"] + (TRUNK["tw"] - TRUNK["bw"]) * f
        mx = cx - hw + kn["o"] * 2 * hw
        buf.put(mx, y - 1, MARK); buf.put(mx + 1, y, MARK)
        buf.put(mx + 2, y - 1, MARK); buf.put(mx + 1, y - 2, hx("#3a2e1e"))


def draw_branches(buf, snow_branch, sway):
    for br in BRANCHES:
        steps = max(6, int(br["ln"]))
        for i in range(steps + 1):
            u = i / steps
            x, y = branch_pt(br, u, sway)
            w = 1.9 * (1 - u) + 0.6
            disc(buf, x, y, w, w, lambda nx, ny: lit(BARK, 0.84) if (nx + ny) < -0.2 else lit(BARK_DK, 0.4))
    # snow accumulates on the upper side of the twigs, thicker as snow_branch grows
    if snow_branch > 0.02:
        for br in BRANCHES:
            steps = max(6, int(br["ln"]))
            for i in range(steps + 1):
                u = i / steps
                x, y = branch_pt(br, u, sway)
                th = snow_branch * (1.6 * (1 - u) + 0.5)
                if th < 0.35:
                    continue
                buf.put(x, y - 1, lit(SNOW, 0.95))
                if th > 1.1:
                    buf.put(x - 1, y - 1, lit(SNOW, 0.88))
                    buf.put(x + 1, y - 1, lit(SNOW, 0.9))
                if th > 1.7:
                    buf.put(x, y - 2, lit(SNOW, 0.97))


def draw_canopy(buf, season, fallp, gust, t):
    """Textured leaf-mass: union of attached leaf puffs, globally lit + dappled."""
    base = foliage_base(season)
    # browning as the crown empties
    if fallp > 0:
        base = mix(base, hx("#a06a30"), 0.4 * fallp)
    rmp = ramp(base, 7)
    # build coverage from attached leaves (drop > fallp), with gentle sway offset
    cov = {}
    swx = 0.7 * math.sin(t * 0.9) * gust
    for lf in LEAVES:
        if lf["drop"] <= fallp:
            continue
        ox = lf["x"] + swx * ((lf["y"] - CAN_BOT) / -CAN_RY) + 0.4 * math.sin(t * 1.1 + lf["jb"]) * gust
        oy = lf["y"] + 0.25 * math.sin(t * 0.8 + lf["jb"]) * gust
        r = lf["r"]
        for yy in range(int(oy - r - 1), int(oy + r + 2)):
            for xx in range(int(ox - r - 1), int(ox + r + 2)):
                dx, dy = xx - ox, yy - oy
                if dx * dx + dy * dy <= r * r:
                    key = (xx, yy)
                    d2 = dx * dx + dy * dy
                    if key not in cov or d2 < cov[key][0]:
                        cov[key] = (d2, lf)
    # shade each covered pixel
    for (x, y), (d2, lf) in cov.items():
        nx, ny = (x - CAN_CX) / CAN_RX, (y - CAN_CY) / CAN_RY
        nz = math.sqrt(max(0.0, 1 - min(1.0, nx * nx + ny * ny)))
        keylit = max(0.0, (-nx) * LX + (-ny) * LY + nz * LZ)
        rim = nx * nx + ny * ny
        L = 0.36 + 0.46 * keylit - 0.13 * rim + 0.10 * (-ny)
        # 2-octave dapple: clumpy highlights, light fine break-up
        nA = vnoise(x, y, 31, 3.2)
        nB = vnoise(x, y, 57, 1.4)
        L += (nA - 0.5) * 0.30 + (nB - 0.5) * 0.10
        # shadow gaps (depth between clumps), biased lower / inner, kept sparse
        if vnoise(x, y, 73, 2.6) < 0.085 and ny > -0.15:
            L -= 0.30
        L = clamp(L + lf["hue"] * 0.002)
        col = lit(rmp, L)
        if lf["sat"]:
            col = shift(col, lf["hue"] * 0.25, ds=lf["sat"] * 0.4)
        buf.put(x, y, col)
    # ragged leafy edge: trim ~25% of rim pixels, sprout a few bumps
    rimpx = []
    for (x, y) in list(cov.keys()):
        if any((x + dx, y + dy) not in cov for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
            rimpx.append((x, y))
    for (x, y) in rimpx:
        if vnoise(x, y, 91, 1.0) < 0.28:
            buf.px[y][x] = (0, 0, 0, 0)


def outline_pass(buf, only_dark=True):
    src = [row[:] for row in buf.px]
    for y in range(H):
        for x in range(W):
            if src[y][x][3] >= 128:
                continue
            best = None
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < W and 0 <= ny < H and src[ny][nx][3] >= 128:
                    c = src[ny][nx]
                    if best is None or sum(c[:3]) < sum(best[:3]):
                        best = c
            if best is None:
                continue
            # only outline orthogonal neighbours (keeps corners soft)
            orth = any(0 <= x + dx < W and 0 <= y + dy < H and src[y + dy][x + dx][3] >= 128
                       for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
            if not orth:
                continue
            h, s, l = _rgb_to_hsl(*best[:3])
            oc = _hsl_to_rgb(h, min(0.55, s * 0.85), max(0.05, l * 0.28))
            oc = mix(oc, OUTLINE_FLOOR, 0.4)
            buf.px[y][x] = (oc[0], oc[1], oc[2], 255)


def draw_pile(buf, fallp, snow_pile):
    """Landed leaves stacked into a growing mound; snow then blankets the top."""
    if fallp <= 0.001:
        return
    landed = int(round(NLEAF * clamp(fallp)))
    top_y = {}                       # surface (min y) per column, for snow
    for lf in LEAVES[:landed]:
        lx, ly = lf["land_x"], lf["land_y"]
        c = LITTER[lf["litter"]]
        # simple form light: top of the heap lighter
        shade = clamp(0.5 + (PILE_BASE_Y - ly) * 0.05 - (lf["land_x"] - PILE_CX) * 0.01)
        col = shift(c, 0, dl=(shade - 0.5) * 0.5)
        buf.put(lx, ly, col)
        xi = int(round(lx))
        top_y[xi] = min(top_y.get(xi, 99), int(round(ly)))
        if lf["r"] > 3.0:            # a few bigger leaves cast a 2px mark
            buf.put(lx, ly - 1, shift(c, 0, dl=0.05))
            top_y[xi] = min(top_y[xi], int(round(ly)) - 1)
    # snow blanket over the pile surface, growing downward
    if snow_pile > 0.02:
        depth = snow_pile * (PILE_H + 2)
        for lf in LEAVES[:landed]:
            xi = int(round(lf["land_x"]))
            sy = top_y.get(xi, None)
            if sy is None:
                continue
            yy = int(round(lf["land_y"]))
            if yy - sy <= depth - 0.5:
                edge = abs(lf["land_x"] - PILE_CX) / (PILE_HW + 1)
                buf.put(lf["land_x"], yy, lit(SNOW, clamp(0.92 - 0.18 * edge)))
            elif yy - sy <= depth + 1.2 and dith(xi, yy, clamp(depth - (yy - sy) + 0.5)):
                buf.put(lf["land_x"], yy, lit(SNOW, 0.86))


def draw_falling(buf, fallp, gust, frame, N):
    """Individual leaves mid-air between detaching and landing."""
    falldur = 0.13
    for lf in LEAVES:
        d = lf["drop"]
        if d > fallp or d <= fallp - falldur:
            continue
        prog = clamp((fallp - d) / falldur)
        sx, sy = lf["x"], lf["y"]
        ex, ey = lf["land_x"], lf["land_y"]
        t = prog ** 1.4                                    # gravity ease-in
        # passive pendulum drift, decaying as it nears the ground
        drift = math.sin(prog * lf["sway"] + lf["jb"]) * 3.4 * (1 - t) * (0.5 + 0.5 * gust)
        x = sx + (ex - sx) * t + drift
        y = sy + (ey - sy) * t
        c = LITTER[lf["litter"]]
        buf.put(x, y, c)
        if math.sin(prog * 7 * lf["spin"]) > 0:            # slow tumble -> 2px now and then
            buf.put(x + (1 if lf["spin"] > 0 else -1), y, shift(c, 0, dl=-0.1))


# ───────────────────────── frame composition ─────────────────────────
def compose(season_base, fallp, snow_branch, snow_pile, snow_ground, gust, frame, N):
    b = Buf()
    t = 2 * math.pi * frame / max(1, N)
    sway = 0.5 * math.sin(t * 0.8) * gust
    draw_ground(b, season_base, snow_ground, gust, t)
    draw_trunk(b, snow_branch, sway)
    draw_branches(b, snow_branch, sway)
    draw_canopy(b, season_base, fallp, gust, t)
    outline_pass(b)
    draw_pile(b, fallp, snow_pile)
    draw_falling(b, fallp, gust, frame, N)
    return b.image()


# ---- explicit per-state stills ----
def still(which):
    if which == "spring":
        return compose(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0, 1)
    if which == "summer":
        return compose(1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0, 1)
    if which == "autumn":
        return compose(2.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0, 1)
    if which == "winter":
        return compose(2.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0, 1)


GUST_MAX = 0.55           # passive: small


def ramp_seg(u, a, b):
    return clamp((u - a) / (b - a)) if b > a else (1.0 if u >= a else 0.0)


def trans_spring_summer(n=N_TRANS):
    out = []
    for f in range(n):
        u = f / (n - 1)
        gust = GUST_MAX * math.sin(math.pi * u)
        out.append(compose(0.0 + 1.0 * smooth(u), 0, 0, 0, 0, gust, f, n))
    return out


def trans_summer_autumn(n=N_TRANS):
    out = []
    for f in range(n):
        u = f / (n - 1)
        gust = GUST_MAX * math.sin(math.pi * u)
        out.append(compose(1.0 + 1.0 * smooth(u), 0, 0, 0, 0, gust, f, n))
    return out


def trans_autumn_winter(n=N_FALL):
    out = []
    for f in range(n):
        u = f / (n - 1)
        fallp = ramp_seg(u, 0.0, 0.60)                   # 1: steady individual leaf-fall + pile
        snow_ground = smooth(ramp_seg(u, 0.54, 0.86))    # 2: ground whitens
        snow_branch = smooth(ramp_seg(u, 0.60, 0.90))    # 3: snow covers the branches
        snow_pile = smooth(ramp_seg(u, 0.74, 1.0))       # 4: snow buries the leaf pile
        gust = GUST_MAX * 0.7 * math.sin(math.pi * min(1.0, u / 0.6))
        out.append(compose(2.0, fallp, snow_branch, snow_pile, snow_ground, gust, f, n))
    return out


# ───────────────────────── export ─────────────────────────
SEASONS = ["spring", "summer", "autumn", "winter"]


def montage(cells, labels, cols, scale, path, bg=(96, 100, 108), gap=(58, 60, 66)):
    rows = (len(cells) + cols - 1) // cols
    sheet = Image.new("RGB", (W * scale * cols, H * scale * rows), gap)
    for i, im in enumerate(cells):
        base = Image.new("RGB", im.size, bg)
        base.paste(im, (0, 0), im)
        sheet.paste(base.resize((W * scale, H * scale), Image.Resampling.NEAREST),
                    ((i % cols) * W * scale, (i // cols) * H * scale))
    sheet.save(path)
    print("montage ->", os.path.relpath(path, OUT), sheet.size, "|", ", ".join(labels))


def render_stills_review():
    montage([still(s) for s in SEASONS], SEASONS, 4, 6, os.path.join(OUT, "_review_stills_v2.png"))


def render_frames():
    os.makedirs(FRAMES, exist_ok=True)
    for s in SEASONS:
        still(s).save(os.path.join(FRAMES, f"still_{s}.png"))
    print("stills -> 4 png")
    seqs = [("spring_summer", trans_spring_summer()),
            ("summer_autumn", trans_summer_autumn()),
            ("autumn_winter", trans_autumn_winter())]
    rc, rl = [], []
    for nm, frs in seqs:
        d = os.path.join(FRAMES, f"trans_{nm}")
        os.makedirs(d, exist_ok=True)
        for i, im in enumerate(frs):
            im.save(os.path.join(d, f"f{i:02d}.png"))
        print(f"trans_{nm} -> {len(frs)} png")
        idx = [round(k * (len(frs) - 1) / 7) for k in range(8)]
        for j in idx:
            rc.append(frs[j]); rl.append(f"{nm[:3]} {int(100*j/(len(frs)-1))}%")
    montage(rc, rl, 8, 4, os.path.join(OUT, "_review_transitions_v2.png"))


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "stills"
    if mode == "frames":
        render_frames()
    else:
        render_stills_review()
