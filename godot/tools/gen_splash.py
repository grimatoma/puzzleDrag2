#!/usr/bin/env python3
"""gen_splash.py — author the Hearthlands splash-screen pixel art (Godot port).

Draws a portrait dusk scene at NATIVE 180x320 (true chunky pixel art, every
texel a decision) and ships it scaled x4 with NEAREST to 720x1280 — the port's
base viewport — so the pixels stay crisp squares. Two PNGs are written:

  godot/assets/splash/splash.png       — the full scene (opaque, 720x1280)
  godot/assets/splash/splash_glow.png  — warm-light emission only (RGBA,
                                         720x1280): window glow, moon halo,
                                         brightest star cores. SplashScreen.gd
                                         layers it over the base and pulses its
                                         alpha so the scene breathes.
  godot/assets/splash/splash_boot.png  — the ENGINE/web-loader boot splash: a
                                         400x400 circular medallion (the
                                         cottage vignette in a gold ring, RGBA)
                                         shown CENTERED at natural size
                                         (boot_splash/fullsize=false). The boot
                                         phase can only contain-fit an image —
                                         a full-bleed portrait scene would
                                         letterbox into a "portrait strip" on
                                         wide screens and then jump to full
                                         width when SplashScreen.gd takes over,
                                         so the boot image is an emblem that
                                         reads as deliberate at ANY aspect.

Scene (top to bottom): deep-indigo night sky Bayer-dithered down to an ember
horizon; stars; a pale-gold moon upper-right; a cool violet far ridge; a moss
hill carrying a timber cottage with gold-lit windows + chimney smoke (the
"hearth" the game is named for); patchwork fields (moss / wheat / tilled rows)
with a dirt path winding from the bottom edge to the door; fence posts + wheat
tufts in the foreground; a darkened bottom band so the tap-to-begin hint reads.

Craft (per .claude/skills/pixel-art-craft/SKILL.md): hue-shifted ramps (cool
indigo shadows, warm ember/gold highlights), one key light upper-right (moon +
horizon glow), ordered Bayer-4x4 dithering for every gradient transition, solid
readable silhouettes, no pillow-shading, no orphan pixels, >=2px features.
Palette anchors come from the port's Palette.gd / tokens.css (EMBER #d6612a,
GOLD_BRIGHT #ffd248, MOSS #6f8a3a, INK_MID #7a5e3f).

Deterministic: star field + tuft placement use random.Random(1337).

Run:  python3 godot/tools/gen_splash.py
"""

import os
import random

from PIL import Image

# ── canvas ───────────────────────────────────────────────────────────────────
W, H = 180, 320          # native pixel-art resolution (9:16)
SCALE = 4                # x4 nearest -> 720x1280 (the port's base viewport)
HORIZON = 160            # sky meets the far ridge here

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "assets", "splash")

rng = random.Random(1337)


def hx(code):
    code = code.lstrip("#")
    return (int(code[0:2], 16), int(code[2:4], 16), int(code[4:6], 16))


def mix(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


# ── ordered dithering (Bayer 4x4) ────────────────────────────────────────────
BAYER = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5],
]


def dith(x, y, t):
    """True -> use the LIGHTER color, for coverage t in [0,1]."""
    return t > (BAYER[y % 4][x % 4] + 0.5) / 16.0


# ── palette (hue-shifted ramps: cool shadows -> warm highlights) ─────────────
SKY = [hx(c) for c in (
    "#12142e",  # zenith — near-black indigo
    "#1c1d44",
    "#2c2456",
    "#453061",
    "#653c63",
    "#8a4a58",
    "#b85f46",
    "#dd7f3f",  # ember band
    "#f0a44e",  # horizon glow (warm, desaturating up in value)
)]
STAR_DIM = hx("#8d87c0")
STAR_BRIGHT = hx("#eee9ff")
MOON_CORE = hx("#ffe9ae")
MOON_LIT = hx("#ffd86e")
MOON_SHADE = hx("#d8a44e")
RIDGE_FAR = hx("#3a2c58")    # far mountains — cool violet silhouette
RIDGE_RIM = hx("#5c4068")    # warm-violet rim where the horizon glow catches
RIDGE_NEAR = hx("#2c2348")
HILL_SHADOW = hx("#23391f")  # moss hill ramp (cool-shifted dark)
HILL_BASE = hx("#3a5524")
HILL_LIT = hx("#56742c")
HILL_WARM = hx("#7a8f3e")    # warm top edge where dusk light grazes
FIELD_MOSS_D = hx("#31481f")
FIELD_MOSS = hx("#44612a")
FIELD_WHEAT_D = hx("#8a6c26")
FIELD_WHEAT = hx("#b08c32")
FIELD_TILL_D = hx("#4a3520")
FIELD_TILL = hx("#64482a")
HEDGE = hx("#1f3018")        # hedgerow lines between field patches
PATH_D = hx("#6b5036")
PATH = hx("#8a6c46")
PATH_LIT = hx("#a8895c")
WALL_SHADOW = hx("#8a7050")  # cottage timber walls
WALL = hx("#c0a87a")
WALL_LIT = hx("#e2cfa0")
TIMBER = hx("#503a22")
ROOF_D = hx("#7c3420")       # roof — ember/rust family (Palette.EMBER kin)
ROOF = hx("#a84a28")
ROOF_LIT = hx("#d6713a")
WINDOW_CORE = hx("#fff2b0")
WINDOW = hx("#ffd248")       # Palette.GOLD_BRIGHT
WINDOW_EDGE = hx("#ff8b25")  # Palette.EMBER_SOFT
DOOR = hx("#3a2a18")
STONE_D = hx("#4a4458")      # chimney / plinth — cool grey-violet
STONE = hx("#6b6478")
SMOKE_D = hx("#564e6e")
SMOKE = hx("#7c7492")
SMOKE_LIT = hx("#a39ab4")
FENCE = hx("#574230")
FENCE_LIT = hx("#7a5e3f")    # Palette.INK_MID
TUFT = hx("#2c421c")
TUFT_WHEAT = hx("#9a7c2e")
VIGNETTE = hx("#0e1024")


def put(px, x, y, c):
    if 0 <= x < W and 0 <= y < H:
        px[x, y] = c


def rect(px, x0, y0, x1, y1, c):
    for y in range(max(0, y0), min(H, y1 + 1)):
        for x in range(max(0, x0), min(W, x1 + 1)):
            px[x, y] = c


# ── sky ──────────────────────────────────────────────────────────────────────
def draw_sky(px, bottom=HORIZON):
    """Vertical dusk gradient, Bayer-dithered between ramp steps. The ember
    band is compressed near the horizon (gamma) so the zenith stays deep.
    `bottom` is where the ramp's warm end lands — the main scene puts it at the
    ridge HORIZON; the boot-medallion scene stretches it to the hill line so
    the ember band hides behind the hill (no ridge in that composition)."""
    for y in range(bottom):
        t = (y / (bottom - 1)) ** 1.6 * (len(SKY) - 1)
        i = min(int(t), len(SKY) - 2)
        frac = t - i
        for x in range(W):
            px[x, y] = SKY[i + 1] if dith(x, y, frac) else SKY[i]


def draw_stars(px, rng_):
    """Sparse field, denser + brighter near the zenith, fading toward the warm
    horizon. A few 'plus' twinkles; no two stars adjacent (no orphan noise —
    each star is a deliberate 1px point or a 5px plus)."""
    rng = rng_
    taken = set()

    def free(x, y):
        return all((x + dx, y + dy) not in taken
                   for dx in (-2, -1, 0, 1, 2) for dy in (-2, -1, 0, 1, 2))

    placed = 0
    while placed < 64:
        x = rng.randrange(3, W - 3)
        y = rng.randrange(2, 120)
        if not free(x, y):
            continue
        # fade probability toward the horizon — keep the ember band clean
        if rng.random() < y / 150.0:
            continue
        bright = rng.random() < 0.22 and y < 80
        if bright:
            put(px, x, y, STAR_BRIGHT)
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                put(px, x + dx, y + dy, STAR_DIM)
        else:
            put(px, x, y, STAR_DIM if rng.random() < 0.7 else STAR_BRIGHT)
        taken.add((x, y))
        placed += 1


def draw_moon(px):
    """Pale-gold moon upper-right — the scene's key light. Lit from its own
    glow: warm core, cool-shaded lower-left limb (form shading, not pillow)."""
    cx, cy, r = 138, 44, 13
    for y in range(cy - r, cy + r + 1):
        for x in range(cx - r, cx + r + 1):
            dx, dy = x - cx, y - cy
            d2 = dx * dx + dy * dy
            if d2 > r * r:
                continue
            # form light: brightest toward upper-right of the disc
            t = 0.5 + (dx - dy) / (2.8 * r)
            if t > 0.78:
                c = MOON_CORE
            elif t > 0.38:
                c = MOON_LIT if dith(x, y, (t - 0.38) / 0.4) else MOON_SHADE
            else:
                c = MOON_SHADE
            put(px, x, y, c)
    # a few craters (darker discs, offset toward the shaded limb)
    for (mx, my, mr) in ((134, 47, 2), (141, 40, 1), (137, 51, 1)):
        for y in range(my - mr, my + mr + 1):
            for x in range(mx - mr, mx + mr + 1):
                if (x - mx) ** 2 + (y - my) ** 2 <= mr * mr:
                    put(px, x, y, MOON_SHADE)


# ── landforms ────────────────────────────────────────────────────────────────
def ridge_height(x):
    """Far-ridge skyline: three overlapping peaks, deterministic."""
    import math
    h = 18 * abs(math.sin(x * 0.045 + 0.8))
    h += 11 * abs(math.sin(x * 0.085 + 2.2))
    h += 4 * math.sin(x * 0.21)
    return int(HORIZON - 8 - h)


def draw_far_ridge(px):
    for x in range(W):
        top = ridge_height(x)
        for y in range(top, HORIZON):
            # warm rim where the horizon glow grazes the first 2 rows
            if y - top < 2 and dith(x, y, 0.6):
                px[x, y] = RIDGE_RIM
            else:
                px[x, y] = RIDGE_FAR


def hill_top(x):
    """Mid-ground moss hill crest carrying the cottage: high on the left-center,
    easing down to the right."""
    import math
    return int(176 - 14 * math.cos((x - 58) * 0.018) + 6 * math.sin(x * 0.05))


def draw_hill(px, valley=True):
    # shadowed valley band between the far ridge and the hill crest — fills the
    # rows the sky/ridge passes leave untouched, dith-blended into the ridge.
    # The boot-medallion scene has no ridge (sky runs to the hill), so it skips
    # the band + the valley homestead lights.
    if valley:
        for x in range(W):
            for y in range(HORIZON, hill_top(x)):
                if y - HORIZON < 3 and dith(x, y, 0.5):
                    put(px, x, y, RIDGE_FAR)
                else:
                    put(px, x, y, RIDGE_NEAR)
        # distant homestead lights in the shadowed valley (2x1 gold gleams) —
        # other hearths across Hearthwood Vale, echoing the cottage windows
        for (lx, ly) in ((18, 168), (132, 165), (158, 170)):
            if hill_top(lx) > ly + 1:
                put(px, lx, ly, WINDOW)
                put(px, lx + 1, ly, WINDOW_EDGE)
    for x in range(W):
        top = hill_top(x)
        for y in range(max(HORIZON - 18, top), 215):
            if y < top:
                continue
            depth = y - top
            if depth < 2:
                c = HILL_WARM           # dusk light grazing the crest
            elif depth < 6:
                c = HILL_LIT if dith(x, y, 0.55) else HILL_BASE
            elif depth < 12:
                c = HILL_BASE
            else:
                c = HILL_BASE if dith(x, y, 0.35) else HILL_SHADOW
            put(px, x, y, c)


# ── fields / foreground ──────────────────────────────────────────────────────
FIELD_BANDS = [
    # (y_end, dark, light, row_pitch) — patchwork strips marching toward the viewer
    (228, FIELD_MOSS_D, FIELD_MOSS, 4),
    (246, FIELD_WHEAT_D, FIELD_WHEAT, 5),
    (268, FIELD_TILL_D, FIELD_TILL, 6),
    (296, FIELD_MOSS_D, FIELD_MOSS, 7),
    (320, FIELD_TILL_D, FIELD_TILL, 8),
]


def draw_fields(px):
    import math
    y0 = 215
    for (y1, dark, light, pitch) in FIELD_BANDS:
        for y in range(y0, min(y1, H)):
            # crop rows: LIGHT base with a dark furrow line every `pitch`,
            # gently bowed — fields read as solid patches, not stripes
            for x in range(W):
                bow = int(2 * math.sin(x * 0.025 + y0 * 0.7))
                is_furrow = (y + bow) % pitch == 0
                px[x, y] = dark if is_furrow else (
                    light if dith(x, y, 0.78) else mix(light, dark, 0.5))
        # hedgerow seam between patches — one clean wobbled line
        if y1 < H:
            for x in range(W):
                wob = int(1.5 * math.sin(x * 0.08 + y1))
                put(px, x, y1 - 1 + wob, HEDGE)
        y0 = y1
    # smooth the hill->field seam with a dithered moss transition
    for x in range(W):
        for y in range(212, 218):
            if dith(x, y, (218 - y) / 6.0):
                put(px, x, y, HILL_SHADOW)


def path_center(y):
    """Dirt path: from bottom-center it winds up-left to the cottage door (~x66
    at y200). Quadratic-ish ease, width tapering 16px -> 3px with distance."""
    t = (y - 200) / (H - 1 - 200)          # 0 at door, 1 at bottom edge
    x = 66 + (96 - 66) * (t * t * 0.4 + t * 0.6) + 6 * (t * (1 - t)) * 2
    w = 2 + 13 * t
    return int(x), max(2, int(w))


def draw_path(px):
    for y in range(200, H):
        cx, w = path_center(y)
        for x in range(cx - w, cx + w + 1):
            edge = abs(x - cx) > w - 2
            if edge:
                c = PATH_D
            else:
                c = PATH_LIT if dith(x, y, 0.30) else PATH
            put(px, x, y, c)


def draw_fence(px):
    """Two short fence runs flanking the path mouth in the lower foreground."""
    for (xs, xe, ybase) in ((10, 62, 286), (128, 172, 292)):
        step = 13
        for x in range(xs, xe, step):
            # post (2px wide, lit on the right face — key light upper-right)
            for y in range(ybase - 12, ybase + 1):
                put(px, x, y, FENCE)
                put(px, x + 1, y, FENCE_LIT)
        # rails
        for x in range(xs, xe + 2):
            put(px, x, ybase - 9, FENCE)
            put(px, x, ybase - 4, FENCE_LIT if dith(x, ybase, 0.5) else FENCE)


def draw_tufts(px):
    """Wheat tufts + grass sprigs scattered on the foreground patches (never on
    the path). Each tuft is a 2x3 'V' — chunky-pixel rule, no 1px floaters."""
    for _ in range(46):
        x = rng.randrange(4, W - 4)
        y = rng.randrange(222, H - 8)
        cx, w = path_center(max(y, 200))
        if abs(x - cx) < w + 4:
            continue
        c = TUFT_WHEAT if 228 <= y < 246 or rng.random() < 0.25 else TUFT
        put(px, x, y, c)
        put(px, x - 1, y - 1, c)
        put(px, x + 1, y - 1, c)
        put(px, x, y - 2, c)


# ── the cottage (focal point) ────────────────────────────────────────────────
def draw_cottage(px):
    """Timber cottage on the hill crest, silhouetted against the ember horizon.
    Footprint x46..x92, ground y198. Key light upper-right (moon + dusk glow):
    right wall face lit, left in cool shadow. Gold windows are the heart."""
    gx0, gx1, gy = 46, 92, 198
    wall_top = 172
    # plinth (stone base course)
    rect(px, gx0, gy - 3, gx1, gy, STONE_D)
    for x in range(gx0, gx1 + 1, 3):
        put(px, x, gy - 2, STONE)
    # walls — lit face on the right 40%, dithered transition
    for y in range(wall_top, gy - 3):
        for x in range(gx0, gx1 + 1):
            t = (x - gx0) / (gx1 - gx0)
            if t > 0.62:
                c = WALL_LIT
            elif t > 0.40:
                c = WALL if dith(x, y, (t - 0.40) / 0.22) else WALL_SHADOW
            else:
                c = WALL_SHADOW if dith(x, y, 0.8) else WALL
            px[x, y] = c
    # timber frame: corner posts, sill beam, two cross braces
    for y in range(wall_top, gy - 2):
        put(px, gx0, y, TIMBER)
        put(px, gx1, y, TIMBER)
        put(px, (gx0 + gx1) // 2 + 4, y, TIMBER)
    for x in range(gx0, gx1 + 1):
        put(px, x, wall_top, TIMBER)
    # roof — gable, ember shingles, lit ridge; eaves overhang 3px
    apex_x, apex_y = (gx0 + gx1) // 2, 152
    for y in range(apex_y, wall_top + 1):
        spread = int((y - apex_y) / (wall_top - apex_y) * ((gx1 - gx0) // 2 + 3))
        x0, x1 = apex_x - spread, apex_x + spread
        for x in range(x0, x1 + 1):
            if y <= apex_y + 1 or x >= x1 - 1:
                c = ROOF_LIT                      # ridge + right (lit) rake
            elif x <= x0 + 1:
                c = ROOF_D                        # left rake in shadow
            else:
                t = (x - x0) / max(1, (x1 - x0))
                if t > 0.55:
                    c = ROOF if dith(x, y, (t - 0.55) / 0.45) else ROOF
                    if t > 0.8 and dith(x, y, 0.45):
                        c = ROOF_LIT
                else:
                    c = ROOF_D if dith(x, y, 0.65) else ROOF
            put(px, x, y, c)
        # shingle course shadow every 4 rows
        if (y - apex_y) % 4 == 3:
            for x in range(x0 + 2, x1 - 1):
                if dith(x, y, 0.5):
                    put(px, x, y, ROOF_D)
    # chimney — right of the ridge line, rooted INTO the roof slope (no float);
    # right face lit (key light upper-right), stone cap on top
    rect(px, 74, 140, 79, 162, STONE_D)
    for y in range(141, 162):
        put(px, 78, y, STONE)
        put(px, 79, y, STONE)
    rect(px, 73, 138, 80, 140, STONE)
    # windows — two gold panes + a small loft pane in the gable
    for (wx0, wy0, wx1, wy1) in ((52, 180, 58, 188), (76, 180, 84, 188)):
        rect(px, wx0 - 1, wy0 - 1, wx1 + 1, wy1 + 1, TIMBER)
        rect(px, wx0, wy0, wx1, wy1, WINDOW)
        # bright core + ember edge (light source, drawn hot-center)
        rect(px, wx0 + 1, wy0 + 1, wx1 - 1, wy1 - 2, WINDOW_CORE)
        for x in range(wx0, wx1 + 1):
            put(px, x, wy1, WINDOW_EDGE)
        # cross mullion
        mx = (wx0 + wx1) // 2
        for y in range(wy0, wy1 + 1):
            put(px, mx, y, TIMBER)
        for x in range(wx0, wx1 + 1):
            put(px, x, (wy0 + wy1) // 2, TIMBER)
    # door (right of center, where the path arrives) + warm spill on the ground
    rect(px, 62, 184, 69, gy - 1, DOOR)
    rect(px, 63, 185, 68, gy - 1, mix(DOOR, WINDOW_EDGE, 0.18))
    put(px, 67, 191, WINDOW)                       # latch glint
    for y in range(gy, gy + 5):
        half = 5 - (y - gy)
        for x in range(66 - half, 66 + half + 1):
            if dith(x, y, 0.55 - 0.1 * (y - gy)):
                put(px, x, y, mix(PATH, WINDOW, 0.4))


def draw_smoke(px):
    """Chimney smoke: three dithered puff clusters drifting up-right (with the
    dusk breeze), shrinking alpha with height. Solid pixels, dithered edges."""
    puffs = [(76, 133, 3, 0.95), (80, 126, 4, 0.85), (85, 117, 5, 0.62),
             (91, 109, 5, 0.42), (97, 102, 4, 0.26)]
    for (cx, cy, r, cov) in puffs:
        for y in range(cy - r, cy + r + 1):
            for x in range(cx - r, cx + r + 1):
                dx, dy = x - cx, y - cy
                if dx * dx + dy * dy > r * r:
                    continue
                if not dith(x, y, cov):
                    continue
                # lit from upper-right
                c = SMOKE_LIT if (dx - dy) > r // 2 else (SMOKE if dith(x, y, 0.6) else SMOKE_D)
                put(px, x, y, c)


def draw_vignette(px):
    """Darken the bottom band (hint text sits here) and the very top corners,
    dither-blended so there is no hard line."""
    for y in range(276, H):
        t = (y - 276) / (H - 276) * 0.75
        for x in range(W):
            if dith(x, y, t):
                px[x, y] = mix(px[x, y], VIGNETTE, 0.6)
    for y in range(0, 14):
        t = (14 - y) / 14 * 0.5
        for x in range(W):
            if dith(x, y, t):
                px[x, y] = mix(px[x, y], VIGNETTE, 0.5)


# ── glow overlay ─────────────────────────────────────────────────────────────
def build_glow():
    """RGBA emission layer: radial warm glows whose alpha falls off with
    distance. Pulsed by SplashScreen.gd (modulate alpha 0.45..1.0)."""
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    px = img.load()

    def radial(cx, cy, r, color, peak):
        for y in range(cy - r, cy + r + 1):
            for x in range(cx - r, cx + r + 1):
                if not (0 <= x < W and 0 <= y < H):
                    continue
                d2 = (x - cx) ** 2 + (y - cy) ** 2
                if d2 > r * r:
                    continue
                fall = (1.0 - (d2 / (r * r)) ** 0.7)
                a = int(peak * fall)
                pr, pg, pb, pa = px[x, y]
                if a > pa:
                    px[x, y] = (color[0], color[1], color[2], a)

    radial(55, 184, 9, WINDOW, 150)        # left window
    radial(80, 184, 10, WINDOW, 160)       # right window
    radial(66, 196, 7, WINDOW_EDGE, 110)   # door spill
    radial(138, 44, 22, MOON_CORE, 70)     # moon halo
    # distant homestead gleams in the valley (match draw_hill's light spots)
    for (lx, ly) in ((18, 168), (132, 165), (158, 170)):
        radial(lx, ly, 2, WINDOW, 100)
    # brightest star cores twinkle with the pulse
    rng2 = random.Random(7)
    for _ in range(10):
        x, y = rng2.randrange(8, W - 8), rng2.randrange(4, 86)
        radial(x, y, 2, STAR_BRIGHT, 120)
    return img


# ── boot medallion ───────────────────────────────────────────────────────────
BOOT_SIZE = 100              # native medallion canvas (x4 -> 400x400)
RING_GOLD_D = hx("#8a6428")  # gold ring ramp: shadow / base / lit (hue-shifted)
RING_GOLD = hx("#e2b24a")    # Palette.GOLD
RING_GOLD_L = hx("#ffd248")  # Palette.GOLD_BRIGHT
RING_INK = hx("#2b2218")     # Palette.INK — the selout outline


def build_boot_scene():
    """The medallion's backdrop: the SAME cottage/hill/fields/path/smoke
    geometry as the main scene, but with the night sky running clean down to
    the hill crest (no far ridge / ember gaps — a circular crop of those reads
    as floating orange wedges). Stars use a fresh fixed seed so the medallion
    is deterministic independent of the main scene's draw order."""
    img = Image.new("RGB", (W, H))
    px = img.load()
    draw_sky(px, bottom=215)
    draw_stars(px, random.Random(1337))
    draw_hill(px, valley=False)
    draw_fields(px)
    draw_path(px)
    draw_cottage(px)
    draw_smoke(px)
    return img


def build_boot_medallion(scene):
    """Circular emblem cropped from the composed scene, centred on the cottage
    (the hearth), in a gold ring lit from the upper-right like everything else.
    Transparent outside the ring, so the loader page / engine bg_color frames
    it at any viewport aspect."""
    import math
    img = Image.new("RGBA", (BOOT_SIZE, BOOT_SIZE), (0, 0, 0, 0))
    px = img.load()
    # crop window: centre the cottage (x≈69) with its ground line in the lower
    # third (y 172), so roof + chimney + first smoke puff + path all fit
    crop_x0, crop_y0 = 69 - BOOT_SIZE // 2, 172 - BOOT_SIZE // 2
    c = (BOOT_SIZE - 1) / 2.0
    for y in range(BOOT_SIZE):
        for x in range(BOOT_SIZE):
            d = math.hypot(x - c, y - c)
            if d <= 43.0:
                px[x, y] = scene.getpixel((crop_x0 + x, crop_y0 + y)) + (255,)
            elif d <= 44.0:
                px[x, y] = RING_INK + (255,)        # inner rim: art/ring seam
            elif d <= 47.5:
                # gold ring, form-lit upper-right (matches the scene key light)
                t = 0.5 + ((x - c) - (y - c)) / (2.8 * 47.0)
                if t > 0.72:
                    px[x, y] = RING_GOLD_L + (255,)
                elif t > 0.34:
                    px[x, y] = (RING_GOLD if dith(x, y, (t - 0.34) / 0.38)
                                else RING_GOLD_D) + (255,)
                else:
                    px[x, y] = RING_GOLD_D + (255,)
            elif d <= 49.0:
                px[x, y] = RING_INK + (255,)        # solid outline ring
    return img


# ── compose ──────────────────────────────────────────────────────────────────
def main():
    img = Image.new("RGB", (W, H))
    px = img.load()
    draw_sky(px)
    draw_stars(px, rng)
    draw_moon(px)
    draw_far_ridge(px)
    draw_hill(px)
    draw_fields(px)
    draw_path(px)
    draw_cottage(px)
    draw_smoke(px)
    draw_fence(px)
    draw_tufts(px)
    draw_vignette(px)

    os.makedirs(OUT_DIR, exist_ok=True)
    big = img.resize((W * SCALE, H * SCALE), Image.NEAREST)
    big.save(os.path.join(OUT_DIR, "splash.png"))
    glow = build_glow().resize((W * SCALE, H * SCALE), Image.NEAREST)
    glow.save(os.path.join(OUT_DIR, "splash_glow.png"))
    boot = build_boot_medallion(build_boot_scene()).resize(
        (BOOT_SIZE * SCALE, BOOT_SIZE * SCALE), Image.NEAREST)
    boot.save(os.path.join(OUT_DIR, "splash_boot.png"))
    print("wrote", os.path.join(OUT_DIR, "splash.png"),
          "+ splash_glow.png + splash_boot.png")


if __name__ == "__main__":
    main()
