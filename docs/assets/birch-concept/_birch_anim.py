#!/usr/bin/env python3
"""128px animated birch tree: a light breeze idle in 4 seasonal palettes + the
season-to-season transition morphs. Built with the pixel-art-animation skill toolkit.

One parameterized frame builder, compose_frame(season, breeze_phase, frame, N):
  * season is a CONTINUOUS float on a 0..4 wheel: 0 spring, 1 summer, 2 fall, 3 winter.
    An idle holds season fixed and loops breeze_phase. A transition interpolates season
    A->B while the breeze keeps blowing.
  * What MOVES: the canopy. Branches + leaf clusters bend on a cantilever (tip lags the
    base, each branch out of phase) so a gust rolls through; leaves add a fine flutter;
    the slender trunks barely sway at the very top. Trunks/branches are otherwise rigid.
  * Seasonal state is all driven off `season`: foliage hue (hue-shifted ramps), canopy
    density (leaves grow in / fall away), snow accumulation, catkins, and drifting
    overlay particles (petals / falling leaves / snow flurry).

Run:
  py -3 _birch_anim.py stills   -> a season-comparison montage PNG for art review
  py -3 _birch_anim.py anims    -> writes the 8 looping GIFs into this folder

Requires Pillow.
"""
import math, os, sys, random
from PIL import Image

W = H = 128
N_IDLE = 20
N_TRANS = 30
DUR = 85
OUT = os.path.dirname(os.path.abspath(__file__))
CX = 64
GROUND_Y = 116
CROWN_CX, CROWN_CY, CROWN_R = 64, 46, 48

# light upper-left
_L = (-0.5, -0.5, 0.72)
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


BAYER4 = (0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5)


def dither(x, y, t):
    return t * 16.0 > BAYER4[(int(y) % 4) * 4 + (int(x) % 4)]


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


# ───────────────────────── palettes ─────────────────────────
# foliage mid-tones around the season wheel (spring, summer, fall, late-fall/brown)
FOL = [hx("#a6c83e"), hx("#4f9026"), hx("#e0991f"), hx("#7c5a32")]
GND = [hx("#5aa838"), hx("#4c8f2c"), hx("#b39a55"), hx("#dde6f1")]   # ground per season
BARK = ramp("#d8d1c4", 6)            # white birch bark
MARK = hx("#2a2620")                 # lenticels / knots
BRANCH = ramp("#7a6f5e", 5)
SNOW = ramp("#e9eef6", 5)
CATKIN = hx("#c2c87e")


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


def density(season):  # leaves present
    return _kf([0.60, 1.0, 0.92, 0.0], season)


def snow_amt(season):
    return _kf([0.0, 0.0, 0.0, 1.0], season)


def grassiness(season):
    return _kf([1.0, 1.0, 0.0, 0.0], season)


def springness(season):
    w = season % 4
    return clamp(1.0 - min(w, 4 - w) / 1.0)


def fallness(season):
    w = season % 4
    return clamp(1.0 - abs(w - 2.0) / 1.25)


# ───────────────────────── tree layout (built once, seeded) ─────────────────────────
random.seed(7)

TRUNKS = [
    dict(xb=64, yt=30, lean=3, bw=5.2, tw=2.0),    # main
    dict(xb=55, yt=50, lean=-9, bw=3.8, tw=1.7),   # left
    dict(xb=73, yt=45, lean=10, bw=4.0, tw=1.7),   # right
]
for tr in TRUNKS:
    marks = []
    yb, yt = GROUND_Y, tr["yt"]
    for _ in range(int((yb - yt) / 7)):
        f = random.uniform(0.08, 0.95)
        marks.append(dict(f=f, o=random.uniform(0.15, 0.7), ln=random.choice([2, 3, 3, 4]),
                          knot=random.random() < 0.18))
    tr["marks"] = marks


def trunk_sway(f, bp):
    return 1.25 * (f ** 1.6) * wind(bp * 0.9) * envl(bp)


def trunk_x(tr, f, bp):
    return tr["xb"] + tr["lean"] * f + trunk_sway(f, bp)


def trunk_y(tr, f):
    return GROUND_Y - (GROUND_Y - tr["yt"]) * f


AMP = 3.9
LAG = 1.05

BRANCHES = []
# fan branches off the upper parts of each trunk into a shared crown
_specs = [
    (0, 0.62, 150, 30, 10), (0, 0.78, 38, 33, 9), (0, 0.90, 95, 22, 7), (0, 1.0, 70, 18, 6),
    (1, 0.70, 168, 30, 11), (1, 0.88, 120, 24, 8), (1, 1.0, 150, 18, 7),
    (2, 0.66, 18, 30, 11), (2, 0.85, 55, 25, 9), (2, 1.0, 30, 18, 7),
]
for bi, (ti, fo, ang_deg, ln, droop) in enumerate(_specs):
    BRANCHES.append(dict(ti=ti, fo=fo, ang=math.radians(ang_deg), ln=ln, droop=droop,
                         ph=bi * 0.7 + random.uniform(-0.2, 0.2),
                         snow_us=[random.uniform(0.2, 1.0) for _ in range(int(ln / 5))]))


def branch_static(br, u):
    ox = br["xb"] + br["ln"] * u * math.cos(br["ang"])
    oy = br["oy0"] - br["ln"] * u * math.sin(br["ang"]) + br["droop"] * (u ** 2)
    return ox, oy


def branch_pt(br, u, bp):
    x, y = branch_static(br, u)
    dx = AMP * (u ** 1.35) * wind(bp - LAG * u + br["ph"]) * envl(bp)
    dy = 0.32 * AMP * (u ** 1.5) * wind(bp * 1.1 - 0.9 * u + br["ph"] + 1.5) * envl(bp)
    return x + dx, y + dy


# leaf clusters along the branches
CLUSTERS = []
for bi, br in enumerate(BRANCHES):
    tr = TRUNKS[br["ti"]]
    br["xb"] = trunk_x(tr, br["fo"], 0.0)
    br["oy0"] = trunk_y(tr, br["fo"])
    nclust = max(4, int(br["ln"] / 3.2))
    for k in range(nclust):
        u = 0.32 + 0.68 * (k + random.uniform(0, 1)) / nclust
        bx0, by0 = branch_static(br, u)
        px = random.uniform(-3.0, 3.0)
        py = random.uniform(-2.6, 2.6)
        bx0 += px; by0 += py
        posb = clamp(0.52 + 0.34 * (CROWN_CY - by0) / CROWN_R + 0.20 * (CROWN_CX - bx0) / CROWN_R)
        CLUSTERS.append(dict(bi=bi, u=u, px=px, py=py, r=random.uniform(3.2, 6.2),
                             posb=posb, thr=random.uniform(0.0, 0.95),
                             jph=random.uniform(0, 6.28), hue=random.uniform(-34, 12),
                             sat=random.uniform(-0.05, 0.12)))
# a few extra clusters to fill the crown centre
for _ in range(10):
    bx0 = CROWN_CX + random.uniform(-16, 16)
    by0 = CROWN_CY + random.uniform(-12, 8)
    posb = clamp(0.52 + 0.34 * (CROWN_CY - by0) / CROWN_R + 0.20 * (CROWN_CX - bx0) / CROWN_R)
    CLUSTERS.append(dict(bi=-1, fx=bx0, fy=by0, r=random.uniform(3.4, 5.6),
                         posb=posb, thr=random.uniform(0.0, 0.9),
                         jph=random.uniform(0, 6.28), hue=random.uniform(-34, 12),
                         sat=random.uniform(-0.05, 0.12), u=0.5))


# ───────────────────────── drawing ─────────────────────────
def draw_ground(buf, season, bp):
    grmp = ramp(ground_base(season), 5)
    sn = snow_amt(season)
    for y in range(GROUND_Y - 3, H):
        dy = y - (GROUND_Y - 3)
        half = 46 * math.sqrt(max(0.0, 1 - (dy / 13.0) ** 2))
        if half < 1:
            continue
        for x in range(int(CX - half), int(CX + half) + 1):
            edge = abs(x - CX) / (half + 1e-6)
            L = clamp(0.58 - 0.30 * edge - 0.12 * (x - CX) / 46.0)
            c = lit(grmp, L)
            if sn > 0.55 or (sn > 0.05 and dy < 4 + 8 * sn and dither(x, y, sn)):
                c = lit(SNOW, clamp(0.86 - 0.28 * edge))
            buf.put(x, y, c)
    # grass blades (spring/summer) catch the breeze
    g = grassiness(season)
    if g > 0.12:
        gb = ramp(ground_base(season), 5)
        rnd = random.Random(21)
        for _ in range(int(26 * g)):
            bx = rnd.uniform(CX - 40, CX + 40)
            fh = rnd.uniform(3, 6)
            ph = rnd.uniform(0, 6.28)
            base_y = GROUND_Y - 2 + rnd.uniform(-1, 2)
            for i in range(int(fh * 2) + 1):
                s = i / (fh * 2)
                yy = base_y - s * fh
                xx = bx + 3.0 * (s ** 1.5) * wind(bp - 1.1 * s + ph) * envl(bp)
                buf.put(xx, yy, lit(gb, 0.8 if s > 0.5 else 0.5))
    # fallen leaves on the ground in autumn
    fa = clamp(fallness(season) * (1.0 - snow_amt(season)))
    if fa > 0.15:
        base = foliage_base(season)
        rnd = random.Random(57)
        for _ in range(int(12 * fa)):
            lx = rnd.uniform(CX - 38, CX + 38)
            ly = GROUND_Y + rnd.uniform(0, 8)
            col = shift(base, rnd.uniform(-30, 6), dl=-0.04)
            buf.put(lx, ly, col); buf.put(lx + 1, ly, shift(col, 0, dl=-0.08))


def draw_trunk(buf, tr, season, bp):
    yt, yb = tr["yt"], GROUND_Y
    sn = snow_amt(season)
    for y in range(yt, yb + 1):
        f = (yb - y) / (yb - yt)
        cx = trunk_x(tr, f, bp)
        hw = tr["bw"] + (tr["tw"] - tr["bw"]) * f
        left = cx - hw
        for x in range(int(math.floor(left + 0.5)), int(math.floor(cx + hw + 0.5)) + 1):
            tt = (x - left) / (2 * hw + 1e-6)
            L = clamp(0.9 - 0.66 * tt)
            buf.put(x, y, lit(BARK, L))
        if sn > 0.25:  # snow clings to the left/top edge
            if dither(int(left), y, (sn - 0.2) * 1.2) and f > 0.05:
                buf.put(left, y, lit(SNOW, 0.92))
    for m in tr["marks"]:
        f = m["f"]
        y = trunk_y(tr, f)
        cx = trunk_x(tr, f, bp)
        hw = tr["bw"] + (tr["tw"] - tr["bw"]) * f
        mx = cx - hw + m["o"] * 2 * hw
        for k in range(m["ln"]):
            buf.put(mx + k, y, MARK)
        if m["knot"]:
            buf.put(mx, y - 1, MARK); buf.put(mx + 1, y + 1, MARK)


def draw_branch(buf, br, season, bp):
    tr = TRUNKS[br["ti"]]
    br["xb"] = trunk_x(tr, br["fo"], bp)
    br["oy0"] = trunk_y(tr, br["fo"])
    steps = max(6, int(br["ln"]))
    pts = [branch_pt(br, i / steps, bp) + (i / steps,) for i in range(steps + 1)]
    for (x, y, u) in pts:
        w = 2.6 * (1 - u) + 0.8
        disc(buf, x, y, w, w, lambda nx, ny: lit(BRANCH, 0.62) if (nx + ny) < -0.25 else lit(BRANCH, 0.32))
    sn = snow_amt(season)
    if sn > 0.18:
        for u in br["snow_us"]:
            x, y = branch_pt(br, u, bp)
            if dither(int(x), int(y), (sn - 0.12)):
                buf.put(x - 0.4, y - 1.3, lit(SNOW, 0.95))
    sp = springness(season)
    if sp > 0.3:
        xt, yt2, _ = pts[-1]
        dl = 3 + int(3 * sp)
        for c in range(dl):
            sw = 0.6 * math.sin(bp + br["ph"]) * (c / dl)
            buf.put(xt + sw, yt2 + 1 + c, CATKIN if c % 2 == 0 else shift(CATKIN, 10, dl=-0.07))


def draw_clusters(buf, season, bp):
    dens = density(season)
    base = foliage_base(season)
    fa = fallness(season)
    rmp0 = ramp(base, 6)
    NB = 5  # bucket the autumn hue variation so we don't explode the color count
    if fa > 0.05:
        buckets = [ramp(shift(base, (-34 + 46 * k / (NB - 1)) * fa, ds=0.06 * fa), 6) for k in range(NB)]
    else:
        buckets = [rmp0] * NB
    items = []
    for cl in CLUSTERS:
        if cl["bi"] >= 0:
            x, y = branch_pt(BRANCHES[cl["bi"]], cl["u"], bp)
            x += cl["px"]; y += cl["py"]
        else:
            x, y = cl["fx"], cl["fy"]
        x += 1.05 * cl["u"] * math.sin(6.0 * bp + cl["jph"])
        vis = dens - cl["thr"]
        if vis <= 0:
            continue
        r = cl["r"] * min(1.0, vis / 0.16)
        if r < 0.9:
            continue
        items.append((y, x, r, cl))
    items.sort()
    for (y, x, r, cl) in items:
        bk = int(clamp((cl["hue"] + 34) / 46.0) * (NB - 1) + 0.5)
        rmp = buckets[bk]
        posb = cl["posb"]
        disc(buf, x + 0.7, y + 1.1, r * 1.05, r * 1.05, lambda nx, ny: lit(rmp, 0.16))
        def cf(nx, ny, posb=posb, rmp=rmp):
            local = sphere_t(nx * 0.85 - 0.18, ny * 0.85 - 0.18)
            return lit(rmp, clamp(0.28 + 0.40 * posb + 0.36 * local))
        disc(buf, x, y, r, r, cf)


def drift(buf, frame, N, count, seed, kind, base):
    rnd = random.Random(seed)
    for _ in range(count):
        x0 = rnd.uniform(10, W - 10)
        ytop = rnd.uniform(16, 64)
        ph = rnd.uniform(0, 1)
        spd = rnd.uniform(0.8, 1.3)
        wob = rnd.uniform(2.5, 5.0)
        g = ((frame / N) * spd + ph) % 1.0
        y = ytop + g * (GROUND_Y - 2 - ytop)
        x = x0 + math.sin(g * wob + ph * 6) * (3 + 2) - g * 5
        if kind == "leaf":
            col = shift(base, (-24, -12, 0, 8)[rnd.randrange(4)], dl=-0.02)
            buf.put(x, y, col)
            if rnd.random() < 0.6:
                buf.put(x + 1, y + (1 if (frame // 2) % 2 else 0), shift(col, 0, dl=-0.08))
        elif kind == "petal":
            buf.put(x, y, (252, 248, 244) if (frame + int(ph * 9)) % 2 else (244, 226, 232))
        else:  # snow
            buf.put(x, y, (255, 255, 255))


def compose_frame(season, bp, frame, N):
    b = Buf()
    draw_ground(b, season, bp)
    for tr in TRUNKS:
        draw_trunk(b, tr, season, bp)
    for br in BRANCHES:
        draw_branch(b, br, season, bp)
    draw_clusters(b, season, bp)
    fa, sp, sn = fallness(season), springness(season), snow_amt(season)
    base = foliage_base(season)
    if fa > 0.05:
        drift(b, frame, N, int(16 * fa), 101, "leaf", base)
    if sp > 0.06:
        drift(b, frame, N, int(9 * sp), 202, "petal", base)
    if sn > 0.06:
        drift(b, frame, N, int(22 * sn), 303, "snow", base)
    return b.image()


# ───────────────────────── export ─────────────────────────
def save_gif(frames, name, dur=DUR):
    """Seamless GIF with 1-bit transparency. Exact palette when <=255 colors are used;
    otherwise median-cut quantize a montage of every frame to one shared 255-color palette
    (so there's no inter-frame palette flicker) and reserve an index for transparency."""
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
        save_gif(idle(float(i)), "idle-" + nm)
    for a, b, nm in [(0, 1, "spring-summer"), (1, 2, "summer-fall"),
                     (2, 3, "fall-winter"), (3, 4, "winter-spring")]:
        save_gif(transition(float(a), float(b)), "trans-" + nm)


def render_stills():
    scale = 3
    cells = []
    # one still per season, plus 3 breeze phases of summer to eyeball motion
    specs = [(0.0, 1.4), (1.0, 1.4), (2.0, 1.4), (3.0, 1.4),
             (1.0, 0.0), (1.0, 2.1), (1.0, 4.2), (2.5, 1.4)]
    for season, bp in specs:
        im = compose_frame(season, bp, 0, N_IDLE)
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
    print("stills ->", path, sheet.size)


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "stills"
    if mode == "anims":
        render_anims()
    else:
        render_stills()
