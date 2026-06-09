"""Build labeled React|Godot side-by-side montages for the parity review report."""
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RE = os.path.join(ROOT, "tools", "_review_caps", "react")
GO_FRESH = os.path.join(ROOT, "godot", "tools", "_review_caps", "fresh")
GO_GRANT = os.path.join(ROOT, "godot", "tools", "_review_caps", "godot_grant")
GO_BOARD = os.path.join(ROOT, "godot", "tools", "_review_caps", "godot")
GO_GOLD = os.path.join(ROOT, "godot", "tests", "visual", "__goldens__", "Windows")
RE_GOLD = os.path.join(ROOT, "tests", "visual", "__goldens__", "visual.spec.ts", "iphone-portrait")
OUT = os.path.join(ROOT, "godot-parity-review", "img")
os.makedirs(OUT, exist_ok=True)

def font(sz):
    for p in ["C:/Windows/Fonts/segoeui.ttf", "C:/Windows/Fonts/arial.ttf"]:
        if os.path.exists(p):
            return ImageFont.truetype(p, sz)
    return ImageFont.load_default()

# (out_name, title, react_img_or_None, godot_img_or_None)
PAIRS = [
    ("board",       "Puzzle board (farm)",      (RE,"board-farm-idle"),   (GO_BOARD,"board-farm")),
    ("board-mine",  "Mine board",               (RE,"board-mine-idle"),   (GO_BOARD,"board-mine")),
    ("board-harbor","Harbor board",             (RE,"board-fish-idle-high-tide"),(GO_BOARD,"board-harbor")),
    ("townmap",     "Town map (built out)",     (RE,"town-home-built-out"),(GO_GRANT,"townmap")),
    ("craft",       "Craft screen",             (RE,"crafting-bakery"),   (GO_GRANT,"craft_real")),
    ("inventory",   "Inventory",                (RE,"inventory-grid-all"),(GO_GRANT,"inventory")),
    ("tiles",       "Tile collection",          (RE,"tiles-farm-grass"),  (GO_FRESH,"tiles")),
    ("townsfolk",   "Townsfolk / Workers",      (RE,"townsfolk-workers"), (GO_GRANT,"townsfolk")),
    ("cartography", "World map / Cartography",  (RE,"map-current-home"),  (GO_GRANT,"cartography")),
    ("menu",        "Game menu",                (RE_GOLD,"shell-menu-main"),(GO_FRESH,"menu")),
    ("quests",      "Quests",                   (RE,"quests-daily-mixed"),(GO_GRANT,"quests")),
    ("achievements","Achievements",             (RE,"achievements-trophies-mixed"),(GO_GRANT,"achievements")),
    ("chronicle",   "Chronicle",                (RE,"chronicle-progressed"),(GO_FRESH,"chronicle")),
    ("charter",     "Charter",                  (RE,"charter-terms"),     (GO_FRESH,"charter")),
    ("tutorial",    "Tutorial",                 (RE_GOLD,"tutorial-center"),(GO_FRESH,"tutorial")),
    ("startfarming","Start farming modal",      (RE_GOLD,"start-farming-tile-chooser"),(GO_BOARD,"start-farming")),
    ("runsummary",  "Run summary vs Harvest",   (RE,"run-summary"),       (GO_GOLD,"harvest-run-end","portrait")),
    ("boons",       "Boons (dropped in Godot)", (RE,"boons-farm"),        None),
    ("portal",      "Portal",                   (None,),                  (GO_GRANT,"portal")),
    ("castle",      "Castle",                   (RE,"townsfolk-castle"),  (GO_GRANT,"castle")),
]

LABEL_H = 46
TARGET_H = 900
GUT = 18

def load(spec):
    if spec is None or spec[0] is None:
        return None
    base = spec[0]
    name = spec[1]
    sub = spec[2] if len(spec) > 2 else None
    p = os.path.join(base, sub, name+".png") if sub else os.path.join(base, name+".png")
    if not os.path.exists(p):
        return None
    return Image.open(p).convert("RGB")

def scaled(img):
    if img is None:
        return None
    w,h = img.size
    nw = int(w * TARGET_H / h)
    return img.resize((nw, TARGET_H), Image.LANCZOS)

def placeholder(w, h, text):
    im = Image.new("RGB", (w,h), (235,228,214))
    d = ImageDraw.Draw(im)
    d.rectangle([2,2,w-3,h-3], outline=(180,150,120), width=2)
    f = font(26)
    bb = d.textbbox((0,0), text, font=f)
    d.text(((w-(bb[2]-bb[0]))//2, (h-(bb[3]-bb[1]))//2), text, fill=(120,90,60), font=f)
    return im

for spec in PAIRS:
    out_name, title = spec[0], spec[1]
    rspec = spec[2]
    gspec = spec[3]
    rimg = scaled(load(rspec))
    gimg = scaled(load(gspec))
    half_w = 420
    if rimg is None:
        rimg = placeholder(half_w, TARGET_H, "(no React screen)")
    if gimg is None:
        gimg = placeholder(half_w, TARGET_H, "MISSING IN GODOT")
    W = rimg.width + GUT + gimg.width
    H = LABEL_H + TARGET_H
    canvas = Image.new("RGB", (W, H), (250,247,240))
    d = ImageDraw.Draw(canvas)
    fb = font(24)
    # labels
    d.rectangle([0,0,rimg.width,LABEL_H], fill=(58,90,30))
    d.text((12,10), "REACT — "+title, fill=(255,255,255), font=fb)
    d.rectangle([rimg.width+GUT,0,W,LABEL_H], fill=(150,70,30))
    d.text((rimg.width+GUT+12,10), "GODOT — "+title, fill=(255,255,255), font=fb)
    canvas.paste(rimg, (0, LABEL_H))
    canvas.paste(gimg, (rimg.width+GUT, LABEL_H))
    canvas.save(os.path.join(OUT, out_name+".png"))
    print("montage", out_name)
print("done ->", OUT)
