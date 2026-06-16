"""Pack a subject's animation frame dirs into transparent horizontal spritesheets
that the game loads from public/seasonal-tiles/<tile-key>/ -- one PNG per clip,
native frame size, NO background, NO upscale (these are the game assets, distinct
from the green-bg review GIFs).

Convention:
  anim/<subject>-idle-<season>/  -> idle-<season>.png
  anim/<subject>-<from>-<to>/     -> trans-<from>-<to>.png
For a deciduous two-segment autumn->winter, concatenate the segments and de-dup
the shared hinge frame, skipping the two source dirs:
  --concat autumn-baremound+baremound-winter=trans-autumn-winter

Pad centering (default ON):
  The engine (src/textures/seasonal/seasonalArt.ts drawFrame) blits each native
  frame *centered* in the tile cell, so where a tile sits in its cell is decided by
  where its pixels sit in the frame. The thing that must be consistent is the GROUND
  PAD -- the small round patch every tile shares -- so every season and every tile
  rests on the same centered base and the land never jumps between frames. So each
  sheet is horizontally shifted, at pack time, so its rest frame's pad is centered in
  the frame. NOT the content bounding box: a slanted/asymmetric subject (the carrot's
  feathery top sprawls up-right) would drag the box -- and thus the pad -- off-center.
  The subject may lean within the cell (slant is fine); the pad stays put. For a
  symmetric subject (willow, chicken) pad-center == frame-center, so the shift rounds
  to 0 (no-op). Use --no-center to opt out.

The game discovers a tile's art by the FOLDER NAME == its tile key (zero-config), so pack
into the key-named dir via --out-name (the positional `subject` still names the short source
frame dirs under anim/):

Usage:
  python tools/pixellab/pack_sheets.py chicken --out-name tile_bird_chicken
  python tools/pixellab/pack_sheets.py willow --out-name tile_tree_willow --concat autumn-baremound+baremound-winter=trans-autumn-winter
  python tools/pixellab/pack_sheets.py carrot --out-name tile_veg_carrot --decimate 64 --static-idle spring,winter

--out-name NAME   output folder under --out (default = subject); use the TILE KEY so the engine
                  auto-discovers it (e.g. tile_tree_willow).
--decimate N      generate at 128 but pack the GAME sheets at N px (clean 2:1 box downscale).
--static-idle S   pack idle-<season>.png from the season STILL as a 1-frame hold (for seasons
                  whose motion blooms badly, e.g. snow/pastel) instead of the anim dir.
--no-center       skip the horizontal content-centering step (ship frames exactly as authored).
"""
import os, glob, argparse
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument('subject')
ap.add_argument('--assets', default='docs/seasonal-tile-system/assets')
ap.add_argument('--out', default='public/seasonal-tiles')
ap.add_argument('--out-name', dest='out_name', default=None,
                help='output folder under --out (default=subject); use the TILE KEY for engine auto-discovery')
ap.add_argument('--concat', action='append', default=[], help='A+B=sheetname (hinge de-duped)')
ap.add_argument('--decimate', type=int, default=0, help='downscale packed frames to N px (e.g. 64)')
ap.add_argument('--static-idle', default='', help='comma seasons packed static from the still')
ap.add_argument('--no-center', dest='center', action='store_false', help='skip horizontal content-centering')
a = ap.parse_args()

anim = os.path.join(a.assets, 'anim')
outdir = os.path.join(a.out, a.out_name or a.subject)
os.makedirs(outdir, exist_ok=True)
pre = a.subject + '-'


def frames(dirname, drop_first=False):
    fs = sorted(glob.glob(os.path.join(anim, dirname, 'frame_*.png')))
    if drop_first:
        fs = fs[1:]
    return [Image.open(f).convert('RGBA') for f in fs]


def hcenter_dx(strip, nframes, band=4, alpha=128):
    """Horizontal shift (px) that centers frame 0's GROUND PAD in its frame cell.

    Center on the PAD -- the small round ground patch every tile shares -- not the
    content bounding box. The pad is the element that must sit in the SAME centered
    spot on every tile and every season, so bases line up across the board and never
    jump between frames. Centering on the content box instead lets an asymmetric
    subject's reach pull the result around (a slanted carrot's feathery top sprawls to
    one side, dragging the box -- and the pad -- off-center). The pad is sampled from
    the bottom `band` rows (the rim), which the body's lean does not reach. The carrot
    may still lean within the cell (slant is fine); the pad stays put. For a symmetric
    subject (willow, chicken) pad-center == frame-center already, so dx rounds to 0.
    Clamped so no content clips out of the cell."""
    W, H = strip.size
    fw = W // nframes
    px = strip.load()
    rows = {}
    for y in range(H):
        xs = [x for x in range(fw) if px[x, y][3] > alpha]
        if xs:
            rows[y] = (xs[0], xs[-1])
    if not rows:
        return 0
    bottom = max(rows)
    band_rows = [rows[y] for y in range(bottom - band + 1, bottom + 1) if y in rows]
    centers = sorted((l + r) / 2.0 for l, r in band_rows)
    pad_cx = centers[len(centers) // 2]
    dx = round((fw - 1) / 2.0 - pad_cx)
    allxs = [v for lr in rows.values() for v in lr]
    L, R = min(allxs), max(allxs)
    return max(-L, min(fw - 1 - R, dx))  # never push content past the cell edges


def hcenter(strip, nframes, dx):
    if dx == 0:
        return strip
    W, H = strip.size
    fw = W // nframes
    out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for i in range(nframes):
        cell = strip.crop((i * fw, 0, i * fw + fw, H))
        out.paste(cell, (i * fw + dx, 0), cell)  # mask=cell so margins don't clobber neighbours
    return out


def write_sheet(imgs, name):
    if not imgs:
        print('  (empty, skipped)', name); return
    if not name.endswith('.png'):
        name += '.png'
    w, h = imgs[0].size
    s = Image.new('RGBA', (w * len(imgs), h), (0, 0, 0, 0))
    for i, im in enumerate(imgs):
        s.paste(im, (i * w, 0))
    if a.decimate and h != a.decimate:  # clean 2:1-style box downscale of the whole strip
        s = s.resize((max(1, round(s.width * a.decimate / h)), a.decimate), Image.BOX)
    dx = hcenter_dx(s, len(imgs)) if a.center else 0
    if dx:
        s = hcenter(s, len(imgs), dx)
    s.save(os.path.join(outdir, name))
    print('  %-28s %2d frames @%dpx  center dx=%+d' % (name, len(imgs), s.height, dx))


skip = set()
# Static idles: pack the season still as a 1-frame hold and skip its anim dir.
for season in [x for x in a.static_idle.split(',') if x]:
    still = os.path.join(a.assets, '%s-%s.png' % (a.subject, season))
    write_sheet([Image.open(still).convert('RGBA')], 'idle-' + season)
    skip.add(pre + 'idle-' + season)

for spec in a.concat:
    srcs, name = spec.split('=')
    imgs = []
    for i, p in enumerate(srcs.split('+')):
        imgs += frames(pre + p, drop_first=(i > 0))
        skip.add(pre + p)
    write_sheet(imgs, name)

for d in sorted(glob.glob(os.path.join(anim, pre + '*'))):
    base = os.path.basename(d)
    if not os.path.isdir(d) or base in skip:
        continue
    rest = base[len(pre):]
    write_sheet(frames(base), rest + '.png' if rest.startswith('idle-') else 'trans-' + rest + '.png')
print('packed ->', outdir)
