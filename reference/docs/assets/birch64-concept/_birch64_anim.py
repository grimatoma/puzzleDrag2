#!/usr/bin/env python3
"""64px animated birch tile — a fresh, *cartoony-but-realistic* take.

A single slender white-bark birch (black lenticels + chevron knots), a chunky
rounded leaf-blob canopy, and a bold dark silhouette outline so it reads like the
game's own tile icons. One parameterized builder, compose_frame(season, bp, f, N):

  * season is a CONTINUOUS float on a 0..4 wheel: 0 spring, 1 summer, 2 fall, 3 winter.
    An idle holds season fixed and loops the breeze; a transition eases season A->B.
  * What MOVES: the canopy. Branches + leaf clusters bend on a cantilever (tip lags the
    base, each branch out of phase) so a gust rolls through; leaves add a fine flutter;
    the trunk only barely sways at the very top. Trunk/branches are otherwise rigid.
  * ACCURATE transitions: every canopy cluster has a per-cluster drop_order and grow_order.
      - fall -> winter: clusters DETACH one by one; each spawns a leaf that tumbles down,
        lands, and piles up as litter on the ground, which snow then buries. The crown
        genuinely empties leaf-by-leaf instead of fading out in place.
      - winter -> spring: snow melts off, buds swell at the branch tips, then leaves grow
        back in (staggered) — closing the loop.
    presence(cl, season) is continuous across every season boundary so idles and
    transitions agree at the seams.

Run:
  py -3 _birch64_anim.py stills   -> a season-comparison montage PNG for art review
  py -3 _birch64_anim.py anims    -> writes the 8 looping GIFs into this folder

Requires Pillow.
"""
import math, os, sys, random
from PIL import Image

W = H = 64
N_IDLE = 18
N_TRANS = 36
DUR_IDLE = 85
DUR_TRANS = 72
OUT = os.path.dirname(os.path.abspath(__file__))
CX = 32
GROUND_Y = 54          # top of the little ground mound
TRUNK_BASE_Y = 57
FORK_Y = 30            # where the trunk forks into branches
CROWN_CX, CROWN_CY, CROWN_R = 32, 20, 18

# light upper-left
_L = (-0.5, -0.55, 0.66)
_ln = math.sqrt(sum(c * c for c in _L))
LX, LY, LZ = (c / _ln for c in _L)


def clamp(v, a=0.0, b=1.0):
    return a if v < a else (b if v > b else v)


def hx(h):
    if not isinstance(h, str):
        return h
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def wind(p):
    return math.sin(p) + 0.25 * math.sin(2 * p + 0.6)


def envl(p):
    return 0.72 + 0.28 * math.sin(p - math.pi / 2)


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


def ramp(base, n=6, spread=0.34, hue_shift=22.0):
    h0, s0, l0 = _rgb_to_hsl(*hx(base))
    WARM, COOL = 50.0, 255.0
    out = []
    for i in range(n):
        t = i / (n - 1) if n > 1 else 0.5
        l = clamp(l0 - spread + 2 * spread * smooth(t), 0.06, 0.96)
        s = s0 * (0.68 + 0.46 * math.sin(math.pi * t))
        if l > 0.80:
            s *= 1.0 - 0.5 * (l - 0.80) / 0.16
        h = _hue_toward(h0, WARM if t >= 0.5 else COOL, hue_shift * abs(t - 0.5) * 2)
        out.append(_hsl_to_rgb(h, clamp(s, 0.03, 0.98), l))
    return out


def lit(rmp, t):
    return rmp[int(clamp(t, 0.0, 0.9999) * len(rmp))]


def sphere_t(nx, ny):
    nz = math.sqrt(max(0.0, 1 - nx * nx - ny * ny))
    return 0.16 + 0.86 * max(0.0, nx * LX + ny * LY + nz * LZ)


def lerp(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def shift(rgb, deg, dl=0.0, ds=0.0):
    h, s, l = _rgb_to_hsl(*rgb)
    return _hsl_to_rgb(h + deg, clamp(s + ds), clamp(l + dl))


def mix(a, b, t):
    return tuple(int(math.floor(a[i] + (b[i] - a[i]) * t + 0.5)) for i in range(3))


BAYER4 = (0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5)


def dither(x, y, t):
    return t * 16.0 > BAYER4[(int(y) % 4) * 4 + (int(x) % 4)]


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
        if 0 <= x < W and 0 <= y < H:
            return self.px[y][x]
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
# foliage mid-tones around the wheel: spring (fresh), summer (rich), fall (gold), (bare)
FOL = [hx("#b4d24a"), hx("#54a02a"), hx("#e3a022"), hx("#9a7a3a")]
GND = [hx("#5fae3a"), hx("#4f922c"), hx("#b89a52"), hx("#e7edf4")]   # ground per season
BARK = ramp("#ece7db", 6)            # white birch bark
BARK_DK = ramp("#cfc7b6", 5)
MARK = hx("#241c12")                 # lenticels / knots
SNOW = ramp("#eef3fa", 5)
CATKIN = hx("#cdcf86")
BUD = hx("#b9c86a")
OUTLINE_FLOOR = hx("#1c150d")


def _wheel(arr, season):
    i = int(math.floor(season)) % 4
    t = smooth(season - math.floor(season))
    return lerp(arr[i], arr[(i + 1) % 4], t)


def foliage_base(season):
    return _wheel(FOL, season)


def ground_base(season):
    return _wheel(GND, season)


def _kf(vals, season):
    i = int(math.floor(season)) % 4
    t = smooth(season - math.floor(season))
    return vals[i] + (vals[(i + 1) % 4] - vals[i]) * t


def grassiness(season):
    return _kf([1.0, 1.0, 0.0, 0.0], season)


def springness(sw):
    return clamp(1.0 - min(sw % 4, 4 - (sw % 4)) / 1.0)


def fallness(sw):
    w = sw % 4
    return clamp(1.0 - abs(w - 2.0) / 1.25)


def snow_amt(sw):
    sw = sw % 4
    if sw <= 2.30: return 0.0
    if sw <= 3.00: return smooth((sw - 2.30) / 0.70)
    if sw <= 3.15: return 1.0
    if sw <= 3.85: return 1.0 - smooth((sw - 3.15) / 0.70)
    return 0.0


# ───────────────────────── tree layout (seeded, built once) ─────────────────────────
random.seed(11)

TRUNK = dict(lean=-1.0, curve=1.3, bw=6.4, tw=2.6)


def trunk_y(f):
    return TRUNK_BASE_Y - (TRUNK_BASE_Y - FORK_Y) * f


def trunk_sway(f, bp):
    return 1.05 * (f ** 1.7) * wind(bp * 0.9) * envl(bp)


def trunk_x(f, bp=0.0):
    return CX + TRUNK["lean"] * f + TRUNK["curve"] * math.sin(math.pi * f * 0.85) + trunk_sway(f, bp)


# lenticel dashes + chevron knots up the trunk
MARKS = []
for _ in range(7):
    f = random.uniform(0.10, 0.92)
    MARKS.append(dict(f=f, o=random.uniform(0.18, 0.7), ln=random.choice([2, 3, 3, 4])))
KNOTS = [dict(f=0.30, o=0.30), dict(f=0.58, o=0.62), dict(f=0.78, o=0.34)]

AMP = 3.1
LAG = 1.0

# branches fan up from the fork into a shared crown
_specs = [
    (0.86, 156, 15, 3),
    (0.92, 116, 17, 2),
    (1.00, 92, 18, 1),
    (0.96, 66, 17, 2),
    (0.88, 24, 15, 3),
    (0.99, 138, 12, 2),
    (0.99, 44, 12, 2),
]
BRANCHES = []
for bi, (fo, ang_deg, ln, droop) in enumerate(_specs):
    BRANCHES.append(dict(fo=fo, ang=math.radians(ang_deg), ln=ln, droop=droop,
                         ph=bi * 0.8 + random.uniform(-0.2, 0.2)))


def branch_static(br, u):
    ox = br["xb"] + br["ln"] * u * math.cos(br["ang"])
    oy = br["oy0"] - br["ln"] * u * math.sin(br["ang"]) + br["droop"] * (u ** 2)
    return ox, oy


def branch_pt(br, u, bp):
    x, y = branch_static(br, u)
    dx = AMP * (u ** 1.35) * wind(bp - LAG * u + br["ph"]) * envl(bp)
    dy = 0.30 * AMP * (u ** 1.5) * wind(bp * 1.1 - 0.9 * u + br["ph"] + 1.5) * envl(bp)
    return x + dx, y + dy


# leaf clusters along the branches + a few filling the crown centre
CLUSTERS = []
for bi, br in enumerate(BRANCHES):
    br["xb"] = trunk_x(br["fo"], 0.0)
    br["oy0"] = trunk_y(br["fo"])
    nclust = max(2, int(br["ln"] / 5.0))
    for k in range(nclust):
        u = 0.46 + 0.62 * (k + random.uniform(0.0, 1.0)) / nclust
        bx0, by0 = branch_static(br, u)
        bx0 += random.uniform(-2.2, 2.2); by0 += random.uniform(-2.0, 2.0)
        CLUSTERS.append(dict(bi=bi, u=u, px=random.uniform(-2.0, 2.0), py=random.uniform(-1.8, 1.8),
                             fx=bx0, fy=by0))
for _ in range(7):
    bx0 = CROWN_CX + random.uniform(-14, 14)
    by0 = CROWN_CY + random.uniform(-11, 7)
    CLUSTERS.append(dict(bi=-1, fx=bx0, fy=by0, u=0.5, px=0.0, py=0.0))

# per-cluster attributes
for cl in CLUSTERS:
    bx0, by0 = cl["fx"], cl["fy"]
    posb = clamp(0.50 + 0.40 * (CROWN_CY - by0) / CROWN_R + 0.22 * (CROWN_CX - bx0) / CROWN_R)
    cy_norm = clamp((by0 - (CROWN_CY - CROWN_R)) / (2 * CROWN_R))   # 0 top .. 1 bottom
    cl["r"] = random.uniform(4.6, 7.0)
    cl["posb"] = posb
    cl["jph"] = random.uniform(0, 6.28)
    cl["hue"] = random.uniform(-26, 12)
    cl["sat"] = random.uniform(-0.04, 0.10)
    # outer/top leaves let go first; lower/inner cling a little longer
    cl["drop_order"] = clamp(random.uniform(0.0, 1.0) * 0.78 + 0.22 * cy_norm)
    cl["grow_order"] = random.uniform(0.0, 1.0)
    # where this leaf lands when it falls
    cl["land_x"] = clamp(bx0 + random.uniform(-7, 7), 12, W - 12)
    cl["land_y"] = GROUND_Y + random.uniform(-1, 4)
    cl["spin"] = random.uniform(0.7, 1.5) * random.choice([-1, 1])
    cl["swayA"] = random.uniform(2.5, 5.0)
CLUSTERS.sort(key=lambda c: c["fy"])   # back-to-front paint order


def presence(cl, sw):
    """Leaf scale 0..1 for this cluster at continuous season sw (wheel 0..4)."""
    sw = sw % 4
    if sw < 1.0:                       # spring -> summer : leaf-out fills to full
        return 0.80 + 0.20 * smooth(sw)
    if sw < 2.0:                       # summer -> fall : full crown
        return 1.0
    if sw < 3.0:                       # fall -> winter : drop, cluster by cluster
        defo = clamp((sw - 2.0) / 0.90)
        return 1.0 if cl["drop_order"] > defo else 0.0
    # winter -> spring : grow back, staggered, up to the spring scale (0.80)
    growth = clamp((sw - 3.0 - 0.12) / 0.80)
    g = growth - cl["grow_order"]
    return clamp(g / 0.20) * 0.80 if g > 0 else 0.0


def fall_state(cl, sw):
    """If this cluster is mid-fall (fall->winter), return (progress 0..1) else None."""
    sw = sw % 4
    if not (2.0 <= sw < 3.0):
        return None
    defo = clamp((sw - 2.0) / 0.90)
    if cl["drop_order"] > defo:
        return None
    return clamp((defo - cl["drop_order"]) / 0.18)


# ───────────────────────── drawing ─────────────────────────
def draw_ground(buf, season, bp):
    sw = season % 4
    grmp = ramp(ground_base(season), 5)
    sn = snow_amt(season)
    hw0 = 19.0
    sd = sn * 7.6                       # solid snow depth (rows from the mound top)
    for y in range(GROUND_Y - 1, H):
        dy = y - (GROUND_Y - 1)
        half = hw0 * math.sqrt(max(0.0, 1 - (dy / 7.0) ** 2))
        if half < 1:
            continue
        for x in range(int(CX - half), int(CX + half) + 1):
            edge = abs(x - CX) / (half + 1e-6)
            L = clamp(0.62 - 0.34 * edge - 0.12 * (x - CX) / 19.0)
            c = lit(grmp, L)
            if sn > 0.02:               # snow blankets from the top down, dithered fringe
                if dy < sd - 0.5:
                    c = lit(SNOW, clamp(0.93 - 0.24 * edge))
                elif dy < sd + 1.4 and dither(x, y, clamp(sd - dy + 0.6)):
                    c = lit(SNOW, clamp(0.90 - 0.24 * edge))
            buf.put(x, y, c)
    # grass blades (spring/summer) catch the breeze
    g = grassiness(season)
    if g > 0.12:
        gb = ramp(ground_base(season), 5)
        rnd = random.Random(21)
        for _ in range(int(16 * g)):
            bx = rnd.uniform(CX - 16, CX + 16)
            fh = rnd.uniform(2.5, 5.0)
            ph = rnd.uniform(0, 6.28)
            base_y = GROUND_Y + rnd.uniform(-1, 3)
            for i in range(int(fh * 2) + 1):
                s = i / (fh * 2)
                yy = base_y - s * fh
                xx = bx + 2.4 * (s ** 1.5) * wind(bp - 1.1 * s + ph) * envl(bp)
                buf.put(xx, yy, lit(gb, 0.82 if s > 0.5 else 0.5))


def draw_trunk(buf, season, bp):
    sn = snow_amt(season)
    for y in range(FORK_Y, TRUNK_BASE_Y + 1):
        f = (TRUNK_BASE_Y - y) / (TRUNK_BASE_Y - FORK_Y)
        cx = trunk_x(f, bp)
        hw = TRUNK["bw"] + (TRUNK["tw"] - TRUNK["bw"]) * f
        left = cx - hw
        for x in range(int(math.floor(left + 0.5)), int(math.floor(cx + hw + 0.5)) + 1):
            tt = (x - left) / (2 * hw + 1e-6)
            # birch: bright white on the lit (left) side, cool grey on the right
            L = clamp(0.95 - 0.74 * tt)
            buf.put(x, y, lit(BARK, L))
        if sn > 0.3 and dither(int(left), y, (sn - 0.25) * 1.3) and f > 0.05:
            buf.put(left, y, lit(SNOW, 0.93))
    # lenticel dashes
    for m in MARKS:
        f = m["f"]; y = trunk_y(f); cx = trunk_x(f, bp)
        hw = TRUNK["bw"] + (TRUNK["tw"] - TRUNK["bw"]) * f
        mx = cx - hw + m["o"] * 2 * hw
        for k in range(m["ln"]):
            buf.put(mx + k, y, MARK)
    # chevron knots (a birch tell)
    for kn in KNOTS:
        f = kn["f"]; y = trunk_y(f); cx = trunk_x(f, bp)
        hw = TRUNK["bw"] + (TRUNK["tw"] - TRUNK["bw"]) * f
        mx = cx - hw + kn["o"] * 2 * hw
        buf.put(mx, y - 1, MARK); buf.put(mx + 1, y, MARK)
        buf.put(mx + 2, y - 1, MARK); buf.put(mx + 1, y - 2, hx("#3a2e1e"))


def draw_branch(buf, br, season, bp):
    br["xb"] = trunk_x(br["fo"], bp)
    br["oy0"] = trunk_y(br["fo"])
    steps = max(6, int(br["ln"]))
    pts = [branch_pt(br, i / steps, bp) + (i / steps,) for i in range(steps + 1)]
    for (x, y, u) in pts:
        w = 1.9 * (1 - u) + 0.7
        disc(buf, x, y, w, w, lambda nx, ny: lit(BARK, 0.84) if (nx + ny) < -0.2 else lit(BARK_DK, 0.4))
    sn = snow_amt(season)
    if sn > 0.2:
        for u in (0.5, 0.78, 0.96):
            x, y = branch_pt(br, u, bp)
            if dither(int(x), int(y), (sn - 0.12)):
                buf.put(x, y - 1, lit(SNOW, 0.95))
                buf.put(x - 1, y - 1, lit(SNOW, 0.86))


def draw_catkins(buf, season, bp):
    sp = springness(season)
    if sp <= 0.3:
        return
    for br in (BRANCHES[2], BRANCHES[1], BRANCHES[3]):
        x, y = branch_pt(br, 1.0, bp)
        dl = 3 + int(2 * sp)
        for c in range(dl):
            sw = 0.55 * math.sin(bp + br["ph"]) * (c / dl)
            col = CATKIN if c % 2 == 0 else shift(CATKIN, 12, dl=-0.08)
            buf.put(x + sw, y + 1 + c, col)


def _bud_or_blob(buf, x, y, r, scale, rmp, posb, sw):
    """Tiny scales render as a swelling bud; larger ones as a shaded leaf-blob."""
    rr = r * clamp(scale)
    if rr < 0.8:
        return
    if scale < 0.42 and 3.0 <= sw < 4.0:   # spring bud
        buf.put(x, y, lit(rmp, 0.62))
        if rr > 1.4:
            buf.put(x, y + 1, lit(rmp, 0.34))
        buf.put(x - 1, y - 1, lit(rmp, 0.86))
        return
    # ambient-occlusion pocket behind the blob (gives blob-to-blob separation)
    disc(buf, x + 0.6, y + 1.0, rr * 1.04, rr * 1.04, lambda nx, ny: lit(rmp, 0.12))

    def cf(nx, ny):
        local = sphere_t(nx * 0.82 - 0.20, ny * 0.82 - 0.22)
        rim = (nx * nx + ny * ny)
        L = 0.26 + 0.40 * posb + 0.40 * local - 0.16 * rim
        return lit(rmp, clamp(L))
    disc(buf, x, y, rr, rr, cf)


def draw_canopy(buf, season, bp):
    sw = season % 4
    base = foliage_base(season)
    fa = fallness(season)
    defo = clamp((sw - 2.0) / 0.90) if 2.0 <= sw < 3.0 else (1.0 if sw >= 3.0 and sw < 3.0 else 0.0)
    # as leaves let go in late fall they brown out a touch first
    if 2.0 <= sw < 3.0:
        base = mix(base, hx("#9c7a3c"), 0.45 * defo)
    rmp0 = ramp(base, 6)
    NB = 5
    if fa > 0.05:
        buckets = [ramp(shift(base, (-26 + 38 * k / (NB - 1)) * fa, ds=0.05 * fa), 6) for k in range(NB)]
    else:
        buckets = [rmp0] * NB
    # spring leaf-out: brighter, yellower new growth
    if sw < 1.0 or sw >= 3.0:
        sp = springness(season)
        if sp > 0.05:
            buckets = [ramp(shift(base, 6 * sp, dl=0.05 * sp, ds=0.04 * sp), 6) for _ in range(NB)]
    items = []
    for cl in CLUSTERS:
        sc = presence(cl, season)
        if sc <= 0.06:
            continue
        if cl["bi"] >= 0:
            x, y = branch_pt(BRANCHES[cl["bi"]], cl["u"], bp)
            x += cl["px"]; y += cl["py"]
        else:
            x, y = cl["fx"], cl["fy"]
        x += 0.9 * cl["u"] * math.sin(6.0 * bp + cl["jph"])   # fine flutter
        y += 0.4 * math.sin(5.0 * bp + cl["jph"] + 1.0)
        items.append((y, x, sc, cl))
    items.sort(key=lambda t: t[0])
    for (y, x, sc, cl) in items:
        bk = int(clamp((cl["hue"] + 26) / 38.0) * (NB - 1) + 0.5)
        _bud_or_blob(buf, x, y, cl["r"], sc, buckets[bk], cl["posb"], sw)


def outline_pass(buf):
    """4-neighbour silhouette ring, tinted from the darkest adjacent opaque colour."""
    src = [row[:] for row in buf.px]
    for y in range(H):
        for x in range(W):
            if src[y][x][3] >= 128:
                continue
            best = None
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < W and 0 <= ny < H and src[ny][nx][3] >= 128:
                    c = src[ny][nx]
                    if best is None or sum(c[:3]) < sum(best[:3]):
                        best = c
            if best is None:
                continue
            h, s, l = _rgb_to_hsl(*best[:3])
            oc = _hsl_to_rgb(h, min(0.55, s * 0.85), max(0.05, l * 0.30))
            oc = mix(oc, OUTLINE_FLOOR, 0.35)
            buf.px[y][x] = (oc[0], oc[1], oc[2], 255)


def draw_litter(buf, season, bp):
    """Leaves that have already fallen, resting on the ground (revealed when snow is low)."""
    sw = season % 4
    sn = snow_amt(season)
    base = foliage_base(season)
    # landed transition leaves
    if 2.0 <= sw < 3.0:
        for cl in CLUSTERS:
            fp = fall_state(cl, sw)
            if fp is None or fp < 1.0:
                continue
            if sn > 0.45:
                continue
            col = shift(mix(base, hx("#9c6f34"), 0.5), cl["hue"] * 0.4, dl=-0.04)
            lx, ly = cl["land_x"], cl["land_y"]
            buf.put(lx, ly, col); buf.put(lx + 1, ly, shift(col, 0, dl=-0.09))
    # autumn ambient litter
    fa = clamp(fallness(season) * (1.0 - sn))
    if fa > 0.2:
        rnd = random.Random(57)
        for _ in range(int(8 * fa)):
            lx = rnd.uniform(CX - 16, CX + 16); ly = GROUND_Y + rnd.uniform(-1, 5)
            col = shift(base, rnd.uniform(-26, 8), dl=-0.05)
            buf.put(lx, ly, col)


def draw_falling(buf, season, frame, N, bp):
    """Leaves mid-air: the transition drops + a little ambient autumn fall."""
    sw = season % 4
    base = foliage_base(season)
    # transition: each detached cluster tumbles from its crown spot to its landing spot
    if 2.0 <= sw < 3.0:
        for cl in CLUSTERS:
            fp = fall_state(cl, sw)
            if fp is None or fp >= 1.0:
                continue
            sx, sy = cl["fx"], cl["fy"]
            ex, ey = cl["land_x"], cl["land_y"]
            t = fp ** 1.35                                   # gravity ease-in
            x = sx + (ex - sx) * t + math.sin(fp * cl["swayA"] + cl["jph"]) * 3.2 * (1 - t)
            y = sy + (ey - sy) * t
            col = shift(mix(base, hx("#a8773a"), 0.4), cl["hue"] * 0.5, dl=-0.02)
            # 2px leaf that tumbles (orientation flips over time)
            flip = math.sin(fp * 9 * cl["spin"]) > 0
            buf.put(x, y, col)
            if flip:
                buf.put(x + 1, y, shift(col, 0, dl=-0.10))
            else:
                buf.put(x, y + 1, shift(col, 0, dl=-0.10))
    # ambient autumn drift (seamless, loops on frame/N)
    fa = fallness(season)
    if fa > 0.25 and sw < 2.6:
        rnd = random.Random(303)
        for _ in range(int(5 * fa)):
            x0 = rnd.uniform(14, W - 14); ytop = rnd.uniform(14, 30)
            ph = rnd.uniform(0, 1); spd = rnd.uniform(0.8, 1.2); wob = rnd.uniform(2.5, 4.5)
            g = ((frame / N) * spd + ph) % 1.0
            y = ytop + g * (GROUND_Y - 1 - ytop)
            x = x0 + math.sin(g * wob + ph * 6) * 4 - g * 3
            col = shift(base, (-22, -8, 4)[rnd.randrange(3)], dl=-0.03)
            buf.put(x, y, col)
            if rnd.random() < 0.5:
                buf.put(x + 1, y + ((frame // 2) % 2), shift(col, 0, dl=-0.09))


def draw_petals(buf, season, frame, N):
    sp = springness(season)
    if sp <= 0.06:
        return
    rnd = random.Random(202)
    for _ in range(int(7 * sp)):
        x0 = rnd.uniform(12, W - 12); ytop = rnd.uniform(12, 32)
        ph = rnd.uniform(0, 1); spd = rnd.uniform(0.8, 1.2); wob = rnd.uniform(3, 5)
        g = ((frame / N) * spd + ph) % 1.0
        y = ytop + g * (GROUND_Y - 1 - ytop)
        x = x0 + math.sin(g * wob + ph * 6) * 5 - g * 4
        buf.put(x, y, (252, 248, 244) if (frame + int(ph * 9)) % 2 else (245, 228, 234))


def draw_snowfall(buf, season, frame, N):
    sn = snow_amt(season)
    if sn <= 0.06:
        return
    rnd = random.Random(404)
    for _ in range(int(18 * sn)):
        x0 = rnd.uniform(6, W - 6); ytop = rnd.uniform(4, 28)
        ph = rnd.uniform(0, 1); spd = rnd.uniform(0.7, 1.2); wob = rnd.uniform(2, 4)
        g = ((frame / N) * spd + ph) % 1.0
        y = ytop + g * (H - 4 - ytop)
        x = x0 + math.sin(g * wob + ph * 6) * 3 - g * 2
        buf.put(x, y, (255, 255, 255) if rnd.random() < 0.7 else (226, 234, 246))


def compose_frame(season, bp, frame, N):
    b = Buf()
    draw_ground(b, season, bp)
    draw_trunk(b, season, bp)
    for br in BRANCHES:
        draw_branch(b, br, season, bp)
    draw_catkins(b, season, bp)
    draw_canopy(b, season, bp)
    outline_pass(b)
    # loose overlays (crisp, un-outlined)
    draw_litter(b, season, bp)
    draw_falling(b, season, frame, N, bp)
    draw_petals(b, season, frame, N)
    draw_snowfall(b, season, frame, N)
    return b.image()


# ───────────────────────── export ─────────────────────────
def save_gif(frames, name, dur):
    opaque = {px[:3] for fr in frames for px in fr.getdata() if px[3] >= 128}
    ps = []
    if len(opaque) <= 255:
        cols = sorted(opaque)
        key = (1, 1, 1)
        while key in cols:
            key = (key[0] + 1, key[1], key[2])
        pal = [key] + cols
        idx = {c: i for i, c in enumerate(pal)}
        flat = []
        for c in pal:
            flat += list(c)
        flat += [0] * (768 - len(flat))
        for fr in frames:
            p = Image.new("P", (W, H)); p.putpalette(flat)
            p.putdata([0 if px[3] < 128 else idx[px[:3]] for px in fr.getdata()])
            ps.append(p)
        keyidx = 0
    else:
        KEY = (255, 0, 255)
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
        for fr, ff in zip(frames, flats):
            q = list(ff.quantize(palette=pal_img, dither=Image.NONE).getdata())
            a = [px[3] for px in fr.getdata()]
            q = [keyidx if a[i] < 128 else q[i] for i in range(len(q))]
            p = Image.new("P", (W, H)); p.putpalette(palette); p.putdata(q)
            ps.append(p)
    ps[0].save(os.path.join(OUT, name + ".gif"), save_all=True, append_images=ps[1:],
               loop=0, duration=dur, transparency=keyidx, disposal=2, optimize=False)
    print(name, "ok", len(frames), "frames,", len(opaque), "colors")


def idle(season):
    return [compose_frame(season, 2 * math.pi * f / N_IDLE, f, N_IDLE) for f in range(N_IDLE)]


def transition(a, b):
    hold = 6
    frames = []
    for f in range(N_TRANS):
        prog = clamp(f / (N_TRANS - hold))
        season = a + (b - a) * smooth(prog)
        frames.append(compose_frame(season, 2 * math.pi * f / N_TRANS, f, N_TRANS))
    return frames


SEASON_NAMES = ["spring", "summer", "fall", "winter"]


def render_anims():
    for i, nm in enumerate(SEASON_NAMES):
        save_gif(idle(float(i)), "idle-" + nm, DUR_IDLE)
    for a, b, nm in [(0, 1, "spring-summer"), (1, 2, "summer-fall"),
                     (2, 3, "fall-winter"), (3, 4, "winter-spring")]:
        save_gif(transition(float(a), float(b)), "trans-" + nm, DUR_TRANS)


def render_stills():
    scale = 5
    cells = []
    specs = [(0.0, 1.4), (1.0, 1.4), (2.0, 1.4), (3.0, 1.4),
             (2.35, 1.4), (2.6, 1.4), (2.85, 1.4), (3.4, 1.4)]
    labels = ["spring", "summer", "fall", "winter",
              "f->w .35", "f->w .60", "f->w .85", "w->s .40"]
    for season, bp in specs:
        im = compose_frame(season, bp, 4, N_IDLE)
        base = Image.new("RGB", im.size, (92, 96, 104))
        base.paste(im, (0, 0), im)
        cells.append(base.resize((W * scale, H * scale), Image.NEAREST))
    cols = 4
    rows = (len(cells) + cols - 1) // cols
    sheet = Image.new("RGB", (W * scale * cols, H * scale * rows), (60, 62, 68))
    for i, c in enumerate(cells):
        sheet.paste(c, ((i % cols) * W * scale, (i // cols) * H * scale))
    path = os.path.join(OUT, "_stills.png")
    sheet.save(path)
    print("stills ->", path, sheet.size, "|", ", ".join(labels))


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "stills"
    if mode == "anims":
        render_anims()
    else:
        render_stills()
